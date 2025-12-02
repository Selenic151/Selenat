import { useState } from 'react';
import { roomAPI } from '../../services/api';

const TransferOwnershipModal = ({ room, currentUserId, onClose, onSuccess }) => {
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(false);

  // Lọc ra các thành viên khác (không phải creator hiện tại)
  const otherMembers = room.members.filter(m => m._id !== currentUserId);

  const handleTransfer = async () => {
    if (!selectedMember) {
      alert('Vui lòng chọn thành viên');
      return;
    }

    setLoading(true);
    try {
      // Chuyển quyền creator
      await roomAPI.transferOwnership(room._id, selectedMember);
      
      // Sau đó cho phép user rời phòng
      await roomAPI.removeMember(room._id, currentUserId);
      
      alert('Đã chuyển quyền và rời phòng thành công');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error transferring ownership:', error);
      alert('Lỗi: ' + error.response?.data?.message);
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
            <h2 className="text-2xl font-bold text-gray-800">Chuyển quyền chủ phòng</h2>
            <p className="text-sm text-gray-500 mt-1">Chọn thành viên mới để làm chủ phòng</p>
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Lưu ý quan trọng</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Bạn cần chuyển quyền chủ phòng cho thành viên khác trước khi rời phòng. 
                  Sau khi chuyển, bạn sẽ tự động rời khỏi phòng.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn chủ phòng mới
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Chọn thành viên --</option>
              {otherMembers.map(member => (
                <option key={member._id} value={member._id}>
                  {member.username} ({member.email})
                </option>
              ))}
            </select>
          </div>

          {otherMembers.length === 0 && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">
                Không có thành viên khác trong phòng. Bạn cần thêm thành viên trước khi rời.
              </p>
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
            onClick={handleTransfer}
            disabled={!selectedMember || loading || otherMembers.length === 0}
            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Đang xử lý...' : 'Chuyển quyền & Rời phòng'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferOwnershipModal;
