import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { messageAPI, roomAPI, userAPI } from '../../services/api';
import socketService from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/useTheme';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

const ChatWindow = ({ room }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket, joinRoom, leaveRoom } = useSocket();
  const { user } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [showSidebar, setShowSidebar] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const isAtBottomRef = useRef(true);
  const headerRef = useRef(null);
  const inputRef = useRef(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(0);
  // dynamic average message height (measured at runtime and smoothed)
  const [avgMessageHeight, setAvgMessageHeight] = useState(72);
  // sensible page size bounds to avoid too small/large requests
  const MIN_PAGE_SIZE = 5;
  const MAX_PAGE_SIZE = 60;

  const loadMessages = useCallback(async () => {
    if (!room) return;
    try {
      setLoading(true);
      // compute limit based on available height
      const headerH = headerRef.current?.offsetHeight || 80;
      const inputH = inputRef.current?.offsetHeight || 72;
      const available = window.innerHeight - headerH - inputH - 40;
      const limitRaw = Math.ceil(available / (avgMessageHeight || 72));
      const limit = Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, limitRaw));
      setPageSize(limit);
      const response = await messageAPI.getMessages(room._id, { limit });
      setMessages(response.data);
      setHasMore(response.data.length === limit);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [room, avgMessageHeight]);

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
    setAvgMessageHeight(prev => Math.max(20, prev * 0.8 + measured * 0.2));
  };

  useEffect(() => {
    if (!room) return;
    loadMessages();
    joinRoom(room._id);

    const handleIncoming = message => {
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    const onRoomDeleted = ({ roomId }) => {
      if (roomId === room._id) setMessages([]);
    };

    socket?.on('message:received', handleIncoming);
    socket?.on('room:deleted', onRoomDeleted);

    return () => {
      leaveRoom(room._id);
      socket?.off('message:received', handleIncoming);
      socket?.off('room:deleted', onRoomDeleted);
    };
  }, [room, socket, joinRoom, leaveRoom, loadMessages]);

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
      const res = await roomAPI.addMember(room._id, userId);
      if (res?.data) {
        room.members = res.data.members;
        setMemberResults([]);
        setMemberSearch('');
      }
    } catch (err) {
      console.error('Invite failed', err);
      alert('Mời thất bại');
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

  if (!room) return (
    <div className={`flex-1 flex items-center justify-center ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-white'}`}>
      <p className="text-gray-500">Chọn một phòng chat để bắt đầu</p>
    </div>
  );

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-white'}`}>
      {/* Header - Modern, clean */}
      <div ref={headerRef} className={`flex items-center justify-between px-5 py-3.5 border-b ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
        <div>
          <h2 className="text-base font-semibold">{room.name}</h2>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{room.members?.length || 0} thành viên</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`} title="Toggle dark mode">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setShowSidebar(true)} className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>☰</button>
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
          onLoadOlder={loadOlderMessages}
          onMeasureAvg={handleMeasuredAvg}
          isAtBottomRef={isAtBottomRef}
          onBottomChange={(isBottom) => {
            isAtBottomRef.current = isBottom;
          }}
        />
      </div>

      {/* Typing indicator */}
      <TypingIndicator roomId={room._id} />

      {/* Input */}
      <div ref={inputRef} className={`px-4 py-3.5 border-t ${darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <MessageInput roomId={room._id} onSend={sendMessageOptimistic} darkMode={darkMode} />
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
    </div>
  );
};

export default ChatWindow;
