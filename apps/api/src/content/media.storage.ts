import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ErrorCode } from '@ncanny/types';
import { AppException } from '../common/errors/app.exception';
import { AppConfigService } from '../config/app-config.service';
import { sniffMedia, type SniffedMedia } from './media-bytes';

@Injectable()
export class MediaStorage {
  private readonly root: string;

  constructor(config: AppConfigService) {
    this.root = path.resolve(config.mediaRoot ?? path.join(os.tmpdir(), 'ncanny-media'));
  }

  async save(declaredMime: string, dataBase64: string): Promise<{ sniffed: SniffedMedia; storageKey: string; byteSize: number }> {
    let bytes: Buffer;
    try {
      bytes = Buffer.from(dataBase64, 'base64');
    } catch {
      throw AppException.badRequest('The file could not be read.', ErrorCode.MEDIA_UPLOAD_FAILED);
    }

    const sniffed = sniffMedia(bytes, declaredMime);
    if (!sniffed) {
      throw AppException.badRequest(
        'That file type is not supported, or the file is larger than the limit.',
        ErrorCode.MEDIA_TYPE_UNSUPPORTED,
      );
    }

    const storageKey = randomBytes(16).toString('hex');
    const target = this.resolve(storageKey);
    await mkdir(this.root, { recursive: true });
    await writeFile(target, bytes);
    return { sniffed, storageKey, byteSize: bytes.length };
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolve(storageKey));
  }

  /** Rejects any key that would escape the media root. */
  private resolve(storageKey: string): string {
    if (!/^[a-f0-9]{32}$/.test(storageKey)) {
      throw AppException.notFound('Media not found.', ErrorCode.NOT_FOUND);
    }
    const target = path.resolve(this.root, storageKey);
    if (!target.startsWith(this.root + path.sep) && target !== this.root) {
      throw AppException.notFound('Media not found.', ErrorCode.NOT_FOUND);
    }
    return target;
  }
}
