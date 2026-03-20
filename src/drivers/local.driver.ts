import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import mime from 'mime-types';
import type { Response } from 'express';
import type { FileListItem, FileStat, LocalConfig, StorageDriver, WriteInput, MoveInput, CopyInput } from '../types/storage.js';
import { cleanRelativePath } from '../utils/path.js';

export class LocalDriver implements StorageDriver {
  constructor(private readonly config: LocalConfig) {}

  private resolvePath(targetPath: string) {
    const relative = cleanRelativePath(targetPath);
    const absolute = path.resolve(this.config.rootDir, relative);
    const root = path.resolve(this.config.rootDir);
    if (!absolute.startsWith(root)) throw new Error('Path escapes root directory');
    return { absolute, relative };
  }

  private async toStat(targetPath: string, stats?: fs.Stats): Promise<FileStat> {
    const { absolute, relative } = this.resolvePath(targetPath);
    const s = stats ?? await fsp.stat(absolute);
    return {
      path: relative,
      name: path.basename(relative || absolute),
      type: s.isDirectory() ? 'directory' : 'file',
      size: s.isDirectory() ? null : s.size,
      mimeType: s.isDirectory() ? false : mime.lookup(relative),
      lastModified: s.mtime.toISOString(),
    };
  }

  async list(targetPath: string): Promise<FileListItem[]> {
    const { absolute, relative } = this.resolvePath(targetPath);
    const entries = await fsp.readdir(absolute, { withFileTypes: true });
    const items = await Promise.all(entries.map(async (entry) => {
      const childRelative = cleanRelativePath(path.posix.join(relative, entry.name));
      const childAbsolute = path.join(absolute, entry.name);
      const stats = await fsp.stat(childAbsolute);
      return this.toStat(childRelative, stats);
    }));
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async stat(targetPath: string): Promise<FileStat> {
    return this.toStat(targetPath);
  }

  async write(input: WriteInput): Promise<FileStat> {
    const { absolute, relative } = this.resolvePath(input.path);
    await fsp.mkdir(path.dirname(absolute), { recursive: true });
    await fsp.copyFile(input.localFilePath, absolute);
    return this.toStat(relative);
  }

  async delete(targetPath: string): Promise<void> {
    const { absolute } = this.resolvePath(targetPath);
    await fsp.rm(absolute, { recursive: true, force: true });
  }

  async mkdir(targetPath: string): Promise<void> {
    const { absolute } = this.resolvePath(targetPath);
    await fsp.mkdir(absolute, { recursive: true });
  }

  async move(input: MoveInput): Promise<void> {
    const from = this.resolvePath(input.from).absolute;
    const to = this.resolvePath(input.to).absolute;
    await fsp.mkdir(path.dirname(to), { recursive: true });
    await fsp.rename(from, to);
  }

  async copy(input: CopyInput): Promise<void> {
    const from = this.resolvePath(input.from).absolute;
    const to = this.resolvePath(input.to).absolute;
    await fsp.mkdir(path.dirname(to), { recursive: true });
    await fsp.copyFile(from, to);
  }

  async stream(targetPath: string, res: Response): Promise<void> {
    const { absolute, relative } = this.resolvePath(targetPath);
    const contentType = mime.lookup(relative) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(absolute);
      stream.on('error', reject);
      stream.on('end', () => resolve());
      stream.pipe(res);
    });
  }

  async healthcheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      await fsp.mkdir(this.config.rootDir, { recursive: true });
      return { ok: true };
    } catch (error) {
      return { ok: false, detail: (error as Error).message };
    }
  }
}
