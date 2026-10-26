/**
 * NetworkStatusPort — the injectable connectivity seam (Phase 5 resilience;
 * plan.md §9 "Add offline/error states and retry"). In the spirit of the
 * map-stations `LocationPort`: one interface, a default inferred
 * implementation, and a manual override for tests/demos.
 *
 * WHY A PORT: this repository deliberately installs NO native connectivity
 * dependency (`@react-native-community/netinfo` is NOT installed — a native
 * module we cannot build or test on this Linux host, rule 8). There is
 * therefore no lawful way to observe real connectivity here. The default
 * implementation INFERS connectivity from provider outcomes and stays
 * injectable so a real source can be dropped in without touching screens.
 *
 * TWO CHANNELS (important):
 *  - `getIsOnline()` — best-known connectivity for UI banners: the manual/
 *    confirmed status when one is set, otherwise the inferred status.
 *  - `getConfirmedOnline()` — connectivity from a REAL signal only (manual
 *    override today; NetInfo events once installed). React Query's
 *    `onlineManager` follows THIS channel — never the inference heuristic.
 *    Rationale: with `networkMode: 'online'` (React Query default) a paused
 *    onlineManager FREEZES all query fetching — the offline screen's Retry
 *    button becomes a no-op and an inferred-only recovery deadlocks (no call
 *    can succeed to un-infer the offline state). Inference also contradicts a
 *    real signal (upstream broken while the device IS connected). Verified by
 *    tests/hooks/networkStatus.test.tsx ("inferred status never pauses
 *    fetching" / "confirmed status drives onlineManager + refetchOnReconnect").
 *
 * INFERENCE RULES (deterministic, documented):
 *  - `reportFailure('offline')` or `reportFailure('network')` -> inferred
 *    offline. These are the only codes that say "the request never reached
 *    (or could not talk to) the source".
 *  - `reportSuccess()` -> inferred online (a completed call PROVES reachability).
 *  - every other failure code ('rate_limited' answered, 'upstream_error'
 *    answered, 'cancelled', ...) leaves the inference UNCHANGED — an upstream
 *    answer proves connectivity, and a cancellation says nothing about it.
 *
 * NETINFO INTEGRATION SNIPPET (when the dependency is approved and installed
 * — NOT imported here; copy into a `services/network/netinfoSource.ts`):
 *
 *   import NetInfo from '@react-native-community/netinfo';
 *
 *   export function attachNetInfo(port: NetworkStatusPort): () => void {
 *     return NetInfo.addEventListener((state) => {
 *       // Confirmed channel: drives useNetworkStatus().isOnline AND React
 *       // Query's onlineManager (refetchOnReconnect) via the wiring in
 *       // src/hooks/useNetworkStatus.tsx.
 *       port.setConfirmedStatus(state.isConnected !== false);
 *     });
 *   }
 *
 * Privacy: this module stores and logs NOTHING — no SSID, no carrier, no IP
 * (checklist §14: no location/network history in logs).
 */

import type { ProviderErrorCode } from '../../types/errors';

export interface NetworkStatusPort {
  /** Best-known connectivity for UI banners: confirmed ?? inferred. */
  getIsOnline(): boolean;
  /** Confirmed connectivity (manual override or a real source); null = none. */
  getConfirmedOnline(): boolean | null;
  /** Set/clear the confirmed status. `null` returns the port to inference. */
  setConfirmedStatus(online: boolean | null): void;
  /** A provider call completed: inferred online. */
  reportSuccess(): void;
  /** A provider call failed with `code`: feeds the inference rules above. */
  reportFailure(code: ProviderErrorCode): void;
  /** Subscribe to status changes; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

export interface NetworkStatusPortConfig {
  /** Initial inferred status (default: online). */
  initialInferredOnline?: boolean;
  /** Initial confirmed status (default: none). */
  initialConfirmedOnline?: boolean | null;
}

/** Codes whose failure is evidence of lost connectivity (see module comment). */
const CONNECTIVITY_FAILURE_CODES: ReadonlySet<ProviderErrorCode> = new Set([
  'offline',
  'network',
]);

export function createNetworkStatusPort(
  config: NetworkStatusPortConfig = {},
): NetworkStatusPort {
  let inferredOnline = config.initialInferredOnline ?? true;
  let confirmedOnline = config.initialConfirmedOnline ?? null;
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  return {
    getIsOnline: () => confirmedOnline ?? inferredOnline,
    getConfirmedOnline: () => confirmedOnline,
    setConfirmedStatus: (online) => {
      if (confirmedOnline === online) return;
      confirmedOnline = online;
      notify();
    },
    reportSuccess: () => {
      if (inferredOnline) return;
      inferredOnline = true;
      notify();
    },
    reportFailure: (code) => {
      if (!CONNECTIVITY_FAILURE_CODES.has(code)) return;
      if (inferredOnline) {
        inferredOnline = false;
        notify();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * App-wide default port (inferred implementation). Tests inject their own via
 * `NetworkStatusProvider` (`src/hooks/`) or call `resetNetworkStatusPort()`
 * between cases.
 */
export const networkStatusPort: NetworkStatusPort = createNetworkStatusPort();

/** Reset the singleton (tests/demos): clears override + inference. */
export function resetNetworkStatusPort(): void {
  networkStatusPort.setConfirmedStatus(null);
  // Re-seed inference by replaying a success (no direct setter: the inference
  // channel only moves through outcomes — this is the documented "online" seed).
  networkStatusPort.reportSuccess();
}
