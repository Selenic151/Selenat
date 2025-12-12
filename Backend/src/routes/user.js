const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getUserById, updateUser, changePassword } = require('../controllers/userController');
const { avatarUpload } = require('../config/multer');
const { authLimiter } = require('../middleware/rateLimiter');

// @desc    Search users by email or phone
// @route   GET /api/users/search?q=query
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        {
          $or: [
            { email: { $regex: q, $options: 'i' } },
            { phone: { $regex: q, $options: 'i' } },
            { username: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username email phone avatar')
    .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get user by id
router.get('/:id', protect, getUserById);

// Update user (supports avatar upload)
router.put('/:id', protect, avatarUpload.single('avatar'), updateUser);

// Change password (rate limited)
router.post('/:id/change-password', protect, authLimiter, changePassword);

module.exports = router;
