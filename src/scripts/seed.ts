import fs from 'node:fs';
import path from 'node:path';
import { projectService } from '../services/project.service.js';

const rootDir = path.resolve(process.cwd(), 'storage/local-demo');
fs.mkdirSync(rootDir, { recursive: true });

const existing = projectService.list().find((item) => item.code === 'demo-local');
if (!existing) {
  const project = projectService.create({
    code: 'demo-local',
    name: 'Demo Local Project',
    driver: 'local',
    storageConfig: {
      rootDir,
    },
  });
  console.log('Seeded project:', project);
} else {
  console.log('Project already exists:', existing);
}
