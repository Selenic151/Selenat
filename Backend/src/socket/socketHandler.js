const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

// Track online users: Map<userId, socketId>
const onlineUsers = new Map();

module.exports = (io, app) => {
  // Make onlineUsers accessible to other parts of the app
  app.set('onlineUsers', onlineUsers);

  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Track online user
    onlineUsers.set(socket.userId, socket.id);
    
    // Update user online status
    User.findByIdAndUpdate(socket.userId, { isOnline: true }).catch(err => 
      console.error('Error updating online status:', err)
    );

    // Broadcast online status
    io.emit('user:online', { userId: socket.userId });

    // Join user's rooms
    socket.on('room:join', async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        
        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }

        // Check if user is a member
        const isMember = room.members.some(
          memberId => memberId.toString() === socket.userId
        );

        if (!isMember) {
          return socket.emit('error', { message: 'Not a member of this room' });
        }

        socket.join(roomId);
        socket.emit('room:joined', { roomId });
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('room:leave', (roomId) => {
      socket.leave(roomId);
      socket.emit('room:left', { roomId });
    });

    // Send message (supports ACK callback)
    socket.on('message:send', async (data, callback) => {
      try {
        const { roomId, content, type = 'text' } = data;

        const room = await Room.findById(roomId);
        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }

        // Check if user is a member
        const isMember = room.members.some(
          memberId => memberId.toString() === socket.userId
        );

        if (!isMember) {
          return socket.emit('error', { message: 'Not a member of this room' });
        }

        // Create message
        const message = await Message.create({
          room: roomId,
          sender: socket.userId,
          content,
          type
        });

        // Populate sender info
        await message.populate('sender', 'username avatar');

        // Broadcast to room
        io.to(roomId).emit('message:received', message);
        // Acknowledge to sender with saved message
        if (typeof callback === 'function') {
          try { callback({ success: true, message }); } catch(e) { /* ignore */ }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
        if (typeof callback === 'function') {
          try { callback({ success: false, error: error.message }); } catch(e) {}
        }
      }
    });

    // Allow clients to notify server of a deleted room (broadcast to others)
    socket.on('room:deleted', ({ roomId }) => {
      try {
        io.emit('room:deleted', { roomId });
      } catch (err) {
        console.error('Error broadcasting room:deleted', err);
      }
    });

    // Typing indicator
    socket.on('typing:start', ({ roomId }) => {
      console.log(`User ${socket.userId} typing in room ${roomId}`);
      socket.to(roomId).emit('user:typing', {
        roomId: roomId,
        userId: socket.userId,
        username: socket.user.username
      });
    });

    socket.on('typing:stop', ({ roomId }) => {
      console.log(`User ${socket.userId} stopped typing in room ${roomId}`);
      socket.to(roomId).emit('user:stopped_typing', {
        roomId: roomId,
        userId: socket.userId
      });
    });

    // Mark message as read
    socket.on('message:read', async ({ messageId, roomId }) => {
      try {
        const message = await Message.findById(messageId);
        
        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        // Add user to readBy if not already there
        const alreadyRead = message.readBy.some(
          r => r.user.toString() === socket.userId
        );

        if (!alreadyRead) {
          message.readBy.push({
            user: socket.userId,
            timestamp: new Date()
          });
          await message.save();
        }

        // Notify room
        io.to(roomId).emit('message:read_update', {
          messageId,
          userId: socket.userId
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Remove from online users
      onlineUsers.delete(socket.userId);

      // Update user status
      try {
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date()
        });

        // Broadcast offline status
        io.emit('user:offline', {
          userId: socket.userId,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error('Error updating offline status:', error);
      }
    });
  });

  return io;
};
