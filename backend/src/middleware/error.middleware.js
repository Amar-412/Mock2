import config from '../config/config.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Centralized Express Error Handler.
 * Converts Mongoose validation, duplicate key errors, and AppError instances into clean JSON.
 */
const errorMiddleware = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    error.message = `An account or record with this ${field} (${val}) already exists.`;
    error.statusCode = 409;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    error.message = `Validation failed: ${messages.join(', ')}`;
    error.statusCode = 400;
    error.errors = messages;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error.message = `Invalid format for field '${err.path}': ${err.value}`;
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token. Please authenticate again.';
    error.statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    error.message = 'Token has expired. Please refresh your session.';
    error.statusCode = 401;
  }

  // Operational vs. programming error handling
  if (err.isOperational || error.statusCode < 500) {
    return sendError(res, {
      message: error.message,
      statusCode: error.statusCode,
      errors: error.errors || null,
    });
  }

  // Unhandled / server errors
  if (config.NODE_ENV !== 'test') {
    console.error('💥 UNHANDLED SERVER ERROR:', err);
  }

  return sendError(res, {
    message: config.NODE_ENV === 'development' ? err.message : 'Something went wrong. Please try again.',
    statusCode: 500,
  });
};

export default errorMiddleware;
