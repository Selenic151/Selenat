import { useAuth } from '../../context/AuthContext';

const MessageList = ({ messages, loading }) => {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải tin nhắn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-slate-50 to-gray-100">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-600">Chưa có tin nhắn nào trong phòng này</p>
            <p className="text-sm text-gray-500 mt-1">Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender._id === user._id;

            return (
              <div
                key={message._id}
                className={`flex items-start space-x-3 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                    isOwn
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                      : 'bg-gradient-to-br from-gray-400 to-gray-600'
                  }`}>
                    <span className="text-white font-semibold text-sm">
                      {message.sender.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'text-right' : ''}`}>
                  {!isOwn && (
                    <p className="text-xs text-gray-600 font-medium mb-1 ml-1">
                      {message.sender.username}
                    </p>
                  )}

                  <div
                    className={`inline-block px-4 py-3 rounded-2xl shadow-sm ${
                      isOwn
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-2 ${
                      isOwn ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MessageList;