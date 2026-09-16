import mongoose from 'mongoose';

/**
 * Session schema directly adapted from template sessionModel.
 * Tracks active refresh token sessions for multi-device login, rotation, and logout.
 */
const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'User is required'],
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: [true, 'Refresh token hash is required'],
      index: true,
    },
    ip: {
      type: String,
      default: 'unknown',
    },
    userAgent: {
      type: String,
      default: 'unknown',
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

const sessionModel = mongoose.model('sessions', sessionSchema);
export default sessionModel;
