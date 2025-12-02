const express = require('express');
const router = express.Router();
const {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriends,
    getFriendRequests,
    searchUsers,
    checkFriendStatus
} = require('../controllers/friendController');
const { protect } = require('../middleware/auth');

// Tìm kiếm người dùng
router.get('/search', protect, searchUsers);

// Danh sách bạn bè và lời mời
router.get('/list', protect, getFriends);
router.get('/requests', protect, getFriendRequests);

// Gửi/hủy lời mời
router.post('/request', protect, sendFriendRequest);
router.delete('/request/:userId', protect, cancelFriendRequest);

// Chấp nhận/từ chối lời mời
router.post('/accept/:userId', protect, acceptFriendRequest);
router.post('/decline/:userId', protect, declineFriendRequest);

// Xóa bạn bè
router.delete('/:userId', protect, removeFriend);

// Kiểm tra trạng thái
router.get('/status/:userId', protect, checkFriendStatus);

module.exports = router;
