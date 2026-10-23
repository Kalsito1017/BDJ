/**
 * Feature-flag gate tests (rule 3; plan.md 17.1/17.9; addbeforerelease.txt
 * §4/§11; docs/decisions.md DEC-004).
 *
 * Intended behaviour, independent of any flag-store implementation: the
 * committed DEFAULTS are gate decisions, not code preferences. In
 * particular `ticketSales` must default OFF and require named-human approval
 * to change, until written BDZ authorization and a supported integration
 * exist. A test failing here is a launch-gate alarm, not a refactor signal.
 */

import {
  FEATURE_FLAG_DEFINITIONS,
  type FeatureFlagName,
} from '../../src/types/feature-flags';

/** The seven flags named in DEC-004. */
const SPEC_FLAG_NAMES: readonly FeatureFlagName[] = [
  'ticketSales',
  'officialBdzTicketingLink',
  'accounts',
  'mapStationDiscovery',
  'onboarding',
  'realTimeData',
  'analytics',
];

describe('feature flag gates (DEC-004)', () => {
  it('defines exactly the documented flags', () => {
    expect(Object.keys(FEATURE_FLAG_DEFINITIONS).sort()).toEqual(
      [...SPEC_FLAG_NAMES].sort(),
    );
  });

  it('keeps every definition self-consistent (key matches name)', () => {
    for (const [key, definition] of Object.entries(FEATURE_FLAG_DEFINITIONS)) {
      expect(definition.name).toBe(key);
      expect(typeof definition.defaultEnabled).toBe('boolean');
      expect(definition.gate.length).toBeGreaterThan(0);
    }
  });

  it('keeps ticket sales DISABLED by default (rule 3 / TICKETING GATE)', () => {
    const ticketSales = FEATURE_FLAG_DEFINITIONS.ticketSales;
    expect(ticketSales.defaultEnabled).toBe(false);
    expect(ticketSales.changeRequiresHumanApproval).toBe(true);
  });

  it('keeps every human-gated flag OFF until its gate evidence exists', () => {
    // DEC-004 table: ticketSales, officialBdzTicketingLink, accounts,
    // realTimeData, analytics are all OFF by default and human-gated.
    const humanGated: readonly FeatureFlagName[] = [
      'ticketSales',
      'officialBdzTicketingLink',
      'accounts',
      'realTimeData',
      'analytics',
    ];
    for (const name of humanGated) {
      expect(FEATURE_FLAG_DEFINITIONS[name].defaultEnabled).toBe(false);
      expect(FEATURE_FLAG_DEFINITIONS[name].changeRequiresHumanApproval).toBe(true);
    }
  });

  it('keeps public features on and ungated', () => {
    expect(FEATURE_FLAG_DEFINITIONS.onboarding.defaultEnabled).toBe(true);
    expect(FEATURE_FLAG_DEFINITIONS.onboarding.changeRequiresHumanApproval).toBe(false);
    expect(FEATURE_FLAG_DEFINITIONS.mapStationDiscovery.defaultEnabled).toBe(true);
    expect(FEATURE_FLAG_DEFINITIONS.mapStationDiscovery.changeRequiresHumanApproval).toBe(
      false,
    );
  });

  it('requires human approval for anything that could claim real-time data', () => {
    // Rule 6: real-time rendering needs a verified, authorised live source
    // (DEC-002) — never an engineering-side toggle flip.
    expect(FEATURE_FLAG_DEFINITIONS.realTimeData.defaultEnabled).toBe(false);
    expect(FEATURE_FLAG_DEFINITIONS.realTimeData.changeRequiresHumanApproval).toBe(true);
  });
});
