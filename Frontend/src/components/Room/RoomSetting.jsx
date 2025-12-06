import { useState } from 'react';
import { roomAPI, userAPI, notificationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const RoomSettings = ({ room, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: room.name,
    description: room.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const isAdmin = room.admins.some((admin) => admin._id === user._id);
  const isCreator = room.creator._id === user._id;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await roomAPI.updateRoom(room._id, formData);
      // If avatar file was selected upload it
      if (avatarFile) {
        const form = new FormData();
        form.append('avatar', avatarFile);
        await roomAPI.uploadRoomAvatar(room._id, form);
      }
      const updated = (await roomAPI.getRoomById(room._id)).data;
      onUpdate(updated);
      onClose();
    } catch (error) {
      console.error('Error updating room:', error);
      alert('Không thể cập nhật room: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa room này? Tất cả tin nhắn sẽ bị xóa!')) return;

    try {
      await roomAPI.deleteRoom(room._id);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Không thể xóa room: ' + error.response?.data?.message);
    }
  };

  const handleRemoveMember = async (userId, username) => {
    const isSelf = userId === user._id;
    const isCreatorLeaving = isSelf && isCreator;
    
    const confirmMsg = isSelf 
      ? `Bạn có chắc chắn muốn rời khỏi phòng "${room.name}"?`
      : `Bạn có chắc chắn muốn xóa "${username}" khỏi phòng?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const response = await roomAPI.removeMember(room._id, userId);
      
      // Kiểm tra nếu phòng bị xóa
      if (response.data.deleted) {
        alert(response.data.message);
        onClose();
        window.location.reload();
        return;
      }
      
      if (isSelf) {
        // User rời phòng - đóng modal và reload
        onClose();
        window.location.reload();
      } else {
        // Admin xóa member - cập nhật room data
        const updated = (await roomAPI.getRoomById(room._id)).data;
        onUpdate(updated);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      
      // Nếu creator cần chuyển quyền
      if (error.response?.data?.requireTransfer && isCreatorLeaving) {
        alert('Bạn cần chuyển quyền chủ phòng cho thành viên khác trước khi rời. Vui lòng sử dụng nút "Rời khỏi nhóm" ở sidebar để thực hiện.');
      } else {
        alert('Không thể xóa thành viên: ' + error.response?.data?.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Cài Đặt Room</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {isAdmin ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tên Room</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Invite Members */}
            <div>
              <label className="block text-sm font-medium mb-2">Thêm thành viên (email hoặc phone)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm user..."
                  value={searchQuery}
                  onChange={async (e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length < 2) {
                      setSearchResults([]);
                      return;
                    }
                    try {
                      const res = await userAPI.searchUsers(e.target.value);
                      setSearchResults(res.data);
                    } catch (err) { console.error(err); }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.map(u => (
                      <div key={u._id} onClick={() => {
                        if (!selectedUsers.find(s => s._id === u._id)) setSelectedUsers([...selectedUsers, u]);
                        setSearchQuery(''); setSearchResults([]);
                      }} className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2">
                        <img src={u.avatar} alt={u.username} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="font-medium">{u.username}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedUsers.map(u => (
                    <div key={u._id} className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                      <span className="text-sm">{u.username}</span>
                      <button type="button" onClick={() => setSelectedUsers(selectedUsers.filter(s => s._id !== u._id))} className="hover:text-blue-900">×</button>
                    </div>
                  ))}
                </div>
              )}
              {selectedUsers.length > 0 && (
                <div className="mt-2">
                  <button type="button" className="px-4 py-2 bg-green-500 text-white rounded" onClick={async () => {
                    try {
                      await notificationAPI.invite({ roomId: room._id, userIds: selectedUsers.map(u => u._id) });
                      setSelectedUsers([]);
                      alert('Đã gửi lời mời');
                    } catch (err) { console.error(err); alert('Gửi lời mời thất bại'); }
                  }}>Gửi lời mời</button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mô tả</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Avatar Room</label>
              <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} />
            </div>

            {/* Danh sách thành viên */}
            <div>
              <label className="block text-sm font-medium mb-2">Thành viên ({room.members?.length || 0})</label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg">
                {room.members?.map(member => {
                  const isSelf = member._id === user._id;
                  const isRoomCreator = member._id === room.creator._id;
                  const isMemberAdmin = room.admins?.some(admin => admin._id === member._id);
                  
                  return (
                    <div key={member._id} className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-300 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {member.username}
                            {isSelf && <span className="text-xs text-blue-600 ml-2">(Bạn)</span>}
                          </p>
                          <div className="flex items-center space-x-2">
                            <p className="text-xs text-gray-500">{member.email}</p>
                            {isRoomCreator && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">Creator</span>
                            )}
                            {isMemberAdmin && !isRoomCreator && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">Admin</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Chỉ hiển thị nút xóa nếu: user muốn rời (isSelf) HOẶC admin muốn xóa người khác (không phải creator) */}
                      {(isSelf || (isAdmin && !isRoomCreator)) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member._id, member.username)}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                            isSelf 
                              ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                              : 'bg-red-500 hover:bg-red-600 text-white'
                          }`}
                          title={isSelf ? 'Rời khỏi phòng' : 'Xóa thành viên'}
                        >
                          {isSelf ? 'Rời phòng' : 'Xóa'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? 'Đang cập nhật...' : 'Cập nhật'}
              </button>

              {isCreator && (
                <button
                  type="button"
                  onClick={handleDeleteRoom}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Xóa Room
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4 text-gray-500 text-sm border-b border-gray-200">
              Chỉ admin mới có thể chỉnh sửa room
            </div>
            
            {/* Danh sách thành viên cho non-admin */}
            <div>
              <label className="block text-sm font-medium mb-2">Thành viên ({room.members?.length || 0})</label>
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg">
                {room.members?.map(member => {
                  const isSelf = member._id === user._id;
                  const isRoomCreator = member._id === room.creator._id;
                  const isMemberAdmin = room.admins?.some(admin => admin._id === member._id);
                  
                  return (
                    <div key={member._id} className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-300 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {member.username}
                            {isSelf && <span className="text-xs text-blue-600 ml-2">(Bạn)</span>}
                          </p>
                          <div className="flex items-center space-x-2">
                            <p className="text-xs text-gray-500">{member.email}</p>
                            {isRoomCreator && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">Creator</span>
                            )}
                            {isMemberAdmin && !isRoomCreator && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">Admin</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {isSelf && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member._id, member.username)}
                          className="px-3 py-1 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                          title="Rời khỏi phòng"
                        >
                          Rời phòng
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomSettings;