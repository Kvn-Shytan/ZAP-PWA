import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api'; // NEW import

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || ''; // Use env variable

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const fetchCriticalData = useCallback(async () => {
    try {
      // Proactively fetch dashboard data
      await apiFetch('/dashboard');

    } catch (error) {
      console.error('Error proactively caching dashboard data:', error);
    }
    try {
      // Proactively fetch external production orders data (first page)
      await apiFetch('/external-production-orders?page=1&pageSize=25');

    } catch (error) {
      console.error('Error proactively caching external production orders data:', error);
    }
    // Add other critical API calls here
  }, []);


  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
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
        fetchCriticalData(); // NEW: Trigger proactive fetching after initial load if already logged in
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        logout();
      }
    } else {
      setUser(null);
    }
  }, [token, logout, fetchCriticalData]); // Added fetchCriticalData to dependencies

  const login = (userData, authToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    setUser(userData);
    setToken(authToken);
    fetchCriticalData(); // NEW: Trigger proactive fetching after login
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