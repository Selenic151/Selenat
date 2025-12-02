import { useState, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/useTheme';

const MessageInput = ({ roomId, onSend, darkMode: darkModeProp }) => {
  const [message, setMessage] = useState('');
  const { startTyping, stopTyping } = useSocket();
  const typingTimeout = useRef(null);
  const { darkMode: themeDarkMode } = useTheme();
  const isDark = darkModeProp !== undefined ? darkModeProp : themeDarkMode;

  const handleChange = (e) => {
    setMessage(e.target.value);
    startTyping(roomId);

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      stopTyping(roomId);
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (message.trim()) {
      // delegate actual sending to parent (optimistic handled there)
      try {
        if (onSend) onSend({ roomId, content: message, type: 'text' });
      } catch (err) {
        console.error('Send error', err);
      }
      setMessage('');
      stopTyping(roomId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-end space-x-4">
        <div className="flex-1 relative">
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={handleChange}
              placeholder="Nhập tin nhắn của bạn..."
              className={`w-full px-4 py-3 pr-12 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 resize-none ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 hover:bg-gray-750' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 hover:bg-white'
              }`}
              style={{ minHeight: '48px' }}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!message.trim()}
          className={`p-3 rounded-2xl transition-all duration-200 shadow-lg ${
            message.trim()
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transform hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </form>
  );
};

export default MessageInput;