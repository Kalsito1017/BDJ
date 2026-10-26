/**
 * Provenance labelling primitives (DEC-006 / rule 6): every surface that
 * renders station data MUST show a provenance label, and demo data MUST
 * show the demo label. There is no render path for data without one.
 *
 * CONVERGENCE (DEC-019 L5): the CANONICAL component is the shared
 * `src/components/ProvenanceBadge` (themed, app-wide). This local renderer
 * is a `t`-injected twin kept only because the stations feature is
 * deliberately self-contained (props-injected `Translate`, no hook imports
 * outside useStationsTranslate.ts). It has converged onto the canonical
 * contract so both renderers show IDENTICAL text and IDENTICAL screen-
 * reader metadata app-wide:
 *  - labels: the shared `provenance.*` vocabulary (src/i18n/keys.ts
 *    PROVENANCE_LABEL_KEYS) — the feature's old `stations.provenance.*`
 *    duplicates are retired (reported for catalog deletion);
 *  - a11y: `a11y.provenance_badge` + `a11y.provenance_badge_hint`, same as
 *    the shared badge.
 * Remaining difference: styling (theme hooks vs local styles) and the `t`
 * seam. Deleting this twin entirely needs a `src/components` change (the
 * shared badge cannot accept an injected `t` today) — proposed to the lead
 * in the map-wave report; until then this file MUST stay API-compatible
 * with the shared one's vocabulary.
 */

import { StyleSheet, Text, View } from 'react-native';

import { PROVENANCE_LABEL_KEYS } from '../../../i18n/keys';
import type { InformationProvenance } from '../../../types';
import { STATIONS_KEYS } from '../translationKeys';
import type { Translate } from '../types';

export interface ProvenanceBadgeProps {
  t: Translate;
  provenance: InformationProvenance;
}

export function ProvenanceBadge({ t, provenance }: ProvenanceBadgeProps) {
  const label = t(PROVENANCE_LABEL_KEYS[provenance.kind]);
  return (
    <View
      style={styles.badge}
      testID="stations-provenance-badge"
      accessible
      accessibilityLabel={t('a11y.provenance_badge', { label })}
      accessibilityHint={t('a11y.provenance_badge_hint')}
    >
      <Text style={styles.badgeText}>{label}</Text>
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
