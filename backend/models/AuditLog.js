import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  by: { type: String, ref: 'User', required: true },
  userId: { type: String, ref: 'User', required: true },
  before: { type: Object },
  after: { type: Object },
  timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog; 