import React, { useEffect, useState } from 'react';

const Toast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const { type, message, options } = e.detail || {};
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, type, message, options }]);
      const ttl = (options && options.duration) || 4000;
      setTimeout(() => {
        setToasts((t) => t.filter(tt => tt.id !== id));
      }, ttl);
    };

    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`max-w-xs w-full rounded-md shadow-lg px-4 py-3 text-sm text-white ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
};

export default Toast;
