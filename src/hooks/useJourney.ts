/**
 * useJourney — journey details lookup (plan.md §9 Phase 4) over the
 * configured `TrainDataProvider`.
 *
 * SEMANTICS (the contract mobile-ui codes against):
 *  - Enabled ONLY when `journeyId` is non-null and non-blank; otherwise no
 *    provider call is made and `journey` stays undefined with no error.
 *  - Unknown ids reject `not_found` (Appendix A.5) — the screen shows the
 *    error state, not a crash. A provider without `getJourney` support
 *    rejects `unsupported`; the UI can then render the full `Journey` it
 *    already has from `useJourneySearch` (TrainDataProvider contract).
 *  - Errors are typed `ProviderError` (never strings); map `error.code` ->
 *    `ERROR_MESSAGE_KEYS` -> `errors.*` (src/i18n/keys.ts).
 *  - The result keeps its DATA provenance (`journey.provenance`, `demo` from
 *    the mock — rule 6). Query staleness never re-labels it; see the
 *    freshness notes in `useJourneySearch`.
 *  - Cancellation: TanStack's per-fetch AbortSignal is passed to the
 *    provider, so navigating away aborts the in-flight lookup (DEC-007).
 */

import { useQuery } from '@tanstack/react-query';

import { createProviderError } from '../services/api/providerErrors';
import type { ProviderError } from '../types/errors';
import type { Journey } from '../types/journey';
import { useTrainDataProvider } from './AppDataProvider';
import { runProviderCall } from './internals';
import { journeyQueryKeys } from './queryKeys';

export interface JourneyState {
  /** The journey; undefined while loading, disabled or on error. */
  journey: Journey | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Typed provider error for the UI to map to `errors.*`; null when not in error. */
  error: ProviderError | null;
  /** Re-run the lookup for the current id (checklist §7: retry on every screen). */
  refetch: () => void;
}

export function useJourney(journeyId: string | null): JourneyState {
  const provider = useTrainDataProvider();
  const id = journeyId === null ? null : journeyId.trim();
  const enabled = id !== null && id !== '';

  const result = useQuery<Journey, ProviderError>({
    queryKey: journeyQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => {
      const getJourney = provider.getJourney;
      if (id === null || id === '') {
        // Unreachable in practice: `enabled` gates the fetch. Typed guard.
        throw createProviderError(
          'unknown',
          'useJourney queryFn ran without a journey id.',
        );
      }
      if (typeof getJourney !== 'function') {
        // Honest capability failure (DEC-007): never invent details the
        // provider cannot supply. The UI falls back to the journey it has.
        throw createProviderError(
          'unsupported',
          'The configured provider does not support journey details.',
        );
      }
      return runProviderCall(() => getJourney.call(provider, id, { signal }));
    },
    enabled,
    // No React Query auto-retry — the request executor owns retries (DEC-007).
    retry: false,
  });

  return {
    journey: result.data,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: () => {
      void result.refetch();
    },
  };
}
