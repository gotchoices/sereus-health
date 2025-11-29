import { useColorScheme } from 'react-native';

/**
 * Theme colors for light and dark modes
 * Based on design/specs/global/ui.md
 */

export interface Theme {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  bannerError: string;
  // Accent colors for type badges, icons, etc.
  accentActivity: string;
  accentCondition: string;
  accentOutcome: string;
  accentPrimary: string;  // For primary actions (+ button, etc.)
}

const lightTheme: Theme = {
  background: '#ffffff',
  surface: '#ffffff',
  textPrimary: '#111111',
  textSecondary: '#555555',
  border: '#dddddd',
  bannerError: '#ffeeee',
  // Accent colors (semantic, not in ui.md but needed for badges/icons)
  accentActivity: '#4A90E2',    // Blue
  accentCondition: '#F5A623',   // Orange
  accentOutcome: '#7ED321',     // Green
  accentPrimary: '#4A90E2',     // Blue
};

const darkTheme: Theme = {
  background: '#000000',
  surface: '#111111',
  textPrimary: '#eeeeee',
  textSecondary: '#bbbbbb',
  border: '#333333',
  bannerError: '#330000',
  // Accent colors (slightly adjusted for dark mode visibility)
  accentActivity: '#5FA3EE',
  accentCondition: '#FFB84D',
  accentOutcome: '#8FE635',
  accentPrimary: '#5FA3EE',
};

/**
 * Returns the current theme based on system appearance
 * Follows design/specs/global/general.md: "default to device's system appearance"
 */
export function useTheme(): Theme {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}

/**
 * Typography scale based on design/specs/global/ui.md
 */
export const typography = {
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
};

/**
 * Spacing scale based on design/specs/global/ui.md
 * Usage: spacing[0] = 4, spacing[1] = 8, ..., spacing[5] = 24
 */
export const spacing = [4, 8, 12, 16, 20, 24] as const;
