/**
 * ErrorState — actionable error state (checklist §7: never just "something
 * went wrong").
 *
 * `code` is a `ProviderErrorCode` (src/types/errors.ts, DEC-007) and maps to
 * exactly one localised `errors.*` message via the i18n layer's
 * `ERROR_MESSAGE_KEYS`; raw upstream codes/messages are never rendered
 * (DEC-007).
 */
import { ERROR_MESSAGE_KEYS, useTranslation } from '../i18n';
import type { ProviderErrorCode } from '../types/errors';

import { StatusMessage } from './StatusMessage';

export interface ErrorStateProps {
  /** Which failure happened; defaults to the unclassified fallback. */
  code?: ProviderErrorCode;
  /** Overrides the localised code message (still keep it actionable). */
  message?: string;
  /** Renders the retry action; omission hides the button. */
  onRetry?: () => void;
  testID?: string;
}

export function ErrorState({
  code = 'unknown',
  message,
  onRetry,
  testID,
}: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <StatusMessage
      actionLabel={onRetry ? t('common.retry') : undefined}
      alert
      message={message ?? t(ERROR_MESSAGE_KEYS[code])}
      onAction={onRetry}
      testID={testID}
      title={t('states.error')}
    />
  );
}
