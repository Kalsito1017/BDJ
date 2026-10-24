/**
 * TimeoutState — the request exceeded its timeout budget (DEC-007).
 * Always retryable in the UI: the retry is a fresh, user-initiated request.
 */
import { useTranslation } from '../i18n';

import { StatusMessage } from './StatusMessage';

export interface TimeoutStateProps {
  onRetry?: () => void;
  testID?: string;
}

export function TimeoutState({ onRetry, testID }: TimeoutStateProps) {
  const { t } = useTranslation();
  return (
    <StatusMessage
      actionLabel={onRetry ? t('common.retry') : undefined}
      alert
      message={t('errors.timeout')}
      onAction={onRetry}
      testID={testID}
      title={t('states.timeout')}
    />
  );
}
