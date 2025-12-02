const Room = require("../models/Room");
const Message = require("../models/Message");
const Notification = require('../models/Notification');

// Tạo phòng chat mới
const createRoom = async (req, res) => {
    try {
        const { name, description, type, invitedMembers } = req.body; // invitedMembers: array of userIds
        // Tạo phòng mới với creator là người dùng hiện tại và member
        const room = await Room.create({
            name,
            description,
            type: type || 'group',
            creator: req.user._id,
            members: [req.user._id],    
            admins: [req.user._id]
        });
        await room.populate('creator members admins', '- password');

        // Create notification invites for invitedMembers
        const notifications = [];
        if (invitedMembers && Array.isArray(invitedMembers)) {
            for (const uid of invitedMembers) {
                const notification = await Notification.create({
                    type: 'invite',
                    from: req.user._id,
                    to: uid,
                    room: room._id,
                    message: `Bạn được mời tham gia phòng ${room.name}`,
                    status: 'pending'
                });
                notifications.push(notification);
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
        res.status(500).json({ message: error.message });
    }   
};

// Lấy danh sách phòng chat của người dùng
const getUserRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ members: req.user._id })
            .populate('creator members admins', '- password')
            .sort({ updatedAt: -1 });
        res.json(rooms);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy chi tiết phòng chat theo ID
const getRoomById = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id)
            .populate('creator members admins', '- password');
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
        await room.populate('creator members admins', '- password');
        const { name, description, avatar } = req.body;

        room.name = name || room.name;
        room.description = description || room.description;
        room.avatar = avatar || room.avatar;

        await room.save();
        await room.populate('creator members admins', '- password');

        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// add thành viên vào phòng chat
const addRoomMember = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
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
        await room.populate('creator members admins', '- password');

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
        // Chỉ cho phép quản trị viên phòng xoá
        if (!room.admins.some(adminId => adminId.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không phải quản trị viên của phòng này' });
        }
        // Xoá tất cả tin nhắn trong phòng
        await Message.deleteMany({ room: room._id });
        await room.remove();
        res.json({ message: 'Phòng đã bị xoá' });
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
        // Chỉ cho phép quản trị viên phòng xoá thành viên
        if (!room.admins.some(adminId => adminId.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không phải quản trị viên của phòng này' });
        }
        
        const { userId } = req.params;
        
        room.members = room.members.filter(memberId => memberId.toString() !== userId);

        await room.save();
        await room.populate('creator members admins', '- password');
        
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
        await room.populate('creator members admins', '- password');
        res.json(room);
    } catch (error) {
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
    uploadRoomAvatar
};