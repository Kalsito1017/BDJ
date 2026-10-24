/**
 * useJourney contract tests (plan.md §9 Phase 4 — journey details).
 *
 * Cases: success with demo provenance on the journey and its legs (rule 6)
 * and the DEC-006 `segments === legs.filter(train)` invariant preserved,
 * disabled behaviour for null/blank ids (no provider call), unknown id
 * (`not_found`), a provider WITHOUT `getJourney` support (`unsupported` —
 * never invented details), and cache reuse on a second mount within
 * staleTime.
 *
 * Everything runs against the real MockTrainDataProvider + request executor;
 * no network (DEC-002).
 */

import { act, waitFor } from '@testing-library/react-native';

import { createAppQueryClient, useJourney } from '../../src/hooks';
import type { TrainSegment } from '../../src/types/journey';
import {
  expectAllDemoProvenance,
  expectProviderError,
  makeProviderWithoutJourneyDetails,
  makeTrackedProvider,
  renderDataHook,
  TIGHT_REQUEST_OPTIONS,
} from './testSupport';

const KNOWN_JOURNEY_ID = 'demo-journey-multi-transfer';

describe('useJourney — results', () => {
  it('returns the journey with demo provenance and a consistent timeline', async () => {
    const tracked = makeTrackedProvider();
    const { result } = await renderDataHook(() => useJourney(KNOWN_JOURNEY_ID), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.journey).toBeDefined());

    expect(result.current?.isError).toBe(false);
    expect(result.current?.error).toBeNull();
    expect(result.current?.isLoading).toBe(false);

    const journey = result.current?.journey;
    expect(journey?.id).toBe(KNOWN_JOURNEY_ID);
    expect(journey?.provenance.kind).toBe('demo');
    expectAllDemoProvenance(journey?.legs ?? []);
    // DEC-006 invariant survives the hook boundary.
    expect(journey?.segments).toEqual(
      journey?.legs.filter((leg): leg is TrainSegment => leg.kind === 'train'),
    );
    expect(tracked.callsOf('getJourney')).toHaveLength(1);
    expect(tracked.callsOf('getJourney')[0]?.input).toBe(KNOWN_JOURNEY_ID);
  });

  it('rejects with typed not_found for an unknown journey id', async () => {
    const tracked = makeTrackedProvider('success', {
      requestOptions: TIGHT_REQUEST_OPTIONS,
    });
    const { result } = await renderDataHook(() => useJourney('demo-journey-nope'), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.isError).toBe(true));

    expectProviderError(result.current?.error, 'not_found');
    expect(result.current?.journey).toBeUndefined();
  });

  it('rejects with typed unsupported when the provider has no journey details', async () => {
    const tracked = makeProviderWithoutJourneyDetails();
    const { result } = await renderDataHook(() => useJourney(KNOWN_JOURNEY_ID), {
      provider: tracked.provider,
    });

    await waitFor(() => expect(result.current?.isError).toBe(true));

    expectProviderError(result.current?.error, 'unsupported');
    expect(result.current?.journey).toBeUndefined();
    expect(tracked.callsOf('getJourney')).toHaveLength(0);
  });
});

describe('useJourney — enabled gating', () => {
  it('does nothing at all for null or blank ids', async () => {
    const tracked = makeTrackedProvider();

    const nullCase = await renderDataHook(() => useJourney(null), {
      provider: tracked.provider,
    });
    await act(async () => {});
    expect(nullCase.result.current?.journey).toBeUndefined();
    expect(nullCase.result.current?.isLoading).toBe(false);
    expect(nullCase.result.current?.isError).toBe(false);
    await nullCase.unmount();

    const blankCase = await renderDataHook(() => useJourney('   '), {
      provider: tracked.provider,
    });
    await act(async () => {});
    expect(blankCase.result.current?.isLoading).toBe(false);
    expect(blankCase.result.current?.isError).toBe(false);

    expect(tracked.calls).toHaveLength(0);
  });
});

describe('useJourney — caching (checklist §7)', () => {
  it('serves a second mount from cache within staleTime without calling the provider again', async () => {
    const tracked = makeTrackedProvider();
    const queryClient = createAppQueryClient();

    const first = await renderDataHook(() => useJourney(KNOWN_JOURNEY_ID), {
      provider: tracked.provider,
      queryClient,
    });
    await waitFor(() => expect(first.result.current?.journey).toBeDefined());
    await first.unmount();

    const second = await renderDataHook(() => useJourney(KNOWN_JOURNEY_ID), {
      provider: tracked.provider,
      queryClient,
    });
    await waitFor(() => expect(second.result.current?.journey).toBeDefined());

    expect(second.result.current?.journey).toBe(first.result.current?.journey);
    expect(tracked.callsOf('getJourney')).toHaveLength(1);
  });
});
