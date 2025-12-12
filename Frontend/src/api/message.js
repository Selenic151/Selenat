import apiClient from './client';

export const messageAPI = {
  getMessages: (roomId, params) => apiClient.get(`/messages/${roomId}`, { params }),
  createMessage: (data) => apiClient.post('/messages', data),
  uploadFiles: (formData) => apiClient.post('/messages/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  markAsRead: (id) => apiClient.put(`/messages/${id}/read`),
  deleteMessage: (id) => apiClient.delete(`/messages/${id}`),
  revokeMessage: (id) => apiClient.post(`/messages/${id}/revoke`),
};
