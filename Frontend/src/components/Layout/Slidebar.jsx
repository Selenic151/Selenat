import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { roomAPI } from '../../services/api';
import RoomList from '../Room/RoomList';
import CreateRoom from '../Room/CreateRoom';
import Loader from '../Common/Loader';

const Sidebar = ({ selectedRoom, onSelectRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await roomAPI.getRooms();
      setRooms(response.data);
      
      // Auto select first room nếu chưa có room nào được chọn
      if (!selectedRoom && response.data.length > 0) {
        onSelectRoom(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedRoom, onSelectRoom]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Real-time update when a new room is created by other users
  const { socket, on, off, joinRoom } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const createdHandler = (newRoom) => {
      setRooms(prev => [newRoom, ...prev]);
    };
    const updatedHandler = (updatedRoom) => {
      setRooms(prev => {
        const exists = prev.find(r => r._id === updatedRoom._id);
        if (exists) return prev.map(r => r._id === updatedRoom._id ? updatedRoom : r);
        return [updatedRoom, ...prev];
      });
    };

    on('room:created', createdHandler);
    on('room:updated', updatedHandler);
    return () => { off('room:created', createdHandler); off('room:updated', updatedHandler); };
  }, [socket, on, off]);

  const handleCreateRoom = async (roomData) => {
    try {
      const response = await roomAPI.createRoom(roomData);
      setRooms([response.data, ...rooms]);
      setShowCreateRoom(false);
      onSelectRoom(response.data);
      // Join the newly created room via socket
      if (socket) {
        joinRoom(response.data._id);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Không thể tạo room: ' + error.response?.data?.message);
    }
  };

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-white border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Rooms</h2>
          <button
            onClick={() => setShowCreateRoom(true)}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition"
            title="Tạo room mới"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader size="small" text="Đang tải..." />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">
              {searchQuery ? 'Không tìm thấy room' : 'Chưa có room nào'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateRoom(true)}
                className="mt-4 text-blue-500 hover:underline text-sm"
              >
                Tạo room đầu tiên
              </button>
            )}
          </div>
        ) : (
          <RoomList
            rooms={filteredRooms}
            selectedRoom={selectedRoom}
            onSelectRoom={onSelectRoom}
          />
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <CreateRoom
          onClose={() => setShowCreateRoom(false)}
          onCreate={handleCreateRoom}
        />
      )}
    </div>
  );
};

export default Sidebar;