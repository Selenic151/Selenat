import { useContext } from 'react';
import { MessageCacheContext } from './MessageCacheContext';

export const useMessageCache = () => {
  const context = useContext(MessageCacheContext);
  if (!context) {
    throw new Error('useMessageCache must be used within MessageCacheProvider');
  }
  return context;
};
