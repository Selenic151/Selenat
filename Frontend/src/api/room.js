import apiClient from './client';

export const roomAPI = {
  getRooms: () => apiClient.get('/rooms'),
  getRoomById: (id) => apiClient.get(`/rooms/${id}`),
  createRoom: (data) => apiClient.post('/rooms', data),
  updateRoom: (id, data) => apiClient.put(`/rooms/${id}`, data),
  uploadRoomAvatar: (id, formData) => apiClient.put(`/rooms/${id}/avatar`, formData, { 
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteRoom: (id) => apiClient.delete(`/rooms/${id}`),
  addMember: (id, userId) => apiClient.post(`/rooms/${id}/members`, { userId }),
  removeMember: (id, userId) => apiClient.delete(`/rooms/${id}/members/${userId}`),
  removeRoomMember: (id, userId) => apiClient.delete(`/rooms/${id}/members/${userId}`),
  transferOwnership: (id, newCreatorId) => apiClient.post(`/rooms/${id}/transfer`, { newCreatorId }),
};
