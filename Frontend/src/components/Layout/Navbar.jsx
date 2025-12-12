import React, { useState } from 'react';
import Avatar from '../Common/Avatar';

const Navbar = ({
  user,
  logout,
  unreadCount,
  friendRequestCount,
  onShowFriends,
  onShowNotifications,
  onShowNewMessage,
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleConfirmLogout = () => {
    try {
      logout();
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  return (
    <div
      className="p-6 border-b border-orange-200/50 dark:border-orange-700/50 relative overflow-hidden"
      style={{ backgroundColor: 'var(--primary)', color: 'var(--accent-text)' }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-orange-300/20 animate-gradient-shift"></div>
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm avatar-hover">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold animate-fade-in-up">Selenat Chat</h1>
            <p className="text-sm animate-fade-in-up delay-200">Trò chuyện tức thì</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onShowFriends}
            className="p-3 rounded-xl transition-all duration-300 relative"
            title="Bạn bè"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {friendRequestCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-bounce notification-badge">
                {friendRequestCount}
              </span>
            )}
          </button>
          <button
            onClick={onShowNotifications}
            className="p-3 rounded-xl transition-all duration-300 relative"
            title="Thông báo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 0110.293-4.293L15 9v8z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce notification-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-3 rounded-xl transition-all duration-300"
            title="Đăng xuất"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
      {/* User Info */}
      <div className="mt-4 flex items-center space-x-3 bg-orange-200/30 rounded-xl p-4 animate-slide-in-left delay-400">
        <div className="w-10 h-10">
          <Avatar
            avatar={user?.avatar}
            username={user?.username}
            size="w-10 h-10"
            className="object-cover"
            bgClass={"bg-white/20"}
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{user?.username}</p>
          <p className="text-xs text-blue-100">Đang hoạt động</p>
        </div>
        <button
          onClick={onShowNewMessage}
          className="p-3 bg-orange-300/30 rounded-xl transition-all duration-300"
          title="Tin nhắn mới"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800">Xác nhận đăng xuất</h3>
              <p className="text-sm text-gray-500 mt-2">Bạn có chắc chắn muốn đăng xuất không?</p>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
