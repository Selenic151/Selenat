import { useState } from 'react';
import { roomAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const RoomSettings = ({ room, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: room.name,
    description: room.description || '',
  });
  const [loading, setLoading] = useState(false);

  const isAdmin = room.admins.some((admin) => admin._id === user._id);
  const isCreator = room.creator._id === user._id;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await roomAPI.updateRoom(room._id, formData);
      onUpdate(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating room:', error);
      alert('Không thể cập nhật room: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa room này?')) return;

    try {
      await roomAPI.deleteRoom(room._id);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Không thể xóa room: ' + error.response?.data?.message);
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

            <div className="pt-4 space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >
                {loading ? 'Đang cập nhật...' : 'Cập nhật'}
              </button>

              {(isCreator || user.role === 'admin') && (
                <button
                  type="button"
                  onClick={handleDeleteRoom}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Xóa Room
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chỉ admin mới có thể chỉnh sửa room
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomSettings;