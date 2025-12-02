const express = require('express');
const router = express.Router();
const {
  getMessages,
  createMessage,
  markAsRead,
  deleteMessage
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.get('/:roomId', protect, getMessages);
router.post('/', protect, createMessage);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteMessage);

module.exports = router;