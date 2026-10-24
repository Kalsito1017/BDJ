/**
 * EmptyState — "no results / nothing here yet" state (checklist §7).
 */
import { useTranslation } from '../i18n';

import { StatusMessage } from './StatusMessage';

export interface EmptyStateProps {
  /** Overrides the generic states.empty message with something specific. */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({ message, actionLabel, onAction, testID }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <StatusMessage
      actionLabel={actionLabel}
      message={message}
      onAction={onAction}
      testID={testID}
      title={t('states.empty')}
    />
  );
}
