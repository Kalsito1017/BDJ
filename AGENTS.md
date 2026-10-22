# BDZ Train Companion App — Project Agent Constitution

This file applies to EVERY agent working in this repository. The orchestrating
lead agent prompt is in `.opencode/agents/lead.md`; the specialist subagents are
in `.opencode/agents/`.

## Before any work

Read, in this order:

1. `plan.md` — product scope, architecture, phases, section 17 expansions
2. `addbeforerelease.txt` — the agent production checklist (this repo's copy of
   "agent-production-checklist.txt"; see `docs/decisions.md` DEC-010)
3. `docs/decisions.md` — running decision log

If sources conflict, the stricter rule wins; record the conflict in
`docs/decisions.md`.

## Non-negotiable rules

1. Never invent APIs, endpoints, schedules, credentials, integration status or
   test results. If unknown: say so, document it, and use a mock.
2. No scraping, no reverse engineering of private BDZ endpoints, no automating
   browser sessions to simulate an integration. Public documentation is not
   permission. Unofficial third-party feeds (e.g. community GTFS mirrors) are
   not a lawful source (DEC-013).
3. In-app ticket sales stay DISABLED (feature flag `ticketSales` OFF, mock
   provider only) until written BDZ authorization and a supported integration
   exist. Provide only a clearly labelled link to the official BDZ portal if
   product/legal approve it.
4. Never collect, store or log payment card data. Provider-hosted checkout only.
5. Never claim a build, test, deployment, store submission or load-test result
   unless it was actually run and you saw the output.
6. Never claim live positions, live delays or official BDZ status. Always
   distinguish demo / scheduled / cached-stale / real-time.
7. No secrets in code, Git history, the app bundle or chat. `EXPO_PUBLIC_*` and
   map SDK keys are public. If a secret appears anywhere, flag it for rotation.
8. Docker cannot build iOS on Linux. Never promise the iOS Simulator inside a
   container. iOS = Mac/Xcode, macOS CI, or EAS Build.
9. Do not state "supports 1,000,000 concurrent users" until the agreed load
   test passed in a representative environment.
10. Irreversible actions (production deploys, data deletion, payments, store
    submission, rotating/deleting credentials) require explicit human approval.
11. Do not rewrite unrelated files. Do not add dependencies without checking
    current stable versions, compatibility, maintenance status and license.
12. Verify that every package you install exists and is the intended one.

## Phase order (do not skip gates)

Phase 0 Discovery and decisions → Phase 1 Scaffold and quality gates →
Phase 2 Design system, navigation, i18n (bg + en) and onboarding →
Phase 3 Station search and journey search → Phase 4 Provider integration
(mock first) and results/details → Phase 5 Map, favourites, recent searches,
resilience/offline → Phase 6 Auth/accounts (only if approved) and ticketing
(mock only) → Phase 7 Test and harden → Phase 8 Build and release.

## Quality gates (after every meaningful change)

`npm ci`, `npm run typecheck`, `npm run lint`, `npm test`; where relevant:
Android build, iOS build on macOS/EAS, accessibility spot check
(VoiceOver/TalkBack), both languages.

## Required report format (every agent, every task)

1. Summary (2-4 sentences)
2. Files changed (paths)
3. Commands run and their real results (pass/fail, key output)
4. Not done / blockers / assumptions
5. Risks or follow-ups for other agents

Reports without real command output for claimed checks are rejected.
