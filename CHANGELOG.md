# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project follows
Semantic Versioning once it releases.

This file is **agent-maintained and describes only what is verified in this
repository** (see `docs/decisions.md` for evidence and
`docs/checklist-status.md` for release readiness). It is a **draft requiring
human review before any public release**. Dates are the dates recorded in the
decision log.

## [Unreleased] — 0.1.0 in development

### Added

- **Phase 0 — discovery and decisions (2026-10-22).** Architecture decision log
  (`docs/decisions.md`, DEC-001…DEC-013): Expo SDK 58 + Expo Router workflow;
  mock-only data source until a lawful source is documented (DEC-002); no
  backend without a verified need (DEC-003); feature flags with `ticketSales`
  OFF (DEC-004); domain model with provenance labelling (demo / scheduled /
  cached-stale / real-time), UTC + Europe/Sofia time conventions and integer
  minor-unit money (DEC-006); `TrainDataProvider`/`TicketingProvider` seams with
  timeout/cancel/bounded-retry semantics (DEC-007); order-state-machine spec
  (DEC-008); dependency policy (DEC-009); capacity-claims policy (DEC-011).
  Research documents: `docs/bdz-integration-review.md`,
  `docs/legal-compliance-matrix.md`, `docs/map-sdk-comparison.md`,
  `docs/station-dataset-licensing.md`, `docs/scale-and-load-test-plan.md`.
- **Phase 1 — scaffold and quality gates (2026-10-22; Docker verified
  2026-10-24, DEC-020).** TypeScript (strict) + Expo scaffold; ESLint, Prettier,
  Jest (jest-expo) quality gates; CI workflow (`.github/workflows/ci.yml`,
  runs unobserved — UNVERIFIED); Docker toolchain with a non-root image and
  loopback-only Metro; `tests/` baseline.
- **Phase 2 — design system, navigation, i18n, onboarding (2026-10-23,
  DEC-015/DEC-016).** Light+dark token theme with WCAG-AA contrast asserted by
  tests; routes `/`, `/search`, `/map`, `/trips`, `/settings`, `/onboarding`;
  skippable 4-step first-launch guide (no permission prompts, replayable from
  Settings → Help); loading/empty/error/offline/timeout UI states;
  bg + en catalogs with naming rules, parity/length/Cyrillic guards and a
  claim-lexicon that keeps rule-6 copy honest.
- **Mock data layer (2026-10-23, DEC-017).** Zod boundary schemas; deterministic
  `MockTrainDataProvider` with scenario switching (success/empty/malformed/
  timeout/upstream_error/offline/rate_limited) and synthetic fixtures
  (transfers, midnight crossings, null times, long/Cyrillic names).
- **Phases 3–4 — search flow and data access (2026-10-24, DEC-021/DEC-022).**
  TanStack Query hooks over the provider seam with a single retry layer and
  cache/staleness policy; journey search form with validation (from ≠ to, date
  window Europe/Sofia, typed values retained), station picker, results and
  details screens; deep-link route contract with validated route params.
- **Phase 5 — map, favourites, resilience (2026-10-24, DEC-024).** MapLibre
  React Native + OpenFreeMap (no API key) with required attribution in every map
  state and a graceful labelled fallback; local store for favourites and recent
  searches (versioned snapshot, re-validation, TTL/caps, user deletable);
  offline banner and stale hints; list/map toggle works without permissions.
- **Phase 7 — hardening (2026-10-25, DEC-027).** Store-corruption notices
  surfaced in the UI (`StoreNoticesBanner`); in-app end-to-end smoke over the
  real router/hooks/store; accessibility sweep over key flows (accessible
  names, role announcements); docs for VoiceOver/TalkBack device sessions.

### Fixed

- **2026-10-24 (DEC-020):** Docker build layer that crashed the daemon on this
  host (`chown` over `node_modules`) replaced with `COPY --chown`; two
  flaky-under-load tests given explicit timeouts.
- **2026-10-24 (DEC-023):** missing `journey_results.empty_title` key (raw key
  on the empty state); retry buttons that did not retry; deep links bypassing
  form validation; a11y label on journey cards.
- **2026-10-25 (DEC-025/DEC-026):** favourites eviction policy was inverted
  (kept oldest instead of newest); write-vs-hydrate race could silently lose
  saved data (merge + disk heal, sortOrder rebase); map attribution missing in
  the fallback state; hostile deep-link ids could crash a press handler; phantom
  privacy-test comments corrected with a real allowlist test.

### Security

- No secrets found anywhere (working tree, full Git history, git config — scans
  recorded in `docs/security-privacy-review-*.md`); nothing to rotate.
- Dependency audit baseline: 5 high-severity findings from 2 transitive
  advisories (`node-forge`, nested `zod@3` in Expo CLI tooling), no patched
  versions available for `node-forge`; `npm audit fix --force` is forbidden
  (DEC-019). Re-baselining the CI audit gate is a security-owner task.
- Threat model (`docs/threat-model.md`) written and kept current.

### Known limitations (honest)

- No Android/iOS build, simulator or physical-device run has ever been
  performed (Linux host; iOS = macOS/Xcode or EAS). Accessibility is code-tested
  only — no screen reader has been run.
- CI runs are UNVERIFIED (nobody has observed one).
- Train data is demo-only; ticket sales are disabled; there are no accounts.
- Human items outstanding: translation review, legal review, named role owners
  (see `docs/checklist-status.md` — currently **NO-GO** for public release).

[Unreleased]: https://github.com/Kalsito1017/BDJ/compare/main...HEAD
