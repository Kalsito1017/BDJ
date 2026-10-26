/**
 * The interactive map area (plan.md §17.5 / §9 Phase 5; DEC-012).
 *
 * MapLibre React Native (`Map`/`Camera`/`Marker`, v11 API) with the
 * OpenFreeMap "liberty" style. THERE IS NO MAP API KEY — OpenFreeMap needs
 * none (nothing to store, restrict or rotate; `EXPO_PUBLIC_*` does not
 * apply).
 *
 * RULE 6 / DEC-012 — the map never implies anything operational:
 *  - markers show the DEMO dataset only (synthetic stations, clearly
 *    labelled) and are NEVER a claim about real service;
 *  - there are NO route lines between stations (not operational routes) —
 *    this component deliberately uses no line layer or GeoJSON source at
 *    all, only markers;
 *  - the `map.disclaimer` copy and the mandatory DEC-012 attribution
 *    (map/MapAttribution.tsx) render ON the map, always visible;
 *  - stations WITHOUT coordinates cannot be marked, so they are listed
 *    below the map and stay tappable (nothing is invented — plan.md 17.5).
 *
 * NATIVE RENDER REQUIRES AN EXPO DEV BUILD (`npx expo prebuild` / EAS
 * Build) — NOT RUN in this workstream (Linux host). Nothing here is a
 * verified on-device render claim; in tests the module is mocked and the
 * map draws zero pixels.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GeoPoint, Station } from '../../../types';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { MAP_KEYS, STATIONS_KEYS } from '../translationKeys';
import type { Translate } from '../types';
import type { MapLibreModule } from './loadMapLibre';
import { MapAttribution } from './MapAttribution';

/** DEC-012: OpenFreeMap public instance, "liberty" style (no key). */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Camera start: Bulgaria (lng/lat per MapLibre's LngLat tuple). */
export const BULGARIA_CENTER: readonly [number, number] = [25.3, 42.7];
export const BULGARIA_ZOOM = 6.2;

export interface StationsMapProps {
  t: Translate;
  /** Already filtered (the container runs searchStations). */
  stations: readonly Station[];
  onSelectStation: (station: Station) => void;
  /** Resolved MapLibre module (see loadMapLibre / StationsMapSurface). */
  mapLibre: MapLibreModule;
}

type MappedStation = Station & { location: GeoPoint };

function hasCoordinates(station: Station): station is MappedStation {
  return station.location !== null && station.location !== undefined;
}

export function StationsMap({
  t,
  stations,
  onSelectStation,
  mapLibre,
}: StationsMapProps) {
  const { Map: MapCanvas, Camera, Marker } = mapLibre;
  const mapped = stations.filter(hasCoordinates);
  const unmapped = stations.filter((station) => !hasCoordinates(station));

  return (
    <View style={styles.container} testID="stations-map">
      <View style={styles.mapArea}>
        <MapCanvas
          mapStyle={MAP_STYLE_URL}
          style={styles.map}
          testID="stations-map-canvas"
        >
          <Camera
            testID="stations-map-camera"
            initialViewState={{
              center: [BULGARIA_CENTER[0], BULGARIA_CENTER[1]],
              zoom: BULGARIA_ZOOM,
            }}
          />
          {mapped.map((station) => (
            <Marker
              key={station.id}
              id={station.id}
              testID={`stations-map-marker-${station.id}`}
              lngLat={[station.location.longitude, station.location.latitude]}
              onPress={() => onSelectStation(station)}
            >
              <View
                style={styles.marker}
                accessible
                accessibilityRole="button"
                accessibilityLabel={station.name}
              >
                <View style={styles.markerDot} />
              </View>
            </Marker>
          ))}
        </MapCanvas>
        {/* Rule 6 + DEC-012: disclaimer and attribution are ON the map and
            always visible (never behind an interaction). */}
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.disclaimer} testID="stations-map-disclaimer">
            {t(MAP_KEYS.disclaimer)}
          </Text>
          <MapAttribution t={t} />
        </View>
      </View>

      {unmapped.length > 0 ? (
        <View style={styles.unmapped} testID="stations-map-unmapped-list">
          <Text style={styles.unmappedHeading} accessibilityRole="header">
            {t(STATIONS_KEYS.listLabel)}
          </Text>
          {unmapped.map((station) => (
            <Pressable
              key={station.id}
              testID={`stations-map-unmapped-${station.id}`}
              accessibilityRole="button"
              accessibilityLabel={station.name}
              onPress={() => onSelectStation(station)}
              style={styles.unmappedRow}
            >
              <Text style={styles.unmappedName}>{station.name}</Text>
              <ProvenanceBadge t={t} provenance={station.provenance} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapArea: {
    flex: 1,
    margin: 12,
    minHeight: 240,
  },
  map: {
    flex: 1,
  },
  overlay: {
    bottom: 8,
    left: 8,
    position: 'absolute',
    right: 8,
  },
  disclaimer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 4,
    color: '#7c2d12',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    backgroundColor: '#1d4ed8',
    borderColor: '#ffffff',
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    width: 14,
  },
  unmapped: {
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    margin: 12,
    marginTop: 0,
    paddingTop: 8,
  },
  unmappedHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  unmappedRow: {
    paddingVertical: 8,
  },
  unmappedName: {
    fontSize: 15,
    fontWeight: '600',
  },
});
