# Security & Privacy Review — Phase 3 (journey flow UI + data-provider hooks + lead i18n merge)

**Reviewer:** security-privacy specialist subagent (independent; did not write the reviewed
code). **Date:** 2026-10-24b. **Predecessors:** `docs/security-privacy-review-2026-10-22.md`
(Phase 0 docs + Phase 1 scaffold), `docs/security-privacy-review-2026-10-24.md` (Wave 3).

**Scope reviewed (Phase 3):** `src/hooks/**` (TanStack Query data layer), `src/features/
{station-picker,journey-search,journey-results,journey-details}/**`, `src/app/search/**`,
`src/app/journey/**`, `src/components/RequestErrorState.tsx` + the `maxLength` addition to
`src/components/TextInput.tsx`, `src/i18n/locales/{bg,en}.json` (the lead's key merge),
`package.json`/`package-lock.json` additions (`react-hook-form@7.91.0`,
`@hookform/resolvers@5.9.2`, `@tanstack/react-query@5.104.5`), the Phase 3 tests, plus a
full-tree secret scan and a fresh `npm audit` against the 2026-10-24 baseline.

Severity scale: **critical** (ship stopper / active compromise) · **high** (exploitable
weakness or serious privacy violation) · **medium** (should fix before the next phase gate) ·
**low** (hygiene/hardening) · **info** (verified facts, no action or watch only).

**No critical or high findings. No secret was found anywhere (§1). Nothing to rotate.**
Findings: **2 medium, 2 low, 5 info.** Neither medium is a security vulnerability in the
strict sense (one is deep-link input hardening, one is a user-visible i18n gap with a
misleading decision-log claim); the privacy posture is unchanged and passing.

---

## 0. Headline answers (task confirmations)

| Question | Answer (verified 2026-10-24b) |
|---|---|
| Deep-link params validated before use? | **Partly.** `/search/results?from=&to=&date=`: `date` is strictly validated (`isValidIsoDate` — `YYYY-MM-DD` + real calendar day, `JourneyResultsScreen.tsx:57`); `from`/`to` are checked non-empty only (`firstParam`, `:31-36`). `/journey/[id]`: `id` non-empty only (`JourneyDetailsScreen.tsx:24-31,45`). `/search/station-picker?field=`: coerced to a `from`/`to` allow-list, anything else degrades to `from` (`StationPickerScreen.tsx:29-31`). No length/format bounds on ids → **W3B-M1**. |
| Malformed input degrades, no crash? | **Yes.** Invalid/missing params render a typed error state (`JourneyResultsScreen.tsx:72-82`; `JourneyDetailsView.tsx` "not found" branch), tested (`tests/mobile-ui/journey-routes.test.tsx:88-93`). Empty journey id keeps the query disabled and shows "not found", never a crash. |
| Any param value logged? | **No.** Zero `console.*`/logger calls in `src/` (grep, whole tree incl. all Phase 3 code). Nothing renders `ProviderError.message` either (code → i18n key only). Residual: the mock copies ids into `error.message` (W3B-L2). |
| Anything persisted from this wave? | **Nothing.** No `AsyncStorage`/`SecureStore`/`setItem`/persistence import anywhere in `src/hooks/`, the four new features, or the new routes (grep). Local storage remains exactly the two settings keys. The pending-selection store is a module-level single-slot variable (`selection.ts:27-28`) — memory only. |
| Query cache in memory only (no TanStack persistence)? | **Yes.** No `persistQueryClient`/`createSyncStoragePersister`/storage adapter exists anywhere in the tree (grep). `createAppQueryClient()` sets only in-memory options (`AppDataProvider.tsx:88-113`); travel intent in the cache dies with the process (already modelled as A1 in the threat model). |
| Search inputs / station picks logged? | **No** (zero logging). The picker echoes the query into the empty-state copy (`stations.no_results`, `StationPickerView.tsx:88`) — bounded at 128 chars, plain RN `Text`, no injection path (W3B-I4). |
| New dependencies the intended packages? | **Yes** — all three verified on npm: `react-hook-form@7.91.0` (MIT, `react-hook-form/react-hook-form`), `@hookform/resolvers@5.9.2` (MIT, `react-hook-form/resolvers`), `@tanstack/react-query@5.104.5` (MIT, `TanStack/query`). |
| `npm audit` vs 2026-10-24 baseline? | **Identical: 5 high / 0 moderate / 0 critical, same 2 advisories** (`node-forge` GHSA-86w9-cpqp-85rv, `zod` GHSA-mrhx-c7xc-m3w5 via `@expo/cli`'s nested `zod@3.25.76`). The three new packages contribute **zero** advisories (§5). |

## 1. Secret scan (rule 7) — RESULT: NO SECRETS FOUND

1. **High-entropy credential patterns** over the working tree (incl. all uncommitted Phase 3
   code and docs) and over **every commit** (`git grep <patterns> $(git rev-list --all)`,
   docs excluded) — AWS AKIA/ASIA, `ghp_/gho_/ghs_/github_pat_`, `sk-*`, `xox*`, JWT
   triplets, `-----BEGIN *PRIVATE KEY-----`, Google `AIza*`, SendGrid `SG.*`, GitLab
   `glpat-*`, Squid `squ_*` → **0 matches**.
2. **Assignment scan** (`(api_key|secret|token|password|credential|private_key) = "value"`)
   over `src/`, `tests/`, `.github/`, config JSON → **0 matches** after filtering prose.
3. **`git remote -v`** → `https://github.com/Kalsito1017/BDJ.git`, no embedded token.
4. New/changed files this wave contain no credential-shaped strings (the only "token" hits
   are the i18n/token vocabulary in comments and `react-hook-form` field names).

**Conclusion:** nothing to rotate. (Standing rule: any secret ever pasted into an agent chat
is treated as leaked by the human owner — addbeforerelease.txt §16.)

## 2. Findings

### W3B-M1 — Deep-link params `from`/`to`/`id` are unbounded and format-unchecked (Medium)

- **Evidence:** `src/features/journey-results/JourneyResultsScreen.tsx:31-36,53-57` —
  `firstParam` accepts any non-empty string; only `date` gets `isValidIsoDate`. The raw id
  goes into `useJourneySearch` → query key (`queryKeys.ts:84-93`) → provider call, and into
  the station-name `Map` lookup. `src/features/journey-details/JourneyDetailsScreen.tsx:24-31,45`
  — `id` goes into `useJourney` → query key → `provider.getJourney(id)`.
- **Why it matters:** these values are attacker-controlled (actor T2 invokes `bdztrain://`;
  threat model EP-3). (a) An arbitrarily long param (multi-MB) is copied into a TanStack
  query key and cached for `gcTime` (5 min journey / 30 min station —
  `AppDataProvider.tsx:76-84`); a burst of distinct ids creates distinct cache entries —
  cheap memory amplification on device. (b) The id flows into `ProviderError.message`
  through the mock (`MockTrainDataProvider.ts:174,374` — see W3B-L2), i.e. untrusted text in
  error objects that a future crash reporter will capture. No crash, no injection (ids are
  opaque lookups only; RN `Text` renders plain text), so this is hardening, not an active
  vulnerability.
- **Fix:** validate at the route boundary before use — a small Zod schema (or equivalent)
  per param: ids `z.string().min(1).max(128)` plus an id charset (e.g.
  `/^[A-Za-z0-9._:-]+$/`); keep `isValidIsoDate` for `date`. Route failures to the existing
  error state. Add tests for oversized/odd params (a 10k-char `from`, `?from[]=a&from[]=b`).
  This is the EP-3 "length-bound deep-link ids" action, now with a concrete deadline: before
  Phase 4 wires a live provider whose cache/errors leave the device.

### W3B-M2 — `journey_results.empty_title` missing from both catalogs; DEC-022's "39 keys / 240 per locale" claim is off by one (Medium — product/i18n integrity, not a security vuln)

- **Evidence:** `src/features/journey-results/translationKeys.ts:40` maps `emptyTitle` →
  `journey_results.empty_title`; the key exists in **neither** `src/i18n/locales/en.json`
  nor `bg.json` (verified: 239 keys per locale, parity OK, `journey_results.empty_title`
  absent from both). `JourneyResultsView.tsx:92` renders `t(JOURNEY_RESULTS_KEYS.emptyTitle)`,
  so the empty-results state — a core flow screen — shows the **raw key string**
  `journey_results.empty_title` as its title in both languages. The gap is masked twice:
  the derived `PENDING_LEAD_MERGE` allow-list in `tests/mobile-ui/i18n-integrity.test.tsx:76-79`
  tolerates unmerged contract keys by design, and `tests/mobile-ui/journey-routes.test.tsx:85`
  asserts `t('journey_results.empty_title')` — which passes because the test's `t` falls
  back to the same raw key. `docs/decisions.md` DEC-022 §4 states "39 journey-flow keys
  merged into both catalogs … 240 keys per locale"; the verified merge is **38 keys /
  239 per locale** (set-diff vs HEAD, 0 removed).
- **Why it matters:** user-visible defect on the "no journeys found" state in both shipped
  languages (checklist §8 "bg + en from release one"), plus an inaccurate entry in the
  decision log — the DEC-022 record is the kind of claim rule 5/DEC governance asks us to
  keep exact. Not a security/privacy issue; reported here because the i18n locale merge is
  in this review's scope and the review must not repeat an unverified count.
- **Fix:** add `journey_results.empty_title` to both catalogs (or point `emptyTitle` at the
  existing `states.empty`); correct DEC-022 §4's counts to 38/239 (or re-run the merge to
  make the claimed numbers true); tighten the i18n integrity test — now that the merge is
  declared done, assert `PENDING_LEAD_MERGE` is **empty**, and make `journey-routes.test.tsx`
  assert the rendered title is NOT `RAW_KEY_PATTERN` so a fallback can never mask a gap
  again.

### W3B-L1 — Stations-screen search input still unbounded (Low — carry-over of W3-L5)

- **Evidence:** `src/features/stations/StationsView.tsx:76-82` binds `query` to the shared
  `TextInput` with no `maxLength` (the Phase 3 picker input is bounded at 128 —
  `StationPickerView.tsx:35,124`, which closes W3-L5 for that input only).
- **Why it matters / fix:** unchanged from review W3-L5 (cost of a pasted multi-MB query
  over a future 10k-station directory; AC-16). `maxLength={64}` on that input; keep the
  result `limit`.

### W3B-L2 — W3-L1 elevated: deep-link-controlled ids embedded in mock `ProviderError.message` (Low)

- **Evidence:** `src/services/train-data/MockTrainDataProvider.ts:159,174,255,269,374`
  (`journey '<id>'`, `station '<id>'`). Previously caller-supplied only; since Phase 3 the
  caller can be a hostile deep link (`/journey/[id]`, `/search/results?from=&to=` →
  `buildSearchResult` id validation at `:370-376`).
- **Why it matters:** still latent — nothing renders or logs `message` today (UI maps `code`
  only) — but this violates the module's own no-payload-values contract
  (`providerErrors.ts:10-13`) and becomes a real leak the moment crash reporting lands
  (checklist §7/§14). Fix as recommended in review W3-L1: static messages
  (`'Mock provider: entity not found.'`), optionally a bounded non-reversible hint in
  `diagnostics`. Do it together with W3B-M1.

### Info (verified facts / watch items)

- **W3B-I1 — Dependency additions are the intended, maintained, MIT packages (pass).**
  `npm view` 2026-10-24b: `react-hook-form@7.91.0` (MIT, `github.com/react-hook-form/react-hook-form`),
  `@hookform/resolvers@5.9.2` (MIT, `github.com/react-hook-form/resolvers`), `@tanstack/
  react-query@5.104.5` (MIT, `github.com/TanStack/query`). All three are the well-known
  upstream packages named in DEC-009's candidate table — no typosquat indicators. The
  DEC-022 §3 rejection story checks out: `@hookform/resolvers@5.9.2` declares every
  validator peer (incl. `effect ^3.10.3`) as `peerDependenciesMeta.optional`, so no forced
  installs; its only hard dependency is `@standard-schema/utils@^0.3.0`.
  Transitive surprise check (`npm ls`): exactly **two** new transitive packages —
  `@standard-schema/utils@0.3.0` (under resolvers) and `@tanstack/query-core@5.104.5`
  (the sibling core of react-query); `react-hook-form` peer dedupes to the direct 7.91.0
  and the `zod` peer dedupes to the direct, **patched** `zod@4.6.7`. No install scripts
  invoked (npm 11 default), lockfile committed with registry integrity hashes.
- **W3B-I2 — `npm audit` baseline unchanged (decision item, see §5).** 5 high / 0 moderate /
  0 critical — byte-identical to the 2026-10-24 baseline; the Phase 3 packages add no
  advisories. `npm audit fix --force` remains forbidden (offers `expo@54.0.38`, outside the
  SDK 58 line). Audit-gate re-baselining is still an open human decision (W3-I1).
- **W3B-I3 — Privacy posture unchanged (pass).** Zero network calls in `src/`/`tests/`
  (`fetch`/XHR/`axios`/`WebSocket`/`EventSource`/`sendBeacon`/`NetInfo`/`Linking.openURL`
  → 0 call sites); zero `console.*` in `src/`; no identifiers collected; nothing persisted
  beyond `settings.language` + `settings.onboardingCompleted`; TanStack Query persistence
  **not** enabled (no persister anywhere); travel intent exists only in the in-memory query
  cache (gc ≤ 30 min) and the single-slot selection store — both die with the process.
  Threat-model EP rows re-checked and updated (2026-10-24b section).
- **W3B-I4 — Query echo in picker empty state is safe.** `stations.no_results`
  ("No results for “{query}”") interpolates user input (`StationPickerView.tsx:88`) — but
  bounded at 128 chars, replaced via a function replacer (no `$`-pattern expansion),
  `interpolate` guards params with `hasOwnProperty` (`catalog.ts:76-81`), and rendering is
  plain RN `Text` (no WebView/HTML renderer in the tree). No injection path.
- **W3B-I5 — `/search/results` deep link bypasses the form's date window.** The form
  enforces "not past, ≤ 90 days ahead" (`validation.ts`), but a deep link only needs
  `isValidIsoDate` (`JourneyResultsScreen.tsx:57`), so past/far-future dates reach the
  provider. Harmless with the mock (empty result state) and desirable as a "share any
  search" affordance, but note the inconsistency so a future live provider treats the date
  as untrusted input (it already must — T4). No action required now.

## 3. Deep-link / param surface and input handling (tasks 1–2)

- **Route-param flow (verified end to end):**
  - `/search/results?from=&to=&date=` → `firstParam` (array-safe: repeated params take the
    first value) → `date` strict-validated; `from`/`to` non-empty only (W3B-M1) →
    `normalizeJourneySearch` (`queryKeys.ts:53-70`) trims and re-checks completeness →
    `enabled` gate means **no provider call** for incomplete input. Unknown station ids are
    rejected `not_found` by the mock's input validation (`MockTrainDataProvider.ts:370-376`)
    — no lookup injection; fixture maps are id-keyed and Zod-parsed on every call.
  - `/journey/[id]` → opaque id, never parsed (DEC-006); unknown → `not_found` error state.
    A provider without `getJourney` surfaces `unsupported` (`useJourney.ts:68-73`) and the
    UI falls back — no invented data.
  - `/search/station-picker?field=` → allow-list coercion (`toStationField`,
    `StationPickerScreen.tsx:29-31`); hostile/unknown values degrade to `from` — no crash,
    no free-form value reaches logic.
- **Malformed input:** tested (`journey-routes.test.tsx:88-93` "handles broken results
  params without crashing"); the error state is the generic `RequestErrorState`, which
  extracts `code` defensively and renders only `ERROR_MESSAGE_KEYS[code]` — a malformed
  error object itself cannot crash it (`RequestErrorState.tsx:35-47`).
- **Injection surface:** none found. Ids are used only as Map/object lookups and query-key
  material; date strings are format-checked before use; search text goes through
  `String.includes`-style matching (no `RegExp` built from input anywhere in the tree);
  i18n interpolation is placeholder-replace + RN `Text`; no WebView, no HTML/Markdown
  renderer, no `eval`/`Function`. Error messages rendered to users are always i18n keys.
- **Logging:** none — so nothing about a search, a station pick or a deep-link param can
  reach a log today. When a logger lands, the logging policy must ban `JourneySearch`,
  station text, param values and `GeoPoint` (checklist §14) — unchanged requirement.
- **Bounds:** date input `maxLength={10}` (`JourneySearchForm.tsx:232`); picker query
  `maxLength={128}` (`StationPickerView.tsx:35,124`); date schema strict; **missing:** id
  length/format bounds (W3B-M1) and the stations-screen input bound (W3B-L1).
- **Persistence:** none from this wave — form state (react-hook-form), the picker query
  (`useState`), and the pending selection (module variable) are all in-memory and dropped
  on unmount/process death. Favourites/recent searches remain Phase 5.

## 4. Privacy posture update (task 4)

Re-verified on the Phase 3 tree (command log §6): **zero network calls** in `src/`/`tests/`
and **zero `console.*`** in `src/`; **no identifiers** (device id, ad id, account, contact)
exist anywhere in the new code — the only personal-ish data is travel intent (search input,
station picks) which lives exclusively in memory (query cache + selection store); **no
persistence** beyond the two settings keys; **no analytics** (flag OFF, no code); **no new
permissions** (the picker requests nothing; no location module). Data-minimization and
purpose-limitation hold: nothing is collected that the search feature does not need
in-memory while it runs. Threat-model EP rows updated for the new entry points (§ below);
EP-1/EP-2/EP-3/EP-5 amended, AC-16/AC-17 rewritten and AC-18/AC-19 added.

## 5. Dependency verification and audit comparison (task 3)

**Package checks (`npm view`, 2026-10-24b):**

| Package | Exists / intended | License | Repository | Maintenance signal |
|---|---|---|---|---|
| `react-hook-form@7.91.0` | ✅ the DEC-009 candidate package | MIT | `github.com/react-hook-form/react-hook-form` | actively published upstream |
| `@hookform/resolvers@5.9.2` | ✅ official companion of the above (DEC-022 §3 chose 5.9.2 after rejecting 6.0.0's `effect@4` peer conflict — confirmed: all validator peers incl. `effect ^3.10.3` are `peerDependenciesMeta.optional`) | MIT | `github.com/react-hook-form/resolvers` | actively published upstream |
| `@tanstack/react-query@5.104.5` | ✅ the DEC-009 candidate package | MIT | `github.com/TanStack/query` | actively published upstream |

**Transitive surprise check (`npm ls`):** `@hookform/resolvers@5.9.2 →
@standard-schema/utils@0.3.0` and `@tanstack/react-query@5.104.5 →
@tanstack/query-core@5.104.5` are the ONLY new transitive packages. `react-hook-form`
(peer of resolvers) and `zod` (optional peer) both dedupe to the existing direct deps;
`zod` resolves to `4.6.7` (patched for GHSA-mrhx-c7xc-m3w5).

**`npm audit` comparison:**

| Advisory / package | 2026-10-24 baseline | 2026-10-24b (after Phase 3 additions) |
|---|---|---|
| `node-forge` GHSA-86w9-cpqp-85rv | ACTIVE, unpatched — `node-forge@1.4.0` via `expo → @expo/cli → @expo/code-signing-certificates` (tooling only) | **unchanged** |
| `zod` GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404) | ACTIVE — affects `zod <4.6.6`; direct `zod@4.6.7` patched; vulnerable copy `@expo/cli`'s nested `zod@3.25.76` (tooling only) | **unchanged** — and the resolvers' `zod` peer dedupes to the patched `4.6.7` (`npm ls zod` verified) |
| `braces` GHSA-vfj7-8cjw-p6xm | withdrawn upstream 2026-10-23 (absent from audit) | absent |
| `sprintf-js` GHSA-hp3w-g68c-fv3c | withdrawn upstream 2026-10-22 (absent from audit) | absent |
| **Totals** (`npm audit --json` metadata) | **5 high / 0 moderate / 0 critical** | **5 high / 0 moderate / 0 critical — identical** |
| New advisories from `react-hook-form` / `@hookform/resolvers` / `@tanstack/react-query` | — | **none (0)** |

Consequences: the W3-I1/F-02 audit-gate decision stands unchanged and still needs a human
owner; `npm audit fix --force` remains forbidden (it offers `expo@54.0.38`).

## 6. Command log (real output, 2026-10-24b)

| Command | Result |
|---|---|
| secret-pattern scan, working tree (`src/`, `tests/`, `docs/`, `.github/`, config) | 0 matches |
| `git grep <patterns> $(git rev-list --all)` (docs excluded) | 0 matches (exit 1) |
| assignment scan `(api_key\|secret\|token\|password\|credential\|private_key)="…"` | 0 matches after prose filtering |
| `git remote -v` | no token in URL |
| grep: `console\.` in `src/` | **0** |
| grep: `fetch(\|XMLHttpRequest\|WebSocket\|EventSource\|sendBeacon\|axios\|NetInfo\|Linking.openURL\|persistQueryClient\|createSyncStoragePersister` in `src/` | **0 call sites** |
| grep: `setItem\|getItem\|SecureStore\|MMKV\|localStorage\|AsyncStorage` in the Phase 3 code (`src/hooks`, 4 features, new routes) | **0** (only `src/services/storage/settingsStorage.ts` touches AsyncStorage) |
| key counts: `python3 json` over both locale catalogs | 239 en / 239 bg, parity true; set-diff vs HEAD = **38 new, 0 removed** (DEC-022 says 39/240) |
| referenced-key check (all `t('…')` + contract files vs catalogs) | **1 missing:** `journey_results.empty_title` in both locales (W3B-M2) |
| `npm view react-hook-form@7.91.0 name version license repository.url` | 7.91.0, MIT, `github.com/react-hook-form/react-hook-form` |
| `npm view @hookform/resolvers@5.9.2 name version license repository.url peerDependencies peerDependenciesMeta dependencies` | 5.9.2, MIT, `github.com/react-hook-form/resolvers`; all validator peers optional; deps = `@standard-schema/utils ^0.3.0` |
| `npm view @tanstack/react-query@5.104.5 name version license repository.url dependencies` | 5.104.5, MIT, `github.com/TanStack/query`; deps = `@tanstack/query-core 5.104.5` |
| `npm ls --depth=1 …` / `npm ls @tanstack/query-core @standard-schema/utils` | exactly 2 new transitives (`@standard-schema/utils@0.3.0`, `@tanstack/query-core@5.104.5`); RHF + zod deduped to direct deps |
| `npm ls zod` | direct `zod@4.6.7` (patched); nested `@expo/cli` copy unchanged |
| `npm audit --audit-level=high` / `--json` | exit 1; **5 high / 0 moderate / 0 critical** — identical to baseline; advisories: GHSA-86w9-cpqp-85rv (node-forge), GHSA-mrhx-c7xc-m3w5 (zod <4.6.6 via `@expo/cli`) |
| `npm run typecheck` | **PASS** (exit 0) |
| `npm run lint` | **PASS** (exit 0) |
| `npm test` | **PASS — 588 tests / 46 suites, 0 failures** (up from 389/31 at Wave 3; RNTL `findBy*` timeout-option deprecation warnings only) |
| `npm audit fix` | **NOT RUN** (forbidden by the brief and F-02) |
| `npm ci` | **NOT RUN** in this session (docs-only change; `node_modules` matches the committed lockfile as installed by the lead — recommend the lead runs `npm ci` with the next real code change) |

## 7. Open items owned by humans (not agents)

1. Assign the security/compliance owner (checklist §17) — this review and the threat model
   (updated 2026-10-24b) need sign-off together with the 2026-10-22/2026-10-24 reviews.
2. Dependency-audit gate (W3-I1, unchanged): re-baseline the audit diff on the stable
   5-high/2-advisory baseline; track `@expo/cli`'s nested `zod@3.25.76` and `node-forge`.
3. Approve the W3-M1 schema-bound policy **and** the W3B-M1 deep-link param bounds before
   Phase 4 wires a live boundary.
4. Fix the W3B-M2 i18n gap + correct DEC-022 §4's key counts (or re-run the merge).
5. MSTG-RESILIENCE decision (root/tamper detection) at launch — still open.
6. Legal items unchanged (privacy policy, store labels, consent design, BDZ authorization).
