/**
 * Lazy, failure-tolerant access to the MapLibre React Native module
 * (DEC-012: MapLibre RN + OpenFreeMap; no map API key exists — OpenFreeMap
 * needs none, so there is NO key to store, leak or rotate).
 *
 * NATIVE RENDERING REQUIRES AN EXPO DEV BUILD (`npx expo prebuild` or EAS
 * Build). That build was NOT run in this workstream (Linux host, no native
 * toolchain — rules 5/8): the map renders zero pixels in this environment
 * and nothing here may be read as a verified on-device map render.
 *
 * The module must be required LAZILY and defensively because it is absent
 * or unusable in several real situations:
 *  - Expo Go (the native MapLibre module is not bundled),
 *  - React Native for Web (MapLibre RN has no web renderer),
 *  - unit tests (no native modules; suites mock this package),
 *  - old devices / native render failures (caught by the render boundary in
 *    StationsMapSurface).
 * In every such case `loadMapLibre()` returns null and the UI falls back to
 * the clearly-labelled `MapPlaceholder` — never a broken half-map.
 */

import type { ComponentType } from 'react';
import { Platform } from 'react-native';

import type { CameraProps, MapProps, MarkerProps } from '@maplibre/maplibre-react-native';

/**
 * The minimal structural surface of `@maplibre/maplibre-react-native` this
 * feature uses (v11 API: `Map`, `Camera`, `Marker`). Typing only what we
 * touch keeps the feature honest about its dependency surface and lets
 * tests inject a mock module.
 */
export interface MapLibreModule {
  Map: ComponentType<MapProps>;
  Camera: ComponentType<CameraProps>;
  Marker: ComponentType<MarkerProps>;
}

/**
 * Resolve the MapLibre module, or null when it cannot be used here.
 *
 * No memo cache on purpose: `require` is cached by the module system, and
 * a stateless function is trivially testable (each suite can mock the
 * package differently).
 */
export function loadMapLibre(): MapLibreModule | null {
  if (Platform.OS === 'web') {
    // MapLibre RN renders native views only; web gets the labelled fallback.
    return null;
  }
  try {
    // Lazy require (still statically analysable by Metro). The require
    // itself can throw in Expo Go / tests; rendering can throw later — the
    // render boundary in StationsMapSurface covers that half.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@maplibre/maplibre-react-native') as Partial<MapLibreModule>;
    if (
      mod &&
      typeof mod.Map === 'function' &&
      typeof mod.Camera === 'function' &&
      typeof mod.Marker === 'function'
    ) {
      return { Map: mod.Map, Camera: mod.Camera, Marker: mod.Marker };
    }
    return null;
  } catch {
    return null;
  }
}
