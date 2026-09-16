import './config/polyfill.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

import config from './config/config.js';
import authRouter from './routes/auth.routes.js';
import teamRouter from './routes/team.routes.js';
import eventRouter from './routes/event.routes.js';
import invitationRouter from './routes/invitation.routes.js';
import userRouter from './routes/user.routes.js';
import submissionRouter from './routes/submission.routes.js';
import errorMiddleware from './middleware/error.middleware.js';
import AppError from './utils/AppError.js';

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS (Configured for Frontend with Cookie Exchange) ──────────────────────
app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Request Parsers & Cookie Support ─────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Request Logging ─────────────────────────────────────────────────────────
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Static Uploads for Local Storage Provider ───────────────────────────────
if (config.STORAGE_PROVIDER === 'local') {
  app.use('/uploads', express.static(path.join(process.cwd(), config.STORAGE_LOCAL_DIR)));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'YUWA Ecolympics API is running',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/teams', teamRouter);
app.use('/api/events', eventRouter);
app.use('/api/invitations', invitationRouter);
app.use('/api/users', userRouter);
app.use('/api/submissions', submissionRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// ─── Centralized Error Handling Middleware ───────────────────────────────────
app.use(errorMiddleware);

export default app;
