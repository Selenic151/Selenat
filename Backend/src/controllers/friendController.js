const User = require('../models/User');

// Gửi lời mời kết bạn
const sendFriendRequest = async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        if (userId === req.user._id.toString()) {
            return res.status(400).json({ message: 'Không thể gửi lời mời kết bạn cho chính mình' });
        }
        
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }
        
        const currentUser = await User.findById(req.user._id);
        
        // Kiểm tra đã là bạn bè chưa
        if (currentUser.friends.includes(userId)) {
            return res.status(400).json({ message: 'Đã là bạn bè' });
        }
        
        // Kiểm tra đã gửi lời mời chưa
        if (currentUser.friendRequests.sent.includes(userId)) {
            return res.status(400).json({ message: 'Đã gửi lời mời kết bạn' });
        }
        
        // Kiểm tra đã nhận lời mời từ người này chưa
        if (currentUser.friendRequests.received.includes(userId)) {
            return res.status(400).json({ message: 'Người này đã gửi lời mời cho bạn, hãy chấp nhận' });
        }
        
        // Thêm vào danh sách sent của người gửi
        currentUser.friendRequests.sent.push(userId);
        await currentUser.save();
        
        // Thêm vào danh sách received của người nhận
        targetUser.friendRequests.received.push(req.user._id);
        await targetUser.save();
        
        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(userId).emit('friend:request', {
                from: {
                    _id: currentUser._id,
                    username: currentUser.username,
                    email: currentUser.email,
                    avatar: currentUser.avatar
                }
            });
        }
        
        res.json({ message: 'Đã gửi lời mời kết bạn', success: true });
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ message: error.message });
    }
};

// Chấp nhận lời mời kết bạn
const acceptFriendRequest = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const currentUser = await User.findById(req.user._id);
        const requestUser = await User.findById(userId);
        
        if (!requestUser) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }
        
        // Kiểm tra có lời mời không
        if (!currentUser.friendRequests.received.includes(userId)) {
            return res.status(400).json({ message: 'Không có lời mời kết bạn từ người này' });
        }
        
        // Xóa khỏi danh sách received của người nhận
        currentUser.friendRequests.received = currentUser.friendRequests.received.filter(
            id => id.toString() !== userId
        );
        
        // Xóa khỏi danh sách sent của người gửi
        requestUser.friendRequests.sent = requestUser.friendRequests.sent.filter(
            id => id.toString() !== req.user._id.toString()
        );
        
        // Thêm vào danh sách bạn bè của cả hai
        currentUser.friends.push(userId);
        requestUser.friends.push(req.user._id);
        
        await currentUser.save();
        await requestUser.save();
        
        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(userId).emit('friend:accepted', {
                user: {
                    _id: currentUser._id,
                    username: currentUser.username,
                    email: currentUser.email,
                    avatar: currentUser.avatar
                }
            });
        }
        
        res.json({ message: 'Đã chấp nhận lời mời kết bạn', success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Từ chối lời mời kết bạn
const declineFriendRequest = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const currentUser = await User.findById(req.user._id);
        const requestUser = await User.findById(userId);
        
        if (!requestUser) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }
        
        // Xóa khỏi danh sách received
        currentUser.friendRequests.received = currentUser.friendRequests.received.filter(
            id => id.toString() !== userId
        );
        
        // Xóa khỏi danh sách sent của người gửi
        requestUser.friendRequests.sent = requestUser.friendRequests.sent.filter(
            id => id.toString() !== req.user._id.toString()
        );
        
        await currentUser.save();
        await requestUser.save();
        
        res.json({ message: 'Đã từ chối lời mời kết bạn', success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Hủy lời mời kết bạn đã gửi
const cancelFriendRequest = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const currentUser = await User.findById(req.user._id);
        const targetUser = await User.findById(userId);
        
        if (!targetUser) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }
        
        // Xóa khỏi danh sách sent
        currentUser.friendRequests.sent = currentUser.friendRequests.sent.filter(
            id => id.toString() !== userId
        );
        
        // Xóa khỏi danh sách received của người nhận
        targetUser.friendRequests.received = targetUser.friendRequests.received.filter(
            id => id.toString() !== req.user._id.toString()
        );
        
        await currentUser.save();
        await targetUser.save();
        
        res.json({ message: 'Đã hủy lời mời kết bạn', success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xóa bạn bè
const removeFriend = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const currentUser = await User.findById(req.user._id);
        const friendUser = await User.findById(userId);
        
        if (!friendUser) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }
        
        // Xóa khỏi danh sách bạn bè của cả hai
        currentUser.friends = currentUser.friends.filter(
            id => id.toString() !== userId
        );
        friendUser.friends = friendUser.friends.filter(
            id => id.toString() !== req.user._id.toString()
        );
        
        await currentUser.save();
        await friendUser.save();
        
        res.json({ message: 'Đã xóa bạn bè', success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách bạn bè
const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('friends', '-password -friendRequests');
        
        res.json(user.friends);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách lời mời kết bạn
const getFriendRequests = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('friendRequests.received', '-password -friendRequests')
            .populate('friendRequests.sent', '-password -friendRequests');
        
        res.json({
            received: user.friendRequests.received,
            sent: user.friendRequests.sent
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Tìm kiếm người dùng theo email hoặc số điện thoại
const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 2) {
            return res.status(400).json({ message: 'Query phải có ít nhất 2 ký tự' });
        }
        
        // Tìm kiếm theo email hoặc phone
        const users = await User.find({
            _id: { $ne: req.user._id }, // Không bao gồm chính mình
            $or: [
                { email: { $regex: q, $options: 'i' } },
                { phone: { $regex: q, $options: 'i' } },
                { username: { $regex: q, $options: 'i' } }
            ]
        })
        .select('-password -friendRequests')
        .limit(20);
        
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Kiểm tra trạng thái kết bạn với một user
const checkFriendStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const currentUser = await User.findById(req.user._id);
        
        let status = 'none'; // none, friend, request_sent, request_received
        
        if (currentUser.friends.includes(userId)) {
            status = 'friend';
        } else if (currentUser.friendRequests.sent.includes(userId)) {
            status = 'request_sent';
        } else if (currentUser.friendRequests.received.includes(userId)) {
            status = 'request_received';
        }
        
        res.json({ status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriends,
    getFriendRequests,
    searchUsers,
    checkFriendStatus
};
