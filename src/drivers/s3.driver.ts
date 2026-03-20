import fs from 'node:fs';
import mime from 'mime-types';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, CopyObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import type { Response } from 'express';
import type { CopyInput, FileListItem, FileStat, MoveInput, S3LikeConfig, StorageDriver, WriteInput } from '../types/storage.js';
import { cleanRelativePath, joinPosix } from '../utils/path.js';

export class S3Driver implements StorageDriver {
  private readonly client: S3Client;

  constructor(private readonly config: S3LikeConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private key(targetPath: string) {
    return joinPosix(this.config.prefix ?? '', cleanRelativePath(targetPath));
  }

  private fromKey(key: string, size?: number, lastModified?: Date): FileListItem {
    const withoutPrefix = this.config.prefix ? key.replace(new RegExp(`^${this.config.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?`), '') : key;
    return {
      path: withoutPrefix,
      name: withoutPrefix.split('/').filter(Boolean).pop() ?? withoutPrefix,
      type: 'file',
      size: size ?? null,
      mimeType: mime.lookup(withoutPrefix),
      lastModified: lastModified?.toISOString() ?? null,
    };
  }

  async list(targetPath: string): Promise<FileListItem[]> {
    const prefix = this.key(targetPath);
    const output = await this.client.send(new ListObjectsV2Command({
      Bucket: this.config.bucket,
      Prefix: prefix ? `${prefix.replace(/\/$/, '')}/` : this.config.prefix,
      Delimiter: '/',
    }));

    const files = (output.Contents ?? [])
      .filter((item) => item.Key && item.Key !== prefix && !item.Key?.endsWith('/'))
      .map((item) => this.fromKey(item.Key!, item.Size, item.LastModified));

    const directories = (output.CommonPrefixes ?? []).map((item) => {
      const relative = this.fromKey((item.Prefix ?? '').replace(/\/$/, ''));
      return { ...relative, type: 'directory' as const, size: null, mimeType: false as const };
    });

    return [...directories, ...files].sort((a, b) => a.name.localeCompare(b.name));
  }

  async stat(targetPath: string): Promise<FileStat> {
    const key = this.key(targetPath);
    const output = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
    return this.fromKey(key, output.ContentLength, output.LastModified);
  }

  async write(input: WriteInput): Promise<FileStat> {
    const key = this.key(input.path);
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: fs.createReadStream(input.localFilePath),
      ContentType: input.mimeType || mime.lookup(input.path) || 'application/octet-stream',
    }));
    return this.stat(input.path);
  }

  async delete(targetPath: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: this.key(targetPath) }));
  }

  async mkdir(targetPath: string): Promise<void> {
    const key = `${this.key(targetPath).replace(/\/$/, '')}/`;
    await this.client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: '' }));
  }

  async move(input: MoveInput): Promise<void> {
    await this.copy(input);
    await this.delete(input.from);
  }

  async copy(input: CopyInput): Promise<void> {
    const fromKey = this.key(input.from);
    const toKey = this.key(input.to);
    await this.client.send(new CopyObjectCommand({
      Bucket: this.config.bucket,
      Key: toKey,
      CopySource: `${this.config.bucket}/${fromKey}`,
    }));
  }

  async stream(targetPath: string, res: Response): Promise<void> {
    const key = this.key(targetPath);
    const output = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
    res.setHeader('Content-Type', output.ContentType || mime.lookup(targetPath) || 'application/octet-stream');
    await new Promise<void>((resolve, reject) => {
      const body = output.Body as NodeJS.ReadableStream;
      body.on('error', reject);
      body.on('end', () => resolve());
      body.pipe(res);
    });
  }

  async healthcheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      await this.client.send(new ListObjectsV2Command({ Bucket: this.config.bucket, MaxKeys: 1 }));
      return { ok: true };
    } catch (error) {
      return { ok: false, detail: (error as Error).message };
    }
  }
}
