const Message = require('../models/Message');
const Room = require('../models/Room');

// desc Get messages in a room with pagination
// route GET /api/messages/room/:roomId
// access Private
const getMessagesInRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { limit = 20, skip = 0 } = req.query;

        // Kiểm tra xem người dùng có phải thành viên của phòng không   
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Phòng không tồn tại' });
        }

        if (!room.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không phải thành viên của phòng này' });
        }   
        // Lấy tin nhắn với phân trang
        const messages = await Message.find({ room: roomId })
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate('sender', '-password')
            .exec();
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Create a new message in a room
// @route POST /api/messages/room/:roomId
// @access Private
const createMessageInRoom = async (req, res) => {
    try {
        const { roomId, content, type } = req.body;
        
        // kieem tra phong
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Phòng không tồn tại' });
        }
        if (!room.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không phải thành viên của phòng này' });
        }

        // tao tin nhan
        const message = await Message.create({
            room: roomId,
            sender: req.user._id,
            content,
            type: type || 'text'    
        });

        await message.populate('sender', '-password');

        // cap nhat phong
        room.updatedAt = Date.now();
        await room.save();

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Mark message as read
// @route POST /api/messages/:messageId/read
// @access Private
const markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy message' });
    }

    // Kiểm tra user đã đọc chưa
    const alreadyRead = message.readBy.some(
      read => read.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      message.readBy.push({ user: req.user._id });
      await message.save();
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Không tìm thấy message' });
    }

    // Chỉ sender hoặc admin mới có thể xóa
    if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xóa message này' });
    }

    await message.deleteOne();

    res.json({ message: 'Message đã được xóa' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMessages: getMessagesInRoom,
  createMessage: createMessageInRoom,
  markAsRead,
  deleteMessage
};