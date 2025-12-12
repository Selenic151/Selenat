const Message = require('../models/Message');
const Room = require('../models/Room');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// @desc    Get messages for a room
// @route   GET /api/messages/:roomId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    // default page size 7 as requested
    const { limit = 7, before, after } = req.query;

    // Check if user is a member of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isMember = room.members.some(
      memberId => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    // Build query (exclude messages hidden for current user)
    const query = { room: roomId, $or: [ { hiddenFor: { $exists: false } }, { hiddenFor: { $ne: req.user._id } } ] };
    let sortOrder = -1;
    // Semantics: use `after` as a cursor to fetch older messages (createdAt < after)
    if (before) {
      query.createdAt = { $lt: new Date(before) };
      sortOrder = -1; // newest first, we'll reverse later
    } else if (after) {
      // Treat `after` as a cursor to load older messages (client passes oldest createdAt)
      query.createdAt = { $lt: new Date(after) };
      sortOrder = -1;
    } else {
      // initial load: return latest messages (descending, then reverse)
      sortOrder = -1;
    }

    // Get messages
    const messages = await Message.find(query)
      .sort({ createdAt: sortOrder })
      .limit(parseInt(limit))
      .populate('sender', 'username avatar')
      .populate('readBy.user', 'username');

    // If we sorted descending (newest first), reverse to chronological order
    if (sortOrder === -1) {
      return res.json(messages.reverse());
    }

    // ascending order already chronological
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a message
// @route   POST /api/messages
// @access  Private
const createMessage = async (req, res) => {
  try {
    const { roomId, content, type = 'text' } = req.body;

    // Check if user is a member of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isMember = room.members.some(
      memberId => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    // Create message
    const message = await Message.create({
      room: roomId,
      sender: req.user._id,
      content,
      type
    });

    // Populate sender info
    await message.populate('sender', 'username avatar');

    res.status(201).json(message);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if already read by user
    const alreadyRead = message.readBy.some(
      r => r.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      message.readBy.push({
        user: req.user._id,
        timestamp: new Date()
      });
      await message.save();
    }

    res.json(message);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload files/images with message
// @route   POST /api/messages/upload
// @access  Private
const uploadFiles = async (req, res) => {
  try {
    const { roomId, content } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Check room membership
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isMember = room.members.some(
      memberId => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not a member of this room' });
    }

    // Process attachments
    const attachments = [];
    for (const file of files) {
      let finalPath = file.path;
      
      // Compress images
      if (file.mimetype.startsWith('image/')) {
        const compressedPath = file.path.replace(path.extname(file.path), '_compressed' + path.extname(file.path));
        
        try {
          await sharp(file.path)
            .resize(1920, 1080, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(compressedPath);
          
          // Delete original, use compressed
          fs.unlinkSync(file.path);
          finalPath = compressedPath;
        } catch (err) {
          console.error('Image compression failed:', err);
          // Keep original if compression fails
        }
      }

      attachments.push({
        filename: path.basename(finalPath),
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/messages/${path.basename(finalPath)}`
      });
    }

    // Determine message type
    let messageType = 'file';
    if (attachments.every(a => a.mimeType.startsWith('image/'))) {
      messageType = 'image';
    } else if (attachments.every(a => a.mimeType.startsWith('video/'))) {
      messageType = 'video';
    }

    // Create message
    const message = await Message.create({
      room: roomId,
      sender: req.user._id,
      content: content || '',
      type: messageType,
      attachments
    });

    await message.populate('sender', 'username avatar');

    // Update room's lastMessage
    await room.updateLastMessage({
      content: messageType === 'image' ? '📷 Hình ảnh' : messageType === 'video' ? '🎥 Video' : '📎 File',
      sender: req.user._id,
      createdAt: message.createdAt
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('message:received', message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Upload files error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete message for current user (hide)
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessageForMe = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Add user to hiddenFor if not already present
    const uid = req.user._id;
    if (!message.hiddenFor) message.hiddenFor = [];
    if (!message.hiddenFor.some(u => u.toString() === uid.toString())) {
      message.hiddenFor.push(uid);
      await message.save();
    }

    res.json({ message: 'Deleted for current user', deletedFor: uid });
  } catch (error) {
    console.error('Delete message for me error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Revoke message (delete for all)
// @route   POST /api/messages/:id/revoke
// @access  Private
const revokeMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const room = await Room.findById(message.room);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const isSender = message.sender.toString() === req.user._id.toString();
    const isAdmin = room.admins.some(a => a.toString() === req.user._id.toString());

    if (!isSender && !isAdmin) {
      return res.status(403).json({ message: 'Only sender or room admin can revoke this message' });
    }

    // Mark as revoked and clear content/attachments; keep a placeholder
    message.revoked = true;
    message.content = '';
    message.attachments = [];
    await message.save();

    // Emit socket event to notify clients to remove/replace the message
    const io = req.app.get('io');
    if (io) {
      io.to(room._id.toString()).emit('message:revoked', { messageId: message._id.toString() });
    }

    res.json({ message: 'Message revoked for all', id: message._id });
  } catch (error) {
    console.error('Revoke message error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMessages,
  createMessage,
  markAsRead,
  uploadFiles,
  deleteMessageForMe,
  revokeMessage
};
