import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('admin');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const profile = await authService.getMe();
          setAdmin(profile);
          localStorage.setItem('admin', JSON.stringify(profile));
        } catch (e) {
          console.error("Session verification failed", e);
          logout();
        }
      }
      setLoading(false);
    };
    verifySession();
  }, [token]);

  const login = async (username, password) => {
    const data = await authService.login(username, password);
    setToken(data.access_token);
    localStorage.setItem('token', data.access_token);
    const profile = await authService.getMe();
    setAdmin(profile);
    localStorage.setItem('admin', JSON.stringify(profile));
    return profile;
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
