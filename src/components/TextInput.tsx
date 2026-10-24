/**
 * TextInput — labelled text field with inline validation message.
 *
 * Accessibility (addbeforerelease.txt §7/§8, plan.md §8):
 * - Visible label is the field's accessible name (`accessibilityLabel`).
 * - Validation message is announced politely and surfaced as the hint;
 *   typed values are never cleared when validation fails (checklist §7) —
 *   the component is controlled and callers keep their state.
 * - Required fields point at `validation.required` for screen readers
 *   instead of relying on the visual asterisk.
 * - Minimum 44 dp control height; grows with the system font scale.
 */
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { useTheme } from '../theme';
import { useTranslation } from '../i18n';

export interface TextInputProps {
  /** Visible field label (used as the accessible name). */
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Actionable validation message (validation.* / errors.* keys at call sites). */
  error?: string;
  /** Extra hint for screen readers (a11y.* keys at the call site). */
  hint?: string;
  required?: boolean;
  editable?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: RNTextInputProps['autoCapitalize'];
  testID?: string;
}

export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  required = false,
  editable = true,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  testID,
}: TextInputProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;
  const { t } = useTranslation();

  const accessibilityHint =
    error ?? hint ?? (required ? t('validation.required') : undefined);

  return (
    <View style={[styles.wrapper, { marginBottom: spacing.md }]}>
      <Text
        style={[type.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}
      >
        {label}
        {required ? <Text style={{ color: colors.errorText }}> *</Text> : null}
      </Text>
      <RNTextInput
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !editable }}
        autoCapitalize={autoCapitalize}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        secureTextEntry={secureTextEntry}
        style={[
          type.body,
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.borderStrong,
            borderRadius: radii.sm,
            color: colors.textPrimary,
            minHeight: 44,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
        testID={testID}
        value={value}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[type.bodySmall, { color: colors.errorText, marginTop: spacing.xs }]}
          testID={testID ? `${testID}-error` : undefined}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
  },
  input: {
    borderWidth: 1,
    textAlignVertical: 'center',
  },
});
