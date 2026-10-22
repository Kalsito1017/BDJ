/**
 * Provider/service error model — discriminated by `code`.
 *
 * Contract (DEC-007): provider methods reject with `ProviderError`
 * (never with bare `Error`, strings, or provider-native error objects).
 * Provider-specific error payloads are mapped inside `services/`;
 * `upstreamCode`/`upstreamMessage` carry the raw values for diagnostics
 * only and MUST NOT be rendered to users verbatim or logged with PII.
 *
 * UI mapping requirement (addbeforerelease.txt section 7): every code
 * maps to a localised, actionable message — never "something went wrong".
 */

import type { ISODateTime } from './common';

export type ProviderErrorCode =
  /** The request exceeded its timeout budget. Retryable. */
  | 'timeout'
  /** The caller aborted the request (navigation away, new search). Not an error condition for the user. */
  | 'cancelled'
  /** Device is offline; the request never reached the network. Retryable when connectivity returns. */
  | 'offline'
  /** DNS/TLS/connection failure. Retryable with backoff. */
  | 'network'
  /** The provider signalled rate limiting (e.g. HTTP 429). Retryable with longer backoff. */
  | 'rate_limited'
  /** The provider answered 5xx or an explicit failure. Retryable, bounded. */
  | 'upstream_error'
  /** The response failed runtime (Zod) validation or violated the schema contract. Not retryable as-is. */
  | 'invalid_response'
  /** The requested entity does not exist (station, journey, order). Not retryable. */
  | 'not_found'
  /** Known-good request against a state that forbids it (e.g. illegal order transition). Not retryable. */
  | 'conflict'
  /** Explicit policy denial (authentication/authorization/forbidden use of the source). Not retryable. */
  | 'forbidden'
  /** Provider declared the function unsupported. Not retryable. */
  | 'unsupported'
  /** Anything that could not be classified. Never silently swallowed. */
  | 'unknown';

export interface ProviderError {
  readonly code: ProviderErrorCode;
  /** Developer-facing description. MUST NOT contain secrets, tokens, card data or PII. */
  readonly message: string;
  /** Whether a bounded retry could plausibly succeed (DEC-007 retry policy). */
  readonly retryable: boolean;
  /** HTTP status when the error came from an HTTP transport. */
  readonly httpStatus?: number;
  /** Raw upstream error code/message, diagnostics only. */
  readonly upstreamCode?: string;
  readonly upstreamMessage?: string;
  readonly occurredAt: ISODateTime;
  /** Original thrown value for crash reporting; never rendered or logged raw. */
  readonly cause?: unknown;
}

/** Human-readable hint key for i18n; UI maps `code` -> localized message. */
export type ErrorCodeToMessageKey = Record<ProviderErrorCode, string>;
