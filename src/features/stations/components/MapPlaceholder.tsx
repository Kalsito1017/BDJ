/**
 * Map area placeholder — NO map SDK is installed and none may be until the
 * human records DEC-012 (docs/map-sdk-comparison.md is the research input).
 *
 * This placeholder is deliberately explicit:
 * - it says the map SDK decision is pending a human decision;
 * - it repeats the rule that a map line never implies an operational route
 *   and a marker never implies real-time service (plan.md 17.5);
 * - it reserves the attribution area (addbeforerelease.txt 9) and carries
 *   the mandatory demo notice (rule 6).
 *
 * When an SDK is chosen, this component is replaced — the surrounding
 * stations feature does not change.
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
