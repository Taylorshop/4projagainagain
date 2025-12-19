import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = config.get<string>('STORAGE_ROOT') ?? './storage';
    fs.mkdirSync(this.root, { recursive: true });
  }

  resolveRelative(rel: string) {
    const safe = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.root, safe);
  }
}
