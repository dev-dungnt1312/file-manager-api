import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.header('x-api-token') || req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || token !== env.apiToken) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API token' } });
  }
  next();
}
