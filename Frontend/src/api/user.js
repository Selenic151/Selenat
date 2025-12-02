import apiClient from './client';

export const userAPI = {
  getUsers: () => apiClient.get('/users'),
  searchUsers: (query) => apiClient.get(`/users/search?q=${query}`),
  getUserById: (id) => apiClient.get(`/users/${id}`),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
};
