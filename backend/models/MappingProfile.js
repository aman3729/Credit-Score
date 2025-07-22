import mongoose from 'mongoose';

const MappingProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  partnerId: { type: String, required: true },
  fieldsMapping: { type: Object, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
}, {
  timestamps: true
});

const MappingProfile = mongoose.model('MappingProfile', MappingProfileSchema);
export default MappingProfile; 