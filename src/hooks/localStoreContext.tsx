/**
 * LocalStore React context (Phase 5). The store itself is plain TypeScript
 * (`src/services/storage/localStore.ts`); this module only provides the
 * injectable seam the hooks read from.
 *
 * Default: the app-wide AsyncStorage-backed `localStore` singleton — screens
 * need no provider. Tests (and previews) inject a memory store via
 * `LocalStoreProvider`, so no test ever depends on singleton cleanliness.
 */

import { createContext, useContext, type JSX, type ReactNode } from 'react';

import { localStore, type LocalStore } from '../services/storage/localStore';

const LocalStoreContext = createContext<LocalStore | null>(null);

export interface LocalStoreProviderProps {
  store: LocalStore;
  children: ReactNode;
}

export function LocalStoreProvider(props: LocalStoreProviderProps): JSX.Element {
  return (
    <LocalStoreContext.Provider value={props.store}>
      {props.children}
    </LocalStoreContext.Provider>
  );
}

/** The configured `LocalStore` (default: the app-wide singleton). */
export function useLocalStore(): LocalStore {
  return useContext(LocalStoreContext) ?? localStore;
}
