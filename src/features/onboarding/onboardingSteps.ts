/**
 * Onboarding step content (plan.md 17.7).
 *
 * Four skippable screens: Find a train / Check your trip / Tickets / Map and
 * language. All copy comes from i18n keys — nothing is hard-coded here
 * (DEC-014 finding M2; addbeforerelease.txt §8).
 *
 * Content rules baked into the copy contract:
 * - Step 3 (Tickets) explains the authorized purchase path ONLY: no purchase
 *   UI, no prices, no payment fields anywhere in the app (ticketSales flag
 *   OFF — DEC-004; plan.md 17.1).
 * - No permission prompts appear during onboarding (plan.md 17.7): no
 *   location/notification requests are made in this feature at all.
 * - No consent of any kind is preselected or collected here (plan.md 17.7,
 *   checklist §6).
 */
export interface OnboardingStep {
  /** Stable id for tests and analytics-free debugging. */
  id: 'find-train' | 'check-trip' | 'tickets' | 'map-language';
  titleKey: string;
  bodyKey: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'find-train',
    titleKey: 'onboarding.step1.title',
    bodyKey: 'onboarding.step1.body',
  },
  {
    id: 'check-trip',
    titleKey: 'onboarding.step2.title',
    bodyKey: 'onboarding.step2.body',
  },
  {
    id: 'tickets',
    titleKey: 'onboarding.step3.title',
    bodyKey: 'onboarding.step3.body',
  },
  {
    id: 'map-language',
    titleKey: 'onboarding.step4.title',
    bodyKey: 'onboarding.step4.body',
  },
];
