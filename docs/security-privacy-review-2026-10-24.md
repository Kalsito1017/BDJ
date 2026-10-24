# Security & Privacy Review — Wave 3 (integrated: mobile-ui, i18n-a11y, data-provider, map-stations + lead integration)

**Reviewer:** security-privacy specialist subagent (independent; did not write the reviewed
code). **Date:** 2026-10-24. **Predecessor:** `docs/security-privacy-review-2026-10-22.md`
(Phase 0 docs + Phase 1 scaffold).

**Scope reviewed (Wave 3):** `src/theme/**`, `src/components/**`, `src/app/**`,
`src/features/onboarding/**`, `src/features/stations/**` (demo dataset, search, nearby flow),
`src/i18n/**`, `src/services/api/**`, `src/services/train-data/**` (schemas, mock provider,
fixtures), `src/types/errors.ts` (diff), `src/services/storage/settingsStorage.ts`, new
dependencies `zod@4.6.7` + `@react-native-async-storage/async-storage@2.2.0`, app config
(`app.json`/`eas.json`), `tests/**`, plus the full working tree and Git history for the
secret scan.

Severity scale: **critical** (ship stopper / active compromise) · **high** (exploitable
weakness or serious privacy violation) · **medium** (should fix before the next phase gate) ·
**low** (hygiene/hardening) · **info** (verified facts, no action or watch only).

**No critical or high findings. No secret was found anywhere (§1). Nothing to rotate.**
Findings: 1 medium, 5 low, 3 info.

---

## 0. Headline answers (task 1 confirmations)

| Question | Answer (verified 2026-10-24) |
|---|---|
| Location permission requested anywhere except the user-initiated nearby flow? | **No permission request exists at all today.** No location module is installed (`expo-location` is not a dependency; no `PermissionsAndroid`/`requestForegroundPermissionsAsync` anywhere). The nearby flow calls an injected `LocationPort` only from a tap on the "nearby stations" button; the default port reports `'unavailable'` (`src/features/stations/StationsScreen.tsx:40-47`). Tests assert no request at mount and one request per tap (`tests/stations/nearby-stations.test.tsx:59-77`). |
| Position stored or logged? | **No.** The raw `GeoPoint` is function-local in `runNearbyStationsFlow` (`src/features/stations/model/nearby.ts:159-171`), converted to derived distances and dropped. `NearbyViewState` has no position field and no history; each run replaces state (`nearby.ts:53-77`). No persistence import in the model; zero `console.*` in `src/`. Test: `nearby-stations.test.tsx:248-275` ("keeps the raw position out of state and out of actions"). |
| Analytics? | **None.** Flag `analytics` is OFF (DEC-004) and there is no analytics code in the tree (grep: only the flag definition and one comment). |
| Network calls in the app today? | **ZERO.** No `fetch`, `XMLHttpRequest`, `axios`, `WebSocket`, `EventSource`, `sendBeacon`, `Linking.openURL`, `NetInfo`, WebView, or URL-bearing call in `src/` or `tests/`. The only `http(s)` string in executable-tree files is a doc-comment URL in `src/test/setup.ts:10`. `services/api/` is transport-agnostic orchestration only (stated in its own headers). |

---

## 1. Secret scan (rule 7) — RESULT: NO SECRETS FOUND

1. **High-entropy credential patterns** over the working tree **and every commit**
   (`git grep` over `git rev-list --all`): AWS AKIA/ASIA, `ghp_/gho_/ghs_/github_pat_`,
   `sk-*`, `xox*`, JWT triplets, `-----BEGIN *PRIVATE KEY-----`, Google `AIza*`,
   SendGrid `SG.*`, GitLab `glpat-*`, Squid `squ_*` → **0 real matches** (only two prose
   hits: the pattern list quoted in my own 2026-10-22 review doc).
2. **Assignment scan** (`(api_key|secret|token|password|credential|private_key) = "value"`)
   over `src/`, `tests/`, `.github/`, config JSON → **0 matches**.
3. **`git remote -v`** → `https://github.com/Kalsito1017/BDJ.git`, no embedded token.
4. **`.env.example`** unchanged — placeholders only (`EXPO_PUBLIC_APP_ENV=development`,
   `EXPO_PUBLIC_TRAIN_API_BASE_URL=` empty on purpose, `EXPO_PUBLIC_MAP_SDK_KEY=placeholder-…`).
   No real `.env` exists in the tree (`ls`), and `.env` is git-ignored.
5. **`app.json` / `eas.json`** — unchanged in the Wave 3 working tree (not in `git status`).
   No credentials, no EAS token, no `extra` payload. Bundle IDs `com.example.bdztrain` are
   **placeholders** (previous finding F-05, Phase 8) — not credentials.
6. **`.gitignore` / `.dockerignore`** — the F-04 signing-artifact additions (`*.p8`, `*.pfx`,
   `*.der`, `*.key`, `*.cer`, `*.certSigningRequest`, `*.p10`, `keystore.properties`,
   `service-account*.json`, `.envrc`) are still present in both files (F-04 **kept intact**).
   The only tracked files whose *names* match "key/credential" are prose documents
   (`TicketingProvider.ts`, `order.ts`, agent notes) — no key material.

**Conclusion:** nothing to rotate. (Standing rule: any secret ever pasted into an agent chat
is treated as leaked by the human owner — addbeforerelease.txt §16.)

## 2. Findings

### W3-M1 — Boundary schemas accept unbounded strings and arrays (Medium)

- **Evidence:** `src/services/train-data/schemas/common.ts:33` (`EntityIdSchema =
  z.string().min(1)` — no max), `schemas/station.ts:14-24` (`name`, `alternateName`,
  `aliases: z.array(...)` — unbounded strings and array), `schemas/station.ts:26-33`
  (`stations: z.array(StationSchema)` — unbounded), `schemas/journey.ts:26-53` (all ids,
  `trainNumber`, `trainName`, `providerStatus`, and `segments`/`legs` arrays unbounded).
- **Why it matters:** these schemas are the trust boundary for every provider payload
  (Appendix B) and, per threat model EP-1/EP-4, must resist "excess nesting, huge strings"
  (actor T4). Today a hostile upstream payload with a 50 MB string or a 10⁶-element array
  passes validation, is materialised into mapped state and rendered in lists — memory/CPU
  exhaustion on device. This is the same weakness class as the **new** advisory
  GHSA-mrhx-c7xc-m3w5 (see §3): "array schema without a length constraint". The app's own
  `zod@4.6.7` is patched, so the library-level OOM is fixed — but the schema-level bound is
  still the app's job. Mock-only today, so not exploitable yet; cheap to fix now.
- **Fix:** add explicit bounds at the boundary — e.g. `EntityIdSchema = z.string().min(1).max(128)`,
  `name`/`alternateName` `.max(200)`, `aliases: z.array(...).max(20)`, `stations ≤ 5000`,
  `journeys ≤ 200`, `segments`/`legs` ≤ 50, `providerStatus ≤ 200` — and add one fuzz-style
  test per bound (Appendix B.5 already calls for out-of-range tests).

### W3-L1 — Mock provider embeds raw caller-supplied ids in `ProviderError.message` (Low)

- **Evidence:** `src/services/train-data/MockTrainDataProvider.ts:159, 174, 255, 269, 374`
  (`this.notFound(\`journey '${journeyId}'\`)`, `station '${stationId}'`) and the helper at
  `:301-305` (`Mock provider has no ${what}.`). This violates the module's own contract:
  `src/services/api/providerErrors.ts:10-13` — "`message` and `diagnostics` … MUST NOT
  contain payload values (they may be PII)". Ids are caller input and will be
  deep-link-controlled later (threat model EP-3/AC-17), with no length bound.
- **Why it matters:** today nothing renders or logs `message` (UI maps `code` → i18n key
  only, `src/components/ErrorState.tsx`), so impact is latent — but the mock is the
  reference implementation a future `LiveTrainDataProvider` will copy. Once crash reporting
  (checklist §7) starts capturing `message`, arbitrary deep-link text lands in logs.
- **Fix:** make `notFound` messages static (`'Mock provider: entity not found.'`) and, if
  traceability is wanted, put a bounded, non-reversible hint (length + last-4 of a hash) in
  `diagnostics` — never the raw value.

### W3-L2 — `safePayloadSummary` copies unbounded key names into `upstreamMessage` (Low)

- **Evidence:** `src/services/api/providerErrors.ts:201-209` — up to 10 object key names are
  copied verbatim (count capped, **key length not capped**; the regex filter keeps
  identifier-shaped keys, so a key like `john_smith` passes).
- **Why it matters:** the summary is designed as "PII-safe", and mostly is (values never
  included; e-mail-shaped keys fail the regex). But a hostile payload can inject long or
  identifying key names into `ProviderError.upstreamMessage`, i.e. log/crash-report poisoning
  and a small amplification vector (multi-MB key name copied into the error object).
- **Fix:** truncate each key (e.g. 32 chars) and total length; or report only key *count*
  plus the schema field names the schema itself knows (drop dynamic key names entirely).

### W3-L3 — Prototype-chain lookups on fixture maps keyed by caller-supplied ids (Low)

- **Evidence:** `src/services/train-data/fixtures/index.ts:79-87, 92-101` build plain objects
  (`stationPayloads`, `journeyPayloadsById`); lookups at
  `MockTrainDataProvider.ts:173, 268, 373` use `map[id]` and `=== undefined` checks.
  `getJourney('constructor')` / `getStation('toString')` resolve to inherited members
  (truthy) and are routed into the Zod parse, misclassifying `not_found` as
  `invalid_response`.
- **Why it matters:** no crash and no data leak (the parse rejects a function safely), but
  wrong error semantics and a trap for the future cache-by-id pattern in a live provider.
- **Fix:** key the maps with `Map<string, …>` or check `Object.hasOwn(map, id)` before use.

### W3-L4 — Translator catalog lookup not own-property guarded (Low)

- **Evidence:** `src/i18n/catalog.ts:94` — `active?.[key] ?? allCatalogs[fallbackLocale][key]`
  walks the prototype chain; a key such as `'toString'`/`'constructor'` would return an
  inherited function, and `interpolate` (`catalog.ts:76-81`) would throw on `value.replace`.
- **Why it matters:** unreachable today — every call site passes a compile-time constant key
  and `tests/i18n/locale-parity.test.ts` + `keys.ts` typed maps pin the key set. It is a
  one-line hardening against a future caller passing dynamic keys (e.g. from a deep link).
- **Fix:** `const value = Object.prototype.hasOwnProperty.call(active, key) ? active[key] : …`
  and require `typeof value === 'string'` before interpolating.

### W3-L5 — No `maxLength` on the station search input (Low)

- **Evidence:** `src/features/stations/StationsView.tsx:81-82` binds `query` →
  `src/components/TextInput.tsx` (no `maxLength` prop anywhere).
- **Why it matters:** with the bundled 20-station demo set the cost is trivial (pure
  substring matching, no regex — no ReDoS), but when a large licensed directory (10k+
  stations) replaces it, a pasted multi-MB query means a large token list × station haystack
  loop per keystroke (battery/CPU) — threat model AC-16.
- **Fix:** `maxLength={64}` (or similar) on the search input; keep `limit` on results.

### W3-I1 — Dependency-audit baseline changed since 2026-10-22 (Info — decision needed)

- `npm audit --audit-level=high` on 2026-10-24: **5 vulnerabilities (all high), 2 root
  advisories** — versus 48 findings (18 moderate, 30 high) from 3 advisories on 2026-10-22.
  Verified against the GitHub Advisory API:
  | Advisory | Status 2026-10-24 | Detail |
  |---|---|---|
  | `braces` GHSA-vfj7-8cjw-p6xm | **WITHDRAWN** 2026-10-23 | summary now "Withdrawn Advisory: …"; still no patched version; `braces@3.0.3` still installed via `expo → @expo/metro → metro-file-map → micromatch` |
  | `sprintf-js` GHSA-hp3w-g68c-fv3c | **WITHDRAWN** 2026-10-22 | "Withdrawn Advisory: …"; `sprintf-js@1.0.3` still installed via `jest-expo → … → argparse@1` |
  | `node-forge` GHSA-86w9-cpqp-85rv | **ACTIVE**, unpatched (`first_patched_version: null`) | `node-forge@1.4.0` via `expo → @expo/cli → @expo/code-signing-certificates`; build tooling only |
  | `zod` GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404) | **NEW in the audit** (published 2026-10-01, updated 2026-10-23) | "Zod can exhaust memory while validating oversized constrained collections"; affects `zod < 4.6.6`, patched **4.6.6**. The app's direct `zod@4.6.7` is **patched**. The vulnerable copy is `@expo/cli`'s nested `zod@3.25.76` (`npm ls` verified) — Expo CLI build tooling, **not in the app bundle**; no patched 3.x exists, so it stays until Expo bumps. |
- **Consequence for F-02:** the previously recommended "audit-diff baseline" must be
  **re-baselined now** (the counts moved without any dependency change) and must treat
  withdrawn advisories as resolved. `npm audit fix --force` remains forbidden (offers
  `expo@54.0.38` — outside the SDK 58 line). Decision owner: security/compliance role
  (UNASSIGNED).

### W3-I2 — `expo-linking` is a direct dependency but unused in `src/` (Info)

- **Evidence:** `package.json:28`; no import in `src/`/`tests/` (expo-router itself needs it
  as its linking layer, which is presumably why it is direct). Harmless; either use it for
  deliberate deep-link handling later or drop it at the next dependency pass.

### W3-I3 — Wave 3 dependency additions are the intended packages (Info — pass)

- `zod@4.6.7` — exists, **MIT**, `github.com/colinhacks/zod`, matches the DEC-009 verified
  baseline ("4.6.x, MIT"). Known supply-chain watch item from DEC-009 still applies (pin
  versions; the 2026-09-21 malicious commits were never published).
- `@react-native-async-storage/async-storage@2.2.0` — exists, **MIT**,
  `github.com/react-native-async-storage/async-storage` (the org's package, not a squatter).
  Exact version **2.2.0 is the Expo SDK 58 pinned line** (`node_modules/expo/bundledNativeModules.json`);
  npm `latest` is 3.1.1 — the deliberate SDK-line pin is correct and documented in DEC-018.
- `package.json` diff vs. HEAD contains exactly these two additions (no other churn).
- Async storage usage is limited to two non-secret keys (see §5) — consistent with
  checklist §3 ("tokens never in AsyncStorage"; none exist yet).

## 3. Input handling (task 4)

- **Station search input** (`src/features/stations/model/normalize.ts`, `stationSearch.ts`):
  pure string normalisation (NFD + combining-mark strip + whitespace collapse) and a static
  transliteration table; **no `RegExp` is constructed from input**, no `eval`/`Function`,
  no logging, no I/O. Query text is only ever used in `String.includes`/`startsWith` and
  rendered back via RN `Text`. Injection surface: **none found** (see W3-L5 for cost only).
- **i18n interpolation** (`src/i18n/catalog.ts:76-81`): `{name}` placeholders replaced with
  `String(params[name])` via `String.prototype.replace` with a fixed pattern; params are
  numeric distances or key-derived strings. Rendering is React Native `Text` — there is
  **no WebView, no `dangerouslySetInnerHTML`, no HTML/Markdown renderer anywhere in the
  tree** (grep verified; `react-native-webview` is not a dependency), so there is no
  HTML/JS injection path even if a param were hostile. Prototype-pollution read is already
  guarded by `hasOwnProperty` in `interpolate` (see W3-L4 for the sibling lookup).
- **Mock provider boundary validation** (DEC-017): every fixture payload is Zod-parsed on
  every call (`parseExternalPayload`, `src/services/api/parsePayload.ts`); unknown fields
  are stripped (Zod object default — no `passthrough`/`catchall`/`z.record` anywhere in
  `schemas/`), so nothing unvalidated reaches the UI. The `'malformed'` scenario proves the
  failure path rejects with `ProviderError{invalid_response}` and never throws raw.
- **Error content (DEC-017 "schema paths only"):** `providerErrorFromZod`
  (`providerErrors.ts:173-193`) builds `diagnostics` strictly from `issue.path` + `issue.code`.
  Because no schema uses `z.record`/catch-alls, all path segments are **schema field names**,
  not input keys — a crafted payload cannot inject values into `diagnostics`. `message` is a
  static context label + issue count. Two residual leaks are catalogued as W3-L1 (mock
  ids in `message`) and W3-L2 (key names in `upstreamMessage`). Nothing renders
  `message`/`upstreamMessage`/`diagnostics`/`cause` to users today (`ErrorState` maps `code`
  → `errors.*` only).
- **Deep links:** no route reads parameters (no `useLocalSearchParams`/`route.params` in
  `src/`); routes navigate to fixed paths. `StationsScreen`'s `initialQuery` is a test seam,
  not URL-fed.

## 4. Privacy posture (task 5)

- **Data minimization — PASS (verified).** Local storage contains exactly two keys:
  `settings.language` (`bg`/`en`) and `settings.onboardingCompleted` (`'true'`) —
  `src/services/storage/settingsStorage.ts:16-21`. No identifiers, no device ids, no
  timestamps, no history of any kind. Onboarding persists only the completion flag; it
  collects nothing (`src/features/onboarding/**` has no permission/consent code — verified).
- **Location:** see §0 — one-shot, foreground-only-by-contract, never stored, never logged,
  no module wired yet.
- **Logs:** zero `console.*`/logger calls in `src/` (the single `console.warn` in
  `tests/mobile-ui/i18n-keys.test.ts:107` prints static i18n key names in test output only —
  no user input, no location).
- **Demo datasets:** fully synthetic — every station name carries a "Демо/Demo" marker,
  coordinates explicitly invented (`src/features/stations/data/demoStations.ts:27`,
  `fixtures/demoStationPayloads.ts:27`), journey fixtures documented "no personal data of
  any kind" and reviewed as such. No real people, e-mails, phones, IDs, addresses.
- **Permission timing — PASS.** No permission is requested at onboarding or at mount;
  the only future request point is a user tap on "nearby stations" (test-enforced).
- **No analytics / no network** — PASS (§0).
- **Consent:** onboarding preselects and collects nothing (plan.md 17.7 respected); the
  consent design for analytics/marketing remains a legal-owned future item (unchanged).

## 5. OWASP MASVS spot-check (new code) + previous review's open items

| MASVS area | Verdict (verified 2026-10-24) |
|---|---|
| MSTG-STORAGE | **Pass.** Only two non-secret strings in AsyncStorage; reads fail-safe; values re-narrowed on read. Future tokens still specified for SecureStore only (unchanged). |
| MSTG-CRYPTO | **Pass (by absence).** Still no crypto anywhere. |
| MSTG-AUTH | **N/A.** No accounts (flag OFF). |
| MSTG-NETWORK | **Pass (by absence).** Zero network calls (re-verified). `services/api/` contains no transport. |
| MSTG-CODE | **Pass.** No dynamic code loading/eval; the two new deps verified (W3-I3); lockfile committed with registry integrity hashes. |
| MSTG-PLATFORM | **Improved.** Deep-link surface unchanged (`bdztrain://`) but confirmed parameter-free today; no WebView; `Linking` never invoked. Watch: any future deep-link param must be validated + length-bounded (EP-3). |
| MSTG-RESILIENCE | **Decision still needed** (unchanged): no root/jailbreak/tamper detection — must be a recorded launch decision, not an omission. |
| MSTG-PRIVACY | **Pass at code level** (§4). Privacy policy / store labels still legal-owned blockers. |
| Logging (checklist §14) | **Pass.** Zero logging; the checklist §14 "privacy test" should become automated when a logger lands (it would have nothing to catch today). |

**Previous review (2026-10-22) open items — re-checked:**

| Item | Status 2026-10-24 |
|---|---|
| F-01 Metro loopback binding | **Kept intact** — `docker-compose.yml:20` still `127.0.0.1:8081:8081`. |
| F-03 CI permissions | **Kept intact** — `.github/workflows/ci.yml:16-17` `permissions: contents: read`. |
| F-04 ignore-list gaps | **Kept intact** — full signing-artifact set in both `.gitignore` and `.dockerignore`. |
| F-06 non-root container | **Kept intact** — `Dockerfile:28-29` `chown -R node:node /app` + `USER node`. |
| F-02 / M3 dependency audit | **Changed** — see W3-I1: 5 findings / 2 advisories (2 withdrawn upstream, 1 new). Re-baseline the audit gate; `npm audit fix --force` still forbidden. |
| F-05 placeholder bundle IDs | Unchanged — Phase 8 item. |
| F-07 typescript Apache-2.0 | Unchanged (new deps are both MIT). |
| F-09 hygiene (unused `ISODate` import etc.) | The unused import was fixed by the lead (DEC-014); `@types/node` question not re-checked — cosmetic. |

## 6. Command log (real output, 2026-10-24)

| Command | Result |
|---|---|
| secret-pattern scan, working tree (excl. `node_modules`, lockfile) | 0 real matches (1 prose hit in this review series' own doc) |
| `git grep <patterns> $(git rev-list --all)` | 0 real matches (1 prose hit in the 2026-10-22 review doc) |
| assignment scan `(api_key\|secret\|token\|password\|credential\|private_key)="…"` | 0 matches |
| `git remote -v` | no token in URL |
| `ls` for `.env*`; `git ls-files` for key/keystore patterns | only `.env.example` (placeholders); no key material tracked |
| `git status --short` | `app.json`/`eas.json` **not modified**; `package.json` diff = the 2 new deps only |
| grep: `fetch\|XMLHttpRequest\|axios\|WebSocket\|EventSource\|sendBeacon\|Linking.openURL\|NetInfo` in `src/`,`tests/` | **0** call sites (word matches in comments/types only) |
| grep: `console\.` in `src/` | **0** |
| grep: `WebView\|innerHTML\|dangerouslySetInnerHTML\|eval\|Function(` in `src/` | **0** |
| grep: `expo-location\|PermissionsAndroid` in `src/` | 3 matches, **all doc comments** stating `expo-location` is NOT a dependency (`StationsScreen.tsx:19,21`, `types.ts:45`) — 0 imports, 0 permission calls; the location port is an interface + `'unavailable'` stub |
| `npm view zod@4.6.7 name version license repository.url` | `zod` 4.6.7, MIT, `github.com/colinhacks/zod` |
| `npm view @react-native-async-storage/async-storage@2.2.0 name version license repository.url` | 2.2.0, MIT, `github.com/react-native-async-storage/async-storage` (npm latest 3.1.1) |
| `grep async-storage node_modules/expo/bundledNativeModules.json` | `"@react-native-async-storage/async-storage": "2.2.0"` — SDK 58 pin matches |
| `npm ls zod @react-native-async-storage/async-storage` | direct `zod@4.6.7`, `async-storage@2.2.0`; nested `zod@3.25.76` under `@expo/cli` (vulnerable copy, tooling) |
| `npm audit --audit-level=high` / `--json` | exit 1; **5 high, 0 moderate, 0 critical** (was 48/18 moderate/30 high) — 2 advisories: `node-forge` GHSA-86w9-cpqp-85rv (unpatched), `zod` GHSA-mrhx-c7xc-m3w5 (direct dep patched; nested 3.25.76 affected) |
| GitHub Advisory API ×4 (GHSA-vfj7-8cjw-p6xm, GHSA-hp3w-g68c-fv3c, GHSA-86w9-cpqp-85rv, GHSA-mrhx-c7xc-m3w5) | braces **withdrawn 2026-10-23**, sprintf-js **withdrawn 2026-10-22**, node-forge active/no patch, zod `<4.6.6` patched `4.6.6` |
| `npm run typecheck` | **PASS** (exit 0) |
| `npm run lint` | **PASS** (exit 0) |
| `npm test` | **PASS — 389 tests / 31 suites, 0 failures** (matches DEC-018) |
| `npm audit fix` | **NOT RUN** (forbidden by the brief and F-02) |
| `npm ci` | **NOT RUN** in this session (docs-only review change; would needlessly rebuild `node_modules`) — recommend the lead runs it as part of the next real code change |

## 7. Open items owned by humans (not agents)

1. Assign the security/compliance owner (checklist §17) — this review,
   `docs/threat-model.md` (updated 2026-10-24) and the 2026-10-22 review need sign-off.
2. Decide the dependency-audit gate on the **new** baseline (W3-I1): re-baseline the audit
   diff, note the two withdrawn advisories, and track `@expo/cli`'s nested `zod@3.25.76`
   (patched only when Expo bumps it — no fix inside the 3.x line).
3. Approve the W3-M1 schema-bound policy (sizes/caps) before Phase 4 wires a live boundary.
4. MSTG-RESILIENCE decision (root/tamper detection) at launch — still open.
5. Legal items unchanged (privacy policy, store labels, consent design, BDZ authorization).
