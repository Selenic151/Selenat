// API exports
export { authAPI } from './auth';
export { roomAPI } from './room';
export { messageAPI } from './message';
export { notificationAPI } from './notification';
export { userAPI } from './user';
export { friendAPI } from './friend';
export { default as apiClient } from './client';

// Default export for backward compatibility
export { default } from './client';
