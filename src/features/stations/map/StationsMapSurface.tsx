/**
 * Availability gate for the interactive map: resolves the MapLibre module
 * (lazily — see loadMapLibre.ts) and falls back to the clearly-labelled
 * `MapPlaceholder` when the native module is absent (Expo Go, web, unit
 * tests, older devices) or when the native map fails to render at all.
 *
 * The fallback is REQUIRED, not a nicety: the list view + placeholder must
 * keep station discovery fully usable in every environment (checklist §9;
 * plan.md §17.5 "graceful degradation").
 *
 * NATIVE RENDER REQUIRES AN EXPO DEV BUILD (`npx expo prebuild` / EAS
 * Build) — NOT RUN in this workstream (Linux host; rules 5/8).
 */

import { Component, type ReactNode } from 'react';

import { MapPlaceholder } from '../components/MapPlaceholder';
import { MapAttribution } from './MapAttribution';
import type { Station } from '../../../types';
import type { Translate } from '../types';
import { loadMapLibre, type MapLibreModule } from './loadMapLibre';
import { StationsMap } from './StationsMap';

export interface StationsMapSurfaceProps {
  t: Translate;
  stations: readonly Station[];
  onSelectStation: (station: Station) => void;
  /**
   * Test seam. `undefined` (default) = lazy-require via `loadMapLibre()`;
   * `null` = force the fallback; a module object = use it directly.
   */
  mapLibre?: MapLibreModule | null;
}

/**
 * Render-error boundary: a native map that throws during render (missing
 * native module surfacing late, driver bugs on old devices) must degrade to
 * the labelled placeholder — never crash the screen (checklist §7).
 */
class MapRenderBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    // No crash-reporting service exists yet (DEC-003) and nothing here may
    // log user data; the failure is visible to the user as the labelled
    // placeholder. Wire a real reporter when telemetry is approved.
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function StationsMapSurface({
  t,
  stations,
  onSelectStation,
  mapLibre,
}: StationsMapSurfaceProps) {
  const module = mapLibre === undefined ? loadMapLibre() : mapLibre;
  // Attribution is rendered in EVERY state (DEC-012), including the fallback.
  const fallback = (
    <>
      <MapPlaceholder t={t} />
      <MapAttribution t={t} />
    </>
  );
  if (!module) return fallback;
  return (
    <MapRenderBoundary fallback={fallback}>
      <StationsMap
        t={t}
        stations={stations}
        onSelectStation={onSelectStation}
        mapLibre={module}
      />
    </MapRenderBoundary>
  );
}
