import type { Request, Response } from 'express';
import { z } from 'zod';
import { projectService } from '../services/project.service.js';
import type { StorageConfig } from '../types/storage.js';
import { redactSecrets } from '../utils/redact.js';

const localConfigSchema = z.object({
  rootDir: z.string().min(1),
  publicBaseUrl: z.string().url().optional(),
});

const s3LikeConfigSchema = z.object({
  bucket: z.string().min(1),
  region: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  endpoint: z.string().url().optional(),
  forcePathStyle: z.boolean().optional(),
  prefix: z.string().optional(),
  publicBaseUrl: z.string().url().optional(),
});

const ftpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().optional(),
  user: z.string().min(1),
  password: z.string().min(1),
  secure: z.boolean().optional(),
  baseDir: z.string().min(1),
});

const baseSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  driver: z.enum(['local', 's3', 'minio', 'ftp']),
  storageConfig: z.record(z.string(), z.any()),
  isActive: z.boolean().optional(),
});

function asString(value: unknown) {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
}

function parseStorageConfig(driver: 'local' | 's3' | 'minio' | 'ftp', storageConfig: Record<string, any>): StorageConfig {
  switch (driver) {
    case 'local':
      return localConfigSchema.parse(storageConfig);
    case 's3':
    case 'minio':
      return s3LikeConfigSchema.parse(storageConfig);
    case 'ftp':
      return ftpConfigSchema.parse(storageConfig);
  }
}

export const projectController = {
  list(_req: Request, res: Response) {
    return res.json({ success: true, data: redactSecrets(projectService.list()) });
  },

  create(req: Request, res: Response) {
    const payload = baseSchema.parse(req.body);
    const project = projectService.create({
      ...payload,
      storageConfig: parseStorageConfig(payload.driver, payload.storageConfig),
    });
    return res.status(201).json({ success: true, data: redactSecrets(project) });
  },

  get(req: Request, res: Response) {
    const project = projectService.getById(asString(req.params.projectId));
    return res.json({ success: true, data: redactSecrets(project) });
  },

  update(req: Request, res: Response) {
    const payload = baseSchema.extend({ isActive: z.boolean() }).parse(req.body);
    const project = projectService.update(asString(req.params.projectId), {
      ...payload,
      storageConfig: parseStorageConfig(payload.driver, payload.storageConfig),
    });
    return res.json({ success: true, data: redactSecrets(project) });
  },
};
