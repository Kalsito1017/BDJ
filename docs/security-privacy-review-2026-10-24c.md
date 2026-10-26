# Security & Privacy Review — Phase 5 (map integration, local persistence, favourites/recent, resilience)

**Reviewer:** security-privacy specialist subagent (independent; did not write the reviewed
code). **Date:** 2026-10-24c. **Predecessors:** `docs/security-privacy-review-2026-10-22.md`
(Phase 0 docs + Phase 1 scaffold), `docs/security-privacy-review-2026-10-24.md` (Wave 3),
`docs/security-privacy-review-2026-10-24b.md` (Phase 3).

**Scope reviewed (Phase 5, per DEC-024):** `src/features/stations/map/**`
(MapLibre RN wrapper, `MapAttribution`, `loadMapLibre`, `StationsMapSurface` fallback),
`src/services/storage/{localStore,localStoreSchemas}.ts`, `src/hooks/{useFavouriteRoutes,
useRecentSearches,useNetworkStatus.tsx,localStoreContext.tsx}`, `src/services/network/
networkStatus.ts`, `src/features/favourites/**`, persistence-related screen wiring
(`JourneySearchScreen`, `JourneyResultsScreen`, `JourneyDetailsScreen` "Save route"),
`src/components/OfflineBanner.tsx`, the dependency additions
(`@maplibre/maplibre-react-native@11.5.0`, `@types/geojson@7946.0.16`) and the Phase 5
tests — plus a full-tree + full-history secret scan and a fresh `npm audit` against the
2026-10-24 baseline.

Severity scale: **critical** (ship stopper / active compromise) · **high** (exploitable
weakness or serious privacy violation) · **medium** (should fix before the next phase gate)
· **low** (hygiene/hardening) · **info** (verified facts, no action or watch only).

**No critical or high findings. No secret was found anywhere (§1). Nothing to rotate.**
Findings: **2 medium, 3 low, 7 info** (plus one carry-over closure: W3B-L1, P5-I7). The
privacy posture of what is *stored* passes
(data minimisation, caps/TTL, deletion, no logging); the two mediums are (a) an uncaught
write-validation throw on a deep-link-fed save path and (b) the read-side trust boundary
being untested with a "visible notice" requirement that nothing surfaces — both also
undermined by module comments claiming tests that do not exist.

---

## 0. Headline answers (task confirmations)

| Question | Answer (verified 2026-10-24c) |
|---|---|
| Map API key anywhere? | **No — none exists.** OpenFreeMap needs no key (DEC-012). `grep` over `src/`: the only URLs are the style URL (`StationsMap.tsx:36`) and the OSM copyright link inside the attribution constant (`MapAttribution.tsx:33`). No `EXPO_PUBLIC_*`, no key material. |
| Map fetches only documented OpenFreeMap endpoints? | **Yes.** App code hardcodes exactly one URL: `https://tiles.openfreemap.org/styles/liberty`. I fetched that style live (2026-10-24c): every endpoint it references is `https://tiles.openfreemap.org/...` (planet vector tiles, `natural_earth/ne2sr` raster tiles, `fonts/…` glyphs, `sprites/ofm_f384/ofm` sprites) — no third-party host (§3). |
| Tile caching implemented? | **No.** No `OfflineManager`/offline-pack/caching code exists (`MapAttribution.tsx:14-19` documents the OpenFreeMap limits for any future use; DEC-012). |
| Attribution documented + rendered? | **Yes.** Both DEC-012 lines rendered verbatim on the map and in the fallback (`MapAttribution.tsx:28-33`; `map.attribution_label` as the a11y label); wording asserted by `tests/stations/map-copy-claims.test.tsx:76-92`. |
| Station/user data leave the device with map rendering? | **No.** Markers are local RN views fed from the bundled demo dataset (`StationsMap.tsx:82-99`); nothing about stations, favourites or the user is attached to any request. The only network is style/tile fetching, which reveals IP + User-Agent + viewed tile coordinates (documented in `docs/map-sdk-comparison.md` "Data / privacy"). |
| Fallback leaks native-module absence into user-visible errors? | **No.** `loadMapLibre` swallows all failures (`loadMapLibre.ts:46-68`), the render boundary's `componentDidCatch` is deliberately empty (`StationsMapSurface.tsx:49-53` — no logging), and the placeholder copy is static i18n text identical in every environment (verified in both catalogs) — no platform, device or module name is ever rendered. Residual: the copy is *stale* (P5-L3). |
| Persistence data minimisation? | **Pass.** Exactly the documented `src/types/favourites.ts` fields are serialisable (ids, station ids, search echo from/to/date/time/limit, optional label, `createdAt`/`searchedAt`/`sortOrder`/`resultCount`, `schemaVersion`, `policy`) — no location, no names of people, no identifiers. Confirmed against the schemas (`localStoreSchemas.ts`) and the only writer (`localStore.ts`). |
| Zod re-validation on read; malformed snapshots safe? | **Yes in code, NO in tests.** `normalizeStoredSnapshot` + `parseRecords` drop/reset corrupt fields via `safeParse`, never throw, never execute anything (`localStore.ts:296-386`). But **no test seeds a corrupt snapshot** and the "visible notice" requirement is unsurfaced — **P5-M2**. |
| TTL/caps actually enforced? | **Yes** — 20 recents / 100 favourites / 90-day TTL applied on write **and** re-applied on read (`enforceSnapshotPolicy`, `localStore.ts:245-294`), tested (`tests/storage/localStore.test.ts:155-243`). Unbounded growth is not possible; a hostile oversized snapshot is transiently parsed in full first (P5-L2). |
| Any stored content logged? | **No.** Zero `console.*`/logger calls in `src/` (grep); `LocalStoreInputError` carries schema paths only, never values (`localStore.ts:113-123`, tested `localStore.test.ts:276-301`). |
| Snapshot poisoned via deep links / search input? | **Partly possible (assisted) and bounded** — see P5-M1 / P5-L1. Search input never reaches storage (only form-validated `JourneySearch` echoes are recorded); deep-link `from`/`to` can reach `addFavourite` via "Save this route" on results. |
| `label` bounds/charset? | Bounded `≤ 80` (`LOCAL_STORE_LABEL_MAX_LENGTH`, schema-enforced on write and read). **No charset restriction — deliberate** (checklist §2: apostrophes/Cyrillic/emoji must survive in storage) and safe: it renders only in plain RN `Text`. No UI writes a label today (`SaveRouteControl` passes none). |
| Dependencies the intended packages? | **Yes** — `@maplibre/maplibre-react-native@11.5.0` (MIT, `github.com/maplibre/maplibre-react-native`, npm maintainer `maplibreorg`, latest = 11.5.0, last publish 2026-10-04) and `@types/geojson@7946.0.16` (MIT, DefinitelyTyped, devDependency — types only). Full new-transitive list in §5. |
| `npm audit` vs 2026-10-24 baseline? | **Identical: 5 high / 0 moderate / 0 critical, same 2 advisories** (`node-forge` GHSA-86w9-cpqp-85rv; `zod` GHSA-mrhx-c7xc-m3w5 via `@expo/cli`'s nested `zod@3.25.76`). The map wave adds **zero** advisories. No `npm audit fix` run. |
| Zero automatic network calls in `src/` besides map tiles? | **Yes.** No `fetch`/XHR/`axios`/`WebSocket`/`EventSource`/`sendBeacon`/`NetInfo`/`Linking.openURL` call sites anywhere in `src/` or `tests/` (the only `NetInfo` occurrence is a doc-comment integration snippet in `networkStatus.ts:40-49`). `useNetworkStatus`'s port is pure in-memory state (§4). |

## 1. Secret scan (rule 7) — RESULT: NO SECRETS FOUND

1. **High-entropy credential patterns** (AWS AKIA/ASIA, `ghp_/gho_/ghs_/github_pat_`,
   `sk-*`, `xox*`, JWT triplets, `-----BEGIN *PRIVATE KEY-----`, Google `AIza*`, SendGrid
   `SG.*`, GitLab `glpat-*`, Squid `squ_*`) over the working tree (incl. all uncommitted
   Phase 5 code and docs) → **0 matches** (exit 1).
2. **Assignment scan** (`(api_key|secret|token|password|credential|private_key) = "value"`)
   over `src/`, `tests/`, `.github/` → **0 matches** (exit 1).
3. **Full-history scan** (`git grep <patterns> $(git rev-list --all)`, docs excluded) →
   **0 files matched**.
4. **`git remote -v`** → `https://github.com/Kalsito1017/BDJ.git`, no embedded token.
5. The map wave introduces no key material by design (DEC-012: OpenFreeMap needs no key).

**Conclusion:** nothing to rotate.

## 2. Findings

### P5-M1 — Deep-linked `from`/`to` reach `addFavourite`; its write-validation throw is uncaught in the press handler (Medium)

- **Evidence:** `src/features/journey-results/JourneyResultsScreen.tsx:59-72,121-125` —
  deep-link params go through `journeySearchFromRouteParams`
  (`src/features/journey-search/validation.ts:40-54`), which checks non-empty, `from ≠ to`
  and the date window but **no length/format bound on the ids** (the still-open W3B-M1).
  The result screen then feeds those ids to `SaveRouteControl`, whose save handler calls
  `addFavourite` **without any try/catch** (`src/features/favourites/SaveRouteControl.tsx:77-83`).
  `addFavouriteRoute` validates with `FavouriteRouteInputSchema` (ids `min(1).max(128)`,
  `localStoreSchemas.ts:36,94-98`) and **throws `LocalStoreInputError` on failure**
  (`localStore.ts:527`).
- **Why it matters:** an attacker (T2) sends
  `bdztrain:///search/results?from=<10k chars>&to=x&date=<valid>`; the results screen
  renders normally (the mock answers `not_found` for unknown ids), and one tap on "Save
  this route" throws inside a React Native press handler — an unhandled exception at the
  event boundary (redbox in dev; fatal/unhandled in release builds). That is a
  user-assisted crash (availability) triggered by a hostile deep link, and it violates the
  project rule that malformed input "degrades, never crashes" (EP-3). The snapshot itself
  is protected (the throw happens *because* the input is rejected), so this is robustness
  + DoS, not data corruption.
- **Fix:** (a) implement W3B-M1 properly — length-bound + charset-check `from`/`to`/`id`
  at the route boundary (e.g. `z.string().min(1).max(128)` + `/^[A-Za-z0-9._:-]+$/`) so
  `journeySearchFromRouteParams` returns `null` for hostile ids; **and** (b) make the save
  path total: catch `LocalStoreInputError` in `SaveRouteControl` (and any future caller of
  `addFavourite*`/`recordSearch`) and render the existing "could not save" style state.
  Add a regression test that a 10k-char `from` deep link + save tap does not throw.

### P5-M2 — The read-side trust boundary is untested and its "visible notice" is never shown; module comments claim tests that do not exist (Medium)

- **Evidence:**
  - `src/services/storage/localStore.ts:41-42` ("A key-path allowlist test in
    tests/storage enforces this") and `localStoreSchemas.ts:107-108` ("asserted over by
    the privacy test (tests/storage)") — **no such test exists.** `tests/storage/` contains
    only `localStore.test.ts` and `settingsStorage.test.ts`; nothing asserts the persisted
    key set, and no test anywhere seeds corrupt storage (`initialRaw` is used **zero**
    times; `normalizeStoredSnapshot`'s notice reasons `malformed_snapshot`,
    `unsupported_schema_version`, `invalid_collection`, `invalid_record`, `invalid_policy`
    appear in no test).
  - DEC-007 Appendix B.4 requires "per-field reset **with a visible notice** on
    corruption"; the per-field reset is implemented (`localStore.ts:296-386`) but nothing
    renders `LocalStoreNotice`: `notices` is consumed only by the hooks' return contract
    (`useFavouriteRoutes.ts:66`, `useRecentSearches.ts:70`) — **zero references in
    `src/features/`, `src/app/` or `src/components/`** (grep) and no i18n key exists for a
    corruption notice (catalog grep).
- **Why it matters:** the one trust boundary Phase 5 actually opened (TB2 for structured
  records) has its mitigation *implemented but unverified*, and the threat model forbids
  claiming mitigation without tests (§6 rule 4). A regression in `parseRecords` (e.g. a
  future change throwing on bad input) would ship unnoticed. The missing user-visible
  notice also means silently dropped data ("my favourites disappeared") is
  indistinguishable from a bug.
- **Fix:** (1) add read-path tests with `initialRaw` seeds: malformed JSON, non-object,
  wrong `schemaVersion`, non-array collection, corrupt single record, corrupt policy,
  oversized collection — assert per-field reset, surviving valid records, the exact notice
  reasons and no throw; (2) add the promised key-path allowlist/privacy test
  (`dump()` exists for exactly this — `localStore.ts:685-688`); (3) either surface
  `notices` in the saved-items UI (new i18n key, both locales) or explicitly downgrade the
  Appendix B.4 "visible notice" claim in DEC-007/the threat model; (4) correct the two
  module comments. Do all four together — the comments currently assert a test regime
  that does not exist (rule 5).

### P5-L1 — Assisted snapshot poisoning: hostile deep-link ids can be persisted as favourites; `label` has no charset bound (Low)

- **Evidence:** with P5-M1's bounds absent, `from`/`to` of **≤ 128 arbitrary characters**
  pass `journeySearchFromRouteParams` and are written into `localStore.snapshot` as a
  `FavouriteRoute` on a single "Save this route" tap (`JourneyResultsScreen.tsx:121-125` →
  `localStore.ts:540-552`). `LocalLabelSchema` (`localStoreSchemas.ts:38`) bounds length
  only, no charset — deliberate and documented (checklist §2 charset/i18n requirement).
- **Why it matters:** attacker-chosen strings can be made to persist in app storage with
  one user tap (junk favourites; later displayed as "unknown → unknown" since names
  resolve from the directory, `JourneySearchScreen.tsx:83-86`). No injection path exists:
  values render only in plain RN `Text`, ids are Map/object lookups, and nothing echoes
  them into errors or logs. With P5-M1's route-boundary bounds this becomes negligible.
- **Fix:** prefer ids that resolve against the loaded station directory before offering
  "Save this route" for deep-linked searches (mock already rejects unknown ids with
  `not_found`, so the control could simply not render in that state); keep the schema
  bounds as they are (charset-free labels are required).

### P5-L2 — Corrupt snapshots are parsed in full before trimming (transient cost only) (Low)

- **Evidence:** `parseRecords` (`localStore.ts:296-318`) iterates and `safeParse`s **every**
  array element with no per-collection cap; `LOCAL_STORE_COLLECTION_MAX_LENGTH = 500`
  (`localStoreSchemas.ts:34`) is attached only to `LocalStoreSnapshotSchema`, which the
  read path never invokes (it validates record-by-record). Final state is bounded by
  `enforceSnapshotPolicy` (20 recents / 100 favourites per collection) so nothing grows
  unboundedly — but a multi-MB hostile snapshot is `JSON.parse`d and fully validated first.
- **Why it matters:** one-off CPU/allocation spike at hydrate on a rooted/compromised
  device (T2) — transient, no crash, no persistence. Hardening only.
- **Fix:** `value.slice(0, LOCAL_STORE_COLLECTION_MAX_LENGTH)` (or an equivalent bound) at
  the top of `parseRecords`, and/or run `LocalStoreSnapshotSchema` as a cheap pre-shape
  check. Cover it in the P5-M2 corrupt-snapshot tests.

### P5-L3 — Fallback map copy is stale after DEC-012 (accuracy debt, not a leak) (Low)

- **Evidence:** `map.pending.body` (en/bg catalogs) says the interactive map "is waiting
  for a human decision on the map SDK (DEC-012)" — DEC-012 was **decided** 2026-10-24
  (MapLibre RN + OpenFreeMap). `map.attribution.note` still says attribution "will appear
  here when the map SDK is added". `MapPlaceholder.tsx:14-17` documents that updated
  wording was "proposed … in the map-wave report" — that report was lost in the DEC-024
  server restart, so the copy never landed.
- **Why it matters:** rule-6-adjacent product honesty (the fallback should say "not
  available in **this build**", e.g. Expo Go, and point at the list — not at a decision
  that already happened). Verified it is **not** a fingerprinting/privacy issue: the copy
  is static, identical in every environment, and the fallback path logs and renders
  nothing device-specific (§3).
- **Fix:** catalog owner updates `map.pending.*` and `map.attribution.note` in both
  locales; add the wording to the map-copy claims test.

### Info (verified facts / watch items)

- **P5-I1 — Map surface passes (task 1).** No key anywhere (grep + no env reads). Single
  hardcoded style URL `https://tiles.openfreemap.org/styles/liberty`
  (`StationsMap.tsx:36`); I fetched the style live (2026-10-24c) and every endpoint it
  references is on `tiles.openfreemap.org` (planet vector tiles + TileJSON,
  `natural_earth/ne2sr/{z}/{x}/{y}.png`, `fonts/{fontstack}/{range}.pbf`,
  `sprites/ofm_f384/ofm`) — no third-party host can be reached through the style. No tile
  caching code exists (grep: no `OfflineManager`/offline-pack). Attribution strings match
  DEC-012 verbatim and are tested (`map-copy-claims.test.tsx:76-92`). Markers are local RN
  views over the bundled demo dataset; no line/GeoJSON layer exists (rule 6). The fallback
  (`loadMapLibre.ts:46-68`, `StationsMapSurface.tsx:39-58`) swallows module-absence and
  render errors silently, with explicit "no logging" intent, and is tested
  (`tests/stations/map-libre-{available,unavailable}.test.tsx`). **Caveat (rule 5/8):**
  verified from code + the style document only — no native build or device network capture
  was possible here; recommend a one-off on-device capture (proxy/mitmproxy) before launch
  to confirm the shipped SDK adds no other endpoints.
- **P5-I2 — Dependencies are the intended, maintained packages (task 3).**
  `@maplibre/maplibre-react-native@11.5.0` — MIT, `github.com/maplibre/maplibre-react-native`,
  npm maintainer `maplibreorg`, `latest` dist-tag = 11.5.0, last publish 2026-10-04
  (actively maintained; the official MapLibre RN SDK — note `react-native-maplibre`
  correctly NOT used, it does not exist on npm per DEC-024). `@types/geojson@7946.0.16` —
  MIT, DefinitelyTyped (`types/geojson`), types-only, correctly in `devDependencies`.
  **New transitives (12; full closure listed, `npm ls`):** `@maplibre/maplibre-gl-style-spec@26.2.1`
  (ISC, `github.com/maplibre/maplibre-style-spec`) with `minimist@1.2.8` (pre-existing
  via `tsconfig-paths`, deduped),
  `tinyqueue@3.0.0`, `quickselect@3.0.0`, `@mapbox/unitbezier@1.0.0`,
  `json-stringify-pretty-compact@4.0.0`, `@mapbox/jsonlint-lines-primitives@2.0.3`;
  `@turf/{helpers,distance,length,nearest-point-on-line,invariant,meta}@7.4.0` (MIT).
  All are the well-known upstream packages (no typosquat indicators); all lockfile entries
  resolve from `registry.npmjs.org` with integrity hashes; **no install scripts** on any of
  them (`hasInstallScript: false`). The lockfile has **zero churn vs HEAD** (the map deps
  were committed in `85ea8c5` before this review).
- **P5-I3 — `npm audit` baseline unchanged (see §5).** 5 high / 0 moderate / 0 critical —
  byte-identical to the 2026-10-24 baseline; the map wave adds no advisories (`minimist`
  is at the patched 1.2.8 and pre-existed via `tsconfig-paths`). `npm audit fix` NOT run
  (forbidden); `--force` still offers `expo@54.0.38` (outside the SDK 58 line).
- **P5-I4 — Network posture (task 4).** Zero network call sites in `src/`/`tests/` for
  `fetch`/XHR/`axios`/`WebSocket`/`EventSource`/`sendBeacon`/`NetInfo`/`Linking.openURL`/
  TanStack persistence (grep). `useNetworkStatus`'s port (`networkStatus.ts`) imports
  nothing and touches no I/O: it is two booleans + listeners; provider outcomes feed it via
  `runProviderCall` (`src/hooks/internals.ts:31,35`), and React Query's `onlineManager`
  receives only the confirmed channel (`useNetworkStatus.tsx:106-115`) — all in-process,
  nothing observable. **The only network activity the app introduces is the MapLibre
  SDK's style/tile fetching while the map renders** (enumerated in P5-I1), documented in
  `docs/map-sdk-comparison.md` "Data / privacy (what leaves the device)" (IP, User-Agent,
  tile coordinates ≈ viewport), `MapAttribution.tsx:14-19` (tile-usage limits) and DEC-012.
- **P5-I5 — Persistence privacy passes (task 2, minus M2/L1/L2).** Serialised snapshot =
  documented fields only (schema-verified; favourite label is user-supplied text, not an
  identifier). No location, no device/ad/account identifiers, no analytics (flags OFF).
  Records are user-deletable per item and in bulk with `ConfirmDialog` confirmation
  (`RecentSearchesSection.tsx:138-161`, `FavouritesSection.tsx:134-146`,
  `SaveRouteControl.tsx:94-105`); `clearAll` wipes both collections
  (`localStore.ts:643-650`). Nothing about stored content is logged (zero logging in
  `src/`). Recent-search recording happens only on form submit (Zod-validated input,
  `JourneySearchScreen.tsx:131-136`) — search text itself never reaches storage, only the
  station-id/date echo.
- **P5-I6 — Gates match DEC-024's claims.** `npm run typecheck` PASS · `npm run lint`
  PASS (0 problems) · `npm test` **707 passed / 707 in 56 suites** — exactly the numbers
  DEC-024 reports. Watch item (hygiene, not security): Jest reports "A worker process has
  failed to exit gracefully and has been force exited" on the full run — likely a leaked
  handle (the store's fire-and-forget write queue or a module-singleton timer); harmless
  today but worth `--detectOpenHandles` before the suite grows.
- **P5-I7 — Carry-over W3B-L1 is CLOSED by the Phase 5 diff (verified).** The stations-
  screen search input is now bounded: `SEARCH_QUERY_MAX_LENGTH = 128` with
  `maxLength` on the `TextInput` (`src/features/stations/StationsView.tsx:37,104`),
  matching the picker's bound. Both former unbounded inputs (W3-L5/W3B-L1) are retired;
  the only remaining unbounded input in the app is the deep-link id family (W3B-M1 /
  P5-M1).

## 3. Map surface detail (task 1)

**Exactly what network activity the map introduces (and where documented):**

| # | Request | When | Documented in |
|---|---|---|---|
| 1 | `GET https://tiles.openfreemap.org/styles/liberty` (style JSON) | map first render | `StationsMap.tsx:35-36`, DEC-012 |
| 2 | `https://tiles.openfreemap.org/planet` → TileJSON → vector tiles `{z}/{x}/{y}` | style load + pan/zoom | style document (verified live 2026-10-24c), `map-sdk-comparison.md` "Data / privacy" |
| 3 | `https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png` (raster hillshade) | pan/zoom | same |
| 4 | `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf` (glyphs) | text on the map | same |
| 5 | `https://tiles.openfreemap.org/sprites/ofm_f384/ofm(.json/.png)` (sprites) | style load | same |

What the server can see: client IP, User-Agent, and tile coordinates (which approximate
the viewed area) — labelled `[assumption — standard HTTP/tile behaviour]` in
`map-sdk-comparison.md` and correct. **No user or station data is attached**: marker
coordinates are the bundled demo dataset, the camera start is the constant
`BULGARIA_CENTER`, and nothing from favourites/recents/search state is passed to the SDK.
There is no account, no key and no identifier involved. The residual risk is therefore
"the tile host learns roughly what map area a user looked at, per request" — accepted in
DEC-012 and mitigated by the list view being the default and fully functional without the
map. If that residual matters for the privacy notice, DEC-012's documented self-host
fallback is the remedy.

**Fallback fingerprinting check (requested):** verified clean. `loadMapLibre()` returns
`null` on any require/shape failure without surfacing the error (`loadMapLibre.ts:51-68`);
`MapRenderBoundary` catches render crashes and renders the placeholder with an empty
`componentDidCatch` (`StationsMapSurface.tsx:49-53` — the comment explicitly forbids
logging user data). The placeholder's copy is static i18n (`map.pending.*`) identical on
every platform; no error object, module name, platform name or stack ever reaches the UI.
A user cannot distinguish "module absent" from "render crashed" from the screen, and a
third party cannot learn anything device-specific from it. (Copy accuracy: P5-L3.)

**Caveats (rules 5/8):** the native map renders zero pixels in this environment; the
endpoint list above is verified from the code + the live style document, not from a device
capture.

## 4. Persistence surface detail (task 2)

- **Fields written (the entire serialised shape):** `schemaVersion`,
  `favouriteStations[]` (`id`, `stationId`, `label?`, `createdAt`, `sortOrder`),
  `favouriteRoutes[]` (`id`, `fromStationId`, `toStationId`, `label?`, `createdAt`,
  `sortOrder`), `recentSearches[]` (`id`, `search{fromStationId,toStationId,date,time?,
  limit?}`, `searchedAt`, `resultCount?`), `policy{maxRecentSearches,maxFavourites,
  recentSearchTtlDays}` — one AsyncStorage key `localStore.snapshot` plus the two settings
  keys. No location, no identifiers, no free text beyond the optional ≤80-char label.
- **Read path:** `JSON.parse` → version gate → per-record `safeParse` → policy
  re-application; every failure mode maps to a `LocalStoreNotice` and a safe default;
  no throw can escape `hydrate()`. Nothing in the pipeline can execute or interpret stored
  content (no `eval`/`Function`/template/HTML anywhere near it).
- **Write path:** inputs re-validated (`LocalStoreInputError`, static message + schema
  paths only — never values, tested). Bounds: ids ≤128, label ≤80, `resultCount` ≤10 000,
  `limit` ≤100, `sortOrder` ≤1 000 000, collections trimmed to 20/100 by policy and 500 by
  the (documented) hard bound.
- **Gaps:** P5-M1 (uncaught throw on deep-link-fed saves), P5-M2 (untested read path +
  unsurfaced notice + phantom test claims), P5-L1 (assisted poisoning with bounded junk),
  P5-L2 (full parse before trim).
- **Deletion:** per-item and bulk, all behind `ConfirmDialog` (checklist §10); `clearAll`
  empties both collections and persists the empty snapshot.

## 5. Dependency verification and audit comparison (task 3)

**Package checks (`npm view`, 2026-10-24c):**

| Package | Exists / intended | License | Repository | Maintenance signal |
|---|---|---|---|---|
| `@maplibre/maplibre-react-native@11.5.0` | ✅ the DEC-012 chosen SDK (official MapLibre project; npm maintainer `maplibreorg`) | MIT | `github.com/maplibre/maplibre-react-native` | `latest` = 11.5.0, last publish 2026-10-04; peers verified (expo ≥54, react ≥19.1, RN ≥0.80, `@types/geojson ^7946`) match the SDK 58 stack |
| `@types/geojson@7946.0.16` | ✅ the declared peer of the above; standard DefinitelyTyped package | MIT | `github.com/DefinitelyTyped/DefinitelyTyped` (`types/geojson`) | types-only (devDependency), zero runtime code |

**Transitive surprise check (`npm ls` + lockfile diff vs the parent of the dependency
commit):** **12 new transitive packages**, all well-known upstream:
`@maplibre/maplibre-gl-style-spec@26.2.1` (ISC,
maplibre/maplibre-style-spec) → `tinyqueue@3.0.0` (ISC), `quickselect@3.0.0` (ISC),
`@mapbox/unitbezier@1.0.0` (BSD-2), `json-stringify-pretty-compact@4.0.0`,
`@mapbox/jsonlint-lines-primitives@2.0.3`; `@turf/helpers@7.4.0`,
`@turf/distance@7.4.0` → `@turf/invariant@7.4.0`, `@turf/length@7.4.0` →
`@turf/meta@7.4.0`, `@turf/nearest-point-on-line@7.4.0` (all MIT, TurfJS monorepo);
plus the direct `@types/geojson@7946.0.16`. `minimist@1.2.8` (a style-spec dependency)
**pre-existed** in the tree via `tsconfig-paths` and dedupes to the patched line.
`@types/geojson` dedupes across the tree. **No install scripts**
(`hasInstallScript: false` for every entry). Lockfile entries all resolve from
`registry.npmjs.org` with integrity hashes; **`git diff HEAD -- package.json
package-lock.json` is empty** — the dependency changes were committed in `85ea8c5`
before this review (that commit mixed the Phase 3 and Phase 5 dependency additions;
23 lockfile entries appear there, of which the map wave's are the 14 above).

**`npm audit` comparison:**

| Advisory / package | 2026-10-24 baseline | 2026-10-24c (after Phase 5 additions) |
|---|---|---|
| `node-forge` GHSA-86w9-cpqp-85rv | ACTIVE, unpatched — `node-forge@1.4.0` via `expo → @expo/cli → @expo/code-signing-certificates` (tooling only) | **unchanged** |
| `zod` GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404) | ACTIVE — affects `zod <4.6.6`; direct `zod@4.6.7` patched; vulnerable copy `@expo/cli`'s nested `zod@3.25.76` (tooling only) | **unchanged** — nothing in the map wave depends on `zod` |
| `braces` / `sprintf-js` | withdrawn upstream (absent) | absent |
| **Totals** (`npm audit --json` metadata) | **5 high / 0 moderate / 0 critical** | **5 high / 0 moderate / 0 critical — identical** |
| New advisories from the map wave (maplibre / turf / minimist / style-spec) | — | **none (0)** |

Consequences: the W3-I1/F-02 audit-gate decision stands unchanged and still needs a human
owner; `npm audit fix` was NOT run; `--force` remains forbidden (offers `expo@54.0.38`).

## 6. Command log (real output, 2026-10-24c)

| Command | Result |
|---|---|
| secret-pattern scan, working tree (`src/`, `tests/`, `docs/`, `.github/`, config) | 0 matches (exit 1) |
| assignment scan `(api_key\|secret\|token\|password\|credential\|private_key)="…"` over `src/`, `tests/`, `.github/` | 0 matches (exit 1) |
| `git grep <patterns> $(git rev-list --all)` (docs excluded) | 0 files matched |
| `git remote -v` | `https://github.com/Kalsito1017/BDJ.git`, no token in URL |
| grep: `console.`/`logger.`/`log(` in `src/` | **0** (only `ConfirmDialog(` false positive) |
| grep: `fetch(\|XMLHttpRequest\|WebSocket\|EventSource\|sendBeacon\|axios\|NetInfo\|Linking.openURL\|persistQueryClient\|createSyncStoragePersister` in `src/`+`tests/` | **0 call sites** (NetInfo = doc-comment snippet only, `networkStatus.ts:40-49`) |
| grep: `AsyncStorage\|setItem\|getItem\|SecureStore\|MMKV` in `src/` | only `settingsStorage.ts` and `localStore.ts` (as designed) |
| grep: `https?://` in `src/` | 3 hits: style URL (`StationsMap.tsx:36`), OSM copyright inside the attribution constant (`MapAttribution.tsx:33`), a doc-comment URL (`src/test/setup.ts:10`) |
| `GET https://tiles.openfreemap.org/styles/liberty` (live, `python3 urllib`) | style fetched; all referenced endpoints on `tiles.openfreemap.org` (planet / natural_earth / fonts / sprites) — no third-party URL in the style |
| `npm view @maplibre/maplibre-react-native@11.5.0 …` | name/version/license/repository/deps/peers as in §5; `time.modified` 2026-10-04; `latest` = 11.5.0 |
| `npm view @types/geojson@7946.0.16 …` | MIT, DefinitelyTyped |
| `npm ls` (map subtree) + lockfile diff vs the dependency commit's parent | 12 new transitives + 2 direct (§5); all `registry.npmjs.org` + integrity; no install scripts; `minimist` deduped pre-existing; **0 lockfile churn vs HEAD** |
| `npm audit --audit-level=high` / `--json` | exit 1; **5 high / 0 moderate / 0 critical** — identical to baseline (node-forge + nested zod) |
| grep: corrupt-snapshot / privacy-test coverage in `tests/` | **none** — `initialRaw` used 0 times; no `normalizeStoredSnapshot`/notice-reason test (P5-M2) |
| grep: `notices` consumers in `src/features/`, `src/app/`, `src/components/` | **0** (P5-M2) |
| `npm run typecheck` | **PASS** (exit 0) |
| `npm run lint` | **PASS** (exit 0, no problems) |
| `npm test` | **PASS — 707 tests / 56 suites, 0 failures** (matches DEC-024); RNTL `findBy*` timeout deprecation warnings + "worker process failed to exit gracefully" warning (P5-I6) |
| `npm audit fix` | **NOT RUN** (forbidden by the brief and F-02) |
| `npm ci` | **NOT RUN** in this session (docs-only change; lockfile unchanged vs HEAD) |

## 7. Open items owned by humans (not agents)

1. Assign the security/compliance owner (checklist §17) — this review joins the
   2026-10-22/24/24b reviews and the threat model (updated 2026-10-24c) awaiting sign-off.
2. Dependency-audit gate (W3-I1, unchanged): re-baseline the audit diff on the stable
   5-high/2-advisory baseline; track `@expo/cli`'s nested `zod@3.25.76` and `node-forge`.
3. Approve the W3B-M1 deep-link param bounds (now with the P5-M1 crash path attached)
   before Phase 6 wires anything else to saved data.
4. Decide whether Appendix B.4's "visible notice on corruption" ships as UI (P5-M2) or is
   downgraded in the decision log.
5. Privacy-notice content for the map's tile requests (IP/User-Agent/viewport tiles to
   OpenFreeMap) — legal item (§3).
6. One-off on-device network capture of the map before launch (P5-I1 caveat) — needs a
   dev build (rules 5/8).
7. Legal items unchanged (privacy policy, store labels, consent design, BDZ authorization).
