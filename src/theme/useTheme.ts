import { useColorScheme } from 'react-native';

// Encoded from design/specs/global/ui.md; update here if the spec colors change.

const lightPalette = {
  background: '#ffffff',
  surface: '#ffffff',
  textPrimary: '#111111',
  textSecondary: '#555555',
  border: '#dddddd',
};

const darkPalette = {
  background: '#000000',
  surface: '#111111',
  textPrimary: '#eeeeee',
  textSecondary: '#bbbbbb',
  border: '#333333',
};

export type Theme = typeof lightPalette;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return isDark ? darkPalette : lightPalette;
}


