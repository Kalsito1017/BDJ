# Security & Privacy Review — Phase 0 docs + Phase 1 scaffold

**Reviewer:** security-privacy specialist subagent (independent; did not write the reviewed
code). **Date:** 2026-10-22. **Scope reviewed:** `docs/decisions.md`,
`docs/scale-and-load-test-plan.md`, `docs/bdz-integration-review.md`,
`docs/legal-compliance-matrix.md`, `src/types/*.ts`, `src/services/**`, `package.json`,
`package-lock.json`, `tsconfig.json`, `eslint.config.js`, `jest.config.js`, `app.json`,
`eas.json`, `.env.example`, `.gitignore`, `.dockerignore`, `Dockerfile`, `docker-compose.yml`,
`.github/workflows/ci.yml`, `README.md`, `src/app/*.tsx`, `src/test/setup.ts`, `tests/**`, the
full Git history (8 commits, all blobs), and the installed dependency tree.

Severity scale: **critical** (ship stopper / active compromise) · **high** (exploitable
weakness or serious privacy violation) · **medium** (should fix before the next phase gate) ·
**low** (hygiene/hardening) · **info** (verified facts, no action or watch only).

**No critical or high findings. No secret was found anywhere — see §1.**

---

## 1. Secret scan (rule 7) — RESULT: NO SECRETS FOUND

Scans performed (real output on 2026-10-22):

1. **High-entropy credential patterns** across every commit (`git grep <pattern> $(git rev-list
   --all)`): AWS AKIA/ASIA keys, `ghp_/gho_/ghs_/github_pat_` tokens, `sk-*`, `xox*` Slack,
   JWT triplets, `-----BEGIN *PRIVATE KEY-----`, Google `AIza*`, SendGrid `SG.*`, Square,
   GitLab `glpat-*` → **0 matches**.
2. **Keyword scan** (`api_key|secret|token|password|credential|private_key`) across all
   commits, excluding pure policy documents → **only prose/policy mentions** (e.g.
   `.gitignore:20`, `src/types/errors.ts:44` "MUST NOT contain secrets…"). No assignment of a
   real value anywhere.
3. **`git remote -v` / git config** → `https://github.com/Kalsito1017/BDJ.git`, **no embedded
   token** in the URL.
4. **`.env.example`** (committed by design) → placeholders only:
   `EXPO_PUBLIC_APP_ENV=development` (`.env.example:10`), `EXPO_PUBLIC_TRAIN_API_BASE_URL=`
   (empty on purpose, `.env.example:16`), `EXPO_PUBLIC_MAP_SDK_KEY=placeholder-public-map-sdk-key`
   (`.env.example:21` — a placeholder string, **not** a real key). **No server secret lives in
   any `EXPO_PUBLIC_*` variable.**
5. **`app.json` / `eas.json`** → no credentials, no EAS token, no `extra` payload. Bundle IDs
   `com.example.bdztrain` (`app.json:12`, `app.json:15`) are **placeholders** — acceptable now,
   flagged so nobody mistakes them for production identifiers (must be replaced before
   prebuild/store submission and owned by the company, checklist §1).
6. **`.gitignore` coverage** → `.env`, `.env.*` (with `!.env.example`), `*.jks`, `*.keystore`,
   `*.p12`, `*.pem`, `*.mobileprovision`, `*.provisionprofile`, `google-services.json`,
   `GoogleService-Info.plist`, `credentials.json`, `secrets.tar` are all ignored
   (`.gitignore:15-30`). Gaps: see F-04.

**Conclusion:** nothing to rotate. If a secret ever appeared in an earlier, non-repo location
(e.g. an agent chat), that remains outside this repo's blast radius and the standing rule
(addbeforerelease.txt §16: any secret seen by an agent is treated as leaked) applies to the
human owner.

## 2. Findings

### F-01 — Metro/Expo dev server is published on all host interfaces (Medium)

- **Evidence:** `docker-compose.yml:15-16` (`ports: ['8081:8081']` binds 0.0.0.0),
  `Dockerfile:28-31` (CMD starts Metro with `--host lan`-style exposure on port 8081),
  `README.md:174` instructs `docker compose up --build`.
- **Why it matters:** Metro has no authentication. On shared/hostile networks (co-working
  Wi-Fi, hotels — exactly where this app's users travel) any host on the LAN can pull the JS
  bundle (which embeds project source) and query dev-server endpoints; depending on the Metro
  version, other files under the project root — potentially including a git-ignored `.env` if
  the developer created one — may be reachable too. Threat model EP-5/§1-I.
- **Fix:** bind to loopback by default — `ports: ['127.0.0.1:8081:8081']` — and document an
  explicit opt-in (`--host lan` / host networking) for physical-device testing on trusted
  networks only. One-line change in `docker-compose.yml` + README note.

### F-02 — 48 known dependency advisories (30 high) with no fix on any version; CI audit job is non-blocking (Medium)

- **Evidence:** `npm audit --audit-level=high` run 2026-10-22 (exit 1): **48 vulnerabilities
  (18 moderate, 30 high, 0 critical)** from **3 root advisories, all transitive**:
  | Advisory | CVE | Installed | Affected | Patched versions | Chain |
  |---|---|---|---|---|---|
  | `braces` stack-exhaustion DoS (GHSA-vfj7-8cjw-p6xm, high, CVSS 8.7) | CVE-2026-93687 | 3.0.3 | ≤ 3.0.3 | **None** | `expo → @expo/metro → metro-file-map → micromatch → braces` and `jest-expo → … → @jest/transform → micromatch → braces` |
  | `node-forge` PKCS#1 v1.5 signature forgery (GHSA-86w9-cpqp-85rv, high, CVSS 8.7, integrity) | CVE-2026-85393 | 1.4.0 | ≤ 1.4.0 | **None** | `expo → @expo/cli → @expo/code-signing-certificates → node-forge` |
  | `sprintf-js` DoS via precision specifiers (GHSA-hp3w-g68c-fv3c, moderate, CVSS 6.9) | CVE-2026-97058 | 1.0.3 | ≤ 1.1.3 | **None** | `jest-expo → babel-jest → babel-plugin-istanbul → @istanbuljs/load-nyc-config → js-yaml@3 → argparse@1 → sprintf-js` |
- **Verified statements:** "Patched versions: None" confirmed on each GitHub advisory page
  (2026-10-22); `npm audit fix --dry-run` leaves all 48 findings; `npm audit fix --force` offers
  only breaking downgrades out of the SDK 58 line (expo@44.0.6, react-native@0.72.17,
  jest-expo@56.0.0) and must **not** be run. **No fix is available within the Expo SDK 58 line,
  and no `overrides` entry can help while the packages themselves are unpatched.**
  The CI comment (`.github/workflows/ci.yml:54-58`) and `README.md:68-74` are accurate.
- **Triage (why not higher):** all three live in **build/test tooling** (Expo CLI, Metro, Jest
  coverage plumbing) — none ships in the app bundle running on user devices, and today the app
  makes no network calls at all. The DoS advisories need attacker-controlled glob/format strings
  to trigger; the `node-forge` advisory weakens signature verification inside the Expo CLI
  (dev-machine trust, not user trust).
- **Fix / recommendation:**
  1. Keep `dependency-audit` **advisory (continue-on-error) for now** — making it required
     today would permanently red-flag CI with nothing anyone can do, which trains everyone to
     ignore it. The current workflow comment must stay (it says exactly this).
  2. Make it **required when one of these happens**: all three advisories gain patched releases
     reachable inside the SDK 58 line (re-check monthly), or the count changes (a *new*
     advisory appears). Concrete mechanism: add a second job that fails only on **new**
     advisories — e.g. `npm audit --json` diffed against a committed baseline
     (`docs/` or `.github/audit-baseline.json`), or Dependabot alerts + a CODEOWNERS rule.
  3. Record the decision and the review date in `docs/decisions.md` (owner: the named security
     owner — still UNASSIGNED).
  4. Re-run `npm audit` at each phase gate and paste the counts into this document's log.

### F-03 — GitHub Actions workflow has no explicit `permissions:` block (Low)

- **Evidence:** `.github/workflows/ci.yml` (whole file; jobs at lines 27, 50, 73, 100) — no
  `permissions:` key, so the default `GITHUB_TOKEN` permissions apply (repo-config dependent).
- **Fix:** add `permissions: contents: read` at workflow level; when release/build jobs arrive,
  grant per-job permissions explicitly. (Verified: the referenced action tags
  `actions/checkout@v7` and `actions/setup-node@v7` are real current majors — checkout v7.0.1
  exists — so the workflow references are not a phantom-action risk. Pinning to full commit
  SHAs is still recommended when a human owns CI.)

### F-04 — `.gitignore` signing-material coverage has gaps (Low)

- **Evidence:** `.gitignore:20-30` covers `.jks/.keystore/.p12/.pem/.mobileprovision/
  .provisionprofile/google-services.json/GoogleService-Info.plist/credentials.json/secrets.tar`
  but not `*.p8` (Apple Auth/APNs keys), `*.cer`, `*.certSigningRequest`, `*.p10`, `*.der`,
  `*.key`, `*.pfx`, `service-account*.json`, `keystore.properties`, `.envrc`.
- **Why it matters:** these are exactly the file types that appear in Phase 8 (signing) and any
  future service-account work; the first accidental `git add` happens before anyone rereads
  this file.
- **Fix:** add the missing patterns (and mirror them in `.dockerignore`, which has the same
  gap at `.dockerignore:13-17`). Nothing sensitive is committed today.

### F-05 — Placeholder app identifiers must not survive to release (Low)

- **Evidence:** `app.json:12` (`com.example.bdztrain`), `app.json:15` (same). Documented as
  placeholders here per the review brief.
- **Fix:** before any `expo prebuild`/store work, set final IDs from the **company-owned**
  namespace (checklist §1/§24) and record the decision in `docs/decisions.md`. Also decide
  early: bundle IDs are permanent in the stores.

### F-06 — Dev container runs as root and mounts the full working directory (Low)

- **Evidence:** `Dockerfile:16-31` (no `USER` directive; `COPY . .`), `docker-compose.yml:17-19`
  (`volumes: .:/app` mounts everything, including `.git/`, into the container).
- **Why it matters:** dev-only, but defence-in-depth for a machine that will later hold EAS
  tokens/keystores (which `.dockerignore` cannot protect against — the bind mount bypasses it).
- **Fix:** add a non-root `USER node` (or create a dedicated user) in the Dockerfile; consider
  a read-only mount or an exclude list once signing material exists locally.

### F-07 — License claim correction: `typescript` is Apache-2.0, not MIT (Info)

- **Evidence:** `package.json:49` (`typescript ~6.0.3`) — npm registry reports
  **Apache-2.0**. Every other direct dependency was verified **MIT** (registry check
  2026-10-22): all `expo*`/`@expo/*` (Expo maintainers), `react`, `react-dom`, `react-native`,
  `react-native-safe-area-context`, `react-native-screens`, `react-native-web`,
  `@testing-library/react-native`, `test-renderer`, `@types/jest`, `@types/react`, `eslint`,
  `eslint-config-expo`, `eslint-config-prettier`, `jest`, `jest-expo`, `prettier`.
  The app itself is correctly declared `Apache-2.0` (`package.json:5`) with a matching
  `LICENSE`. `k6` (AGPL-3.0, load-test tooling) is correctly quarantined in DEC-009.
- **Fix:** where DEC-009 or future docs say "all MIT", say "MIT except typescript
  (Apache-2.0)". Both are permissive; no compatibility problem.

### F-08 — Typosquatting check PASSED, incl. the non-obvious `test-renderer` (Info)

- **Evidence:** all 24 direct dependencies (13 runtime + 11 dev) exist on npm under the intended name, with expected
  maintainers (Expo team / Meta / Microsoft DefinitelyTyped / Testing Library / OpenJS).
  `test-renderer@1.3.1` (`package.json:48`) looks like a squatter of `react-test-renderer` but
  is **the intended package**: it is the declared peer dependency of
  `@testing-library/react-native@14.1.0` (`test-renderer: ^1.0.0`), maintained by the RNTL
  maintainer (mdjastrzebski), MIT, actively released (1.3.1 on 2026-10-12). Lockfile entry
  resolves from `registry.npmjs.org` with a SHA-512 integrity hash.
- **Watch item (low):** its npm `time` metadata contains a `28.0.0` entry dated 2023-06-01 that
  predates the package's creation (2026-01-07) and is absent from the published `versions`
  list (0.11.0–1.3.1). Harmless for this repo (range `^1.3.1`), noted for supply-chain
  hygiene.

### F-09 — Minor hygiene (Info)

- `src/types/favourites.ts:15` — unused import `ISODate` (only ESLint warning in the tree;
  `npm run lint` exit 0 with 1 warning).
- `tsconfig.json:8` lists `"types": ["jest","node"]` but `@types/node` is not a direct
  devDependency (it is present transitively). Add it explicitly or drop `"node"` from `types`.
- `eslint` is pinned to the 9.x line (`package.json:42`) while 10.x is current — deliberate
  pinning is fine; check `eslint-config-expo` compatibility before upgrading.

## 3. OWASP MASVS review (level meaningful for this codebase today)

| MASVS area | Verdict (verified 2026-10-22) |
|---|---|
| MSTG-STORAGE | **Pass (by absence).** No sensitive data is stored today. Future tokens specified for Keychain/Keystore via `expo-secure-store` (DEC-001, checklist §3) — never AsyncStorage. Favourites/recent searches (travel intent) are local-only, user-deletable, capped and TTL'd (`src/types/favourites.ts:161-187`); re-validation on read is specified. |
| MSTG-CRYPTO | **Pass (by absence).** No crypto in use; no custom cryptography anywhere (rule). Money as integer minor units (DEC-006) prevents float-precision classes of payment bugs later. |
| MSTG-AUTH | **N/A today.** Accounts gated OFF (`src/types/feature-flags.ts:244-249`); spec already requires server-side authz, no enumeration, single-use reset tokens (plan.md 17.2, checklist §3). |
| MSTG-NETWORK | **Pass (by absence).** Zero network calls (verified: no fetch/axios/XHR in `src/`). HTTPS mandated for any future provider (plan.md §12); `EXPO_PUBLIC_TRAIN_API_BASE_URL` intentionally empty. Pinning decision belongs to DEC-002's successor entry. |
| MSTG-CODE | **Pass.** No dynamic code loading/eval; dependencies verified (F-08); lockfile committed with integrity hashes from `registry.npmjs.org` only (verified). |
| MSTG-PLATFORM | **Mostly pass.** Deep-link scheme `bdztrain://` (`app.json:7`) is the future attack surface; the spec already forbids treating a deep-link return as payment truth (DEC-008). Gap: deep-link handling is unimplemented — the threat model EP-3 actions apply. |
| MSTG-RESILIENCE | **Decision needed.** No root/jailbreak detection, tamper detection or debugger checks. Reasonable for a mock-only timetable app; must be an explicit, recorded decision at launch (not an accidental omission). |
| MSTG-PRIVACY | **Pass at code level** (see §4). Privacy policy, store labels, DPA matrix rows all still open (legal-compliance-matrix rows 5–13, 17) — launch blockers owned by humans. |
| Logging (checklist §14) | **Pass.** `grep` over `src/` and `tests/` finds **zero** `console.*`/log calls and zero occurrences of password/token/card/CVV concepts in executable code (only normative comments forbidding them, e.g. `src/types/errors.ts:44`, `src/services/ticketing/TicketingProvider.ts:13-20`). When logging is added (correlation IDs are already spec'd, `RequestOptions.ts:41-42`), the checklist §14 privacy test must become an automated test. |

## 4. Privacy posture (task 5)

- **Data minimization: verified PASS.** The app collects nothing — no identifiers, no
  analytics (flag `analytics` OFF, `src/types/feature-flags.ts:268-273`), no location, no
  network traffic. The only screen states "No timetable data is available in the app yet"
  (`src/app/index.tsx`).
- **Consent separation (docs only): PASS at plan level.** plan.md 17.7 forbids onboarding from
  hiding/preselecting marketing, location or legal consent; checklist §6 requires separate
  consent; `docs/legal-compliance-matrix.md` row 12 tracks it as a launch blocker (status: Not
  started, owner UNASSIGNED — correct).
- **Permission timing: PASS at plan level.** plan.md 17.5 + checklist §6: foreground location
  only, only for a user-initiated "nearby stations" feature; station search works without it —
  reflected in the types (`StationQuery.near` optional, `src/types/station.ts:257-258`) and in
  the onboarding rule "no permission prompts during onboarding" (checklist §10).
- **No live/official claims: PASS (verified by search and reading).** README "Honest status"
  table; `real-time` provenance is *reserved and unproducible* until DEC-002 is superseded
  (`src/types/provenance.ts:181-191`); a smoke test asserts the placeholder makes no
  live-data/official claims (`tests/smoke/placeholder-screen.test.tsx:89-98`); the scale
  document forbids the 1M-user claim (DEC-011). Nothing in `docs/` or `README.md` claims a
  build, CI run or integration that did not happen.
- **Watch items:** (a) travel intent (recent searches/favourites) is personal data — the
  privacy notice and retention schedule (legal-matrix row 8) must match the 90-day TTL spec;
  (b) crash/error reporting (checklist §7) must arrive with PII scrubbing before it is
  enabled; (c) when the map SDK is chosen (DEC-012), its telemetry/privacy terms are part of
  the GDPR vendor review (legal-matrix row 10).

## 5. Command log (evidence for this review)

| Command | Result |
|---|---|
| `git grep <credential regex> $(git rev-list --all)` (AKIA/ASIA/ghp_/sk-/xox/JWT/PEM/AIza/SG./glpat) | 0 matches |
| keyword scan `api_key\|secret\|token\|password\|credential\|private_key` over all commits | prose/policy only |
| `git remote -v`, `git config --list` | no token in remote URL |
| `npm audit --audit-level=high` | exit **1**; 48 vulns (18 moderate, 30 high, 0 critical) |
| `npm audit --json` (metadata + per-package via/fixAvailable) | 3 root advisories; fix only via breaking downgrades (expo@44.0.6 / react-native@0.72.17 / jest-expo@56.0.0) |
| `npm audit fix --dry-run` | still 48 vulnerabilities — no non-breaking fix resolves anything |
| `npm ls braces node-forge sprintf-js` | chains confirmed (see F-02) |
| `npm view <all 25 direct deps> name version license maintainers` | all exist/intended; MIT except typescript (Apache-2.0) |
| `npm view test-renderer dependencies peerDependencies` | peer dep of RNTL 14.1.0 — intended package |
| GitHub advisory pages GHSA-vfj7-8cjw-p6xm / GHSA-86w9-cpqp-85rv / GHSA-hp3w-g68c-fv3c | all "Patched versions: None" |
| `npm run typecheck` | **pass** (exit 0) |
| `npm run lint` | **pass** (exit 0; 1 warning — F-09) |
| `npm run test:ci` | **pass** (1 suite, 2 tests) |

## 6. Open items owned by humans (not agents)

1. Assign the security/compliance owner (checklist §17) — this review and
   `docs/threat-model.md` need their sign-off (legal-matrix row 18).
2. Decide when the CI `dependency-audit` job becomes required (F-02) and record it in
   `docs/decisions.md`.
3. Legal review of every `NEEDS LAWYER` item before any BDZ data/brand use (unchanged).
