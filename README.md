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
| CI | Workflow exists (`.github/workflows/ci.yml`) and the repo was pushed to GitHub on 2026-10-22, so a run **may** have been triggered. **No agent has observed any CI run or its output — treat CI status as UNVERIFIED** and check the repository's Actions tab. |
| iOS / Android builds | **NOT RUN** in this environment (Linux). See [Building](#building). |
| Store submission | Not started. Drafts only: `docs/store-metadata-draft.md`, `docs/privacy-labels-draft.md`, `docs/release-notes-draft.md` (all require human/legal approval). |
| Tests | **806 tests / 65 suites, gates green 2026-10-25** (`npm run typecheck` PASS, `npm run lint` 0 problems, `npm run format:check` PASS — DEC-027). Must be re-run before release. Device testing **NOT RUN**. |
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
npm run audit:deps    # npm audit --audit-level=high (dependency gate)
```

### Dependency audit

`npm run audit:deps` runs `npm audit --audit-level=high` and exits non-zero on
high/critical advisories. It also runs in CI as an advisory job
(`dependency-audit`, non-blocking for now — see the comment in the workflow).

**Known advisories (re-verified 2026-10-24, `npm audit --json` — DEC-019
re-baseline):** 5 high-severity findings from 2 unique upstream advisories —
`node-forge` (GHSA-86w9-cpqp-85rv, transitive via
`@expo/code-signing-certificates`, **no patch available**) and a `zod`
advisory (GHSA-mrhx-c7xc-m3w5) affecting only `@expo/cli`'s nested
`zod@3.25.76` build tooling — the app's direct `zod@4.6.7` is patched. Two
advisories in the original 2026-10-22 baseline (`braces`, `sprintf-js`) were
withdrawn upstream on 2026-10-22/23. No non-breaking fix exists
(`npm audit fix` offers only breaking downgrades; **never** run
`npm audit fix --force`); re-baselining the CI audit gate is a decision for the
security owner (UNASSIGNED).

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
- Current coverage: **806 tests / 65 suites, all passing (2026-10-25, DEC-027)**
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

**Verification status (2026-10-24):**

- `docker compose config` — **PASSED**.
- `docker compose build` — **PASSED** (image `bdj-mobile`; `npm ci` runs during
  the image build). Note: the first build attempt crashed this host's Docker
  daemon at a `RUN chown -R node:node /app` layer; the Dockerfile now uses
  `COPY --chown=node:node` + `USER node` (same non-root result, lighter layer —
  DEC-020).
- Gates inside the container (`docker compose run --rm mobile ...`) — **PASSED**:
  `npm run typecheck`, `npm run lint`, `npm test` → **435 passed / 435 in 35
  suites** (2026-10-24; the host suite has since grown to **806 tests / 65
  suites** — re-run the container gates before trusting this number here). Two
  tests needed explicit 20s timeouts (they exceeded Jest's 5s
  default under container CPU load — recorded as a defect + fix, DEC-020).
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
- `docs/decisions.md` — architecture decision log (DEC-001 … DEC-027).
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

CI status is **UNVERIFIED**: the repository was pushed to GitHub on 2026-10-22,
which may have triggered runs, but no agent has seen any run or its output.
Check the Actions tab before trusting CI. All credentials belong in GitHub
Actions secret storage; none are needed for the quality job.

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
