/**
 * Service-layer API utilities barrel (DEC-005: `services/api/`).
 *
 * Despite the folder name there is NO HTTP client and NO backend here
 * (DEC-003: no backend is justified; DEC-002: no approved live data source).
 * These modules are the transport-agnostic plumbing every provider
 * implementation shares: error normalisation (DEC-007), boundary parsing
 * (Appendix B) and the timeout/cancel/bounded-retry executor.
 */

export {
  PROVIDER_ERROR_RETRYABLE,
  createProviderError,
  formatSchemaPath,
  isProviderError,
  providerErrorFromZod,
  safePayloadSummary,
  toProviderError,
  type CreateProviderErrorOptions,
  type ZodErrorMappingOptions,
} from './providerErrors';
export { abortableDelay, computeBackoffDelayMs } from './timing';
export { executeRead, type RequestExecutorDeps } from './requestExecutor';
export { parseExternalPayload } from './parsePayload';
