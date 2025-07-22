import mongoose from 'mongoose';

const ConsentAuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['grant', 'renew', 'revoke', 'override'], required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for system
  performedByRole: { type: String }, // e.g., 'user', 'admin', 'system'
  details: { type: Object },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('ConsentAuditLog', ConsentAuditLogSchema); 