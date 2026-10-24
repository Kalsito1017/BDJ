/**
 * Corner-radius tokens.
 */
export const radii = {
  /** Inputs, small badges. */
  sm: 6,
  /** Buttons, cards. */
  md: 10,
  /** Dialogs, large cards. */
  lg: 16,
  /** Pill badges (provenance labels). */
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;
