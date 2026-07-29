import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme_preference') || 'light');
  const { user, updateLocalTheme } = useAuth() || {};

  // Sync state with authenticated user's preference on load/login
  useEffect(() => {
    if (user && user.themePreference) {
      setTheme(user.themePreference);
      localStorage.setItem('theme_preference', user.themePreference);
    }
  }, [user]);

  // Handle HTML document root class toggle
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme_preference', nextTheme);

    // Sync preference locally and with backend if authenticated
    if (user) {
      if (updateLocalTheme) {
        updateLocalTheme(nextTheme);
      }
      try {
        await api.put('/auth/theme', { theme: nextTheme });
      } catch (err) {
        console.error('Failed to sync theme preference to database:', err);
      }
    }
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark'
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
