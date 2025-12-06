const mongoose = require('mongoose');
const Room = require("../models/Room");
const Message = require("../models/Message");
const Notification = require('../models/Notification');
const cacheService = require('../services/cacheService');
const { invalidateMultipleUserRoomsCache } = require('../utils/cacheInvalidation');

// Tạo phòng chat mới
const createRoom = async (req, res) => {
    try {
        console.error('CreateRoom request user:', req.user && (req.user._id || req.user));
        console.error('CreateRoom request body:', JSON.stringify(req.body));
        const { name, description, type, invitedMembers, members } = req.body; // invitedMembers/members: array of userIds
        if (!name) {
            return res.status(400).json({ message: 'Tên phòng là bắt buộc' });
        }
        // sanitize members from payload and ensure creator is included
        const safeMembers = Array.isArray(members)
            ? members.map(v => (typeof v === 'string' ? v.trim() : v)).filter(Boolean)
                .filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id))
            : [];
        // always include creator
        if (!safeMembers.some(m => m.toString() === req.user._id.toString())) {
            safeMembers.push(new mongoose.Types.ObjectId(req.user._id));
        }

        // Tạo phòng mới với creator là người dùng hiện tại và member
        const room = await Room.create({
            name,
            description,
            type: type || 'group',
            creator: req.user._id,
            members: safeMembers,
            admins: [req.user._id]
        });
        await room.populate('creator members admins', '-password');

        // Create notification invites for invitedMembers (sanitize input)
        const notifications = [];
        const safeInvited = Array.isArray(invitedMembers)
            ? invitedMembers.map(v => (typeof v === 'string' ? v.trim() : v)).filter(Boolean)
            : [];
        if (safeInvited.length > 0) {
            for (const uid of safeInvited) {
                try {
                    const notification = await Notification.create({
                        type: 'invite',
                        from: req.user._id,
                        to: uid,
                        room: room._id,
                        message: `Bạn được mời tham gia phòng ${room.name}`,
                        status: 'pending'
                    });
                    // Populate notification before emitting
                    await notification.populate('from to room');
                    notifications.push(notification);
                } catch (nerr) {
                    // Log but do not fail creating the room because of notification issues
                    console.error('Failed to create notification for invited user', uid, nerr && nerr.message);
                }
            }
        }

        // Emit real-time event for newly created room
        const io = req.app.get('io');
        if (io) {
            io.emit('room:created', room);
            // Notify invited users
            const onlineUsers = req.app.get('onlineUsers');
            if (onlineUsers) {
                notifications.forEach(n => {
                    const sid = onlineUsers.get(n.to._id.toString());
                    if (sid) {
                        console.log(`Emitting invitation to user ${n.to._id} via socket ${sid}`);
                        io.to(sid).emit('invitation:received', n);
                    } else {
                        console.log(`User ${n.to._id} is not online`);
                    }
                });
            }
        }

        // Invalidate rooms cache for all members
        await invalidateMultipleUserRoomsCache(safeMembers.map(m => m.toString()));

        res.status(201).json(room);        
    } catch (error) {
        console.error('CreateRoom error:', error && error.stack ? error.stack : error);
        res.status(500).json({ message: error && error.message ? error.message : 'Internal Server Error' });
    }   
};

// Lấy danh sách phòng chat của người dùng (Optimized - Messenger style)
const getUserRooms = async (req, res) => {
    try {
        console.debug('getUserRooms for user:', req.user && req.user._id);
        
        const cacheKey = `rooms:user:${req.user._id}`;
        
        // Try cache first (5 minutes TTL)
        const rooms = await cacheService.cacheWrapper(
            cacheKey,
            async () => {
                // Chỉ populate thông tin cần thiết (không populate hết members)
                return await Room.find({ members: req.user._id })
                    .populate('creator', 'username avatar')
                    .populate('members', 'username email avatar online') // Chỉ lấy info cơ bản
                    .populate('lastMessage.sender', 'username avatar')
                    .select('-participantSettings') // Không trả về settings trong list
                    .sort({ updatedAt: -1 })
                    .lean(); // Use lean() for better performance (plain JS objects)
            },
            300 // 5 minutes
        );
        
        res.json(rooms);
    }
    catch (error) {
        console.error('getUserRooms error:', error && error.stack ? error.stack : error);
        res.status(500).json({ message: error && error.message ? error.message : 'Internal Server Error' });
    }
};

// Lấy chi tiết phòng chat theo ID
const getRoomById = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id)
            .populate('creator members admins', '-password');
        if (!room) {
            return res.status(404).json({ message: 'Phòng không tồn tại' });
        }
        if (!room.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không phải thành viên của phòng này' });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// cập nhật phòng chat
const updateRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Phòng không tồn tại' });
        }
        // Chỉ cho phép quản trị viên phòng cập nhật
        if (!room.admins.some(adminId => adminId.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không phải quản trị viên của phòng này' });
        }
        await room.populate('creator members admins', '-password');
        const { name, description, avatar } = req.body;

        room.name = name || room.name;
        room.description = description || room.description;
        room.avatar = avatar || room.avatar;

        await room.save();
        await room.populate('creator members admins', '-password');

        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// add thành viên vào phòng chat
const addRoomMember = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id).populate('members', 'username');
        if (!room) {
            return res.status(404).json({ message: 'Phòng không tồn tại' });
        }
        // Chỉ cho phép quản trị viên phòng thêm thành viên
        if (!room.admins.some(adminId => adminId.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không phải quản trị viên của phòng này' });
        }
        
        const { userIds } = req.body;
        const idsToAdd = Array.isArray(userIds) ? userIds : [userIds];
        
        // Filter out members already in room
        const newMembers = idsToAdd.filter(id => 
            !room.members.some(member => member._id.toString() === id)
        );

        if (newMembers.length === 0) {
            return res.status(400).json({ message: 'Thành viên đã có trong phòng' });
        }

        room.members.push(...newMembers);
        await room.save();
        await room.populate('creator members admins', '-password');

        // Invalidate cache for all room members
        await invalidateMultipleUserRoomsCache([...room.members.map(m => m._id.toString()), ...newMembers]);

        // Emit socket event for member joining
        const io = req.app.get('io');
        if (io) {
            // Emit event for each newly added member
            for (const userId of newMembers) {
                const joinedUser = room.members.find(m => m._id.toString() === userId);
                if (joinedUser) {
                    io.to(room._id.toString()).emit('member:joined', {
                        roomId: room._id.toString(),
                        userId: userId,
                        username: joinedUser.username
                    });
                }
            }
        }

        res.json(room);
    }   catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Xoá phòng chat
const deleteRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Phòng không tồn tại' });
        }
        
        // Chỉ cho phép creator xóa phòng
        if (room.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Chỉ chủ phòng mới có quyền xóa phòng' });
        }
        
        // Xóa tất cả tin nhắn trong phòng
        await Message.deleteMany({ room: room._id });
        
        // Xóa tất cả thông báo liên quan đến phòng
        await Notification.deleteMany({ room: room._id });
        
        // Xóa room khỏi database
        await Room.findByIdAndDelete(room._id);

        // Invalidate cache for all members
        await invalidateMultipleUserRoomsCache(room.members.map(m => m.toString()));

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            try { 
                io.emit('room:deleted', { roomId: room._id.toString() }); 
            } catch (e) { 
                console.error('Emit room:deleted failed', e); 
            }
        }

        res.json({ message: 'Phòng đã bị xóa', deleted: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// xóa thành viên khỏi phòng chat
const removeRoomMember = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id).populate('members', 'username');
        if (!room) {
            return res.status(404).json({ message: 'Phòng không tồn tại' });
        }
        
        const { userId } = req.params;
        const isRemovingSelf = userId === req.user._id.toString();
        const isAdmin = room.admins.some(adminId => adminId.toString() === req.user._id.toString());
        const creatorId = room.creator._id ? room.creator._id.toString() : room.creator.toString();
        const isCreator = userId === creatorId;
        
        // Cho phép: user tự rời phòng HOẶC admin xóa member khác
        if (!isRemovingSelf && !isAdmin) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không có quyền xóa thành viên này' });
        }
        
        // Nếu creator muốn rời phòng, phần tích tình huống
        if (isCreator && isRemovingSelf) {
            // Nếu chỉ còn mình creator -> xóa phòng luôn
            if (room.members.length <= 1) {
                await Message.deleteMany({ room: room._id });
                await Notification.deleteMany({ room: room._id });
                await Room.findByIdAndDelete(room._id);
                
                const io = req.app.get('io');
                if (io) {
                    try { io.emit('room:deleted', { roomId: room._id.toString() }); } 
                    catch (e) { console.error('Emit room:deleted failed', e); }
                }
                
                return res.json({ message: 'Phòng đã bị xóa do không còn thành viên', deleted: true });
            }
            
            // Nếu còn thành viên khác -> yêu cầu chuyển quyền
            return res.status(400).json({ 
                message: 'Chủ phòng phải chuyển quyền cho thành viên khác trước khi rời phòng',
                requireTransfer: true,
                members: room.members.filter(m => m.toString() !== userId)
            });
        }
        
        // Xóa member khỏi room
        room.members = room.members.filter(memberId => {
            const id = memberId._id ? memberId._id.toString() : memberId.toString();
            return id !== userId;
        });
        
        // Nếu là admin tự rời, xóa khỏi danh sách admin
        if (isRemovingSelf && isAdmin) {
            room.admins = room.admins.filter(adminId => adminId.toString() !== userId);
        }

        // Kiểm tra nếu không còn thành viên nào -> xóa room khỏi DB
        if (room.members.length === 0) {
            await Message.deleteMany({ room: room._id });
            await Notification.deleteMany({ room: room._id });
            await Room.findByIdAndDelete(room._id);
            
            const io = req.app.get('io');
            if (io) {
                try { io.emit('room:deleted', { roomId: room._id.toString() }); } 
                catch (e) { console.error('Emit room:deleted failed', e); }
            }
            
            return res.json({ message: 'Phòng đã bị xóa do không còn thành viên', deleted: true });
        }

        // Emit socket event for member leaving BEFORE saving (so user is still in room to receive it)
        const io = req.app.get('io');
        if (io) {
            const username = req.user.username || 'User';
            console.log('Emitting member:left event:', { roomId: room._id.toString(), userId, username });
            io.to(room._id.toString()).emit('member:left', {
                roomId: room._id.toString(),
                userId: userId,
                username: username
            });
        }

        await room.save();
        await room.populate('creator members admins', '-password');
        
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Upload avatar for room
const uploadRoomAvatar = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Phòng không tồn tại' });
        // check admin
        if (!room.admins.some(adminId => adminId.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Bạn không có quyền cập nhật avatar' });
        }
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        // Update avatar path
        room.avatar = `/uploads/rooms/${req.file.filename}`;
        await room.save();
        await room.populate('creator members admins', '-password');
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Chuyển quyền creator cho thành viên khác
const transferOwnership = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Phòng không tồn tại' });
        }
        
        // Chỉ creator mới được chuyển quyền
        if (room.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Chỉ chủ phòng mới có quyền chuyển quyền' });
        }
        
        const { newCreatorId } = req.body;
        
        if (!newCreatorId) {
            return res.status(400).json({ message: 'Vui lòng chọn thành viên mới' });
        }
        
        // Kiểm tra thành viên mới có trong phòng không
        if (!room.members.some(m => m.toString() === newCreatorId)) {
            return res.status(400).json({ message: 'Thành viên không tồn tại trong phòng' });
        }
        
        // Chuyển quyền creator
        room.creator = newCreatorId;
        
        // Đảm bảo creator mới là admin
        if (!room.admins.some(a => a.toString() === newCreatorId)) {
            room.admins.push(newCreatorId);
        }
        
        await room.save();
        await room.populate('creator members admins', '-password');
        
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Tạo hoặc tìm direct room giữa 2 người (Optimized)
const createDirectRoom = async (req, res) => {
    try {
        const { userId } = req.body; // ID của người nhận
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID là bắt buộc' });
        }

        if (userId === req.user._id.toString()) {
            return res.status(400).json({ message: 'Không thể tạo tin nhắn với chính mình' });
        }

        // Dùng static method (có index optimization)
        let room = await Room.findDirectRoom(req.user._id, userId);

        if (room) {
            return res.json(room);
        }

        // Tạo direct room mới
        room = await Room.createDirectRoom(req.user._id, userId);
        res.status(201).json(room);
    } catch (error) {
        console.error('createDirectRoom error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Lấy số lượng tin nhắn chưa đọc cho một room
const getUnreadCount = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user._id;

        // Lấy room và lastRead timestamp
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Kiểm tra user có trong room không
        if (!room.members.some(m => m.toString() === userId.toString())) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Lấy lastRead timestamp của user này
        const settings = room.participantSettings.get(userId.toString());
        const lastRead = settings?.lastRead || new Date(0); // Nếu chưa có thì dùng epoch

        // Đếm tin nhắn chưa đọc (createdAt > lastRead và không phải của mình)
        const unreadCount = await Message.countDocuments({
            room: roomId,
            sender: { $ne: userId },
            createdAt: { $gt: lastRead }
        });

        res.json({ roomId, unreadCount });
    } catch (error) {
        console.error('getUnreadCount error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Đánh dấu room là đã đọc (update lastRead)
const markRoomAsRead = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user._id.toString();

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (!room.members.some(m => m.toString() === userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Update lastRead timestamp
        const settings = room.participantSettings.get(userId) || {
            muted: false,
            archived: false,
            pinned: false,
            lastRead: new Date()
        };
        settings.lastRead = new Date();
        room.participantSettings.set(userId, settings);

        await room.save();

        res.json({ message: 'Marked as read', lastRead: settings.lastRead });
    } catch (error) {
        console.error('markRoomAsRead error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createRoom,
    getRooms: getUserRooms,
    getRoomById,
    updateRoom,
    addMember: addRoomMember,
    removeMember: removeRoomMember,
    deleteRoom,
    uploadRoomAvatar,
    transferOwnership,
    createDirectRoom,
    getUnreadCount,
    markRoomAsRead
};