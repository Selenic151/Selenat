import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/useTheme';
import imageCompression from 'browser-image-compression';

const MessageInput = ({ roomId, onSend, onUpload, darkMode: darkModeProp }) => {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { startTyping, stopTyping } = useSocket();
  const typingTimeout = useRef(null);
  const { darkMode: themeDarkMode } = useTheme();
  const isDark = darkModeProp !== undefined ? darkModeProp : themeDarkMode;

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        stopTyping(roomId);
      }
    };
  }, [roomId, stopTyping]);

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
    
    // If files selected, upload them
    if (selectedFiles.length > 0) {
      handleUpload();
      return;
    }

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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      alert('Chỉ được upload tối đa 5 files');
      return;
    }
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('roomId', roomId);
      formData.append('content', message);

      // Compress images before upload
      for (const file of selectedFiles) {
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          };
          try {
            const compressedFile = await imageCompression(file, options);
            formData.append('files', compressedFile, file.name);
          } catch (err) {
            console.error('Compression failed, using original:', err);
            formData.append('files', file);
          }
        } else {
          formData.append('files', file);
        }
      }

      if (onUpload) {
        await onUpload(formData);
      }

      // Reset
      setMessage('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* File preview with enhanced styling */}
      {selectedFiles.length > 0 && (
        <div className={`mb-3 p-4 rounded-2xl backdrop-blur-sm border transition-all duration-300 animate-slide-in-left ${
          isDark 
            ? 'bg-gray-800/90 border-gray-700/50 shadow-lg shadow-gray-900/50' 
            : 'bg-white/90 border-gray-200/50 shadow-lg shadow-gray-200/50'
        }`}>
          <div className="flex flex-wrap gap-3">
            {selectedFiles.map((file, index) => (
              <div 
                key={index} 
                className={`relative group px-4 py-2 rounded-xl text-sm transition-all duration-300 hover:scale-105 animate-fade-in-up ${
                  isDark ? 'bg-gray-700/80 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg ${
                    file.type.startsWith('image/') ? 'bg-green-500' :
                    file.type.startsWith('video/') ? 'bg-blue-500' : 'bg-orange-500'
                  }`}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {file.type.startsWith('image/') ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      ) : file.type.startsWith('video/') ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      )}
                    </svg>
                  </div>
                  <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 hover:scale-110 shadow-lg"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end space-x-3">
        {/* File upload button with enhanced styling */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`p-3 rounded-2xl transition-all duration-300 btn-hover-lift group ${
            isDark 
              ? 'bg-gray-800/80 hover:bg-gray-700 border border-gray-600/50' 
              : 'bg-white/80 hover:bg-gray-50 border border-gray-300/50 shadow-lg'
          }`}
          title="Đính kèm file"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <div className="flex-1 relative">
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={handleChange}
              placeholder="Nhập tin nhắn của bạn..."
              className={`w-full px-5 py-4 pr-14 border-2 rounded-2xl focus:outline-none focus:ring-0 input-focus-glow transition-all duration-300 resize-none ${
                isDark 
                  ? 'bg-gray-800/90 border-gray-600/50 text-gray-100 placeholder-gray-400 hover:bg-gray-750 focus:border-blue-500/50' 
                  : 'bg-white/90 border-gray-300/50 text-gray-900 placeholder-gray-500 hover:bg-white focus:border-blue-500/50 shadow-lg'
              }`}
              style={{ minHeight: '52px' }}
            />
            {/* Typing indicator */}
            {message && (
              <div className="absolute right-4 top-4 flex space-x-1">
                <div className="typing-dot w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="typing-dot w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="typing-dot w-1 h-1 bg-gray-400 rounded-full"></div>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!message.trim() && selectedFiles.length === 0 || uploading}
          className={`p-4 rounded-2xl transition-all duration-300 shadow-xl ${
            (message.trim() || selectedFiles.length > 0) && !uploading
              ? 'bg-orange-400 hover:bg-orange-500 text-white transform hover:scale-105 btn-hover-lift'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title="Gửi tin nhắn"
        >
          {uploading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;