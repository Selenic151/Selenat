# 💬 Selenat Chat

<div align="center">

**Ứng dụng chat thời gian thực hiện đại với giao diện đẹp mắt**

[Tính năng](#-tính-năng) • [Demo](#-demo) • [Cài đặt](#-cài-đặt) • [Sử dụng](#-sử-dụng) • [Đóng góp](#-đóng-góp)

</div>

---

## 📋 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng](#-tính-năng)
- [Tech Stack](#-tech-stack)
- [Cài đặt](#-cài-đặt)
- [Sử dụng](#-sử-dụng)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Screenshots](#-screenshots)
- [Đóng góp](#-đóng-góp)
- [License](#-license)

## 🌟 Giới thiệu

**Selenat Chat** là một ứng dụng chat thời gian thực được xây dựng với công nghệ hiện đại, mang đến trải nghiệm trò chuyện mượt mà và giao diện người dùng đẹp mắt. Dự án này được phát triển như một nền tảng học tập và demo các công nghệ web full-stack.

### ✨ Điểm nổi bật

- 🎨 **Giao diện hiện đại** - Thiết kế gradient đẹp mắt với Tailwind CSS
- ⚡ **Real-time messaging** - Chat tức thời với Socket.io
- 🔒 **Bảo mật** - JWT Authentication & Password hashing
- 📱 **Responsive** - Tương thích mọi thiết bị
- 🌙 **UX tối ưu** - Smooth animations & transitions

## 🚀 Tính năng

### Người dùng
- ✅ Đăng ký & Đăng nhập an toàn
- ✅ Quên mật khẩu (UI sẵn sàng)
- ✅ Profile management
- ✅ Avatar & status online
- ✅ Ghi nhớ đăng nhập

### Chat & Messaging
- ✅ Tạo phòng chat nhóm
- ✅ Gửi tin nhắn real-time
- ✅ Typing indicators
- ✅ Message read status
- ✅ Emoji & rich text support
- ✅ Message history với pagination
- ✅ Delete messages

### Phòng chat
- ✅ Tạo & quản lý phòng
- ✅ Thêm/xóa thành viên
- ✅ Quyền admin phòng
- ✅ Room settings (name, avatar, description)

### Quản trị
- ✅ Role-based access control (User/Admin)
- ✅ User management
- ✅ Search users
- ✅ Statistics & monitoring

## 🛠️ Tech Stack

### Frontend
```
React 19              - UI Library
Vite                  - Build tool & Dev server
Tailwind CSS 4        - Styling framework
React Router DOM 7    - Routing
Axios                 - HTTP client
Socket.io Client      - WebSocket client
```

### Backend
```
Node.js 22.x          - Runtime environment
Express 5             - Web framework
MongoDB               - NoSQL database
Mongoose 9            - ODM for MongoDB
Socket.io 4           - WebSocket server
JWT                   - Authentication
bcryptjs              - Password hashing
```

### DevOps & Tools
```
Git                   - Version control
npm                   - Package manager
ESLint                - Code linting
Nodemon               - Development server
```

## 📦 Cài đặt

### Yêu cầu hệ thống

- Node.js >= 18.0.0
- MongoDB >= 6.0.0
- npm hoặc yarn

### Bước 1: Clone repository

```bash
git clone https://github.com/Selenic151/Selenat.git
cd Selenat
```

### Bước 2: Cài đặt Backend

```bash
cd Backend
npm install
```

Tạo file `.env` trong thư mục Backend:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/selenat
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=30d
CLIENT_URL=http://localhost:5174
NODE_ENV=development
```

### Bước 3: Cài đặt Frontend

```bash
cd ../Frontend
npm install
```

### Bước 4: Khởi động MongoDB

```bash
# Windows
mongod

# Linux/macOS
sudo systemctl start mongod
```

### Bước 5: Chạy ứng dụng

**Terminal 1 - Backend:**
```bash
cd Backend
npm run dev
# Server chạy tại http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd Frontend
npm run dev
# App chạy tại http://localhost:5174
```

## 🎯 Sử dụng

### Đăng ký tài khoản mới

1. Truy cập http://localhost:5174
2. Click "Đăng ký ngay"
3. Điền thông tin: username, email, password
4. Submit form

### Tạo phòng chat

1. Đăng nhập vào tài khoản
2. Click nút "Tạo phòng" trên sidebar
3. Nhập tên phòng, mô tả
4. Thêm thành viên
5. Tạo phòng

### Gửi tin nhắn

1. Chọn phòng chat từ danh sách
2. Nhập tin nhắn vào ô input
3. Nhấn Enter hoặc click nút gửi

## 📁 Cấu trúc dự án

```
Selenat/
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── authController.js     # Authentication logic
│   │   │   ├── messageController.js  # Message CRUD
│   │   │   └── roomController.js     # Room management
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verification
│   │   │   └── roleCheck.js         # Role-based access
│   │   ├── models/
│   │   │   ├── User.js              # User schema
│   │   │   ├── Room.js              # Room schema
│   │   │   └── Message.js           # Message schema
│   │   ├── routes/
│   │   │   ├── auth.js              # Auth routes
│   │   │   ├── room.js              # Room routes
│   │   │   ├── message.js           # Message routes
│   │   │   └── user.js              # User routes
│   │   ├── socket/
│   │   │   └── socketHandler.js     # Socket.io events
│   │   └── server.js                # Entry point
│   ├── package.json
│   └── .env
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── Chat/
│   │   │   │   ├── ChatWindow.jsx
│   │   │   │   ├── MessageInput.jsx
│   │   │   │   ├── MessageList.jsx
│   │   │   │   └── TypingIndicator.jsx
│   │   │   ├── Common/
│   │   │   │   ├── Loader.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── Layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   └── Sidebar.jsx
│   │   │   └── Room/
│   │   │       ├── RoomItem.jsx
│   │   │       └── RoomList.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Auth state management
│   │   │   └── SocketContext.jsx    # Socket state management
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── ForgotPassword.jsx
│   │   ├── services/
│   │   │   ├── api.js               # Axios instances
│   │   │   └── socket.js            # Socket.io setup
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── README.md
```

## 📸 Screenshots

### Login Page
![Login](https://via.placeholder.com/800x400?text=Modern+Login+Page)

### Chat Interface
![Chat](https://via.placeholder.com/800x400?text=Beautiful+Chat+Interface)

### Room Management
![Rooms](https://via.placeholder.com/800x400?text=Room+Management)

## 🤝 Đóng góp

Chúng tôi rất hoan nghênh mọi đóng góp! Để đóng góp:

1. Fork repository này
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

### Coding Standards

- Sử dụng ESLint config của dự án
- Viết code comments rõ ràng
- Follow React best practices
- Viết commit messages có ý nghĩa

## 🐛 Bug Reports

Nếu bạn phát hiện bug, vui lòng tạo issue với thông tin:

- Mô tả bug
- Các bước tái hiện
- Expected behavior
- Screenshots (nếu có)
- Environment (OS, Node version, etc.)

## 📝 License

Dự án này được phân phối dưới giấy phép ISC. Xem file `LICENSE` để biết thêm chi tiết.

## 👨‍💻 Tác giả

**Selenic151**

- GitHub: [@Selenic151](https://github.com/Selenic151)
- Email: your.email@example.com

## 🙏 Lời cảm ơn

- [React](https://reactjs.org/) - UI Library
- [Socket.io](https://socket.io/) - Real-time engine
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Express](https://expressjs.com/) - Web framework

---

<div align="center">

**⭐ Nếu bạn thấy dự án này hữu ích, hãy cho chúng tôi một star! ⭐**

Made with ❤️ by Selenic151

</div>
