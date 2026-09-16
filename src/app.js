import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes.js';
import adminRouter from './routes/admin.routes.js';
import evaluatorRouter from './routes/evaluator.routes.js';
import studentRouter from './routes/student.routes.js';
import submissionRouter from './routes/submission.routes.js';
import { ensureStorageDirectories } from './services/file-storage.service.js';

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());

ensureStorageDirectories().catch((error) => {
  console.error('Storage setup failed:', error);
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/evaluator', evaluatorRouter);
app.use('/api/student', studentRouter);
app.use('/api', submissionRouter);

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) {
    return next(error);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

export default app;