// Re-export all APIs from the new api directory
// This file is kept for backward compatibility
export { 
  authAPI, 
  roomAPI, 
  messageAPI, 
  notificationAPI, 
  userAPI, 
  friendAPI,
  apiClient as default 
} from '../api';
