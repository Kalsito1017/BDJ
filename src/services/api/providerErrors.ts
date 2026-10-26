/**
 * ProviderError construction and normalisation (DEC-007).
 *
 * Contract: every provider method rejects with `ProviderError`
 * (src/types/errors.ts) — never a bare `Error`, string, or provider-native
 * error object. This module is the single place that classifies thrown
 * values, so timeouts/cancellation/validation failures look the same to
 * the UI no matter which implementation produced them.
 *
 * Privacy: `message` and `diagnostics` are developer-facing and MUST NOT
 * contain payload values (they may be PII), secrets or card data. Raw
 * thrown values are preserved only in `cause` for crash reporting and are
 * never rendered or logged raw (src/types/errors.ts).
 *
 * Transport-agnostic: no fetch, no endpoints (DEC-002/DEC-003 — there is
 * no approved live data source and no backend).
 */

import type { ZodError } from 'zod';
import type { ISODateTime } from '../../types/common';
import type { ProviderError, ProviderErrorCode } from '../../types/errors';

/**
 * Default `retryable` per error code, matching the semantics documented in
 * src/types/errors.ts. `createProviderError` applies these unless the caller
 * overrides them.
 */
export const PROVIDER_ERROR_RETRYABLE: Readonly<Record<ProviderErrorCode, boolean>> = {
  timeout: true,
  cancelled: false,
  offline: true,
  network: true,
  rate_limited: true,
  upstream_error: true,
  invalid_response: false,
  not_found: false,
  conflict: false,
  forbidden: false,
  unsupported: false,
  unknown: false,
};

export interface CreateProviderErrorOptions {
  /** Override the default retryable classification (rarely needed). */
  retryable?: boolean;
  httpStatus?: number;
  upstreamCode?: string;
  upstreamMessage?: string;
  /** Safe diagnostic labels (schema paths, codes) — never payload values. */
  diagnostics?: readonly string[];
  /** Original thrown value for crash reporting. */
  cause?: unknown;
  /** Injected clock for deterministic tests; defaults to the real clock. */
  now?: () => Date;
}

/** Build a `ProviderError` with the code's default retryability and a UTC timestamp. */
export function createProviderError(
  code: ProviderErrorCode,
  message: string,
  options: CreateProviderErrorOptions = {},
): ProviderError {
  const occurredAt: ISODateTime = (options.now ?? (() => new Date()))().toISOString();
  return {
    code,
    message,
    retryable: options.retryable ?? PROVIDER_ERROR_RETRYABLE[code],
    occurredAt,
    ...(options.httpStatus !== undefined ? { httpStatus: options.httpStatus } : {}),
    ...(options.upstreamCode !== undefined ? { upstreamCode: options.upstreamCode } : {}),
    ...(options.upstreamMessage !== undefined
      ? { upstreamMessage: options.upstreamMessage }
      : {}),
    ...(options.diagnostics !== undefined ? { diagnostics: options.diagnostics } : {}),
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
  };
}

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

/** Structural check: a value that already satisfies the `ProviderError` contract. */
export function isProviderError(value: unknown): value is ProviderError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ProviderError>;
  return (
    typeof candidate.code === 'string' &&
    (PROVIDER_ERROR_CODES as readonly string[]).includes(candidate.code) &&
    typeof candidate.message === 'string' &&
    typeof candidate.retryable === 'boolean' &&
    typeof candidate.occurredAt === 'string'
  );
}

function errorName(value: unknown): string {
  if (value instanceof Error) return value.name || 'Error';
  return typeof value === 'object' && value !== null ? 'Object' : typeof value;
}

/**
 * Normalise ANY thrown/rejected value into a `ProviderError`.
 *
 * Classification (never invented beyond these rules):
 * - already a ProviderError            -> returned unchanged
 * - abort-shaped errors ('AbortError') -> 'cancelled'
 * - timeout-shaped ('TimeoutError')    -> 'timeout'
 * - `TypeError` (fetch-style failure)  -> 'network'
 * - anything else                      -> 'unknown' (never silently swallowed)
 *
 * The original value is preserved in `cause`; its text is NOT copied into
 * `message` (it may contain PII).
 */
export function toProviderError(value: unknown, now?: () => Date): ProviderError {
  if (isProviderError(value)) return value;

  const name = errorName(value);
  if (name === 'AbortError') {
    return createProviderError('cancelled', 'The request was aborted by the caller.', {
      cause: value,
      now,
    });
  }
  if (name === 'TimeoutError') {
    return createProviderError('timeout', 'The operation timed out.', {
      cause: value,
      now,
    });
  }
  if (value instanceof TypeError) {
    return createProviderError('network', 'Network-level failure (TypeError).', {
      cause: value,
      now,
    });
  }
  return createProviderError(
    'unknown',
    `Unclassifiable failure thrown by a provider operation (${name}).`,
    { cause: value, now },
  );
}

/** Render a Zod path as a dot string; values are never included. */
export function formatSchemaPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return '(root)';
  return path.map((segment) => String(segment)).join('.');
}

export interface ZodErrorMappingOptions {
  /** Injected clock for deterministic tests. */
  now?: () => Date;
  /** PII-safe payload summary from `safePayloadSummary` (shape only). */
  payloadSummary?: string;
}

/**
 * Map a Zod validation failure to `ProviderError { code: 'invalid_response' }`.
 *
 * Diagnostics carry only schema paths + issue codes (Appendix B: "log the
 * schema path + safe payload summary (no PII)") — never the rejected values.
 */
export function providerErrorFromZod(
  zodError: ZodError,
  context: string,
  options: ZodErrorMappingOptions = {},
): ProviderError {
  const diagnostics = zodError.issues.map(
    (issue) => `${formatSchemaPath(issue.path)}: ${issue.code}`,
  );
  return createProviderError(
    'invalid_response',
    `${context} failed schema validation (${zodError.issues.length} issue(s)).`,
    {
      diagnostics,
      cause: zodError,
      now: options.now,
      ...(options.payloadSummary !== undefined
        ? { upstreamMessage: `payload summary: ${options.payloadSummary}` }
        : {}),
    },
  );
}

/**
 * Diagnostic key-name bound (DEC-019 W3-L2): identifier-shaped key names can
 * still be data (e.g. a username in a keyed payload), so every name is
 * truncated to a short prefix — enough to identify the field, far too short
 * to carry meaningful payload content.
 */
export const SAFE_PAYLOAD_KEY_MAX_LENGTH = 24;

function truncateDiagnosticKey(key: string): string {
  return key.length <= SAFE_PAYLOAD_KEY_MAX_LENGTH
    ? key
    : `${key.slice(0, SAFE_PAYLOAD_KEY_MAX_LENGTH)}…`;
}

/**
 * Type/shape summary of an untrusted payload for diagnostics. Values are
 * NEVER included — only kinds, lengths and identifier-shaped key names
 * (truncated to `SAFE_PAYLOAD_KEY_MAX_LENGTH` — W3-L2; anything that could be
 * personal data, e.g. an object keyed by e-mail, is summarised as a count
 * only).
 */
export function safePayloadSummary(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(length=${value.length})`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    const safeKeys = keys
      .filter((key) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
      .map(truncateDiagnosticKey);
    return `object(keys=${keys.length}:[${safeKeys.slice(0, 10).join(',')}])`;
  }
  return typeof value;
}
