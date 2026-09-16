import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import * as chatController from '../controllers/chat.controller.js';

const chatRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

chatRouter.use(authenticate);

chatRouter.get('/teams/:teamId/messages', chatController.getMessages);
chatRouter.post('/teams/:teamId/messages', upload.single('file'), chatController.postMessage);
chatRouter.get('/messages/:messageId/media', chatController.getMedia);

export default chatRouter;
