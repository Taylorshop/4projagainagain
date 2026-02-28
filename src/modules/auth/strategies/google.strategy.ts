import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Strategy, Profile } from 'passport-google-oauth20';
import { Request } from 'express';

import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
    private readonly jwtService: JwtService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'google-client-id-not-configured',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'google-client-secret-not-configured',
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:3001/auth/oauth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, _accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) return null;

    const googleId = profile.id;
    const displayName =
      profile.displayName ?? email.split('@')[0] ?? 'User';

    // ── Link flow: user is logged in and wants to connect Google ─────────────
    const linkToken = (req.cookies as Record<string, string>)?.google_link_session;
    if (linkToken) {
      try {
        const payload = this.jwtService.verify<{ action: string; userId: string }>(linkToken);
        if (payload.action === 'link' && payload.userId) {
          // Ensure this Google account isn't already bound to a different user
          const existing = await this.users.findByGoogleId(googleId);
          if (existing && existing.id !== payload.userId) {
            (req as any).googleAuthError = 'already_linked';
            return null;
          }
          const user = await this.users.linkGoogle(payload.userId, googleId);
          return { id: user.id, email: user.email, displayName: user.displayName ?? null, _linked: true };
        }
      } catch {
        // Expired / invalid link token → fall through to login
      }
    }

    // ── Login flow: only match by googleId ────────────────────────────────────
    let user = await this.users.findByGoogleId(googleId);
    if (user) {
      return { id: user.id, email: user.email, displayName: user.displayName ?? null };
    }

    // No googleId match — check if an email account already exists
    const emailUser = await this.users.findByEmail(email.toLowerCase());
    if (emailUser) {
      // Account exists but Google is not connected — user must connect from Settings
      (req as any).googleAuthError = 'email_exists';
      return null;
    }

    // Brand-new user via Google
    user = await this.users.createUser({ email: email.toLowerCase(), displayName, googleId });
    return { id: user.id, email: user.email, displayName: user.displayName ?? null };
  }
}
