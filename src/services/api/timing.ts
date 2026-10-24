/**
 * Timing primitives for provider calls (DEC-007): abortable delay and the
 * bounded-retry backoff calculation (exponential, capped, jittered).
 *
 * The backoff calculation is a pure function with injected randomness so the
 * retry behaviour is deterministic and unit-testable — no `Math.random()`
 * anywhere near returned results (Appendix A.6).
 */

import type { RetryPolicy } from '../common/RequestOptions';
import { createProviderError } from './providerErrors';

/**
 * Resolve after `ms`, rejecting early with `ProviderError { code: 'cancelled' }`
 * when `signal` aborts. The underlying timer is always cleared, so no timer
 * outlives its promise (no open handles in Jest, no wake-ups after unmount).
 */
export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createProviderError('cancelled', 'The request was aborted by the caller.'));
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(createProviderError('cancelled', 'The request was aborted by the caller.'));
    };
    const timer = setTimeout(
      () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      },
      Math.max(0, ms),
    );
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Backoff delay before the attempt following `failedAttempt` (1-based):
 * `min(maxDelayMs, baseDelayMs * 2^(failedAttempt-1))`, then jittered:
 * - 'none':  full computed delay
 * - 'equal': half fixed + half random (AWS "equal jitter")
 * - 'full':  entirely random within the computed delay (DEC-007 default)
 *
 * `random` is injected (0 <= random() < 1) so tests are deterministic.
 */
export function computeBackoffDelayMs(
  policy: RetryPolicy,
  failedAttempt: number,
  random: () => number = Math.random,
): number {
  const exponent = Math.max(0, failedAttempt - 1);
  const uncapped = policy.baseDelayMs * 2 ** exponent;
  const capped = Math.min(policy.maxDelayMs, uncapped);
  switch (policy.jitter) {
    case 'none':
      return capped;
    case 'equal':
      return capped / 2 + random() * (capped / 2);
    case 'full':
      return random() * capped;
  }
}
