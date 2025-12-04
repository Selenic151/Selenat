const mongoose = require('mongoose');
const cacheService = require('../services/cacheService');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a room name'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['group', 'private', 'direct'],
    default: 'group'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  avatar: {
    type: String,
    default: ''
  },
  // Metadata cho conversations (Messenger-style)
  lastMessage: {
    content: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: Date
  },
  // Participant settings (per user)
  participantSettings: {
    type: Map,
    of: {
      muted: { type: Boolean, default: false },
      archived: { type: Boolean, default: false },
      pinned: { type: Boolean, default: false },
      lastRead: { type: Date, default: Date.now }
    },
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
roomSchema.index({ members: 1 });
roomSchema.index({ creator: 1 });
// Composite index for direct rooms (critical for finding existing DMs)
roomSchema.index({ type: 1, members: 1 });
// Index for sorting by recent activity
roomSchema.index({ updatedAt: -1 });

// Virtual for unread count (computed per user)
roomSchema.virtual('unreadCount').get(function() {
  return 0; // Will be computed in controller
});

// Static method để tìm direct room (optimized with cache)
roomSchema.statics.findDirectRoom = async function(userId1, userId2) {
  // Sort userIds để query consistent
  const [user1, user2] = [userId1, userId2].sort();
  const cacheKey = `direct:${user1}:${user2}`;
  
  // Try cache first (24 hours TTL)
  return await cacheService.cacheWrapper(
    cacheKey,
    async () => {
      return this.findOne({
        type: 'direct',
        members: { $all: [user1, user2], $size: 2 }
      }).populate('members', 'username email avatar online');
    },
    86400 // 24 hours
  );
};

// Static method để tạo direct room
roomSchema.statics.createDirectRoom = async function(userId1, userId2) {
  const [user1, user2] = [userId1, userId2].sort();
  
  const room = await this.create({
    name: `Direct-${user1}-${user2}`,
    type: 'direct',
    creator: user1,
    members: [user1, user2],
    admins: []
  });
  
  return room.populate('members', 'username email avatar online');
};

// Method để update last message (Messenger-style)
roomSchema.methods.updateLastMessage = async function(messageData) {
  this.lastMessage = {
    content: messageData.content,
    sender: messageData.sender,
    createdAt: messageData.createdAt || new Date()
  };
  return this.save();
};

module.exports = mongoose.model('Room', roomSchema);
