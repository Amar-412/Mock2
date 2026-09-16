import mongoose from 'mongoose';
import { verifyTeamChatAccess, getTeamMessages, saveMessage } from '../services/chat.service.js';
import { saveUploadedFile } from '../services/file-storage.service.js';
import ChatMessage from '../models/chatMessage.model.js';
import fs from 'fs/promises';

function jsonSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function jsonError(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}

export async function getMessages(req, res) {
  try {
    const { teamId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Wait, Admins can also view messages
    if (req.user.role !== 'ADMIN') {
      await verifyTeamChatAccess(req.user._id, teamId);
    }

    const messages = await getTeamMessages(teamId, page, limit);
    return jsonSuccess(res, messages);
  } catch (error) {
    const status = error.message.includes('Forbidden') ? 403 : 404;
    return jsonError(res, error.message, status);
  }
}

export async function postMessage(req, res) {
  try {
    const { teamId } = req.params;
    const { type, message } = req.body;
    
    const { team, event } = await verifyTeamChatAccess(req.user._id, teamId);

    if (!['TEXT', 'IMAGE', 'VIDEO'].includes(type)) {
      return jsonError(res, 'Invalid message type', 400);
    }

    let fileData = null;
    if (['IMAGE', 'VIDEO'].includes(type)) {
      if (!req.file) {
        return jsonError(res, 'File is required for IMAGE or VIDEO messages', 400);
      }
      
      const messageId = new mongoose.Types.ObjectId();
      fileData = await saveUploadedFile(req.file, { 
        eventId: team.eventId, 
        teamId: team._id, 
        messageId, 
        type: 'chat' 
      });

      const savedMsg = await saveMessage({
        _id: messageId,
        eventId: team.eventId,
        teamId: team._id,
        senderId: req.user._id,
        type,
        message: message || '',
        file: fileData
      });
      
      const io = req.app.get('io');
      if (io) {
        io.to(`event_${team.eventId}_team_${team._id}`).emit('new_message', savedMsg);
      }
      
      return jsonSuccess(res, savedMsg, 201);
    } else {
      if (!message || message.trim() === '') {
        return jsonError(res, 'Message text is required', 400);
      }
      const savedMsg = await saveMessage({
        eventId: team.eventId,
        teamId: team._id,
        senderId: req.user._id,
        type,
        message
      });
      
      const io = req.app.get('io');
      if (io) {
        io.to(`event_${team.eventId}_team_${team._id}`).emit('new_message', savedMsg);
      }
      
      return jsonSuccess(res, savedMsg, 201);
    }
  } catch (error) {
    const status = error.message.includes('Forbidden') ? 403 : 400;
    return jsonError(res, error.message, status);
  }
}

export async function getMedia(req, res) {
  try {
    const { messageId } = req.params;
    
    const chatMsg = await ChatMessage.findById(messageId).lean();
    if (!chatMsg) {
      return jsonError(res, 'Message not found', 404);
    }

    if (!chatMsg.file || !chatMsg.file.path) {
      return jsonError(res, 'Message does not contain media', 404);
    }

    if (req.user.role !== 'ADMIN') {
      await verifyTeamChatAccess(req.user._id, chatMsg.teamId);
    }

    // Path traversal is protected by saveUploadedFile generating safe paths, but check if file exists
    const data = await fs.readFile(chatMsg.file.path);
    res.setHeader('Content-Type', chatMsg.file.mimeType || 'application/octet-stream');
    return res.send(data);
  } catch (error) {
    const status = error.message.includes('Forbidden') ? 403 : 404;
    return jsonError(res, error.message || 'Media not found', status);
  }
}
