import mongoose from 'mongoose';

const teamMembershipSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  role: { type: String, enum: ['CAPTAIN', 'MEMBER'], required: true },
  joinedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

teamMembershipSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const TeamMembership = mongoose.model('TeamMembership', teamMembershipSchema);

export default TeamMembership;
