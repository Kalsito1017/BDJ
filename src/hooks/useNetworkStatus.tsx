/**
 * useNetworkStatus — connectivity for offline banners/retry (Phase 5), over
 * the injectable `NetworkStatusPort` (`src/services/network/networkStatus.ts`
 * documents the port, the inference rules and the NetInfo integration
 * snippet — NetInfo is deliberately NOT installed here).
 *
 * SEMANTICS (the contract mobile-ui codes against; additive fields may be
 * added, names will not change):
 *  - `isOnline` — best-known connectivity: the manual status when one is set,
 *    otherwise inferred from provider outcomes ('offline'/'network' failures
 *    => offline; a successful call => online). Default: online. Treat it as a
 *    UI HINT for offline banners and "retry when back online" copy — it is
 *    NOT a claim about real connectivity (no real source exists in this
 *    build; rule 6 applies to data, and this is the same honesty rule).
 *  - `setManualStatus?(online)` — manual override for tests/demos (e.g. a
 *    demo "simulate offline" toggle). ADDITIVE `clearManualStatus()` removes
 *    the override and returns the port to inference.
 *
 * REACT QUERY: `wireNetworkStatusToReactQuery(port)` (called by
 * `AppDataProvider`) feeds the port's CONFIRMED status into TanStack Query's
 * `onlineManager`, so `refetchOnReconnect: true` (createAppQueryClient) works
 * as soon as a real source lands (the NetInfo snippet in the port module).
 * The inferred channel deliberately does NOT drive onlineManager — see the
 * port module comment (paused-fetch freeze / deadlock / contradiction with a
 * real signal). Verified by tests/hooks/networkStatus.test.tsx.
 *
 * TEST NOTE: a test that drives provider failures ('offline'/'network') flips
 * the port's inference; reset it between cases (`resetNetworkStatusPort()` or
 * an injected port via `NetworkStatusProvider`) so later cases start online.
 */

import { onlineManager } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type JSX,
  type ReactNode,
} from 'react';

import {
  networkStatusPort,
  type NetworkStatusPort,
} from '../services/network/networkStatus';

const NetworkStatusContext = createContext<NetworkStatusPort | null>(null);

export interface NetworkStatusProviderProps {
  port: NetworkStatusPort;
  children: ReactNode;
}

/**
 * Provides the port to `useNetworkStatus` AND wires React Query's
 * `onlineManager` to its confirmed channel while mounted.
 */
export function NetworkStatusProvider(props: NetworkStatusProviderProps): JSX.Element {
  const { port } = props;
  useEffect(() => wireNetworkStatusToReactQuery(port), [port]);
  return (
    <NetworkStatusContext.Provider value={port}>
      {props.children}
    </NetworkStatusContext.Provider>
  );
}

/** The configured `NetworkStatusPort` (default: the app-wide singleton). */
export function useNetworkStatusPort(): NetworkStatusPort {
  return useContext(NetworkStatusContext) ?? networkStatusPort;
}

export interface NetworkStatusState {
  isOnline: boolean;
  setManualStatus?: (online: boolean) => void;
  /** ADDITIVE: clear the manual override (back to inferred status). Always
   *  returned by the default implementation — optional in the type so
   *  consumer mocks may omit it. */
  clearManualStatus?: () => void;
}

export function useNetworkStatus(): NetworkStatusState {
  const port = useNetworkStatusPort();
  const isOnline = useSyncExternalStore(
    port.subscribe,
    port.getIsOnline,
    port.getIsOnline,
  );
  return {
    isOnline,
    setManualStatus: (online: boolean) => {
      port.setConfirmedStatus(online);
    },
    clearManualStatus: () => {
      port.setConfirmedStatus(null);
    },
  };
}

/**
 * Feed the port's CONFIRMED connectivity into React Query's `onlineManager`
 * so `refetchOnReconnect` works when a real source lands. Returns the
 * unsubscribe function. Safe to wire repeatedly (each caller owns its
 * subscription).
 */
export function wireNetworkStatusToReactQuery(
  port: NetworkStatusPort = networkStatusPort,
): () => void {
  const apply = (): void => {
    const confirmed = port.getConfirmedOnline();
    if (confirmed !== null) onlineManager.setOnline(confirmed);
  };
  apply();
  return port.subscribe(apply);
}
