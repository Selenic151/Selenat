// Script để xóa duplicate direct rooms
// Chạy file này 1 lần để cleanup database

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Room = require('./src/models/Room');
const User = require('./src/models/User'); // Cần import để populate works

const cleanupDuplicateDirectRooms = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/selenat';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Tìm tất cả direct rooms
    const directRooms = await Room.find({ type: 'direct' })
      .populate('members', 'username')
      .sort({ createdAt: 1 }); // Older first

    console.log(`Found ${directRooms.length} direct rooms`);

    const seen = new Map(); // Map<userPairKey, roomId>
    const toDelete = [];

    for (const room of directRooms) {
      if (room.members.length !== 2) {
        console.warn(`Room ${room._id} has ${room.members.length} members, skipping`);
        continue;
      }

      // Tạo key từ 2 user IDs (sorted để consistent)
      const [user1, user2] = room.members.map(m => m._id.toString()).sort();
      const key = `${user1}-${user2}`;

      if (seen.has(key)) {
        // Duplicate found
        const originalRoomId = seen.get(key);
        console.log(`Duplicate found: Room ${room._id} duplicates ${originalRoomId}`);
        console.log(`  Users: ${room.members.map(m => m.username).join(', ')}`);
        toDelete.push(room._id);
      } else {
        // First occurrence, keep it
        seen.set(key, room._id);
      }
    }

    if (toDelete.length === 0) {
      console.log('✅ No duplicates found!');
    } else {
      console.log(`\n🗑️  Found ${toDelete.length} duplicate rooms to delete`);
      
      // Uncomment dòng dưới để thực sự xóa
      // const result = await Room.deleteMany({ _id: { $in: toDelete } });
      // console.log(`✅ Deleted ${result.deletedCount} rooms`);
      
      console.log('\n⚠️  Để xóa, uncomment dòng deleteMany trong script');
      console.log('IDs to delete:', toDelete);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

cleanupDuplicateDirectRooms();
