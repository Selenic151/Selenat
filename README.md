# Selenat Chat

Ứng dụng chat thời gian thực với React, Node.js, MongoDB và Socket.io.

## Giới thiệu

Selenat Chat là ứng dụng nhắn tin real-time hỗ trợ chat 1-1, chat nhóm, hệ thống bạn bè và thông báo. Được xây dựng với các công nghệ web hiện đại, tập trung vào hiệu suất và trải nghiệm người dùng.

## Tính năng

**Xác thực & Người dùng**
- Đăng ký, đăng nhập với JWT authentication
- Quản lý profile, avatar
- Hiển thị trạng thái online/offline
- Tìm kiếm và quản lý bạn bè

**Nhắn tin**
- Chat 1-1 (Direct Messages)
- Chat nhóm (Group Chats)
- Gửi/nhận tin nhắn real-time
- Hiển thị typing indicator
- System messages (user join/leave)
- Virtual scrolling cho hiệu suất tốt

**Quản lý Phòng**
- Tạo phòng chat (group, private, direct)
- Thêm/xóa thành viên
- Phân quyền admin
- Upload avatar phòng
- Chuyển quyền sở hữu

**Thông báo**
- Lời mời tham gia phòng
- Lời mời kết bạn
- Badge hiển thị số lượng chưa đọc
- Cập nhật real-time

## Tech Stack

**Frontend**
- React 19
- Vite
- Tailwind CSS 4
- Socket.io Client
- Axios
- React Virtuoso

**Backend**
- Node.js 22
- Express 5
- MongoDB
- Mongoose 9
- Socket.io 4
- JWT + bcryptjs

## Cài đặt

### Yêu cầu

- Node.js >= 18.0
- MongoDB >= 6.0
- npm hoặc yarn

### Backend

```bash
cd Backend
npm install

# Tạo file .env
PORT=5000
MONGO_URI=mongodb://localhost:27017/selenat
JWT_SECRET=your_secret_key_here
```

### Frontend

```bash
cd Frontend
npm install
```

### Chạy ứng dụng

**Backend:**
```bash
cd Backend
npm run dev
# Server: http://localhost:5000
```

**Frontend:**
```bash
cd Frontend
npm run dev
# App: http://localhost:5173
```

## Cấu trúc Project

```
Selenat/
├── Backend/
│   ├── src/
│   │   ├── config/          # Cấu hình database
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/      # Auth, role check
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API endpoints
│   │   ├── socket/          # Socket.io handlers
│   │   └── server.js        # Entry point
│   └── package.json
│
└── Frontend/
    ├── src/
    │   ├── api/             # API clients
    │   ├── components/      # React components
    │   ├── context/         # Context providers
    │   ├── pages/           # Page components
    │   ├── services/        # Service layer
    │   └── main.jsx         # Entry point
    └── package.json
```

## Tối ưu hóa

**Database Indexing**
```javascript
// Room model
roomSchema.index({ type: 1, members: 1 });
roomSchema.index({ updatedAt: -1 });

// Friendship model
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
friendshipSchema.index({ requester: 1, status: 1 });
```

**Performance**
- Lean queries để giảm memory
- Selective populate chỉ fields cần thiết
- Virtual scrolling cho message list
- Optimistic UI updates
- Socket.io room-based broadcasting

**Security**
- JWT với HTTP-only cookies
- Password hashing với bcrypt (10 rounds)
- Input validation
- XSS protection
- CORS configuration

## Scripts hữu ích

**Cleanup duplicate rooms:**
```bash
cd Backend
node cleanup-duplicate-rooms.js
```

**Check errors:**
```bash
npm run lint
```

## Troubleshooting

**Port đã sử dụng:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

**MongoDB không kết nối:**
- Kiểm tra MongoDB đang chạy: `mongod --version`
- Kiểm tra connection string trong `.env`
- Kiểm tra firewall/antivirus

**Socket.io không hoạt động:**
- Kiểm tra CORS configuration
- Kiểm tra backend và frontend cùng chạy
- Check browser console cho errors

## Đóng góp

1. Fork repository
2. Tạo branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## License

MIT

## Tác giả

**Selenic151** - Trương Xuân Nguyên
- GitHub: [@Selenic151](https://github.com/Selenic151)

---

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub.
