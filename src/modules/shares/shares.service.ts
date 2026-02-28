import { randomBytes } from 'crypto';
import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async createShare(userId: string, itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, userId, trashedAt: null },
    });
    if (!item) throw new NotFoundException('Item not found');

    // Return existing share link if one already exists for this item
    const existing = await this.prisma.shareLink.findFirst({ where: { itemId, userId } });
    if (existing) return existing;

    const token = randomBytes(32).toString('hex');
    return this.prisma.shareLink.create({ data: { userId, itemId, token } });
  }

  async listShares(userId: string) {
    const links = await this.prisma.shareLink.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((l) => ({
      ...l,
      item: {
        ...l.item,
        sizeBytes: l.item.sizeBytes?.toString() ?? null,
      },
    }));
  }

  async deleteShare(userId: string, shareId: string) {
    const share = await this.prisma.shareLink.findFirst({ where: { id: shareId, userId } });
    if (!share) throw new NotFoundException('Share link not found');
    await this.prisma.shareLink.delete({ where: { id: shareId } });
    return { deleted: true };
  }

  async getPublicShare(token: string) {
    const share = await this.prisma.shareLink.findUnique({
      where: { token },
      include: { item: true },
    });
    if (!share) throw new NotFoundException('Share not found');
    this.assertNotExpired(share.expiresAt);

    return {
      id: share.id,
      token: share.token,
      createdAt: share.createdAt,
      item: {
        id: share.item.id,
        name: share.item.name,
        type: share.item.type,
        mimeType: share.item.mimeType,
        sizeBytes: share.item.sizeBytes?.toString() ?? null,
        createdAt: share.item.createdAt,
      },
    };
  }

  async downloadPublicShare(token: string, res: Response) {
    const share = await this.prisma.shareLink.findUnique({
      where: { token },
      include: { item: true },
    });
    if (!share) throw new NotFoundException('Share not found');
    this.assertNotExpired(share.expiresAt);

    const { item } = share;
    if (item.type === 'FILE') {
      await this.filesService.streamFile(item.userId, item.id, res, false);
    } else {
      await this.filesService.streamZip(item.userId, item.id, res);
    }
  }

  private assertNotExpired(expiresAt: Date | null) {
    if (expiresAt && expiresAt < new Date()) {
      throw new GoneException('This share link has expired');
    }
  }
}
