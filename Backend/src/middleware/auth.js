const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            //lấy token từ header
            token = req.headers.authorization.split(' ')[1];
            //verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            //lấy user từ token, không lấy password
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Không được phép, không tìm thấy người dùng' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Không được phép, token không hợp lệ' });
        }
    }
        if (!token) {
            res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });
        }
    };
        module.exports = { protect };