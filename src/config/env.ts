import path from 'node:path';

function required(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export const env = {
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3000),
  apiToken: required('API_TOKEN', 'change-me'),
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH ?? './data/app.db'),
  uploadTmpDir: path.resolve(process.cwd(), process.env.UPLOAD_TMP_DIR ?? './tmp'),
};
