/**
 * Pending station selection — the hand-off channel between the station
 * picker modal route and the journey search form.
 *
 * Why a tiny module store instead of route params: the picker is a separate
 * route (`/search/station-picker`) presented modally OVER the form; the form
 * stays mounted underneath, so the picker writes the chosen station here,
 * calls `router.back()`, and the mounted form subscribes and updates its
 * react-hook-form values. No navigation API guesswork and no new dependency
 * (DEC-009) for a UI-only hand-off.
 *
 * The store holds AT MOST ONE selection and reading clears it
 * (`takePendingStationSelection`), so a selection can never be applied
 * twice. Deep-linking straight into the picker without a form is harmless:
 * the selection simply expires unread.
 */

import type { Station } from '../../types/station';

export type StationField = 'from' | 'to';

export interface PendingStationSelection {
  field: StationField;
  station: Station;
}

let pending: PendingStationSelection | null = null;
const listeners = new Set<() => void>();

/** Publish a selection and notify subscribers (the picker calls this). */
export function setPendingStationSelection(selection: PendingStationSelection): void {
  pending = selection;
  for (const listener of [...listeners]) listener();
}

/** Read and clear the pending selection (null when there is none). */
export function takePendingStationSelection(): PendingStationSelection | null {
  const selection = pending;
  pending = null;
  return selection;
}

/** Subscribe to selection updates; returns an unsubscribe function. */
export function subscribePendingStationSelection(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam: drop any pending selection and subscribers. */
export function resetPendingStationSelection(): void {
  pending = null;
  listeners.clear();
}
