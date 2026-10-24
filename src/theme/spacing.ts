/**
 * Spacing scale (density-independent pixels).
 *
 * Layout uses these tokens instead of magic numbers so screens stay
 * consistent and predictable when text scales (plan.md §8: dynamic text
 * sizing; long Bulgarian strings must wrap, never clip).
 */
export const spacing = {
  /** 2 — hairline gaps (icon/label micro alignment). */
  xxs: 2,
  /** 4 — tight gaps inside a control. */
  xs: 4,
  /** 8 — default small gap. */
  sm: 8,
  /** 12 — control padding, row gaps. */
  md: 12,
  /** 16 — card padding, screen gutter. */
  lg: 16,
  /** 24 — section separation. */
  xl: 24,
  /** 32 — large separation. */
  xxl: 32,
} as const;

export type SpacingToken = keyof typeof spacing;
