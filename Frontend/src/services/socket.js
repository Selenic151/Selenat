import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId) {
    if (this.socket) {
      this.socket.emit('room:join', roomId);
    }
  }

  leaveRoom(roomId) {
    if (this.socket) {
      this.socket.emit('room:leave', roomId);
    }
  }

  sendMessage(data) {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not connected'));
      try {
        this.socket.timeout(5000).emit('message:send', data, (ack) => {
          // ack expected to be { success: true, message } or { success: false, error }
          if (!ack) return resolve(null);
          if (ack.success) {
            // normalize: some servers may return the message directly
            return resolve(ack.message || ack);
          }
          return reject(new Error(ack.error || 'Send failed'));
        });
      } catch (err) {
        return reject(err);
      }
    });
  }

  startTyping(roomId) {
    if (this.socket) {
      this.socket.emit('typing:start', { roomId });
    }
  }

  stopTyping(roomId) {
    if (this.socket) {
      this.socket.emit('typing:stop', { roomId });
    }
  }

  markAsRead(messageId, roomId) {
    if (this.socket) {
      this.socket.emit('message:read', { messageId, roomId });
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export default new SocketService();