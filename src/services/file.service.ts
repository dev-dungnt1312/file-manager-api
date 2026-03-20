import fs from 'node:fs/promises';
import type { Response } from 'express';
import type { ProjectRecord } from '../types/storage.js';
import { resolveStorage } from './storage-resolver.service.js';

export const fileService = {
  list(project: ProjectRecord, targetPath: string) {
    return resolveStorage(project).list(targetPath);
  },
  stat(project: ProjectRecord, targetPath: string) {
    return resolveStorage(project).stat(targetPath);
  },
  async upload(project: ProjectRecord, targetPath: string, localFilePath: string, mimeType?: string) {
    try {
      return await resolveStorage(project).write({ path: targetPath, localFilePath, mimeType });
    } finally {
      await fs.rm(localFilePath, { force: true });
    }
  },
  delete(project: ProjectRecord, targetPath: string) {
    return resolveStorage(project).delete(targetPath);
  },
  mkdir(project: ProjectRecord, targetPath: string) {
    return resolveStorage(project).mkdir(targetPath);
  },
  move(project: ProjectRecord, from: string, to: string) {
    return resolveStorage(project).move({ from, to });
  },
  copy(project: ProjectRecord, from: string, to: string) {
    return resolveStorage(project).copy({ from, to });
  },
  stream(project: ProjectRecord, targetPath: string, res: Response) {
    return resolveStorage(project).stream(targetPath, res);
  },
  healthcheck(project: ProjectRecord) {
    return resolveStorage(project).healthcheck();
  },
};
