/**
 * The single timeout / cancellation / bounded-retry executor for provider
 * calls (DEC-007: "Timeouts/cancellation/retries have one implementation,
 * one test surface"). It consumes `RequestOptions`
 * (src/services/common/RequestOptions.ts) and guarantees:
 *
 *  - every rejection is a `ProviderError` (src/types/errors.ts) — thrown
 *    values are normalised, never propagated raw;
 *  - a per-attempt timeout budget rejects with `code: 'timeout'`;
 *  - an aborted `AbortSignal` rejects promptly with `code: 'cancelled'`
 *    (also during backoff sleeps), and cancellation is never retried;
 *  - automatic retries happen only for idempotent reads, only for the codes
 *    in `RetryPolicy.retryOn`, at most `maxAttempts` total attempts, with
 *    exponential backoff + jitter (see `computeBackoffDelayMs`).
 *
 * The operation receives a per-attempt `AbortSignal` so its own work (network
 * request, simulated latency) can be torn down when the attempt times out or
 * is cancelled — no orphaned timers.
 *
 * Transport-agnostic: no fetch, no endpoints. There is no approved live data
 * source (DEC-002) and no backend (DEC-003); this module only orchestrates
 * whichever operation a provider implementation hands it.
 */

import {
  DEFAULT_READ_RETRY_POLICY,
  DEFAULT_TIMEOUTS_MS,
  type RequestOptions,
} from '../common/RequestOptions';
import { abortableDelay, computeBackoffDelayMs } from './timing';
import { createProviderError, toProviderError } from './providerErrors';

/** Injectable side effects — tests supply deterministic clock/randomness. */
export interface RequestExecutorDeps {
  /** Clock used for `ProviderError.occurredAt`. Defaults to the real clock. */
  now?: () => Date;
  /** Jitter source (0 <= random() < 1). Not used in results (Appendix A.6). */
  random?: () => number;
}

function runAttempt<T>(
  operation: (attemptSignal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  outerSignal: AbortSignal | undefined,
  now: () => Date,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const attemptController = new AbortController();
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onOuterAbort = (): void => {
      attemptController.abort();
      settle(() =>
        reject(
          createProviderError('cancelled', 'The request was aborted by the caller.', {
            now,
          }),
        ),
      );
    };

    const cleanup = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      outerSignal?.removeEventListener('abort', onOuterAbort);
    };

    /** First settlement wins; later races (e.g. a late rejection) are ignored. */
    const settle = (finish: () => void): void => {
      if (settled) return;
      settled = true;
      cleanup();
      finish();
    };

    if (outerSignal?.aborted) {
      attemptController.abort();
      onOuterAbort();
      return;
    }
    outerSignal?.addEventListener('abort', onOuterAbort);

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        attemptController.abort();
        settle(() =>
          reject(
            createProviderError(
              'timeout',
              `The request exceeded its timeout budget (${timeoutMs} ms).`,
              { now },
            ),
          ),
        );
      }, timeoutMs);
    }

    operation(attemptController.signal).then(
      (value) => settle(() => resolve(value)),
      (error: unknown) => settle(() => reject(toProviderError(error, now))),
    );
  });
}

/**
 * Run an idempotent read operation under the timeout/cancel/retry contract.
 *
 * Defaults: `DEFAULT_TIMEOUTS_MS.read` per attempt and
 * `DEFAULT_READ_RETRY_POLICY` (3 attempts, 300 ms base, 5 s cap, full jitter,
 * retry on timeout/network/upstream_error/rate_limited). Ticketing operations
 * must pass `NO_AUTO_RETRY_POLICY` (DEC-008) and never use this helper's
 * defaults.
 */
export async function executeRead<T>(
  operation: (attemptSignal: AbortSignal) => Promise<T>,
  options: RequestOptions = {},
  deps: RequestExecutorDeps = {},
): Promise<T> {
  const now = deps.now ?? (() => new Date());
  const random = deps.random ?? Math.random;
  const policy = options.retry ?? DEFAULT_READ_RETRY_POLICY;
  const maxAttempts = Math.max(1, policy.maxAttempts);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUTS_MS.read;
  const outerSignal = options.signal;

  if (outerSignal?.aborted) {
    throw createProviderError('cancelled', 'The request was aborted by the caller.', {
      now,
    });
  }

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await runAttempt(operation, timeoutMs, outerSignal, now);
    } catch (error: unknown) {
      const providerError = toProviderError(error, now);
      const retryable =
        providerError.code !== 'cancelled' &&
        policy.retryOn.includes(providerError.code) &&
        attempt < maxAttempts;
      if (!retryable) throw providerError;
      await abortableDelay(computeBackoffDelayMs(policy, attempt, random), outerSignal);
    }
  }
}
