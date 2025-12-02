import { useState } from 'react';
import { userAPI, notificationAPI } from '../../services/api';

const AddMemberModal = ({ room, onClose, onSuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await userAPI.searchUsers(query);
      // Filter out users already in the room
      const filtered = res.data.filter(
        u => !room.members.some(m => m._id === u._id)
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleAddUser = (user) => {
    if (!selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId));
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) return;

    setLoading(true);
    try {
      await notificationAPI.invite({
        roomId: room._id,
        userIds: selectedUsers.map(u => u._id)
      });
      alert(`Đã gửi lời mời cho ${selectedUsers.length} người dùng`);
      setSelectedUsers([]);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Invite error:', err);
      alert('Gửi lời mời thất bại: ' + err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Thêm thành viên</h2>
            <p className="text-sm text-gray-500 mt-1">Phòng: {room.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm người dùng
            </label>
            <input
              type="text"
              placeholder="Nhập email hoặc tên..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map(user => (
                  <div
                    key={user._id}
                    onClick={() => handleAddUser(user)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center space-x-3 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{user.username}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đã chọn ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div
                    key={user._id}
                    className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full"
                  >
                    <span className="text-sm font-medium">{user.username}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user._id)}
                      className="hover:text-blue-900 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {selectedUsers.length === 0 && (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <p className="text-gray-500 text-sm">Tìm kiếm và chọn người dùng để gửi lời mời</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0 || loading}
            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Đang gửi...' : `Gửi lời mời (${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
