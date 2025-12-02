const jwt = require('jsonwebtoken');
const User = require('../models/User');

// tạo jwt token
const generateToken = (user) => {
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
}

//Desc  Register new user
//Route  POST /api/auth/register
//Access Public
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        //kiểm tra user tồn tại
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'Người dùng đã tồn tại với email này' });
        }
        //tạo user mới
        user = new User({
            username,
            email,
            password
        });
        await user.save();
        
        if (user) {
                 res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                token: generateToken(user),
            });
        } else {
            res.status(400).json({ message: 'Dữ liệu người dùng không hợp lệ' });
        }
       
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//Desc  Auth user & get token
//Route  POST /api/auth/login
//Access Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        //kiểm tra user tồn tại
        const user = await User.findOne({ email });
        if (user && (await user.matchPassword(password))) {
            user.isOnline = true;
            user.lastSeen = new Date();
            await user.save();

            res.json({   
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                token: generateToken(user),
            });
        }   else {
            res.status(401).json({ message: 'Email hoặc mật khẩu không hợp lệ' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//desc get current user 
//route GET /api/auth/me
//access private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// desc logout user
// route POST /api/auth/logout
// access private
const logout = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.isOnline = false;
            user.lastSeen = new Date();
            await user.save();
            res.json({ message: 'Đăng xuất thành công' });
        } else {
            res.status(404).json({ message: 'Người dùng không tồn tại' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { register, login, getMe, logout };


