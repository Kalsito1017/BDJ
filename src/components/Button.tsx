/**
 * Button — the app's single button primitive.
 *
 * Accessibility (addbeforerelease.txt §10):
 * - `accessibilityRole="button"` and `accessibilityState` for disabled/busy.
 * - Minimum 44x44 dp touch target (WCAG 2.5.5 / plan.md §8) — enforced by
 *   `minHeight`/`minWidth`, and the target grows with the system font scale.
 * - The label is the accessible name; callers may override it (e.g. when the
 *   visible label is a short word but a fuller phrase helps screen readers).
 */
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

export interface ButtonProps {
  /** Visible button label (also the accessible name unless overridden). */
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Shows a spinner and marks the control busy; presses are ignored. */
  loading?: boolean;
  /** Optional screen-reader-only override of the accessible name. */
  accessibilityLabel?: string;
  /** Optional screen-reader hint (use a11y.* keys at the call site). */
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;

  const isDisabled = disabled || loading;

  const palette: Record<ButtonVariant, { fill: string; text: string; border: string }> = {
    primary: { fill: colors.primary, text: colors.textInverse, border: colors.primary },
    secondary: {
      fill: colors.surface,
      text: colors.tint,
      border: colors.borderStrong,
    },
    destructive: { fill: colors.error, text: colors.onError, border: colors.error },
    ghost: { fill: 'transparent', text: colors.tint, border: 'transparent' },
  };
  const chosen = palette[variant];

  const containerStyle: ViewStyle[] = [
    styles.base,
    {
      backgroundColor:
        isDisabled && variant !== 'ghost' ? colors.surfaceAlt : chosen.fill,
      borderColor: isDisabled ? colors.border : chosen.border,
      borderRadius: radii.md,
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed &&
          !isDisabled && {
            backgroundColor:
              chosen.fill === colors.primary ? colors.primaryPressed : colors.surfaceAlt,
          },
      ]}
      testID={testID}
    >
      {loading ? (
        // Decorative spinner: the button announces itself as `busy`
        // (accessibilityState) instead of exposing an extra unnamed element.
        <ActivityIndicator
          accessibilityElementsHidden
          color={variant === 'ghost' ? colors.tint : chosen.text}
          importantForAccessibility="no"
        />
      ) : (
        <Text
          style={[
            type.button,
            styles.label,
            { color: isDisabled ? colors.textDisabled : chosen.text },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  label: {
    textAlign: 'center',
    flexShrink: 1,
  },
});
