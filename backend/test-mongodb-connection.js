import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://aman:vpd6dbDAq3EigvwQ@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-db?retryWrites=true&w=majority';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('credit-score-db');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

run().catch(console.dir);
