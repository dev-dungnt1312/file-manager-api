import type { Response } from 'express';

export type StorageDriverName = 'local' | 's3' | 'minio' | 'ftp';

export type LocalConfig = {
  rootDir: string;
  publicBaseUrl?: string;
};

export type S3LikeConfig = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  prefix?: string;
  publicBaseUrl?: string;
};

export type FtpConfig = {
  host: string;
  port?: number;
  user: string;
  password: string;
  secure?: boolean;
  baseDir: string;
};

export type StorageConfig = LocalConfig | S3LikeConfig | FtpConfig;

export type ProjectRecord = {
  id: string;
  code: string;
  name: string;
  driver: StorageDriverName;
  storageConfig: StorageConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FileListItem = {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size: number | null;
  mimeType?: string | false;
  lastModified?: string | null;
};

export type FileStat = FileListItem;

export type WriteInput = {
  path: string;
  localFilePath: string;
  mimeType?: string;
};

export type MoveInput = {
  from: string;
  to: string;
};

export type CopyInput = {
  from: string;
  to: string;
};

export interface StorageDriver {
  list(targetPath: string): Promise<FileListItem[]>;
  stat(targetPath: string): Promise<FileStat>;
  write(input: WriteInput): Promise<FileStat>;
  delete(targetPath: string): Promise<void>;
  mkdir(targetPath: string): Promise<void>;
  move(input: MoveInput): Promise<void>;
  copy(input: CopyInput): Promise<void>;
  stream(targetPath: string, res: Response): Promise<void>;
  healthcheck(): Promise<{ ok: boolean; detail?: string }>;
}
