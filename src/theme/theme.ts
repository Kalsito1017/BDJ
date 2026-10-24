/**
 * Theme assembly: tokens + palettes into one `Theme` value.
 *
 * Dark-mode-ready structure: `lightTheme` and `darkTheme` are both complete
 * `Theme` values; the app currently renders `lightTheme` by default (switching
 * to the system colour scheme is a wiring task for a later phase — the values
 * here already pass the WCAG checks documented in `colors.ts`).
 */
import { darkColors, lightColors, type ColorPalette } from './colors';
import { radii } from './radii';
import { spacing } from './spacing';
import { typography } from './typography';

export interface Theme {
  mode: 'light' | 'dark';
  colors: ColorPalette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  radii,
  typography,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  radii,
  typography,
};
