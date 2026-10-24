/**
 * Locale parity "lint" (plan.md section 17.6; addbeforerelease.txt section 8).
 *
 * This suite FAILS the build on:
 * - a key present in one locale but missing in the other,
 * - empty / whitespace-only values or values with stray edge whitespace,
 * - placeholder mismatches (`{name}` in one locale only),
 * - untranslated values (identical bg/en text outside a small allow-list),
 * - malformed (non flat dot-separated) keys,
 * - missing `review.<key>` notes for legal/payment/ticket wording,
 * - a missing key from the mobile-ui key contract.
 */

import { extractPlaceholders } from '../../src/i18n/catalog';
import {
  ERROR_MESSAGE_KEYS,
  ORDER_STATE_LABEL_KEYS,
  PROVENANCE_DESCRIPTION_KEYS,
  PROVENANCE_LABEL_KEYS,
  TICKET_STATUS_LABEL_KEYS,
  TRANSLATION_REVIEW_KEYS,
} from '../../src/i18n/keys';
import bg from '../../src/i18n/locales/bg.json';
import en from '../../src/i18n/locales/en.json';

const catalogs = { bg: bg as Record<string, string>, en: en as Record<string, string> };
const bgKeys = Object.keys(catalogs.bg);
const enKeys = Object.keys(catalogs.en);

/** Values that are legitimately identical across locales. */
const IDENTICAL_VALUE_ALLOW_LIST = new Set([
  'common.app_name', // brand/working product name — see review.common.app_name
  'settings.language_option_bg', // language names shown in their own language
  'settings.language_option_en',
]);

function isReviewKey(key: string): boolean {
  return key.startsWith('review.');
}

describe('locale catalogs: key parity', () => {
  it('has exactly the same keys in bg and en', () => {
    const missingInEn = bgKeys.filter((key) => !(key in catalogs.en));
    const missingInBg = enKeys.filter((key) => !(key in catalogs.bg));
    expect({ missingInEn, missingInBg }).toEqual({ missingInEn: [], missingInBg: [] });
  });

  it('is not empty', () => {
    expect(bgKeys.length).toBeGreaterThan(50);
    expect(enKeys.length).toBe(bgKeys.length);
  });

  it('uses flat dot-separated keys only', () => {
    const malformed = [...bgKeys, ...enKeys].filter(
      (key) => !/^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(key),
    );
    expect([...new Set(malformed)]).toEqual([]);
  });
});

describe('locale catalogs: value sanity', () => {
  it.each(['bg', 'en'] as const)('%s has no empty or padded values', (locale) => {
    const bad = Object.entries(catalogs[locale])
      .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });

  it.each(['bg', 'en'] as const)('%s values have no stray edge whitespace', (locale) => {
    const bad = Object.entries(catalogs[locale])
      .filter(([, value]) => value !== value.trim())
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });

  it.each(['bg', 'en'] as const)(
    '%s values have no unbalanced placeholders',
    (locale) => {
      // After removing every well-formed `{name}`, no stray brace may remain.
      const bad = Object.entries(catalogs[locale])
        .filter(([, value]) => {
          const scrubbed = value.replace(/\{[A-Za-z0-9_]+\}/g, '');
          return scrubbed.includes('{') || scrubbed.includes('}');
        })
        .map(([key]) => key);
      expect(bad).toEqual([]);
    },
  );
});

describe('locale catalogs: placeholder parity', () => {
  it('uses the same placeholders for every key in bg and en', () => {
    const mismatches: Record<string, { bg: string[]; en: string[] }> = {};
    for (const key of bgKeys) {
      if (!(key in catalogs.en)) continue;
      const bgPlaceholders = extractPlaceholders(catalogs.bg[key]).sort();
      const enPlaceholders = extractPlaceholders(catalogs.en[key]).sort();
      if (JSON.stringify(bgPlaceholders) !== JSON.stringify(enPlaceholders)) {
        mismatches[key] = { bg: bgPlaceholders, en: enPlaceholders };
      }
    }
    expect(mismatches).toEqual({});
  });

  it('never repeats a placeholder name inside one value', () => {
    const duplicated = (['bg', 'en'] as const).flatMap((locale) =>
      Object.entries(catalogs[locale])
        .filter(([, value]) => {
          const names = extractPlaceholders(value);
          return new Set(names).size !== names.length;
        })
        .map(([key]) => `${locale}.${key}`),
    );
    expect(duplicated).toEqual([]);
  });
});

describe('locale catalogs: untranslated-value guard', () => {
  it('has different text in bg and en outside the allow-list', () => {
    const identical = bgKeys.filter(
      (key) =>
        key in catalogs.en &&
        catalogs.bg[key] === catalogs.en[key] &&
        !IDENTICAL_VALUE_ALLOW_LIST.has(key) &&
        !isReviewKey(key),
    );
    expect(identical).toEqual([]);
  });
});

describe('locale catalogs: review markers', () => {
  it('has a review note for every flagged legal/payment/ticket key', () => {
    const missing = TRANSLATION_REVIEW_KEYS.filter(
      (key) =>
        !(`review.${key}` in catalogs.bg) ||
        !(`review.${key}` in catalogs.en) ||
        catalogs.bg[`review.${key}`].trim().length === 0,
    );
    expect(missing).toEqual([]);
  });

  it('only reviews keys that actually exist', () => {
    const orphans = [...bgKeys, ...enKeys]
      .filter(isReviewKey)
      .map((key) => key.slice('review.'.length))
      .filter((key) => !(key in catalogs.bg) || !(key in catalogs.en));
    expect([...new Set(orphans)]).toEqual([]);
  });

  it('marks every review note as needing human review', () => {
    const bad = [...bgKeys, ...enKeys]
      .filter(isReviewKey)
      .filter(
        (key) =>
          !(key in catalogs.bg) ||
          !/REVIEW|UNCONFIRMED/.test(catalogs.bg[key]) ||
          !/REVIEW|UNCONFIRMED/.test(catalogs.en[key]),
      );
    expect([...new Set(bad)]).toEqual([]);
  });
});

describe('locale catalogs: mobile-ui key contract', () => {
  const contractKeys = [
    // common.*
    'common.app_name',
    'common.retry',
    'common.cancel',
    'common.confirm',
    'common.delete',
    'common.close',
    'common.next',
    'common.skip',
    'common.back',
    'common.start',
    'common.ok',
    // nav.*
    'nav.search',
    'nav.map',
    'nav.my_trips',
    'nav.tickets',
    'nav.settings',
    // onboarding.*
    'onboarding.step1.title',
    'onboarding.step1.body',
    'onboarding.step2.title',
    'onboarding.step2.body',
    'onboarding.step3.title',
    'onboarding.step3.body',
    'onboarding.step4.title',
    'onboarding.step4.body',
    'onboarding.page_indicator',
    'onboarding.start_cta',
    'onboarding.skip',
    // states.*
    'states.loading',
    'states.empty',
    'states.error',
    'states.offline',
    'states.timeout',
    // provenance.*
    'provenance.demo',
    'provenance.demo_desc',
    'provenance.scheduled',
    'provenance.scheduled_desc',
    'provenance.cached_stale',
    'provenance.cached_stale_desc',
    'provenance.real_time',
    'provenance.real_time_desc',
    // a11y.* (labels/hints mobile-ui wires into accessibility props)
    'a11y.tab_search_label',
    'a11y.tab_map_label',
    'a11y.tab_my_trips_label',
    'a11y.tab_tickets_label',
    'a11y.tab_settings_label',
    'a11y.skip_button_label',
    'a11y.next_button_label',
    'a11y.page_indicator',
    'a11y.provenance_badge',
    'a11y.provenance_badge_hint',
    'a11y.search_input_label',
    'a11y.search_input_hint',
    'a11y.search_result',
    'a11y.list_map_toggle_label',
    // settings.*
    'settings.language',
    'settings.help',
    'settings.replay_onboarding',
    // stations.* / map.*
    'stations.title',
    'stations.search_label',
    'stations.list_title',
    'stations.detail_title',
    'stations.nearby_title',
    'map.title',
    'map.list_map_toggle_label',
    'map.nearby_stations',
    'map.permission_denied',
  ];

  it('exists in both locales', () => {
    const missing = contractKeys.filter(
      (key) => !(key in catalogs.bg) || !(key in catalogs.en),
    );
    expect(missing).toEqual([]);
  });

  it('covers every ProviderErrorCode with an actionable message', () => {
    for (const key of Object.values(ERROR_MESSAGE_KEYS)) {
      expect(catalogs.bg[key]).toBeDefined();
      expect(catalogs.en[key]).toBeDefined();
      // Checklist section 7: never just "something went wrong".
      expect(catalogs.en[key].length).toBeGreaterThan(20);
    }
  });

  it('covers provenance kinds, order states and ticket statuses', () => {
    for (const key of [
      ...Object.values(PROVENANCE_LABEL_KEYS),
      ...Object.values(PROVENANCE_DESCRIPTION_KEYS),
      ...Object.values(ORDER_STATE_LABEL_KEYS),
      ...Object.values(TICKET_STATUS_LABEL_KEYS),
    ]) {
      expect(catalogs.bg[key]).toBeDefined();
      expect(catalogs.en[key]).toBeDefined();
    }
  });
});
