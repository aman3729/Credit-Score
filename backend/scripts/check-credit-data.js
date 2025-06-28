import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CreditReport from '../models/CreditReport.js';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// Enable debug logging for Mongoose
mongoose.set('debug', true);

// Create a logger
const logger = {
  info: (message, data) => console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : ''),
  error: (message, error) => console.error(`[ERROR] ${message}`, error ? error.message : ''),
  debug: (message, data) => console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '')
};

async function connectToDatabase() {
  try {
    // Connect to MongoDB using the same connection string as the app
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aman:49b1HtpesbsJfZnz@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority&appName=credit-score-dashboard';
    
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:*****@') });
    
    const connection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });
    
    logger.info('Successfully connected to MongoDB', { 
      host: connection.connection.host,
      port: connection.connection.port,
      name: connection.connection.name 
    });
    
    return connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    throw error;
  }
}

async function checkUser(email) {
  try {
    logger.info('Checking user in database...', { email });
    const user = await User.findOne({ email }).select('-password').lean();
    
    if (!user) {
      logger.info('User not found in database');
      return null;
    }
    
    logger.info('User found', { userId: user._id, email: user.email, role: user.role });
    return user;
  } catch (error) {
    logger.error('Error checking user', error);
    throw error;
  }
}

async function checkCreditReports(userId) {
  try {
    logger.info('Checking credit reports for user...', { userId });
    
    // Check reports using userId
    const reports = await CreditReport.find({ userId }).lean();
    logger.info(`Found ${reports.length} credit reports for user`, { userId });
    
    // If no reports found, check all reports to see if any exist
    if (reports.length === 0) {
      const totalReports = await CreditReport.countDocuments();
      logger.info('No credit reports found for user. Checking if any reports exist...', { 
        totalReports,
        collectionName: CreditReport.collection.name 
      });
      
      if (totalReports > 0) {
        const sampleReport = await CreditReport.findOne({}).lean();
        logger.info('Sample credit report structure:', sampleReport);
      }
    } else {
      // Log report details
      reports.forEach((report, index) => {
        logger.info(`Report ${index + 1}:`, {
          reportId: report._id,
          creditScore: report.creditScore?.fico?.score || 'N/A',
          paymentHistory: report.paymentHistory || 'N/A',
          creditUtilization: report.creditUtilization || 'N/A',
          creditAgeMonths: report.creditAgeMonths || 'N/A',
          createdAt: report.createdAt
        });
      });
    }
    
    return reports;
  } catch (error) {
    logger.error('Error checking credit reports', error);
    throw error;
  }
}

async function checkDatabaseCollections() {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    logger.info('Available collections:', collections.map(c => c.name));
    return collections;
  } catch (error) {
    logger.error('Error listing collections', error);
    throw error;
  }
}

async function main() {
  let connection;
  
  try {
    // Connect to database
    connection = await connectToDatabase();
    
    // Check available collections
    await checkDatabaseCollections();
    
    // Check user
    const userEmail = 'amanabraham724@gmail.com';
    const user = await checkUser(userEmail);
    
    if (user) {
      // Check credit reports for user
      await checkCreditReports(user._id);
    } else {
      logger.info('No user found with email:', userEmail);
    }
    
    logger.info('Database check completed successfully');
  } catch (error) {
    logger.error('Error in main function', error);
    process.exit(1);
  } finally {
    // Close the connection if it was established
    if (connection) {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      } catch (closeError) {
        logger.error('Error closing MongoDB connection', closeError);
      }
    }
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error in main execution', error);
  process.exit(1);
});
