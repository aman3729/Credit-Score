import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CreditReport from '../models/CreditReport.js';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// List all saved lending decisions
const listSavedDecisions = async () => {
  try {
    console.log('🔍 Fetching all credit reports with lending decisions (including history)...\n');
    
    // Find all credit reports that have lending decisions in history
    const creditReports = await CreditReport.find({
      'lendingDecisionHistory.0': { $exists: true }
    }).populate('userId', 'email firstName lastName role');
    
    console.log(`📊 Found ${creditReports.length} credit reports with lending decision history:\n`);
    
    if (creditReports.length === 0) {
      console.log('❌ No saved lending decisions found in the database.');
      console.log('💡 Try making a manual decision in the Lender Dashboard first.');
      return;
    }
    
    creditReports.forEach((report, index) => {
      const user = report.userId;
      const history = report.lendingDecisionHistory || [];
      console.log(`\n📋 User #${index + 1}: ${user?.email || 'Unknown'} (${user?.firstName || ''} ${user?.lastName || ''})`);
      console.log(`   🏷️  Role: ${user?.role || 'Unknown'}`);
      console.log(`   📈 Credit Score: ${report.creditScore?.fico?.score || 'N/A'}`);
      if (history.length === 0) {
        console.log('   ❌ No lending decision history.');
      } else {
        history.forEach((decision, i) => {
          console.log(`   --- Decision #${i + 1} ---`);
          console.log(`      ✅ Decision: ${decision.decision}`);
          console.log(`      📝 Manual: ${decision.isManual ? 'Yes' : 'No'}`);
          console.log(`      📅 Evaluated: ${decision.evaluatedAt ? new Date(decision.evaluatedAt).toLocaleString() : 'N/A'}`);
          console.log(`      👨‍💼 Evaluated By: ${decision.evaluatedBy || 'System'}`);
          if (decision.manualNotes) {
            console.log(`      📝 Notes: ${decision.manualNotes}`);
          }
        });
      }
    });
  } catch (error) {
    console.error('Error listing saved decisions:', error);
  }
};

// Run the script
const runScript = async () => {
  await connectDB();
  await listSavedDecisions();
  process.exit(0);
};

runScript(); 