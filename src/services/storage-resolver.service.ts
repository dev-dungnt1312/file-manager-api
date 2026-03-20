import type { ProjectRecord, StorageDriver } from '../types/storage.js';
import { FtpDriver } from '../drivers/ftp.driver.js';
import { LocalDriver } from '../drivers/local.driver.js';
import { S3Driver } from '../drivers/s3.driver.js';

export function resolveStorage(project: ProjectRecord): StorageDriver {
  switch (project.driver) {
    case 'local':
      return new LocalDriver(project.storageConfig as any);
    case 's3':
    case 'minio':
      return new S3Driver(project.storageConfig as any);
    case 'ftp':
      return new FtpDriver(project.storageConfig as any);
    default:
      throw new Error(`Unsupported driver: ${project.driver satisfies never}`);
  }
}
