# Accessibility checklist — BDZ Train Companion

**Owner:** i18n-a11y agent. **Status of this document:** the accessibility
*contract* and *manual checklist* for Phase 2 (plan.md §8, §17.6;
addbeforerelease.txt §8, §10). What is verified and what is not is stated
per row — nothing here is claimed as tested on a device unless it says so.

Honest status summary (2026-10-23):

| Area | Status |
|------|--------|
| Localised strings (bg/en), key parity, placeholders | **VERIFIED** — `npm test` (`tests/i18n/*`, real output in the agent report) |
| Date/time/number/money formatting incl. DST + midnight crossing | **VERIFIED** — `tests/i18n/formatting.test.ts`, cross-checked against `Intl` where the runtime provides it |
| Accessibility labels/hints available in both languages | **VERIFIED** (keys exist; see table below) |
| Screen-reader behaviour (VoiceOver/TalkBack) | **NOT RUN** — no iOS/Android device or simulator in this environment (Linux; rule 8). Scripts ready: `docs/voiceover-talkback-scripts.md` |
| Contrast ratios, font scaling at device level | **NOT VERIFIED** — needs the theme (mobile-ui) and a device/emulator; measurement steps below |
| Touch target sizes | **NOT VERIFIED** — needs rendered screens; requirement fixed below (§44dp) |

---

## 1. Mapping to addbeforerelease.txt §10 (onboarding and UX)

| Checklist item (§10) | What it means here | Verification | Status |
|---|---|---|---|
| 3–4 screen skippable guide: Find a train / Check your trip / Tickets / Map and language | `onboarding.step1..step4.*` in `src/i18n/locales/{bg,en}.json`; copy follows plan.md §17.7 | Key parity tests | Strings DONE (screens: mobile-ui) |
| Skip, Next, page indicator, "Start using the app" | `onboarding.skip`, `onboarding.next` (via `common.next`), `onboarding.page_indicator` (`{page}`/`{total}`), `onboarding.start_cta` + `a11y.*` twins | Key parity tests | Strings DONE |
| Completion saved locally; reopenable from Settings → Help | `settings.replay_onboarding`, `settings.help`; flag key `SETTINGS_KEYS.onboardingCompleted` exists in `settingsStorage` | storage tests (Phase 1) | Contract DONE (wiring: mobile-ui) |
| No permission prompts during onboarding | Onboarding copy asks for nothing; `map.permission_denied*` explains the map case and states search works without location (plan.md §8) | Copy review | DONE |
| Illustrations/screenshots only if they match the real UI | Onboarding strings describe only implemented behaviour; ticket step says purchasing is **not available** (rule 3) | Copy review | DONE |
| Navigation limited to Search, Map, My trips/Tickets, Settings | `nav.*` contains exactly those 5 labels | Key parity tests | DONE |
| VoiceOver/TalkBack tested on key flows | Manual scripts: `docs/voiceover-talkback-scripts.md` | Device run by a human | **PENDING (blocker: no device here)** |
| Contrast, touch targets, dynamic font scaling verified | Requirements in §4–§6 below | Device/emulator + theme | **PENDING (owner: mobile-ui + QA)** |
| Undo or confirmation for irreversible actions | Deletion copy available (`common.delete`, `common.confirm`); plan.md §8 requires confirmation for destructive actions | Copy review | Strings DONE (behaviour: mobile-ui) |

addbeforerelease.txt §8 (localization) is enforced by `tests/i18n/*` — see
§7 below for the "needs human translation review" register.

## 2. Labels and hints (a11y key inventory)

Use these keys for `accessibilityLabel` / `accessibilityHint`. English and
Bulgarian text is authoritative in `src/i18n/locales/{bg,en}.json`; the
parity test guarantees both exist. `t(key, params)` fills `{…}` placeholders.

| Key | en | bg | Use on |
|---|---|---|---|
| `a11y.tab_search_label` | Search | Търсене | Search tab |
| `a11y.tab_search_hint` | Find stations and trains | Търсене на гари и влакове | Search tab |
| `a11y.tab_map_label` | Map | Карта | Map tab |
| `a11y.tab_map_hint` | Stations on the map and nearby | Гари на картата и наблизо | Map tab |
| `a11y.tab_my_trips_label` | My trips | Моите пътувания | My trips tab |
| `a11y.tab_my_trips_hint` | Your trips and saved routes | Вашите пътувания и запазени маршрути | My trips tab |
| `a11y.tab_tickets_label` | Tickets | Билети | Tickets tab |
| `a11y.tab_tickets_hint` | Tickets and purchases, when available | Билети и покупки, когато са налични | Tickets tab (feature flag OFF) |
| `a11y.tab_settings_label` | Settings | Настройки | Settings tab |
| `a11y.tab_settings_hint` | Language, help and the intro guide | Език, помощ и въведението | Settings tab |
| `a11y.skip_button_label` | Skip | Пропусни | Onboarding Skip |
| `a11y.skip_button_hint` | Skips the intro and goes to the app | Пропуска въведението и продължава към приложението | Onboarding Skip |
| `a11y.next_button_label` | Next | Напред | Onboarding Next |
| `a11y.next_button_hint` | Goes to the next screen | Към следващия екран | Onboarding Next |
| `a11y.start_button_label` | Start using the app | Стартирай приложението | Onboarding final CTA |
| `a11y.start_button_hint` | Closes the intro and opens search | Затваря въведението и отива на търсене | Onboarding final CTA |
| `a11y.page_indicator` | Page {page} of {total} | Екран {page} от {total} | Page indicator (announced on focus/change) |
| `a11y.provenance_badge` | Information source: {label} | Източник на информация: {label} | Every provenance badge (`{label}` = `provenance.*`) |
| `a11y.provenance_badge_hint` | Open details about the data source and freshness | Отворете подробности за източника и давността на данните | Provenance badge |
| `a11y.search_input_label` | Search for a station | Търсене на гара | Station search field |
| `a11y.search_input_hint` | Type a station name in Cyrillic or Latin | Въведете име на гара на кирилица или латиница | Station search field |
| `a11y.search_result` | Station {name} | Гара {name} | Each station search result row |
| `a11y.list_map_toggle_label` | View: list or map | Изглед: списък или карта | List/map toggle (map.* screens) |
| `a11y.list_map_toggle_hint` | Switches between the station list and the map | Превключва между списъка с гари и картата | List/map toggle |

Supporting labels that screens should use as visible text *and* labels:
`stations.search_label`, `stations.detail_title`, `map.nearby_stations`,
`map.attribution_label`, `settings.language`.

## 3. Roles and state

- Tab bar items: `accessibilityRole="tab"` + `accessibilityState={{ selected }}`.
- Buttons: `accessibilityRole="button"`; disabled actions must set
  `accessibilityState={{ disabled: true }}` (never rely on colour alone).
- Search field: `accessibilityRole="search"` (or `"text"` + label) with the
  `a11y.search_input_*` pair.
- Screen titles: `accessibilityRole="header"`.
- Loading spinners: `accessibilityRole="progressbar"` +
  `states.loading`; announce state changes politely (`aria-live` equivalent:
  `AccessibilityLiveRegion` on Android / `accessibilityLiveRegion` where used).
- Errors: announce assertively once per failure, with the *actionable*
  `errors.*` message and a `common.retry` button (checklist §7 — never a bare
  "something went wrong").
- Provenance badges: never colour-only. The badge text itself
  (`provenance.demo|scheduled|cached_stale|real_time`) must be readable and
  announced via `a11y.provenance_badge` (plan.md §8 "avoid false precision").

## 4. Focus order

1. Onboarding: Skip (or page indicator) → screen title → body → Next/Start.
   The reading order must match the visual order on all four steps.
2. Search: field → clear button → results in visual order → states (empty /
   no-results / error) where they appear.
3. Station list: title → search/filter → list items top to bottom (each item
   announces name + provenance label via `a11y.search_result` /
   `a11y.provenance_badge`) → list/map toggle.
4. Map: attribution is reachable; the **list alternative is always reachable**
   (checklist §9 "list/map toggle as the accessible alternative").
5. Modals/bottom sheets trap focus while open and return it to the trigger on
   close. No keyboard/screen-reader trap may outlive its view.
6. Deep links (station → details, per checklist §7/§9) must land focus on the
   new screen's header, not on a random control.

## 5. Contrast and colour (owner: mobile-ui theme)

- Body text: ≥ 4.5:1 against its background; large text (≥ 18.66 px bold /
  24 px regular): ≥ 3:1; interactive borders/icons: ≥ 3:1 (WCAG 2.1 AA).
- Verify every theme colour pair once the theme lands (mobile-ui), including
  pressed/disabled states and the provenance badge colours. Record measured
  ratios here with the tool used (e.g. a contrast checker) — do not mark
  verified without numbers.
- Information must never be conveyed by colour alone (provenance, errors,
  validation).

## 6. Dynamic type and layout expansion

- All text uses the app font scale (`allowFontScaling` on by default; do not
  hard-code font sizes that fight the OS setting).
- Test at 100 % / 130 % / 200 % on both platforms and in **both languages**:
  no clipped labels, no overlapping content, buttons grow vertically.
- Bulgarian words are long: `tests/i18n/cyrillic.test.ts` bounds label
  lengths and bg/en expansion, but the layout must still wrap gracefully —
  `numberOfLines` truncation is acceptable for *station names in dense lists*
  only if the full name is available to screen readers and in details.
- Long station names (Cyrillic, Latin, hyphens, apostrophes — checklist §2)
  must render fully in the station detail card.

## 7. Localization review register (legal / payment / ticket wording)

**Marker convention (this task's choice):** flagged strings carry a
`review.<key>` note in *both* locale files (`src/i18n/locales/bg.json`,
`en.json`) and are listed here. `tests/i18n/locale-parity.test.ts` fails if a
flagged key (exported as `TRANSLATION_REVIEW_KEYS` in `src/i18n/keys.ts`) has
no note, or if a note points at a non-existent key. The notes are English
metadata for humans and are intentionally identical in both files.

Flagged keys (drafted by an AI agent, **must** be reviewed by a qualified
Bulgarian/English human before release — checklist §8):

| Key | Why |
|---|---|
| `onboarding.step3.title`, `onboarding.step3.body` | Ticket/legal wording; must keep saying in-app ticket sales are NOT available (rule 3) and promise no unauthorized purchase path |
| `order_state.*` (10 keys) | Payment/order terminology; must match the authorised provider's wording |
| `ticket_state.*` (6 keys) | Ticket-terms terminology; must match the authorised carrier's wording |
| `common.app_name` (via `review.common.app_name`) | Product name unconfirmed — the working name "BDZ Train Companion" comes from package.json/README; product owner must confirm or replace |

**Rule for new strings:** any string that states terms, prices, refunds,
cancellation rights, data-processing/legal claims or ticket validity rules
must be added to `TRANSLATION_REVIEW_KEYS` and given a `review.*` note in the
same commit. Never machine-translate legal text silently.

## 8. Coordination notes for other agents

- **Claim lexicon (rule 6).** The scaffold smoke test
  (`tests/smoke/placeholder-screen.test.tsx`) forbids words like
  "real-time", "live", "delays", "official", "location" in rendered screen
  text. The provenance vocabulary (`provenance.real_time*`) and the map
  permission copy necessarily touch this lexicon. Guidance:
  - `provenance.real_time`, `provenance.real_time_desc` contain the words
    "real-time"/"в реално време" **as the category name required by
    DEC-006**, and the description explicitly says the data is reserved/not
    shown. These are labels, not claims.
  - `provenance.scheduled_desc` deliberately says "changes during the journey
    are not known" instead of "delays" to keep the lexicon clean.
  - `map.permission_denied_body` deliberately says "see where you are"
    instead of "location/position".
  - Recommendation for the lead: extend the lexicon test with an explicit
    allow-list for provenance badge labels rather than weakening rule 6
    (proposed decision text in the i18n-a11y report).
- **Search input (checklist §8).** Cyrillic, Latin and mixed input must all
  work in station search; the hint text says so
  (`a11y.search_input_hint`, `stations.search_hint`). Matching/normalisation
  is the provider/service layer's job (see `StationQuery` in
  `src/types/station.ts`).
- **Intl/Hermes.** `src/i18n/formatting.ts` does not depend on `Intl` at all
  (own Europe/Sofia offset maths, own number/money formatting) because the
  Hermes `Intl` surface could not be verified on-device from this
  environment. The Node test runtime **does** provide full ICU and the
  implementations are cross-checked against `Intl` in
  `tests/i18n/formatting.test.ts` (see the agent report for the real probe
  output). On-device verification remains a follow-up.

## 9. Verification log

| Date | What was run | Result |
|---|---|---|
| 2026-10-23 | `npm test` (incl. `tests/i18n/*`: parity, placeholders, Cyrillic, formatting/DST/money, runtime, hook) | See agent report for exact output — all i18n suites pass |
| 2026-10-23 | Negative test: deleted `states.offline` from `en.json` + renamed a placeholder in `bg.json` | Parity suite **failed** (4 tests), then passed after restore — proof the gate bites |
| — | VoiceOver/TalkBack manual scripts | **NOT RUN** (no device) |
| — | Contrast measurement | **NOT RUN** (theme not landed yet) |
