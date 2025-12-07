import { useState, useEffect } from 'react';
import { friendAPI, roomAPI } from '../../services/api';
import { X, Search, User, Loader2 } from 'lucide-react';

const NewMessageModal = ({ isOpen, onClose, onRoomCreated }) => {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await friendAPI.getFriends();
      setFriends(response.data || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFriend = async (friendId) => {
    try {
      setCreating(true);
      const response = await roomAPI.createDirectRoom(friendId);
      onRoomCreated(response.data);
      onClose();
    } catch (error) {
      console.error('Error creating direct room:', error);
      alert('Không thể tạo tin nhắn');
    } finally {
      setCreating(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-orange-50 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-orange-200">
        {/* Header */}
        <div className="bg-orange-400 p-6 relative">
          <h2 className="text-2xl font-bold text-white">Tin nhắn mới</h2>
          <p className="text-blue-100 text-sm mt-1">Chọn bạn bè để bắt đầu trò chuyện</p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
            disabled={creating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm bạn bè..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchTerm ? 'Không tìm thấy bạn bè' : 'Bạn chưa có bạn bè nào'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredFriends.map((friend) => (
                <button
                  key={friend._id}
                  onClick={() => handleSelectFriend(friend._id)}
                  disabled={creating}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-800/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-orange-300 flex items-center justify-center text-white font-bold text-lg">
                      {friend.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {friend.online && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-gray-900"></div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {friend.username}
                    </p>
                    <p className="text-sm text-gray-400 truncate">{friend.email}</p>
                  </div>
                  {creating && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewMessageModal;
