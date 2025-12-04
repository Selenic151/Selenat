const Notification = require('../models/Notification');
const Room = require('../models/Room');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Email transporter (configure with your SMTP settings)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// @desc    Invite users to room
// @route   POST /api/notifications/invite
// @access  Private
const inviteUsersToRoom = async (req, res) => {
  try {
    const { roomId, userIds } = req.body;

    // Get room and check permissions
    const room = await Room.findById(roomId).populate('creator admins members', 'username email avatar');
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is creator or admin
    const isCreator = room.creator._id.toString() === req.user._id.toString();
    const isAdmin = room.admins.some(admin => admin._id.toString() === req.user._id.toString());

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Only creator or admins can invite users' });
    }

    // Get online users map from app
    const onlineUsers = req.app.get('onlineUsers') || new Map();

    // Create notifications for each user
    const notifications = await Promise.all(
      userIds.map(async (userId) => {
        // Check if user already a member (filter out null members first)
        const isMember = room.members.filter(m => m != null).some(m => (m._id ? m._id.toString() : m.toString()) === userId);
        if (isMember) {
          return null;
        }

        // Create notification
        const notification = await Notification.create({
          type: 'invite',
          from: req.user._id,
          to: userId,
          room: roomId,
          message: `${req.user.username} invited you to join ${room.name}`
        });

        await notification.populate('from', 'username avatar');
        await notification.populate('room', 'name avatar');

        // Check if user is online
        const isOnline = onlineUsers.has(userId);

        // If user is offline and email is configured, send email
        if (!isOnline && process.env.SMTP_HOST) {
          const user = await User.findById(userId);
          if (user && user.email) {
            try {
              await transporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@chat.com',
                to: user.email,
                subject: `Invitation to join ${room.name}`,
                html: `
                  <h2>Room Invitation</h2>
                  <p>${req.user.username} has invited you to join the room "${room.name}".</p>
                  <p>Login to your account to accept or decline this invitation.</p>
                  <a href="${process.env.CLIENT_URL}/chat">Go to Chat</a>
                `
              });
            } catch (emailError) {
              console.error('Email send error:', emailError);
            }
          }
        }

        // Emit socket event if user is online
        if (isOnline) {
          const io = req.app.get('io');
          const socketId = onlineUsers.get(userId);
          if (io && socketId) {
            io.to(socketId).emit('invitation:received', notification);
          }
        }

        return notification;
      })
    );

    const createdNotifications = notifications.filter(n => n !== null);

    res.status(201).json({
      message: 'Invitations sent successfully',
      notifications: createdNotifications
    });
  } catch (error) {
    console.error('Invite users error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ to: req.user._id })
      .sort({ createdAt: -1 })
      .populate('from', 'username avatar')
      .populate('room', 'name avatar');

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept room invitation
// @route   POST /api/notifications/:id/accept
// @access  Private
const acceptNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (notification.status !== 'pending') {
      return res.status(400).json({ message: 'Invitation already processed' });
    }

    // Update notification status
    notification.status = 'accepted';
    await notification.save();

    // Add user to room members
    const room = await Room.findById(notification.room);
    if (room && !room.members.includes(req.user._id)) {
      room.members.push(req.user._id);
      await room.save();
    }

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      // Emit member:joined event to the room
      if (room) {
        console.log('Emitting member:joined event:', { roomId: room._id.toString(), userId: req.user._id.toString(), username: req.user.username });
        io.to(room._id.toString()).emit('member:joined', {
          roomId: room._id.toString(),
          userId: req.user._id.toString(),
          username: req.user.username
        });
      }

      // Notify the inviter
      const onlineUsers = req.app.get('onlineUsers') || new Map();
      const inviterSocketId = onlineUsers.get(notification.from.toString());
      if (inviterSocketId) {
        io.to(inviterSocketId).emit('invitation:accepted', {
          userId: req.user._id,
          roomId: notification.room,
          username: req.user.username
        });
      }

      // Broadcast room update to all members
      io.emit('room:updated', room);
    }

    res.json({ message: 'Invitation accepted', notification });
  } catch (error) {
    console.error('Accept notification error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Decline room invitation
// @route   POST /api/notifications/:id/decline
// @access  Private
const declineNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (notification.status !== 'pending') {
      return res.status(400).json({ message: 'Invitation already processed' });
    }

    notification.status = 'declined';
    await notification.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      const onlineUsers = req.app.get('onlineUsers') || new Map();
      const inviterSocketId = onlineUsers.get(notification.from.toString());
      if (inviterSocketId) {
        io.to(inviterSocketId).emit('invitation:declined', {
          userId: req.user._id,
          roomId: notification.room,
          username: req.user.username
        });
      }
    }

    res.json({ message: 'Invitation declined', notification });
  } catch (error) {
    console.error('Decline notification error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const readNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    notification.status = 'read';
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('Read notification error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  inviteUsersToRoom,
  getNotifications,
  acceptNotification,
  declineNotification,
  readNotification
};
