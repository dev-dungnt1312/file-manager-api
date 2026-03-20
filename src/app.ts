import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { env } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { router } from './routes/index.js';

fs.mkdirSync(env.uploadTmpDir, { recursive: true });
const openapiDocument = YAML.load(path.resolve(process.cwd(), 'src/docs/openapi.yaml'));

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/dashboard', express.static(path.resolve(process.cwd(), 'src/public/dashboard')));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
  app.use(authMiddleware);
  app.use('/api', router);
  app.use(errorHandler);
  return app;
}
