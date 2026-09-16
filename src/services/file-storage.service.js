import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from '../config/config.js';

const safeFileName = (originalName = 'file') => {
  const base = path.basename(originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!base || base === '.' || base === '..') {
    return `file-${crypto.randomBytes(6).toString('hex')}`;
  }
  return base;
};

export async function ensureStorageDirectories() {
  await fs.mkdir(config.STORAGE_ROOT, { recursive: true });
  await fs.mkdir(config.SUBMISSIONS_STORAGE, { recursive: true });
  await fs.mkdir(config.EVENT_DOCUMENT_STORAGE, { recursive: true });
  await fs.mkdir(config.CHAT_STORAGE, { recursive: true });
}

export function getSubmissionStorageDir(eventId, teamId, taskId, submissionId) {
  return path.join(config.SUBMISSIONS_STORAGE, String(eventId), String(teamId), String(taskId), String(submissionId));
}

export function getEventDocumentStorageDir(eventId) {
  return path.join(config.EVENT_DOCUMENT_STORAGE, String(eventId));
}

export function getChatStorageDir(eventId, teamId, messageId) {
  return path.join(config.CHAT_STORAGE, String(eventId), String(teamId), String(messageId));
}

export async function createSubmissionStorageDirectory(eventId, teamId, taskId, submissionId) {
  const directory = getSubmissionStorageDir(eventId, teamId, taskId, submissionId);
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

export async function createEventDocumentDirectory(eventId) {
  const directory = getEventDocumentStorageDir(eventId);
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

export async function createChatStorageDirectory(eventId, teamId, messageId) {
  const directory = getChatStorageDir(eventId, teamId, messageId);
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

export async function saveUploadedFile(file, { eventId, teamId, taskId, submissionId, type = 'submission' }) {
  if (!file || !file.originalname) {
    throw new Error('No file provided');
  }

  const safeName = safeFileName(file.originalname);

  if (type === 'event-document') {
    const directory = await createEventDocumentDirectory(eventId);
    const filePath = path.join(directory, safeName);
    await fs.writeFile(filePath, file.buffer || '');
    return {
      path: filePath,
      filename: safeName,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size || 0,
    };
  }

  if (type === 'chat') {
    // messageId is required for chat
    const { messageId } = arguments[1];
    const directory = await createChatStorageDirectory(eventId, teamId, messageId);
    const filePath = path.join(directory, safeName);
    await fs.writeFile(filePath, file.buffer || '');
    return {
      path: filePath,
      filename: safeName,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size || 0,
    };
  }

  const directory = await createSubmissionStorageDirectory(eventId, teamId, taskId, submissionId);
  const filePath = path.join(directory, safeName);
  await fs.writeFile(filePath, file.buffer || '');
  return {
    path: filePath,
    filename: safeName,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.size || 0,
  };
}

export async function deleteFileIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function removeEmptyDirectoryIfExists(directory) {
  try {
    const entries = await fs.readdir(directory);
    if (entries.length === 0) {
      await fs.rmdir(directory);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function deleteSubmissionDirectory(eventId, teamId, taskId, submissionId) {
  const directory = getSubmissionStorageDir(eventId, teamId, taskId, submissionId);
  try {
    await fs.rm(directory, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

export function isAllowedMimeType(mimeType) {
  return ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'].includes(mimeType);
}

export function isFilePathSafe(filePath) {
  return !String(filePath).includes('..');
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveAuthorizedFilePath(submission, fileName) {
  if (!submission || !Array.isArray(submission.evidence)) {
    return null;
  }

  const matching = submission.evidence.find((item) => item.filename === fileName || item.path.endsWith(fileName));
  if (!matching) {
    return null;
  }

  if (!isFilePathSafe(matching.path)) {
    return null;
  }

  return matching.path;
}
