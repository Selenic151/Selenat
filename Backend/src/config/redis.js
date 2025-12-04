const { createClient } = require('redis');

let redisClient = null;

const connectRedis = async () => {
  try {
    // Skip Redis if REDIS_URL not set
    if (!process.env.REDIS_URL) {
      console.log('⚠️  Redis disabled (REDIS_URL not set). App will work without caching.');
      return null;
    }

    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 2000, // 2 seconds timeout
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.error('Redis reconnection failed after 3 attempts');
            return new Error('Redis reconnection limit exceeded');
          }
          return Math.min(retries * 50, 500);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis client ready');
    });

    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    console.log('Continuing without Redis cache...');
    return null;
  }
};

const getRedisClient = () => redisClient;

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis disconnected');
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis
};
