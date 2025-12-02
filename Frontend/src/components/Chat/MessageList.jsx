import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/useTheme';
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';

const MessageList = ({ messages, loading, onLoadOlder, isAtBottomRef, onBottomChange, loadingOlder = false, hasMore, darkMode, onMeasureAvg, virtuosoRef: externalRef }) => {
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
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const senderId = msg?.sender?._id || msg?.sender?.id || (msg.sender || '').toString();
      const prevSenderId = prev ? (prev?.sender?._id || prev?.sender?.id || (prev.sender || '').toString()) : null;
      const nextSenderId = next ? (next?.sender?._id || next?.sender?.id || (next.sender || '').toString()) : null;
      const isFirstInGroup = senderId !== prevSenderId;
      const isLastInGroup = senderId !== nextSenderId;
      const isOwn = user && senderId === String(user._id);
      // Date separator: if first message or different day from previous
      const showDate = (() => {
        if (!prev) return true;
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

    return (
      <div className="relative px-4">
        {it.showDate && (
          <div className="w-full flex justify-center py-3 mb-1">
            <div className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
              {new Date(it.msg.createdAt).toLocaleDateString('vi-VN')}
            </div>
          </div>
        )}

        <div className={`flex items-end gap-2 mb-3 ${it.isOwn ? 'justify-end' : 'justify-start'}`}>
          {/* Avatar for others shown only on last message of group */}
          {!it.isOwn && (
            <div className={it.isLastInGroup ? '' : 'w-8 h-8'}>
              {it.isLastInGroup && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-medium ${isDark ? 'bg-gray-700' : 'bg-gray-400'}`}>
                  {(it.msg.sender?.username || '').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}

          <div className={`max-w-[70%] ${it.isOwn ? 'text-right' : 'text-left'}`}>
            {/* Bubble - Modern */}
            <div data-msg-bubble className={`px-4 py-2.5 rounded-2xl ${it.isOwn 
              ? 'bg-blue-500 text-white rounded-tr-none' 
              : isDark ? 'bg-gray-800 text-gray-100 rounded-tl-none' : 'bg-gray-100 text-gray-900 rounded-tl-none'}`}>
              <div className="text-sm leading-relaxed">{it.msg.content}</div>
              <div className={`text-xs mt-1.5 ${it.isOwn ? 'text-blue-100' : isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                {new Date(it.msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Spacer for own messages */}
          {it.isOwn && <div className="w-8" />}
        </div>
      </div>
    );
  }, [items, isDark]);

  if (loading) {
    return (
      <div className={`flex-1 min-h-0 flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Đang tải tin nhắn...</p>
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