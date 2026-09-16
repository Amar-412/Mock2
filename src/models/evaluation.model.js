import mongoose from 'mongoose';

const criterionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true, min: 0 },
  maxScore: { type: Number, required: true, min: 0 },
  comment: { type: String, default: '' },
}, { _id: false });

const evaluationSchema = new mongoose.Schema({
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  evaluatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  criteria: [criterionSchema],
  totalScore: { type: Number, default: 0 },
  feedback: { type: String, default: '' },
  status: {
    type: String,
    enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'ASSIGNED',
  },
  assignedAt: { type: Date, default: Date.now },
  evaluatedAt: { type: Date },
}, {
  timestamps: true,
});

evaluationSchema.index({ evaluatorId: 1, status: 1 });
evaluationSchema.index({ eventId: 1, evaluatorId: 1 });
evaluationSchema.index({ submissionId: 1 });

const Evaluation = mongoose.model('Evaluation', evaluationSchema);

export default Evaluation;
