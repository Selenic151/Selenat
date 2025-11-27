const Room = require("../models/Room");
const Message = require("../models/Message");

// Tạo phòng chat mới
const createRoom = async (req, res) => {
    try {
        const { name, description, type, members } = req.body;
        // Tạo phòng mới với creator là người dùng hiện tại và member
        const room = await Room.create({
            name,
            description,
            type: type || 'group',
            creator: req.user._id,
            members: [req.user._id, ...members || []],    
            admins: [req.user._id]
        });
        await room.populate('creator members admins', '- password');
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
        if (!room.Admins.some(adminId => adminId.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không phải quản trị viên của phòng này' });
        }
        await room.populate('creator members admins', '- password');
        const { name, description, avartar } = req.body;

        room.name = name || room.name;
        room.description = description || room.description;
        room.avartar = avartar || room.avartar;

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
        if (!room.Admins.some(adminId => adminId.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không phải quản trị viên của phòng này' });
        }
        
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
        if (!room.Admins.some(adminId => adminId.toString() === req.user._id.toString())) {
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
        if (!room.Admins.some(adminId => adminId.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, bạn không phải quản trị viên của phòng này' });
        }
        room.members = room.members.filter(memberId => memberId.toString() !== req.body.userId);

        await room.save();
        await room.populate('creator members admins', '- password');
        
        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};