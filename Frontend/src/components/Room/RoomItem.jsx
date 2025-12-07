import { useSocket } from '../../context/SocketContext';
import { useState, useEffect } from 'react';
import { roomAPI } from '../../services/api';

const RoomItem = ({ room, isSelected, onSelect }) => {
  const { onlineUsers, socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count khi component mount
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { data } = await roomAPI.getUnreadCount(room._id);
        setUnreadCount(data.unreadCount || 0);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();
  }, [room._id]);

  // Reset unread count khi room được select
  useEffect(() => {
    if (isSelected && unreadCount > 0) {
      setUnreadCount(0);
    }
  }, [isSelected]);

  // Listen for new messages to update unread count
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      // Chỉ tăng count nếu message thuộc room này và room chưa được select
      if (message.room === room._id && !isSelected) {
        setUnreadCount(prev => prev + 1);
      }
    };

    socket.on('message:received', handleNewMessage);

    return () => {
      socket.off('message:received', handleNewMessage);
    };
  }, [socket, room._id, isSelected]);

  // Đếm số member online
  const onlineMembersCount = room.members.filter((member) =>
    onlineUsers.includes(member._id)
  ).length;

  // Format thời gian
  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 48) {
      return 'Hôm qua';
    } else {
      return messageDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50 border-l-4 border-blue-500'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img
            src={room.avatar || 'https://via.placeholder.com/50'}
            alt={room.name}
            className="w-12 h-12 rounded-full"
          />
          {onlineMembersCount > 0 && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          )}
        </div>

        {/* Room Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 truncate">
              {room.name}
            </h3>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-xs text-gray-500">
                {formatTime(room.updatedAt)}
              </span>
              {/* Unread badge */}
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-gray-600 truncate">
              {room.description || 'Không có mô tả'}
            </p>
          </div>

          <div className="flex items-center space-x-2 mt-1">
            {/* Member count */}
            <span className="text-xs text-gray-500">
              {room.members.length} thành viên
            </span>
            
            {/* Online count */}
            {onlineMembersCount > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-green-600">
                  {onlineMembersCount} online
                </span>
              </>
            )}

            {/* Room type badge */}
            <span className="text-gray-300">•</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                room.type === 'private'
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-blue-100 text-blue-600'
              }`}
            >
              {room.type === 'private' ? 'Riêng tư' : 'Nhóm'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomItem;
