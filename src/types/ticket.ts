/**
 * Ticket domain models (plan.md 17.3).
 *
 * STATUS: specification only — in-app ticket sales are disabled (DEC-004).
 * A ticket exists only when an AUTHORITATIVE provider confirms it
 * (plan.md 17.3). The app never fabricates, signs or stores payment card
 * data (rules 3-4). Ticket artefacts are references to the provider's
 * artifact, never re-hosted proprietary formats.
 */

import type { EntityId, ISODate, ISODateTime } from './common';
import type { InformationProvenance } from './provenance';

export type TicketStatus = 'issued' | 'valid' | 'used' | 'expired' | 'voided' | 'refunded';

/**
 * How the ticket is displayed for inspection. The app shows the artefact the
 * authorised provider supplies; it does not generate its own QR/PDF with
 * assumed semantics.
 */
export interface TicketArtifact {
  /** `provider-url` (download/display), `qr-payload` (provider-supplied payload
   *  to render), or `provider-app-link` (deep link into the official flow). */
  kind: 'provider-url' | 'qr-payload' | 'provider-app-link';
  /** Opaque reference or payload exactly as supplied by the provider. */
  reference: string;
  /** Provider's display instructions verbatim, when supplied. */
  displayInstructions?: string;
  expiresAt?: ISODateTime;
}

export interface Ticket {
  id: EntityId;
  orderId: EntityId;
  status: TicketStatus;
  travelDate: ISODate;
  fromStationId: string;
  toStationId: string;
  /** Provider's official ticket number/reference verbatim. */
  providerTicketReference?: string;
  artifact: TicketArtifact;
  /** Cancellation/refund/support routes made visible in the user's account
   *  (plan.md 17.3). Provider-supplied URLs/text only. */
  supportRoutes?: readonly TicketSupportRoute[];
  issuedAt: ISODateTime;
  provenance: InformationProvenance;
}

export interface TicketSupportRoute {
  kind: 'support' | 'refund' | 'cancel' | 'terms';
  label: string;
  /** URL or in-app route supplied/approved by the provider — never invented. */
  target: string;
}
