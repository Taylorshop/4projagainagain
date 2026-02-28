import * as fs from 'fs';
import * as archiver from 'archiver';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Item, ItemType } from '@prisma/client';
import { Response } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateItemDto } from './dto/update-item.dto';

/** 30 GB quota per user (in bytes). */
const QUOTA_BYTES = BigInt(30) * BigInt(1024) * BigInt(1024) * BigInt(1024);

/** Safe JSON-serialisable version of Item (BigInt -> string). */
export type SerializedItem = Omit<Item, 'sizeBytes'> & { sizeBytes: string | null };

function serializeItem(item: Item): SerializedItem {
  return { ...item, sizeBytes: item.sizeBytes !== null ? item.sizeBytes.toString() : null };
}

/** Parse an optional parentId query param; treat empty / "null" / "undefined" as root. */
function parseParentId(raw?: string): string | null {
  if (!raw || raw === 'null' || raw === 'undefined') return null;
  return raw;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async listItems(userId: string, parentIdRaw?: string): Promise<SerializedItem[]> {
    const parentId = parseParentId(parentIdRaw);
    const items = await this.prisma.item.findMany({
      where: { userId, parentId, trashedAt: null },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return items.map(serializeItem);
  }

  async listTrash(userId: string): Promise<SerializedItem[]> {
    const items = await this.prisma.item.findMany({
      where: { userId, trashedAt: { not: null } },
      orderBy: { trashedAt: 'desc' },
    });
    return items.map(serializeItem);
  }

  async searchItems(userId: string, query: string): Promise<SerializedItem[]> {
    if (!query?.trim()) return [];
    const items = await this.prisma.item.findMany({
      where: { userId, trashedAt: null, name: { contains: query.trim(), mode: 'insensitive' } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      take: 100,
    });
    return items.map(serializeItem);
  }

  async getItemSerialized(userId: string, itemId: string): Promise<SerializedItem> {
    return serializeItem(await this.requireItem(userId, itemId));
  }

  async createFolder(userId: string, dto: CreateFolderDto): Promise<SerializedItem> {
    if (dto.parentId) await this.requireFolder(userId, dto.parentId);

    const folder = await this.prisma.item.create({
      data: { userId, type: ItemType.FOLDER, name: dto.name, parentId: dto.parentId ?? null },
    });
    return serializeItem(folder);
  }

  async uploadFiles(
    userId: string,
    files: Express.Multer.File[],
    parentIdRaw?: string,
  ): Promise<SerializedItem[]> {
    if (!files?.length) throw new BadRequestException('No files provided');
    const parentId = parseParentId(parentIdRaw);

    if (parentId) await this.requireFolder(userId, parentId);

    const totalUpload = files.reduce((sum, f) => sum + BigInt(f.size), BigInt(0));
    const { usedBytes } = await this.getQuotaRaw(userId);
    if (usedBytes + totalUpload > QUOTA_BYTES) {
      await this.unlinkTempFiles(files);
      throw new PayloadTooLargeException('Storage quota exceeded');
    }

    const results: SerializedItem[] = [];
    for (const file of files) {
      const originalName = this.decodeFilename(file.originalname);
      const item = await this.prisma.item.create({
        data: {
          userId,
          type: ItemType.FILE,
          name: originalName,
          parentId,
          mimeType: file.mimetype,
          sizeBytes: BigInt(file.size),
          storageKey: '',
        },
      });

      await this.storage.moveToStorage(file.path, userId, item.id);

      const updated = await this.prisma.item.update({
        where: { id: item.id },
        data: { storageKey: `${userId}/${item.id}` },
      });
      results.push(serializeItem(updated));
    }
    return results;
  }

  async updateItem(userId: string, itemId: string, dto: UpdateItemDto): Promise<SerializedItem> {
    const item = await this.requireItem(userId, itemId);
    if (item.trashedAt) throw new BadRequestException('Cannot modify a trashed item');

    const data: { name?: string; parentId?: string | null } = {};

    if (dto.name !== undefined) data.name = dto.name;

    if (dto.moveToRoot) {
      data.parentId = null;
    } else if (dto.newParentId !== undefined) {
      const parent = await this.requireFolder(userId, dto.newParentId);
      if (item.type === ItemType.FOLDER) await this.assertNotDescendant(itemId, parent.id);
      data.parentId = parent.id;
    }

    const updated = await this.prisma.item.update({ where: { id: itemId }, data });
    return serializeItem(updated);
  }

  async trashItem(userId: string, itemId: string): Promise<SerializedItem> {
    await this.requireItem(userId, itemId);
    const updated = await this.prisma.item.update({
      where: { id: itemId },
      data: { trashedAt: new Date() },
    });
    return serializeItem(updated);
  }

  async restoreItem(userId: string, itemId: string): Promise<SerializedItem> {
    const item = await this.requireItem(userId, itemId);
    if (!item.trashedAt) throw new BadRequestException('Item is not trashed');

    let parentId = item.parentId;
    if (parentId) {
      const parent = await this.prisma.item.findFirst({ where: { id: parentId, userId } });
      if (!parent || parent.trashedAt) parentId = null;
    }

    const updated = await this.prisma.item.update({
      where: { id: itemId },
      data: { trashedAt: null, parentId },
    });
    return serializeItem(updated);
  }

  async permanentDelete(userId: string, itemId: string): Promise<{ deleted: boolean }> {
    const item = await this.requireItem(userId, itemId);
    if (item.type === ItemType.FOLDER) {
      await this.deleteFolderRecursive(userId, itemId);
    } else {
      await this.storage.deleteFile(userId, itemId);
      await this.prisma.item.delete({ where: { id: itemId } });
    }
    return { deleted: true };
  }

  async streamFile(
    userId: string,
    itemId: string,
    res: Response,
    inline: boolean,
  ): Promise<void> {
    const item = await this.requireItem(userId, itemId);
    if (item.type !== ItemType.FILE) throw new BadRequestException('Not a file');
    if (!(await this.storage.fileExists(userId, itemId))) throw new NotFoundException('File data not found');

    // Force safe content type for inline display to prevent XSS via HTML uploads
    let mime = item.mimeType ?? 'application/octet-stream';
    if (inline && mime === 'text/html') mime = 'text/plain';

    const disposition = inline
      ? 'inline'
      : `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}`;

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', disposition);
    if (item.sizeBytes) res.setHeader('Content-Length', item.sizeBytes.toString());

    const stream = await this.storage.getDownloadStream(userId, itemId);
    stream.pipe(res);
  }

  async streamZip(userId: string, itemId: string, res: Response): Promise<void> {
    const item = await this.requireItem(userId, itemId);
    if (item.type !== ItemType.FOLDER) throw new BadRequestException('Not a folder');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}.zip`,
    );
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => res.destroy(err));
    archive.pipe(res);

    await this.addFolderToArchive(archive, userId, itemId, '');
    await archive.finalize();
  }

  async getQuota(userId: string) {
    const { usedBytes } = await this.getQuotaRaw(userId);
    return {
      usedBytes: usedBytes.toString(),
      maxBytes: QUOTA_BYTES.toString(),
      freeBytes: (QUOTA_BYTES - usedBytes).toString(),
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    const files = await this.prisma.item.findMany({
      where: { userId, type: ItemType.FILE },
      select: { id: true },
    });
    await Promise.all(files.map((f) => this.storage.deleteFile(userId, f.id)));
    await this.prisma.user.delete({ where: { id: userId } });
  }

  private async requireItem(userId: string, itemId: string): Promise<Item> {
    const item = await this.prisma.item.findFirst({ where: { id: itemId, userId } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  private async requireFolder(userId: string, folderId: string): Promise<Item> {
    const folder = await this.prisma.item.findFirst({
      where: { id: folderId, userId, trashedAt: null, type: ItemType.FOLDER },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  private async getQuotaRaw(userId: string): Promise<{ usedBytes: bigint }> {
    const result = await this.prisma.item.aggregate({
      where: { userId, type: ItemType.FILE, trashedAt: null },
      _sum: { sizeBytes: true },
    });
    return { usedBytes: result._sum.sizeBytes ?? BigInt(0) };
  }

  private async deleteFolderRecursive(userId: string, folderId: string): Promise<void> {
    const children = await this.prisma.item.findMany({ where: { userId, parentId: folderId } });
    for (const child of children) {
      if (child.type === ItemType.FOLDER) {
        await this.deleteFolderRecursive(userId, child.id);
      } else {
        await this.storage.deleteFile(userId, child.id);
        await this.prisma.item.delete({ where: { id: child.id } });
      }
    }
    await this.prisma.item.delete({ where: { id: folderId } });
  }

  private async addFolderToArchive(
    archive: ReturnType<typeof archiver>,
    userId: string,
    folderId: string,
    prefix: string,
  ): Promise<void> {
    const children = await this.prisma.item.findMany({
      where: { userId, parentId: folderId, trashedAt: null },
    });
    for (const child of children) {
      if (child.type === ItemType.FILE && await this.storage.fileExists(userId, child.id)) {
        const stream = await this.storage.getDownloadStream(userId, child.id);
        archive.append(stream, { name: `${prefix}${child.name}` });
      } else if (child.type === ItemType.FOLDER) {
        await this.addFolderToArchive(archive, userId, child.id, `${prefix}${child.name}/`);
      }
    }
  }

  private async assertNotDescendant(ancestorId: string, targetId: string): Promise<void> {
    if (targetId === ancestorId) {
      throw new BadRequestException('Impossible de déplacer un dossier dans lui-même.');
    }
    let current: Item | null = await this.prisma.item.findUnique({ where: { id: targetId } });
    while (current?.parentId) {
      if (current.parentId === ancestorId) {
        throw new BadRequestException('Impossible de déplacer un dossier dans l\'un de ses sous-dossiers.');
      }
      current = await this.prisma.item.findUnique({ where: { id: current.parentId } });
    }
  }

  private async unlinkTempFiles(files: Express.Multer.File[]): Promise<void> {
    for (const f of files) await fs.promises.unlink(f.path).catch(() => {});
  }

  /** Handle multer's latin1 filename encoding (browser behaviour). */
  private decodeFilename(name: string): string {
    try {
      return Buffer.from(name, 'latin1').toString('utf8');
    } catch {
      return name;
    }
  }
}
