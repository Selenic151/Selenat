import { useRef } from 'react';
import { MessageCacheContext } from './MessageCacheContext.js';

export const MessageCacheProvider = ({ children }) => {
  // Cache structure: { [roomId]: { messages: [], hasMore: boolean, lastFetch: timestamp } }
  const cacheRef = useRef({});
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const getCachedMessages = (roomId) => {
    const cached = cacheRef.current[roomId];
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.lastFetch > CACHE_TTL) {
      // Cache expired
      delete cacheRef.current[roomId];
      return null;
    }
    
    return {
      messages: cached.messages,
      hasMore: cached.hasMore
    };
  };

  const setCachedMessages = (roomId, messages, hasMore) => {
    cacheRef.current[roomId] = {
      messages,
      hasMore,
      lastFetch: Date.now()
    };
  };

  const updateCache = (roomId, updater) => {
    const cached = cacheRef.current[roomId];
    if (!cached) return;
    
    cacheRef.current[roomId] = {
      ...cached,
      messages: updater(cached.messages),
      lastFetch: Date.now()
    };
  };

  const invalidateCache = (roomId) => {
    if (roomId) {
      delete cacheRef.current[roomId];
    } else {
      cacheRef.current = {};
    }
  };

  return (
    <MessageCacheContext.Provider value={{ getCachedMessages, setCachedMessages, updateCache, invalidateCache }}>
      {children}
    </MessageCacheContext.Provider>
  );
};
