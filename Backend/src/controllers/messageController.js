const Message = require('../models/Message');
const Room = require('../models/Room');

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

    // Build query
    const query = { room: roomId };
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

module.exports = {
  getMessages,
  createMessage,
  markAsRead
};
