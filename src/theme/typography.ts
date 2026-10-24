/**
 * Typography scale.
 *
 * Font family: the platform system font (San Francisco / Roboto). Both cover
 * Bulgarian Cyrillic out of the box, so no custom font is bundled — Cyrillic
 * renders with full glyph coverage and no font-loading flash.
 *
 * Font scaling: text styles deliberately set NO `maxFontSizeMultiplier` —
 * every `Text` honours the user's system font scale (plan.md §8,
 * addbeforerelease.txt §10 "dynamic font scaling"). Layouts must therefore
 * size themselves from content (padding + `minHeight`, never fixed heights)
 * and let long strings wrap (`flexShrink: 1` on text containers).
 */
import type { TextStyle } from 'react-native';

/** Font sizes in dp. Scaled by the OS font-scale setting at runtime. */
export const fontSizes = {
  /** Captions, badge text. */
  xs: 12,
  /** Secondary labels. */
  sm: 14,
  /** Body text default. */
  md: 16,
  /** Emphasised body / button labels. */
  lg: 18,
  /** Section headings. */
  xl: 22,
  /** Screen titles. */
  xxl: 28,
} as const;

export type FontSizeToken = keyof typeof fontSizes;

/**
 * Line heights paired 1:1 with `fontSizes`. They scale with the font size
 * because nothing caps `allowFontScaling`.
 */
export const lineHeights = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 26,
  xl: 30,
  xxl: 36,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Named text styles. `letterSpacing` stays 0: tracked-out text is harder to
 * read in Cyrillic and breaks long-station-name layouts (plan.md §8).
 */
export const typography = {
  /** Onboarding headline / hero copy. */
  display: {
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    fontWeight: fontWeights.bold,
    letterSpacing: 0,
  },
  /** Screen title (role="header"). */
  title: {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0,
  },
  /** Card/section heading. */
  heading: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0,
  },
  /** Default body copy. */
  body: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },
  /** Dense body (lists, captions with extra info). */
  bodySmall: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },
  /** Form-label text above/next to inputs. */
  label: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.medium,
    letterSpacing: 0,
  },
  /** Button labels. */
  button: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0,
  },
  /** Badge / pill text (provenance labels). */
  caption: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0,
  },
} as const;

export type TypographyToken = keyof typeof typography;

/** Convenience type: every entry above is a valid React Native text style. */
export type TypographyStyle = TextStyle;
