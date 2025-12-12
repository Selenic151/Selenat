import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Common/Avatar';

const ChatHeader = ({ room, darkMode, getRoomDisplayName, onToggleTheme, onShowSidebar }) => {
  const { user } = useAuth();
  // for direct rooms, prefer the other member's avatar; for group/room use the room avatar
  const otherMember = room?.members?.find(m => String(m._id) !== String(user?._id));
  const avatarSrc = room?.type === 'direct'
    ? (otherMember?.avatar || room?.avatar)
    : (room?.avatar || otherMember?.avatar);

  return (
    <div className={`flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm transition-all duration-300 ${
      darkMode 
        ? 'border-gray-800/50 bg-gray-900/80 shadow-lg' 
        : 'border-gray-200/50 bg-white/80 shadow-lg'
    }`}>
      <div className="flex items-center space-x-4">
        <Avatar
          avatar={avatarSrc}
          username={getRoomDisplayName()}
          size="w-10 h-10"
          className="object-cover"
          bgClass={darkMode ? 'bg-gray-800' : 'bg-gray-100'}
        />
        <div>
          {room?.type === 'direct' ? (
            <>
              <h2 className={`text-lg font-bold transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>{otherMember?.username || getRoomDisplayName()}</h2>
              <p className={`text-sm transition-colors duration-300 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Đang hoạt động</p>
            </>
          ) : (
            <>
              <h2 className={`text-lg font-bold transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>{getRoomDisplayName()}</h2>
              <p className={`text-sm transition-colors duration-300 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>{room.members?.length || 0} thành viên</p>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleTheme} 
          className={`p-3 rounded-xl transition-all duration-300 btn-hover-lift ${
            darkMode 
              ? 'hover:bg-gray-800 text-gray-300 hover:text-yellow-400' 
              : 'hover:bg-gray-100 text-gray-600 hover:text-blue-600'
          }`} 
          title="Toggle dark mode"
        >
          <div className="relative">
            {darkMode ? (
              <svg className="w-5 h-5 animate-fade-in-up" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 animate-fade-in-up" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </div>
        </button>
        <button 
          onClick={onShowSidebar} 
          className={`p-3 rounded-xl transition-all duration-300 btn-hover-lift ${
            darkMode 
              ? 'hover:bg-gray-800 text-gray-300 hover:text-white' 
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          }`} 
          title="Xem thành viên"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
