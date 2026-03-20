import express from 'express';
import fs from 'node:fs';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { router } from './routes/index.js';

fs.mkdirSync(env.uploadTmpDir, { recursive: true });

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(authMiddleware);
  app.use('/api', router);
  app.use(errorHandler);
  return app;
}
