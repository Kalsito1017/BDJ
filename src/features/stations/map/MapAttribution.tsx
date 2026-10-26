/**
 * Required map attribution (DEC-012, decided by the human owner 2026-10-24).
 *
 * These two lines are LEGAL ATTRIBUTION TEXT, not translatable copy:
 * DEC-012 prescribes them verbatim, so they are render-time constants shown
 * identically in every locale (a locale-catalog entry would have to differ
 * per language to pass the untranslated-value guard, which would break the
 * "exact wording" requirement). The block's ACCESSIBLE NAME comes from the
 * i18n key `map.attribution_label` like all other UI copy.
 *
 * The attribution is rendered inside the map area in EVERY map state
 * (map drawn or fallback) — it is never hidden behind an interaction.
 *
 * Tile usage rules (documented, not implemented here): OpenFreeMap permits
 * offline tile caching within ≤3,000 tiles or ≤50 MB per download, ≤4
 * parallel requests and a unique User-Agent. NO tile caching is implemented
 * in this app; if `OfflineManager` is ever used, those limits are a hard
 * requirement (and "tile scraping" stays prohibited — DEC-012, plan.md
 * §17.5).
 */

import { StyleSheet, Text, View } from 'react-native';

import { MAP_KEYS } from '../translationKeys';
import type { Translate } from '../types';

/** DEC-012 line 1 — verbatim. */
export const ATTRIBUTION_OPENFREEMAP =
  'OpenFreeMap © OpenMapTiles Data from OpenStreetMap';

/** DEC-012 line 2 — verbatim. */
export const ATTRIBUTION_OSM_ODBL =
  '© OpenStreetMap contributors — data available under the Open Database License (ODbL), https://www.openstreetmap.org/copyright';

export interface MapAttributionProps {
  t: Translate;
}

export function MapAttribution({ t }: MapAttributionProps) {
  return (
    <View
      style={styles.attribution}
      testID="stations-map-attribution"
      accessible
      accessibilityLabel={t(MAP_KEYS.attributionLabel)}
    >
      <Text style={styles.attributionText}>{ATTRIBUTION_OPENFREEMAP}</Text>
      <Text style={styles.attributionText}>{ATTRIBUTION_OSM_ODBL}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  attribution: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 4,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  attributionText: {
    color: '#374151',
    fontSize: 11,
  },
});
