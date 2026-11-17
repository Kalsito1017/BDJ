/**
 * Shared screen-level test harness (not a test file — testMatch only picks up
 * *.test.{ts,tsx}).
 *
 * Renders a node inside the REAL `<AppDataProvider>` (mock provider, app cache
 * policy, local store, network-status port) with a `QueryClient` that THIS
 * helper owns and disposes.
 *
 * WHY THE INJECTION MATTERS. React Query keeps a gc timer per cached entry
 * after its last observer unmounts (`gcTime` is 5 min for journeys, 30 min for
 * the station directory — APP_CACHE_POLICY). A client created inside
 * `<AppDataProvider>` as its lazy fallback is unreachable from the test that
 * rendered it, so nothing calls `clear()`: the pending timer keeps Jest's
 * worker event loop alive and jest reports "A worker process has failed to
 * exit gracefully". The timers never affect assertions, but they look like a
 * leak, slow worker shutdown and hide real leaks in the noise (DEC-029).
 *
 * The `afterEach` below unmounts observers first (`cleanup()`), then clears
 * every client: `QueryClient.clear()` destroys cached queries, which cancels
 * their gc timers. Register it once per test file via the import; RNTL's own
 * auto-cleanup stays in place and double-cleanup is a no-op.
 */

import type { QueryClient } from '@tanstack/react-query';
import { cleanup, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AppDataProvider, createAppQueryClient } from '../../src/hooks';

const trackedQueryClients = new Set<QueryClient>();

afterEach(() => {
  cleanup();
  for (const queryClient of trackedQueryClients) {
    queryClient.clear();
  }
  trackedQueryClients.clear();
});

/**
 * `render` wrapped in `<AppDataProvider>` with an owned QueryClient.
 * Local store / network status use the provider defaults (the AsyncStorage
 * Jest mock and the inferred port singleton) unless a suite injects its own
 * provider explicitly.
 */
export function renderWithAppData(node: ReactNode): ReturnType<typeof render> {
  const queryClient = createAppQueryClient();
  trackedQueryClients.add(queryClient);
  return render(<AppDataProvider queryClient={queryClient}>{node}</AppDataProvider>);
}
