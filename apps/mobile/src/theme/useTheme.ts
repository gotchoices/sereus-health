import { useThemeContext as useThemeCtx } from './ThemeProvider';

export type { Theme, ThemeMode } from './ThemeProvider';
export { ThemeProvider, useThemeContext } from './ThemeProvider';

export function useTheme() {
  return useThemeCtx().theme;
}

export const typography = {
  title: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};

export const spacing = [4, 8, 12, 16, 20, 24] as const;


