import User from '../models/User.js';
import nodemailer from 'nodemailer';

async function sendAdminAlert(subject, message) {
  // Configure your email/Slack/Telegram here
  const transporter = nodemailer.createTransport({ /* SMTP config */ });
  await transporter.sendMail({
    from: 'alerts@yourdomain.com',
    to: 'admin@yourdomain.com',
    subject,
    text: message
  });
}

export async function checkForOutliers() {
  // Example: Score drops >50
  const users = await User.find({});
  for (const user of users) {
    if (user.scoreHistory && user.scoreHistory.length > 1) {
      const prev = user.scoreHistory[user.scoreHistory.length - 2].score;
      const curr = user.scoreHistory[user.scoreHistory.length - 1].score;
      if (prev - curr > 50) {
        await sendAdminAlert('Credit Score Drop Alert', `User ${user._id} score dropped from ${prev} to ${curr}`);
      }
    }
    // Example: 10+ rejections
    const rejections = user.scoreHistory?.filter(h => h.decision === 'Reject').length || 0;
    if (rejections >= 10) {
      await sendAdminAlert('High Rejection Alert', `User ${user._id} has ${rejections} rejections.`);
    }
  }
  // Add logic for suspicious bulk uploads as needed
}

// To run: node admin-alerts.js
checkForOutliers(); 