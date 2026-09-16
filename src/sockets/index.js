import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import sessionModel from '../models/session.model.js';
import userModel from '../models/user.model.js';
import { verifyTeamChatAccess, saveMessage } from '../services/chat.service.js';
import mongoose from 'mongoose';

export function initSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const session = await sessionModel.findOne({
        _id: decoded.sessionId,
        user: decoded.id,
        revoked: false
      });

      if (!session) {
        return next(new Error('Authentication error: Session invalid'));
      }

      const user = await userModel.findById(decoded.id);
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User inactive'));
      }

      socket.user = {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'STUDENT',
        collegeId: user.collegeId || null,
        verified: user.verified
      };

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_team_chat', async ({ teamId }) => {
      try {
        if (!teamId) {
          socket.emit('error', { message: 'teamId is required' });
          return;
        }

        // Admins can join any room, others must be members
        if (socket.user.role !== 'ADMIN') {
          await verifyTeamChatAccess(socket.user._id, teamId);
        }

        const Team = mongoose.model('Team');
        const team = await Team.findById(teamId).lean();
        if (!team) {
          socket.emit('error', { message: 'Team not found in DB' });
          return;
        }

        const roomName = `event_${team.eventId}_team_${team._id}`;
        socket.join(roomName);
        
        // Save to socket state for easy access during send_message
        socket.activeTeamRoom = roomName;
        socket.activeTeamId = team._id;
        socket.activeEventId = team.eventId;

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('leave_team_chat', () => {
      if (socket.activeTeamRoom) {
        socket.leave(socket.activeTeamRoom);
        socket.activeTeamRoom = null;
        socket.activeTeamId = null;
        socket.activeEventId = null;
      }
    });

    socket.on('send_message', async (data) => {
      try {
        if (!socket.activeTeamRoom) {
          socket.emit('error', { message: 'Not joined in any team chat' });
          return;
        }

        const { type, message } = data;
        
        // We only allow TEXT via socket directly (media goes through REST)
        if (type !== 'TEXT') {
          socket.emit('error', { message: 'Only TEXT messages can be sent via socket. Use REST API for media.' });
          return;
        }

        if (!message || message.trim() === '') {
          socket.emit('error', { message: 'Message text is required' });
          return;
        }

        const savedMsg = await saveMessage({
          eventId: socket.activeEventId,
          teamId: socket.activeTeamId,
          senderId: socket.user._id,
          type: 'TEXT',
          message
        });

        io.to(socket.activeTeamRoom).emit('new_message', savedMsg);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      // automatically handled by Socket.IO
    });
  });

  return io;
}
