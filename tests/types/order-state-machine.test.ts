/**
 * Order state-machine contract tests (plan.md 17.3, addbeforerelease.txt §4,
 * docs/decisions.md DEC-008).
 *
 * These tests encode the SPEC (the documented legal-transition table) written
 * out independently of `src/types/order.ts`. If the implementation table drifts
 * from the spec, these tests fail. They are not a mirror of the implementation:
 * the table below is transcribed from the decision record and the plan.
 *
 * Ticketing itself is disabled (feature flag `ticketSales` OFF — DEC-004);
 * this is the state machine a future mock/authorised provider must enforce.
 */

import {
  ORDER_STATE_TRANSITIONS,
  TERMINAL_ORDER_STATES,
  type OrderStateName,
} from '../../src/types/order';

/** Spec table: docs/decisions.md DEC-008 ("Legal transitions"). */
const SPEC_TRANSITIONS: Readonly<Record<OrderStateName, readonly OrderStateName[]>> = {
  draft: ['price_confirmed', 'cancelled'],
  price_confirmed: ['pending_payment', 'cancelled'],
  pending_payment: ['paid', 'payment_failed', 'cancelled'],
  paid: ['ticket_issued', 'issuance_failed', 'refund_pending'],
  payment_failed: ['pending_payment', 'cancelled'],
  issuance_failed: ['ticket_issued', 'refund_pending'],
  ticket_issued: ['refund_pending'],
  refund_pending: ['refunded', 'ticket_issued'],
  cancelled: [],
  refunded: [],
};

/** The ten states named in plan.md 17.3 / addbeforerelease.txt §4. */
const SPEC_STATE_NAMES: readonly OrderStateName[] = [
  'draft',
  'price_confirmed',
  'pending_payment',
  'paid',
  'ticket_issued',
  'payment_failed',
  'issuance_failed',
  'cancelled',
  'refund_pending',
  'refunded',
];

/**
 * Spec-level legality check, derived from the DOCUMENTED table (not from the
 * implementation) so illegal transitions can be called out by name below.
 */
function specAllows(from: OrderStateName, to: OrderStateName): boolean {
  return SPEC_TRANSITIONS[from].includes(to);
}

describe('order state machine — transition table (DEC-008)', () => {
  it('implements exactly the documented legal transitions', () => {
    expect(ORDER_STATE_TRANSITIONS).toEqual(SPEC_TRANSITIONS);
  });

  it('covers all ten documented states and no others', () => {
    const keys = Object.keys(ORDER_STATE_TRANSITIONS).sort();
    expect(keys).toEqual([...SPEC_STATE_NAMES].sort());
    expect(keys).toHaveLength(10);
  });

  it('has valid state names as every transition target', () => {
    for (const [from, targets] of Object.entries(ORDER_STATE_TRANSITIONS)) {
      for (const to of targets as readonly OrderStateName[]) {
        expect(SPEC_STATE_NAMES).toContain(from);
        expect(SPEC_STATE_NAMES).toContain(to);
      }
    }
  });

  it('allows the happy path draft → price_confirmed → pending_payment → paid → ticket_issued', () => {
    const happyPath: [OrderStateName, OrderStateName][] = [
      ['draft', 'price_confirmed'],
      ['price_confirmed', 'pending_payment'],
      ['pending_payment', 'paid'],
      ['paid', 'ticket_issued'],
    ];
    for (const [from, to] of happyPath) {
      expect(ORDER_STATE_TRANSITIONS[from]).toContain(to);
      expect(specAllows(from, to)).toBe(true);
    }
  });

  it('rejects transitions that skip the documented steps', () => {
    const illegal: [OrderStateName, OrderStateName][] = [
      ['draft', 'pending_payment'], // no price confirmation
      ['draft', 'paid'], // no price confirmation, no payment
      ['draft', 'ticket_issued'], // nothing may skip straight to a ticket
      ['price_confirmed', 'paid'], // payment attempt state is mandatory
      ['price_confirmed', 'ticket_issued'],
      ['pending_payment', 'ticket_issued'], // money state must be observed first
    ];
    for (const [from, to] of illegal) {
      expect(ORDER_STATE_TRANSITIONS[from]).not.toContain(to);
      expect(specAllows(from, to)).toBe(false);
    }
  });

  it('keeps transitions monotonic — settled money states cannot go backwards', () => {
    // DEC-008 rule 2: "a duplicate `paid` callback cannot move `ticket_issued`
    // backwards." The table must not contain a path back to an earlier phase.
    const regressions: [OrderStateName, OrderStateName][] = [
      ['ticket_issued', 'paid'],
      ['ticket_issued', 'pending_payment'],
      ['ticket_issued', 'price_confirmed'],
      ['ticket_issued', 'draft'],
      ['paid', 'pending_payment'],
      ['paid', 'price_confirmed'],
      ['refunded', 'refund_pending'],
      ['refunded', 'paid'],
      ['cancelled', 'draft'],
    ];
    for (const [from, to] of regressions) {
      expect(ORDER_STATE_TRANSITIONS[from]).not.toContain(to);
    }
  });

  it('treats cancelled and refunded as terminal', () => {
    expect(ORDER_STATE_TRANSITIONS.cancelled).toHaveLength(0);
    expect(ORDER_STATE_TRANSITIONS.refunded).toHaveLength(0);
    expect(TERMINAL_ORDER_STATES).toEqual(['cancelled', 'refunded']);
  });

  it('keeps the documented failure/recovery edges', () => {
    // payment_failed: explicit retry, or give up.
    expect(ORDER_STATE_TRANSITIONS.payment_failed).toEqual([
      'pending_payment',
      'cancelled',
    ]);
    expect(ORDER_STATE_TRANSITIONS.payment_failed).not.toContain('paid');

    // issuance_failed: money moved — only reconciliation (ticket) or refund.
    expect(ORDER_STATE_TRANSITIONS.issuance_failed).toEqual([
      'ticket_issued',
      'refund_pending',
    ]);
    expect(ORDER_STATE_TRANSITIONS.issuance_failed).not.toContain('paid');

    // refund_pending: refund completes, or is rejected and the order stands.
    expect(ORDER_STATE_TRANSITIONS.refund_pending).toEqual(['refunded', 'ticket_issued']);
    expect(ORDER_STATE_TRANSITIONS.paid).toContain('refund_pending');
    expect(ORDER_STATE_TRANSITIONS.ticket_issued).toEqual(['refund_pending']);
  });

  it('never allows a state to transition to itself', () => {
    for (const state of SPEC_STATE_NAMES) {
      expect(ORDER_STATE_TRANSITIONS[state]).not.toContain(state);
    }
  });
});
