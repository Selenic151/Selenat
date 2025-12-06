import { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';

const TypingIndicator = ({ roomId }) => {
  const [typingUsers, setTypingUsers] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleUserTyping = (data) => {
      console.log('👤 User typing:', data);
      // Only show typing for this room
      if (data.roomId !== roomId) return;
      
      setTypingUsers((prev) => {
        if (!prev.find((u) => u.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });
    };

    const handleUserStopTyping = (data) => {
      console.log('👤 User stopped typing:', data);
      // Only remove typing for this room
      if (data.roomId !== roomId) return;
      
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    socket.on('user:typing', handleUserTyping);
    socket.on('user:stopped_typing', handleUserStopTyping);

    return () => {
      socket.off('user:typing', handleUserTyping);
      socket.off('user:stopped_typing', handleUserStopTyping);
    };
  }, [socket, roomId]);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} đang gõ`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} và ${typingUsers[1].username} đang gõ`;
    } else {
      return `${typingUsers.length} người đang gõ`;
    }
  };

  return (
    <div className="px-6 py-3 bg-orange-50 border-t border-gray-200">
      <div className="flex items-center space-x-3">
        <div className="flex -space-x-2">
          {typingUsers.slice(0, 3).map((user, index) => (
            <div
              key={user.userId}
              className="w-8 h-8 bg-orange-300 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
              style={{ zIndex: 3 - index }}
            >
              <span className="text-white font-semibold text-xs">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          ))}
          {typingUsers.length > 3 && (
            <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <span className="text-white font-semibold text-xs">+</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <p className="text-sm text-gray-600 font-medium">{getTypingText()}</p>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;