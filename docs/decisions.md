# BDZ Train Companion App — Architecture Decision Log

Running decision log for the project. One entry per decision, newest last.
Entries follow: **ID — Title**; *Date*; *Status*; Context; Decision; Consequences.

- Status values: `Accepted`, `Superseded`, `Open`, `Noted`, `Rejected`.
- Conflicts between `plan.md` and `addbeforerelease.txt`: **the stricter rule
  wins and the conflict is recorded here** (addbeforerelease.txt preamble).
- Nothing in this log claims a build, test, integration or authorization that
  has not actually happened. Unknowns are listed as unknowns.

| ID | Title | Status |
|----|-------|--------|
| DEC-001 | Project workflow: Expo + Expo Router | Accepted |
| DEC-002 | Train data source: mock-only until a lawful source is documented | Accepted |
| DEC-003 | Backend: not justified now | Accepted |
| DEC-004 | Feature flags (ticketing OFF by default) | Accepted |
| DEC-005 | Folder structure | Accepted |
| DEC-006 | Domain model, provenance labelling, time and money conventions | Accepted |
| DEC-007 | Provider interfaces, errors, timeout/cancellation/retry, Zod at the boundary | Accepted |
| DEC-008 | Order state machine, idempotency, duplicate-callback behaviour | Accepted |
| DEC-009 | Dependency policy and verified baseline | Accepted |
| DEC-010 | Checklist file naming discrepancy + conflict rule | Noted |
| DEC-011 | Capacity-claims policy ("1,000,000 concurrent users") | Accepted |
| DEC-012 | Map SDK selection | Open |
| DEC-013 | Phase 0 integration record (lead verification + reconciliation) | Noted |
| DEC-014 | Phase 1 integration record: independent review findings and disposition | Noted |
| DEC-015 | Phase 2 UI shell: theme, routes, onboarding, UI states | Accepted |
| DEC-016 | i18n key governance: naming rules, locale-file ownership, claim-safe copy | Accepted |
| DEC-017 | Mock data layer: schemas, MockTrainDataProvider, shared request executor | Accepted |
| DEC-018 | Wave 3 integration record (i18n reconciliation + Map tab wiring) | Noted |
| DEC-019 | Wave 5 review record: findings disposition, i18n vocabulary rule, audit re-baseline | Noted |
| DEC-020 | Docker verification record (Phase 1 criterion closed) | Noted |
| DEC-021 | Phase 3/4 data access layer: TanStack Query hooks over TrainDataProvider | Accepted |
| DEC-022 | Phase 3 journey flow UI: routes, validation rules, key merge, resolver choice | Accepted |
| DEC-023 | Phase 3 review record: findings disposition and guard hardening | Noted |

---

## DEC-001 — Project workflow: Expo + Expo Router

- **Date:** 2026-10-22
- **Status:** Accepted

**Context.** plan.md §5 recommends "Expo + Expo Router, unless a verified native
requirement makes bare React Native preferable". The MVP needs navigation
(search → results → details, favourites), local storage, notifications *only if
in scope* (currently out of scope), a map (later phase), and store-distributable
iOS + Android builds. Docker on Linux cannot build native iOS (plan.md §2,
rule 8) — regardless of workflow, iOS artifacts require macOS/Xcode or a cloud
build service.

**Decision.** Use **Expo (managed workflow, prebuild-capable) with Expo Router**
as the project workflow and file-based navigation. iOS builds go through EAS
Build or a macOS runner; Android builds through EAS or the documented
Docker/Gradle path (plan.md §7).

**Evidence checked 2026-10-22** (versions verified before stating them,
rule 11): Expo SDK 58 is the current stable line (`expo@58.0.x`, MIT license;
`expo-router@58.0.x`; Expo SDK 58 targets React Native 0.88 / React 19.3,
minimum Node 22.13). Exact pins are set in the scaffold wave (DEC-009).

**Consequences.**

- (+) No hand-maintained native toolchain for routine development; over-the-air
  config updates and EAS build paths already match plan.md §7's guidance to
  "prefer Expo's supported build workflows".
- (+) Deep links (plan.md 17.5, checklist §9) come from the router's file-based
  route names.
- (+) `expo-secure-store` (Keychain/Keystore) is available for the session
  tokens required by plan.md 17.2 — never AsyncStorage (checklist §3).
- (−) EAS Build is a third-party dependency for iOS/Android artifacts; a
  self-hosted macOS runner remains an alternative. Free-tier EAS constraints are
  **unverified** — the owner must confirm the plan/quotas before relying on it.
- (−) If a verified native requirement appears that Expo cannot support (none
  known today), we fall back to bare React Native + React Navigation — that is a
  **new decision entry**, not a silent change.

---

## DEC-002 — Train data source: mock-only until a lawful source is documented

- **Date:** 2026-10-22
- **Status:** Accepted

**Context.** plan.md §4 requires identifying a lawful, reliable data source
before building journey-search screens. plan.md 17.1 lists public BDZ web
resources (ticketing portal, terms, help pages) but states explicitly that
public documentation is **not** permission to reuse BDZ APIs, scrape the portal,
or reverse engineer private endpoints. What is **not verified** in this session:

- whether any official BDZ API / open-data feed exists for journey search;
- terms permitting automated access, rate limits, fields, update frequency,
  attribution requirements;
- any authorization status or contact with BDZ (no contact has been made by
  this agent).

`docs/bdz-integration-review.md` and `docs/legal-compliance-matrix.md` were
created on 2026-10-22 by the concurrent discovery/legal agent; both record
data-source status **mock-only**, consistent with this decision. They remain
owned by human roles (checklist §§1, 17): no lawyer has reviewed them and no
human owner is named yet. (This entry's first draft said the two files did not
exist; they appeared in `docs/` while this log was being written — sibling
work, not deleted or modified by this agent.)

**Decision.** The app develops against **MockTrainDataProvider only**
(demo-labelled). No live endpoints, no scraped data, no browser automation.
`LiveTrainDataProvider` is not created until this decision is superseded by an
entry recording: source owner, written permission or official open feed, terms,
rate limits, fields, update frequency, attribution, and review date.

**Consequences.**

- (+) Nothing invented; every schedule-like value in the app is visibly "demo
  data" (checklist §1).
- (−) MVP cannot show real timetables until a source is approved. If no source
  is approved, plan.md §4.5 applies: ship with clearly labelled demo data and/or
  a station directory and **do not imply results are current**.
- Open questions for the human owner: BDZ contact/authorization status; whether
  a licensed station dataset exists for the map (DEC-012).

---

## DEC-003 — Backend: not justified now

- **Date:** 2026-10-22
- **Status:** Accepted

**Context.** plan.md §6: "Do not introduce a backend unless a verified data
source, secret, caching, or operational need justifies it." Checklist §11
restates it. Current scope: journey search against a mock provider, station
directory (bundle or on-device cache), favourites/recent searches (local only),
ticketing **disabled** (DEC-004), accounts **gated** (DEC-004), no push
notifications, no analytics.

**Decision.** **No backend in this phase.** The mobile app stands alone:
bundled/licensed station data, mock provider, local persistence.

**Revisit triggers** — any one of these starts a new decision entry:

1. An approved live data source requires a secret/credential or a proxy
   (plan.md §6: never embed private API keys in the app) — the trigger is the
   *secret*, not convenience.
2. Upstream rate limits/caching needs exceed what on-device caching can do.
3. The TICKETING GATE passes (orders, payments, webhooks, reconciliation are
   inherently server-side — plan.md 17.3).
4. Accounts are approved (auth requires server-side authorization — plan.md 17.2).
5. Operational need: remote feature flags, forced-update/minimum-version service
   (checklist §7), or support tooling (checklist §12).

**If a backend is later justified**, it must already satisfy plan.md 17.4 and
checklist §11 before design starts: stateless API instances behind a load
balancer with autoscaling; CDN for static assets/map tiles where licensing
permits; cache for public non-personal data with explicit freshness rules and
**never** shared caching of authenticated responses; managed HA database with
indexes, connection pooling, backups + tested restore, PITR, RPO/RTO agreed with
the operator; background job queue (email, notifications, reconciliation) with
retries/backoff/jitter, circuit breakers and a dead-letter queue; idempotency
and transactional consistency for orders/payments (never cache payment truth);
rate limits, timeouts, backpressure; observability (metrics, structured logs,
traces, dashboards, alerts, correlation IDs); DDoS/abuse protection via
infrastructure controls; graceful degradation of timetable/map browsing; dev,
staging and production environments that match; infrastructure as code; cost
alerts and spending caps from day one. Migrations: forward AND rollback, no hot
table locks; money in integer minor units; timestamps in UTC with
Europe/Sofia handling tested (checklist §2).

**Consequences.**

- (+) No infra to build/secure/operate before a verified need; no secrets in the
  mobile bundle.
- (−) No remote flags, no server-side caching, no accounts, no ticketing until a
  trigger fires. This is by design.
- (−) The capacity plan (docs/scale-and-load-test-plan.md) describes a system
  that does not exist yet; it is a design target, not a measurement.

---

## DEC-004 — Feature flags (ticketing OFF by default)

- **Date:** 2026-10-22
- **Status:** Accepted

**Context.** Checklist §11: "feature flags (ticketing must sit behind a flag
that is OFF until the gate passes)". plan.md 17.1/17.9: in-app ticket sales
remain disabled until the legal and technical authorization gate passes.
Accounts are conditional (plan.md 17.2). Analytics needs a privacy review
(checklist §6).

**Decision.** Feature flags are defined in `src/types/feature-flags.ts`
(`FEATURE_FLAG_DEFINITIONS`) with these defaults:

| Flag | Default | Gate before enabling |
|------|---------|----------------------|
| `ticketSales` | **OFF** | TICKETING GATE: written BDZ authorization + supported integration + sandbox e2e + human go/no-go |
| `officialBdzTicketingLink` | **OFF** | Product/legal approval of the labelled external link (plan.md 17.1) |
| `accounts` | **OFF** | Product approval + identity provider chosen + security review; guest access never requires an account |
| `realTimeData` | **OFF** | Verified, authorised live source (DEC-002) |
| `analytics` | **OFF** | Privacy review + separate consent design |
| `mapStationDiscovery` | ON | Map SDK decision (DEC-012) + licensed station dataset |
| `onboarding` | ON | none — public feature |

Flags marked "human approval" (`changeRequiresHumanApproval: true`) may only be
flipped by a named human owner after the gate evidence is recorded — an agent
must not enable them (rule 10: irreversible actions need explicit human
approval). Until a backend exists (DEC-003), flags come from committed local
defaults; dev-only overrides must not ship in release builds.

**Consequences.**

- (+) Purchase screens can be fully built and tested against the mock provider
  without any risk of a user reaching a "buy" flow.
- (−) Any UI for ticketing must be built behind the flag from day one; no
  "quick enable" path that bypasses the gate.

---

## DEC-005 — Folder structure

- **Date:** 2026-10-22
- **Status:** Accepted

**Context.** plan.md §6 gives the base tree. Section 17 adds map, onboarding,
auth and tickets features. The scaffold wave (Phase 1) creates the project
files; this entry fixes the `src/` layout so interface files placed now
(`src/types/`, `src/services/`) stay valid.

**Decision.** Feature-oriented layout, presentation separated from data access
(plan.md §6). Route files live in `src/app/` (Expo Router, DEC-001):

```text
src/
  app/                    # Expo Router route files / screen entry points
    (tabs)/               # Search | Map | My trips/Tickets | Settings (plan.md 17.7)
  components/             # reusable UI (buttons, cards, states)
  features/
    journey-search/
    journey-results/
    journey-details/
    stations/
    favourites/
    map/                  # added: map + station discovery (plan.md 17.5)
    onboarding/           # added: first-launch guide (plan.md 17.7)
    auth/                 # added: sign-in/up/reset (plan.md 17.2; behind flag)
    tickets/              # added: orders/tickets UI (plan.md 17.3; behind flag)
  services/
    common/               # RequestOptions, retry policy (DEC-007)
    train-data/           # TrainDataProvider.ts + implementations (DEC-002/007)
    ticketing/            # TicketingProvider.ts + mock implementation (DEC-008)
    api/                  # future HTTP client (only with a backend, DEC-003)
    storage/              # local persistence adapters (AsyncStorage/SecureStore)
  hooks/
  store/
  theme/
  i18n/
    locales/              # bg.json, en.json (plan.md 17.6)
  utils/
  types/                  # domain models (DEC-006)
  test/
assets/
tests/
scripts/
docs/
Dockerfile
docker-compose.yml
.env.example              # names + safe placeholders only (plan.md §7)
```

Rules carried over from plan.md §6: screens never call provider endpoints
directly; provider-specific mapping stays inside `services/`; typed domain
models + runtime validation for external responses; no secrets in the bundle or
Git history.

**Consequences.**

- (+) Interface files added in Phase 0 (`src/types/`, `src/services/`) need no
  move when the scaffold lands.
- (−) `src/app/` route names are the deep-link contract (checklist §9) —
  renaming routes later needs a decision entry.

---

## DEC-006 — Domain model, provenance labelling, time and money conventions

- **Date:** 2026-10-22
- **Status:** Accepted

**Context.** plan.md §4 suggests `JourneySearch`, `TrainSegment`, `Journey`,
`TrainDataProvider`. Sections 3 and 17 need transfers/legs, station records,
favourites/recent searches, orders and tickets, and — critically — a way to
guarantee rule 6 (demo / scheduled / cached-stale / real-time must never be
conflated). Checklist §2 demands UTC timestamps with tested Europe/Sofia
handling (incl. DST and midnight-crossing journeys) and money as integer minor
units.

**Decision.** Extend the plan.md §4 types in `src/types/` (same names and core
fields) and add:

- `src/types/provenance.ts` — `InformationProvenance` discriminated union with
  kinds `demo | scheduled | cached-stale | real-time`. Every journey and station
  carries provenance; the UI renders a label per kind. `real-time` is **reserved
  and unproducible** until DEC-002 is superseded; the mock provider emits
  `demo` only. `cached-stale` carries `cachedAt`/`expiresAt`/`staleReason`.
- `src/types/journey.ts` — `TrainSegment` keeps plan.md fields and gains
  `kind: 'train'`, optional `departureDayOffset`/`arrivalDayOffset`
  (midnight-crossing), optional `trainCategory`/`trainName`/`providerStatus`
  (verbatim from the source, never invented). `TransferSegment`
  (`kind: 'transfer'`) models connections incl. `stationChangeRequired`.
  `JourneyLeg = TrainSegment | TransferSegment`; `Journey` keeps `segments`
  (train legs, plan.md compatibility) and adds `legs` (full timeline, source of
  truth) with the invariant `segments === legs.filter(l => l.kind === 'train')`.
- `src/types/station.ts` — `Station` (official display name, aliases **only**
  when the data source defines them), `StationQuery`, versioned
  `StationDirectory` with `fetchedAt`/`expiresAt`/`attribution`.
- `src/types/favourites.ts` — `FavouriteStation`, `FavouriteRoute`,
  `RecentSearchRecord`, `LocalStorePolicy` (spec defaults: 20 recent searches,
  100 favourites, 90-day TTL) and a versioned `LocalStoreSnapshot`.
- `src/types/order.ts`, `src/types/ticket.ts` — see DEC-008.

Conventions: timestamps ISO-8601 **UTC**; user-facing wall-clock times
`HH:mm` **Europe/Sofia**; travel dates interpreted in Europe/Sofia; day offsets
carry midnight crossings; money is integer minor units in a closed currency
union (`BGN | EUR`) — extend only after finance/legal verification
(checklist §4). Local storage is re-validated on read (it is untrusted input).

**Consequences.**

- (+) The provenance union makes rule 6 a type-level property; a screen cannot
  render data without knowing its labelling.
- (−) Some duplication between `segments` and `legs`; mitigated by the stated
  invariant + a Phase 4 test.
- Open: exact station-dataset schema will be reconciled with the licensed
  dataset when one is obtained (may add fields; names here will not change).

---

## DEC-007 — Provider interfaces, errors, timeout/cancellation/retry, Zod at the boundary

- **Date:** 2026-10-22
- **Status:** Accepted

**Context.** plan.md §4.3/§6: typed `TrainDataProvider` so the UI does not
depend on one provider; treat provider data as untrusted; runtime validation,
timeouts, cancellation, caching, error mapping (Phase 4). Checklist §7 requires
Zod runtime validation of all provider/API responses. plan.md 17.1 requires a
`TicketingProvider` interface so an approved implementation can be added later
without rewriting screens.

**Decision.**

- `src/services/train-data/TrainDataProvider.ts` and
  `src/services/ticketing/TicketingProvider.ts` define the seams. Screens call
  these interfaces only; all provider-specific mapping stays in `services/`.
- Every method takes `RequestOptions` (`src/services/common/RequestOptions.ts`):
  `AbortSignal` cancellation → `ProviderError{code:'cancelled'}`; per-attempt
  timeout budget → `'timeout'`; bounded retries with exponential backoff **and
  jitter** for idempotent reads only (default: 3 attempts, 300 ms base, 5 s cap,
  retry on timeout/network/upstream_error/rate_limited). Ticketing calls use
  `NO_AUTO_RETRY_POLICY` — duplicates are handled by idempotency keys (DEC-008),
  never by blind retries.
- All failures reject with `ProviderError` (discriminated by `code` in
  `src/types/errors.ts`), mapped to localised, actionable UI messages
  (checklist §7). Raw upstream codes are diagnostics only.
- **Runtime validation:** Zod schemas mirror the types in `src/types/` and parse
  every external payload **before** mapping (spec in Appendix B). A schema
  violation rejects with `'invalid_response'`; missing fields become
  `null`/absent and are shown as "unknown" — never invented (plan.md §4).
- Capabilities (`TrainDataProviderCapabilities`,
  `TicketingProviderCapabilities`) let the UI hide features a provider cannot
  honestly support (e.g. no real-time badges without `'real-time'` provenance).

**Consequences.**

- (+) Swapping mock → authorised provider touches `services/` only.
- (+) Timeouts/cancellation/retries have one implementation, one test surface.
- (−) Zod is not imported in this phase: the dependency is not installed yet.
  The `.ts` files are plain TypeScript on purpose; schemas are specified
  (Appendix B) and implemented when Zod lands in the scaffold wave.

---

## DEC-008 — Order state machine, idempotency, duplicate-callback behaviour

- **Date:** 2026-10-22
- **Status:** Accepted (spec only — implementation blocked by the TICKETING GATE)

**Context.** plan.md 17.3 and checklist §4 require a server-controlled order
state machine, idempotency keys, server-to-server payment verification,
reconciliation for "paid but no ticket", and an audit trail without payment
secrets.

**Decision.** The state machine is specified in `src/types/order.ts`
(`OrderStateName`, per-state payloads, `ORDER_STATE_TRANSITIONS`):

```text
draft → price_confirmed → pending_payment → paid → ticket_issued
```

with failure/edge states `payment_failed`, `issuance_failed`, `cancelled`,
`refund_pending`, `refunded`. Legal transitions (single source of truth, also
enforced by the mock provider and its tests):

| From | Allowed to |
|------|-----------|
| draft | price_confirmed, cancelled |
| price_confirmed | pending_payment, cancelled |
| pending_payment | paid, payment_failed, cancelled |
| paid | ticket_issued, issuance_failed, refund_pending |
| payment_failed | pending_payment (explicit retry), cancelled |
| issuance_failed | ticket_issued (reconciliation succeeds), refund_pending |
| ticket_issued | refund_pending |
| refund_pending | refunded, ticket_issued (refund rejected — order stands) |
| cancelled | — (terminal) |
| refunded | — (terminal) |

Any transition not in the table is rejected (`conflict`). States carry typed
payloads (e.g. `paid` has `paymentReference` + `paidAt`; `issuance_failed`
records `paidAt` so the reconciliation job knows money moved).

**Idempotency.** Every state-changing call (`createOrder`, `confirmPrice`,
`initiatePayment`, `cancelOrder`, `requestRefund`) carries a client-generated
`IdempotencyKey` (UUID v4). Server/provider semantics: the first request with a
key executes; **replays with the same key return the stored outcome and never
execute again** (no double charge, no second order). Keys are scoped per
operation and retained at least as long as the order's retry window (exact
retention: to be set with the payment provider — UNVERIFIED). Repeated taps on
"Pay" de-duplicate client-side *and* server-side via the same key
(checklist §4).

**Duplicate/delayed callbacks.** Payment callbacks arrive server-side only
(signature verification, replay/duplicate-delivery handling, failed-delivery
log — checklist §4). Rules:

1. Callbacks are hints to **re-read** authoritative provider state; the state
   machine advances only from verified server-to-server status, never from a
   client redirect or a callback payload alone.
2. A callback for an order already in the target state (or beyond it) is
   acknowledged and discarded — transitions are **monotonic** along the table;
   a duplicate `paid` callback cannot move `ticket_issued` backwards.
3. Late callbacks after `cancelled`/`refund_pending` are queued for the
   reconciliation job, not applied blindly.
4. Out-of-order callbacks (`ticket_issued` before `paid` observed) are
   reconciled by fetching full order state from the authoritative provider.
5. `paid` but not `ticket_issued` within the agreed window → `issuance_failed`
   → reconciliation job + support procedure (plan.md 17.3).
6. The app polls `getOrder` with bounded attempts/backoff after returning from
   checkout and renders "payment being confirmed" for unsettled states instead
   of guessing.

Audit: `Order.history` records from/to/actor/timestamp/idempotencyKey per
transition. **Never** log payment secrets — the app never receives card data at
all (no such fields exist in the types; provider-hosted checkout only).

**Consequences.**

- (+) The mock provider (Appendix A) can be built to the exact same contract
  now; the authorised implementation drops in later.
- (−) Nothing here is implemented yet; this is a spec. No payment, sandbox or
  otherwise, has been tested by this agent.

---

## DEC-009 — Dependency policy and verified baseline

- **Date:** 2026-10-22
- **Status:** Accepted

**Context.** Rule 11: prefer boring, maintained technology; check current
stable versions, compatibility, maintenance status and license **before**
recommending; state versions only after checking. Rule 12: verify every named
package exists and is the intended one.

**Decision.** Phase 0 adds **no dependencies** (this wave writes only types and
specs). Candidate dependencies — each to be re-verified and pinned in the
scaffold wave — with the verification actually done today where a version is
stated:

| Package | Role | Checked 2026-10-22 |
|---------|------|--------------------|
| `expo` | SDK / workflow (DEC-001) | ✅ current stable line **SDK 58** (`expo@58.0.x`, e.g. 58.0.17), **MIT**, actively maintained (patch releases daily) |
| `expo-router` | file-based navigation | ✅ `expo-router@58.0.x` tracks SDK 58, MIT |
| `zod` | runtime validation at boundaries (DEC-007) | ✅ **4.6.7**, **MIT**, actively maintained; Zod 4 is the stable line |
| `k6` (Grafana) | load-test tooling (docs/scale-and-load-test-plan.md) | ✅ stable **2.1.0** (2026-06-30), **AGPL-3.0** — acceptable as internal test tooling that is never linked into the product; do not modify/distribute k6 itself without understanding the AGPL obligations |
| `@tanstack/react-query` | server state (plan.md §5) | candidate — version/license check at scaffold wave |
| `react-hook-form` | forms (plan.md §5) | candidate — version/license check at scaffold wave |
| `@react-native-async-storage/async-storage` | local persistence | candidate — verify exact package name (typosquatting check) + version/license |
| `expo-secure-store` | tokens in Keychain/Keystore (checklist §3) | candidate — ships with the Expo SDK line |
| `react-native-paper` **or** a small custom design system | UI (plan.md §5) | undecided — decide in Phase 2 with version/license check |
| Jest + React Native Testing Library | tests (plan.md §5) | candidate — versions per Expo SDK compatibility |
| ESLint + Prettier + typescript | quality (plan.md §5) | candidate — typescript strict mode mandatory |

Policy: commit the lockfile; no unreviewed dependency churn (plan.md §5);
dependency + vulnerability scanning in CI (checklist §5); **typosquatting check
for every added package** (checklist §5). Supply-chain note: the `zod`
repository had malicious commits pushed on 2026-09-21 which were reverted the
same day and, per the maintainers, were **never published to npm** (verified in
the zod release notes, 2026-10-22) — a concrete reminder to pin versions, keep
the lockfile, and review release notes.

**Consequences.**

- (+) No version numbers are locked in prematurely.
- (−) The scaffold wave owns real pinning; until then nothing in this repo is
  installable — by design (another agent owns the scaffold).

---

## DEC-010 — Checklist file naming discrepancy + conflict rule

- **Date:** 2026-10-22
- **Status:** Noted

**Context.** The lead brief refers to `agent-production-checklist.txt`; the
file actually present in the repository root is `addbeforerelease.txt`
(verified: `ls /home/kaloyan/BDJ` shows only `plan.md` and
`addbeforerelease.txt`).

**Decision.** They are the same document; `addbeforerelease.txt` is the
authoritative copy in this repo. Future references should cite the actual
filename (plus section number). If a file named `agent-production-checklist.txt`
is later added, diff it against `addbeforerelease.txt` before trusting either.

**Consequences.** Per the checklist preamble: where it and `plan.md` conflict,
**the stricter rule wins and the conflict is recorded in this log**. No
conflicts have been identified so far; both documents are compatible as read.

---

## DEC-011 — Capacity-claims policy ("1,000,000 concurrent users")

- **Date:** 2026-10-22
- **Status:** Accepted

**Context.** plan.md 17.4 and checklist §13 set a capacity *goal* of up to
1,000,000 concurrent active clients and forbid claiming it before an agreed
load test passes in a representative environment (SCALE GATE).

**Decision.** No document, screen, README, store listing or agent report may
state or imply that the system "supports 1,000,000 concurrent users" until:

1. the agreed load test described in `docs/scale-and-load-test-plan.md` has
   actually been run in a representative (production-like) environment,
2. its results are recorded in that document with real numbers, and
3. a human owner signs off.

Until then the only permitted phrasing is "designed and load-tested for up to
1,000,000 concurrent active clients — **load test not yet run**" and the SLO
numbers are labelled **targets, not guarantees**. A single Docker Compose stack
is local development only, never a production-capacity argument
(checklist §13).

**Consequences.**

- (+) Marketing/legal exposure controlled by an explicit gate.
- (−) The scale document is full of `ASSUMPTION` labels until measurements
  exist — expected and required.

---

## DEC-012 — Map SDK selection

- **Date:** 2026-10-22 (research) — **decided by the human owner 2026-10-24**
- **Status:** Accepted

**Context.** plan.md 17.5 and checklist §9 require a map SDK chosen after
reviewing mobile SDK support, offline behaviour, costs, attribution, data
licensing, privacy and rate limits, and the choice documented here. The map
feature is behind the `mapStationDiscovery` flag (default ON in code, but the
feature cannot ship without this decision + a licensed station dataset).
`docs/map-sdk-comparison.md` compares 5 candidates with every claim labelled
"verified from source" or "assumption" (2026-10-23).

**Decision (human owner, 2026-10-24).** **MapLibre React Native**
(`@maplibre/maplibre-react-native`, MIT; engine BSD-2) with OSM-based tiles
(OpenFreeMap public instance initially; self-host fallback). No map API key.

- Tile caching permitted by OpenFreeMap terms: ≤3,000 tiles or ≤50 MB per
  download, ≤4 parallel requests, unique User-Agent.
- Required attribution in the map UI: "OpenFreeMap © OpenMapTiles Data from
  OpenStreetMap" plus "© OpenStreetMap contributors — data available under the
  Open Database License (ODbL), https://www.openstreetmap.org/copyright".
- Map lines/markers never imply operational routes or real-time service (rule 6).
- **Station dataset stays the labelled DEMO set** until a licensed source is
  approved (`docs/station-dataset-licensing.md`; OSM-derived extract only after
  legal clears ODbL classification/attribution; community GTFS mirrors remain
  PROHIBITED per DEC-013). A marker is therefore never a claim about real
  service.

**Consequences.** The dependency is installed only in the map wave (DEC-009
verification applies). Until then the map area remains a labelled placeholder.
Rejected alternatives (Google Maps SDK: keys + billing + no-caching tile terms;
Mapbox: commercial terms) are recorded in `docs/map-sdk-comparison.md`.

---

# Appendix A — Mock provider contracts (spec)

Implementations are built in later phases by another agent; this is the
contract they must satisfy. References: DEC-002, DEC-007, DEC-008, plan.md §9
Phase 4.

## A.1 `MockTrainDataProvider` (Phase 4)

Implements `TrainDataProvider` (`src/services/train-data/TrainDataProvider.ts`).

1. **Provenance:** returns `demo` provenance on every journey, segment and
   station. `capabilities.provenanceKinds = ['demo']`. It MUST NOT emit
   `scheduled`, `cached-stale` or `real-time` — a unit test asserts this for
   every fixture.
2. **Labelling:** `displayName` is clearly "Mock (demo data)"; anything the UI
   shows from it carries a visible demo label (checklist §1).
3. **Fixture data** lives in a separate fixtures module, not inline in the
   provider. Fixtures include: a multi-transfer journey, a journey crossing
   midnight (day offsets), a journey with `null` times (shown as "unknown"),
   long Bulgarian station names (layout stress), Cyrillic + Latin + mixed
   station names, an empty result, and a station without coordinates.
   Fixture schedules must look obviously synthetic and are never presented as
   real BDZ times.
4. **Scenario switching** for deterministic tests (config or magic input, no
   network): `success`, `empty`, `malformed` (payload violating the schema →
   `'invalid_response'`), `timeout`, `upstream_error`, `offline`,
   `rate_limited`. Each scenario's behaviour (including latency simulation)
   is deterministic.
5. **Contract semantics honoured:** empty results resolve with an empty
   `JourneySearchResult` (`journeys: []`) — plan.md §4's `Promise<Journey[]>`
   sketch is extended by the envelope (DEC-006/007); unknown
   station ids reject `'not_found'`; `AbortSignal` aborts promptly
   (`'cancelled'`); timeout budgets produce `'timeout'`; no promise ever
   rejects with anything but `ProviderError`.
6. **Determinism:** no `Math.random()` in results; `fetchedAt` is injected
   clock time so snapshot tests are stable.
7. **Privacy:** fixtures contain no personal data (checklist §14).

## A.2 `MockTicketingProvider` (Phase 4/5)

Implements `TicketingProvider` (`src/services/ticketing/TicketingProvider.ts`).
Reachable only in development builds with `ticketSales` flag OFF in release
(DEC-004). All orders are in-memory (or local-only) and labelled demo.

1. **State machine:** enforces `ORDER_STATE_TRANSITIONS` exactly; illegal
   transitions reject `'conflict'`.
2. **Scenarios:** happy path `draft → … → ticket_issued`; `payment_failed`;
   `issuance_failed` (paid, no ticket — exercises the reconciliation story);
   delayed payment confirmation (order stays `pending_payment` for N polls,
   then settles — tests the "payment being confirming" UI); duplicate callback
   (same event delivered twice → no state regression, one `paid` timestamp);
   price change between `createOrder` and `confirmPrice` (returns
   `priceChanged: true` with the new `pricing`, order stays/returns
   `price_confirmed`).
3. **Idempotency:** same `IdempotencyKey` → same order/outcome, no second
   charge; tests assert call counts.
4. **No payment data:** the mock cannot accept card fields — they do not exist
   in the types. `initiatePayment` returns a local, clearly-labelled fake
   checkout page (dev only) with the app's deep-link return/cancel URLs.
5. **Errors:** all failures as `ProviderError`; ticketing calls never
   auto-retried (`NO_AUTO_RETRY_POLICY`).
6. **Provenance:** `demo` on every order/ticket.

---

# Appendix B — Zod boundary validation spec (to implement in Phase 4)

Not coded yet: Zod is not installed in this phase (DEC-007/DEC-009). When it
lands (verified baseline: `zod@4.6.x`, MIT — DEC-009):

1. One schema module per boundary in `src/services/train-data/schemas/` and
   `src/services/ticketing/schemas/`, mirroring the types in `src/types/` —
   `StationSchema`, `StationDirectorySchema`, `JourneySchema`,
   `JourneySearchResultSchema`, `OrderSchema`, `TicketSchema`,
   `InformationProvenanceSchema` (discriminated union on `kind`).
2. Every external payload (HTTP response, provider callback payload, cached
   file read back from disk) is `parse`d **before** mapping into domain types.
   On failure: reject `ProviderError{code:'invalid_response'}`, log the schema
   path + safe payload summary (no PII), never crash the app.
3. Unknown extra fields are tolerated (forward compatibility) but never passed
   through to the UI; missing optional fields stay `null`/absent ("unknown" in
   the UI).
4. Local persistence records (`LocalStoreSnapshot`) are validated on read and
   reset per-field with a visible notice on corruption — never crash on old
   schema versions; migrations bump `schemaVersion`.
5. Tests (Phase 4/5): malformed payload, wrong types, missing required fields,
   unknown discriminant values, out-of-range numbers (e.g. `amountMinor` not an
   integer → reject), and a fuzz/corpus of truncated JSON.

---

# Appendix C — Explicit unknowns (do not treat as facts)

- BDZ API availability, terms, rate limits, attribution requirements,
  authorization status: **UNVERIFIED** (DEC-002).
- Licensed station dataset (source, licence, geometry): **UNVERIFIED** (DEC-012).
- Map SDK choice: **OPEN** (DEC-012).
- Whether the ticketing gate can ever pass and on what commercial terms:
  **UNKNOWN — product/legal owner decision**.
- Cloud provider, hosting region (EU residency required per checklist §6),
  RPO/RTO, payment provider, identity provider: **UNDECIDED** (DEC-003).
- EAS Build quotas/costs: **UNVERIFIED** (DEC-001).
- Real traffic numbers for the load model: **ASSUMPTIONS only** — see
  `docs/scale-and-load-test-plan.md`.

---

## DEC-013 — Phase 0 integration record (lead verification + reconciliation)

- **Date:** 2026-10-22
- **Status:** Noted

**Context.** Wave 1 ran the `discovery-legal` and `architect` subagents in
parallel on 2026-10-22. Per the lead's working rules ("you do not blindly trust
subagent reports: you verify"), the lead re-ran the key verification commands
before integrating.

**Verification (lead, 2026-10-22, real output).**

- `ls docs/ src/types/ src/services/` — all 17 claimed files present.
- `tsc --noEmit --strict --skipLibCheck src/types/*.ts src/services/**/*.ts`
  → **exit 0** (TypeScript 5.8.3). Note: spec files only; no project `tsconfig`
  exists until the scaffold wave.
- Repo-wide scan for secret/credential patterns in `docs/` and `src/` — none
  (three benign prose matches only).
- Scan for private/undocumented endpoint paths — none.
- "Data-source status: mock-only" present in `docs/bdz-integration-review.md`
  (line 3), `docs/legal-compliance-matrix.md` (line 4) and DEC-002 — consistent.

**Reconciliation with DEC-002 (stricter rule wins; no conflict found).**
`docs/bdz-integration-review.md` (discovery-legal, 2026-10-22) reports, verified
from source unless noted: all six plan.md §17.1 URLs returned HTTP 200; **no
official BDZ API, open-data feed, GTFS publication or developer programme was
found publicly** (this is an assumption — search coverage is not exhaustive);
the only published BDZ data-sharing arrangement found is a 2019 licensed
agreement with Google Maps; `https://bileti.bdz.bg/terms` is a JavaScript shell
whose terms text is **not** in the public HTML — its content remains unverified
(plan.md's characterisation of those terms is a project note, not fact); a
`pitay.government.bg` FOI record returned HTTP 403 to the reviewer's client.
DEC-002 stands unchanged: **mock-only**, no live provider work until a source is
approved in writing.

**New risks recorded (from discovery-legal, verified by the lead as reported).**

1. **Third-party community GTFS feeds exist** (Transitland `f-bdz~bg` →
   `jbb.ghsq.de`, busmaps.com mirror). Provenance unverified; using them would
   be unlicensed data reuse. **Prohibited** as a data source unless legal
   clearance is obtained (rules 1–2). Do not "just wire up" an unofficial feed.
2. BDZ's public carriage-conditions PDF (dated 02.05.2025) contains concrete
   commercial rules (e.g. an online-cancellation window and an online-sales
   cutoff). Useful at the TICKETING GATE, but **never hard-code policy copy**
   (plan.md 17.3): show current approved provider terms at purchase time.
3. BDZ's privacy page shows a DPO e-mail whose displayed text differs from its
   `mailto:` target — verify before any correspondence.

**Phase 0 acceptance criteria (plan.md §9) — status.**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Data-source status explicit (approved live / mock-only / blocked) | ✅ mock-only | `docs/bdz-integration-review.md` line 3 |
| Platform build approach documented for Android and iOS | ✅ | DEC-001 (iOS = EAS/macOS only; Docker never builds iOS) |
| No invented API endpoints or credentials | ✅ | lead scans above; both docs label every claim verified/assumption |

**Human decisions required (nothing here is decided by agents).**

1. Name a human owner for every role in addbeforerelease.txt §17 (all UNASSIGNED).
2. Approve/deny initiating contact with BDZ (which legal entity, and with what
   request: data licence / API / branding).
3. Retain Bulgarian/EU legal counsel to review every `NEEDS LAWYER` item.
4. Decide the app's operating legal entity (needed for ToS, privacy notice,
   store accounts).
5. Decide whether to pursue an FOI/open-data reuse request for timetable data.
6. Approve/deny the "Continue to official BDZ ticketing" link (product/legal).
7. Set launch-date gates and confirm ticketing stays feature-flagged OFF.

---

## DEC-014 — Phase 1 integration record: independent review findings and disposition

- **Date:** 2026-10-22
- **Status:** Noted

**Context.** Phase 1 (scaffold + quality gates, agent `devops-build`) was
integrated and then reviewed independently by `reviewer-qa` and
`security-privacy` (neither authored the code). This entry records the
findings and their disposition. Full evidence:
`docs/security-privacy-review-2026-10-22.md`, `docs/threat-model.md`, and the
reviewer report (31 tests in `tests/`).

**Review verdicts (2026-10-22).**

- `reviewer-qa`: **PASS with findings** — 0 critical, 0 high, 3 medium, 6 low.
- `security-privacy`: **no secrets anywhere** (working tree + all commits + git
  config scanned; nothing to rotate), 0 critical/high, 2 medium, 4 low.

**Fixed by the lead after review (gates re-run afterwards, real output).**

| Finding | Fix | Verification |
|---------|-----|--------------|
| M1 stale `searchJourneys` doc comment + Appendix A.5 "resolves with `[]`" | corrected to the `JourneySearchResult` envelope semantics | `npm run typecheck` PASS |
| L1 unused `ISODate` import (`src/types/favourites.ts`) | removed | `npm run lint` PASS — now **0 problems** |
| L3 README typo | "non-zero by design" | text |
| F-01 Metro published on all host interfaces (`docker-compose.yml`) | bound to `127.0.0.1:8081` with LAN opt-in comment | `docker compose config` VALID |
| F-03 no workflow permissions (`.github/workflows/ci.yml`) | `permissions: contents: read` | file |
| F-04 signing artifacts not ignored | `.gitignore`/`.dockerignore` extended (`*.p8`, `*.pfx`, `*.der`, `*.key`, `*.cer`, `*.certSigningRequest`, `*.p10`, `keystore.properties`, `service-account*.json`, `.envrc`) | file |
| F-06 container runs as root (`Dockerfile`) | `USER node` after `chown -R node:node /app` | NOT built — see blockers |

Gates after fixes (lead-run, 2026-10-22): `npm run typecheck` PASS,
`npm run lint` PASS (0 problems), `npm test` **31/31 PASS** (5 suites),
`docker compose config` VALID.

**Deferred — owned by named humans or later phases.**

| Finding | Disposition |
|---------|-------------|
| M2 placeholder screen has 2 hard-coded English strings | **Phase 2** (i18n-a11y/mobile-ui): move to `src/i18n/locales/{bg,en}.json`; the claim-lexicon regression test must cover every new screen |
| M3/F-02 `npm audit`: 48 findings (30 high) from 3 transitive advisories (`braces`, `node-forge`, `sprintf-js`) — GitHub advisories show **"Patched versions: None"** on all three (verified 2026-10-22) | CI `dependency-audit` stays **advisory** until the security owner decides. **Never run `npm audit fix --force`** (breaks the SDK 58 line). Recommended: an audit-diff baseline gate that fails only on *new* advisories. Decision owner: security/compliance role (UNASSIGNED) |
| L2 commit `0fa57e2` ("Update project") converted `addbeforerelease.txt` to CRLF (content byte-identical, verified with `git diff --ignore-cr-at-eol`) | Noted: input docs should not be churned; no content change occurred |
| L4/L5 doc-only type aliases; `Journey.segments`/`legs` not `readonly` | Cosmetic; fix in the Phase 4 touch of those files |
| L6/F-05 placeholder bundle IDs `com.example.bdztrain` | **Phase 8**: replace with company-owned IDs (checklist §1) and log the decision |

**Phase 1 status (honest).** Quality gates: **verified** (output above).
Docker image build + in-container `npm ci`: **BLOCKED** — the Docker daemon is
not running on this host and starting it requires interactive authentication
(human action: `sudo systemctl start docker`, then `docker compose up --build`).
GitHub Actions runs: **UNVERIFIED** — nobody has seen run output; the repo was
pushed to GitHub mid-session. iOS/Android builds and device tests: **NOT RUN**
(Linux host; iOS = macOS/Xcode or EAS only, rule 8).

**Human decisions added.** (8) Start the Docker daemon so the container path
can be verified, or accept it as documented-not-verified for now. (9) Decide
whether the two local commits ahead of `origin/main` are pushed, and who
maintains the GitHub repo going forward. (10) Security owner to decide on the
dependency-audit gate (M3/F-02).

---

## DEC-015 — Phase 2 UI shell: theme, routes, onboarding, UI states

- **Date:** 2026-10-23
- **Status:** Accepted

**Context.** plan.md §8/§9-Phase 2/§17.7, checklist §7/§10.

**Decision.** Custom design system in `src/components/` (no UI framework
dependency; DEC-009 preserved) over a light+dark token palette whose WCAG-AA
contrast is asserted by `tests/mobile-ui/theme.test.ts` (min text 4.5:1, min UI
3:1; light textPrimary/bg 15.06:1, onPrimary/primary 8.16:1 — full list in
`src/theme/colors.ts`). Deep-link routes exactly `/`, `/search`, `/map`,
`/trips`, `/settings`, `/onboarding` (tab group `(tabs)`; renaming needs a new
entry). Onboarding: 4 skippable steps, completion persisted via `settingsStorage`
(`settings.onboardingCompleted` = 'true' on finish *and* skip), gated at first
launch, replayable at `/onboarding`; it requests no permissions and preselects
no consent. All data-driven UI renders provenance labelling; `DemoDataNotice`
appears on every placeholder screen. Touch targets ≥44dp.

**Consequences.** (+) Claim-lexicon regression test covers every screen
(rule 6). (+) `ConfirmDialog` ready for Phase 5 destructive actions. (−) The
ESLint import resolver cannot read package `exports` subpaths
(`expo-router/js-tabs`), so two files carry documented `import/*` disables —
remove when the resolver is upgraded. (−) Dark theme is complete but the app
renders light only (system-scheme wiring deferred).

---

## DEC-016 — i18n key governance: naming rules, locale-file ownership, claim-safe copy

- **Date:** 2026-10-23
- **Status:** Accepted

**Context.** Wave 3 produced two divergent key sets for the same screens
(`i18n-a11y` invented `stations.*`/`map.*` keys; `map-stations` defined its own
contract in `src/features/stations/translationKeys.ts`), and body copy landed
in the `common.*` control namespace. The lead reconciled them (DEC-018).

**Decision.**

1. **Naming:** flat dot-separated `snake_case` segments only
   (`/^[a-z0-9_]+(\.[a-z0-9_]+)+$/`) — enforced by
   `tests/i18n/locale-parity.test.ts`. Hyphens and camelCase are rejected.
2. **Length guards** (same suite): `common.*`/`nav.*` control strings ≤24 chars;
   keys ending `_label`/`_cta`/`_placeholder`/`_title`/`.title` ≤48 chars; any
   value ≤400 chars; bg ≤ 4×en + 30.
3. **Ownership:** `src/i18n/locales/*` is single-owner. In parallel waves,
   feature agents propose keys (their contract file is the source of truth) and
   ONE agent/lead merges them — parallel edits to the catalogs caused the Wave 3
   reconciliation.
4. **Locales:** `DEFAULT_LOCALE='bg'` (market), `FALLBACK_LOCALE='en'`; missing
   keys render the key itself, never blank; parity test fails on missing keys,
   empty values, placeholder mismatches and untranslated values.
5. **Claim-safe copy:** privacy/permission/disclaimer copy avoids the claim-
   lexicon words (`position`, `tracking`, `location`, `live`, `real-time`,
   `delay`, `official`, `on-time`, `guarantee`) — e.g. "see where you are". The
   lexicon guard stays strict; no allow-list beyond the provenance *category*
   labels (`provenance.real_time*`, which render only with real provenance).
6. **Human review:** `TRANSLATION_REVIEW_KEYS` + `review.<key>` notes mark
   legal/payment/ticket wording; none of it may ship without human translation
   review (checklist §8).

---

## DEC-017 — Mock data layer: schemas, MockTrainDataProvider, shared request executor

- **Date:** 2026-10-23
- **Status:** Accepted

**Context.** plan.md §4/§9-Phase 4; DEC-002/006/007/008; Appendices A.1 and B.

**Decision.** Zod (4.6.7, lead-installed per DEC-009 baseline) boundary schemas
in `src/services/train-data/schemas/` parse every external payload before
mapping (unknown fields stripped, schema paths only in diagnostics). `MockTrainDataProvider` implements Appendix A.1 exactly: demo-only provenance,
fixtures module, deterministic scenarios
(`success|empty|malformed|timeout|upstream_error|offline|rate_limited`), injected
clock, all rejections are `ProviderError`. `LiveTrainDataProvider` is **not
created** (DEC-002 stricter rule — nothing to stub until a source is approved).
`MockTicketingProvider` and `OrderSchema`/`TicketSchema` are deferred to the
ticketing phase (flag OFF, DEC-004).

**Amends DEC-005:** the timeout/cancel/bounded-retry-with-jitter executor and
error normalisation live in `src/services/api/`, not `services/common/`
(`RequestOptions` and the retry policy types stay in `services/common/`).
`ProviderError` gained optional `diagnostics: readonly string[]` (schema paths /
issue codes only — never payload values, no PII).

**Consequences.** (+) TanStack Query caching deliberately deferred to Phase 4 —
no dependency added. (+) Fixture invariant validator re-checks
`segments === legs.filter(train)` on every fixture.

---

## DEC-018 — Wave 3 integration record (i18n reconciliation + Map tab wiring)

- **Date:** 2026-10-23
- **Status:** Noted

**Context.** Wave 3 ran `mobile-ui`, `i18n-a11y`, `data-provider`,
`map-stations` in parallel on disjoint directories; the lead integrated.

**Lead actions (2026-10-23).**

1. **Pre-work:** installed `zod@4.6.7` and
   `@react-native-async-storage/async-storage` — `expo install` resolved
   **2.2.0** (the SDK 58-compatible line; npm latest is 3.1.1) — plus the
   shared `src/services/storage/settingsStorage.ts` contract so parallel agents
   compiled against one dependency.
2. **i18n reconciliation:** restored the 24 `stations.*`/`map.*` keys pinned by
   `tests/i18n/*` contracts (deleting them was wrong: **tests are consumers
   too**), renamed 9 `map-stations` keys to flat `snake_case` (and
   `map.attribution.placeholder` → `map.attribution.note`), moved 3 body-copy
   keys out of the `common.*` control namespace into `scaffold.*`. Catalogs:
   **201 keys per locale**, parity/length/Cyrillic guards green.
3. **Map tab:** wired `StationsScreen` (map-stations) into `/map`; the map area
   itself remains a labelled placeholder pending DEC-012. Adjusted two
   mobile-ui tests for the Map tab's stations demo labelling — rule-6 intent
   preserved (demo label visible; claim lexicon still strict and passing).
4. **Copy fix:** stations privacy/disclaimer copy rephrased to the claim-safe
   convention (DEC-016 §5) instead of weakening the lexicon.

**Gates after integration (lead-run, real output).** `npm run typecheck` PASS ·
`npm run lint` 0 errors/0 warnings · `npm run format:check` PASS · `npm test`
**389 passed / 389 in 31 suites**.

**Not verified / blocked.** No device or simulator (Linux): VoiceOver/TalkBack
scripts, Hermes `Intl` behaviour and native builds remain **NOT RUN** (rules 5,
8). CI runs remain **UNVERIFIED** (DEC-014).

**Human decisions added.** (11) DEC-012 map SDK + station-dataset route
(recommendation ready: MapLibre + OpenFreeMap/OSM — see
`docs/map-sdk-comparison.md` and `docs/station-dataset-licensing.md`; install
only after human confirmation).

---

## DEC-019 — Wave 5 review record: findings disposition, i18n vocabulary rule, audit re-baseline

- **Date:** 2026-10-24
- **Status:** Noted

**Context.** Wave 3 was reviewed independently by `reviewer-qa` (did not author
the code) and `security-privacy`. Evidence: reviewer report,
`docs/security-privacy-review-2026-10-24.md`, updated `docs/threat-model.md`.

**Verdicts.** `reviewer-qa`: **FAIL → fixed** (1 high, 2 medium, 8 low).
`security-privacy`: **no critical/high, no secrets anywhere** (1 medium
hardening, 5 low). Both re-ran the gates themselves: baseline
"389/389 in 31 suites" verified exactly.

**Fixed by the lead (2026-10-24), gates re-run:**

| Finding | Fix | Verification |
|---------|-----|--------------|
| H1 raw i18n key `common.states_demo` rendered as copy on 4 screens (`src/components/ScreenStatesPreview.tsx:43` — the key never existed; mobile-ui's code drifted from its own key list, and the DEC-018 rename `common.* → scaffold.*` missed it) | one line → `t('scaffold.states_preview')` | `npm test` **435/435 in 35 suites** (incl. the 2 guard suites that reproduced H1), typecheck/lint/format clean |

**Adopted permanently** (reviewer's test additions): `tests/i18n/key-usage.test.ts`
(every `t()`/registry key must exist in both catalogs),
`tests/mobile-ui/i18n-integrity.test.tsx` (no screen renders raw keys, bg + en),
`tests/i18n/claim-lexicon-catalogs.test.ts` (catalog-level rule-6 lexicon in
BOTH locales, 3-entry allow-list with anti-creep assertion),
`tests/stations/station-search-edge.test.ts` (degenerate input).

**i18n vocabulary rule (DEC-016 extension, applies before Phase 3).** Two
parallel vocabularies for stations/map exist (M1): the stations feature's own
contract (`src/features/stations/translationKeys.ts`) and the restored
`stations.*`/`map.*` set. Rule going forward: **one vocabulary per surface** —
the stations feature consumes only its contract file; the restored keys with no
UI yet (`stations.detail.find_trains`, `stations.detail.add_favourite`, …) are
**RESERVED for Phase 3** surfaces (station picker, journey flow) and must be
reused rather than re-invented; duplicate concepts (`stations.empty` vs
`stations.list.empty.title`) are consolidated in one Phase 3 pass, reviewed by
the lead. No new catalog keys without lead review (DEC-016 §3).

**Dependency-audit re-baseline (security-privacy, verified 2026-10-24).** The
2026-10-22 baseline (48 findings / 3 advisories) is **stale**: `braces`
(GHSA-vfj7-8cjw-p6xm) and `sprintf-js` (GHSA-hp3w-g68c-fv3c) were **withdrawn
upstream** on 2026-10-23/22; current `npm audit` = **5 high from 2 advisories**:
`node-forge` (GHSA-86w9-cpqp-85rv, transitive via `@expo/code-signing-certificates`,
no patch available) and the new `zod` GHSA-mrhx-c7xc-m3w5 which affects only
`@expo/cli`'s nested `zod@3.25.76` (build tooling, not the app bundle — the
app's direct `zod@4.6.7` is patched). The CI `dependency-audit` job and any
audit-diff baseline must be re-baselined to these counts by the security owner;
`npm audit fix --force` remains forbidden.

**Deferred (owner → item).**

- data-provider (next wave): W3-M1 Zod `.max()` bounds on ids/names/arrays in
  `src/services/train-data/schemas/` (unbounded strings/arrays = same weakness
  class as the zod advisory); W3-L1 raw ids in `ProviderError.message`
  (violates the no-payload-values contract); W3-L2 truncate key names in
  `safePayloadSummary`; W3-L3 `Map`/`Object.hasOwn` for id lookups. The mock is
  the reference implementation future providers will copy.
- i18n: W3-L4 prototype-chain guard in `createTranslator`; L3 align the
  DEC-016 allow-list wording with `stations.provenance.real_time`.
- mobile-ui/map-stations: W3-L5 `maxLength` on the station search input before
  a real directory lands; L5 converge the two `ProvenanceBadge` components;
  L4 `{{...}}` vs `{...}` placeholder style in `tests/stations/testSupport.tsx`;
  L1 remove the stale `PENDING_KEYS` list; L7 document `healthCheck` semantics
  for `empty`/`malformed` scenarios; L8 `mapStationDiscovery` flag ON is **not**
  a ship approval (DEC-012 + licensed dataset still required).
- Phase 5: `stations.offline.banner` is currently unreachable
  (`StationsScreen` hardcodes `networkStatus='online'`) — wire real network
  status when offline handling lands.

---

## DEC-020 — Docker verification record (Phase 1 criterion closed)

- **Date:** 2026-10-24
- **Status:** Noted

**Context.** DEC-014 recorded the Docker path as BLOCKED (daemon down; start
needs interactive auth). The human owner started the daemon (DEC-014 human
decision #8 — resolved: **verify**). This entry records the verification and
two changes it forced.

**Verified (real output, 2026-10-24).**

| Check | Result |
|-------|--------|
| `docker compose build` (image `bdj-mobile`, `npm ci` in build) | **PASS** |
| In-container gates: `npm run typecheck`, `npm run lint`, `npm test` | **PASS** — **435/435 tests, 35 suites** |
| Metro reachable from host: `curl http://127.0.0.1:8081/status` after `docker compose up -d` | **PASS** — `packager-status:running` (loopback-only publish, F-01) |

**Defect found + fixed during verification.** The first build **crashed this
host's Docker daemon** at the `RUN chown -R node:node /app` layer (EOF from the
build RPC; the layer duplicates the whole `node_modules` tree). Fix: the
Dockerfile now uses `COPY --chown=node:node . .` + `USER node` — same non-root
result (F-06 intact), far lighter layer. Separately, two tests
(`tests/mobile-ui/states.test.tsx` ConfirmDialog flow,
`tests/mobile-ui/onboarding.test.tsx` walk-through) exceeded Jest's 5s default
under container CPU load (reproducible: 433/435 twice; green in isolation).
Per the checklist these flaky tests were treated as defects: bounded
`jest.setTimeout(20000)` in those two files → 435/435 in-container.

**Phase 1 acceptance criteria — final status.** Clean install ✅ · quality gates
✅ (host + container) · Docker tooling and host reachability ✅ · documented iOS
path ✅ (as documentation; **NOT RUN** — Linux host, rule 8) · CI ⚠️
**UNVERIFIED** (workflow exists; no agent has seen a run). Android native build
remains **NOT RUN** (no SDK here).

---

## DEC-021 — Phase 3/4 data access layer: TanStack Query hooks over TrainDataProvider

- **Date:** 2026-10-24
- **Status:** Accepted

**Context.** plan.md §9 Phase 3/4; DEC-002/006/007/017; checklist §7 (offline
caching with expiry and stale labels).

**Decision.** `src/hooks/` exposes `AppDataProvider` (QueryClient + provider
context; defaults to `MockTrainDataProvider` + `createAppQueryClient()`),
`useStationSearch` (250 ms debounce on changes; empty query = full directory),
`useJourneySearch` (enabled only with complete from/to/date; empty result =
empty envelope), `useJourney`. Query keys are centralised in `queryKeys.ts` and
include all inputs. Cache policy: staleTime 60 s / gcTime 5 min (stations
5 min / 30 min — static data), documented in `AppDataProvider.tsx`.

**Single retry layer:** React Query `retry: false`; bounded retries with jitter
stay in the DEC-007 executor only. Every provider call runs through
`runProviderCall` so failures surface exclusively as typed `ProviderError`;
TanStack's per-fetch `AbortSignal` is passed to `RequestOptions.signal`, so
unmounts cancel in-flight work (tested). `dataUpdatedAt`/`isFetching` drive
freshness copy ("Results loaded at {time}"), but query staleness **never**
produces `cached-stale` provenance (rule 6) unless payload data carries the
DEC-006 fields.

**Consequences.** (+) Screens depend on hooks only; swapping the mock for an
authorised provider touches `services/` (DEC-002). (−) React Query's
`onlineManager` is not wired to real network status yet (Phase 5 — related to
the known `stations.offline.banner` gap). DEC-019 items W3-M1/L1/L2/L3 remain
open for the next data-provider wave.

---

## DEC-022 — Phase 3 journey flow UI: routes, validation rules, key merge, resolver choice

- **Date:** 2026-10-24
- **Status:** Accepted

**Decision.**

1. **Routes (deep-link contract, extends DEC-005):** `/search` (form, in tabs),
   `/search/results?from=<stationId>&to=<stationId>&date=YYYY-MM-DD`,
   `/search/station-picker?field=from|to` (modal), `/journey/[id]`. Renaming
   needs a new entry. Route params are opaque ids + ISO date; malformed params
   render an actionable error state (tested).
2. **Form validation (Zod + react-hook-form):** both stations required;
   from ≠ to (cross-field, error on `toStation`); date required, `YYYY-MM-DD`,
   valid calendar date, not past (Europe/Sofia "today"), ≤90 days ahead
   (`validation.date_too_far`). Typed values are retained when one field fails
   (checklist §7).
3. **Dependency note (DEC-009 amendment):** `@hookform/resolvers@6.0.0` was
   **rejected** — it declares `peerOptional effect@^4` while its own
   `@typeschema` chain pins `effect@3.x` (ERESOLVE; not forced with
   `--legacy-peer-deps`). Installed `@hookform/resolvers@5.9.2` (MIT, peer
   `react-hook-form ^7.55`, standard-schema), verified working with
   `zod@4.6.7` by an executed test before implementation. Also installed this
   wave: `react-hook-form@7.91.0`, `@tanstack/react-query@5.104.5` (both MIT,
   registry-verified 2026-10-24).
4. **i18n (DEC-016 §3 single-owner):** 39 journey-flow keys merged into both
   catalogs by the lead (240 keys per locale; all parity/length/Cyrillic/claim
   guards green). Freshness copy = `journey_results.fetched_at`; the unused
   `journeys.updated_at_label`/`journeys.stale_hint` proposals were **not**
   added (no dead keys — DEC-019 M1). The station picker reuses the reserved
   `stations.*` set (DEC-019) instead of re-inventing keys.
5. **Vocabulary consolidation still owed (DEC-019 M1):** duplicate concepts
   remain between the stations feature contract and the reserved set
   (`stations.empty` vs `stations.list.empty.title`, etc.) — one consolidation
   pass, lead-reviewed, before the map wave.

**Consequences.** (+) Search → results → details works end-to-end on the mock
provider without sign-in, demo-labelled throughout (rule 6). (−) Station names
on results/details resolve via the station directory lookup; if a future
provider returns names on segments, drop the lookup.

---

## DEC-023 — Phase 3 review record: findings disposition and guard hardening

- **Date:** 2026-10-24
- **Status:** Noted

**Context.** Wave 5 review of the Phase 3 change (the first reviewer attempt
was aborted by a server restart and re-run). Verdicts: `reviewer-qa`
**FAIL → fixed** (2 high, 3 medium, 8 low); `security-privacy` **no
critical/high, no secrets** (2 medium, 2 low, 5 info —
`docs/security-privacy-review-2026-10-24b.md`, threat model updated). Both
verified the "588/588 in 46 suites" claim exactly.

**Fixed by the lead (2026-10-24).**

| Finding | Fix | Verification |
|---------|-----|--------------|
| H1 missing `journey_results.empty_title` in both catalogs (raw key on the empty state). **Root cause:** one key was lost during the reviewers' own catalog spot-check restore cycle (their report's before/after md5s differed). Note: the DEC-022 §4 merge itself was correct — 39 keys, 240/locale — the loss happened afterwards. | key restored to both locales (240 keys each) | reviewer's `journey-flow-key-contract.test.ts` goes green |
| H2 guards could not catch H1: a key deleted from BOTH catalogs silently re-entered the derived "pending" set; `key-usage` REGISTRY_FILES omitted the journey contract files | `key-usage` now scans all 4 journey `translationKeys.ts` registries; `i18n-integrity` now **fails** when any contract key is unmerged (pending set must be empty) | spot-check rule restored: removing a key fails the suite |
| M1/M2 "retry" that did not retry (picker: none at all; details + broken-params: `router.back()` behind a "Retry" label) | `refetch` added to `useStationSearch`/`useJourney` contracts; picker `onRetry` wired; details retry now re-fetches; broken-params state shows **no** retry button (nothing to retry) | gate run |
| M3 dead key `journey.card_a11y` + unused `JourneyCard.index` (a11y claim in contract not implemented) | card now sets `accessibilityLabel` with the 1-based index | gate run |
| L1 deep links bypassed form rules (past/far dates, from===to accepted) | `journeySearchFromRouteParams` (single implementation, injectable clock) applies the form rules at the route boundary | gate run |
| L2/L3 stale "pending a DEC entry" route comments; date field not marked required | comments cite DEC-022 §1; `required` set on the date input | gate run |

**Deferred (owner → item).** data-provider: W3B-M1 length/charset bounds on
`from`/`to`/`id` at the provider boundary (routes now validated; schema
`.max()` bounds = DEC-019 W3-M1 batch), W3B-L2 static `notFound` messages, L4
`fetchAllStations` 25-row fallback contract trap. i18n/human: L6 bg copy nit
(`journey_results.fetched_at` — „Резултатите са заредени в {time}" may prefer
„… {time} ч") needs human confirmation alongside the outstanding translation
review. Test hygiene: L7 deprecated RNTL `findBy*(text, {timeout})` form; L8
package.json caret ranges vs DEC-022 §3 exact pins (lockfile pins are exact
today). Map wave: W3B-L1 maxLength on the stations screen input.

**Phase 3 acceptance criteria (plan.md §9) — status.** Station picker + search
form ✅ · validation incl. typed-value retention ✅ · unit tests for form
validation and station filtering (through the real hook + mock provider) ✅ ·
Cyrillic station search ✅ · typed domain models throughout ✅ · every screen
has loading/empty/error/timeout/offline + **working** retry ✅.
