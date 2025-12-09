import { useState, useEffect } from 'react';
import { notificationAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const Notifications = ({ onAccept }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket, on, off } = useSocket();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getNotifications();
      setNotifications(res.data);
    } catch (err) {
      console.error('Error loading notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (n) => setNotifications(prev => [n, ...prev]);
    on('invitation:received', handler);
    return () => off('invitation:received', handler);
  }, [socket, on, off]);

  const accept = async (id) => {
    try {
      await notificationAPI.accept(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'accepted' } : n));
      await notificationAPI.markRead(id);
      window.dispatchEvent(new CustomEvent('roomAccepted'));
      onAccept?.();
    } catch (err) { console.error(err); }
  };

  const decline = async (id) => {
    try {
      await notificationAPI.decline(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'declined' } : n));
      await notificationAPI.markRead(id);
    } catch (err) { console.error(err); }
  };

  const markRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'read' } : n));
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }} />
      <span className="ml-2" style={{ color: 'var(--accent-text)' }}>Đang tải...</span>
    </div>
  );

  return (
    <div className="p-6">
      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 0110.293-4.293L15 9v8z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Không có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n._id}
              className="rounded-lg p-4 hover:shadow-md transition-shadow"
              style={{ backgroundColor: 'var(--secondary)', border: '1px solid rgba(var(--secondary-rgb), 0.14)', color: 'var(--accent-text)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent-text)' }}>{n.message}</p>
                  <div className="flex items-center space-x-2 text-xs" style={{ color: 'rgba(var(--accent-text-rgb), 0.85)' }}>
                    <span>Từ: {n.from?.username}</span>
                    <span>•</span>
                    <span>Phòng: {n.room?.name}</span>
                  </div>

                  <div className="mt-2 flex items-center space-x-2">
                    {n.status === 'pending' && (
                      <>
                        <button onClick={() => accept(n._id)} className="px-3 py-1 text-xs font-medium rounded-full btn-accept">
                          Chấp nhận
                        </button>
                        <button onClick={() => decline(n._id)} className="px-3 py-1 text-xs font-medium rounded-full btn-decline">
                          Từ chối
                        </button>
                      </>
                    )}

                    {n.status === 'pending' && (
                      <button className="text-xs hover:underline" onClick={() => markRead(n._id)}>
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                </div>

                <div className="ml-3">
                  {n.status === 'accepted' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium badge-accepted">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Đã chấp nhận
                    </span>
                  )}

                  {n.status === 'declined' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium badge-declined">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Đã từ chối
                    </span>
                  )}

                  {n.status === 'read' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium badge-read">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      Đã đọc
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
