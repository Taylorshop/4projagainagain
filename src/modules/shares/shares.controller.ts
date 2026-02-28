import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SharesService } from './shares.service';
import { CreateShareDto } from './dto/create-share.dto';

@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  // ── Authenticated endpoints ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post()
  createShare(@Req() req: Request, @Body() dto: CreateShareDto) {
    return this.sharesService.createShare((req as any).user.id as string, dto.itemId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  listShares(@Req() req: Request) {
    return this.sharesService.listShares((req as any).user.id as string);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteShare(@Req() req: Request, @Param('id') id: string) {
    return this.sharesService.deleteShare((req as any).user.id as string, id);
  }

  // ── Public endpoints (no auth required) ───────────────────────────────────

  @Get('public/:token')
  getPublicShare(@Param('token') token: string) {
    return this.sharesService.getPublicShare(token);
  }

  @Get('public/:token/download')
  async downloadPublicShare(@Param('token') token: string, @Res() res: Response) {
    return this.sharesService.downloadPublicShare(token, res);
  }
}
