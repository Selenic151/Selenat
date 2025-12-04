const { getRedisClient } = require('../config/redis');

// Cache helper with fallback
class CacheService {
  constructor() {
    this.enabled = false;
  }

  async init() {
    const client = getRedisClient();
    this.enabled = client !== null;
    return this.enabled;
  }

  async get(key) {
    if (!this.enabled) return null;
    
    try {
      const client = getRedisClient();
      if (!client) return null;
      
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 300) {
    if (!this.enabled) return false;
    
    try {
      const client = getRedisClient();
      if (!client) return false;
      
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.enabled) return false;
    
    try {
      const client = getRedisClient();
      if (!client) return false;
      
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Cache del error:', error);
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.enabled) return false;
    
    try {
      const client = getRedisClient();
      if (!client) return false;
      
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delPattern error:', error);
      return false;
    }
  }

  // Cache với automatic JSON stringify/parse
  async cacheWrapper(key, fetchFn, ttlSeconds = 300) {
    // Try get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();
    
    // Store in cache
    await this.set(key, data, ttlSeconds);
    
    return data;
  }
}

const cacheService = new CacheService();

module.exports = cacheService;
