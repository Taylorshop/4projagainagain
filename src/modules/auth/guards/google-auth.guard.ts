import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest(_err: any, user: any, _info: any, context: ExecutionContext) {
    // Don't throw on auth failure — let the callback controller redirect gracefully
    if (!user) {
      const req = context.switchToHttp().getRequest();
      req.googleAuthError = req.googleAuthError ?? 'auth_failed';
    }
    return user ?? null;
  }
}
