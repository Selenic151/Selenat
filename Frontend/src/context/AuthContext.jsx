import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';

const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { useAuth };

const fetchUser = async () => {
  try {
    const response = await authAPI.getMe();
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUser(token).then((userData) => {
        if (userData) {
          setUser(userData);
          socketService.connect(token);
        } else {
          logout();
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [token]);



  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const { token, ...userData } = response.data;
    
    localStorage.setItem('token', token);
    setToken(token);
    setUser(userData);
    
    // Connect socket
    socketService.connect(token);
    
    return response.data;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    const { token, ...user } = response.data;
    
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
    
    // Connect socket
    socketService.connect(token);
    
    return response.data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      
      // Disconnect socket
      socketService.disconnect();
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};