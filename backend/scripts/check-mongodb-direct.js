import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configure dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/../../.env` });

// Connection URI
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

// Create a new MongoClient
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

async function run() {
  try {
    // Connect the client to the server
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully to MongoDB');

    const db = client.db();
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in database:');
    console.table(collections.map(c => ({ name: c.name, type: c.type })));
    
    // Check users collection
    const users = db.collection('users');
    const userCount = await users.countDocuments();
    console.log(`\nFound ${userCount} users in the database`);
    
    // Find specific user
    const user = await users.findOne({ email: 'amanabraham724@gmail.com' });
    
    if (user) {
      console.log('\nFound user:', {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      });
      
      // Check credit reports for this user
      const creditReports = db.collection('creditreports');
      const reports = await creditReports.find({ userId: user._id }).toArray();
      
      console.log(`\nFound ${reports.length} credit reports for this user:`);
      
      if (reports.length > 0) {
        console.log('Sample credit report:', {
          _id: reports[0]._id,
          userId: reports[0].userId,
          creditScore: reports[0].creditScore?.fico?.score || 'N/A',
          paymentHistory: reports[0].paymentHistory || 'N/A',
          creditUtilization: reports[0].creditUtilization || 'N/A',
          creditAgeMonths: reports[0].creditAgeMonths || 'N/A',
          createdAt: reports[0].createdAt,
          updatedAt: reports[0].updatedAt
        });
      } else {
        console.log('No credit reports found for this user');
        
        // Check if any credit reports exist
        const totalReports = await creditReports.countDocuments();
        console.log(`\nTotal credit reports in database: ${totalReports}`);
        
        if (totalReports > 0) {
          const sampleReport = await creditReports.findOne({});
          console.log('Sample credit report structure:', JSON.stringify(sampleReport, null, 2));
        }
      }
    } else {
      console.log('\nUser not found in database');
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close the connection
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the function
run().catch(console.error);
