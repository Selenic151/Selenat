import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// Room API
export const roomAPI = {
  getRooms: () => api.get('/rooms'),
  getRoomById: (id) => api.get(`/rooms/${id}`),
  createRoom: (data) => api.post('/rooms', data),
  updateRoom: (id, data) => api.put(`/rooms/${id}`, data),
  uploadRoomAvatar: (id, formData) => api.put(`/rooms/${id}/avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data' }}),
  deleteRoom: (id) => api.delete(`/rooms/${id}`),
  addMember: (id, userId) => api.post(`/rooms/${id}/members`, { userId }),
  removeMember: (id, userId) => api.delete(`/rooms/${id}/members/${userId}`),
  transferOwnership: (id, newCreatorId) => api.post(`/rooms/${id}/transfer`, { newCreatorId }),
};

// Notifications API
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  accept: (id) => api.post(`/notifications/${id}/accept`),
  decline: (id) => api.post(`/notifications/${id}/decline`),
  invite: (data) => api.post('/notifications/invite', data),
  markRead: (id) => api.put(`/notifications/${id}/read`)
};

// Message API
export const messageAPI = {
  getMessages: (roomId, params) => api.get(`/messages/${roomId}`, { params }),
  createMessage: (data) => api.post('/messages', data),
  markAsRead: (id) => api.put(`/messages/${id}/read`),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
};

// User API
export const userAPI = {
  getUsers: () => api.get('/users'),
  searchUsers: (query) => api.get(`/users/search?q=${query}`),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Friend API
export const friendAPI = {
  searchUsers: (query) => api.get(`/friends/search?q=${query}`),
  getFriends: () => api.get('/friends/list'),
  getFriendRequests: () => api.get('/friends/requests'),
  sendFriendRequest: (userId) => api.post('/friends/request', { userId }),
  acceptFriendRequest: (userId) => api.post(`/friends/accept/${userId}`),
  declineFriendRequest: (userId) => api.post(`/friends/decline/${userId}`),
  cancelFriendRequest: (userId) => api.delete(`/friends/request/${userId}`),
  removeFriend: (userId) => api.delete(`/friends/${userId}`),
  checkFriendStatus: (userId) => api.get(`/friends/status/${userId}`),
};

export default api;