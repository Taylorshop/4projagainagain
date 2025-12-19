import * as argon2 from 'argon2';
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

import { RegisterDto } from './dto/register.dto';

type SafeUser = { id: string; email: string; displayName: string | null };

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private toSafeUser(u: any): SafeUser {
    return { id: u.id, email: u.email, displayName: u.displayName ?? null };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.users.createUser({ email, passwordHash, displayName: dto.displayName });

    return { user: this.toSafeUser(user) };
  }

  async validateUser(email: string, password: string): Promise<SafeUser> {
    const user = await this.users.findByEmail(email.toLowerCase());
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.toSafeUser(user);
  }

  async issueTokens(user: SafeUser) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'change-me-access',
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      },
    );

    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') ?? 'change-me-refresh';
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, type: 'refresh' },
      { secret: refreshSecret, expiresIn: refreshExpiresIn },
    );

    const tokenHash = await argon2.hash(refreshToken);
    const expiresAt = this.computeExpiryDate(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return { user, accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefresh(refreshToken);
    const userId = payload.sub as string;

    const tokenRows = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const match = await this.findMatchingToken(refreshToken, tokenRows.map((t) => t.tokenHash));
    if (!match) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    return this.issueTokens(this.toSafeUser(user));
  }

  async logout(refreshToken: string) {
    const payload = await this.verifyRefresh(refreshToken);
    const userId = payload.sub as string;

    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    for (const t of tokens) {
      const ok = await argon2.verify(t.tokenHash, refreshToken);
      if (ok) {
        await this.prisma.refreshToken.update({
          where: { id: t.id },
          data: { revokedAt: new Date() },
        });
        return { ok: true };
      }
    }
    return { ok: true };
  }

  private async verifyRefresh(token: string) {
    try {
      return await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'change-me-refresh',
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private computeExpiryDate(expiresIn: string): Date {
    const m = /^(\d+)([smhd])$/.exec(expiresIn.trim());
    const now = new Date();
    if (!m) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    const n = Number(m[1]);
    const unit = m[2];
    const mult = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return new Date(now.getTime() + n * mult);
  }

  private async findMatchingToken(plain: string, hashes: string[]): Promise<boolean> {
    for (const h of hashes) {
      try {
        if (await argon2.verify(h, plain)) return true;
      } catch {
      }
    }
    return false;
  }
}
