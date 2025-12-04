require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const cacheService = require('./services/cacheService');
const socketHandler = require('./socket/socketHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const messageRoutes = require('./routes/message');
const userRoutes = require('./routes/user');
const notificationRoutes = require('./routes/notification');
const friendRoutes = require('./routes/friend');

const app = express();
const httpServer = createServer(app);

const path = require('path');
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect Database
connectDB();

// Connect Redis (optional - will fallback gracefully if not available)
connectRedis().then(() => {
  cacheService.init();
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Chat API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/friends', friendRoutes);

// Socket.io handler
socketHandler(io, app);

// Error handling middleware
app.use((err, req, res, next) => {
  try {
    console.error('Unhandled error on request', {
      method: req.method,
      path: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      errorName: err && err.name,
      errorMessage: err && err.message,
      stack: err && err.stack
    });
  } catch (logErr) {
    console.error('Error while logging original error:', logErr);
  }
  res.status(500).json({ 
    message: err && err.message ? err.message : 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Make io accessible from controllers via req.app.get('io')
app.set('io', io);

module.exports = app; // Export app for testing