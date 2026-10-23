# Threat Model — BDZ Train Companion App

**Created:** 2026-10-22 (security-privacy specialist subagent, Phase 0 + Phase 1 review).
**Status:** DRAFT for human review. No human security owner has reviewed this document
(addbeforerelease.txt §17: "Security / compliance owner" — UNASSIGNED).
**Required by:** addbeforerelease.txt §5 ("Threat model written before launch");
`docs/legal-compliance-matrix.md` row 18.

**Scope of the system today (verified 2026-10-22):** React Native + TypeScript (Expo SDK 58)
mobile client, mock-only data (DEC-002), **no backend** (DEC-003), **no accounts**, **no
ticketing** (flag `ticketSales` OFF, DEC-004), **no analytics** (flag `analytics` OFF), no
network traffic at all (the only screen is a placeholder — `src/app/index.tsx`). Everything
marked *(future)* below is a design target for a system that does not exist yet; it is modelled
now so the seams built today (provider interfaces, feature flags) can be checked against it.

This is an engineering document, not legal advice and not a penetration-test substitute.

---

## 1. Assets

| ID | Asset | Where it lives today | Sensitivity |
|----|-------|----------------------|-------------|
| A1 | **User travel intent** — recent searches, favourite routes/stations (origin→destination pairs reveal where a person goes) | Planned on-device AsyncStorage (`src/types/favourites.ts`) | Personal data (GDPR); on-device only |
| A2 | **User location** (foreground, only for a future "nearby stations" feature) | Not collected today | Sensitive personal data; minimisation rules in plan.md 17.5 |
| A3 | **Information provenance labels** — the guarantee that demo/scheduled/cached-stale/real-time are never conflated | `src/types/provenance.ts`, feature flags | Integrity/trust asset: the app's honesty is a product feature (rule 6) |
| A4 | **Future session tokens** (access/refresh) for accounts | None today; Keychain/Keystore via `expo-secure-store` when built (DEC-001, plan.md 17.2) | Credential |
| A5 | **Future order/ticket data** — order ids, payment *references* (never card data), ticket artefacts | None today (spec only: `src/types/order.ts`, `src/types/ticket.ts`) | Personal + financial metadata |
| A6 | **Developer/CI assets** — Git history, lockfile, future EAS tokens, keystores, provisioning profiles | Repo + (future) GitHub Actions secret storage | Build integrity; release-signing compromise = arbitrary code on user devices |
| A7 | **Map SDK key** (public identifier with quota/cost) | `.env.example` placeholder; SDK not chosen (DEC-012) | Abuse/quota + cost, not confidentiality |
| A8 | **BDZ brand/trust** — the risk that anything in this project enables impersonation of, or false claims about, an official BDZ service | Docs, UI copy | Reputational/legal |

**Explicitly NOT assets because they must never exist:** payment card numbers, CVV, IBAN,
BDZ account credentials. The type system deliberately has no fields for them
(`src/services/ticketing/TicketingProvider.ts:13-20`). If any future change adds them, that is
a security incident-level design error, not a schema change.

## 2. Actors

| ID | Actor | Capability assumed |
|----|-------|--------------------|
| T1 | Honest user | Uses the app normally on their own device |
| T2 | Curious/malicious local user or app on the same device | Reads app storage on a rooted/jailbroken device; invokes deep links |
| T3 | Network attacker (rogue Wi-Fi/ARP/DNS) | Intercepts/redirects traffic on the local network |
| T4 | Malicious or compromised upstream data source *(future)* | Returns crafted payloads (excess nesting, huge strings, wrong types) |
| T5 | Supply-chain attacker | Publishes typosquatted/compromised npm packages; compromises maintainer accounts or CI |
| T6 | Attacker against the future backend/API | Standard OWASP API Top 10 toolkit (auth bypass, IDOR, replay) |
| T7 | Phisher/impersonator | Clones the app or "BDZ" support; social-engineers users |
| T8 | Insider with repo/CI access | Pushes code, reads CI secrets, alters the lockfile |
| T9 | AI coding agents (this project's developers) | Write code and docs; must not hold production credentials (addbeforerelease.txt §16) |

## 3. Trust boundaries

1. **TB1:** User ↔ app UI (all text input; deep links).
2. **TB2:** App ↔ on-device storage (AsyncStorage/SecureStore — untrusted on a compromised
   device; `src/types/favourites.ts:120-123` already mandates re-validation on read).
3. **TB3:** App ↔ train-data provider *(future network boundary)* — HTTPS only, Zod-validated
   (DEC-007, Appendix B).
4. **TB4:** App ↔ map SDK / tile provider *(future)* — third-party SDK code inside the app;
   tiles fetched by that SDK.
5. **TB5:** App ↔ ticketing backend ↔ payment provider *(future)* — payment truth is
   server-to-server only (DEC-008); the client observes effects via `getOrder`.
6. **TB6:** Developer/agent ↔ repo ↔ CI ↔ npm registry (build chain).

## 4. Entry points and STRIDE

STRIDE = Spoofing, Tampering, Repudiation, Information disclosure, Denial of service,
Elevation of privilege. "Mitigation today" is verified in this repository; "Required action"
is work for the phase named.

### EP-1 — Journey search input (station text incl. Cyrillic/Latin/mixed, date, time, limit) *(Phase 3)*

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S | Attacker-supplied station names/times rendered as if provider-authoritative | Provenance on every record (`src/types/provenance.ts`); UI must render labels (DEC-006) | Phase 3/4 tests: provenance label always visible; `demo`-only mock enforced by test (DEC-002) |
| T | Malformed/oversized input reaches a future provider or breaks validation | Types define bounded fields (`src/types/journey.ts:27-40`); Zod boundary specified (DEC-007 App. B) | Implement Zod + length/format limits at the boundary in Phase 4; never trust form state alone |
| R | Search requests are not user-actionable denials ("something went wrong") | `ProviderError.code` → localised message contract (`src/types/errors.ts:76-78`) | Phase 4 UI mapping test for every code |
| I | Search terms (travel intent) leak into logs/crash reports | No logging exists anywhere in `src/` (verified: zero `console.*` calls) | Ban logging of `JourneySearch`, station text and `GeoPoint` in the logging policy when logging is added (checklist §14 "privacy test") |
| D | Huge result sets / repeated searches exhaust device or future API | `limit` on search (`src/types/journey.ts:39`); retry policy bounded, jittered (`src/services/common/RequestOptions.ts:46-52`) | Future API needs rate limits (checklist §5/§11) |
| E | A search response drives navigation/action without validation | — | Zod parse before mapping; unknown fields never passed to UI (DEC-007 App. B.3) |

### EP-2 — Local persistence (favourites, recent searches, onboarding completion, language; later cache) *(Phase 5)*

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S/T | Tampered storage on a rooted device injects data or old schema | Re-validation on read mandated (`src/types/favourites.ts:118-123`); versioned `LocalStoreSnapshot` | Phase 5: Zod validate on read, per-field reset + visible notice on corruption (DEC-007 App. B.4) |
| R | User cannot remove their travel history | Policy spec: user-deletable, capped (20 recent / 100 favourites / 90-day TTL — `src/types/favourites.ts:174-178`) | Phase 5: "clear saved items" with confirmation (plan.md §8); test deletion actually deletes |
| I | Travel intent readable via backup/other apps | AsyncStorage is app-sandboxed plaintext | Accept for non-secret data; document in privacy notice. Tokens (future) MUST go to SecureStore, never AsyncStorage (checklist §3) |
| D | Corrupt storage crashes the app | — | Graceful reset path (above); no crash on old schema (DEC-007 App. B.4) |
| E | — | — | — |

### EP-3 — Deep links (`bdztrain://`, future checkout return/cancel URLs)

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S | Rogue app/website invokes `bdztrain://` with crafted parameters (e.g. fake "payment success") | Scheme registered (`app.json:7`); no deep-link handler consumes data yet | When ticketing exists: a deep-link return is **never** proof of payment — state re-fetched via `getOrder` (DEC-008 rule 1, `TicketingProvider` note). Validate every deep-link parameter (ids opaque, length-bounded) |
| T | Path/route manipulation to reach flag-gated screens | Flag gates are not implemented yet | Phase 2/6: gated routes unreachable in release builds, tested |
| I | Return URLs leak order ids into the OS/browser history | `returnUrl`/`cancelUrl` are app deep links by spec (`src/services/ticketing/TicketingProvider.ts:360-372`) | Keep order ids opaque; no PII in URLs ever |
| D/E | — | — | — |

### EP-4 — Provider responses *(future network boundary; mock only today)*

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S | Rogue DNS/redirect impersonates the data source | No network at all today | HTTPS only (plan.md §12); certificate pinning decision recorded before live integration; `EXPO_PUBLIC_TRAIN_API_BASE_URL` left empty on purpose (`.env.example:12-16`) |
| T | Crafted payloads (deep nesting, huge strings, wrong types) | Zod-at-the-boundary specified (DEC-007 App. B) incl. fuzz/truncated-JSON tests | Implement + test in Phase 4; treat all provider data as untrusted (plan.md §4) |
| R | Provider freshness is misrepresented | Provenance + `fetchedAt`/`expiresAt` types (`src/types/provenance.ts:172-179`) | `cached-stale` labelling tested in Phase 5 |
| I | Upstream error text leaks to users or logs with PII | `upstreamCode/Message` marked diagnostics-only (`src/types/errors.ts:73-74`) | Never render/log raw; scrub in crash reporting (checklist §7) |
| D | Timeouts/retry storms | Bounded retries + jitter, cancellation (`RequestOptions.ts`); ticketing never auto-retried | Phase 4 tests: timeout, offline, rate_limited, cancelled (DEC-007 App. A.1.4) |
| E | Schema bypass escalates to privileged UI state (e.g. `real-time` badge) | `real-time` provenance is unproducible by design until DEC-002 is superseded | Test: mock emits `demo` only (DEC-002 / App. A.1.1); `realTimeData` flag OFF |

### EP-5 — Build and supply chain (npm, lockfile, GitHub Actions, Docker)

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S | Typosquatted dependency | All 24 direct deps verified to exist and be the intended packages (2026-10-22, incl. the non-obvious `test-renderer`, which is RNTL 14's declared peer dep); all lockfile entries resolve from `registry.npmjs.org` with integrity hashes | Keep the per-package typosquat check for every added dependency (checklist §5) |
| T | Lockfile tampering / malicious install scripts | Lockfile committed; npm 11 blocks install scripts by default (`README.md:180-182`) | Pin CI actions to commit SHAs when a human owns CI (currently tag refs); review install-script allowlist when one is created |
| R | Nobody can tell what a CI run did | CI runs are UNVERIFIED and honestly labelled (`README.md:18-20`) | Human must observe the first real run; branch protection + required checks (checklist §15) |
| I | Secret in repo/Git history/bundle | Full-history scan found none (see `docs/security-privacy-review-2026-10-22.md` §1); `.gitignore` covers `.env` + signing material | Close the remaining `.gitignore` gaps (see review F-04); secret-scanning in CI (gitleaks or GitHub secret scanning) before launch |
| D | Compromised/vulnerable package breaks CI or dev machines | `npm audit` job exists (advisory); 48 known findings triaged in the review doc | Decide with the security owner when `dependency-audit` becomes required (review F-02) |
| E | CI token over-permissioned | Workflow quality jobs use no secrets | Add explicit `permissions: contents: read` (review F-03); release credentials only in protected CI secrets (checklist §15) |

### EP-6 — Location and map *(future, plan.md 17.5, DEC-012 open)*

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S | Map line/marker read as an operational route or live service | Rule stated in plan.md 17.5 and checklist §9 | UI disclaimer + provenance on station data; test |
| T | Map SDK or tile cache tampering | Nothing integrated | SDK chosen only after licence/privacy review (DEC-012); tile caching only if permitted |
| I | Location history leaks to logs, crash reporting or the future backend | Nothing collects location today (`StationQuery.near` optional — `src/types/station.ts:257-258`) | Foreground-only permission, user-initiated "nearby stations" only; no location in logs (checklist §6); never store more than the minimum; document retention |
| I | Map SDK key abused for quota/cost | Key is public by design (`.env.example:18-21`) | Restrict key by bundle id/package name at the provider (plan.md 17.5); monitor quota |
| D | Map tiles unusable on low-end devices/offline | — | List alternative always available, works without permission (checklist §9) |
| E | Permission requested coercively at onboarding | Onboarding rules forbid it (plan.md 17.7: permission only at point of use) | Enforce in onboarding implementation + test (checklist §10 "No permission prompts during onboarding") |

### EP-7 — Accounts *(future, plan.md 17.2; flag `accounts` OFF)*

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S | Credential stuffing, phishing, reset-link capture | Nothing exists | Reputable IdP, no custom crypto; rate limits + lockouts; single-use expiring reset links (checklist §3) |
| T | Token tampering / session fixation | — | IdP-issued tokens; SecureStore storage; server-side authorization on every private resource |
| R | "Who did what" deniability | — | Server audit trail; support "act as user" tooling audited (checklist §3) |
| I | Tokens/passwords in logs or AsyncStorage | — | Never log them (checklist §3/§14); refresh tokens only in Keychain/Keystore |
| D | Account enumeration via error/timing differences | — | Uniform errors + timing tests (checklist §3) |
| E | IDOR: user A reads user B's tickets | — | Server-side authz + the Phase 6 test "change an ID in a request" (plan.md 17.9) |

### EP-8 — Ticketing and payments *(future, plan.md 17.3; flag `ticketSales` OFF — TICKETING GATE)*

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S | Forged payment callback or deep-link "success" ⇒ free ticket | Spec: callbacks verified server-side; client success never trusted (`src/services/ticketing/TicketingProvider.ts:440-447`, DEC-008) | Webhook signature verification, duplicate/late-callback rules, reconciliation (DEC-008) — implement + test at the gate |
| T | Replay of state-changing calls ⇒ double charge | Idempotency keys in every input type (`src/types/order.ts`, `TicketingProvider` inputs); state machine rejects illegal transitions (`order.ts:214-225`) | Server-side enforcement + "duplicate taps on Pay" test (checklist §4) |
| R | Order history must be auditable | `Order.history` with actor/timestamp/idempotencyKey (`src/types/order.ts:181-206`) | Retain per policy; no payment secrets in it (already a type comment) |
| I | Card data enters the app | **Impossible by construction** — no card fields exist | Keep it that way; provider-hosted checkout only (`TicketingProviderCapabilities.checkoutKind: 'provider-hosted-web'`) |
| D | Payment-provider outage leaves orders stuck | `issuance_failed` + reconciliation specified (DEC-008) | Support procedure + runbook before gate |
| E | Price/availability manipulated between search and payment | `confirmPrice` revalidation contract (`TicketingProvider.ts:403-408`) | Server revalidation immediately before payment; user must re-confirm on `priceChanged` |

## 5. Abuse cases (feature-level)

**Journey search (now → Phase 4)**
- AC-1: A third party screenshots *demo* results and presents them as real BDZ times.
  Counter: visible demo labels everywhere (checklist §1); mock fixtures "obviously synthetic"
  (DEC-009 App. A.1.3); provenance test.
- AC-2: Someone wires up a community GTFS mirror "just for dev data" and it ships.
  Counter: DEC-002/DEC-013 — unofficial feeds prohibited without legal clearance; code review.
- AC-3: Input abuse against a future API (fuzzing, oversized queries) → outage or data dump.
  Counter: EP-1/EP-4 actions (Zod, limits, rate limits).

**Accounts (future)**
- AC-4: Credential stuffing from a leaked-password corpus; account takeover of users who
  reuse passwords. Counter: rate limits, optional MFA, anomaly detection (checklist §3/§11).
- AC-5: Enumeration ("does this email have an account?") for phishing. Counter: uniform
  responses, timing tests.
- AC-6: Support tool used to take over accounts. Counter: audit trail on every use.

**Tickets (future)**
- AC-7: Duplicate-tap/replay double charges. Counter: idempotency keys end-to-end, no
  auto-retry on ticketing calls (`NO_AUTO_RETRY_POLICY`).
- AC-8: "Paid but no ticket" social-engineering refunds while keeping the ticket.
  Counter: reconciliation job keyed on provider truth; support procedure (checklist §4).
- AC-9: Shared/forged ticket artefacts at inspection. Counter: display only the provider's
  artefact; never fabricate QR/PDF semantics (`src/types/ticket.ts:244-257`).
- AC-10: Fake "BDZ tickets" app phishing users for card data and blaming this app.
  Counter: A8 — brand/legal controls, security.txt/disclosure channel (checklist §5), store
  takedown process (needs an owner).

**Map / location (future)**
- AC-11: Location history reconstructed from logs/crash reports. Counter: logging ban on
  `GeoPoint`/location (extend checklist §14 privacy test to assert it).
- AC-12: Covert always-on tracking dressed up as "nearby stations". Counter: foreground-only,
  point-of-use permission (plan.md 17.5), store disclosure.
- AC-13: Map-key scraping for quota theft/cost. Counter: platform-restricted key + quotas +
  cost alerts (checklist §11).

## 6. Review and maintenance rules

1. Revisit this model at every phase gate (Phases 2, 4, 6, 8) and whenever DEC-002, DEC-003,
   DEC-004 or DEC-012 change status — each one changes an entry point from *(future)* to real.
2. Every new dependency, SDK, network call or permission adds a row to §4 before it merges.
3. The named human security owner (checklist §17) must review and sign this document before
   public launch (legal-compliance-matrix row 18).
4. Nothing in this document claims a mitigation exists unless it is implemented and tested;
   "specified in DEC-…" is not "mitigated".
