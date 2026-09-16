import './src/config/polyfill.js';
import http from 'http';
import app from './src/app.js';
import connectDB from './src/config/database.js';
import { initSocket } from './src/config/socket.js';
import config from './src/config/config.js';

const server = http.createServer(app);

// Initialize Socket.IO foundation on the HTTP server
initSocket(server);

const startServer = async () => {
  await connectDB();

  server.listen(config.PORT, () => {
    console.log(`🚀 YUWA Ecolympics Backend running in ${config.NODE_ENV} mode on port ${config.PORT}`);
    console.log(`📡 Socket.IO initialized for realtime communication`);
    console.log(`💾 Storage Provider: ${config.STORAGE_PROVIDER}`);
  });
};

// Graceful shutdown handling
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();

export { server, app };
