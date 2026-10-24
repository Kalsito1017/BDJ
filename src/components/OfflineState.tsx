/**
 * OfflineState — the device has no connectivity (checklist §7).
 *
 * Never claims what data would have been shown: the caller decides whether
 * cached/stale content is displayed alongside, and labels it (DEC-006).
 */
import { useTranslation } from '../i18n';

import { StatusMessage } from './StatusMessage';

export interface OfflineStateProps {
  onRetry?: () => void;
  testID?: string;
}

export function OfflineState({ onRetry, testID }: OfflineStateProps) {
  const { t } = useTranslation();
  return (
    <StatusMessage
      actionLabel={onRetry ? t('common.retry') : undefined}
      alert
      message={t('errors.offline')}
      onAction={onRetry}
      testID={testID}
      title={t('states.offline')}
    />
  );
}
