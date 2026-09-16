import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  path: { type: String, required: true },
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  type: { 
    type: String, 
    enum: ['TEXT', 'IMAGE', 'VIDEO'], 
    required: true 
  },
  message: { 
    type: String, 
    required: function() { return this.type === 'TEXT'; },
    maxlength: 2000
  },
  file: {
    type: fileSchema,
    required: function() { return ['IMAGE', 'VIDEO'].includes(this.type); }
  }
}, {
  timestamps: true
});

chatMessageSchema.index({ eventId: 1, teamId: 1, createdAt: 1 });
chatMessageSchema.index({ teamId: 1, createdAt: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;
