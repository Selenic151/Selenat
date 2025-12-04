const cacheService = require('../services/cacheService');

// Helper functions to invalidate cache on updates
const invalidateUserRoomsCache = async (userId) => {
  await cacheService.del(`rooms:user:${userId}`);
};

const invalidateMultipleUserRoomsCache = async (userIds) => {
  for (const userId of userIds) {
    await cacheService.del(`rooms:user:${userId}`);
  }
};

const invalidateDirectRoomCache = async (userId1, userId2) => {
  const [user1, user2] = [userId1, userId2].sort();
  await cacheService.del(`direct:${user1}:${user2}`);
};

const invalidateUserCache = async (userId) => {
  await cacheService.del(`user:${userId}`);
};

module.exports = {
  invalidateUserRoomsCache,
  invalidateMultipleUserRoomsCache,
  invalidateDirectRoomCache,
  invalidateUserCache
};
