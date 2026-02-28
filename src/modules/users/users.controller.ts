import { Body, Controller, Delete, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesService } from '../files/files.service';
import { UsersService } from './users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly files: FilesService,
  ) {}

  private userId(req: Request): string {
    return (req as any).user.id as string;
  }

  @Get('me/quota')
  getQuota(@Req() req: Request) {
    return this.files.getQuota(this.userId(req));
  }

  @Get('me/connections')
  getConnections(@Req() req: Request) {
    return this.users.getConnections(this.userId(req));
  }

  @Delete('me/connections/google')
  unlinkGoogle(@Req() req: Request) {
    return this.users.unlinkGoogle(this.userId(req));
  }

  @Post('me/password')
  setPassword(@Req() req: Request, @Body() dto: SetPasswordDto) {
    return this.users.setPassword(this.userId(req), dto.newPassword);
  }

  @Patch('me/password')
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(this.userId(req), dto.currentPassword, dto.newPassword);
  }

  @Patch('me/profile')
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(this.userId(req), dto.displayName);
  }

  @Delete('me')
  deleteAccount(@Req() req: Request) {
    return this.files.deleteAccount(this.userId(req));
  }
}
