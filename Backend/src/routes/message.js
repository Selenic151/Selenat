const express = require('express');
const router = express.Router();
const { getMessages, createMessage, markAsRead, uploadFiles, deleteMessageForMe, revokeMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { createMessageSchema } = require('../validation/schemas');
const { upload } = require('../config/multer');

router.get('/:roomId', protect, getMessages);
router.post('/', protect, messageLimiter, validate(createMessageSchema), createMessage);
router.post('/upload', protect, messageLimiter, upload.array('files', 5), uploadFiles);
router.put('/:id/read', protect, markAsRead);
// Delete for me: mark message hidden for current user
router.delete('/:id', protect, deleteMessageForMe);
// Revoke message (delete for all) - only allowed for sender or room admin
router.post('/:id/revoke', protect, revokeMessage);

module.exports = router;
