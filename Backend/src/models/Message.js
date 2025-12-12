const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      // Content chỉ required nếu không có attachment
      return !this.attachments || this.attachments.length === 0;
    }
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'video'],
    default: 'text'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
  ,
  // Users for whom this message is hidden (deleted "for me")
  hiddenFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // If true, message has been revoked (deleted for everyone)
  revoked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model('Message', messageSchema);
