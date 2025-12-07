import { useCallback } from 'react';
import { notificationAPI, roomAPI, userAPI } from '../services/api';

export function useRoomActions(roomId) {
  // Mời thành viên
  const inviteMember = useCallback(async (userId) => {
    const res = await notificationAPI.invite({ roomId, userIds: [userId] });
    return res?.data;
  }, [roomId]);

  // Xoá thành viên
  const removeMember = useCallback(async (memberId) => {
    const res = await roomAPI.removeMember(roomId, memberId);
    return res?.data;
  }, [roomId]);

  // Chuyển quyền chủ phòng
  const transferOwnership = useCallback(async (newOwnerId, userId) => {
    await roomAPI.transferOwnership(roomId, newOwnerId);
    await roomAPI.removeMember(roomId, userId);
    return true;
  }, [roomId]);

  // Tìm kiếm thành viên
  const searchMembers = useCallback(async (q, currentMembers) => {
    if (!q || q.trim().length < 2) return [];
    const res = await userAPI.searchUsers(q.trim());
    return res.data.filter(u => !currentMembers?.some(m => String(m._id || m) === u._id));
  }, []);

  return { inviteMember, removeMember, transferOwnership, searchMembers };
}
