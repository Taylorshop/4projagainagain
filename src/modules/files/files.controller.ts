import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  @Get()
  list() {
    return { todo: true, message: 'Implement listing tree for current folder' };
  }

  @Post('upload')
  upload() {
    return { todo: true, message: 'Implement multipart upload + progress on frontend' };
  }

  @Post('zip')
  zipFolder() {
    return { todo: true, message: 'Implement streaming ZIP generation for a folder' };
  }
}
