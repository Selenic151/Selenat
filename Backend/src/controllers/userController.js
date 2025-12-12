const User = require('../models/User');
const cacheService = require('../services/cacheService');

// Get user by id (public fields)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('username email avatar isOnline lastSeen');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update user profile (supports avatar upload via avatarUpload middleware)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Authorization: only owner or admin
    if (req.user._id.toString() !== id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update basic fields
    if (req.body.username) user.username = req.body.username;
    if (req.body.email) user.email = req.body.email;
    if (typeof req.body.online !== 'undefined') user.isOnline = req.body.online === 'true' || req.body.online === true;

    // Avatar handling
    if (req.file) {
      // store relative path for frontend
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    await user.save();

    // Invalidate cache
    try { await cacheService.del(`user:${user._id}`); } catch (e) { /* ignore */ }

    const updated = await User.findById(id).select('username email avatar isOnline lastSeen');
    res.json(updated);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Change password endpoint
const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user._id.toString() !== id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new passwords are required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await user.matchPassword(currentPassword);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    // invalidate cache
    try { await cacheService.del(`user:${user._id}`); } catch (e) {}

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserById,
  updateUser,
  changePassword
};
