import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { messageAPI, roomAPI, userAPI, notificationAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/useTheme';
import { useMessageCache } from '../../context/useMessageCache';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

const ChatWindow = ({ room }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket, joinRoom, leaveRoom } = useSocket();
  const { user } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const { getCachedMessages, setCachedMessages, updateCache } = useMessageCache();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showTransferOwnershipModal, setShowTransferOwnershipModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState(null);
  const isAtBottomRef = useRef(true);
  const headerRef = useRef(null);
  const inputRef = useRef(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(0);
  // dynamic average message height (measured at runtime and smoothed)
  const [avgMessageHeight, setAvgMessageHeight] = useState(() => {
    const stored = localStorage.getItem('chat_avgMessageHeight');
    return stored ? parseFloat(stored) : 72;
  });
  // sensible page size bounds to avoid too small/large requests
  const MIN_PAGE_SIZE = 5;
  const MAX_PAGE_SIZE = 60;
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const virtuosoRef = useRef(null);

  const loadOlderMessages = async () => {
    if (!room || loadingOlder || !hasMore) return;
    try {
      setLoadingOlder(true);
      const oldest = messages && messages.length > 0 ? messages[0].createdAt : undefined;
      if (!oldest) {
        setLoadingOlder(false);
        setHasMore(false);
        return;
      }
      const limit = pageSize || Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, Math.ceil((window.innerHeight - (headerRef.current?.offsetHeight || 80) - (inputRef.current?.offsetHeight || 72) - 40) / (avgMessageHeight || 72))));
      const res = await messageAPI.getMessages(room._id, { after: oldest, limit });
      const older = res.data || [];
      if (older.length === 0) {
        setHasMore(false);
        return;
      }
      setMessages(prev => [...older, ...prev]);
      // Update cache with prepended messages
      updateCache(room._id, (cachedMsgs) => [...older, ...cachedMsgs]);
      if (older.length < limit) setHasMore(false);
    } catch (err) {
      console.error('Load older messages failed', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // recompute pageSize on resize
  useEffect(() => {
    const compute = () => {
      const headerH = headerRef.current?.offsetHeight || 80;
      const inputH = inputRef.current?.offsetHeight || 72;
      const available = window.innerHeight - headerH - inputH - 40;
      const limitRaw = Math.ceil(available / (avgMessageHeight || 72));
      const limit = Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, limitRaw));
      setPageSize(limit);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [avgMessageHeight]);

  // receive measured average from MessageList and smooth it
  const handleMeasuredAvg = (measured) => {
    if (!measured || Number.isNaN(measured)) return;
    // exponential moving average with alpha = 0.2
    setAvgMessageHeight(prev => {
      const newAvg = Math.max(20, prev * 0.8 + measured * 0.2);
      localStorage.setItem('chat_avgMessageHeight', newAvg.toString());
      return newAvg;
    });
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth',
        align: 'end'
      });
      setNewMessagesCount(0);
    }
  };

  useEffect(() => {
    if (!room) return;
    
    // Load messages only when room changes
    const loadInitialMessages = async () => {
      try {
        setLoading(true);
        setNewMessagesCount(0);
        
        // Try to get from cache first
        const cached = getCachedMessages(room._id);
        if (cached) {
          setMessages(cached.messages);
          setHasMore(cached.hasMore);
          setLoading(false);
          return;
        }
        
        // Load from API
        const headerH = headerRef.current?.offsetHeight || 80;
        const inputH = inputRef.current?.offsetHeight || 72;
        const available = window.innerHeight - headerH - inputH - 40;
        const limitRaw = Math.ceil(available / (avgMessageHeight || 72));
        const limit = Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, limitRaw));
        setPageSize(limit);
        const response = await messageAPI.getMessages(room._id, { limit });
        setMessages(response.data);
        const hasMoreData = response.data.length === limit;
        setHasMore(hasMoreData);
        
        // Cache the results
        setCachedMessages(room._id, response.data, hasMoreData);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialMessages();
    joinRoom(room._id);

    const handleIncoming = message => {
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        const next = [...prev, message];
        // Update cache
        updateCache(room._id, (cachedMsgs) => [...cachedMsgs, message]);
        // Increment new message count if not at bottom
        if (!isAtBottomRef.current) {
          setNewMessagesCount(n => n + 1);
        }
        return next;
      });
    };

    const onRoomDeleted = ({ roomId }) => {
      if (roomId === room._id) {
        setMessages([]);
        // Notify ChatPage to refresh room list
        window.dispatchEvent(new CustomEvent('roomDeleted', { detail: { roomId } }));
      }
    };

    const handleMemberJoined = ({ roomId, username }) => {
      if (roomId === room._id) {
        // Add system message
        const systemMsg = {
          _id: `system-join-${Date.now()}`,
          type: 'system',
          content: `${username} đã tham gia nhóm`,
          createdAt: new Date().toISOString(),
          isSystem: true
        };
        setMessages(prev => [...prev, systemMsg]);
      }
    };

    const handleMemberLeft = ({ roomId, username }) => {
      if (roomId === room._id) {
        // Add system message
        const systemMsg = {
          _id: `system-leave-${Date.now()}`,
          type: 'system',
          content: `${username} đã rời khỏi nhóm`,
          createdAt: new Date().toISOString(),
          isSystem: true
        };
        setMessages(prev => [...prev, systemMsg]);
      }
    };

    socket?.on('message:received', handleIncoming);
    socket?.on('room:deleted', onRoomDeleted);
    socket?.on('member:joined', handleMemberJoined);
    socket?.on('member:left', handleMemberLeft);

    return () => {
      leaveRoom(room._id);
      socket?.off('message:received', handleIncoming);
      socket?.off('room:deleted', onRoomDeleted);
      socket?.off('member:joined', handleMemberJoined);
      socket?.off('member:left', handleMemberLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, socket, joinRoom, leaveRoom]);

  const sendMessageOptimistic = async ({ roomId, content, type = 'text' }) => {
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      room: roomId,
      sender: { _id: user._id, username: user.username, avatar: user.avatar },
      content,
      type,
      createdAt: new Date().toISOString(),
      pending: true
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const saved = await socketService.sendMessage({ roomId, content, type });
      const serverMsg = saved?.message || saved;
      // If serverMsg is null/invalid, avoid replacing temp with null (which breaks rendering)
      if (serverMsg && (serverMsg._id || serverMsg.id)) {
        setMessages(prev => prev.map(m => (m._id === tempId ? serverMsg : m)));
      } else {
        // If server didn't return a saved message, don't replace the temp message with null.
        // It's possible the server already broadcasted the saved message via socket; remove temp if a non-pending duplicate exists.
        setMessages(prev => {
          const duplicate = prev.find(m => !m.pending && m.content === content && String(m.sender?._id || m.sender) === String(user._id));
          if (duplicate) return prev.filter(m => m._id !== tempId);
          // otherwise keep the temp message (still pending)
          return prev;
        });
      }
    } catch (err) {
      console.error('Message send failed', err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
      alert('Gửi tin nhắn thất bại');
    }
  };

  const handleUpload = async (formData) => {
    try {
      const response = await messageAPI.uploadFiles(formData);
      const newMessage = response.data;
      
      // Add to messages (don't optimistic - files are slow)
      setMessages(prev => [...prev, newMessage]);
      updateCache(room._id, (cachedMsgs) => [...cachedMsgs, newMessage]);
      
      // Scroll to bottom after upload
      scrollToBottom();
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  const searchMembers = async q => {
    setMemberSearch(q);
    if (!q || q.trim().length < 2) return setMemberResults([]);
    try {
      const res = await userAPI.searchUsers(q.trim());
      const filtered = res.data.filter(u => !room.members?.some(m => String(m._id || m) === u._id));
      setMemberResults(filtered);
    } catch (err) {
      console.error('Search members failed', err);
      setMemberResults([]);
    }
  };

  const inviteMember = async userId => {
    try {
      const res = await notificationAPI.invite({ roomId: room._id, userIds: [userId] });
      if (res?.data) {
        setMemberResults([]);
        setMemberSearch('');
        alert('Đã gửi lời mời thành công!');
      }
    } catch (err) {
      console.error('Invite failed', err);
      alert('Gửi lời mời thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  const removeMember = async memberId => {
    try {
      const res = await roomAPI.removeMember(room._id, memberId);
      if (res?.data) room.members = res.data.members;
    } catch (err) {
      console.error('Remove member failed', err);
      alert('Xoá thành viên thất bại');
    }
  };

  const handleLeaveRoom = async () => {
    if (room.creator === user._id) {
      setShowTransferOwnershipModal(true);
      return;
    }
    if (!confirm(`Bạn có chắc muốn rời khỏi phòng "${room.name}"?`)) return;
    
    try {
      await roomAPI.removeMember(room._id, user._id);
      // Reload page or navigate away
      window.location.reload();
    } catch (err) {
      console.error('Leave room failed', err);
      alert('Không thể rời phòng: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) {
      alert('Vui lòng chọn thành viên mới làm chủ phòng');
      return;
    }
    try {
      await roomAPI.transferOwnership(room._id, selectedNewOwner._id);
      // Sau khi transfer, leave
      await roomAPI.removeMember(room._id, user._id);
      window.location.reload();
    } catch (err) {
      console.error('Transfer ownership failed', err);
      alert('Chuyển quyền thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!room) return (
    <div className={`flex-1 flex items-center justify-center ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-white'}`}>
      <p className="text-gray-500">Chọn một phòng chat để bắt đầu</p>
    </div>
  );

  // Hiển thị tên người kia cho direct room
  const getRoomDisplayName = () => {
    if (room.type === 'direct') {
      const otherMember = room.members?.find(m => m._id !== user._id);
      return otherMember?.username || 'Unknown User';
    }
    return room.name;
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-white'}`}>
      {/* Header - Modern, clean with enhanced styling */}
      <div ref={headerRef} className={`flex items-center justify-between px-6 py-4 border-b backdrop-blur-sm transition-all duration-300 ${
        darkMode 
          ? 'border-gray-800/50 bg-gray-900/80 shadow-lg' 
          : 'border-gray-200/50 bg-white/80 shadow-lg'
      }`}>
        <div className="flex items-center space-x-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center avatar-hover ${
            darkMode ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <svg className={`w-5 h-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h2 className={`text-lg font-bold transition-colors duration-300 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>{getRoomDisplayName()}</h2>
            <p className={`text-sm transition-colors duration-300 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>{room.members?.length || 0} thành viên</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Show action buttons for group/private rooms only */}
          {room.type !== 'direct' && (
            <>
              <button 
                onClick={() => setShowAddMemberModal(true)} 
                className="px-4 py-2 text-sm rounded-xl transition-all duration-300 btn-hover-lift flex items-center gap-2 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-500/25 group"
                title="Thêm thành viên"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Thêm</span>
              </button>
              <button 
                onClick={handleLeaveRoom} 
                className="px-4 py-2 text-sm rounded-xl transition-all duration-300 btn-hover-lift flex items-center gap-2 bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium shadow-lg shadow-red-500/25 group"
                title="Rời khỏi nhóm"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Rời</span>
              </button>
            </>
          )}
          
          <button 
            onClick={toggleTheme} 
            className={`p-3 rounded-xl transition-all duration-300 btn-hover-lift ${
              darkMode 
                ? 'hover:bg-gray-800 text-gray-300 hover:text-yellow-400' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-blue-600'
            }`} 
            title="Toggle dark mode"
          >
            <div className="relative">
              {darkMode ? (
                <svg className="w-5 h-5 animate-fade-in-up" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 animate-fade-in-up" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </div>
          </button>
          
          <button 
            onClick={() => setShowSidebar(true)} 
            className={`p-3 rounded-xl transition-all duration-300 btn-hover-lift ${
              darkMode 
                ? 'hover:bg-gray-800 text-gray-300 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`} 
            title="Xem thành viên"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <MessageList 
          messages={messages} 
          loading={loading} 
          loadingOlder={loadingOlder} 
          hasMore={hasMore} 
          darkMode={darkMode}
          room={room}
          onLoadOlder={loadOlderMessages}
          onMeasureAvg={handleMeasuredAvg}
          isAtBottomRef={isAtBottomRef}
          virtuosoRef={virtuosoRef}
          onBottomChange={(isBottom) => {
            isAtBottomRef.current = isBottom;
            if (isBottom) setNewMessagesCount(0);
          }}
        />
        {newMessagesCount > 0 && (
          <button 
            onClick={scrollToBottom} 
            className={`absolute right-6 bottom-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg transition-all hover:scale-105 ${
              darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white font-medium text-sm`}
          >
            <span>{newMessagesCount} tin mới</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>

      {/* Typing indicator */}
      <TypingIndicator roomId={room._id} />

      {/* Input */}
      <div ref={inputRef} className={`px-4 py-3.5 border-t ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <MessageInput 
          roomId={room._id} 
          onSend={sendMessageOptimistic} 
          onUpload={handleUpload}
          darkMode={darkMode} 
        />
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 flex z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSidebar(false)} />
          <div className={`ml-auto w-80 h-full overflow-y-auto relative z-10 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
            {/* Sidebar header */}
            <div className={`sticky top-0 flex justify-between items-center px-6 py-4 border-b ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}`}>
              <h3 className="font-semibold">Thành viên</h3>
              <button onClick={() => setShowSidebar(false)} className="text-lg">✕</button>
            </div>
            
            {/* Search */}
            <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <input 
                type="text" 
                value={memberSearch} 
                onChange={e => searchMembers(e.target.value)} 
                placeholder="Tìm kiếm..." 
                className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none transition ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-500'}`}
              />
            </div>
            
            {/* Member results */}
            {memberResults.length > 0 && (
              <div className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <p className={`text-xs px-4 pt-3 font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>KẾT QUẢ TÌM KIẾM</p>
                {memberResults.map(u => (
                  <div key={u._id} className={`flex justify-between items-center px-4 py-2.5 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                    <span className="text-sm">{u.username}</span>
                    <button onClick={() => inviteMember(u._id)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">Mời</button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Current members */}
            <div className="p-4">
              <p className={`text-xs font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>THÀNH VIÊN ({room.members?.length || 0})</p>
              <div className="space-y-1">
                {room.members?.map(m => (
                  <div key={m._id} className={`flex justify-between items-center px-3 py-2 rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                    <span className="text-sm">{m.username}</span>
                    <button onClick={() => removeMember(m._id)} className="text-xs text-red-500 hover:text-red-600 font-medium">Xoá</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddMemberModal(false)} />
          <div className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            {/* Modal header */}
            <div className={`flex justify-between items-center px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <h3 className="font-semibold text-lg">Thêm thành viên</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-xl hover:opacity-70">✕</button>
            </div>
            
            {/* Search */}
            <div className="p-6">
              <input 
                type="text" 
                value={memberSearch} 
                onChange={e => searchMembers(e.target.value)} 
                placeholder="Tìm kiếm người dùng..." 
                className={`w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500'}`}
                autoFocus
              />
              
              {/* Search results */}
              {memberResults.length > 0 && (
                <div className={`mt-4 max-h-60 overflow-y-auto rounded-lg border ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  {memberResults.map(u => (
                    <div key={u._id} className={`flex justify-between items-center px-4 py-3 border-b last:border-b-0 ${darkMode ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.username}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          inviteMember(u._id);
                          setShowAddMemberModal(false);
                        }} 
                        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
                      >
                        Thêm
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {memberSearch.trim().length >= 2 && memberResults.length === 0 && (
                <p className={`mt-4 text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Không tìm thấy người dùng
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferOwnershipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTransferOwnershipModal(false)} />
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 animate-scale-in`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Chuyển quyền chủ phòng
              </h3>
              <button 
                onClick={() => setShowTransferOwnershipModal(false)} 
                className={`text-xl hover:opacity-70 transition-opacity ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                ✕
              </button>
            </div>
            
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Bạn cần chọn một thành viên để chuyển quyền chủ phòng trước khi rời khỏi.
            </p>
            
            <div className="space-y-3 mb-6">
              {room.members?.filter(m => m._id !== user._id).map(member => (
                <div 
                  key={member._id}
                  onClick={() => setSelectedNewOwner(member)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    selectedNewOwner?._id === member._id 
                      ? (darkMode ? 'bg-blue-600/20 border-blue-500' : 'bg-blue-50 border-blue-200') 
                      : (darkMode ? 'hover:bg-gray-700 border-gray-600' : 'hover:bg-gray-50 border-gray-200')
                  } border`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-400 text-white'
                  }`}>
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <span className={`font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {member.username}
                  </span>
                  {selectedNewOwner?._id === member._id && (
                    <div className="ml-auto text-blue-500">
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
                onClick={() => setShowTransferOwnershipModal(false)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Hủy
              </button>
              <button 
                onClick={handleTransferOwnership}
                disabled={!selectedNewOwner}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedNewOwner 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : (darkMode ? 'bg-gray-600 text-gray-500' : 'bg-gray-300 text-gray-400')
                } disabled:cursor-not-allowed`}
              >
                Chuyển quyền & Rời phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
