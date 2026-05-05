const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI is not defined in .env');
    }

    await mongoose.connect(uri, { dbName: 'Reddit_Clone_Database' });
    console.log('MongoDB connected');

    // Drop the old broken unique index on participants (it blocks users from having
    // more than one conversation). The new pairKey index handles uniqueness correctly.
    try {
      const Conversation = mongoose.model('Conversation');
      await Conversation.collection.dropIndex('participants_1');
      console.log('Dropped legacy participants_1 index');
    } catch {
      // Index doesn't exist — nothing to do.
    }

    // Sync schema indexes: creates any missing indexes, drops none that aren't
    // already removed above.
    const Conversation = mongoose.model('Conversation');
    await Conversation.syncIndexes();
  } catch (error) {
    console.error('Reddit_Clone_Database connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;