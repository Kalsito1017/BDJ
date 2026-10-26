# Release notes — DRAFT

**DRAFT — requires human approval before publishing anywhere (App Store, Play
Store, GitHub, or in-app).** Compiled 2026-10-25 by the docs-release agent.
Version: **0.1.0** (first internal/dev-build release — `app.json`).
Nothing in these notes has been published; no store submission has been made.

---

## 0.1.0 (unreleased — draft)

### What ships

- **Journey search** — pick departure and destination stations, choose a travel
  date, and search. Validation keeps what you typed when a field needs fixing.
- **Results and journey details** — result list with a freshness hint, and a
  detail view with the full leg timeline (including transfers and
  midnight-crossing journeys).
- **Stations** — searchable station list and a map view (development builds
  only) with the required OpenFreeMap/OSM attribution; a labelled placeholder
  where the native map module is unavailable. List view works without any
  location or other permission.
- **Favourites and recent searches** — save routes, re-run past searches;
  everything is stored on your device only and can be deleted at any time.
- **Bulgarian and English** — full interface in both languages (Bulgarian is
  the default), with device-locale detection on first launch.
- **First-launch guide** — a skippable four-step guide, replayable from
  Settings → Help.
- **Honest state handling** — loading, empty, error, offline and retry states
  everywhere, and a visible notice when saved data had to be reset.

### What does NOT ship (by design)

- **No ticket sales.** The app contains no purchase or payment flow. In-app
  ticketing is disabled by a feature flag and stays disabled until written BDZ
  authorization and a supported integration exist. The app never sees payment
  card data.
- **No live data.** There is no live timetable, no delays, no vehicle positions
  and no official service status. **All schedule-like values are clearly
  labelled demo data** and must not be used for travel decisions.
- **No accounts.** No sign-up, no login, no server. Everything you save stays
  on your device.
- **Not an official BDZ product.** This app is independent and is not endorsed
  by Bulgarian State Railways.

### Known limitations

- The map surface renders only in development builds; in this environment no
  map has ever been rendered on a device (native module NOT RUN).
- Device-bound checks are **NOT RUN** so far: VoiceOver/TalkBack behaviour on a
  real device, dynamic text sizes on device, on-device touch targets, and any
  physical-device (Android/iOS) run. Accessibility is code-tested only.
- No Android or iOS build has been produced yet in any environment (Linux host;
  iOS requires macOS/Xcode or EAS). This release exists as source + tests.
- The in-app language switch in Settings is a placeholder; the language follows
  your device locale on first launch and can be changed by that choice only.
- All tests (806 tests / 65 suites, gates green 2026-10-25) were run in a
  Node/Jest environment and must be re-run before release.
- The station dataset is a labelled **demo** set, not a licensed station
  directory.
- "Saved data reset" notices appear only on the Search/Favourites surface.

### Privacy

No data collection, no analytics, no accounts. Favourites, recent searches and
your language choice stay on your device. See `docs/privacy-labels-draft.md`
for the exact facts (it is a draft pending security/legal sign-off).

---

**Publishing checklist (human):** product name confirmed · privacy policy
published · support contact live · human translation review done (bg + en) ·
device QA run (Android + iOS) · legal sign-off on every claim in these notes ·
explicit human approval to publish (rule 10).
