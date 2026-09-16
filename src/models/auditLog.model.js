import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: Object, default: {} },
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: false,
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
