import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || ''; // Use env variable

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        logout();
      }
    } else {
      setUser(null);
    }
  }, [token, logout]);

  const login = (userData, authToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    setUser(userData);
    setToken(authToken);
  };

  const authFetch = useCallback(async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
      logout();
      throw new Error('Sesión expirada o no autorizada.');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorBody.error || `Error en la petición: ${response.statusText}`);
    }

    // Si la respuesta no tiene contenido (ej. 204 No Content), no intentar parsear JSON
    if (response.status === 204) {
        return null;
    }

    return response.json();
  }, [token, logout]);


  const value = {
    user,
    token,
    login,
    logout,
    authFetch, // Expose the new function
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  return useContext(AuthContext);
};