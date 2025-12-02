import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { roomAPI, notificationAPI } from '../services/api';
import ChatWindow from '../components/Chat/ChatWindow';
import CreateRoom from '../components/Room/CreateRoom';
import Notifications from '../components/Notification/Notifications';
import AddMemberModal from '../components/Room/AddMemberModal';
import TransferOwnershipModal from '../components/Room/TransferOwnershipModal';
import FriendsList from '../components/Friend/FriendsList';
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
  const [showAddMember, setShowAddMember] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px (w-80)
  const [isResizing, setIsResizing] = useState(false);
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
    
    const handleNewInvitation = () => {
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

  const handleLeaveRoom = async () => {
    if (!selectedRoom) return;
    
    const isCreator = selectedRoom.creator._id === user._id;
    
    // Nếu là creator và còn thành viên khác -> yêu cầu chuyển quyền
    if (isCreator && selectedRoom.members.length > 1) {
      setShowTransferModal(true);
      return;
    }
    
    if (!window.confirm(`Bạn có chắc chắn muốn rời khỏi phòng "${selectedRoom.name}"?`)) return;

    try {
      const response = await roomAPI.removeMember(selectedRoom._id, user._id);
      
      // Kiểm tra nếu phòng bị xóa
      if (response.data.deleted) {
        alert(response.data.message);
      }
      
      setSelectedRoom(null);
      await refreshRooms();
    } catch (error) {
      console.error('Error leaving room:', error);
      
      // Xử lý trường hợp requireTransfer
      if (error.response?.data?.requireTransfer) {
        setShowTransferModal(true);
      } else {
        alert('Không thể rời khỏi phòng: ' + error.response?.data?.message);
      }
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

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Sidebar */}
      <div 
        className="bg-white/95 backdrop-blur-sm border-r border-gray-200 flex flex-col shadow-xl relative"
        style={{ width: `${sidebarWidth}px`, minWidth: '250px', maxWidth: '500px' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Selenat Chat</h1>
                <p className="text-sm text-blue-100">Trò chuyện tức thì</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFriends(true)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200 relative"
                title="Bạn bè"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {friendRequestCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                    {friendRequestCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={handleOpenNotifications}
                className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200 relative"
                title="Thông báo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 0110.293-4.293L15 9v8z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={logout}
                className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
                title="Đăng xuất"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="mt-4 flex items-center space-x-3 bg-white/10 rounded-lg p-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.username}</p>
              <p className="text-xs text-blue-100">Đang hoạt động</p>
            </div>
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Phòng chat ({rooms.length})</span>
              <button
                onClick={handleCreateRoom}
                className="ml-auto inline-flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                title="Tạo phòng mới"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tạo phòng
              </button>
            </h2>

            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedRoom?._id === room._id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-[1.02]'
                      : 'bg-gray-50 hover:bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className={`font-semibold text-sm ${
                        selectedRoom?._id === room._id ? 'text-white' : 'text-gray-800'
                      }`}>
                        {room.name}
                      </h3>
                      <p className={`text-xs mt-1 ${
                        selectedRoom?._id === room._id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {room.members?.length || 0} thành viên
                      </p>
                    </div>
                    {selectedRoom?._id === room._id && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              ))}
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

        {/* Room Actions */}
        {selectedRoom && (
          <div className="border-t border-gray-200 p-4 space-y-2">
            <button
              onClick={() => setShowAddMember(true)}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Thêm thành viên
            </button>
            <button
              onClick={handleLeaveRoom}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Rời khỏi nhóm
            </button>
          </div>
        )}
      </div>

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

      {showAddMember && selectedRoom && (
        <AddMemberModal
          room={selectedRoom}
          onClose={() => setShowAddMember(false)}
          onSuccess={refreshRooms}
        />
      )}

      {showTransferModal && selectedRoom && (
        <TransferOwnershipModal
          room={selectedRoom}
          currentUserId={user._id}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setSelectedRoom(null);
            refreshRooms();
          }}
        />
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
    </div>
  );
};

export default ChatPage;