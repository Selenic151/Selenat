import apiClient from './client';

export const userAPI = {
  getUsers: () => apiClient.get('/users'),
  searchUsers: (query) => apiClient.get(`/users/search?q=${query}`),
  getUserById: (id) => apiClient.get(`/users/${id}`),
  updateUser: (id, data) => {
    // If FormData (e.g., avatar upload), set appropriate headers
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return apiClient.put(`/users/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return apiClient.put(`/users/${id}`, data);
  },
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
};
