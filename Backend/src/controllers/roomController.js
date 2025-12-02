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

// Lấy danh sách phòng chat của người dùng
const getUserRooms = async (req, res) => {
    try {
        console.debug('getUserRooms for user:', req.user && req.user._id);
        const rooms = await Room.find({ members: req.user._id })
            .populate('creator members admins', '-password')
            .sort({ updatedAt: -1 });
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
        await room.populate('creator members admins', '-password');

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
                // Delete room document
                await room.deleteOne();

                // Emit socket event so connected clients update in realtime
                const io = req.app.get('io');
                if (io) {
                    try { io.emit('room:deleted', { roomId: room._id.toString() }); } catch (e) { console.error('Emit room:deleted failed', e); }
                }

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