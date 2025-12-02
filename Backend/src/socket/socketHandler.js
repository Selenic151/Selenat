// src/socket/socketHandler.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');

// Store online users
const onlineUsers = new Map();

const socketHandler = (io) => {
  // Middleware xác thực socket
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

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    // Thêm user vào map online users
    onlineUsers.set(socket.user._id.toString(), socket.id);

    // Update user status
    await User.findByIdAndUpdate(socket.user._id, {
      isOnline: true,
      lastSeen: new Date()
    });

    // Emit user online status
    io.emit('user:online', {
      userId: socket.user._id,
      username: socket.user.username
    });

    // Join rooms
    socket.on('room:join', async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        
        if (room && room.members.includes(socket.user._id)) {
          socket.join(roomId);
          console.log(`${socket.user.username} joined room: ${roomId}`);
          
          // Notify others in room
          socket.to(roomId).emit('user:joined', {
            userId: socket.user._id,
            username: socket.user.username,
            roomId
          });
        }
      } catch (error) {
        console.error('Error joining room:', error);
      }
    });

    // Leave room
    socket.on('room:leave', (roomId) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user:left', {
        userId: socket.user._id,
        username: socket.user.username,
        roomId
      });
    });

    // Send message
    socket.on('message:send', async (data) => {
      try {
        const { roomId, content, type } = data;

        // Kiểm tra room và member
        const room = await Room.findById(roomId);
        
        if (!room || !room.members.includes(socket.user._id)) {
          return socket.emit('error', { message: 'Invalid room or not a member' });
        }

        // Tạo message
        const message = await Message.create({
          room: roomId,
          sender: socket.user._id,
          content,
          type: type || 'text'
        });

        await message.populate('sender', '-password');

        // Update room
        room.updatedAt = new Date();
        await room.save();

        // Emit to room
        io.to(roomId).emit('message:new', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Typing indicator
    socket.on('typing:start', (data) => {
      socket.to(data.roomId).emit('user:typing', {
        userId: socket.user._id,
        username: socket.user.username,
        roomId: data.roomId
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(data.roomId).emit('user:stop-typing', {
        userId: socket.user._id,
        roomId: data.roomId
      });
    });

    // Mark message as read
    socket.on('message:read', async (data) => {
      try {
        const { messageId, roomId } = data;
        
        const message = await Message.findById(messageId);
        
        if (message) {
          const alreadyRead = message.readBy.some(
            read => read.user.toString() === socket.user._id.toString()
          );

          if (!alreadyRead) {
            message.readBy.push({ user: socket.user._id });
            await message.save();

            // Emit to room
            io.to(roomId).emit('message:read', {
              messageId,
              userId: socket.user._id
            });
          }
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      
      // Remove from online users
      onlineUsers.delete(socket.user._id.toString());

      // Update user status
      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date()
      });

      // Emit user offline status
      io.emit('user:offline', {
        userId: socket.user._id,
        username: socket.user.username
      });
    });
  });
};

module.exports = socketHandler;