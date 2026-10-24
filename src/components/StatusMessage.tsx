/**
 * StatusMessage — shared layout for empty / error / offline / timeout states.
 *
 * Not exported as a screen-level primitive: the wrappers in this folder
 * (EmptyState, ErrorState, OfflineState, TimeoutState) own their i18n keys
 * (checklist §7: "error messages a user can act on").
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { Button, type ButtonVariant } from './Button';

export interface StatusMessageProps {
  /** Short, actionable heading. */
  title: string;
  /** Optional supporting detail. */
  message?: string;
  /** Optional single action (usually a retry). */
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  /** Marks the block as an alert for screen readers (error-like states). */
  alert?: boolean;
  testID?: string;
}

export function StatusMessage({
  title,
  message,
  actionLabel,
  onAction,
  actionVariant = 'secondary',
  alert = false,
  testID,
}: StatusMessageProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;

  return (
    <View
      accessibilityRole={alert ? 'alert' : undefined}
      accessible={alert}
      style={[styles.wrapper, { padding: spacing.lg }]}
      testID={testID}
    >
      <Text
        style={[
          type.heading,
          { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
        ]}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={[
            type.body,
            {
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: actionLabel && onAction ? spacing.lg : 0,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant={actionVariant} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
