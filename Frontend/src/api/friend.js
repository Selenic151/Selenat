import apiClient from './client';

export const friendAPI = {
  searchUsers: (query) => apiClient.get(`/friends/search?q=${query}`),
  getFriends: () => apiClient.get('/friends/list'),
  getFriendRequests: () => apiClient.get('/friends/requests'),
  sendFriendRequest: (userId) => apiClient.post('/friends/request', { userId }),
  acceptFriendRequest: (userId) => apiClient.post(`/friends/accept/${userId}`),
  declineFriendRequest: (userId) => apiClient.post(`/friends/decline/${userId}`),
  cancelFriendRequest: (userId) => apiClient.delete(`/friends/request/${userId}`),
  removeFriend: (userId) => apiClient.delete(`/friends/${userId}`),
  checkFriendStatus: (userId) => apiClient.get(`/friends/status/${userId}`),
};
