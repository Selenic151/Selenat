import apiClient from './client';

export const messageAPI = {
  getMessages: (roomId, params) => apiClient.get(`/messages/${roomId}`, { params }),
  createMessage: (data) => apiClient.post('/messages', data),
  markAsRead: (id) => apiClient.put(`/messages/${id}/read`),
  deleteMessage: (id) => apiClient.delete(`/messages/${id}`),
};
