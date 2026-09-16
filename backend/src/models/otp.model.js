import mongoose from 'mongoose';

/**
 * OTP schema directly adapted from template otpModel.
 * Added TTL index for automatic expiration after 10 minutes.
 */
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'User is required'],
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
    },
  },
  { timestamps: true }
);

// Auto-expire documents after 10 minutes (600 seconds)
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

const otpModel = mongoose.model('otps', otpSchema);
export default otpModel;
