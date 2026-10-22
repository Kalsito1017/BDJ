/**
 * Feature flags (addbeforerelease.txt section 11: "feature flags (ticketing
 * must sit behind a flag that is OFF until the gate passes)").
 *
 * Spec-only file. The flag store itself is built in the scaffold wave;
 * it must read these definitions and allow remote override ONLY after a
 * backend exists (DEC-003) — until then flags come from a local,
 * committed default plus dev-only overrides that never ship in release
 * builds.
 *
 * INVARIANT (rule 3 / plan.md 17.1): `ticketSales` MUST remain `false`
 * until written BDZ authorization AND a supported integration exist AND a
 * human owner approves (irreversible-ish go-live decision — rule 10).
 * Enabling it is a launch gate, not a code preference. See DEC-004.
 */

export type FeatureFlagName =
  /** In-app purchase/issuance of tickets. OFF until the TICKETING GATE passes. */
  | 'ticketSales'
  /** "Continue to official BDZ ticketing" external link. OFF until product/legal approve. */
  | 'officialBdzTicketingLink'
  /** Sign-up/sign-in features for the app's own service. Gated on product + security approval. */
  | 'accounts'
  /** Bulgaria map + station discovery (public feature). */
  | 'mapStationDiscovery'
  /** First-launch guide (public feature). */
  | 'onboarding'
  /** Any real-time data rendering. OFF until a verified live source exists (DEC-002). */
  | 'realTimeData'
  /** Analytics/telemetry. OFF until privacy review and consent design exist. */
  | 'analytics';

export interface FeatureFlagDefinition {
  readonly name: FeatureFlagName;
  /** Value used when no override is configured. */
  readonly defaultEnabled: boolean;
  /** The gate/owner decision that must exist before this flag may be enabled. */
  readonly gate: string;
  /** Enabling these requires explicit human approval (rule 10) and a DEC update. */
  readonly changeRequiresHumanApproval: boolean;
}

export const FEATURE_FLAG_DEFINITIONS: Readonly<Record<FeatureFlagName, FeatureFlagDefinition>> = {
  ticketSales: {
    name: 'ticketSales',
    defaultEnabled: false,
    gate:
      'TICKETING GATE: written BDZ authorization + supported integration + sandbox e2e test + human go/no-go (addbeforerelease.txt section 4)',
    changeRequiresHumanApproval: true,
  },
  officialBdzTicketingLink: {
    name: 'officialBdzTicketingLink',
    defaultEnabled: false,
    gate: 'Product/legal approval of the labelled external link (plan.md 17.1)',
    changeRequiresHumanApproval: true,
  },
  accounts: {
    name: 'accounts',
    defaultEnabled: false,
    gate: 'Product approval + identity-provider choice + security review (plan.md 17.2); guest access never requires it',
    changeRequiresHumanApproval: true,
  },
  mapStationDiscovery: {
    name: 'mapStationDiscovery',
    defaultEnabled: true,
    gate: 'Map SDK decision + licensed station dataset (DEC-012 pending; addbeforerelease.txt section 9)',
    changeRequiresHumanApproval: false,
  },
  onboarding: {
    name: 'onboarding',
    defaultEnabled: true,
    gate: 'None — public feature (plan.md 17.7)',
    changeRequiresHumanApproval: false,
  },
  realTimeData: {
    name: 'realTimeData',
    defaultEnabled: false,
    gate: 'Verified, authorised live data source (DEC-002)',
    changeRequiresHumanApproval: true,
  },
  analytics: {
    name: 'analytics',
    defaultEnabled: false,
    gate: 'Privacy review + separate consent design (addbeforerelease.txt section 6)',
    changeRequiresHumanApproval: true,
  },
};

/** Resolved flag values for the running app. */
export type FeatureFlags = Readonly<Record<FeatureFlagName, boolean>>;

/** Dev-only overrides. `ticketSales` may only ever be overridden to `false` in
 *  code review terms — enabling it is not an engineering decision (DEC-004). */
export type FeatureFlagOverrides = Partial<FeatureFlags>;
