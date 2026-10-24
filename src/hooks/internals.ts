/**
 * Shared internals for the data-access hooks (Phase 3/4).
 *
 * `runProviderCall` is the single place where a thrown value can leave a
 * provider call on its way into TanStack Query: everything is normalised to
 * a typed `ProviderError` (DEC-007) so hooks NEVER surface raw strings or
 * provider-native errors. The UI maps `error.code` through
 * `src/i18n/keys.ts` (`ERROR_MESSAGE_KEYS` -> `errors.*`).
 */

import { toProviderError } from '../services/api/providerErrors';
import type { Journey } from '../types/journey';
import type { Station } from '../types/station';

/** Run a provider call, guaranteeing typed `ProviderError` rejections only. */
export async function runProviderCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    throw toProviderError(error);
  }
}

/** Stable empty results (loading/error states expose these, never `undefined` arrays). */
export const EMPTY_STATIONS: readonly Station[] = [];
export const EMPTY_JOURNEYS: readonly Journey[] = [];
