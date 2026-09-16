import userModel from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * GET /api/users/search?query=
 * Search registered students suitable for team invitation.
 * Exposes only safe public fields: userId, name, username, college, avatarUrl.
 * Never exposes email, password, session tokens, or other private data.
 */
export const searchStudents = asyncHandler(async (req, res) => {
  const query = (req.query.query || '').trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {
    isActive: true,
    role: 'STUDENT',
    _id: { $ne: req.user._id }, // Exclude current user from search
  };

  if (query) {
    // Search by name or username with case-insensitive regex
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escapedQuery, $options: 'i' } },
      { username: { $regex: escapedQuery, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    userModel
      .find(filter)
      .select('_id name username college avatar')
      .skip(skip)
      .limit(limit)
      .lean(),
    userModel.countDocuments(filter),
  ]);

  // Format public-safe DTO
  const sanitized = users.map((u) => ({
    userId: u._id,
    name: u.name,
    username: u.username || null,
    college: u.college || null,
    avatarUrl: u.avatar || null,
  }));

  return sendSuccess(res, {
    message: 'Students retrieved successfully',
    data: {
      students: sanitized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * GET /api/users/me
 * Retrieve the current authenticated student's full profile.
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await userModel
    .findById(req.user._id)
    .populate('college', 'name code city state')
    .select('-password -__v');

  if (!user) {
    throw new AppError('User profile not found', 404);
  }

  return sendSuccess(res, {
    message: 'Profile retrieved successfully',
    data: { user },
  });
});

/**
 * PATCH /api/users/me
 * Update the current authenticated student's profile.
 * Strictly prevents modifying password, role, verified, or isActive.
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const {
    name,
    username,
    phone,
    college,
    avatar,
    bio,
    department,
    yearOfStudy,
    skills,
    socialLinks,
  } = req.body;

  const user = await userModel.findById(req.user._id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Username validation if changing
  if (username !== undefined) {
    const cleanUsername = username ? username.trim() : null;
    if (cleanUsername && cleanUsername !== user.username) {
      const existingUser = await userModel.findOne({
        username: cleanUsername,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        throw new AppError(`Username '${cleanUsername}' is already taken`, 409);
      }
      user.username = cleanUsername;
    }
  }

  if (name !== undefined) user.name = name ? name.trim() : user.name;
  if (phone !== undefined) user.phone = phone ? phone.trim() : user.phone;
  if (college !== undefined) user.college = college || null;
  if (avatar !== undefined) user.avatar = avatar;
  if (bio !== undefined) user.bio = bio ? bio.trim() : '';
  if (department !== undefined) user.department = department ? department.trim() : '';
  if (yearOfStudy !== undefined) user.yearOfStudy = yearOfStudy;
  if (skills !== undefined && Array.isArray(skills)) user.skills = skills;
  if (socialLinks !== undefined && typeof socialLinks === 'object' && socialLinks !== null) {
    user.socialLinks = {
      linkedin: socialLinks.linkedin !== undefined ? socialLinks.linkedin : user.socialLinks?.linkedin || '',
      github: socialLinks.github !== undefined ? socialLinks.github : user.socialLinks?.github || '',
      instagram: socialLinks.instagram !== undefined ? socialLinks.instagram : user.socialLinks?.instagram || '',
    };
  }

  await user.save();

  const updatedUser = await userModel
    .findById(user._id)
    .populate('college', 'name code city state')
    .select('-password -__v');

  return sendSuccess(res, {
    message: 'Profile updated successfully',
    data: { user: updatedUser },
  });
});

export default {
  searchStudents,
  getProfile,
  updateProfile,
};
