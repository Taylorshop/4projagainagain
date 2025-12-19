import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('shares')
export class SharesController {
  @UseGuards(JwtAuthGuard)
  @Post(':itemId')
  createShare(@Param('itemId') itemId: string) {
    return { todo: true, itemId, message: 'Create share token for file/folder' };
  }

  @Get('public/:token')
  getShared(@Param('token') token: string) {
    return { todo: true, token, message: 'Resolve token -> item and stream/download' };
  }
}
