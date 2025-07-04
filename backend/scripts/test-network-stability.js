import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

const logMongoUri = MONGODB_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):[^@]+@/, 'mongodb$1://$2:*****@');

const connectionOptions = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  retryWrites: true,
  retryReads: true,
  maxPoolSize: 10,
  minPoolSize: 1,
  heartbeatFrequencyMS: 10000,
};

async function testConnection() {
  const client = new MongoClient(MONGODB_URI, connectionOptions);
  
  try {
    console.log('🔍 Testing network stability...');
    console.log(`URI: ${logMongoUri}`);
    
    const startTime = Date.now();
    await client.connect();
    const connectTime = Date.now() - startTime;
    
    console.log(`✅ Connected in ${connectTime}ms`);
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections`);
    
    // Test ping
    const pingResult = await db.admin().ping();
    console.log('🏓 Ping result:', pingResult);
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  } finally {
    await client.close();
  }
}

async function runStabilityTest() {
  console.log('🚀 Starting network stability test...\n');
  
  const tests = 10;
  let successes = 0;
  let failures = 0;
  const results = [];
  
  for (let i = 1; i <= tests; i++) {
    console.log(`\n--- Test ${i}/${tests} ---`);
    const success = await testConnection();
    
    if (success) {
      successes++;
      results.push('✅');
    } else {
      failures++;
      results.push('❌');
    }
    
    // Wait between tests
    if (i < tests) {
      console.log('⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Total tests: ${tests}`);
  console.log(`Successes: ${successes}`);
  console.log(`Failures: ${failures}`);
  console.log(`Success rate: ${((successes / tests) * 100).toFixed(1)}%`);
  console.log('\nDetailed results:');
  console.log(results.join(' '));
  
  if (failures > 0) {
    console.log('\n⚠️  Network instability detected!');
    console.log('💡 Recommendations:');
    console.log('1. Check your internet connection');
    console.log('2. Try using a different network (mobile hotspot)');
    console.log('3. Check if your firewall/antivirus is blocking connections');
    console.log('4. Contact your ISP about network stability');
    console.log('5. Consider using a VPN to route around network issues');
  } else {
    console.log('\n🎉 Network is stable!');
  }
}

runStabilityTest().catch(console.error); 