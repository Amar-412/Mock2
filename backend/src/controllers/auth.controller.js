import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import userModel from '../models/user.model.js';
import sessionModel from '../models/session.model.js';
import otpModel from '../models/otp.model.js';
import { sendEmail } from '../services/email.service.js';
import { generateOtp, getOtpHtml } from '../utils/utils.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

/**
 * Hash a refresh token using SHA-256 for secure session indexing in MongoDB.
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Configure standard secure httpOnly cookie for refresh token.
 */
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

/**
 * POST /api/auth/register
 * Register student account, create session & OTP verification.
 */
export const register = asyncHandler(async (req, res) => {
  const { name, username, email, password, phone, college } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long', 400);
  }

  // Check existing username or email
  const existingUser = await userModel.findOne({
    $or: [{ email: email.toLowerCase() }, ...(username ? [{ username }] : [])],
  });

  if (existingUser) {
    throw new AppError('An account with this email or username already exists', 409);
  }

  // User creation (password is hashed automatically by pre-save hook using bcryptjs)
  const user = await userModel.create({
    name: name || username || email.split('@')[0],
    username: username || undefined,
    email: email.toLowerCase(),
    password,
    phone,
    college: college || undefined,
    // In local dev/testing, auto-verify if GOOGLE_USER is unconfigured, otherwise require OTP
    verified: config.NODE_ENV === 'test' || !config.GOOGLE_USER,
  });

  // Generate OTP for email verification
  const otp = generateOtp();
  const html = getOtpHtml(otp);
  const otpHash = hashToken(otp);

  await otpModel.create({
    email: user.email,
    user: user._id,
    otpHash,
  });

  // Send verification email (with console fallback in dev)
  await sendEmail(user.email, 'OTP Verification - YUWA Ecolympics', `Your OTP code is: ${otp}`, html);

  // Generate 7-day refresh token & store session
  const refreshToken = jwt.sign({ id: user._id }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });

  const session = await sessionModel.create({
    user: user._id,
    refreshTokenHash: hashToken(refreshToken),
    ip: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  // Generate 15-minute access token
  const accessToken = jwt.sign(
    { id: user._id, sessionId: session._id, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN }
  );

  setRefreshTokenCookie(res, refreshToken);

  return sendCreated(res, {
    message: 'User registered successfully. Verification email sent.',
    data: {
      accessToken,
      user: user.toPublicJSON(),
    },
  });
});

/**
 * POST /api/auth/login
 * Authenticate credentials, create session, return tokens.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  const user = await userModel.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account has been deactivated. Please contact support.', 403);
  }

  // Generate new refresh token and session
  const refreshToken = jwt.sign({ id: user._id }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });

  const session = await sessionModel.create({
    user: user._id,
    refreshTokenHash: hashToken(refreshToken),
    ip: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  // Generate 15-minute access token
  const accessToken = jwt.sign(
    { id: user._id, sessionId: session._id, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN }
  );

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  setRefreshTokenCookie(res, refreshToken);

  return sendSuccess(res, {
    message: 'Logged in successfully',
    data: {
      accessToken,
      user: user.toPublicJSON(),
    },
  });
});

/**
 * GET /api/auth/me
 * Fetch authenticated user profile.
 */
export const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: 'User profile fetched successfully',
    data: {
      user: req.user.toPublicJSON(),
    },
  });
});

/**
 * POST /api/auth/refresh-token
 * Rotate refresh token and issue new 15-minute access token.
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new AppError('Refresh token not provided in cookies', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
  }

  const tokenHash = hashToken(token);
  const session = await sessionModel.findOne({
    refreshTokenHash: tokenHash,
    revoked: false,
  });

  if (!session) {
    throw new AppError('Session invalidated or expired. Please log in again.', 401);
  }

  // Token rotation: Issue new refresh token and update session hash
  const newRefreshToken = jwt.sign({ id: decoded.id }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });

  session.refreshTokenHash = hashToken(newRefreshToken);
  await session.save();

  // Issue new access token
  const user = await userModel.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError('User not found or deactivated', 401);
  }

  const accessToken = jwt.sign(
    { id: user._id, sessionId: session._id, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN }
  );

  setRefreshTokenCookie(res, newRefreshToken);

  return sendSuccess(res, {
    message: 'Access token refreshed successfully',
    data: {
      accessToken,
    },
  });
});

/**
 * POST /api/auth/logout
 * Revoke active session and clear cookie.
 */
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    const tokenHash = hashToken(token);
    await sessionModel.findOneAndUpdate({ refreshTokenHash: tokenHash }, { revoked: true });
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return sendSuccess(res, {
    message: 'Logged out successfully',
  });
});

/**
 * POST /api/auth/logout-all
 * Invalidate all sessions across devices for the user.
 */
export const logoutAll = asyncHandler(async (req, res) => {
  await sessionModel.updateMany({ user: req.user._id, revoked: false }, { revoked: true });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return sendSuccess(res, {
    message: 'Logged out from all devices successfully',
  });
});

/**
 * POST /api/auth/verify-email
 * Validate OTP code and verify user account.
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new AppError('Email and OTP are required', 400);
  }

  const otpHash = hashToken(otp);
  const otpDoc = await otpModel.findOne({
    email: email.toLowerCase(),
    otpHash,
  });

  if (!otpDoc) {
    throw new AppError('Invalid or expired OTP code', 400);
  }

  const user = await userModel.findByIdAndUpdate(
    otpDoc.user,
    { verified: true },
    { new: true }
  );

  await otpModel.deleteMany({ user: otpDoc.user });

  return sendSuccess(res, {
    message: 'Email verified successfully',
    data: {
      user: user.toPublicJSON(),
    },
  });
});

export default {
  register,
  login,
  getMe,
  refreshToken,
  logout,
  logoutAll,
  verifyEmail,
};
