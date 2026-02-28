import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly container: ContainerClient;
  private readonly tmpDir: string;

  constructor(private readonly config: ConfigService) {
    const connectionString = this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    }

    const containerName =
      this.config.get<string>('AZURE_STORAGE_CONTAINER') ?? 'supfile';

    this.container = BlobServiceClient
      .fromConnectionString(connectionString)
      .getContainerClient(containerName);

    // Local temp directory for multer uploads (ephemeral, not persisted)
    this.tmpDir = path.join(
      this.config.get<string>('STORAGE_ROOT') ?? './storage',
      'tmp',
    );
    fs.mkdirSync(this.tmpDir, { recursive: true });
  }

  async onModuleInit(): Promise<void> {
    await this.container.createIfNotExists();
  }

  private blobName(userId: string, itemId: string): string {
    return `${userId}/${itemId}`;
  }

  async moveToStorage(sourcePath: string, userId: string, itemId: string): Promise<void> {
    const client = this.container.getBlockBlobClient(this.blobName(userId, itemId));
    await client.uploadFile(sourcePath);
    await fs.promises.unlink(sourcePath).catch(() => {});
  }

  async deleteFile(userId: string, itemId: string): Promise<void> {
    const client = this.container.getBlockBlobClient(this.blobName(userId, itemId));
    await client.deleteIfExists();
  }

  async fileExists(userId: string, itemId: string): Promise<boolean> {
    const client = this.container.getBlockBlobClient(this.blobName(userId, itemId));
    return client.exists();
  }

  async getDownloadStream(userId: string, itemId: string): Promise<Readable> {
    const client = this.container.getBlockBlobClient(this.blobName(userId, itemId));
    const response = await client.download(0);
    if (!response.readableStreamBody) {
      throw new Error(`No stream body for blob ${this.blobName(userId, itemId)}`);
    }
    return response.readableStreamBody as Readable;
  }

}
