# BDZ Train Companion

Cross-platform (iOS + Android) mobile app for passengers of Bulgarian State
Railways (BDZ), built with React Native + TypeScript and Expo.

**Phase 1 — scaffold and quality gates.** The app currently ships a placeholder
screen only. No features are implemented yet.

## Honest status (read this first)

| Area | Status |
|------|--------|
| Train data source | **Mock-only.** No live BDZ (or third-party) data source is approved. See `docs/decisions.md` DEC-002 and `docs/bdz-integration-review.md`. The app shows **no** timetable data at this stage. |
| Live positions / delays / official BDZ status | **Never claimed.** Any future provider data must carry a visible provenance label: demo / scheduled / cached-stale / real-time (`src/types/provenance.ts`, DEC-006). |
| In-app ticket sales | **Disabled** (feature flag `ticketSales` OFF, mock provider only) until written BDZ authorization and a supported integration exist (DEC-004, plan.md 17.1). |
| Payment card data | Never collected, stored or logged — by design; provider-hosted checkout only (plan.md 17.3). |
| Capacity ("1,000,000 concurrent users") | **No such claim.** Load test not run (DEC-011, `docs/scale-and-load-test-plan.md`). |
| CI | Workflow exists (`.github/workflows/ci.yml`) and the repo was pushed to GitHub on 2026-10-22, so a run **may** have been triggered. **No agent has observed any CI run or its output — treat CI status as UNVERIFIED** and check the repository's Actions tab. |
| iOS / Android builds | **NOT RUN** in this environment (Linux). See [Building](#building). |
| Store submission | Not started. |

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
npm test              # jest (jest-expo preset) — smoke tests
npm run test:ci       # jest --ci (used by CI)
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm run audit:deps    # npm audit --audit-level=high (dependency gate)
```

### Dependency audit

`npm run audit:deps` runs `npm audit --audit-level=high` and exits non-zero on
high/critical advisories. It also runs in CI as an advisory job
(`dependency-audit`, non-blocking for now — see the comment in the workflow).

**Known advisories (verified 2026-10-22, `npm audit --json`):** 48 findings
(18 moderate, 30 high) from 3 unique upstream advisories —
`braces` (stack-exhaustion DoS), `node-forge` (PKCS#1 v1.5 signature
verification), `sprintf-js` (DoS via unbounded precision) — all transitive
through Expo SDK 58 / React Native 0.88 / Jest 30 tooling chains. No
non-breaking fix exists today (`npm audit fix` offers only breaking
downgrades); the security owner must triage/upgrade as upstream patches land.

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
  package name at the provider. Map SDK not selected yet (DEC-012).

## Testing

- `npm test` — Jest with the `jest-expo` preset and React Native Testing
  Library v14 (note: its `render` is **async** — `await render(...)`).
- Tests live in `tests/` (e.g. `tests/smoke/`); shared setup in `src/test/`.
- Current coverage: one smoke test proving the placeholder screen renders and
  makes no live-data/official-status claims. Feature tests arrive with Waves 3+
  (plan.md §11).
- Physical-device testing (Android + iOS) is required before release
  (addbeforerelease.txt §14) and has **NOT RUN** here.

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

**Verification status (2026-10-22):**

- `docker compose config` — **PASSED** (compose file parses and resolves).
- `docker build` — **BLOCKED, NOT RUN**: the Docker daemon on this machine is
  not running (`docker version` shows the client only; `systemctl start docker`
  requires interactive authentication, which an agent must not bypass).
  Therefore `npm ci` inside the image and the Metro-in-container reachability
  check are **NOT RUN** — nobody has seen them work yet.
- Metro itself was verified on the **host** (not in Docker): `expo start` on
  port 8081 answered `curl http://localhost:8081/status` with
  `packager-status:running`, and Android + iOS dev bundles built with HTTP 200
  including the `src/app` placeholder screen (route root `src/app` is
  auto-detected and configured via `app.json` → `expo-router.root`).
- Re-run the container checks on a machine with a running Docker daemon before
  treating the Docker path as verified.

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
docs/           decision log, integration review, compliance, scale plan
scripts/        repo tooling scripts (none yet)
```

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
