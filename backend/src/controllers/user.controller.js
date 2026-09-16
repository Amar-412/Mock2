import userModel from '../models/user.model.js';
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

export default { searchStudents };
