import apiClient from './client';

export const notificationAPI = {
  getNotifications: () => apiClient.get('/notifications'),
  accept: (id) => apiClient.post(`/notifications/${id}/accept`),
  decline: (id) => apiClient.post(`/notifications/${id}/decline`),
  invite: (data) => apiClient.post('/notifications/invite', data),
  markRead: (id) => apiClient.put(`/notifications/${id}/read`),
};
