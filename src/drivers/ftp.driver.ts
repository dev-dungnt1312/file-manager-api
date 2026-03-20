import fs from 'node:fs';
import path from 'node:path';
import mime from 'mime-types';
import * as ftp from 'basic-ftp';
import type { Response } from 'express';
import type { CopyInput, FileListItem, FileStat, FtpConfig, MoveInput, StorageDriver, WriteInput } from '../types/storage.js';
import { cleanRelativePath, joinPosix } from '../utils/path.js';

export class FtpDriver implements StorageDriver {
  constructor(private readonly config: FtpConfig) {}

  private remote(targetPath: string) {
    return `/${joinPosix(this.config.baseDir, cleanRelativePath(targetPath))}`;
  }

  private async withClient<T>(fn: (client: ftp.Client) => Promise<T>) {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
      await client.access({
        host: this.config.host,
        port: this.config.port ?? 21,
        user: this.config.user,
        password: this.config.password,
        secure: this.config.secure ?? false,
      });
      return await fn(client);
    } finally {
      client.close();
    }
  }

  async list(targetPath: string): Promise<FileListItem[]> {
    return this.withClient(async (client) => {
      const remote = this.remote(targetPath);
      const entries = await client.list(remote);
      return entries.map((entry) => ({
        path: cleanRelativePath(path.posix.join(targetPath, entry.name)),
        name: entry.name,
        type: entry.isDirectory ? 'directory' : 'file',
        size: entry.isDirectory ? null : entry.size,
        mimeType: entry.isDirectory ? false : mime.lookup(entry.name),
        lastModified: entry.modifiedAt?.toISOString() ?? null,
      }));
    });
  }

  async stat(targetPath: string): Promise<FileStat> {
    return this.withClient(async (client) => {
      const remote = this.remote(targetPath);
      const size = await client.size(remote);
      let lastModified: string | null = null;
      try {
        lastModified = (await client.lastMod(remote)).toISOString();
      } catch {
        lastModified = null;
      }
      return {
        path: cleanRelativePath(targetPath),
        name: path.posix.basename(cleanRelativePath(targetPath)),
        type: 'file',
        size,
        mimeType: mime.lookup(targetPath),
        lastModified,
      };
    });
  }

  async write(input: WriteInput): Promise<FileStat> {
    return this.withClient(async (client) => {
      const remote = this.remote(input.path);
      await client.ensureDir(path.posix.dirname(remote));
      await client.uploadFrom(input.localFilePath, remote);
      return this.stat(input.path);
    });
  }

  async delete(targetPath: string): Promise<void> {
    return this.withClient(async (client) => {
      const remote = this.remote(targetPath);
      try {
        await client.remove(remote);
      } catch {
        await client.removeDir(remote);
      }
    });
  }

  async mkdir(targetPath: string): Promise<void> {
    return this.withClient(async (client) => {
      await client.ensureDir(this.remote(targetPath));
    });
  }

  async move(input: MoveInput): Promise<void> {
    const tempFile = path.join(process.cwd(), 'tmp', `${Date.now()}-${path.basename(input.from)}`);
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    await this.withClient(async (client) => {
      await client.downloadTo(tempFile, this.remote(input.from));
      await client.ensureDir(path.posix.dirname(this.remote(input.to)));
      await client.uploadFrom(tempFile, this.remote(input.to));
      await client.remove(this.remote(input.from));
    });
    fs.rmSync(tempFile, { force: true });
  }

  async copy(input: CopyInput): Promise<void> {
    const tempFile = path.join(process.cwd(), 'tmp', `${Date.now()}-${path.basename(input.from)}`);
    fs.mkdirSync(path.dirname(tempFile), { recursive: true });
    await this.withClient(async (client) => {
      await client.downloadTo(tempFile, this.remote(input.from));
      await client.ensureDir(path.posix.dirname(this.remote(input.to)));
      await client.uploadFrom(tempFile, this.remote(input.to));
    });
    fs.rmSync(tempFile, { force: true });
  }

  async stream(targetPath: string, res: Response): Promise<void> {
    await this.withClient(async (client) => {
      res.setHeader('Content-Type', mime.lookup(targetPath) || 'application/octet-stream');
      await client.downloadTo(res as any, this.remote(targetPath));
    });
  }

  async healthcheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      await this.withClient(async (client) => {
        await client.list(`/${this.config.baseDir.replace(/^\/+/, '')}`);
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, detail: (error as Error).message };
    }
  }
}
