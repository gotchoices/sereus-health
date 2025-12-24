import { useColorScheme } from 'react-native';

export interface Theme {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  bannerError: string;

  // Accents (not in ui.md but required for semantic badges/actions)
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
  accentActivity: '#5FA3EE',
  accentCondition: '#FFB84D',
  accentOutcome: '#8FE635',
  accentPrimary: '#5FA3EE',
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export const typography = {
  title: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};

export const spacing = [4, 8, 12, 16, 20, 24] as const;


