# Threat Model — BDZ Train Companion App

**Created:** 2026-10-22 (security-privacy specialist subagent, Phase 0 + Phase 1 review).
**Updated:** 2026-10-24 (same subagent — Wave 3 review: theme/components/app shell,
onboarding, stations + nearby, i18n, mock data layer, settings storage).
**Updated:** 2026-10-24b (same subagent — Phase 3 review: journey search/results/details,
station picker, data-access hooks, deep-link params now READ — see EP-1/EP-2/EP-3/EP-5).
**Updated:** 2026-10-24c (same subagent — Phase 5 review (DEC-024): MapLibre map surface,
favourites/recent-searches persistence, resilience/offline — see EP-2/EP-4/EP-5/EP-6 and
AC-20/AC-21/AC-22; findings in `docs/security-privacy-review-2026-10-24c.md`).
**Status:** DRAFT for human review. No human security owner has reviewed this document
(addbeforerelease.txt §17: "Security / compliance owner" — UNASSIGNED).
**Required by:** addbeforerelease.txt §5 ("Threat model written before launch");
`docs/legal-compliance-matrix.md` row 18.

**Scope of the system today (verified 2026-10-24):** React Native + TypeScript (Expo SDK 58)
mobile client, mock-only data (DEC-002), **no backend** (DEC-003), **no accounts**, **no
ticketing** (flag `ticketSales` OFF, DEC-004), **no analytics** (flag `analytics` OFF; zero
analytics code in the tree), **zero network calls from our code** (re-verified 2026-10-24c:
no `fetch`/`XMLHttpRequest`/`axios`/`WebSocket`/`sendBeacon`/`Linking.openURL` call sites
anywhere in `src/` or `tests/`; the only network activity in the app is the MapLibre
SDK's own tile fetching when the map renders — see EP-6).
The UI now has a real tab shell (`src/app/(tabs)/`), first-launch onboarding, a stations
feature (search over a bundled synthetic demo dataset + nearby-stations flow shell), and
i18n (bg/en) — see the 2026-10-24 updates in EP-1/EP-2/EP-3/EP-6 and §5. Since Phase 3
(2026-10-24b) there is a full journey flow over the same mock data: Zod+react-hook-form
search, results and details screens, a station-picker modal, and a TanStack Query data
layer (`src/hooks/`) — **and three routes now read deep-link parameters** (`/search/results`,
`/search/station-picker`, `/journey/[id]`). **Since Phase 5 (2026-10-24c) two more things
are real:** (a) **travel intent is PERSISTED** — favourites + recent searches in one
AsyncStorage snapshot (`localStore.snapshot`, Zod re-validated on read, caps/TTL, EP-2),
and (b) a **map surface** exists — MapLibre RN against the keyless OpenFreeMap "liberty"
style (DEC-012), which makes the app's **first real network boundary**: when the map
renders, the MapLibre SDK fetches the style and tiles from `tiles.openfreemap.org`
(EP-6). Everything else remains zero-network (re-verified 2026-10-24c: the only `http`
URLs in `src/` are the map style URL and the OSM copyright link inside the attribution
constant; zero `console.*` still). Everything marked
*(future)* below is a design target for a system that does not exist yet; it is modelled
now so the seams built today (provider interfaces, feature flags) can be checked against it.

This is an engineering document, not legal advice and not a penetration-test substitute.

---

## 1. Assets

| ID | Asset | Where it lives today | Sensitivity |
|----|-------|----------------------|-------------|
| A1 | **User travel intent** — recent searches, favourite routes/stations (origin→destination pairs reveal where a person goes) | **PERSISTED since Phase 5:** one AsyncStorage snapshot `localStore.snapshot` (`src/services/storage/localStore.ts`) — favourite routes/stations + recent searches (ids, search echo, optional ≤80-char label, timestamps), Zod re-validated on read, 20 recents / 100 favourites / 90-day TTL, user-deletable. Also in MEMORY: the TanStack Query cache (search inputs + results, `src/hooks/AppDataProvider.tsx`, gc ≤ 30 min) and the single-slot pending-selection store (`src/features/station-picker/selection.ts:27`) | Personal data (GDPR); on-device only; nothing syncs anywhere (DEC-003) |
| A1b | **Local settings** — language choice + onboarding-completed flag | AsyncStorage via `src/services/storage/settingsStorage.ts` (exactly two keys: `settings.language`, `settings.onboardingCompleted` — verified 2026-10-24) | Non-personal / low sensitivity; no identifiers, no timestamps |
| A2 | **User location** (foreground, only for the "nearby stations" feature) | Not collected today: the nearby flow exists (`src/features/stations/model/nearby.ts`) but **no location module is installed** (`expo-location` is not a dependency) and the default `LocationPort` reports `unavailable` (`src/features/stations/StationsScreen.tsx:40-47`) | Sensitive personal data; minimisation rules in plan.md 17.5 |
| A3 | **Information provenance labels** — the guarantee that demo/scheduled/cached-stale/real-time are never conflated | `src/types/provenance.ts`, feature flags | Integrity/trust asset: the app's honesty is a product feature (rule 6) |
| A4 | **Future session tokens** (access/refresh) for accounts | None today; Keychain/Keystore via `expo-secure-store` when built (DEC-001, plan.md 17.2) | Credential |
| A5 | **Future order/ticket data** — order ids, payment *references* (never card data), ticket artefacts | None today (spec only: `src/types/order.ts`, `src/types/ticket.ts`) | Personal + financial metadata |
| A6 | **Developer/CI assets** — Git history, lockfile, future EAS tokens, keystores, provisioning profiles | Repo + (future) GitHub Actions secret storage | Build integrity; release-signing compromise = arbitrary code on user devices |
| A7 | **Map SDK key** (public identifier with quota/cost) | **Does not exist (DEC-012, Phase 5):** MapLibre RN + OpenFreeMap is keyless — there is no key to store, restrict, leak or rotate. If a keyed provider is ever adopted, treat the key as a public identifier restricted by bundle id/package name (`docs/map-sdk-comparison.md` "Key handling") | Abuse/quota + cost, not confidentiality (currently N/A) |
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
   **Live since Wave 3** for the two settings keys only: reads fall back to safe defaults on
   any failure (`settingsStorage.ts:50-57`), values are re-narrowed by callers
   (`catalog.ts:61-65` for the language tag, `OnboardingGate.tsx:36-41` compares `'true'`).
   **Live since Phase 5 (2026-10-24c) for structured records too:** the
   `localStore.snapshot` (favourites + recent searches) is Zod re-validated record-by-record
   on read with per-field reset (`localStore.ts:296-386`) — but that read path is currently
   **untested and its corruption notice is not surfaced in any UI** (review P5-M2), and a
   hostile/deep-link-fed write can throw `LocalStoreInputError` uncaught at the save button
   (P5-M1). Token storage (future) MUST go to SecureStore, never here (checklist §3).
3. **TB3:** App ↔ train-data provider *(future network boundary)* — HTTPS only, Zod-validated
   (DEC-007, Appendix B).
4. **TB4:** App ↔ map SDK / tile provider — **LIVE since Phase 5 (2026-10-24c):** the
   MapLibre RN SDK (third-party native code inside the app) fetches the style and tiles
   from `tiles.openfreemap.org` whenever the map renders (keyless, no account). The tile
   host sees IP, User-Agent and tile coordinates ≈ the viewed area; **no user, station or
   travel-intent data is attached** (markers are local objects). Enumerated in review
   2026-10-24c §3 and `docs/map-sdk-comparison.md` "Data / privacy".
5. **TB5:** App ↔ ticketing backend ↔ payment provider *(future)* — payment truth is
   server-to-server only (DEC-008); the client observes effects via `getOrder`.
6. **TB6:** Developer/agent ↔ repo ↔ CI ↔ npm registry (build chain).

## 4. Entry points and STRIDE

STRIDE = Spoofing, Tampering, Repudiation, Information disclosure, Denial of service,
Elevation of privilege. "Mitigation today" is verified in this repository; "Required action"
is work for the phase named.

### EP-1 — Text search input (station search live since Wave 3; journey search LIVE since Phase 3)

Station search is implemented (`src/features/stations/model/stationSearch.ts` + `normalize.ts`,
UI in `StationsView.tsx`): normalisation is pure string operations (NFD, diacritic strip,
deterministic Cyrillic→Latin transliteration); **no `RegExp` is ever built from user input**
(no ReDoS surface), no I/O, no logging. **Journey search is live since Phase 3
(2026-10-24b):** the form (`src/features/journey-search/`) validates with a Zod schema
(`validation.ts` — required stations, from ≠ to, strict `YYYY-MM-DD` calendar date, not
past, ≤ 90 days ahead, Europe/Sofia); date input is `maxLength={10}`
(`JourneySearchForm.tsx:232`); the station-picker query is bounded at 128 chars
(`StationPickerView.tsx:35,124`) and — **closed in Phase 5 (2026-10-24c)** — the stations
screen input is now bounded too (`SEARCH_QUERY_MAX_LENGTH = 128`,
`StationsView.tsx:37,104`), retiring W3B-L1/W3-L5. Error messages
are i18n keys, never raw input (W3B review §3).

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S | Attacker-supplied station names/times rendered as if provider-authoritative | Provenance on every record (`src/types/provenance.ts`); UI must render labels (DEC-006) | Phase 3/4 tests: provenance label always visible; `demo`-only mock enforced by test (DEC-002) |
| T | Malformed/oversized input reaches a future provider or breaks validation | Types define bounded fields (`src/types/journey.ts:27-40`); Zod boundary specified (DEC-007 App. B) and **implemented** for provider payloads (`src/services/api/parsePayload.ts`); **Phase 3:** the journey form is Zod-validated (see above) and the picker query is length-bounded (128); **Phase 5:** the stations-screen input is bounded too (128 — W3B-L1 closed) | Implement Zod + length/format limits at the boundary in Phase 4; never trust form state alone; length-bound deep-link ids (W3B-M1, EP-3) — the only remaining unbounded input |
| R | Search requests are not user-actionable denials ("something went wrong") | `ProviderError.code` → localised message contract (`src/types/errors.ts:76-78`); `ErrorState` renders only `ERROR_MESSAGE_KEYS[code]`, never raw error text (`src/components/ErrorState.tsx`) | Phase 4 UI mapping test for every code |
| I | Search terms (travel intent) leak into logs/crash reports | No logging exists anywhere in `src/` (verified again 2026-10-24b, incl. the Phase 3 code: zero `console.*` calls) | Ban logging of `JourneySearch`, station text and `GeoPoint` in the logging policy when logging is added (checklist §14 "privacy test") |
| D | Huge result sets / repeated searches exhaust device or future API | `limit` on search (`src/types/journey.ts:39`); retry policy bounded, jittered (`src/services/common/RequestOptions.ts:46-52`) | Future API needs rate limits (checklist §5/§11) |
| E | A search response drives navigation/action without validation | — | Zod parse before mapping; unknown fields never passed to UI (DEC-007 App. B.3) — **implemented** (`parseExternalPayload`, schemas strip unknown fields) |

**Demo dataset note (Wave 3):** the stations list is bundled synthetic data
(`src/features/stations/data/demoStations.ts`) — every name carries a "Демо/Demo" marker and
coordinates are invented. It contains no personal data (review W3-§5). Abuse case: see AC-14.

### EP-2 — Local persistence (settings LIVE since Wave 3; favourites + recent searches LIVE since Phase 5)

**Live since Wave 3:** exactly two keys via `src/services/storage/settingsStorage.ts` —
`settings.language` (bg/en) and `settings.onboardingCompleted` ('true'). **Since Phase 5
(2026-10-24c)** a third key exists: `localStore.snapshot` (`src/services/storage/
localStore.ts`) holding favourite routes/stations + recent searches — one versioned
(`schemaVersion: 1`) JSON snapshot, Zod re-validated record-by-record on read, policy
caps (20 recents / 100 favourites / 90-day TTL) re-applied on read **and** write, dedupe,
user deletion (per item + clear-all behind `ConfirmDialog`). Features still must not touch
AsyncStorage directly (module comment; the hooks go through the injectable `LocalStore`).
Known gaps from review 2026-10-24c: **P5-M2** (the read-side re-validation is untested,
its "visible notice on corruption" is rendered nowhere, and `localStore.ts:41-42` /
`localStoreSchemas.ts:107-108` claim a privacy test that does not exist), **P5-M1**
(uncaught `LocalStoreInputError` on the deep-link-fed "Save this route" path), **P5-L1**
(hostile deep-link ids ≤128 chars can be persisted as favourites with one tap),
**P5-L2** (a hostile snapshot is parsed in full before trimming — transient cost only).

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S/T | Tampered storage on a rooted device injects data or old schema | Re-validation on read mandated (`src/types/favourites.ts:118-123`); versioned `LocalStoreSnapshot`; **today's two keys are re-narrowed on read** — language via `normalizeLocale` allow-list (`catalog.ts:61-65`), onboarding flag via `value === 'true'`; any corruption falls back to safe defaults and never crashes (`settingsStorage.ts:50-57`). **Phase 5 snapshot:** Zod re-validation record-by-record on read, per-field reset, unknown `schemaVersion` replaced, write inputs re-validated (`localStore.ts:296-386`) | **Close P5-M2:** the read path needs corruption tests (nothing seeds corrupt storage today) and the promised key-path allowlist/privacy test; DEC-007 App. B.4's "visible notice on corruption" must be surfaced in the UI or downgraded — `notices` reaches no screen today |
| S | Forcing `settings.onboardingCompleted` skips the guide (or clears it re-shows it) | Impact is cosmetic only — the guide carries no consent or permission (see EP-6-E); replayable at `/onboarding` | None; accept and document |
| S | Snapshot poisoning: hostile deep-link ids (or future free text) are persisted as favourites/recents | Writes are Zod-bounded (ids ≤128, label ≤80, search echo shape only); recents are recorded from the Zod-validated form ONLY; favourites can be written from deep-linked `from`/`to` via "Save this route" (bounded junk, rendered as "unknown" — plain `Text`, no injection) | **P5-L1/P5-M1:** resolve deep-linked ids against the station directory before offering save; length-bound/charset-check route params at the boundary (W3B-M1); catch `LocalStoreInputError` at the save call site |
| R | User cannot remove their travel history | **Since Phase 5:** every saved record is user-deletable (per-item delete + "clear all" behind `ConfirmDialog` — `RecentSearchesSection`/`FavouritesSection`/`SaveRouteControl`); `clearAll` wipes both collections; caps + 90-day TTL bound retention (`localStore.ts:245-294`) | Keep "clear saved items" reachable from Settings too if product asks (plan.md §8); test deletion persists across restart (partially covered in `tests/storage/localStore.test.ts`) |
| I | Stored travel intent readable via backup/other apps | AsyncStorage is app-sandboxed plaintext; snapshot holds ids, date/time echo, optional label and timestamps only — no location, no identifiers, no names (schema-enforced; verified 2026-10-24c). Nothing about it is logged (zero logging in `src/`) | Accept for non-secret data; document in privacy notice (favourites/recents = travel intent, on-device, deletable). Tokens (future) MUST go to SecureStore, never AsyncStorage (checklist §3) |
| D | Corrupt storage crashes the app | Read failures return the fallback (tested in `tests/storage/settingsStorage.test.ts`); write failure is caught in the i18n layer (`runtime.ts:79-82`) and does not revert the in-memory switch; **Phase 5:** snapshot reads never throw (`normalizeStoredSnapshot`), write failures surface as `write_failed` notices | Extend the *tests* to the snapshot read path (P5-M2); cap parse cost for oversized hostile snapshots (P5-L2) |
| E | — | — | — |

### EP-3 — Deep links (`bdztrain://`, future checkout return/cancel URLs)

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S | Rogue app/website invokes `bdztrain://` with crafted parameters (e.g. fake "payment success") | Scheme registered (`app.json:7`). **Since Phase 3 (2026-10-24b) three routes READ parameters** (`/search/results?from=&to=&date=`, `/search/station-picker?field=`, `/journey/[id]`) — DEC-022 §1. Verified handling: `date` is strict-validated (`isValidIsoDate`, `JourneyResultsScreen.tsx:57`), `field` is coerced to a `from`/`to` allow-list (`StationPickerScreen.tsx:29-31`), ids are opaque lookups only (unknown → `not_found`; fixture maps are Zod-parsed on every call). Malformed params render an actionable error state, never a crash (tested `journey-routes.test.tsx:88-93`). **Gap:** `from`/`to`/`id` are non-empty-checked but NOT length/format-bounded (W3B-M1) — and since Phase 5 the results screen also feeds those ids to "Save this route", whose `addFavourite` throws uncaught on out-of-bound ids (**P5-M1**: user-assisted crash via hostile deep link + one tap) | Length-bound + charset-check every deep-link id at the route boundary (review W3B-M1) **and** make the save path total (catch `LocalStoreInputError`) — P5-M1; when ticketing exists: a deep-link return is **never** proof of payment — state re-fetched via `getOrder` (DEC-008 rule 1, `TicketingProvider` note) |
| T | Path/route manipulation to reach flag-gated screens | Route set is fixed (`/`, `/search`, `/map`, `/trips`, `/settings`, `/onboarding`, `/search/results`, `/search/station-picker`, `/journey/[id]`); no flag-gated routes exist yet | Phase 2/6: gated routes unreachable in release builds, tested |
| I | Return URLs leak order ids into the OS/browser history | `returnUrl`/`cancelUrl` are app deep links by spec (`src/services/ticketing/TicketingProvider.ts:360-372`). No param value is logged anywhere (zero `console.*` in `src/`); nothing renders `ProviderError.message`. **Residual:** the mock copies caller/deep-link ids into `error.message` (`MockTrainDataProvider.ts:174,374`) — W3B-L2 | Keep order ids opaque; no PII in URLs ever; make mock error messages static (W3B-L2 / W3-L1) before crash reporting lands |
| D/E | Crafted/oversized params amplify memory (query-key + cache entries) | Query cache is in-memory with bounded `gcTime` (5 min journey / 30 min station); one cache entry per distinct key | Same length bounds as the S row cap the amplification (W3B-M1) |

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
| S | Typosquatted dependency | All 24 direct deps verified to exist and be the intended packages (2026-10-22, incl. the non-obvious `test-renderer`, which is RNTL 14's declared peer dep); **Wave 3 additions re-verified 2026-10-24:** `zod@4.6.7` (MIT, `github.com/colinhacks/zod`) and `@react-native-async-storage/async-storage@2.2.0` (MIT, `github.com/react-native-async-storage/async-storage`) — exact names, official repos, the SDK 58 line (`expo/bundledNativeModules.json` pins 2.2.0). All lockfile entries resolve from `registry.npmjs.org` with integrity hashes. **Phase 3 additions re-verified 2026-10-24b (W3B-I1):** `react-hook-form@7.91.0`, `@hookform/resolvers@5.9.2`, `@tanstack/react-query@5.104.5` — exact names, official repos (`react-hook-form/*`, `TanStack/query`), all MIT; only two new transitives (`@standard-schema/utils@0.3.0`, `@tanstack/query-core@5.104.5`); the `zod` peer dedupes to the patched `4.6.7`. **Phase 5 additions re-verified 2026-10-24c:** `@maplibre/maplibre-react-native@11.5.0` (MIT, `github.com/maplibre/maplibre-react-native`, maintainer `maplibreorg`, `latest` = 11.5.0) + `@types/geojson@7946.0.16` (MIT, DefinitelyTyped, devDependency) — 12 new transitives, all well-known upstream (`@maplibre/maplibre-gl-style-spec@26.2.1` + `tinyqueue`/`quickselect`/`@mapbox/*`/`json-stringify-pretty-compact`, six `@turf/*@7.4.0`; `minimist@1.2.8` dedupes to a pre-existing copy), no install scripts, lockfile unchanged vs HEAD | Keep the per-package typosquat check for every added dependency (checklist §5) |
| T | Lockfile tampering / malicious install scripts | Lockfile committed; npm 11 blocks install scripts by default (`README.md:180-182`); none of the Phase 5 transitives declares `hasInstallScript` (verified 2026-10-24c) | Pin CI actions to commit SHAs when a human owns CI (currently tag refs); review install-script allowlist when one is created |
| R | Nobody can tell what a CI run did | CI runs are UNVERIFIED and honestly labelled (`README.md:18-20`) | Human must observe the first real run; branch protection + required checks (checklist §15) |
| I | Secret in repo/Git history/bundle | Full-history scan found none (see `docs/security-privacy-review-2026-10-22.md` §1); re-run on the Wave 3 tree + all commits 2026-10-24: still none; **re-run 2026-10-24c over the Phase 5 tree + full history: still none**; `.gitignore`/`.dockerignore` cover `.env` + signing material incl. the F-04 additions | Secret-scanning in CI (gitleaks or GitHub secret scanning) before launch |
| D | Compromised/vulnerable package breaks CI or dev machines | `npm audit` job exists (advisory); baseline CHANGED 2026-10-24: **5 findings (all high) from 2 advisories** — `braces` and `sprintf-js` advisories were **withdrawn** upstream (GHSA-vfj7-8cjw-p6xm withdrawn 2026-10-23; GHSA-hp3w-g68c-fv3c withdrawn 2026-10-22); `node-forge` (GHSA-86w9-cpqp-85rv) remains unpatched; **new** `zod` advisory GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404, unbounded-array memory exhaustion) affects `zod <4.6.6` — the app's direct `zod@4.6.7` is **patched**; the vulnerable copy is `@expo/cli`'s nested `zod@3.25.76` (build tooling only, not in the app bundle); **re-checked 2026-10-24b after the Phase 3 dependency additions: identical — 5 high / 0 moderate / 0 critical, 0 new advisories (W3B-I2)**; **re-checked 2026-10-24c after the Phase 5 additions: identical again — 5 high / 0 moderate / 0 critical, 0 new advisories** | Re-baseline the audit gate (review F-02): the counts moved, so an audit-diff gate must re-baseline now; decide with the security owner when `dependency-audit` becomes required |
| E | CI token over-permissioned | Workflow quality jobs use no secrets; **F-03 fixed** — `permissions: contents: read` at workflow level (`.github/workflows/ci.yml:16-17`, verified 2026-10-24) | Release credentials only in protected CI secrets (checklist §15); grant per-job permissions when release jobs arrive |

### EP-6 — Location and map *(nearby flow SHIPPED as a shell 2026-10-23; no location module yet; map surface LIVE since Phase 5 — MapLibre RN + OpenFreeMap, DEC-012)*

**Phase 5 (2026-10-24c): the map is no longer a placeholder-only surface.**
`src/features/stations/map/` renders MapLibre RN against the keyless OpenFreeMap
"liberty" style (`MAP_STYLE_URL`, `StationsMap.tsx:36`) — behind the same
`mapStationDiscovery` UX (list view remains the default and works without anything).
Verified for this review: **no API key exists anywhere** (DEC-012: OpenFreeMap needs
none); the app hardcodes exactly one URL and the style document itself references only
`tiles.openfreemap.org` endpoints (fetched live 2026-10-24c — planet vector tiles,
`natural_earth` raster, fonts, sprites; no third-party host); **no tile caching is
implemented** (the OpenFreeMap limits are documented in `MapAttribution.tsx:14-19` for
any future use); required attribution is rendered verbatim on the map and in the
fallback (`MapAttribution.tsx`); markers are local objects over the bundled DEMO dataset
and there are NO route lines (rule 6). **The map introduces the app's first network
activity** (TB4): when it renders, the SDK fetches style + tiles; the tile host sees
IP/User-Agent/tile coordinates ≈ viewport — enumerated in review 2026-10-24c §3 and
`docs/map-sdk-comparison.md` "Data / privacy". **Nothing else in `src/` makes a network
call** (re-verified 2026-10-24c). Fallback: when the native module is absent (Expo Go,
web, tests) or render fails, a labelled placeholder shows — errors are swallowed with no
logging and the copy is static i18n identical in every environment (no device/native
fingerprinting; verified). Residual: the fallback copy predates DEC-012 (P5-L3) and the
native render is **NOT RUN** here (rules 5/8).

**Verified 2026-10-24 — the four privacy questions for Wave 3 (location half, unchanged):**

1. **No location permission request exists anywhere except the user-initiated nearby flow.**
   No location module is installed (`expo-location` is not in `package.json`); the default
   `LocationPort` is a stub returning `'unavailable'`
   (`src/features/stations/StationsScreen.tsx:40-47`). When a real port is wired, the contract
   (`src/features/stations/types.ts:43-57`) and tests (`tests/stations/nearby-stations.test.tsx`)
   already enforce: permission requested **only** from a tap on the nearby button, **never at
   mount, never on search**, one request per tap (double-tap guarded).
2. **No position is stored or logged.** The raw `GeoPoint` is function-local in
   `runNearbyStationsFlow` (`model/nearby.ts:159-171`), converted to derived distances and
   dropped; `NearbyViewState` has no position field and no history array (state is replaced
   per run, `nearby.ts:53-77`); no persistence module is imported by the model; no
   `console.*` exists in `src/`. A test asserts the raw position never enters state or
   actions (`nearby-stations.test.tsx:248-275`).
3. **No analytics** — flag `analytics` OFF and zero analytics code in the tree (verified).
4. **Zero network calls from our code** — nothing in `src/`/`tests/` opens a socket or URL
   (re-verified 2026-10-24c). The ONLY network activity in the app is the MapLibre SDK's
   own style/tile fetching while the map renders (TB4, EP-6 above) — which cannot carry
   location data because no location module exists and markers are local objects.

| STRIDE | Threat | Mitigation today | Required action |
|--------|--------|------------------|-----------------|
| S | Map line/marker read as an operational route or live service | Rule stated in plan.md 17.5 and checklist §9; **since Phase 5 the live map carries the disclaimer + demo notice ON the map** (`StationsMap.tsx:101-108`), the fallback keeps the same furniture, and copy is claims-tested (`tests/stations/map-copy-claims.test.tsx`) — markers are DEMO data only and there are no route lines | Keep the claims tests green; provenance on station data (rule 6) |
| T | Map SDK or tile cache tampering | The SDK is third-party native code (MapLibre RN, MIT/engine BSD-2, official MapLibre project) loading a **fixed** style URL over HTTPS; style content is operator-controlled (a compromised/hostile style could point elsewhere — accepted residual, mitigated by the list view working without the map); **no tile caching exists to tamper with** | If tile caching is ever added, honour OpenFreeMap's limits (≤3,000 tiles/≤50 MB, ≤4 parallel, unique User-Agent) and treat cached tiles as untrusted render input; self-hosting is the documented fallback (`map-sdk-comparison.md`) |
| I | Location history leaks to logs, crash reporting or the future backend | See the four verified points above | When `expo-location` (or similar) lands: keep the `LocationPort` contract exactly (foreground-only, one-shot); add a privacy test asserting no GeoPoint in logs (checklist §6/§14); never store more than the minimum; document retention |
| I | Tile requests reveal user behaviour to the tile host | Accepted residual (TB4): OpenFreeMap sees IP/User-Agent/tile coordinates ≈ viewport per request; **no user/station/travel-intent data is attached** (markers are local objects; favourites/search state never reaches the SDK); keyless, no account, no identifier | Disclose in the privacy notice ("map tiles are fetched from OpenFreeMap"); consider the self-host option if the residual matters (map-sdk-comparison.md) |
| I | Map SDK key abused for quota/cost | **N/A since DEC-012** — OpenFreeMap is keyless (A7); no key exists to restrict or rotate | If a keyed provider is ever adopted: restrict by bundle id/package name (plan.md 17.5); monitor quota |
| D | Map tiles unusable on low-end devices/offline | The list alternative IS the default (`StationsView` starts in list mode) and the fallback placeholder keeps station discovery fully usable (checklist §9); render errors degrade, never crash (`MapRenderBoundary`) | Map performance on low-end devices still needs a real-device pass (never run here) |
| E | Permission requested coercively at onboarding | Onboarding rules forbid it and the implementation keeps them: no permission/consent code exists in `src/features/onboarding/` (verified 2026-10-24) | Keep checklist §10 "No permission prompts during onboarding" asserted by test (exists: `tests/mobile-ui/onboarding.test.tsx`) |

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

**Map / location (nearby flow live as a shell)**
- AC-11: Location history reconstructed from logs/crash reports. Counter: logging ban on
  `GeoPoint`/location (extend checklist §14 privacy test to assert it); today no logging and
  no crash reporting exist at all.
- AC-12: Covert always-on tracking dressed up as "nearby stations". Counter: foreground-only,
  point-of-use permission (plan.md 17.5), store disclosure; the one-shot contract is enforced
  by `LocationPort` + tests before any real module is wired.
- AC-13: Map-key scraping for quota theft/cost. Counter: platform-restricted key + quotas +
  cost alerts (checklist §11).

**Stations / onboarding / settings (new with Wave 3)**
- AC-14: Third party screenshots *demo* station cards and presents them as a real BDZ station
  directory. Counter: every name carries a "Демо/Demo" marker, every card renders a provenance
  badge + demo notice, and the map area states the SDK is pending (rule 6; tests in
  `tests/stations/` and `tests/mobile-ui/provenance.test.tsx`).
- AC-15: A "helpful" change wires the stations screen to a community GTFS mirror or a scraped
  station list. Counter: DEC-002/DEC-013 prohibit unofficial feeds; `DEMO_STATIONS` is
  bundled and explicitly synthetic (`docs/station-dataset-licensing.md` tracks the licensing
  route); code review must reject any station dataset without a licence record.
- AC-16: Search input abused to burn CPU/battery on a large future directory (pasted
  megabyte-long queries, token floods). Counter: pure linear substring matching today;
  both search inputs are now bounded at 128 chars (picker: `StationPickerView.tsx:35,124`;
  stations screen: `StationsView.tsx:37,104` — W3B-L1/W3-L5 closed 2026-10-24c);
  still owed: a `limit` on results when the licensed directory lands (review W3-L6).
- AC-17: A deep link pre-fills the station search or a journey query with hostile text,
  hoping it is logged or rendered as markup. **Since Phase 3 this is LIVE surface:**
  `/search/results` and `/journey/[id]` take attacker-controlled params. Verified counters:
  no param value is ever logged (zero `console.*` in `src/`), nothing renders
  `ProviderError.message`, RN `Text` renders plain text (no WebView/HTML anywhere in the
  tree), ids are opaque lookups and `date` is strict-validated. Keep it that way and never
  log the query. Residual gaps: length/format bounds on ids (W3B-M1) and static mock error
  messages (W3B-L2).

**Journey flow — deep links and data layer (new with Phase 3)**
- AC-18: A rogue app floods `bdztrain:///search/results?from=<megabytes>` (or thousands of
  distinct `id`s) to amplify memory via TanStack query keys/cache entries or to poison
  future error/crash objects. Counter: in-memory cache with bounded `gcTime` caps the
  window; **fix the length/format bounds at the route boundary (W3B-M1)** and make mock
  error messages static (W3B-L2) before crash reporting exists.
- AC-19: Travel intent (which stations a person searches, when) is reconstructed from
  storage, logs or crash reports. Counter (updated 2026-10-24c — Phase 5 PERSISTS it):
  favourites + recent searches live in one on-device AsyncStorage snapshot with the
  documented fields only (ids, search echo, optional label, timestamps — no location, no
  identifiers), 20/100 caps + 90-day TTL, per-item and bulk deletion behind confirmation;
  the TanStack query cache stays memory-only (gc ≤ 30 min); there is still no logging and
  no crash reporting. When either lands, the logging policy must ban `JourneySearch`,
  station text, `LocalStoreSnapshot` content and param values (checklist §14). Residual:
  plaintext app-sandbox storage (accepted for non-secret data; privacy notice must
  describe it) and P5-L1/M1 below.

**Phase 5 — persistence and map (new with 2026-10-24c)**
- AC-20: **Snapshot poisoning** — a rogue app (or a hostile link) drives
  `bdztrain:///search/results?from=<junk>&to=<junk>&date=<valid>` and the user taps
  "Save this route", persisting attacker-chosen strings into `localStore.snapshot`; or a
  future change lets free text/labels become code-adjacent (log/fingerprint) material.
  Counter: every write is Zod-bounded (ids ≤128, label ≤80, fixed record shapes) and
  re-validated on read with per-field reset (no crash, no execution path); names resolve
  from the station directory so junk renders as "unknown"; recents are recorded from the
  Zod-validated form only. **Gaps to close (review P5-M1/L1):** length/charset bounds at
  the route boundary (W3B-M1), catch `LocalStoreInputError` at the save call site (a
  hostile >128-char id currently throws uncaught in the press handler), prefer saving
  only ids that resolve against the directory, and add the missing corruption/privacy
  tests (P5-M2).
- AC-21: **Favourites spam / cap abuse** — automation or a rogue deep link floods saves
  to bloat storage or bury real items. Counter: identity-idempotent adds (same from/to →
  no duplicate), dedupe for recents, hard caps (20 recents / 100 favourites per
  collection) enforced on write AND read, 90-day TTL on recents, per-item delete +
  clear-all; the snapshot's collections are hard-bounded in the schema
  (`LOCAL_STORE_COLLECTION_MAX_LENGTH = 500`) and trimmed to policy after every
  operation. Residual (P5-L2): a tampered multi-MB snapshot is parsed in full once at
  hydrate before trimming — transient cost only; cap the parse to fix.
- AC-22: **Map tile abuse / scraping** — the app (or a fork) mass-downloads tiles or
  caches them beyond the provider's terms, jeopardising the free public instance (or
  burns quota on a future keyed provider). Counter: **no tile caching is implemented at
  all** (grep-verified); DEC-012/plan.md 17.5 prohibit scraping; the permitted caching
  envelope (≤3,000 tiles / ≤50 MB per download, ≤4 parallel requests, unique
  User-Agent) is documented at the only place a future `OfflineManager` would be wired
  (`MapAttribution.tsx:14-19`); the list view is the default so the map is never load-
  bearing. If a keyed provider is ever adopted, restrict the key by bundle id/package
  name and monitor quota (A7).

## 6. Review and maintenance rules

1. Revisit this model at every phase gate (Phases 2, 4, 6, 8) and whenever DEC-002, DEC-003,
   DEC-004 or DEC-012 change status — each one changes an entry point from *(future)* to real.
2. Every new dependency, SDK, network call or permission adds a row to §4 before it merges.
3. The named human security owner (checklist §17) must review and sign this document before
   public launch (legal-compliance-matrix row 18).
4. Nothing in this document claims a mitigation exists unless it is implemented and tested;
   "specified in DEC-…" is not "mitigated".
