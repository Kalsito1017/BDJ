/**
 * RequestErrorState — maps a failed request to the right state component
 * (checklist §7: empty/loading/error/offline/timeout/retry on every screen).
 *
 * Timeout and offline get their dedicated states; every other failure is an
 * actionable `ErrorState` keyed by `ProviderErrorCode` through the i18n
 * `ERROR_MESSAGE_KEYS` map (DEC-007: raw upstream codes are never rendered).
 * The error is taken as `unknown` and its code extracted defensively: this
 * component must not crash on a malformed error object (rule 6 / plan.md §9
 * Phase 4 "no provider failure crashes the app").
 */
import type { ProviderErrorCode } from '../types/errors';

import { ErrorState } from './ErrorState';
import { OfflineState } from './OfflineState';
import { TimeoutState } from './TimeoutState';

const PROVIDER_ERROR_CODES: readonly ProviderErrorCode[] = [
  'timeout',
  'cancelled',
  'offline',
  'network',
  'rate_limited',
  'upstream_error',
  'invalid_response',
  'not_found',
  'conflict',
  'forbidden',
  'unsupported',
  'unknown',
];

/** Defensive `ProviderError.code` extraction; `unknown` when unclassifiable. */
export function providerErrorCode(error: unknown): ProviderErrorCode {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (
      typeof code === 'string' &&
      (PROVIDER_ERROR_CODES as readonly string[]).includes(code)
    ) {
      return code as ProviderErrorCode;
    }
  }
  return 'unknown';
}

export interface RequestErrorStateProps {
  /** The failed request's error (`ProviderError` or anything else). */
  error: unknown;
  /** Retry action; omit to render the state without a retry button. */
  onRetry?: () => void;
  testID?: string;
}

export function RequestErrorState({ error, onRetry, testID }: RequestErrorStateProps) {
  const code = providerErrorCode(error);
  if (code === 'timeout') return <TimeoutState onRetry={onRetry} testID={testID} />;
  if (code === 'offline') return <OfflineState onRetry={onRetry} testID={testID} />;
  return <ErrorState code={code} onRetry={onRetry} testID={testID} />;
}
