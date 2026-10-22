/**
 * TicketingProvider — the seam that keeps purchase/issuance logic behind
 * one interface so an AUTHORISED implementation can be added later
 * without rewriting screens (plan.md 17.1, addbeforerelease.txt section 4).
 *
 * HARD RULES (rules 3-4; plan.md 17.1; DEC-004/DEC-008):
 *  - In-app ticket sales are DISABLED (feature flag `ticketSales` OFF).
 *    Screens using this interface are unreachable in release builds until
 *    the TICKETING GATE passes.
 *  - The only implementation today is MockTicketingProvider (Appendix A,
 *    docs/decisions.md). A live implementation may be written ONLY after
 *    written BDZ authorization and a supported integration exist.
 *  - Payment card data NEVER enters the app or any code in this repo:
 *    there are deliberately NO fields for card numbers, CVV, IBAN or
 *    similar anywhere in these types. Payment happens exclusively in a
 *    provider-hosted, PCI-compliant checkout (plan.md 17.3). Never add
 *    such fields — if a provider "requires" them, that is a blocker for
 *    the human owner, not a schema change.
 *  - No BDZ account credentials are ever collected or stored (plan.md 17.1).
 *
 * SEMANTICS (DEC-008):
 *  - State transitions are server-controlled; this interface only requests
 *    them. `ORDER_STATE_TRANSITIONS` in src/types/order.ts is the single
 *    source of truth for legal transitions.
 *  - Every state-changing method takes an `IdempotencyKey`. Replaying the
 *    same key MUST return the same result without a second charge/order.
 *  - Payment status is verified server-to-server; the app never treats a
 *    client-side redirect/callback as proof of payment — it re-fetches
 *    `getOrder` until the state settles (poll with bounded attempts).
 *  - All methods reject with `ProviderError` and use the timeout/
 *    cancellation semantics of `services/common/RequestOptions.ts`.
 *    Ticketing calls use `NO_AUTO_RETRY_POLICY`: retries happen only via
 *    explicit user action plus idempotency keys.
 *
 * Spec-only file: types only, no logic, no dependency imports.
 */

import type { RequestOptions } from '../common/RequestOptions';
import type { IdempotencyKey, ISODateTime } from '../../types/common';
import type { Order, OrderJourney, Passenger, OrderPricing } from '../../types/order';
import type { Ticket } from '../../types/ticket';

/** What an implementation supports. `MockTicketingProvider` reports all true;
 *  an authorised provider reports only what BDZ's integration actually
 *  supports — never optimistic values. */
export interface TicketingProviderCapabilities {
  readonly supportsCancellations: boolean;
  readonly supportsRefunds: boolean;
  readonly supportsPartialRefunds: boolean;
  readonly supportsSeatReservation: boolean;
  /** Checkout surface: the app only ever hands the user off to a hosted page. */
  readonly checkoutKind: 'provider-hosted-web';
}

export interface CreateOrderInput {
  journey: OrderJourney;
  passengers: readonly Passenger[];
  idempotencyKey: IdempotencyKey;
}

export interface ConfirmPriceInput {
  orderId: string;
  idempotencyKey: IdempotencyKey;
}

/**
 * Result of re-validating price/availability immediately before payment
 * (plan.md 17.3). `priceChanged: true` means the user must re-confirm the
 * new total before any payment starts.
 */
export interface PriceConfirmation {
  order: Order;
  priceChanged: boolean;
  pricing: OrderPricing;
}

/**
 * Handle to a provider-hosted checkout session. Contains NO payment
 * details — only where to send the user. `returnUrl`/`cancelUrl` are
 * app deep links so the user returns to the order screen.
 */
export interface CheckoutSession {
  /** HTTPS URL of the provider's hosted checkout. */
  checkoutUrl: string;
  expiresAt: ISODateTime;
  /** Provider-side session reference. */
  referenceId: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface InitiatePaymentInput {
  orderId: string;
  idempotencyKey: IdempotencyKey;
  returnUrl: string;
  cancelUrl: string;
}

export interface CancelOrderInput {
  orderId: string;
  idempotencyKey: IdempotencyKey;
  reasonCode?: string;
}

export interface RequestRefundInput {
  orderId: string;
  idempotencyKey: IdempotencyKey;
  /** Optional partial refund in integer minor units; full refund when omitted. */
  amountMinor?: number;
  reasonCode?: string;
}

export interface TicketingProvider {
  readonly id: string;
  readonly displayName: string;
  readonly capabilities: TicketingProviderCapabilities;

  /** Create a draft order (state `draft`). Same idempotency key -> same order. */
  createOrder(input: CreateOrderInput, options?: RequestOptions): Promise<Order>;

  /**
   * Revalidate availability and price server-side and move to
   * `price_confirmed`. If the price changed, `priceChanged` is true and the
   * client MUST show the new total before calling `initiatePayment`.
   */
  confirmPrice(input: ConfirmPriceInput, options?: RequestOptions): Promise<PriceConfirmation>;

  /**
   * Start provider-hosted checkout: moves the order to `pending_payment`
   * and returns the URL to open in the system browser/in-app web view.
   * Never receives card data.
   */
  initiatePayment(input: InitiatePaymentInput, options?: RequestOptions): Promise<CheckoutSession>;

  /**
   * Authoritative order view. The client polls this after returning from
   * checkout (bounded attempts + backoff) because payment confirmation
   * arrives server-to-server and may be delayed or duplicated (DEC-008).
   */
  getOrder(orderId: string, options?: RequestOptions): Promise<Order>;

  /** Order history for "My trips / Tickets". */
  listOrders(options?: RequestOptions): Promise<readonly Order[]>;

  /** Request cancellation (order -> `cancelled`, or refund flow for paid orders
   *  per provider policy). Legal only where `ORDER_STATE_TRANSITIONS` allows. */
  cancelOrder(input: CancelOrderInput, options?: RequestOptions): Promise<Order>;

  /** Request a refund (-> `refund_pending`, later `refunded` or back to
   *  `ticket_issued` when the provider rejects the refund). */
  requestRefund(input: RequestRefundInput, options?: RequestOptions): Promise<Order>;

  /** Ticket artefact for display/inspection. Resolves `not_found` when
   *  issuance has not been confirmed by the authoritative provider. */
  getTicket(ticketId: string, options?: RequestOptions): Promise<Ticket>;
}

/**
 * Callback/webhook note: payment provider callbacks are received and
 * verified SERVER-SIDE (signature verification, duplicate-delivery
 * handling, retries — addbeforerelease.txt section 4). This interface has
 * no `handleCallback` method on purpose: a mobile client must never be
 * the recipient of payment truth. When a backend exists (DEC-003), the
 * app observes effects only through `getOrder`.
 */
export type TicketingProviderNote = 'payment-callbacks-are-server-side-only';
