import React, { useState } from 'react';
import AddMemberModal from '../Room/AddMemberModal';
import RoomSettings from '../Room/RoomSetting';

const ChatSidebar = ({ 
  show, 
  onClose, 
  room, 
  user,
  darkMode,
  onLeaveRoom,
  onRemoveMember,
  memberSearch,
  memberResults,
  onSearchMembers,
  onInviteMember
}) => {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const onlineCount = room && room.members ? room.members.filter(m => m.online).length : (room?.onlineCount ?? (room?.members?.length ?? 0));
  if (!show) return null;

  return (
    <div className="fixed inset-0 flex z-50">
      <div className="absolute inset-0 backdrop-blur-md bg-black/10" onClick={onClose} />
      <div className={`ml-auto w-1/4 h-full overflow-y-auto relative z-10 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
        {/* Sidebar header - avatar centered with room name underneath */}
        <div className={`sticky top-0 px-6 pt-6 pb-4 border-b ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}`}>
          <div className="relative">
            <button onClick={onClose} className="absolute right-0 top-0 text-lg hover:opacity-70">✕</button>
            <div className="flex flex-col items-center mb-3">
              <div className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center mb-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                {room?.avatar ? (
                  <img src={room.avatar} alt={room.name} className="w-full h-full object-cover" />
                ) : (
                  <span className={`text-xl font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    {room?.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="text-center">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{room?.name || 'Phòng'}</h3>
              </div>
            </div>
          </div>
          {room.type !== 'direct' && (
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => setShowAddMemberModal(true)} 
                className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium flex items-center gap-1"
                title="Thêm thành viên"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Thêm
              </button>
              <button 
                onClick={onLeaveRoom} 
                className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-medium flex items-center gap-1"
                title="Rời khỏi nhóm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Rời
              </button>
            </div>
          )}
        </div>
        
        {/* AddMemberModal is shown when user clicks "Thêm" */}
        {showAddMemberModal && (
          <AddMemberModal
            room={room}
            onClose={() => setShowAddMemberModal(false)}
            onSuccess={() => setShowAddMemberModal(false)}
          />
        )}
        {showRoomSettings && (
          <RoomSettings
            room={room}
            onClose={() => setShowRoomSettings(false)}
            onUpdate={(updated) => {
              // Notify other parts of the app about the updated room
              window.dispatchEvent(new CustomEvent('roomUpdated', { detail: updated }));
              setShowRoomSettings(false);
            }}
          />
        )}
        
        {/* Current members */}
        <div className="p-4">
          <p className={`text-xs font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>THÀNH VIÊN ({room.members?.length || 0})</p>

          {/* Inline search (now part of members block) */}
          <div className="mb-3">
            <input
              type="text"
              value={memberSearch || ''}
              onChange={e => onSearchMembers?.(e.target.value)}
              placeholder="Tìm kiếm người dùng..."
              className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 transition ${darkMode ? 'bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-600' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-blue-500'}`}
            />
            {memberResults?.length > 0 && (
              <div className={`mt-2 max-h-48 overflow-y-auto rounded-lg shadow ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
                {memberResults.map(u => (
                  <div key={u._id} className={`flex items-center justify-between px-4 py-2 hover:opacity-95 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>{u.username?.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{u.username}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</div>
                      </div>
                    </div>
                    <button onClick={() => onInviteMember?.(u._id)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">Mời</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            {room.members?.map(m => (
              <div key={m._id} className={`flex justify-between items-center px-3 py-2 rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <span className="text-sm">{m.username}</span>
                {m._id !== user._id && (
                  <button onClick={() => onRemoveMember(m._id)} className="text-xs text-red-500 hover:text-red-600 font-medium">Xoá</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar: search, online count and settings button */}
        <div className={`absolute bottom-0 left-0 right-0 p-3 border-t ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-3 justify-between">
            <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{onlineCount} online</div>
            <button
              onClick={() => setShowRoomSettings(true)}
              className={`px-3 py-1.5 text-sm rounded-lg transition font-medium ${darkMode ? 'bg-gray-800 text-gray-100 hover:bg-gray-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              title="Cài đặt phòng"
            >
              Cài đặt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
