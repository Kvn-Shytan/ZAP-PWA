import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { syncService } from '../services/syncService'; // NEW import
// import { apiFetch } from '../services/api'; // No longer directly used for critical data fetching

const AuthContext = createContext(null);
// const API_URL = import.meta.env.VITE_API_URL || ''; // No longer needed here

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Renamed from fetchCriticalData to handleSync for clarity of purpose
  const handleSync = useCallback(async (authToken) => {
    if (!authToken) return;
    try {
      await syncService.initialSync(authToken);
      syncService.startContinuousSync(authToken); // Start continuous sync after initial
    } catch (error) {
      console.error('Error during initial sync or starting continuous sync:', error);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    syncService.stopContinuousSync(); // Stop continuous sync on logout
    syncService.clearLocalData(); // Clear local data on logout for security/privacy
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      logout();
    };

    window.addEventListener('logout-request', handleLogout);

    return () => {
      window.removeEventListener('logout-request', handleLogout);
    };
  }, [logout]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        handleSync(token); // Trigger sync after initial load if already logged in
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        logout();
      }
    } else {
      setUser(null);
    }
  }, [token, logout, handleSync]);

  const login = (userData, authToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    setUser(userData);
    setToken(authToken);
    handleSync(authToken); // Trigger sync after login
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  return useContext(AuthContext);
};