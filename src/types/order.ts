/**
 * Order and purchase domain models — STATE MACHINE SPEC (plan.md 17.3,
 * addbeforerelease.txt section 4).
 *
 * STATUS: specification only. In-app ticket sales are disabled (DEC-004).
 * The mock TicketingProvider exercises this machine in development; no
 * real orders exist and no payment data is ever accepted by the app
 * (DEC-008).
 *
 * The machine is server-controlled: the mobile client may REQUEST
 * transitions but the authoritative state lives with the ticketing
 * provider/backend. The client treats any locally displayed state as a
 * cached view that must be re-fetched (`getOrder`) after every operation.
 *
 * Transitions (see ORDER_STATE_TRANSITIONS below and docs/decisions.md
 * DEC-008 for the full spec incl. idempotency and duplicate callbacks):
 *
 *   draft ──> price_confirmed ──> pending_payment ──> paid ──> ticket_issued
 *     │              │                   │              │
 *     │              │                   ├─> payment_failed ─> (retry: pending_payment | cancelled)
 *     │              │                   └─> cancelled
 *     │              └─> cancelled
 *     └─> cancelled
 *
 *   paid ──> issuance_failed ─> (reconciliation: ticket_issued | refund_pending)
 *   ticket_issued | paid | issuance_failed ──> refund_pending ──> refunded
 *   refund_pending ──> ticket_issued   (refund rejected; order stands)
 */

import type { EntityId, IdempotencyKey, ISODate, ISODateTime, Money } from './common';
import type { InformationProvenance } from './provenance';

export type OrderStateName =
  | 'draft'
  | 'price_confirmed'
  | 'pending_payment'
  | 'paid'
  | 'ticket_issued'
  | 'payment_failed'
  | 'issuance_failed'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded';

/** Passenger category as supplied by the authorised provider. Do not hard-code
 *  discount categories: they come from current approved provider data at
 *  purchase time (plan.md 17.3). */
export interface Passenger {
  /** Provider-defined category label/code verbatim; 'adult' when the source does not distinguish. */
  type: string;
  count: number;
  /** Discount/eligibility description verbatim from the provider, when applicable. */
  discountLabel?: string;
  /** Documented per-passenger requirements (e.g. ID details) — only what the
   *  authorised provider requires, collected only when ticketing is enabled. */
  requiredFields?: readonly string[];
}

export interface OrderPricing {
  /** Sum of fare lines; integer minor units (DEC-006). */
  total: Money;
  /** Per-line breakdown as supplied by the provider (fare, reservation, discount). */
  lines: readonly OrderPricingLine[];
  /** Price is valid until this instant; after it, `confirmPrice` must be re-run. */
  validUntil: ISODateTime;
  /** Cancellation/refund/discount conditions verbatim from the current approved
   *  provider terms — never copy from a web page (plan.md 17.3). */
  termsText?: string;
}

export interface OrderPricingLine {
  label: string;
  amount: Money;
  kind: 'fare' | 'reservation' | 'discount' | 'fee' | 'tax' | 'other';
}

/** Which journey/offer the order is for. Journey identifiers must come from the
 *  same TicketingProvider (or the authorised bridge) that will issue the ticket. */
export interface OrderJourney {
  journeyId: EntityId;
  travelDate: ISODate;
  fromStationId: string;
  toStationId: string;
}

/* ------------------------------------------------------------------ */
/* Per-state payloads (discriminated union on `status`)                */
/* ------------------------------------------------------------------ */

export interface DraftState {
  status: 'draft';
  /** Provisional quote if the provider already returned one. */
  pricing?: OrderPricing;
}

export interface PriceConfirmedState {
  status: 'price_confirmed';
  pricing: OrderPricing;
  confirmedAt: ISODateTime;
}

export interface PendingPaymentState {
  status: 'pending_payment';
  /** Reference of the payment attempt in the provider-hosted checkout. */
  paymentReference: string;
  startedAt: ISODateTime;
}

export interface PaidState {
  status: 'paid';
  paymentReference: string;
  paidAt: ISODateTime;
}

export interface TicketIssuedState {
  status: 'ticket_issued';
  paymentReference: string;
  paidAt: ISODateTime;
  issuedAt: ISODateTime;
  ticketIds: readonly EntityId[];
}

export interface PaymentFailedState {
  status: 'payment_failed';
  paymentReference?: string;
  failedAt: ISODateTime;
  /** Provider-supplied reason code, verbatim; mapped to user-facing text in the UI layer. */
  reasonCode?: string;
  /** Whether the customer may retry payment on this order. */
  retryable: boolean;
}

export interface IssuanceFailedState {
  status: 'issuance_failed';
  /** Money was taken but no ticket exists yet — reconciliation job required
   *  (plan.md 17.3; addbeforerelease.txt section 4). */
  paymentReference: string;
  paidAt: ISODateTime;
  failedAt: ISODateTime;
  reasonCode?: string;
}

export interface CancelledState {
  status: 'cancelled';
  cancelledAt: ISODateTime;
  reasonCode?: string;
}

export interface RefundPendingState {
  status: 'refund_pending';
  requestedAt: ISODateTime;
  refundReference?: string;
}

export interface RefundedState {
  status: 'refunded';
  requestedAt: ISODateTime;
  refundedAt: ISODateTime;
  refundedAmount: Money;
  refundReference?: string;
}

export type OrderState =
  | CancelledState
  | DraftState
  | IssuanceFailedState
  | PaymentFailedState
  | PaidState
  | PriceConfirmedState
  | PendingPaymentState
  | RefundPendingState
  | RefundedState
  | TicketIssuedState;

/* ------------------------------------------------------------------ */
/* Order aggregate and audit trail                                     */
/* ------------------------------------------------------------------ */

export type OrderActor = 'client' | 'server' | 'provider' | 'reconciliation_job';

export interface OrderStateTransition {
  from: OrderStateName;
  to: OrderStateName;
  at: ISODateTime;
  actor: OrderActor;
  /** Idempotency key of the request that caused the transition, when applicable. */
  idempotencyKey?: IdempotencyKey;
  /** Provider/own reason code verbatim. Never payment secrets. */
  reasonCode?: string;
}

export interface Order {
  id: EntityId;
  /** Key supplied by the client at creation; see DEC-008 idempotency rules. */
  idempotencyKey: IdempotencyKey;
  state: OrderState;
  journey: OrderJourney;
  passengers: readonly Passenger[];
  pricing?: OrderPricing;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  /** Immutable audit trail of state changes (addbeforerelease.txt section 4:
   *  "order audit trail without logging payment secrets"). */
  history: readonly OrderStateTransition[];
  provenance: InformationProvenance;
}

/**
 * Allowed transitions — single source of truth for server AND tests.
 * Any transition not listed here MUST be rejected (error code 'conflict').
 * The mock provider (Appendix A, docs/decisions.md) must enforce this map
 * and the Phase 4/5 test suite must verify it.
 */
export const ORDER_STATE_TRANSITIONS: Readonly<Record<OrderStateName, readonly OrderStateName[]>> = {
  draft: ['price_confirmed', 'cancelled'],
  price_confirmed: ['pending_payment', 'cancelled'],
  pending_payment: ['paid', 'payment_failed', 'cancelled'],
  paid: ['ticket_issued', 'issuance_failed', 'refund_pending'],
  ticket_issued: ['refund_pending'],
  payment_failed: ['pending_payment', 'cancelled'],
  issuance_failed: ['ticket_issued', 'refund_pending'],
  cancelled: [],
  refund_pending: ['refunded', 'ticket_issued'],
  refunded: [],
};

/** Terminal states: no further transitions except those listed above. */
export const TERMINAL_ORDER_STATES: readonly OrderStateName[] = ['cancelled', 'refunded'];
