import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() req: Request) {
    return this.auth.issueTokens((req as any).user);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return { user: (req as any).user };
  }

  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('oauth/google/link')
  async googleLinkInit(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    try {
      const payload = this.auth.verifyAccessToken(token);
      const linkToken = this.auth.signLinkToken(payload.sub);
      res.cookie('google_link_session', linkToken, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: 'lax',
      });
      const apiUrl = `http://localhost:${this.config.get<number>('PORT') ?? 3001}`;
      return res.redirect(`${apiUrl}/auth/oauth/google`);
    } catch {
      return res.redirect(`${frontendUrl}/settings?error=link_failed`);
    }
  }

  @Get('oauth/google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const user = (req as any).user as any;
    const error = (req as any).googleAuthError as string | undefined;

    if (!user) {
      if (error === 'email_exists') {
        return res.redirect(`${frontendUrl}/login?error=google_not_linked`);
      }
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    if (user._linked) {
      res.clearCookie('google_link_session');
      return res.redirect(`${frontendUrl}/settings?linked=1`);
    }

    const tokens = await this.auth.issueTokens(user);
    return res.redirect(
      `${frontendUrl}/auth/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`,
    );
  }
}
