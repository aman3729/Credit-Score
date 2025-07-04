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
    console.log('🔍 Fetching all credit reports with lending decisions...\n');
    
    // Find all credit reports that have lending decisions
    const creditReports = await CreditReport.find({
      'lendingDecision.decision': { $exists: true, $ne: null }
    }).populate('userId', 'email firstName lastName role');
    
    console.log(`📊 Found ${creditReports.length} credit reports with lending decisions:\n`);
    
    if (creditReports.length === 0) {
      console.log('❌ No saved lending decisions found in the database.');
      console.log('💡 Try making a manual decision in the Lender Dashboard first.');
      return;
    }
    
    creditReports.forEach((report, index) => {
      const user = report.userId;
      const decision = report.lendingDecision;
      
      console.log(`📋 Decision #${index + 1}:`);
      console.log(`   👤 User: ${user?.email || 'Unknown'} (${user?.firstName || ''} ${user?.lastName || ''})`);
      console.log(`   🏷️  Role: ${user?.role || 'Unknown'}`);
      console.log(`   📈 Credit Score: ${report.creditScore?.fico?.score || 'N/A'}`);
      console.log(`   ✅ Decision: ${decision.decision}`);
      console.log(`   📝 Manual: ${decision.isManual ? 'Yes' : 'No'}`);
      console.log(`   📅 Evaluated: ${decision.evaluatedAt ? new Date(decision.evaluatedAt).toLocaleString() : 'N/A'}`);
      console.log(`   👨‍💼 Evaluated By: ${decision.evaluatedBy || 'System'}`);
      
      if (decision.manualNotes) {
        console.log(`   📝 Notes: ${decision.manualNotes}`);
      }
      
      if (decision.loanDetails && Object.keys(decision.loanDetails).length > 0) {
        console.log(`   💰 Loan Details:`);
        console.log(`      Amount: $${decision.loanDetails.amount || 'N/A'}`);
        console.log(`      Term: ${decision.loanDetails.term || 'N/A'} months`);
        console.log(`      Interest Rate: ${decision.loanDetails.interestRate || 'N/A'}%`);
      }
      
      if (decision.reasons && decision.reasons.length > 0) {
        console.log(`   🎯 Reasons: ${decision.reasons.join(', ')}`);
      }
      
      if (decision.recommendations && decision.recommendations.length > 0) {
        console.log(`   💡 Recommendations: ${decision.recommendations.join(', ')}`);
      }
      
      console.log(''); // Empty line for readability
    });
    
    // Summary statistics
    const decisions = creditReports.map(r => r.lendingDecision);
    const approved = decisions.filter(d => d.decision === 'Approve').length;
    const rejected = decisions.filter(d => d.decision === 'Reject').length;
    const review = decisions.filter(d => d.decision === 'Review').length;
    const manual = decisions.filter(d => d.isManual).length;
    
    console.log('📊 Summary Statistics:');
    console.log(`   ✅ Approved: ${approved}`);
    console.log(`   ❌ Rejected: ${rejected}`);
    console.log(`   ⏳ Review: ${review}`);
    console.log(`   ✏️  Manual Decisions: ${manual}`);
    console.log(`   🤖 Auto Decisions: ${decisions.length - manual}`);
    
  } catch (error) {
    console.error('❌ Error listing saved decisions:', error);
  }
};

// Run the script
const runScript = async () => {
  await connectDB();
  await listSavedDecisions();
  process.exit(0);
};

runScript(); 