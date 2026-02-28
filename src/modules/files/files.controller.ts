import * as fs from 'fs';
import * as path from 'path';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesService } from './files.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateItemDto } from './dto/update-item.dto';

const multerOptions = {
  storage: diskStorage({
    destination: (
      _req: Express.Request,
      _file: Express.Multer.File,
      cb: (err: Error | null, dest: string) => void,
    ) => {
      const tmpDir = path.join(process.env.STORAGE_ROOT ?? './storage', 'tmp');
      fs.mkdirSync(tmpDir, { recursive: true });
      cb(null, tmpDir);
    },
    filename: (
      _req: Express.Request,
      _file: Express.Multer.File,
      cb: (err: Error | null, name: string) => void,
    ) => {
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB per file
};

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  private userId(req: Request): string {
    return (req as any).user.id as string;
  }

  // ── Listing ───────────────────────────────────────────────────────────────

  @Get()
  list(@Req() req: Request, @Query('parentId') parentId?: string) {
    return this.filesService.listItems(this.userId(req), parentId);
  }

  @Get('trash')
  listTrash(@Req() req: Request) {
    return this.filesService.listTrash(this.userId(req));
  }

  @Get('search')
  search(@Req() req: Request, @Query('q') q: string) {
    return this.filesService.searchItems(this.userId(req), q ?? '');
  }

  // ── Create ────────────────────────────────────────────────────────────────

  @Post('folders')
  createFolder(@Req() req: Request, @Body() dto: CreateFolderDto) {
    return this.filesService.createFolder(this.userId(req), dto);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 20, multerOptions))
  upload(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('parentId') parentId?: string,
  ) {
    return this.filesService.uploadFiles(this.userId(req), files, parentId);
  }

  // ── Single item (note: specific routes must come before :id) ──────────────

  @Get(':id')
  getItem(@Req() req: Request, @Param('id') id: string) {
    return this.filesService.getItemSerialized(this.userId(req), id);
  }

  @Get(':id/download')
  async download(@Req() req: Request, @Param('id') id: string, @Res() res: Response) {
    return this.filesService.streamFile(this.userId(req), id, res, false);
  }

  @Get(':id/preview')
  async preview(@Req() req: Request, @Param('id') id: string, @Res() res: Response) {
    return this.filesService.streamFile(this.userId(req), id, res, true);
  }

  @Get(':id/zip')
  async zip(@Req() req: Request, @Param('id') id: string, @Res() res: Response) {
    return this.filesService.streamZip(this.userId(req), id, res);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.filesService.updateItem(this.userId(req), id, dto);
  }

  // ── Trash / restore / permanent delete ────────────────────────────────────

  @Delete(':id')
  moveToTrash(@Req() req: Request, @Param('id') id: string) {
    return this.filesService.trashItem(this.userId(req), id);
  }

  @Post(':id/restore')
  restore(@Req() req: Request, @Param('id') id: string) {
    return this.filesService.restoreItem(this.userId(req), id);
  }

  @Delete(':id/permanent')
  permanentDelete(@Req() req: Request, @Param('id') id: string) {
    return this.filesService.permanentDelete(this.userId(req), id);
  }
}
