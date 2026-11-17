# Production-readiness checklist status (addbeforerelease.txt, sections 1–17)

**Status tracker for the GO/NO-GO in `addbeforerelease.txt`.** Every checkbox in
sections 1–17 plus the GO/NO-GO summary is listed below with a status, an
evidence pointer, and the human owner the checklist demands.

- **Compiled:** 2026-10-25 by the docs-release agent. **DRAFT — requires human
  approval before it is relied on or published.**
- **Source of truth for item text:** `addbeforerelease.txt` (DEC-010). Where it
  and `plan.md` conflict, the stricter rule wins (no conflicts recorded).
- **Evidence rule (checklist preamble):** "done" requires evidence in this repo.
  Agent-verified ≠ human-verified. Agent test runs prove the code behaves as
  tested **in a Jest/Linux environment**; they do not prove device behaviour,
  legal compliance, or human sign-off.

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done — evidence exists in this repo (agent-verified; human verification noted where relevant) |
| 🟡 | Partial — some evidence, item not fully met |
| ⛔ | Blocked — cannot be completed without a human decision/external party |
| 📌 | Deferred — deliberately not done now (out of scope / no backend / gated feature), documented |
| 🚫 | NOT RUN — requires device, platform, environment or human action that has not happened |

**Owner column:** every human owner in addbeforerelease.txt §17 is **UNASSIGNED**
(see section 17). Where a role is required, it is named in brackets. No item
below has a named human owner today.

**Headline gate numbers (agent-run, 2026-11-17, DEC-029 — must be re-run before
release):** `npm run typecheck` PASS · `npm run lint` 0 problems ·
`npm run format:check` PASS · `npm test` **810 passed / 810 in 66 suites**.

---

## 1. AUTHORIZATION, DATA SOURCE AND LEGAL BOUNDARY [LAUNCH BLOCKER]

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Written BDZ authorization for API/timetable data/logos/ticketing | ⛔ blocked | None — no contact with BDZ has been made (`docs/bdz-integration-review.md`, DEC-002/DEC-013) | UNASSIGNED [product owner + legal] |
| No scraping / no reverse engineering / no browser-session automation | ✅ | No such code exists; the only network egress is the map style/tiles URL (`src/features/stations/map/StationsMap.tsx`); mock-only (DEC-002); lead scans in DEC-013 | UNASSIGNED [security] |
| `docs/bdz-integration-review.md` (review date, terms, API owner, supported functions, authorization status, open legal questions) | 🟡 | File exists (2026-10-22), records mock-only status and verified/assumption labels; **no lawyer has reviewed it** (DEC-002) | UNASSIGNED [legal] |
| `docs/legal-compliance-matrix.md` (requirement, why, owner, evidence, status, due date, launch blocker) | 🟡 | File exists (2026-10-22) with the required columns; owners/due dates UNASSIGNED; `NEEDS LAWYER` items open (DEC-002/DEC-013) | UNASSIGNED [legal] |
| App never presented as an official BDZ product | ✅ | Claim-lexicon guards (`tests/mobile-ui/claims-lexicon.test.tsx`, `tests/i18n/claim-lexicon-catalogs.test.ts`), `DemoDataNotice`, README "not an official BDZ product" | UNASSIGNED [legal] |
| Mock provider clearly labelled "demo data" everywhere | ✅ | DEC-002/DEC-006/DEC-017: `demo` provenance on every fixture; `tests/mobile-ui/provenance.test.tsx`; smoke test asserts demo labels | UNASSIGNED |
| Terms of service + privacy policy matching the code | ⛔ blocked | **Do not exist.** No ToS/privacy notice document in `docs/`; drafts require legal counsel (plan.md 17.8) | UNASSIGNED [legal] |
| Every account, domain, repo, store listing, cloud project owned by the company | ⛔ blocked | Placeholder bundle IDs `com.example.bdztrain` (`app.json`, DEC-014 L6/F-05); git remote is `github.com/Kalsito1017/BDJ` — whether that account is company/organization-owned is **UNVERIFIED**; no store accounts exist | UNASSIGNED [product owner] |

## 2. DATA MODEL AND DATABASE (backend, once one exists)

Section status: 📌 deferred as a whole — **no backend exists or is justified**
(DEC-003). Client-side groundwork is noted per row. All rows: UNASSIGNED
[backend engineer].

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Schema designed deliberately (reviewed ERD) | 📌 | No backend (DEC-003); client domain model reviewed in DEC-006 | UNASSIGNED [backend] |
| Forward AND rollback migrations; no hot-table locks | 📌 | No database | UNASSIGNED [backend] |
| Indexes tested against realistic volumes | 📌 | No database | UNASSIGNED [backend] |
| Connection pooling | 📌 | No database | UNASSIGNED [backend] |
| Nightly backups AND a tested restore | 📌 | No database | UNASSIGNED [backend/DevOps] |
| Point-in-time recovery; RPO/RTO with the operator | 📌 | UNDECIDED (DEC-003/Appendix C) | UNASSIGNED [DevOps] |
| Soft deletes where recovery matters | 📌 | No backend; local store deletes are user-initiated and caps/TTL are documented (DEC-024) | UNASSIGNED [backend] |
| Server-side validation of all input | 📌 | No server; **client** boundary validation exists (Zod, DEC-017) | UNASSIGNED [backend] |
| Money as integer minor units, never floats | 🟡 | `amountMinor` integer convention enforced by Zod (`src/types/order.ts`, DEC-006/DEC-008); no money is ever stored or moved — ticketing is disabled (DEC-004) | UNASSIGNED [backend + finance] |
| Timestamps UTC; Europe/Sofia handling tested (DST, midnight crossings) | 🟡 | ISO-UTC convention + `HH:mm` Europe/Sofia formatting (`src/i18n/formatting.ts`, `tests/i18n/formatting.test.ts`); `departureDayOffset`/`arrivalDayOffset` model midnight crossings with fixtures (`tests/data-provider/fixtures.test.ts`). **DST-transition cases not specifically tested; backend storage N/A** | UNASSIGNED [backend] |
| Names with apostrophes, hyphens, Cyrillic, Latin, accents, emoji in every field | 🟡 | Cyrillic/Latin/mixed station names covered (`tests/i18n/cyrillic.test.ts`, `tests/stations/station-search-edge.test.ts`); accents/emoji not exhaustively covered; storage/export/email N/A | UNASSIGNED [backend] |
| Pagination that works on page 400 | 📌 | No backend; station directory loads whole (mock) | UNASSIGNED [backend] |
| Data export for users; imports survive malformed CSVs | 📌 | No backend, no imports; local data is user-deletable in-app (DEC-024) | UNASSIGNED [backend] |
| Retention rules + code that deletes per policy | 🟡 | Client-side only: 90-day TTL + 20 recents / 100 favourites caps enforced and tested (`src/services/storage/localStore.ts`, `tests/storage/localStore-contract.test.ts`); server retention N/A | UNASSIGNED [backend + legal] |

## 3. AUTHENTICATION AND ACCOUNTS (only if accounts are built)

Section status: 📌 deferred — `accounts` feature flag is **OFF**
(DEC-004; plan.md 17.2 gated on product approval + identity provider + security
review). No account code exists. All rows: UNASSIGNED [security + mobile].

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Reputable identity provider; no custom cryptography | 📌 | No auth code (DEC-004) | UNASSIGNED [security] |
| Sign up, email verification, sign in, sign out | 📌 | Flag OFF (DEC-004) | UNASSIGNED [mobile] |
| Emails with "+" and unusual valid characters work at login | 📌 | No auth code | UNASSIGNED [mobile] |
| Password reset links expire and work exactly once | 📌 | No auth code | UNASSIGNED [backend] |
| Session refresh, timeout, revoke-all-sessions | 📌 | No auth code; `expo-secure-store` reserved for this (DEC-001) | UNASSIGNED [backend] |
| Refresh tokens only in Keychain/Keystore (SecureStore), never AsyncStorage | 📌 | Rule encoded in DEC-001/checklist; nothing stores tokens today (`tests/storage/localStore-privacy.test.ts` asserts the persisted shape) | UNASSIGNED [security] |
| Rate limits on login/reset; smart lockouts | 📌 | No server | UNASSIGNED [backend] |
| No account enumeration (errors or timing) | 📌 | No auth code | UNASSIGNED [security] |
| Optional MFA with lost-phone recovery (if scope justifies) | 📌 | Scope undecided | UNASSIGNED [security] |
| Account deletion + data export flows (app-store requirement) | 📌 | N/A while accounts are disabled (also stated in `docs/privacy-labels-draft.md`); revisit the moment `accounts` flips | UNASSIGNED [mobile + legal] |
| Guest access to timetable, stations and map; no forced sign-up | ✅ | Search → results → details, stations list/map and favourites all work without an account (`tests/smoke/journey-flow-e2e.test.tsx`, DEC-022) | UNASSIGNED |
| Authorization enforced server-side on every private resource | 📌 | No server | UNASSIGNED [backend] |
| Tests: user A cannot read user B's tickets; expired/revoked tokens rejected | 📌 | No auth code | UNASSIGNED [QA] |
| Support tooling "act as a user" has an audit trail | 📌 | No support tooling | UNASSIGNED [backend] |

## 4. TICKETING AND PAYMENTS [TICKETING GATE]

Section status: ⛔ gated — ticketing is **disabled** (feature flag `ticketSales`
OFF, DEC-004). Mock provider only. No payment has ever been processed or tested.
All rows: UNASSIGNED [product owner + legal + backend].

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| `TicketingProvider` interface; no screen depends on a concrete provider | 🟡 | Interface exists (`src/services/ticketing/TicketingProvider.ts`, DEC-007); `MockTicketingProvider` itself is deferred (DEC-017) and no ticket UI ships | UNASSIGNED [mobile] |
| Server-controlled order state machine incl. failure/edge states | 🟡 | Specified exactly (transitions + payloads) in `src/types/order.ts` (DEC-008); **spec only — implementation blocked by the gate** | UNASSIGNED [backend] |
| Price and availability revalidated server-side before payment | 📌 | Blocked by gate | UNASSIGNED [backend] |
| Provider-hosted PCI-compliant checkout; never see/store card numbers or CVVs | 📌 | By design no card fields exist in the types (DEC-008/DEC-009); nothing to verify until a provider exists | UNASSIGNED [backend + legal] |
| Idempotency keys on purchase/payment calls | 🟡 | `IdempotencyKey` spec + mock-contract requirements (DEC-008, Appendix A.2); not implemented | UNASSIGNED [backend] |
| De-duplication for repeated taps on "Pay" | 🟡 | Specified (DEC-008); not implemented | UNASSIGNED [backend] |
| Payment status verified server-to-server; never trust a client callback | 🟡 | Specified (DEC-008 rules 1–6); not implemented | UNASSIGNED [backend] |
| Webhooks: signature verification, retries, duplicate handling, failed-delivery log | 🟡 | Specified (DEC-008); not implemented | UNASSIGNED [backend] |
| Tickets issued only after the authoritative provider confirms | 🟡 | Specified (DEC-008 / plan.md 17.3); not implemented | UNASSIGNED [backend] |
| Reconciliation job + "paid but no ticket" support procedure | 🟡 | `issuance_failed` → reconciliation specified (DEC-008 rule 5); no job, no support procedure exists | UNASSIGNED [backend + support] |
| Refunds, credits, partial refunds as the provider supports | 🟡 | States `refund_pending`/`refunded` specified (DEC-008); not implemented | UNASSIGNED [backend] |
| Cancellation/refund/discount terms from current approved provider data at purchase time | 📌 | Blocked by gate + BDZ authorization; **never hard-code policy copy** (DEC-013 risk 2) | UNASSIGNED [legal] |
| Currency, rounding, VAT/tax verified with finance/legal | ⛔ | No finance/legal owner; currency union `BGN | EUR` deliberately closed pending that review (DEC-006) | UNASSIGNED [finance + legal] |
| Invoices/receipts as legally required; finance-reconcilable reports | 📌 | Blocked by gate | UNASSIGNED [finance] |
| Order audit trail without logging payment secrets | 🟡 | `Order.history` specified (DEC-008); no payment secrets exist anywhere by design | UNASSIGNED [backend] |
| Sandbox end-to-end test before production; no live tests on customers | 🚫 NOT RUN | Nothing to sandbox-test; no provider, no authorization (DEC-002) | UNASSIGNED [QA + backend] |

## 5. SECURITY

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Threat model written before launch (`docs/threat-model.md`) | ✅ | `docs/threat-model.md` exists and is maintained (initial 2026-10-22; updated 2026-10-24/24b/24c). Agent-written; **security owner sign-off pending** | UNASSIGNED [security] |
| Secrets out of code/repo/Git history/.env; rotate anything pasted | ✅ | Full-tree + history + git-config scans clean (DEC-014, DEC-019, DEC-023, DEC-025: "no secrets anywhere"); nothing to rotate | UNASSIGNED [security] |
| `EXPO_PUBLIC_*` and map SDK keys are PUBLIC; restrict map keys by bundle ID | ✅ | Documented in README + `.env.example`; no map API key exists at all (DEC-012: keyless OpenFreeMap) | UNASSIGNED [security] |
| Verify every package exists and is intended (typosquatting); lockfile committed; no unreviewed churn | ✅ | DEC-009 policy; registry-verified installs incl. the `react-native-maplibre` 404 catch (DEC-024); `package-lock.json` committed | UNASSIGNED |
| Dependency and vulnerability scanning in CI | 🟡 | `dependency-audit` CI job exists but is **advisory**. Re-verified 2026-11-17: **34 findings — 3 high / 31 moderate** (node-forge, `@expo/cli`, nested zod). The 2026-10-24 baseline (5 high / 2 advisories) is stale; `npm audit fix` offers a fix only with large churn (+43/−132/~67 packages), which is **not reviewed**. Re-baselining + gate policy = security-owner decision (DEC-014 M3, DEC-029). `npm audit fix --force` forbidden | UNASSIGNED [security] |
| Input sanitization everywhere user/provider can send data | 🟡 | Zod boundary schemas **with `.max()` bounds** (DEC-017, DEC-019 W3-M1), route-boundary id length/control-char bounds (DEC-025 P5-M1 / W3B-M1), store input validation with tests. No known unbounded boundary input as of 2026-11-17 | UNASSIGNED [security] |
| OWASP protection (MASVS mobile / API Top 10 backend) | 🟡 | Input/validation/claim guards and a threat model exist; **no formal MASVS assessment or penetration test has been run**; API Top 10 N/A (no backend) | UNASSIGNED [security] |
| File uploads scanned/size-limited (if any) | 📌 | No file uploads exist | UNASSIGNED [security] |
| CORS not "allow everything"; security headers | 📌 | No server (DEC-003) | UNASSIGNED [DevOps] |
| HTTPS everywhere; cert renewals automated and monitored | 🟡 | The app's only egress is HTTPS (`https://tiles.openfreemap.org/...`); no infrastructure exists to monitor (DEC-003) | UNASSIGNED [DevOps] |
| Encryption at rest and in transit | 🟡 | Transit: HTTPS only. At rest: local data sits in AsyncStorage inside the OS sandbox — **not encrypted by the app**; acceptable while data is non-sensitive (favourites/recents/language flag) and disclosed in `docs/privacy-labels-draft.md` | UNASSIGNED [security] |
| Least-privilege for every person/service/agent; agents never hold production credentials | 🟡 | No production credentials exist and agents hold none; no team exists yet for access review (§17) | UNASSIGNED [security] |
| Logs record who did what, never passwords/tokens/cards | 🟡 | Diagnostics carry schema paths only, never payload values (DEC-017/DEC-025); privacy test asserts the persisted shape (`tests/storage/localStore-privacy.test.ts`). No "who did what" audit exists (no accounts/backend) | UNASSIGNED [security] |
| Rate limits + DDoS/abuse protection on public APIs | 📌 | No public API (DEC-003) | UNASSIGNED [DevOps] |
| Penetration test appropriate to risk before launch | 🚫 NOT RUN | Four security-privacy code reviews are **not** a pen test (`docs/security-privacy-review-*.md`) | UNASSIGNED [security] |
| Vulnerability disclosure process (security.txt / contact) | 📌 | Not present — no contact address can be published until the operating legal entity exists (DEC-013 human decision 4) | UNASSIGNED [security + legal] |
| Incident response + breach-notification plan, incl. lost device | 📌 | No evidence in repo — owner UNASSIGNED | UNASSIGNED [security] |
| Quarterly access reviews once a team exists | 📌 | No team/access exists | UNASSIGNED [security] |

## 6. PRIVACY AND COMPLIANCE (GDPR / EU / Bulgaria) [LAUNCH BLOCKER]

Engineering checklist only — **not legal advice** (checklist §6 preamble).
All rows: UNASSIGNED [legal (BG/EU) + security/compliance owner].

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Controller/processor roles, lawful basis per purpose, privacy notice | ⛔ | `docs/legal-compliance-matrix.md` tracks the items; no lawyer, no privacy notice (DEC-002) | UNASSIGNED [legal] |
| Data minimization; no collection without documented purpose | ✅ | The app collects nothing off-device; persisted shape is exactly language + onboarding flag + favourites/recents and is asserted by `tests/storage/localStore-privacy.test.ts` (DEC-025 P5-M2); no analytics (flag OFF) | UNASSIGNED [legal] |
| Consent for analytics/marketing separate from terms; no preselection | 🟡 | Trivially satisfied today (no analytics/marketing exists — flag `analytics` OFF, DEC-004); onboarding "preselects no consent" (DEC-015). A consent design is required **before** any analytics is enabled | UNASSIGNED [legal] |
| GDPR deletion/export requests reach every table, backup, log | 📌 | No server data exists; in-app clearing of favourites/recents exists (DEC-024). DSAR process needs the legal entity + backend | UNASSIGNED [legal + backend] |
| Data processing agreements with every vendor | ⛔ | Vendors not engaged. OpenFreeMap/OSM tile access is currently the only external service (see `docs/privacy-labels-draft.md`) | UNASSIGNED [legal] |
| Data residency decided (EU hosting) and documented | ⛔ | UNDECIDED (DEC-003, Appendix C) | UNASSIGNED [legal + DevOps] |
| Children's use assessed; safeguards if needed | ⛔ | Not assessed — no evidence — owner UNASSIGNED | UNASSIGNED [legal] |
| Location data: foreground-only, user-initiated feature, minimal retention, no history in logs | 🟡 | By design: tap-gated, foreground-only, never persisted (`src/features/stations/model/nearby.ts`, `LocationPort` in `src/features/stations/types.ts`; `expo-location` deliberately NOT installed — the port's default reports unavailable). The feature is **not enabled yet**; behaviour is code-reviewed, **not device-tested** | UNASSIGNED [security + legal] |
| Accessibility obligations reviewed (EU/Bulgarian rules) | 🟡 | `docs/accessibility-checklist.md` + code-level a11y sweep (`tests/mobile-ui/accessibility-sweep.test.tsx`); the *legal* obligation review has not happened; device screen-reader runs NOT RUN (see §10) | UNASSIGNED [legal + QA] |
| App Store / Google Play privacy labels, account-deletion path, support contact, review notes accurate | 🟡 | Drafts started: `docs/privacy-labels-draft.md`, `docs/store-metadata-draft.md` (all **draft — needs security/legal sign-off**). Support contact UNASSIGNED; privacy policy URL blocked (§1); account deletion N/A while accounts are disabled | UNASSIGNED [legal + mobile release] |
| Permission/IP clearance for logos, imagery, map assets, translations, datasets | 🟡 | Map: DEC-012 records attribution/licence obligations (ODbL) and `MapAttribution.tsx` renders the required wording in every map state (DEC-025); station dataset is the labelled DEMO set (`docs/station-dataset-licensing.md`); no BDZ logos or imagery used anywhere; translations pending human review (§8) | UNASSIGNED [legal] |
| Formal certifications (SOC 2 / ISO 27001) only if required; decision recorded | 📌 | No contract requires them; decision not recorded — nothing to record yet | UNASSIGNED [security + product] |

## 7. MOBILE APP QUALITY (React Native + TypeScript)

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| TypeScript strict mode, ESLint, Prettier; readable code | ✅ | `tsconfig.json` strict; gates green 2026-11-17 (DEC-029); `npm run lint` 0 problems | UNASSIGNED [tech lead] |
| Runtime validation (Zod) of all provider/API responses | ✅ | DEC-017 schemas parse every external payload before mapping; `tests/data-provider/schemas.test.ts` (malformed payloads rejected as `invalid_response`) | UNASSIGNED |
| Empty, loading, error, offline, timeout and retry states on EVERY screen | ✅ | DEC-023 acceptance criteria; `tests/mobile-ui/states.test.tsx`, `request-error-state.test.tsx`, `resilience.test.tsx`, `journey-results.test.tsx`. Agent-verified in Jest only | UNASSIGNED [QA] |
| Error messages a user can act on | ✅ | `ProviderError` → localized actionable messages (DEC-007); both locales (catalog guards green) | UNASSIGNED |
| Forms keep typed values when one field fails validation | ✅ | DEC-022 §2 (tested via the real hook + mock provider) | UNASSIGNED |
| Destructive actions ask for confirmation | ✅ | `ConfirmDialog` on clear favourites/recents (DEC-024; `tests/mobile-ui/states.test.tsx`, `favourites.test.tsx`) | UNASSIGNED |
| Scheduled vs real-time vs cached vs demo clearly labelled | ✅ | Provenance union (DEC-006) + label rendering + claim-lexicon guards; `real-time` is reserved and unproducible (DEC-002). Rule 6 enforced by tests | UNASSIGNED |
| Back button and deep links behave as users expect | 🟡 | Route contract + param validation tested (DEC-022/023/025). **On-device back behaviour NOT RUN**; the deep-linked `/search/station-picker` modal warning is fixed in DEC-029 (`unstable_settings.anchor`) | UNASSIGNED [QA] |
| Notifications only if in scope, user-controllable, permission at moment of use | 📌 | Out of scope — no notifications exist (DEC-003) | UNASSIGNED [product] |
| Performance on slow networks and low-end devices | 🚫 NOT RUN | Debounce/caching exist (DEC-021) but no network shaping or device matrix has been tested | UNASSIGNED [QA] |
| Crash reporting/error tracking with PII scrubbing | 📌 | Deliberately none installed (analytics flag OFF, privacy review required first — DEC-004) | UNASSIGNED [security + mobile] |
| App versioning + forced-update/minimum-version mechanism | 🟡 | Versioning: `app.json` `version: 0.1.0` + `expo.version` convention; **no forced-update mechanism** (needs a backend — DEC-003 revisit trigger 5) | UNASSIGNED [mobile + DevOps] |
| Offline caching of static station data with expiry and "stale" labels | 🟡 | Query cache policy (staleTime/gcTime, DEC-021), local store TTL/expiry (DEC-024), `isStale` "may be out of date" hint + offline banner (`tests/hooks/journeySearchStale.test.tsx`, `tests/mobile-ui/resilience.test.tsx`). Real network detection is a port with a documented NetInfo integration snippet (NetInfo deliberately not installed) | UNASSIGNED [mobile] |

## 8. LOCALIZATION (bg + en from release one)

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| All user-visible strings in `src/i18n/locales/{bg,en}.json`; none in screens | ✅ | Key-usage + i18n-integrity + parity guards (`tests/i18n/*`, `tests/mobile-ui/i18n-integrity.test.tsx`); catalogs at 259 keys/locale (DEC-024) + 8 notices keys (DEC-027) | UNASSIGNED |
| Device-locale detection on first launch; language switch in Settings; choice persisted; reliable fallback | ✅ | Detection + persisted choice + `DEFAULT_LOCALE='bg'` / `FALLBACK_LOCALE='en'` (DEC-016, `src/i18n/index.ts`, `settingsStorage.language`). Settings switch implemented 2026-10-25 (`src/app/(tabs)/settings.tsx`, tested in `tests/mobile-ui/settings-language.test.tsx` incl. persistence + screen-reader selection state) — device run still 🚫 NOT RUN | UNASSIGNED [mobile] |
| Dates, times, numbers, currency, validation, ticket states, legal text, a11y labels localized | 🟡 | `src/i18n/formatting.ts` + `tests/i18n/formatting.test.ts` (dates/times/numbers, Europe/Sofia); validation messages localized (DEC-022); ticket-state/order-state keys exist but are flagged `review.*` (legal/payment wording); currency formatting unused while ticketing is disabled | UNASSIGNED [legal + mobile] |
| Reviewed translations; no unreviewed machine translation for legal/payment text | ⛔ | **Human translation review NOT DONE.** All legal/payment wording carries `review.*` markers (`src/i18n/locales/*.json`), incl. `review.common.app_name` (product name UNCONFIRMED); bg nit owed (DEC-023 L6) | UNASSIGNED [human translator + legal] |
| Official station display names kept; aliases only when licensed/verified | 🟡 | Enforced in the model (DEC-006: aliases only when the source defines them); the current dataset is the labelled DEMO set — no licensed official names exist yet (DEC-012) | UNASSIGNED [legal] |
| Long translations and large text scaling tested in both languages | 🚫 NOT RUN (device) | Length guards are code-tested (bg ≤ 4×en + 30, DEC-016); **dynamic-type / large-text rendering has never been run on a device** (DEC-027) | UNASSIGNED [QA] |
| Cyrillic and Latin search both work (incl. mixed input) | ✅ | `tests/i18n/cyrillic.test.ts`, `tests/stations/station-search*.test.ts` | UNASSIGNED |

## 9. MAP AND STATIONS

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Map SDK chosen after licensing/costs/attribution/privacy/offline/rate-limit review; documented | ✅ | DEC-012 (decided by the **human owner** 2026-10-24: MapLibre RN + OpenFreeMap) + `docs/map-sdk-comparison.md`; tile-cache limits documented (`src/features/stations/map/MapAttribution.tsx`) | UNASSIGNED [product — DEC-012 decision recorded] |
| Verified, licensed station dataset; show only verified data | ⛔ | Only the labelled **DEMO** dataset ships (`docs/station-dataset-licensing.md`); no licensed source approved; markers never imply real service (DEC-012) | UNASSIGNED [legal] |
| List/map toggle as the accessible alternative; works without location permission | ✅ | List/map toggle (`src/features/stations/StationsView.tsx`, `tests/stations/stations-view.test.tsx`); the map toggle hides gracefully when the native module is absent; nearby/location is tap-gated and the port defaults to unavailable | UNASSIGNED |
| No tile scraping; tile caching only if the provider permits it | ✅ | **No tile caching is implemented** (DEC-012/`MapAttribution.tsx`); OpenFreeMap limits documented for any future caching | UNASSIGNED [legal] |
| Required map attribution displayed | ✅ | `src/features/stations/map/MapAttribution.tsx` renders the required OSM/ODbL + OpenFreeMap wording **in every map state incl. the fallback** (DEC-025 fix; `tests/stations/map-attribution-states.test.tsx`) | UNASSIGNED |
| A line on the map never implies an operational route or live service | ✅ | No route lines are drawn at all (DEC-024); map copy passes the claim-lexicon (`tests/stations/map-copy-claims.test.tsx`) | UNASSIGNED |
| Deep links from station and journey results | 🟡 | Journey deep links (`/search/results?...`, `/journey/[id]`) validated at the route boundary (DEC-022/023/025); station detail is an in-screen selection (no `/station/[id]` route) — station→details deep link is **not implemented as a URL** | UNASSIGNED [mobile] |

## 10. ONBOARDING AND UX

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| 3–4 screen skippable guide (Find a train / Check your trip / Tickets / Map and language) | ✅ | 4 skippable steps (`src/features/onboarding/onboardingSteps.ts`, DEC-015; `tests/mobile-ui/onboarding.test.tsx`); Tickets step says ticket sales are NOT available (rule 3) | UNASSIGNED |
| Completion saved locally; reopenable from Settings → Help | ✅ | `settings.onboardingCompleted` persisted on finish **and** skip (DEC-015); Settings → Help replays the guide (`src/app/(tabs)/settings.tsx`, `tests/mobile-ui/onboarding.test.tsx`) | UNASSIGNED |
| No permission prompts during onboarding | ✅ | Decided and tested (DEC-015); no permission-requesting module is even installed | UNASSIGNED |
| Illustrations/screenshots only if they match the real UI | 📌 | No illustrations or store screenshots exist yet — `docs/store-metadata-draft.md` requires real-UI screenshots only | UNASSIGNED [mobile release] |
| Navigation limited to Search, Map, My trips/Tickets, Settings | ✅ | Tab shell exactly `/`, `/search`, `/map`, `/trips`, `/settings` (+ `/onboarding`) (DEC-015; `tests/mobile-ui/navigation-shell.test.tsx`) | UNASSIGNED |
| VoiceOver and TalkBack tested on key flows; contrast, touch targets, dynamic scaling verified | 🚫 NOT RUN (device) | **Agent-verified ≠ human-verified:** code-level a11y sweep passes (`tests/mobile-ui/accessibility-sweep.test.tsx`, DEC-027) and WCAG-AA contrast is asserted (`tests/mobile-ui/theme.test.ts`), but **no screen reader has ever been run** — `docs/voiceover-talkback-scripts.md` await a human device session (DEC-027) | UNASSIGNED [QA] |
| Undo or confirmation wherever an action cannot be reversed | ✅ | Confirmation on all destructive local-store actions (DEC-024; `ConfirmDialog` tests) | UNASSIGNED |

## 11. BACKEND, INFRASTRUCTURE AND DEVOPS (if a backend is justified)

Section status: 📌 deferred — **no backend without a verified need** (DEC-003,
checklist §11 preamble). All rows: UNASSIGNED [DevOps].

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Dev, staging, production environments that match | 📌 | No deployments exist; local + Docker toolchain only | UNASSIGNED [DevOps] |
| Infrastructure as code | 📌 | No infrastructure (Dockerfile/compose are dev tooling only) | UNASSIGNED [DevOps] |
| CI/CD: tests, typecheck, lint, dependency scan before any deploy | 🟡 | `.github/workflows/ci.yml` runs typecheck/lint/tests + advisory `dependency-audit`; **no agent has observed a CI run** (UNVERIFIED — DEC-014/DEC-020); no deploys happen | UNASSIGNED [DevOps] |
| One-click rollback; zero-downtime deploys; feature flags (ticketing behind a flag that is OFF) | 🟡 | **Feature flags: ✅** — `src/types/feature-flags.ts`, `ticketSales` OFF with `changeRequiresHumanApproval: true` (DEC-004). Rollback/deploys: N/A (no backend) | UNASSIGNED [DevOps + product] |
| Stateless API instances, load balancer, autoscaling | 📌 | No backend | UNASSIGNED [DevOps] |
| CDN for static assets; cache policy for public data; never cache authenticated responses | 📌 | No backend | UNASSIGNED [DevOps] |
| Background job queue (email, notifications, reconciliation) | 📌 | No backend | UNASSIGNED [backend] |
| Retries with backoff+jitter, circuit breakers, DLQ, non-double-running cron | 🟡 | Client-side retry/backoff+jitter is implemented and tested (DEC-007, `tests/data-provider/requestExecutor.test.ts`); the server-side half is deferred | UNASSIGNED [backend] |
| Cache invalidation defined for every cache | 🟡 | Client cache policy documented per query (DEC-021); server caches N/A | UNASSIGNED [backend] |
| DNS, SSL renewals, domain renewals automated and alerting | 📌 | No domains owned (see §1 item 8) | UNASSIGNED [DevOps] |
| Email deliverability (SPF/DKIM/DMARC), bounce/complaint handling | 📌 | No email is sent | UNASSIGNED [DevOps] |
| Storage lifecycle rules | 📌 | No cloud storage | UNASSIGNED [DevOps] |
| COST ALERTS and spending caps from day one | 📌 | Nothing is billed today (map tiles are the only external service and are keyless); set budgets before any cloud/map/email/AI spend | UNASSIGNED [DevOps] |
| Disaster recovery plan, written and tested yearly | 📌 | No evidence in repo — owner UNASSIGNED | UNASSIGNED [DevOps] |
| Versioned public API; revocable API keys; third-party API change plan | 📌 | No public API | UNASSIGNED [backend] |
| Graceful degradation: timetable/map browsing survives non-critical outages | 🟡 | Client-side: offline banner, stale hints, cached results, map fallback to a labelled placeholder when the native module is absent (DEC-024/025). No services to degrade | UNASSIGNED [mobile] |

## 12. OBSERVABILITY AND OPERATIONS

All rows: 📌 deferred — no backend/services to observe (DEC-003). Owner:
UNASSIGNED [DevOps] unless noted.

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Structured, searchable logs with correlation IDs; no secrets/PII | 🟡 | The app logs schema paths/safe summaries only (DEC-017/DEC-025); no log pipeline, no correlation IDs | UNASSIGNED [DevOps] |
| Error tracking, metrics, dashboards, distributed tracing | 📌 | None installed (deliberate — privacy review gate, DEC-004) | UNASSIGNED [DevOps] |
| Uptime checks from outside; alerts tuned to page a real problem | 📌 | No services | UNASSIGNED [DevOps] |
| On-call owner named; runbooks per alert | ⛔ | **No owner named** (§17) | UNASSIGNED [on-call] |
| Blameless postmortems that produce concrete changes | 📌 | Process does not exist yet; the DEC-020/DEC-024 defect records are the closest artefact | UNASSIGNED [tech lead] |
| Public status page or documented status channel | 📌 | None | UNASSIGNED [product] |
| Admin/ops panel + support tooling; changelog users can read | 🟡 | `CHANGELOG.md` now exists (draft, root). No support tooling/ops panel; support contact UNASSIGNED | UNASSIGNED [support] |

## 13. SCALE AND LOAD TESTING [SCALE GATE]

**No capacity claim is made anywhere** (DEC-011). Owner: UNASSIGNED [DevOps].

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| `docs/scale-and-load-test-plan.md` (rates, mix, dataset, tooling, latency percentiles, cost, bottlenecks) | 🟡 | Document exists (2026-10-22) covering all required headings — but every number in it is labelled **ASSUMPTION**; no measurements exist (DEC-011) | UNASSIGNED [DevOps] |
| Initial SLO targets to validate (p95 < 500 ms cached search; 99.9% availability) | 🟡 | Targets recorded as **targets, not guarantees** (DEC-011); not validated | UNASSIGNED [DevOps] |
| Separate ticket-purchase burst test; zero duplicate charges/orders | 🚫 NOT RUN | Blocked by the TICKETING GATE (§4) | UNASSIGNED [QA + backend] |
| Soak tests; repeatable regression load test in CI or scheduled | 🚫 NOT RUN | Tooling chosen (k6 2.1.0, AGPL as internal tooling — DEC-009) but never run | UNASSIGNED [DevOps] |
| Sharding/partitioning only when measurements justify it | 📌 | Nothing to shard | UNASSIGNED [backend] |
| Backpressure, timeouts, rate limits tested under overload | 🚫 NOT RUN | Timeouts exist client-side (DEC-007) but have never been tested under load | UNASSIGNED [QA] |

## 14. TESTING

Baseline (agent-run, 2026-11-17, DEC-029): **810 tests / 66 suites, all
passing** — re-run before release. The 2026-10-25 baseline was not
reproducible: an expired hard-coded travel date and load-sensitive 20 s
timeouts caused runs of 803/810 and 802/810; both causes are fixed and two
consecutive full runs are green (DEC-029). Owner: UNASSIGNED [QA] unless noted.

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Unit tests against intended logic (filtering, validation, time formatting, provider mapping, cache rules, order state machine) | ✅ | `tests/data-provider/*`, `tests/i18n/formatting.test.ts`, `tests/storage/*`, `tests/hooks/*`. Order state machine is spec-only (§4) | UNASSIGNED [QA] |
| Component tests: search form, station picker, results, errors, favourites | ✅ | `tests/mobile-ui/journey-search-form.test.tsx`, `station-picker.test.tsx`, `journey-results.test.tsx`, `request-error-state.test.tsx`, `favourites.test.tsx` | UNASSIGNED [QA] |
| Integration tests for every third-party API with sandbox/mock fixtures | 🟡 | The mock provider + fixtures + deterministic scenarios are fully tested (DEC-017, `tests/data-provider/*`); there are **no third-party APIs** to integrate (DEC-002) | UNASSIGNED [QA] |
| End-to-end: sign-up, search → results → details, checkout (sandbox) | 🟡 | In-app e2e smoke over the REAL router/hooks/store: search → results → details → favourites (DEC-027, `tests/smoke/journey-flow-e2e.test.tsx`). Sign-up and checkout: N/A — gated features (§§3–4) | UNASSIGNED [QA] |
| Regression tests so fixes don't reintroduce bugs | ✅ | Guard suites (claim-lexicon, key-usage, i18n-integrity, locale-parity) + pinned-defect regressions (DEC-025/026/027) | UNASSIGNED [QA] |
| Malformed provider payload, offline, empty result, long station name, Bulgarian text cases | ✅ | `tests/data-provider/schemas.test.ts` (malformed), `mockTrainDataProvider.test.ts` (scenarios), `tests/mobile-ui/resilience.test.tsx` (offline/empty), `tests/stations/station-search-edge.test.ts` (degenerate/long), `tests/i18n/cyrillic.test.ts` | UNASSIGNED [QA] |
| Both languages across onboarding, auth, search, map, ticketing and errors | 🟡 | bg+en covered for onboarding, search, stations/map copy, states/errors (parity + i18n-integrity tests run in both locales). Auth/ticketing copy exists only as flagged `review.*` keys (gated features) | UNASSIGNED [QA + translator] |
| Test data that looks real but contains no production personal data | ✅ | Fixtures are synthetic and personal-data-free by contract (DEC-008 A.1 §7 / DEC-017) | UNASSIGNED |
| Physical-device testing on at least one Android and one iOS device | 🚫 NOT RUN | Linux host only; no device/simulator ever used (rules 5/8; DEC-027) | UNASSIGNED [QA] |
| Verify that what an agent says it tested was actually run | ✅ | Lead + independent reviewers re-ran gates and reproduced counts exactly (DEC-013, DEC-014, DEC-019, DEC-023, DEC-026) | UNASSIGNED [tech lead] |
| Privacy test: no tokens, passwords, payment data or location history in logs | ✅ | `tests/storage/localStore-privacy.test.ts` (persisted shape allowlist, DEC-025 P5-M2); ProviderError diagnostics carry no payload values; no location storage exists | UNASSIGNED [security] |

## 15. CODE HEALTH AND HANDOVER

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Code review on every change; a human reads every line before it ships | ⛔ | Reviews to date are **agent** reviews (reviewer-qa, security-privacy). **No human has reviewed the code** — required before release | UNASSIGNED [tech lead] |
| Branching strategy; protected main; required checks | ⛔ | Repo exists on GitHub; branch protection/required checks **unverified** (no agent can see repo settings; CI runs unobserved) | UNASSIGNED [tech lead + DevOps] |
| Delete dead code and abandoned attempts | 🟡 | Cleanups happened across waves; known leftovers tracked (DEC-019 stale `PENDING_KEYS` list, DEC-024 unused catalog keys inventory) | UNASSIGNED [tech lead] |
| Split oversized files; no 2,000-line append-only files | ✅ | Largest source file is 829 lines (`tests/storage/localStore-contract.test.ts`); largest src file 812 (`src/services/storage/localStore.ts`) — verified 2026-10-25 with `wc -l` | UNASSIGNED |
| Architecture decisions recorded with reasons (`docs/decisions.md`) | ✅ | DEC-001 … DEC-029, continuously updated | UNASSIGNED |
| README: prerequisites, setup, env vars, tests, builds; runnable in under an hour | 🟡 | README covers all required sections (refreshed 2026-10-25); "under an hour" has **never been measured with a new engineer** | UNASSIGNED [tech lead] |
| Regular dependency/framework upgrades; Expo SDK upgrade plan before EOL | 📌 | No upgrade plan document; dependency audit advisory only (§5) | UNASSIGNED [mobile + DevOps] |
| Bus factor above one: two people can build, release, operate | ⛔ | **Zero humans are currently able to build/release** (no named owners; iOS builds require macOS/EAS credentials nobody holds) | UNASSIGNED [tech lead] |
| Release credentials/signing keys only in protected CI secrets; documented recovery | 📌 | No signing credentials exist (placeholder bundle IDs, DEC-014 F-05); `.gitignore` blocks signing artefacts (DEC-014 F-04) | UNASSIGNED [DevOps + mobile release] |

## 16. AI-ASSISTED DEVELOPMENT RULES (apply to the agents themselves)

| Item | Status | Evidence | Owner |
|------|--------|----------|-------|
| Agents never invent APIs, endpoints, schedules, credentials or statuses | ✅ | Standing rule (AGENTS.md rule 1); enforced by the DEC log's UNVERIFIED/UNKNOWN labels and claim-lexicon tests | UNASSIGNED [tech lead] |
| Agents never receive production credentials | ✅ | No production credentials exist | UNASSIGNED [security] |
| Any secret in an agent session is treated as leaked and rotated | ✅ | Policy (AGENTS.md rule 7); no secret has ever appeared (repeated scans clean) | UNASSIGNED [security] |
| Agent-written fixes are reviewed for side effects before merge | 🟡 | Every wave had independent agent review (DEC-014/019/023/025/026); **human review is still owed** (§15) | UNASSIGNED [tech lead] |
| Irreversible actions need explicit human approval | ✅ | Enforced: flag flips require named humans (DEC-004), map SDK decided by the human owner (DEC-012), no deploys/submissions have been made | UNASSIGNED [product] |
| Agents report blockers in `docs/decisions.md` and continue with mock-based work | ✅ | DEC-014 (Docker/CI blockers), DEC-020 (daemon), DEC-024 (server-restart losses), DEC-027 (NOT RUN list) | UNASSIGNED |
| AI-product guardrails (prompt injection, DPA, spend caps, evals) | 📌 | No AI features in the product | UNASSIGNED [product + security] |

## 17. HUMAN ROLES THIS PROJECT STILL NEEDS

**Every role is UNASSIGNED.** Naming owners is itself a launch blocker
(DEC-013 human decision 1).

| Role | Status | Owner |
|------|--------|-------|
| Senior engineer / tech lead | ⛔ | **UNASSIGNED** |
| Backend engineer | ⛔ | **UNASSIGNED** |
| DevOps engineer | ⛔ | **UNASSIGNED** |
| Security / compliance owner | ⛔ | **UNASSIGNED** |
| QA | ⛔ | **UNASSIGNED** |
| Mobile engineer with Apple/Google store experience | ⛔ | **UNASSIGNED** |
| On-call responder and support owner | ⛔ | **UNASSIGNED** |
| Legal counsel (Bulgarian/EU) | ⛔ | **UNASSIGNED** |
| Product owner (BDZ relationship, ticketing go/no-go) | ⛔ | **UNASSIGNED** |

## GO / NO-GO SUMMARY

Per `addbeforerelease.txt`:

**Public release (timetable, stations, map, onboarding, bg/en) — needs sections
1, 5, 6, 7, 8, 9, 10, 12, 14, 15 complete.**

| Section | Roll-up | Blocking gaps |
|---------|---------|---------------|
| 1 Authorization/legal | ⛔ NO-GO | BDZ authorization, ToS + privacy policy, company-owned listings |
| 5 Security | 🟡 | Pen test, security.txt, incident-response plan, security-owner sign-off |
| 6 Privacy/GDPR | ⛔ NO-GO | Privacy notice, lawful basis, DPAs, data residency, children's assessment, legal sign-off |
| 7 App quality | 🟡 | Device performance runs, crash reporting (gated), forced-update mechanism |
| 8 Localization | ⛔ NO-GO | Human translation review (incl. app name), device large-text runs (Settings switch now implemented — DEC-028) |
| 9 Map/stations | 🟡 | Licensed station dataset (DEMO only today) |
| 10 Onboarding/UX | 🟡 | VoiceOver/TalkBack device runs, real-UI screenshots |
| 12 Observability | ⛔ NO-GO | On-call owner, runbooks, status channel, ops tooling |
| 14 Testing | 🟡 | Physical-device testing (Android + iOS) |
| 15 Code health | ⛔ NO-GO | Human code review, protected main, bus factor, signing-key policy |

**Verdict: NO-GO for public release as of 2026-10-25** (code re-verified
2026-11-17, DEC-029). The code half is in good shape (gates green: 810 tests /
66 suites); the human/legal half (authorization, legal review, named owners,
device QA) is entirely open.

**In-app ticket sales — additionally needs sections 3, 4 and written BDZ
authorization.** Status: **NO-GO, correctly disabled** — `ticketSales` flag OFF
with `changeRequiresHumanApproval: true` (DEC-004). This is the intended state,
not a defect.

**Claiming "supports 1,000,000 concurrent users" — only after section 13 passes
in a representative environment.** Status: **load test NOT RUN** (DEC-011). No
such claim is made anywhere in the project and none may be added until the gate
passes and a human signs off.
