import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import userModel from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * JWT Authentication Middleware.
 * Extracted and standardized from template auth logic.
 * Validates 'Authorization: Bearer <token>' header and attaches user to req.user.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Please provide a Bearer token.', 401);
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new AppError('Authentication token missing.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Access token expired. Please refresh your session.', 401);
    }
    throw new AppError('Invalid authentication token.', 401);
  }

  const user = await userModel.findById(decoded.id);
  if (!user) {
    throw new AppError('User account no longer exists.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account deactivated. Please contact support.', 403);
  }

  req.user = user;
  req.sessionId = decoded.sessionId || null;
  next();
});

export default authenticate;
