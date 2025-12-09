import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { roomAPI, notificationAPI } from '../services/api';
import ChatWindow from '../components/Chat/ChatWindow';
import CreateRoom from '../components/Room/CreateRoom';
import Notifications from '../components/Notification/Notifications';
import FriendsList from '../components/Friend/FriendsList';
import NewMessageModal from '../components/Chat/NewMessageModal';
import Navbar from '../components/Layout/Navbar';
import AppSettings from '../components/Common/AppSettings';
import { useSocket } from '../context/SocketContext';

const loadRooms = async () => {
  try {
    const response = await roomAPI.getRooms();
    return response.data;
  } catch (error) {
    console.error('Error loading rooms:', error);
    return [];
  }
};

const ChatPage = () => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(() => (typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.25) : 320)); // Default 25% of viewport width (in px)
  const [isResizing, setIsResizing] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const { user, logout } = useAuth();
  const { socket, on, off } = useSocket();

  useEffect(() => {
    loadRooms().then((data) => {
      setRooms(data);
      if (data.length > 0) {
        setSelectedRoom(data[0]);
      }
    });
    loadUnreadCount();
  }, []);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const loadUnreadCount = async () => {
    try {
      const res = await notificationAPI.getNotifications();
      const unread = res.data.filter(n => n.status === 'pending').length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  // Lắng nghe socket event cho thông báo mới
  useEffect(() => {
    if (!socket) return;
    
    const handleNewInvitation = (notification) => {
      console.log('📩 ChatPage: Received invitation notification:', notification);
      setUnreadCount(prev => prev + 1);
    };
    
    on('invitation:received', handleNewInvitation);
    return () => off('invitation:received', handleNewInvitation);
  }, [socket, on, off]);

  useEffect(() => {
    const handleRoomDeleted = (e) => {
      const { roomId } = e.detail || {};
      if (roomId) {
        // refresh list and clear selection if deleted
        refreshRooms();
        if (selectedRoom && selectedRoom._id === roomId) {
          setSelectedRoom(null);
        }
      }
    };

    const handleRoomAccepted = () => {
      // Refresh rooms when user accepts invitation
      refreshRooms();
    };

    window.addEventListener('roomDeleted', handleRoomDeleted);
    window.addEventListener('roomAccepted', handleRoomAccepted);
    
    return () => {
      window.removeEventListener('roomDeleted', handleRoomDeleted);
      window.removeEventListener('roomAccepted', handleRoomAccepted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom]);

  const refreshRooms = async () => {
    const data = await loadRooms();
    setRooms(data);
    if (data.length > 0 && !selectedRoom) {
      setSelectedRoom(data[0]);
    }
  };

  const handleSelectRoom = async (room) => {
    setSelectedRoom(room);
    
    // Mark room as read
    try {
      await roomAPI.markAsRead(room._id);
    } catch (error) {
      console.error('Failed to mark room as read:', error);
    }
  };

  const handleCreateRoom = () => {
    setShowCreateRoom(true);
  };

  const handleRoomCreated = async (roomData) => {
    try {
      // Create room via API
      const res = await roomAPI.createRoom(roomData);
      setShowCreateRoom(false);

      // Refresh rooms and select newly created room if available
      await refreshRooms();
      if (res && res.data) {
        setSelectedRoom(res.data);
      }
    } catch (error) {
      console.error('Create room failed', error);
      // still close modal (CreateRoom shows loading) or keep open for retry
      setShowCreateRoom(false);
    }
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
    // Reload unread count khi đóng modal
    loadUnreadCount();
  };

  const handleStartResize = () => {
    console.log('handleStartResize called');
    setIsResizing(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-60 -right-60 w-160 h-160 bg-orange-200/20 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute -bottom-60 -left-60 w-160 h-160 bg-orange-300/20 rounded-full blur-[120px] animate-float delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-120 h-120 bg-orange-100/10 rounded-full blur-[100px] animate-pulse-slow delay-500"></div>
      </div>

      {/* Sidebar */}
      <div 
        className="bg-orange-100/80 dark:bg-orange-900/80 border-r border-orange-200/50 dark:border-orange-700/50 flex flex-col shadow-2xl relative z-10"
        style={{ width: `${sidebarWidth}px`, minWidth: '250px', maxWidth: '500px' }}
      >
        {/* Sidebar Header (Navbar) */}
        <Navbar
          user={user}
          logout={logout}
          unreadCount={unreadCount}
          friendRequestCount={friendRequestCount}
          onShowFriends={() => setShowFriends(true)}
          onShowNotifications={handleOpenNotifications}
          onShowNewMessage={() => setShowNewMessage(true)}
          onShowAppSettings={() => setShowAppSettings(true)}
        />

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-orange-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Phòng chat ({rooms.length})</span>
              <button
                onClick={handleCreateRoom}
                className="ml-auto inline-flex items-center px-3 py-1.5 bg-orange-500 text-white rounded-md text-sm"
                title="Tạo phòng mới"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tạo phòng
              </button>
            </h2>

            <div className="space-y-2">
              {rooms.map((room, index) => {
                // Hiển thị tên người kia cho direct room
                const getRoomDisplayName = () => {
                  if (room.type === 'direct') {
                    const otherMember = room.members?.find(m => m._id !== user._id);
                    return otherMember?.username || 'Unknown User';
                  }
                  return room.name;
                };

                return (
                  <div
                    key={room._id}
                    onClick={() => handleSelectRoom(room)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-300 animate-fade-in-up ${
                      selectedRoom?._id === room._id
                        ? 'bg-linear-to-r from-orange-500 to-orange-700 text-white shadow-xl transform scale-[1.02] ring-2 ring-orange-300/50'
                        : 'bg-orange-50 dark:bg-orange-900/60 border border-orange-200/50 dark:border-orange-700/50 hover:scale-[1.03] hover:bg-orange-100 hover:shadow-orange-200'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className={`font-semibold text-sm transition-colors duration-300 ${
                          selectedRoom?._id === room._id ? 'text-white' : 'text-orange-900 dark:text-orange-100'
                        }`}>
                          {getRoomDisplayName()}
                        </h3>
                        <p className={`text-xs mt-1 transition-colors duration-300 ${
                          selectedRoom?._id === room._id ? 'text-orange-100' : 'text-orange-700 dark:text-orange-300'
                        }`}>
                          {room.members?.length || 0} thành viên
                        </p>
                      </div>
                      {selectedRoom?._id === room._id && (
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {rooms.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-500 text-sm">Chưa có phòng chat nào</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer (App Settings) */}
        <div className="mt-2 p-3 border-t border-orange-200/50 dark:border-orange-700/50 bg-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowAppSettings(true)}
              className="inline-flex items-center px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm shadow"
              title="Cài đặt ứng dụng"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2v4c0 1.105 1.343 2 3 2s3-.895 3-2v-4c0-1.105-1.343-2-3-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09c0-.7-.39-1.34-1-1.71a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09c.7 0 1.34-.39 1.71-1a1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 016.45 3.7l.06.06a1.65 1.65 0 001.82.33H8a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09c0 .7.39 1.34 1 1.71a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V8c.7 0 1.34.39 1.71 1a1.65 1.65 0 00-.33 1.82z" />
              </svg>
              Cài đặt
            </button>

            <div className="text-xs text-gray-600 dark:text-gray-300">
              <span>Signed in as <strong>{user?.username}</strong></span>
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-10 group"
          onMouseDown={handleStartResize}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -right-0.5 w-1.5 h-16 bg-gray-300 rounded-full group-hover:bg-blue-500 group-hover:w-2 transition-all shadow-sm"></div>
        </div>
      </div>

      {/* App Settings Modal */}
      {showAppSettings && (
        <AppSettings onClose={() => setShowAppSettings(false)} />
      )}

      {/* Chat Window */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatWindow room={selectedRoom} />
      </div>

      {/* Modals */}
      {showCreateRoom && (
        <CreateRoom
          onClose={() => setShowCreateRoom(false)}
          onCreate={handleRoomCreated}
        />
      )}

      {showNotifications && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-white/20">
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 0110.293-4.293L15 9v8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Thông báo</h2>
                  <p className="text-sm text-gray-500">Lời mời tham gia phòng chat</p>
                </div>
              </div>
              <button
                onClick={handleCloseNotifications}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[70vh]">
              <Notifications onAccept={refreshRooms} />
            </div>
          </div>
        </div>
      )}

      {showFriends && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Bạn bè</h2>
              <button
                onClick={() => setShowFriends(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <FriendsList onRequestCountChange={setFriendRequestCount} />
            </div>
          </div>
        </div>
      )}

      {/* New Message Modal (open when user clicks the + button in Navbar) */}
      <NewMessageModal
        isOpen={showNewMessage}
        onClose={() => setShowNewMessage(false)}
        onRoomCreated={(room) => {
          // If room already exists, select it; otherwise prepend and select
          const existingRoom = rooms.find(r => r._id === room._id);
          if (existingRoom) {
            setSelectedRoom(existingRoom);
          } else {
            setRooms([room, ...rooms]);
            setSelectedRoom(room);
          }
          setShowNewMessage(false);
        }}
      />
    </div>
  );
};

export default ChatPage;