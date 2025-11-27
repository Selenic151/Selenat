const roleCheck = (... role) => {
    return (req, res, next) => {
        if (!req.User) {
            return res.status(401).json({ message: 'Không được phép, không tìm thấy người dùng| chưa xác thực' });
        }
        if (!role.includes(req.user.role)) {
            return res.status(403).json({ message: 'Truy cập bị từ chối, không đủ quyền' });
        }
        next();
    };
};
module.exports = { roleCheck };