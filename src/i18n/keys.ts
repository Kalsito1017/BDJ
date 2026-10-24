/**
 * Typed maps from domain values to translation keys.
 *
 * The `Record<Domain, string>` shapes make key completeness a COMPILE-TIME
 * property: if a `ProviderErrorCode`, provenance kind, order state or ticket
 * status is added in `src/types/`, this file stops type-checking until the
 * new key exists in both locale catalogs (checked by
 * `tests/i18n/locale-parity.test.ts` as well).
 *
 * TRANSLATION_REVIEW_KEYS lists strings that MUST NOT ship without a human
 * review (legal / payment / ticket terms — addbeforerelease.txt section 8).
 * Each listed key needs a `review.<key>` note in both locale catalogs; the
 * parity test enforces that.
 */

import type { ProviderErrorCode } from '../types/errors';
import type { OrderStateName } from '../types/order';
import type { ProvenanceKind } from '../types/provenance';
import type { TicketStatus } from '../types/ticket';

export const ERROR_MESSAGE_KEYS: Record<ProviderErrorCode, string> = {
  timeout: 'errors.timeout',
  cancelled: 'errors.cancelled',
  offline: 'errors.offline',
  network: 'errors.network',
  rate_limited: 'errors.rate_limited',
  upstream_error: 'errors.upstream_error',
  invalid_response: 'errors.invalid_response',
  not_found: 'errors.not_found',
  conflict: 'errors.conflict',
  forbidden: 'errors.forbidden',
  unsupported: 'errors.unsupported',
  unknown: 'errors.unknown',
};

export const PROVENANCE_LABEL_KEYS: Record<ProvenanceKind, string> = {
  demo: 'provenance.demo',
  scheduled: 'provenance.scheduled',
  'cached-stale': 'provenance.cached_stale',
  'real-time': 'provenance.real_time',
};

export const PROVENANCE_DESCRIPTION_KEYS: Record<ProvenanceKind, string> = {
  demo: 'provenance.demo_desc',
  scheduled: 'provenance.scheduled_desc',
  'cached-stale': 'provenance.cached_stale_desc',
  'real-time': 'provenance.real_time_desc',
};

export const ORDER_STATE_LABEL_KEYS: Record<OrderStateName, string> = {
  draft: 'order_state.draft',
  price_confirmed: 'order_state.price_confirmed',
  pending_payment: 'order_state.pending_payment',
  paid: 'order_state.paid',
  ticket_issued: 'order_state.ticket_issued',
  payment_failed: 'order_state.payment_failed',
  issuance_failed: 'order_state.issuance_failed',
  cancelled: 'order_state.cancelled',
  refund_pending: 'order_state.refund_pending',
  refunded: 'order_state.refunded',
};

export const TICKET_STATUS_LABEL_KEYS: Record<TicketStatus, string> = {
  issued: 'ticket_state.issued',
  valid: 'ticket_state.valid',
  used: 'ticket_state.used',
  expired: 'ticket_state.expired',
  voided: 'ticket_state.voided',
  refunded: 'ticket_state.refunded',
};

/**
 * Strings that need a HUMAN TRANSLATION REVIEW before release (legal,
 * payment and ticket-terms wording drafted by an AI agent). Every entry must
 * have a `review.<key>` note in `src/i18n/locales/bg.json` and `en.json`.
 */
export const TRANSLATION_REVIEW_KEYS: readonly string[] = [
  'onboarding.step3.title',
  'onboarding.step3.body',
  'tickets.unavailable_notice',
  ...Object.values(ORDER_STATE_LABEL_KEYS),
  ...Object.values(TICKET_STATUS_LABEL_KEYS),
];
