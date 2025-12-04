import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/useTheme';
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';

// Helper to get server URL without /api suffix
const getServerURL = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api$/, ''); // Remove /api suffix
};

const MessageList = ({ messages, loading, onLoadOlder, isAtBottomRef, onBottomChange, loadingOlder = false, hasMore, darkMode, onMeasureAvg, virtuosoRef: externalRef, room }) => {
  const { user } = useAuth();
  const { darkMode: themeDarkMode } = useTheme();
  const isDark = darkMode !== undefined ? darkMode : themeDarkMode;
  const internalRef = useRef(null);
  const virtuosoRef = externalRef || internalRef;
  const measureTimerRef = useRef(null);
  const loadOlderDebounceRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // Debounced load older to prevent multiple calls
  const handleStartReached = useCallback(() => {
    if (loadOlderDebounceRef.current) return; // already pending
    if (!onLoadOlder || !hasMore || loadingOlder) return;
    
    loadOlderDebounceRef.current = setTimeout(() => {
      onLoadOlder();
      loadOlderDebounceRef.current = null;
    }, 200);
  }, [onLoadOlder, hasMore, loadingOlder]);

  // Measure rendered message bubble heights and report average to parent (throttled)
  useEffect(() => {
    if (loading || !onMeasureAvg) return;
    
    if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
    
    measureTimerRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        try {
          const nodes = document.querySelectorAll('[data-msg-bubble]');
          if (!nodes || nodes.length === 0) return;
          const count = Math.min(30, nodes.length);
          const start = Math.max(0, nodes.length - count);
          let sum = 0;
          let measured = 0;
          for (let i = start; i < nodes.length; i++) {
            const h = nodes[i].offsetHeight;
            if (h && !Number.isNaN(h)) {
              sum += h;
              measured += 1;
            }
          }
          if (measured >= 3) {
            const avg = Math.round(sum / measured);
            onMeasureAvg(avg);
          }
        } catch {
          // measurement failed — ignore
        }
      });
    }, 300);

    return () => {
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
      if (loadOlderDebounceRef.current) clearTimeout(loadOlderDebounceRef.current);
    };
  }, [messages, loading, onMeasureAvg]);

  // ResizeObserver to detect when message bubbles change size (e.g., images loading)
  useEffect(() => {
    if (loading || !onMeasureAvg) return;

    const observer = new ResizeObserver(() => {
      // Debounce re-measurement when bubbles resize
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
      measureTimerRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          try {
            const nodes = document.querySelectorAll('[data-msg-bubble]');
            if (!nodes || nodes.length === 0) return;
            const count = Math.min(30, nodes.length);
            const start = Math.max(0, nodes.length - count);
            let sum = 0;
            let measured = 0;
            for (let i = start; i < nodes.length; i++) {
              const h = nodes[i].offsetHeight;
              if (h && !Number.isNaN(h)) {
                sum += h;
                measured += 1;
              }
            }
            if (measured >= 3) {
              const avg = Math.round(sum / measured);
              onMeasureAvg(avg);
            }
          } catch {
            // measurement failed — ignore
          }
        });
      }, 500);
    });

    // Observe all message bubbles
    const bubbles = document.querySelectorAll('[data-msg-bubble]');
    bubbles.forEach(bubble => observer.observe(bubble));

    resizeObserverRef.current = observer;

    return () => {
      observer.disconnect();
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
    };
  }, [messages, loading, onMeasureAvg]);

  // Notify parent when bottom state changes
  const handleAtBottomStateChange = useCallback((bottom) => {
    if (isAtBottomRef) isAtBottomRef.current = bottom;
    if (onBottomChange) onBottomChange(bottom);
  }, [isAtBottomRef, onBottomChange]);

  // Build grouped message structure (group consecutive messages by same sender)
  const items = useMemo(() => {
    const result = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg) continue; // skip null/undefined entries
      
      // System messages don't need grouping logic
      if (msg.isSystem) {
        result.push({ msg, isSystem: true });
        continue;
      }
      
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const senderId = msg?.sender?._id || msg?.sender?.id || (msg.sender || '').toString();
      const prevSenderId = prev && !prev.isSystem ? (prev?.sender?._id || prev?.sender?.id || (prev.sender || '').toString()) : null;
      const nextSenderId = next && !next.isSystem ? (next?.sender?._id || next?.sender?.id || (next.sender || '').toString()) : null;
      const isFirstInGroup = senderId !== prevSenderId;
      const isLastInGroup = senderId !== nextSenderId;
      const isOwn = user && senderId === String(user._id);
      // Date separator: if first message or different day from previous
      const showDate = (() => {
        if (!prev || prev.isSystem) return true;
        const d1 = new Date(prev.createdAt).toDateString();
        const d2 = new Date(msg.createdAt).toDateString();
        return d1 !== d2;
      })();
      result.push({ msg, isFirstInGroup, isLastInGroup, isOwn, showDate });
    }
    return result;
  }, [messages, user]);

  // Message item renderer for Virtuoso
  const itemContent = useCallback((index) => {
    const it = items[index];
    if (!it) return null;

    // System message (member joined/left)
    if (it.msg.isSystem) {
      return (
        <div className="relative px-4 mb-2">
          <div className="w-full flex justify-center">
            <div className={`text-xs px-3 py-1.5 rounded-full ${isDark ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-100 text-gray-500'} italic`}>
              {it.msg.content}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative px-4">
        {it.showDate && (
          <div className="w-full flex justify-center py-3 mb-1">
            <div className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
              {new Date(it.msg.createdAt).toLocaleDateString('vi-VN')}
            </div>
          </div>
        )}

        <div className={`flex items-end gap-3 mb-4 ${it.isOwn ? 'justify-end' : 'justify-start'} animate-message-appear`}>
          {/* Avatar for others shown only on last message of group */}
          {!it.isOwn && (
            <div className={it.isLastInGroup ? '' : 'w-8 h-8'}>
              {it.isLastInGroup && (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm text-white font-semibold shadow-lg avatar-hover transition-all duration-300 ${
                  isDark ? 'bg-linear-to-br from-gray-600 to-gray-800' : 'bg-linear-to-br from-gray-400 to-gray-600'
                }`}>
                  {(it.msg.sender?.username || '').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}

          <div className={`max-w-[75%] ${it.isOwn ? 'text-right' : 'text-left'}`}>
            {/* Sender name for group chats */}
            {!it.isOwn && room?.type !== 'direct' && it.isLastInGroup && (
              <div className={`text-xs font-medium mb-1 px-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {it.msg.sender?.username}
              </div>
            )}

            {/* Bubble - Enhanced modern design */}
            <div 
              data-msg-bubble 
              className={`message-bubble px-4 py-3 rounded-2xl shadow-sm transition-all duration-300 ${
                it.isOwn 
                  ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-tr-md shadow-blue-500/25' 
                  : isDark 
                    ? 'bg-gray-800/90 text-gray-100 rounded-tl-md border border-gray-700/50' 
                    : 'bg-white text-gray-900 rounded-tl-md border border-gray-200/50 shadow-gray-200/50'
              } ${it.msg.pending ? 'opacity-70' : ''}`}
            >
              
              {/* Attachments */}
              {it.msg.attachments && it.msg.attachments.length > 0 && (
                <div className="mb-3 space-y-2">
                  {it.msg.attachments.map((att, idx) => (
                    <div key={idx} className="group">
                      {att.mimeType.startsWith('image/') ? (
                        <div className="relative overflow-hidden rounded-xl">
                          <img 
                            src={`${getServerURL()}${att.url}`}
                            alt={att.originalName}
                            className="max-w-full rounded-xl cursor-pointer hover:scale-105 transition-transform duration-300 shadow-lg"
                            onClick={() => window.open(`${getServerURL()}${att.url}`, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl"></div>
                        </div>
                      ) : att.mimeType.startsWith('video/') ? (
                        <video 
                          controls
                          className="max-w-full rounded-xl shadow-lg"
                          src={`${getServerURL()}${att.url}`}
                        />
                      ) : (
                        <a 
                          href={`${getServerURL()}${att.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                            it.isOwn 
                              ? 'bg-blue-600/80 hover:bg-blue-600 text-blue-50' 
                              : isDark 
                                ? 'bg-gray-700/80 hover:bg-gray-700 text-gray-200' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            it.isOwn ? 'bg-blue-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'
                          }`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{att.originalName}</div>
                            <div className={`text-xs ${it.isOwn ? 'text-blue-200' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''}
                            </div>
                          </div>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Text content */}
              {it.msg.content && (
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{it.msg.content}</div>
              )}
              
              {/* Timestamp and status */}
              <div className={`flex items-center justify-end gap-1 mt-2 text-xs ${
                it.isOwn 
                  ? 'text-blue-100' 
                  : isDark ? 'text-gray-500' : 'text-gray-600'
              }`}>
                <span>{new Date(it.msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                {it.msg.pending && (
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Spacer for own messages */}
          {it.isOwn && <div className="w-10" />}
        </div>
      </div>
    );
  }, [items, isDark]);

  if (loading) {
    return (
      <div className={`flex-1 min-h-0 flex flex-col justify-center items-center ${isDark ? 'bg-gray-950' : 'bg-white'} p-8`}>
        <div className="text-center space-y-6">
          {/* Animated logo/icon */}
          <div className="relative">
            <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl animate-float">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="absolute -inset-2 bg-linear-to-r from-blue-400 to-purple-500 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
          </div>
          
          <div className="space-y-2">
            <div className="w-48 h-4 bg-linear-to-r from-gray-300 to-gray-200 rounded-full mx-auto animate-shimmer"></div>
            <div className="w-32 h-3 bg-linear-to-r from-gray-200 to-gray-100 rounded-full mx-auto animate-shimmer delay-200"></div>
          </div>
          
          {/* Loading skeleton messages */}
          <div className="w-full max-w-md space-y-4 mt-8">
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-gray-300 rounded-full mr-3 animate-pulse"></div>
              <div className="space-y-2">
                <div className="w-48 h-4 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="w-32 h-4 bg-gray-300 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="space-y-2">
                <div className="w-40 h-4 bg-blue-300 rounded-full animate-pulse"></div>
                <div className="w-24 h-4 bg-blue-300 rounded-full animate-pulse"></div>
              </div>
              <div className="w-8 h-8 bg-blue-400 rounded-full ml-3 animate-pulse"></div>
            </div>
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-gray-300 rounded-full mr-3 animate-pulse"></div>
              <div className="w-56 h-4 bg-gray-300 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 min-h-0 ${isDark ? 'bg-gray-950' : 'bg-white'} relative`}>
      <Virtuoso
        ref={virtuosoRef}
        data={items}
        totalCount={items.length}
        itemContent={itemContent}
        followOutput={(isAtBottom) => {
          // Auto-scroll to bottom only if user is already at bottom or on initial load
          if (isAtBottom) return 'smooth';
          return false;
        }}
        alignToBottom
        initialTopMostItemIndex={items.length > 0 ? items.length - 1 : 0}
        atBottomStateChange={handleAtBottomStateChange}
        startReached={handleStartReached}
        style={{ height: '100%' }}
        className="py-3"
        components={{
          Header: () => {
            if (!loadingOlder || !hasMore) return null;
            return (
              <div className="flex justify-center py-2">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-500 rounded-full animate-spin" />
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Đang tải...</span>
                </div>
              </div>
            );
          },
          Footer: () => {
            if (loading || loadingOlder || hasMore) return null;
            return (
              <div className={`w-full text-center text-sm py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Không còn tin cũ
              </div>
            );
          },
          EmptyPlaceholder: () => {
            if (loading) return (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Đang tải tin nhắn...</p>
                </div>
              </div>
            );
            return (
              <div className="flex items-center justify-center h-full py-12">
                <div className="text-center">
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Chưa có tin nhắn nào</p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Bắt đầu cuộc trò chuyện ngay!</p>
                </div>
              </div>
            );
          }
        }}
      />
    </div>
  );
};

export default MessageList;