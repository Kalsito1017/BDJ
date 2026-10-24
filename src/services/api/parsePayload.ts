/**
 * Boundary parsing for untrusted payloads (DEC-007, Appendix B).
 *
 * EVERY external payload (HTTP response, provider callback, cached file read
 * back from disk — and, in the mock, every fixture payload) is `parse`d with a
 * Zod schema BEFORE it is mapped into domain types. Unknown extra fields are
 * tolerated for forward compatibility but stripped (never passed through);
 * missing optional fields stay absent/null; a failed parse rejects with
 * `ProviderError { code: 'invalid_response' }` carrying the schema paths in
 * `diagnostics` and a PII-safe shape summary in `upstreamMessage`.
 *
 * The app must never crash on a malformed payload (addbeforerelease.txt §7).
 */

import { ZodError, z, type ZodType } from 'zod';
import {
  providerErrorFromZod,
  safePayloadSummary,
  toProviderError,
} from './providerErrors';

/**
 * Parse `payload` with `schema`, or throw a `ProviderError`.
 *
 * @param context Short developer-facing label used in the error message,
 *                e.g. "Mock journey search result". Never a payload value.
 */
export function parseExternalPayload<S extends ZodType>(
  schema: S,
  payload: unknown,
  context: string,
  now?: () => Date,
): z.output<S> {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;
  if (result.error instanceof ZodError) {
    throw providerErrorFromZod(result.error, context, {
      now,
      payloadSummary: safePayloadSummary(payload),
    });
  }
  throw toProviderError(result.error, now);
}
