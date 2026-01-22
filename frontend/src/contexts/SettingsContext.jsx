import React, { createContext, useContext, useState, useEffect } from 'react';
import { getJSON, setJSON } from '../utils/storage';

const STORAGE_KEY = 'app.settings.v1';

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: 'green', // green, blue, purple, red, orange
  kurdPrefixEnabled: true,
  idLength: 8,
  debugMode: false,
  logLevel: 'error' // error, warn, info
};

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    // Load from localStorage on initialization
    const stored = getJSON(STORAGE_KEY, null);
    return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
  });

  // Persist to localStorage whenever settings change
  useEffect(() => {
    setJSON(STORAGE_KEY, settings);
  }, [settings]);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Accent color (using CSS variables)
    const accentColors = {
      green: '#22c55e',
      blue: '#3b82f6',
      purple: '#a855f7',
      red: '#ef4444',
      orange: '#f97316'
    };
    
    root.style.setProperty('--primary-color', accentColors[settings.accent] || accentColors.green);
  }, [settings.theme, settings.accent]);

  const setTheme = (theme) => {
    setSettings((prev) => ({ ...prev, theme }));
  };

  const setAccent = (accent) => {
    setSettings((prev) => ({ ...prev, accent }));
  };

  const setKurdPrefixEnabled = (enabled) => {
    setSettings((prev) => ({ ...prev, kurdPrefixEnabled: enabled }));
  };

  const setIdLength = (length) => {
    setSettings((prev) => ({ ...prev, idLength: length }));
  };

  const setDebugMode = (enabled) => {
    setSettings((prev) => ({ ...prev, debugMode: enabled }));
  };

  const setLogLevel = (level) => {
    setSettings((prev) => ({ ...prev, logLevel: level }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const value = {
    settings,
    setTheme,
    setAccent,
    setKurdPrefixEnabled,
    setIdLength,
    setDebugMode,
    setLogLevel,
    resetSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
