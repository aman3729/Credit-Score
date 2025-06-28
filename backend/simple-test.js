import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://aman:vpd6dbDAq3EigvwQ@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-db?retryWrites=true&w=majority&appName=credit-score-dashboard';

console.log('Connecting to MongoDB...');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('MongoDB connected successfully');
  console.log('Connection state:', mongoose.connection.readyState);
  process.exit(0);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
