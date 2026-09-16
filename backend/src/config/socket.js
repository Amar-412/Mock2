import { Server } from 'socket.io';
import config from './config.js';

let io;

/**
 * Initialize Socket.IO server on an existing HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    if (config.NODE_ENV !== 'test') {
      console.log(`📡 Socket connected: ${socket.id}`);
    }

    socket.on('disconnect', () => {
      if (config.NODE_ENV !== 'test') {
        console.log(`📡 Socket disconnected: ${socket.id}`);
      }
    });
  });

  return io;
};

/**
 * Retrieve the active Socket.IO server instance.
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized — call initSocket first');
  }
  return io;
};

export default { initSocket, getIO };
