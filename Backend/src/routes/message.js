const express = require('express');
const router = express.Router();
const { getMessages, createMessage, markAsRead } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.get('/:roomId', protect, getMessages);
router.post('/', protect, createMessage);
router.put('/:id/read', protect, markAsRead);

module.exports = router;
