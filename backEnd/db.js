/* db.js */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/petClinic';

mongoose.set('strictQuery', true);

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected:', MONGO_URI))
  .catch(err => console.error('❌ MongoDB Error:', err));

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🧹 MongoDB connection closed on app termination');
  process.exit(0);
});

module.exports = mongoose;
