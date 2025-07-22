// Notify users whose consent is about to expire
import mongoose from 'mongoose';
import User from '../models/User.js';
import { sendEmail } from '../utils/email.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

const NOTIFY_WINDOWS = [30, 7, 1]; // days before expiry

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const now = new Date();
  for (const days of NOTIFY_WINDOWS) {
    const windowStart = new Date(now);
    windowStart.setDate(now.getDate() + days);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(windowStart);
    windowEnd.setHours(23, 59, 59, 999);

    // Find users whose consent expires in this window
    const users = await User.find({
      'legalConsent.consentExpiresAt': { $gte: windowStart, $lte: windowEnd },
      'legalConsent.creditChecksAuthorized': true
    });
    for (const user of users) {
      // (Optional) Check if already notified for this window
      // For now, always send
      try {
        await sendEmail({
          to: user.email,
          subject: 'Your consent is about to expire',
          html: `<p>Dear ${user.name || user.email},</p>
<p>Your legal consent for credit score services will expire in ${days} day(s), on <b>${user.legalConsent.consentExpiresAt.toDateString()}</b>.<br>
Please log in and renew your consent to avoid service interruption.</p>
<p>Thank you,<br>The Credit Score Team</p>`
        });
        console.log(`Sent consent expiry notification to ${user.email} (${days} days left)`);
      } catch (err) {
        console.error(`Failed to send consent expiry email to ${user.email}:`, err.message);
      }
    }
  }
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Consent expiry notification script failed:', err);
  process.exit(1);
}); 