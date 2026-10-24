/**
 * Theme context.
 *
 * `useTheme()` returns `lightTheme` when no provider is mounted, so every
 * component renders standalone (tests need no provider wrapper).
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { darkTheme, lightTheme, type Theme } from './theme';

const ThemeContext = createContext<Theme>(lightTheme);

export interface ThemeProviderProps {
  /** Overrides the theme; when omitted the light theme is used. */
  theme?: Theme;
  children: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const [fallback] = useState(lightTheme);
  const value = useMemo(() => theme ?? fallback, [theme, fallback]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Convenience for screens that want to offer an explicit dark theme later. */
export function getThemeForMode(mode: 'light' | 'dark'): Theme {
  return mode === 'dark' ? darkTheme : lightTheme;
}
