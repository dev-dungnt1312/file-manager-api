import type { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env.js';
import { fileService } from '../services/file.service.js';
import { projectService } from '../services/project.service.js';

export const upload = multer({ dest: env.uploadTmpDir });

const pathQuerySchema = z.object({ path: z.string().default('') });
const moveSchema = z.object({ from: z.string().min(1), to: z.string().min(1) });

function asString(value: unknown, fallback = '') {
  return Array.isArray(value) ? String(value[0] ?? fallback) : String(value ?? fallback);
}

function projectFrom(req: Request) {
  return projectService.getById(asString(req.params.projectId));
}

export const fileController = {
  async list(req: Request, res: Response) {
    const project = projectFrom(req);
    const { path } = pathQuerySchema.parse(req.query);
    const items = await fileService.list(project, path);
    return res.json({ success: true, data: items });
  },

  async stat(req: Request, res: Response) {
    const project = projectFrom(req);
    const { path } = pathQuerySchema.parse(req.query);
    const item = await fileService.stat(project, path);
    return res.json({ success: true, data: item });
  },

  async upload(req: Request, res: Response) {
    const project = projectFrom(req);
    const file = req.file;
    if (!file) throw new Error('Missing file');
    const targetPath = asString(req.body.path || file.originalname);
    const item = await fileService.upload(project, targetPath, file.path, file.mimetype);
    return res.status(201).json({ success: true, data: item });
  },

  async remove(req: Request, res: Response) {
    const project = projectFrom(req);
    const { path } = pathQuerySchema.parse(req.query);
    await fileService.delete(project, path);
    return res.json({ success: true, message: 'Deleted' });
  },

  async mkdir(req: Request, res: Response) {
    const project = projectFrom(req);
    const { path } = pathQuerySchema.parse(req.body);
    await fileService.mkdir(project, path);
    return res.status(201).json({ success: true, message: 'Directory created' });
  },

  async move(req: Request, res: Response) {
    const project = projectFrom(req);
    const payload = moveSchema.parse(req.body);
    await fileService.move(project, payload.from, payload.to);
    return res.json({ success: true, message: 'Moved' });
  },

  async copy(req: Request, res: Response) {
    const project = projectFrom(req);
    const payload = moveSchema.parse(req.body);
    await fileService.copy(project, payload.from, payload.to);
    return res.json({ success: true, message: 'Copied' });
  },

  async stream(req: Request, res: Response) {
    const project = projectFrom(req);
    const { path } = pathQuerySchema.parse(req.query);
    await fileService.stream(project, path, res);
  },

  async healthcheck(req: Request, res: Response) {
    const project = projectFrom(req);
    const status = await fileService.healthcheck(project);
    return res.json({ success: true, data: status });
  },
};
