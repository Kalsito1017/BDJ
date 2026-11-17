# BDZ Train Companion

Cross-platform (iOS + Android) mobile app for passengers of Bulgarian State
Railways (BDZ), built with React Native + TypeScript and Expo.

**Status: features implemented through Phase 7 hardening (search → results →
details, stations list/map, favourites/recents, bg+en, onboarding) — all
against the mock provider. Not released.** See `docs/checklist-status.md` for
the production-readiness tracker (currently **NO-GO** for public release:
human/legal items outstanding) and `CHANGELOG.md` for what changed per phase.

## Honest status (read this first)

| Area | Status |
|------|--------|
| Train data source | **Mock-only.** No live BDZ (or third-party) data source is approved. See `docs/decisions.md` DEC-002 and `docs/bdz-integration-review.md`. All schedule-like values shown in the app are **labelled demo data**. |
| Live positions / delays / official BDZ status | **Never claimed.** Any future provider data must carry a visible provenance label: demo / scheduled / cached-stale / real-time (`src/types/provenance.ts`, DEC-006). |
| In-app ticket sales | **Disabled** (feature flag `ticketSales` OFF, mock provider only) until written BDZ authorization and a supported integration exist (DEC-004, plan.md 17.1). |
| Payment card data | Never collected, stored or logged — by design; provider-hosted checkout only (plan.md 17.3). |
| Capacity ("1,000,000 concurrent users") | **No such claim.** Load test not run (DEC-011, `docs/scale-and-load-test-plan.md`). |
| CI | **Human-observed 2026-11-17** (commit `b6ccea0`): the quality job (`install, typecheck, lint, test`) **passed in ~2 min**; the advisory `dependency-audit` job **failed** on the `picomatch` no-fix advisory (DEC-030); Android/iOS placeholder jobs were skipped by design. No agent has seen the raw log — the status comes from the human-supplied Actions screenshot. |
| iOS / Android builds | **NOT RUN** in this environment (Linux). See [Building](#building). |
| Store submission | Not started. Drafts only: `docs/store-metadata-draft.md`, `docs/privacy-labels-draft.md`, `docs/release-notes-draft.md` (all require human/legal approval). |
| Tests | **811 tests / 67 suites, gates green 2026-11-17** (`npm run typecheck` PASS, `npm run lint` 0 problems, `npm run format:check` PASS — DEC-031). Must be re-run before release. Device testing **NOT RUN**. |
| Product name | "BDZ Train Companion" is a **working name, UNCONFIRMED** (`review.common.app_name` in the locale catalogs). |
| Release readiness | **NO-GO for public release** — see `docs/checklist-status.md` (authorization, legal review, translation review, named human owners all open). |

## Prerequisites

- **Node.js** `^22.13 || ^24.3 || ^26.0` (Expo SDK 58 engine range).
  - The Docker image pins **Node 24.x LTS ("Krypton")**, the current LTS line
    as verified on <https://nodejs.org/dist/index.json> on 2026-10-22.
  - The authoring host runs Node 26.7.0 ("Current", not yet LTS); both work.
- **npm** 11.x (lockfile is `package-lock.json`, commit it always).
- For native runs: Android Studio + JDK 17 (Android), and **macOS + Xcode**
  (iOS — Linux/Docker cannot build iOS, see below).
- Optional: Docker + Docker Compose for the containerized tooling.

## Setup

```sh
npm ci          # reproducible install from package-lock.json
cp .env.example .env   # optional; safe placeholders only
npm start       # Expo/Metro dev server (default port 8081)
```

Run on a platform (requires the corresponding native toolchain):

```sh
npm run android   # expo run:android — needs Android SDK/JDK; NOT RUN on Linux here
npm run ios       # expo run:ios — needs macOS + Xcode; NOT RUN here
```

## Quality gates

Run these after every meaningful change (AGENTS.md):

```sh
npm run typecheck     # tsc --noEmit, strict mode
npm run lint          # eslint (eslint-config-expo + prettier)
npm test              # jest (jest-expo preset)
npm run test:ci       # jest --ci (used by CI)
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm run audit:deps    # dated audit-diff gate (fails on new high/critical roots)
npm run audit:raw     # raw npm audit --audit-level=high output
```

### Dependency audit

`npm run audit:deps` runs `scripts/audit-gate.mjs`, a dated audit-diff gate: it
fails on any **new high/critical root advisory**, while known no-fix roots are
allow-listed with an owner, reason and expiry
(`scripts/audit-allowlist.json`, DEC-031). Critical advisories are never
allow-listable. `npm run audit:raw` still prints the raw
`npm audit --audit-level=high` output. The gate runs in CI as an advisory job
(`dependency-audit`, non-blocking for now — see the workflow comment).

**Known advisories (re-verified 2026-11-17, `npm audit --json` — DEC-030):**
**78 findings — 65 high / 13 moderate / 0 critical**. `node-forge` was patched
to 1.4.3 through an npm override (was 1.4.0; the `@expo/cli` range is
`^1.4.0`), which removed that high root. The remaining high findings are two
roots, both **build/dev tooling, not imported by `src/` and not in the app
bundle**:

- `picomatch` **GHSA-fc5q-39xc-vjpf** — affected **≤ 4.0.7**, patched versions:
  **none** (latest is 4.0.7). It cascades through Jest/Metro/Expo. No safe
  upgrade exists today.
- `zod` **GHSA-mrhx-c7xc-m3w5** — only the nested `@expo/cli@58.1.14`
  `zod@3.25.76`; the app's direct `zod@4.6.7` is patched. The CLI fix is
  `@expo/cli@58.1.21`, which pulls a new native Metro toolchain package
  (`noxcturnal`) that cannot be build-tested in this environment — deferred.

Moderate `glob`/`minimatch` findings are also tooling-only. **Do not run
`npm audit fix --force`**: it proposes Expo 52 / Jest 29 / React Native 0.83
downgrades and does not fix `picomatch`. The two remaining high roots are
allow-listed until **2026-12-31** with a documented owner and reason (DEC-031);
the gate fails on any new high/critical root, so this is not a blanket
suppression. The quality gate is green.

## Environment variables

See `.env.example`. Rules (plan.md §7, addbeforerelease.txt §5):

- **Every `EXPO_PUBLIC_*` value is PUBLIC** — it is compiled into the client
  bundle. Never put secrets there.
- `.env` is git-ignored. Signing material (keystores, `.p12`, provisioning
  profiles, `google-services.json`, `GoogleService-Info.plist`) is git-ignored
  and must live only in CI secret storage / secure stores.
- `EXPO_PUBLIC_TRAIN_API_BASE_URL` is intentionally empty: no live data source
  is approved (DEC-002).
- `EXPO_PUBLIC_MAP_SDK_KEY` is a public identifier; restrict it by bundle id /
  package name at the provider. **No map key exists today**: the map stack is
  MapLibre React Native + OpenFreeMap (keyless) — DEC-012 (decided by the human
  owner 2026-10-24).

## Testing

- `npm test` — Jest with the `jest-expo` preset and React Native Testing
  Library v14 (note: its `render` is **async** — `await render(...)`).
- Tests live in `tests/` (unit, component, integration against the mock
  provider, plus in-app e2e smoke and an accessibility sweep); shared setup in
  `src/test/`.
- Current coverage: **811 tests / 67 suites, all passing (2026-11-17, DEC-031)**
  — re-run before release. This is a Jest/Node environment result; it is **not**
  device testing.
- Physical-device testing (Android + iOS) is required before release
  (addbeforerelease.txt §14) and has **NOT RUN** here. VoiceOver/TalkBack
  behaviour is code-tested only (`docs/voiceover-talkback-scripts.md` await a
  human device session).

## Building

### Android

Two supported paths (choose one and record the decision in
`docs/decisions.md` before first release):

```sh
# (a) Local native build — needs Android SDK + JDK 17 (NOT RUN in this env)
npm run android                        # expo run:android (debug/dev client)
npx expo prebuild -p android           # generate native project
cd android && ./gradlew assembleRelease   # release APK/AAB (unsigned until signing is configured)

# (b) EAS Build (cloud) — requires an Expo account + EAS token in CI secrets
npx eas build -p android --profile preview
```

**Status: NOT RUN** in this Linux environment. No Android build has been
completed by the agents to date.

### iOS (macOS/Xcode or EAS only)

Docker on Linux **cannot** build iOS or run the iOS Simulator (plan.md §2).
Supported paths:

```sh
# (a) Mac with Xcode (NOT RUN in this environment)
npm run ios                            # expo run:ios — builds and opens the iOS Simulator
npx expo prebuild -p ios               # generate Xcode project
xcodebuild -workspace ios/*.xcworkspace -scheme <scheme> -archivePath build/app.xcarchive archive

# (b) EAS Build (cloud macOS infrastructure; EAS quotas/costs UNVERIFIED — DEC-001)
npx eas build -p ios --profile preview
```

**Status: NOT RUN** in this environment. No iOS build, simulator run or signing
has been performed.

## Docker

Docker provides a repeatable Node toolchain — nothing more.

**Intended scope (verification status below):**

- `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` inside the container
- the Expo/Metro dev server published on `http://localhost:8081`
  (`curl http://localhost:8081/status` → `packager-status:running`)

**Verification status (last verified 2026-11-17):**

- `docker compose config` — **PASSED**.
- `docker compose build` — **PASSED** (image `bdj-mobile`; `npm ci` runs during
  the image build). Note: the first build attempt crashed this host's Docker
  daemon at a `RUN chown -R node:node /app` layer; the Dockerfile now uses
  `COPY --chown=node:node` + `USER node` (same non-root result, lighter layer —
  DEC-020).
- Gates inside the container — **PASSED 2026-11-17** after rebuilding
  `bdj-mobile` and using a fresh dependency volume: `npm run typecheck`,
  `npm run lint`, `npm run format:check`, `npm test` → **810 passed / 810 in 66
  suites** (55.57 s; DEC-029). The 2026-10-24 run was 435/435 in 35 suites
  (DEC-020); two tests needed explicit timeouts under container CPU load.
- Metro reachability from the host — **PASSED**: `docker compose up -d`, then
  `curl http://127.0.0.1:8081/status` → `packager-status:running`. The port is
  published on loopback only per security finding F-01; change the compose
  mapping to `'8081:8081'` deliberately (and only on a trusted LAN) when
  testing on a physical device.
- Metro on the **host** was verified earlier: `expo start` answered
  `curl http://localhost:8081/status` with `packager-status:running`, and
  Android + iOS dev bundles built with HTTP 200 including the placeholder
  screen (route root `src/app`).

**Out of scope — will NOT work and is not claimed:**

- iOS builds or the iOS Simulator (impossible on Linux)
- Android emulator UI / interactive on-device testing (an Android build stage
  in Docker is possible but is not configured or verified here)
- production deployment; this compose stack is **local development only**
  (DEC-011)

```sh
docker compose up --build      # dev server on http://localhost:8081
curl http://localhost:8081/status
docker compose run --rm mobile npm test     # gates inside the container
docker compose down -v
```

**Stale dependency volume.** The named `mobile_node_modules` volume is copied
from the image when it is first created and is **not** refreshed by
`docker compose build`. After a lockfile change, a stale volume can shadow the
new image (symptom: `Cannot find module '@tanstack/react-query'` and similar).
Reset the dev-only dependency cache with `docker compose down -v`, then re-run
the gates. `mobile_node_modules` holds dependencies only — never app data,
signing material or secrets.

Note: `npm` 11.19 blocks install scripts by default (`unrs-resolver`,
`@parcel/watcher` warnings during `npm ci`); this does not affect the gates
above. Metro file watching in the container may fall back to polling.

## Project layout

```
src/app/        Expo Router routes (root configured in app.json: expo-router.root)
src/components/ reusable UI (Wave 3)
src/features/   feature modules (Wave 3+)
src/services/   TrainDataProvider / TicketingProvider seams (Phase 0 specs)
src/types/      domain models (Phase 0 specs)
src/test/       shared test setup
tests/          test suites (jest)
docs/           decision log, integration review, compliance, scale plan, release docs
scripts/        repo tooling scripts (none yet)
```

## Documentation map

- `docs/checklist-status.md` — status of **every** `addbeforerelease.txt`
  checklist item (sections 1–17 + GO/NO-GO) with evidence and owners.
- `docs/decisions.md` — architecture decision log (DEC-001 … DEC-031).
- `docs/release-notes-draft.md` — 0.1.0 release notes (**draft**).
- `docs/store-metadata-draft.md` — app-store listing metadata (**draft**).
- `docs/privacy-labels-draft.md` — App Store privacy labels / Play data safety
  (**draft**).
- `CHANGELOG.md` — per-phase change summary (**draft**).
- `docs/bdz-integration-review.md`, `docs/legal-compliance-matrix.md`,
  `docs/threat-model.md`, `docs/security-privacy-review-*.md`,
  `docs/map-sdk-comparison.md`, `docs/station-dataset-licensing.md`,
  `docs/scale-and-load-test-plan.md`, `docs/accessibility-checklist.md`,
  `docs/voiceover-talkback-scripts.md`.

Everything marked **draft** requires human/legal approval before it goes
public.

## Continuous integration

`.github/workflows/ci.yml` runs on every PR/push to `main`:

1. `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:ci` (required)
2. `npm run audit:deps` (advisory, see above)
3. Android and iOS build **placeholder** jobs — disabled, never run, exit
   non-zero by design until a human configures a real build path + signing secrets.

CI status (human-observed 2026-11-17, commit `b6ccea0`): the **quality job
passed** (`npm ci`, typecheck, lint, format, tests — ~2 min). The advisory
`dependency-audit` job failed on that run because the audit gate did not exist
yet; DEC-030/DEC-031 now patch `node-forge` and add the dated gate, so the next
push should turn it green without hiding new advisories. Android/iOS
placeholders are skipped by design. The raw log has not been reviewed by an
agent; confirm the next run in the Actions tab. All credentials belong in
GitHub Actions secret storage; none are needed for the quality job.

## Security and compliance notes

- Never commit secrets; any secret that appears in an agent session is treated
  as leaked and must be rotated (addbeforerelease.txt §5/§16).
- The app is **not** an official BDZ product. BDZ authorization status:
  none obtained (see `docs/bdz-integration-review.md`).
- Legal/GDPR/store compliance work is tracked in
  `docs/legal-compliance-matrix.md` and is owned by humans (addbeforerelease.txt
  §17), not by agents.

## License

Apache-2.0 (see `LICENSE`).
