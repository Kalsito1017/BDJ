/**
 * ConfirmDialog — confirmation pattern for destructive actions
 * (plan.md §8 "Add confirmation for destructive actions such as clearing
 * saved items"; checklist §7/§10).
 *
 * Ready for Phase 5 favourites (clear/delete). The confirm button uses the
 * destructive variant by default when `destructive` is set, and the dialog
 * never performs the action itself — it only calls back.
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  /** Short question, e.g. "Remove this favourite?" (caller-owned i18n key). */
  title: string;
  /** Optional explanation of what will happen. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styling + default label for irreversible actions (delete/clear). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
  testID,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;
  const { t } = useTranslation();

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={[styles.backdrop, { backgroundColor: colors.backdrop }]}>
        <View
          accessibilityLabel={title}
          accessibilityRole="alert"
          accessibilityViewIsModal
          accessible
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: spacing.xl,
              gap: spacing.md,
            },
          ]}
          testID={testID}
        >
          <Text
            accessibilityRole="header"
            style={[type.heading, { color: colors.textPrimary }]}
          >
            {title}
          </Text>
          {message ? (
            <Text style={[type.body, { color: colors.textSecondary }]}>{message}</Text>
          ) : null}
          <View style={[styles.actions, { gap: spacing.md }]}>
            <Button
              label={cancelLabel ?? t('common.cancel')}
              onPress={onCancel}
              testID={testID ? `${testID}-cancel` : undefined}
              variant="secondary"
            />
            <Button
              label={
                confirmLabel ?? (destructive ? t('common.delete') : t('common.confirm'))
              }
              onPress={onConfirm}
              testID={testID ? `${testID}-confirm` : undefined}
              variant={destructive ? 'destructive' : 'primary'}
            />
          </View>
          <Pressable
            accessibilityLabel={t('common.close')}
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.close}
            testID={testID ? `${testID}-close` : undefined}
          >
            <Text style={[type.label, { color: colors.tint }]}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    alignSelf: 'stretch',
    maxWidth: 480,
    width: '100%',
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  close: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
});
