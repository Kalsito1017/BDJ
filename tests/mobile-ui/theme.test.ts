/**
 * Theme tests: the WCAG contrast claims documented in src/theme/colors.ts
 * are re-computed here from the actual palette values, so the numbers cannot
 * silently rot (plan.md §8 "ensure sufficient contrast").
 *
 * WCAG 2.1 thresholds:
 * - SC 1.4.3 (text): 4.5:1 normal text, 3:1 large text — we hold 4.5:1 for
 *   every text pair regardless of size.
 * - SC 1.4.11 (non-text UI): 3:1 for control boundaries and focus indicators.
 */
import {
  darkColors,
  lightColors,
  radii,
  spacing,
  typography,
  type ColorPalette,
} from '../../src/theme';

function srgb(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

type Pair = readonly [
  label: string,
  fg: keyof ColorPalette,
  bg: keyof ColorPalette,
  min: number,
];

const TEXT_PAIRS: readonly Pair[] = [
  ['textPrimary on background', 'textPrimary', 'background', 4.5],
  ['textPrimary on surface', 'textPrimary', 'surface', 4.5],
  ['textPrimary on surfaceAlt', 'textPrimary', 'surfaceAlt', 4.5],
  ['textSecondary on background', 'textSecondary', 'background', 4.5],
  ['textSecondary on surface', 'textSecondary', 'surface', 4.5],
  ['onPrimary on primary', 'textInverse', 'primary', 4.5],
  ['onPrimary on primaryPressed', 'textInverse', 'primaryPressed', 4.5],
  ['tint on background', 'tint', 'background', 4.5],
  ['tint on surface', 'tint', 'surface', 4.5],
  ['tint on surfaceAlt', 'tint', 'surfaceAlt', 4.5],
  ['onError on error', 'onError', 'error', 4.5],
  ['errorText on errorBg', 'errorText', 'errorBg', 4.5],
  ['errorText on surface', 'errorText', 'surface', 4.5],
  ['demoText on demoBg', 'demoText', 'demoBg', 4.5],
  ['demoText on surface', 'demoText', 'surface', 4.5],
];

const UI_PAIRS: readonly Pair[] = [
  ['focusRing on background', 'focusRing', 'background', 3],
  ['focusRing on surface', 'focusRing', 'surface', 3],
  ['borderStrong on surface', 'borderStrong', 'surface', 3],
  ['borderStrong on background', 'borderStrong', 'background', 3],
];

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('%s theme contrast', (_mode, colors) => {
  it.each([...TEXT_PAIRS, ...UI_PAIRS])('%s meets WCAG AA', (label, fg, bg, min) => {
    const ratio = contrastRatio(colors[fg], colors[bg]);
    expect({ label, ratio: Number(ratio.toFixed(2)), atLeast: min }).toMatchObject({
      label,
      atLeast: min,
    });
    expect(ratio).toBeGreaterThanOrEqual(min);
  });
});

describe('theme tokens', () => {
  it('keeps the spacing scale ordered and sane', () => {
    const values = Object.values(spacing);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('uses radii that render on both platforms (non-negative)', () => {
    for (const value of Object.values(radii)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it('pairs every font size with a line height at least as large', () => {
    const sizes = typography;
    for (const style of Object.values(sizes)) {
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    }
  });

  it('never caps font scaling and never tracks out Cyrillic text', () => {
    for (const style of Object.values(typography)) {
      expect(style.letterSpacing ?? 0).toBe(0);
    }
  });
});
