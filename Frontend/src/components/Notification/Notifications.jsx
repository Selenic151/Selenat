import { useState, useEffect } from 'react';
import { notificationAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const Notifications = () => {
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
    const handler = (n) => {
      setNotifications(prev => [n, ...prev]);
    };
    on('invitation:received', handler);
    return () => off('invitation:received', handler);
  }, [socket, on, off]);

  const accept = async (id) => {
    try {
      await notificationAPI.accept(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'accepted' } : n));
      // mark read
      await notificationAPI.markRead(id);
    } catch (err) { console.error(err); }
  };
  const decline = async (id) => {
    try {
      await notificationAPI.decline(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'declined' } : n));
      await notificationAPI.markRead(id);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="p-2">Đang tải...</div>;

  return (
    <div className="w-80 p-2">
      <h3 className="font-bold mb-2">Thông báo</h3>
      {notifications.length === 0 ? (
        <div className="text-sm text-gray-500">Không có thông báo</div>
      ) : (
        notifications.map(n => (
          <div key={n._id} className="p-2 border-b flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">{n.message}</p>
              <p className="text-xs text-gray-500">{n.from?.username} • {n.room?.name}</p>
            </div>
            <div className="flex flex-col gap-1">
              {n.status === 'pending' && (
                <>
                  <button onClick={() => accept(n._id)} className="text-sm px-2 py-1 bg-green-500 text-white rounded">Chấp nhận</button>
                  <button onClick={() => decline(n._id)} className="text-sm px-2 py-1 bg-red-500 text-white rounded">Từ chối</button>
                </>
              )}
              {n.status === 'pending' && (
                <button className="text-xs mt-1 text-gray-500" onClick={async() => { await notificationAPI.markRead(n._id); setNotifications(prev => prev.map(x=> x._id===n._id?{...x, status:'read'}:x)); }}>Đánh dấu đã đọc</button>
              )}
              {n.status !== 'pending' && (
                <span className="text-xs text-gray-500">{n.status}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Notifications;
