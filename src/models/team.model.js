import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', default: null },
  captainId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  status: {
    type: String,
    enum: ['RECRUITING', 'ELIGIBLE', 'REGISTERED', 'ACTIVE', 'COMPLETED'],
    default: 'RECRUITING',
  },
  registeredAt: { type: Date },
}, {
  timestamps: true,
});

teamSchema.index({ eventId: 1, collegeId: 1 });

const Team = mongoose.model('Team', teamSchema);

export default Team;
