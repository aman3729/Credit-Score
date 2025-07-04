// List the last 10 UploadHistory documents
import mongoose from 'mongoose';
import UploadHistory from '../models/UploadHistory.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
    const histories = await UploadHistory.find()
      .sort({ uploadedAt: -1 })
      .limit(10)
      .populate('uploadedBy', 'name email phoneNumber')
      .lean();
    if (!histories.length) {
      console.log('No upload histories found.');
    } else {
      histories.forEach((h, i) => {
        console.log(`\n--- Upload #${i + 1} ---`);
        console.log('ID:', h._id);
        console.log('Filename:', h.filename);
        console.log('Uploaded By:', h.uploadedBy?.name || h.uploadedBy?.email || h.uploadedBy || 'System');
        console.log('Record Count:', h.recordCount);
        console.log('Success Count:', h.successCount);
        console.log('Error Count:', h.errorCount);
        console.log('Status:', h.status);
        console.log('Uploaded At:', h.uploadedAt);
        console.log('---');
      });
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main(); 