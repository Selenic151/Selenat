import React from 'react';

const TransferOwnershipModal = ({ show, darkMode, room, user, selectedNewOwner, setSelectedNewOwner, onClose, onTransfer }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl border ${darkMode ? 'bg-orange-900 border-orange-800' : 'bg-orange-50 border-orange-200'} p-6 animate-scale-in`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-orange-100' : 'text-orange-900'}`}>
            Chuyển quyền chủ phòng
          </h3>
          <button 
            onClick={onClose} 
            className={`text-xl hover:opacity-70 transition-opacity ${darkMode ? 'text-orange-300' : 'text-orange-500'}`}
          >
            ✕
          </button>
        </div>
        <p className={`text-sm mb-4 ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>
          Bạn cần chọn một thành viên để chuyển quyền chủ phòng trước khi rời khỏi.
        </p>
        <div className="space-y-3 mb-6">
          {room.members?.filter(m => m._id !== user._id).map(member => (
            <div 
              key={member._id}
              onClick={() => setSelectedNewOwner(member)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                selectedNewOwner?._id === member._id 
                  ? (darkMode ? 'bg-orange-600/20 border-orange-500' : 'bg-orange-100 border-orange-200') 
                  : (darkMode ? 'hover:bg-orange-800 border-orange-600' : 'hover:bg-orange-50 border-orange-200')
              } border`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                darkMode ? 'bg-orange-600 text-orange-100' : 'bg-orange-400 text-white'
              }`}>
                {member.username.charAt(0).toUpperCase()}
              </div>
              <span className={`font-medium ${darkMode ? 'text-orange-100' : 'text-orange-900'}`}>
                {member.username}
              </span>
              {selectedNewOwner?._id === member._id && (
                <div className="ml-auto text-orange-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              darkMode ? 'bg-orange-800 text-orange-300 hover:bg-orange-700' : 'bg-orange-200 text-orange-700 hover:bg-orange-300'
            }`}
          >
            Hủy
          </button>
          <button 
            onClick={onTransfer}
            disabled={!selectedNewOwner}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedNewOwner 
                ? 'bg-orange-500 text-white hover:bg-orange-600' 
                : (darkMode ? 'bg-orange-600 text-orange-500' : 'bg-orange-300 text-orange-400')
            } disabled:cursor-not-allowed`}
          >
            Chuyển quyền & Rời phòng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferOwnershipModal;
