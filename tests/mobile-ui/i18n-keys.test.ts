/**
 * i18n key-contract test for the strings THIS workstream (mobile-ui) renders.
 *
 * Every key the design system, onboarding and route screens use must exist
 * in BOTH locale catalogs (plan.md 17.6, checklist §8). Keys still pending
 * reconciliation with the i18n workstream are listed explicitly in
 * `PENDING_KEYS` — the test fails if any OTHER key is missing, and warns as
 * long as a pending key is still absent.
 */
import { catalogs, translate, type Locale } from '../../src/i18n';

/** Keys requested from the i18n workstream (mobile-ui report, Phase 2). */
const PENDING_KEYS: readonly string[] = [
  'scaffold.placeholder_body',
  'scaffold.coming_soon',
  'scaffold.states_preview',
  'tickets.unavailable_notice',
];

/** Every key consumed by src/components, src/features/onboarding, src/app. */
const REQUIRED_KEYS: readonly string[] = [
  'common.app_name',
  'common.retry',
  'common.cancel',
  'common.confirm',
  'common.delete',
  'common.close',
  'common.next',
  'common.back',
  'common.ok',
  'nav.search',
  'nav.map',
  'nav.my_trips',
  'nav.tickets',
  'nav.settings',
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
  'states.loading',
  'states.empty',
  'states.error',
  'states.offline',
  'states.timeout',
  'errors.timeout',
  'errors.cancelled',
  'errors.offline',
  'errors.network',
  'errors.rate_limited',
  'errors.upstream_error',
  'errors.invalid_response',
  'errors.not_found',
  'errors.conflict',
  'errors.forbidden',
  'errors.unsupported',
  'errors.unknown',
  'a11y.provenance_badge',
  'a11y.provenance_badge_hint',
  'a11y.page_indicator',
  'a11y.skip_button_label',
  'a11y.skip_button_hint',
  'a11y.next_button_label',
  'a11y.next_button_hint',
  'a11y.start_button_label',
  'a11y.start_button_hint',
  'a11y.tab_search_label',
  'a11y.tab_map_label',
  'a11y.tab_my_trips_label',
  'a11y.tab_settings_label',
  'settings.language',
  'settings.help',
  'settings.replay_onboarding',
  'settings.replay_onboarding_hint',
  'validation.required',
  'provenance.demo',
  'provenance.demo_desc',
  'provenance.scheduled',
  'provenance.scheduled_desc',
  'provenance.cached_stale',
  'provenance.cached_stale_desc',
  'provenance.real_time',
  'provenance.real_time_desc',
  ...PENDING_KEYS,
];

const LOCALES: readonly Locale[] = ['bg', 'en'];

describe('i18n keys used by mobile-ui', () => {
  it.each(LOCALES)('exist and are non-empty in the %s catalog', (locale) => {
    const missing = REQUIRED_KEYS.filter((key) => {
      const value = catalogs[locale][key];
      return typeof value !== 'string' || value.trim().length === 0;
    });
    const unexpected = missing.filter((key) => !PENDING_KEYS.includes(key));
    const pending = missing.filter((key) => PENDING_KEYS.includes(key));

    if (pending.length > 0) {
      // Known cross-agent gap: requested from the i18n workstream; the lead
      // reconciles. Surfaces in the test output until it lands.
      console.warn(
        `PENDING i18n keys still missing in "${locale}": ${pending.join(', ')}`,
      );
    }
    expect({ locale, unexpectedMissing: unexpected }).toEqual({
      locale,
      unexpectedMissing: [],
    });
  });

  it('interpolates the page indicator params', () => {
    const rendered = translate('en', 'onboarding.page_indicator', { page: 2, total: 4 });
    expect(rendered).toContain('2');
    expect(rendered).toContain('4');
    expect(rendered).not.toContain('{');
  });
});
