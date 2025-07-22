// Script to patch admin user with a valid bankId
// Usage: node backend/scripts/fix-admin-bankid.js

import mongoose from 'mongoose';
import UserImport from '../models/User.js';

const User = UserImport.default || UserImport;

const ADMIN_EMAIL = 'admin@creditdashboard.com';
const BANK_ID = 'CBE'; // Set to any valid bankId

async function patchAdminBankId() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE || process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const admin = await User.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
      console.error('Admin user not found');
      process.exit(1);
    }
    admin.bankId = BANK_ID;
    await admin.save();
    console.log(`✅ Patched admin user (${ADMIN_EMAIL}) with bankId: ${BANK_ID}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error patching admin user:', error.message);
    process.exit(1);
  }
}

patchAdminBankId(); 