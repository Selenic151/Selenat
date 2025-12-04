import { useState, useRef } from 'react';
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
      {/* File preview */}
      {selectedFiles.length > 0 && (
        <div className={`mb-2 p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className={`relative group px-3 py-1 rounded-full text-sm ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                <span className="truncate max-w-[150px] inline-block">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end space-x-2">
        {/* File upload button */}
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
          className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className={`w-full px-4 py-3 pr-12 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 resize-none ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 hover:bg-gray-750' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 hover:bg-white'
              }`}
              style={{ minHeight: '48px' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!message.trim() && selectedFiles.length === 0 || uploading}
          className={`p-3 rounded-2xl transition-all duration-200 shadow-lg ${
            (message.trim() || selectedFiles.length > 0) && !uploading
              ? 'bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transform hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
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