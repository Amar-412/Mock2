import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User schema adapted from template userModel.
 * Extended with student domain fields: name, phone, college ref, role, and bcrypt hashing.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
    },
    // Platform-level role (team roles LEAD/MEMBER are scoped to teams)
    role: {
      type: String,
      enum: ['STUDENT', 'ADMIN'],
      default: 'STUDENT',
    },
    verified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    yearOfStudy: {
      type: Number,
      min: 1,
      max: 6,
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    socialLinks: {
      linkedin: { type: String, trim: true, default: '' },
      github: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' },
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-save hook: Hash password with bcryptjs if modified
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare plain password against stored bcrypt hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON representation omitting sensitive credentials
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const userModel = mongoose.model('users', userSchema);
export default userModel;
