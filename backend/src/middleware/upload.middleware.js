import multer from 'multer';
import AppError from '../utils/AppError.js';
import config from '../config/config.js';

// Allowed MIME types for student submissions
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `File type '${file.mimetype}' is not supported. Allowed types: Images, Videos, PDF, Word documents.`,
        400
      ),
      false
    );
  }
};

/**
 * Maps a MIME type to the Evidence model's enum ('IMAGE' | 'VIDEO' | 'PDF' | 'DOCUMENT' | 'TEXT').
 */
export const resolveEvidenceType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'text/plain') return 'TEXT';
  return 'DOCUMENT';
};

/**
 * Sanitizes original filenames by stripping dangerous path characters.
 */
export const sanitizeFilename = (filename) => {
  return (filename || 'untitled').replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
}).single('file');

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 10,
  },
}).array('files', 10);

export default {
  uploadSingle,
  uploadMultiple,
  resolveEvidenceType,
  sanitizeFilename,
};
