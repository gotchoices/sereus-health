import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Theme {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  bannerError: string;
  error: string;
  accentActivity: string;
  accentCondition: string;
  accentOutcome: string;
  accentPrimary: string;
}

const lightTheme: Theme = {
  background: '#ffffff',
  surface: '#ffffff',
  textPrimary: '#111111',
  textSecondary: '#555555',
  border: '#dddddd',
  bannerError: '#ffeeee',
  error: '#D32F2F',
  accentActivity: '#4A90E2',
  accentCondition: '#F5A623',
  accentOutcome: '#7ED321',
  accentPrimary: '#4A90E2',
};

const darkTheme: Theme = {
  background: '#000000',
  surface: '#111111',
  textPrimary: '#eeeeee',
  textSecondary: '#bbbbbb',
  border: '#333333',
  bannerError: '#330000',
  error: '#EF5350',
  accentActivity: '#5FA3EE',
  accentCondition: '#FFB84D',
  accentOutcome: '#8FE635',
  accentPrimary: '#5FA3EE',
};

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@sereus_health:theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeModeState(stored);
        }
      } catch (e) {
        console.warn('Failed to load theme preference:', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Save theme preference when it changes
  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  // Compute effective theme
  const effectiveScheme =
    themeMode === 'system'
      ? systemColorScheme ?? 'light'
      : themeMode;

  const theme = effectiveScheme === 'dark' ? darkTheme : lightTheme;

  // Don't render until theme preference is loaded to avoid flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}

