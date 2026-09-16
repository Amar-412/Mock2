import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import sessionModel from '../models/session.model.js';
import userModel from '../models/user.model.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing'
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const session = await sessionModel.findOne({
      _id: decoded.sessionId,
      user: decoded.id,
      revoked: false
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session invalid or revoked'
      });
    }

    const user = await userModel.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User is inactive or not found'
      });
    }

    req.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'STUDENT',
      collegeId: user.collegeId || null,
      verified: user.verified
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}
