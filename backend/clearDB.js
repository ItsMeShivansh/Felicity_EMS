/**
 * clearDB.js
 * Wipes all data from the database EXCEPT the admin participant.
 * Run with: node clearDB.js
 */

const mongoose = require('mongoose');
const Participant = require('./models/Participant');
require('dotenv').config();

const ADMIN_EMAIL = 'admin@felicity.iiit.ac.in';

async function clearDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const db = mongoose.connection.db;

    // 1. Wipe collections that have no exceptions
    const collectionsToWipe = ['events', 'registrations', 'teams', 'organizers', 'messages'];
    for (const col of collectionsToWipe) {
      const result = await db.collection(col).deleteMany({});
      console.log(`🗑  ${col}: deleted ${result.deletedCount} documents`);
    }

    // 2. Wipe all participants EXCEPT the admin
    const adminDoc = await Participant.findOne({ email: ADMIN_EMAIL });
    if (!adminDoc) {
      console.warn(`⚠️  Admin user (${ADMIN_EMAIL}) not found — wiping ALL participants.`);
      const result = await db.collection('participants').deleteMany({});
      console.log(`🗑  participants: deleted ${result.deletedCount} documents`);
    } else {
      const result = await db.collection('participants').deleteMany({
        _id: { $ne: adminDoc._id }
      });
      console.log(`🗑  participants: deleted ${result.deletedCount} documents (admin preserved ✅)`);
    }

    console.log('\n✅ Database cleared successfully. Admin credentials are intact.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing database:', err.message);
    process.exit(1);
  }
}

clearDB();
