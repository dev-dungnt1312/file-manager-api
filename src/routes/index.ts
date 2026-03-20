import { Router } from 'express';
import { fileController, upload } from '../controllers/file.controller.js';
import { projectController } from '../controllers/project.controller.js';

export const router = Router();

router.get('/health', (_req, res) => res.json({ success: true, data: { ok: true } }));

router.get('/projects', projectController.list);
router.post('/projects', projectController.create);
router.get('/projects/:projectId', projectController.get);
router.put('/projects/:projectId', projectController.update);

router.get('/projects/:projectId/storage/health', fileController.healthcheck);
router.get('/projects/:projectId/files', fileController.list);
router.get('/projects/:projectId/files/meta', fileController.stat);
router.get('/projects/:projectId/files/content', fileController.stream);
router.post('/projects/:projectId/files/upload', upload.single('file'), fileController.upload);
router.delete('/projects/:projectId/files', fileController.remove);
router.post('/projects/:projectId/files/mkdir', fileController.mkdir);
router.post('/projects/:projectId/files/move', fileController.move);
router.post('/projects/:projectId/files/copy', fileController.copy);
