/**
 * Colour palettes (light + dark).
 *
 * WCAG 2.1 contrast (computed with /tmp contrast script and re-verified by
 * tests/mobile-ui/theme.test.ts — ratios below are the real computed values):
 *
 * LIGHT (minimum required in brackets):
 *   textPrimary/background   15.06:1 [4.5]   textPrimary/surface      16.17:1 [4.5]
 *   textPrimary/surfaceAlt   14.03:1 [4.5]   textSecondary/background   6.94:1 [4.5]
 *   textSecondary/surface     7.45:1 [4.5]   onPrimary/primary          8.16:1 [4.5]
 *   onPrimary/primaryPressed 10.64:1 [4.5]   tint/background            7.60:1 [4.5]
 *   tint/surface              8.16:1 [4.5]   tint/surfaceAlt            7.08:1 [4.5]
 *   onError/error             6.54:1 [4.5]   errorText/errorBg          7.90:1 [4.5]
 *   errorText/surface         9.11:1 [4.5]   demoText/demoBg            7.61:1 [4.5]
 *   demoText/surface          8.40:1 [4.5]   focusRing/background       5.95:1 [3]
 *   focusRing/surface         6.39:1 [3]     borderStrong/surface       4.53:1 [3]
 *   borderStrong/background   4.22:1 [3]
 *
 * DARK:
 *   textPrimary/background   16.14:1 [4.5]   textPrimary/surface      14.56:1 [4.5]
 *   textPrimary/surfaceAlt   12.70:1 [4.5]   textSecondary/background  10.28:1 [4.5]
 *   textSecondary/surface     9.27:1 [4.5]   onPrimary/primary          5.66:1 [4.5]
 *   onPrimary/primaryPressed  7.84:1 [4.5]   tint/background            8.61:1 [4.5]
 *   tint/surface              7.77:1 [4.5]   tint/surfaceAlt            6.78:1 [4.5]
 *   onError/error             6.14:1 [4.5]   errorText/errorBg          9.27:1 [4.5]
 *   errorText/surface         9.68:1 [4.5]   demoText/demoBg            8.44:1 [4.5]
 *   demoText/surface         10.16:1 [4.5]   focusRing/background       8.61:1 [3]
 *   focusRing/surface         7.77:1 [3]     borderStrong/surface       3.40:1 [3]
 *   borderStrong/background   3.77:1 [3]
 *
 * `border` is decorative (card dividers) and intentionally below 3:1;
 * `borderStrong` outlines interactive controls and meets the 3:1 non-text
 * requirement (WCAG 2.1 SC 1.4.11).
 */

export interface ColorPalette {
  /** App background behind cards/sheets. */
  background: string;
  /** Card / dialog / input surface. */
  surface: string;
  /** Subtle secondary surface (skeletons, pressed rows). */
  surfaceAlt: string;
  /** Primary body text. */
  textPrimary: string;
  /** Secondary text (labels, captions, hints). */
  textSecondary: string;
  /** Disabled/de-emphasised text (non-essential UI only). */
  textDisabled: string;
  /** Text on solid accent fills (buttons). */
  textInverse: string;
  /** Solid accent fill (primary buttons). */
  primary: string;
  /** Accent fill while pressed. */
  primaryPressed: string;
  /** Accent text on `background`/`surface` (links, active tab tint). */
  tint: string;
  /** Decorative border/divider colour (not a control boundary). */
  border: string;
  /** Border colour for interactive controls (inputs) — meets 3:1. */
  borderStrong: string;
  /** Focus indicator colour — meets 3:1 against both main backgrounds. */
  focusRing: string;
  /** Solid destructive/error fill (destructive button, error badge). */
  error: string;
  /** Text on `error` fill. */
  onError: string;
  /** Inline error banner background. */
  errorBg: string;
  /** Inline error banner text. */
  errorText: string;
  /** Demo-data label/banner background (DEC-006 rule: demo stays visible). */
  demoBg: string;
  /** Demo-data label/banner text. */
  demoText: string;
  /** Demo-data label/banner border. */
  demoBorder: string;
  /** Modal backdrop scrim (non-text; no contrast requirement). */
  backdrop: string;
}

export const lightColors: ColorPalette = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEFF4',
  textPrimary: '#1B212B',
  textSecondary: '#4C5663',
  textDisabled: '#6E7784',
  textInverse: '#FFFFFF',
  primary: '#14508F',
  primaryPressed: '#0F3F72',
  tint: '#14508F',
  border: '#C4CBD4',
  borderStrong: '#6E7784',
  focusRing: '#0B57D0',
  error: '#B3261E',
  onError: '#FFFFFF',
  errorBg: '#FCEBEA',
  errorText: '#8C1D18',
  demoBg: '#FFF3D6',
  demoText: '#6B4600',
  demoBorder: '#E0B656',
  backdrop: 'rgba(0, 0, 0, 0.45)',
};

export const darkColors: ColorPalette = {
  background: '#12161C',
  surface: '#1A2029',
  surfaceAlt: '#232B36',
  textPrimary: '#EEF2F7',
  textSecondary: '#BAC4D0',
  textDisabled: '#8A94A1',
  textInverse: '#FFFFFF',
  primary: '#2E66B8',
  primaryPressed: '#24528F',
  tint: '#8AB4F8',
  border: '#39424E',
  borderStrong: '#69737F',
  focusRing: '#8AB4F8',
  error: '#E57373',
  onError: '#2A0A08',
  errorBg: '#3A1A17',
  errorText: '#F3B9B5',
  demoBg: '#3A2C0A',
  demoText: '#F0C674',
  demoBorder: '#6B5312',
  backdrop: 'rgba(0, 0, 0, 0.60)',
};
