/**
 * Map area fallback — clearly-labelled placeholder shown whenever the
 * interactive map cannot render (MapLibre native module absent: Expo Go,
 * web, unit tests, older devices — see map/loadMapLibre.ts and
 * map/StationsMapSurface.tsx).
 *
 * The placeholder is deliberately explicit:
 * - it says honestly that the map is not available in this build and why;
 * - it repeats the rule that a map line never implies an operational route
 *   and a marker never implies real-time service (plan.md 17.5);
 * - it reserves the attribution area (addbeforerelease.txt 9) and carries
 *   the mandatory demo notice (rule 6).
 *
 * NOTE (map wave): the rendered copy comes from `map.pending.*`, whose
 * catalog values still predate the DEC-012 decision; updated wording is
 * proposed to the catalog owner in the map-wave report. The component and
 * its key contract are unchanged on purpose (one stable fallback surface).
 */

import { StyleSheet, Text, View } from 'react-native';

import { MAP_KEYS } from '../translationKeys';
import type { Translate } from '../types';
import { DemoNotice } from './ProvenanceBadge';

export interface MapPlaceholderProps {
  t: Translate;
}

export function MapPlaceholder({ t }: MapPlaceholderProps) {
  return (
    <View
      style={styles.container}
      testID="stations-map-placeholder"
      accessibilityLabel={t(MAP_KEYS.placeholderLabel)}
    >
      <Text style={styles.title} accessibilityRole="header">
        {t(MAP_KEYS.pendingTitle)}
      </Text>
      <Text style={styles.body}>{t(MAP_KEYS.pendingBody)}</Text>
      <Text style={styles.disclaimer}>{t(MAP_KEYS.disclaimer)}</Text>
      <DemoNotice t={t} />
      <Text style={styles.attribution}>{t(MAP_KEYS.attributionPlaceholder)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    backgroundColor: '#f3f4f6',
    borderColor: '#9ca3af',
    borderStyle: 'dashed',
    borderWidth: 1,
    margin: 12,
    minHeight: 240,
    padding: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    marginTop: 8,
  },
  disclaimer: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
  attribution: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 'auto',
    paddingTop: 12,
  },
});
