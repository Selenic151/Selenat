const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    console.log('Đang kết nối đến MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/selenat';
    console.log('MongoDB URI:', mongoUri);
    
    await mongoose.connect(mongoUri);
    
    console.log('✅ Kết nối MongoDB thành công!');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
    console.log('Port:', mongoose.connection.port);
    
    // Đóng kết nối
    await mongoose.connection.close();
    console.log('Đã đóng kết nối');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:');
    console.error('Message:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

testConnection();
