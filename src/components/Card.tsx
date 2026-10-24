/**
 * Card — surface container for grouped content.
 *
 * When `accessibilityLabel` is provided the card is exposed to screen
 * readers as one grouped element (`accessibilityRole="summary"`); otherwise
 * it stays a plain layout container so nested text remains individually
 * focusable.
 */
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '../theme';

export interface CardProps {
  children: React.ReactNode;
  /** Groups the card as a single screen-reader element when set. */
  accessibilityLabel?: string;
  style?: ViewProps['style'];
  testID?: string;
}

export function Card({ children, accessibilityLabel, style, testID }: CardProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'summary' : undefined}
      accessible={Boolean(accessibilityLabel)}
      style={[
        styles.base,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.md,
          padding: spacing.lg,
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    borderWidth: 1,
  },
});
