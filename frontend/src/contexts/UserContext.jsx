import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const UserContext = createContext(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

const applyBrandingSettings = async (token) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api'}/admin/settings`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) return;

    const settings = await response.json();
    document.documentElement.style.setProperty('--primary-color', settings.primary_color || '#22c55e');
    document.documentElement.style.setProperty('--secondary-color', settings.secondary_color || '#1e293b');
  } catch (_) {
    // Silent by design
  }
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        applyBrandingSettings(token);
      } catch (_) {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    await applyBrandingSettings(token);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    role: user?.role || 'user',
    login,
    logout,
    loading
  }), [user, login, logout, loading]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
