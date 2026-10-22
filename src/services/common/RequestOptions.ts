/**
 * Cross-provider request options and retry policy (DEC-007).
 *
 * Contract for every provider call:
 *  - TIMEOUT: each call has a timeout budget; exceeding it rejects with
 *    `ProviderError { code: 'timeout' }`. Defaults are spec values; the
 *    product owner may adjust them.
 *  - CANCELLATION: every method accepts an `AbortSignal`. Aborting rejects
 *    with `ProviderError { code: 'cancelled' }`. Navigation away from a
 *    search MUST abort the in-flight request.
 *  - BOUNDED RETRIES: only idempotent reads are retried automatically;
 *    never state-changing ticketing operations (those rely on idempotency
 *    keys and explicit user action instead). Retries use exponential
 *    backoff with jitter and are capped by `maxAttempts`.
 *
 * Spec-only file: no logic, no imports beyond types.
 */

import type { ProviderErrorCode } from '../../types/errors';

export interface RetryPolicy {
  /** Total attempts including the first one. `1` disables retry. */
  maxAttempts: number;
  /** Base delay for exponential backoff. */
  baseDelayMs: number;
  /** Upper bound for a single backoff delay. */
  maxDelayMs: number;
  /** Jitter strategy to avoid thundering herds. */
  jitter: 'none' | 'equal' | 'full';
  /** Only these error codes are retried. Empty array disables retry. */
  retryOn: readonly ProviderErrorCode[];
}

export interface RequestOptions {
  /** Caller-controlled cancellation. */
  signal?: AbortSignal;
  /** Per-attempt timeout budget in ms. */
  timeoutMs?: number;
  /** Bounded retry configuration for idempotent reads. */
  retry?: RetryPolicy;
  /** Correlation id for logs/traces (addbeforerelease.txt section 12). Never a secret. */
  correlationId?: string;
}

/** Spec defaults (to be applied by the service implementations in Phase 4). */
export const DEFAULT_READ_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 5_000,
  jitter: 'full',
  retryOn: ['timeout', 'network', 'upstream_error', 'rate_limited'],
};

export const DEFAULT_TIMEOUTS_MS = {
  /** Station directory / small reads. */
  read: 10_000,
  /** Journey search. */
  search: 15_000,
  /** Ticketing operations — never retried automatically (DEC-008). */
  ticketing: 30_000,
} as const;

/** Ticketing calls use this policy: no automatic retries; idempotency keys and
 *  explicit user action handle duplicates (DEC-008). */
export const NO_AUTO_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 1,
  baseDelayMs: 0,
  maxDelayMs: 0,
  jitter: 'none',
  retryOn: [],
};
