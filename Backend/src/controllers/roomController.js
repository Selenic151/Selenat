const mongoose = require('mongoose');
const Room = require("../models/Room");
const Message = require("../models/Message");
const Notification = require('../models/Notification');

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
                    const sid = onlineUsers.get(n.to.toString());
                    if (sid) io.to(sid).emit('invitation:received', n);
                });
            }
        }

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
        
        // Chỉ populate thông tin cần thiết (không populate hết members)
        const rooms = await Room.find({ members: req.user._id })
            .populate('creator', 'username avatar')
            .populate('members', 'username email avatar online') // Chỉ lấy info cơ bản
            .populate('lastMessage.sender', 'username avatar')
            .select('-participantSettings') // Không trả về settings trong list
            .sort({ updatedAt: -1 })
            .lean(); // Use lean() for better performance (plain JS objects)
        
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
        
        const { userId } = req.body;
        
        // kiểm tra thành viên đã có trong phòng chưa
        if (room.members.includes(userId)) {
            return res.status(400).json({ message: 'Thành viên đã có trong phòng' });
        }

        room.members.push(req.body.userId);
        await room.save();
        await room.populate('creator members admins', '-password');

        // Emit socket event for member joining
        const io = req.app.get('io');
        if (io) {
            // Find the user who joined
            const joinedUser = room.members.find(m => m._id.toString() === userId);
            if (joinedUser) {
                io.to(room._id.toString()).emit('member:joined', {
                    roomId: room._id.toString(),
                    userId: userId,
                    username: joinedUser.username
                });
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
        const room = await Room.findById(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Phòng không tồn tại' });
        }
        
        const { userId } = req.params;
        const isRemovingSelf = userId === req.user._id.toString();
        const isAdmin = room.admins.some(adminId => adminId.toString() === req.user._id.toString());
        const isCreator = userId === room.creator.toString();
        
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
        room.members = room.members.filter(memberId => memberId.toString() !== userId);
        
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
    createDirectRoom
};