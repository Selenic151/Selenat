import { createContext, useContext, useEffect, useState, useRef } from 'react';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { useSocket };

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (isAuthenticated && token && !socketRef.current) {
      const newSocket = socketService.connect(token);
      socketRef.current = newSocket;
      
      // Listen to online/offline events
      newSocket.on('user:online', (data) => {
        setOnlineUsers((prev) => [...prev, data.userId]);
      });

      newSocket.on('user:offline', (data) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== data.userId));
      });

      // Initialize socket state - only happens once per connection
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocket(newSocket);

      return () => {
        socketService.disconnect();
        socketRef.current = null;
      };
    }
  }, [isAuthenticated, token]);

  const value = {
    socket,
    onlineUsers,
    joinRoom: socketService.joinRoom.bind(socketService),
    leaveRoom: socketService.leaveRoom.bind(socketService),
    sendMessage: socketService.sendMessage.bind(socketService),
    startTyping: socketService.startTyping.bind(socketService),
    stopTyping: socketService.stopTyping.bind(socketService),
    markAsRead: socketService.markAsRead.bind(socketService),
    on: socketService.on.bind(socketService),
    off: socketService.off.bind(socketService),
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};