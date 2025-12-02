const express = require('express');
const router = express.Router();
const {
  inviteUsersToRoom,
  getNotifications,
  acceptNotification,
  declineNotification,
  readNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.post('/invite', protect, inviteUsersToRoom);
router.get('/', protect, getNotifications);
router.put('/:id/read', protect, readNotification);
router.post('/:id/accept', protect, acceptNotification);
router.post('/:id/decline', protect, declineNotification);

module.exports = router;
