import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { roomAPI } from '../services/api';
import ChatWindow from '../components/Chat/ChatWindow';

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
  const { user, logout } = useAuth();

  useEffect(() => {
    loadRooms().then((data) => {
      setRooms(data);
      if (data.length > 0) {
        setSelectedRoom(data[0]);
      }
    });
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white/95 backdrop-blur-sm border-r border-gray-200 flex flex-col shadow-xl">
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
              Phòng chat ({rooms.length})
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
      </div>

      {/* Chat Window */}
      <div className="flex-1">
        <ChatWindow room={selectedRoom} />
      </div>
    </div>
  );
};

export default ChatPage;