/**
 * Provenance labelling primitives (DEC-006 / rule 6): every surface that
 * renders station data MUST show a provenance label, and demo data MUST
 * show the demo label. There is no render path for data without one.
 */

import { StyleSheet, Text, View } from 'react-native';

import type { InformationProvenance } from '../../../types';
import { STATIONS_KEYS } from '../translationKeys';
import type { Translate } from '../types';

const KEY_BY_KIND = {
  demo: STATIONS_KEYS.provenanceDemo,
  scheduled: STATIONS_KEYS.provenanceScheduled,
  'cached-stale': STATIONS_KEYS.provenanceCachedStale,
  'real-time': STATIONS_KEYS.provenanceRealTime,
} as const;

export interface ProvenanceBadgeProps {
  t: Translate;
  provenance: InformationProvenance;
}

export function ProvenanceBadge({ t, provenance }: ProvenanceBadgeProps) {
  return (
    <View style={styles.badge} testID="stations-provenance-badge">
      <Text style={styles.badgeText}>{t(KEY_BY_KIND[provenance.kind])}</Text>
    </View>
  );
}

export interface DemoNoticeProps {
  t: Translate;
}

/**
 * Persistent "this is synthetic demo data" notice. Rendered on every screen
 * surface that shows dataset content (checklist 1: mock data visibly
 * labelled).
 */
export function DemoNotice({ t }: DemoNoticeProps) {
  return (
    <View style={styles.notice} testID="stations-demo-notice">
      <Text style={styles.noticeTitle}>{t(STATIONS_KEYS.demoBadge)}</Text>
      <Text style={styles.noticeBody}>{t(STATIONS_KEYS.demoNotice)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    borderColor: '#b45309',
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#7c2d12',
    fontSize: 12,
  },
  notice: {
    backgroundColor: '#fff7ed',
    borderColor: '#c2410c',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
    padding: 10,
  },
  noticeTitle: {
    fontWeight: '600',
  },
  noticeBody: {
    marginTop: 2,
  },
});
