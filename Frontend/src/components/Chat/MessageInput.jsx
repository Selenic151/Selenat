import { useState, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';

const MessageInput = ({ roomId }) => {
  const [message, setMessage] = useState('');
  const { sendMessage, startTyping, stopTyping } = useSocket();
  const typingTimeout = useRef(null);

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
      sendMessage({
        roomId,
        content: message,
        type: 'text',
      });
      setMessage('');
      stopTyping(roomId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-sm border-t border-gray-200 px-6 py-4">
      <div className="flex items-end space-x-4">
        <div className="flex-1 relative">
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={handleChange}
              placeholder="Nhập tin nhắn của bạn..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200 resize-none"
              style={{ minHeight: '48px' }}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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