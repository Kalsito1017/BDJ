# VoiceOver / TalkBack manual test scripts

**Owner:** i18n-a11y agent. **Status:** scripts prepared 2026-10-23.
**NOT EXECUTED in this environment** — this host is Linux with no iOS or
Android device/simulator (rule 8: iOS needs macOS/Xcode or EAS). A human with
devices must run these and record results in §6. Treat every "expected"
below as the *designed* behaviour, not as an observed result.

Scripts cover the flows required by the task brief and
addbeforerelease.txt §10: onboarding, station search, station list
(incl. list/map toggle, nearby, permission denied) and error states.

## 1. Setup

| | iOS | Android |
|---|---|---|
| Screen reader | Settings → Accessibility → VoiceOver → on | Settings → Accessibility → TalkBack → on |
| Next / previous element | Swipe right / left | Swipe right / left |
| Activate | Double-tap | Double-tap |
| Change value / increment | Swipe up / down (adjustable) | Swipe up / down (adjustable) |
| Language | Switch device language between Български and English, **and** switch in-app via Settings → Language (`settings.language`) | same |

Run each script **twice per device**: once with the app language = `bg`, once
= `en`. Expected announcements are quoted as `en / bg` with the i18n key in
brackets. Screens are being built in parallel by mobile-ui / map-stations;
element names below follow the key contract — adjust names only if the
implemented UI differs, and note it in §6.

## 2. Script A — first-launch onboarding

Precondition: fresh install (or Settings → `settings.replay_onboarding`).

1. Launch the app. Focus must land on the first element of step 1, not
   anywhere behind the guide.
2. Read the whole screen element by element. Expected order:
   1. page indicator — "Page 1 of 4" / "Екран 1 от 4" [`a11y.page_indicator`],
   2. title — "Find a train" / "Намери влак" [`onboarding.step1.title`],
   3. body [`onboarding.step1.body`],
   4. "Skip" [`a11y.skip_button_label`] with hint "Skips the intro and goes to
      the app" / "Пропуска въведението и продължава към приложението",
   5. "Next" [`a11y.next_button_label`].
3. Activate Next → step 2 ("Check your trip" / "Провери пътуването").
   The page indicator must be re-announced ("Page 2 of 4"). Body mentions the
   information source (demo / scheduled / cached —
   `onboarding.step2.body`): confirm no wording claims live or real-time
   data.
4. Activate Next → step 3 ("Tickets" / "Билети"). Confirm the announcement
   says purchasing in the app is **not available yet**
   (`onboarding.step3.body`) and promises no purchase path that does not
   exist (rule 3).
5. Activate Next → step 4 ("Map and language" / "Карта и език"). Final CTA
   reads "Start using the app" / "Стартирай приложението"
   [`a11y.start_button_label`].
6. Go back to step 1 and activate **Skip** from there. The guide must close
   and land on search.
7. Relaunch the app: the guide must **not** appear again (completion saved
   locally). Open Settings → Help (`settings.help`) →
   `settings.replay_onboarding`; the guide must reappear from step 1.
8. Confirm no permission dialog appeared at any point during onboarding.

## 3. Script B — station search

1. Open the Search tab. Focus order: search field → results/states.
2. Focus the field. Expected: label "Search for a station" /
   "Търсене на гара" [`a11y.search_input_label`] and hint "Type a station
   name in Cyrillic or Latin" / "Въведете име на гара на кирилица или
   латиница" [`a11y.search_input_hint`].
3. With the on-screen keyboard and a screen reader running, type:
   - Cyrillic input (e.g. `Соф`),
   - Latin input (e.g. `Sof`),
   - mixed input (e.g. `Сof` or `sof `),
   - a name with an apostrophe/hyphen and a long name.
   For each: dictation/typing feedback works, the app does not lose focus,
   results update and each result row announces "Station {name}" /
   "Гара {name}" [`a11y.search_result`] (full name — not truncated for the
   screen reader).
4. Results must carry a provenance announcement: "Information source: Demo
   data" / "Източник на информация: Демо данни"
   [`a11y.provenance_badge` + `provenance.demo`]. No result may be announced
   as live, real-time or "official".
5. Clear the field and search for something with no matches. Expected state:
   "No results for “…”" / "Няма резултати за „…“" [`stations.no_results`]
   with the query spoken, plus a retry/clear action reachable.
6. Navigate back from details to results: focus must return to the result row
   that opened the details (not to the top of the screen).

## 4. Script C — station list, list/map toggle, nearby, permission denied

1. Open the Map tab. The **list alternative must be reachable without any
   location permission** (checklist §9).
2. Focus the list/map toggle: label "View: list or map" / "Изглед: списък или
   карта" [`a11y.list_map_toggle_label`] and state reflecting the current
   view (selected/checked). Switch to the map and back; the announcement must
   change accordingly.
3. In the station list ("Station list" / "Списък с гари"
   [`stations.list_title`]), walk the rows: each announces its official name,
   then its provenance label; the count is announced as "Results: {n}" /
   "Резултати: {n}" [`stations.result_count`].
4. Open a station detail card ("Station details" / "Информация за гара"
   [`stations.detail_title`]). Actions reachable in reading order:
   "Find trains" [`stations.detail.find_trains`], "Add to favourites" /
   "Добави в любими" [`stations.detail.add_favourite`], "Show on the map" /
   "Покажи на картата" [`stations.detail.show_on_map`].
5. Nearby: trigger "Nearby stations" / "Гари наблизо" [`map.nearby_stations`].
   - With permission granted: stations listed near the device.
   - With permission denied (or "Ask" → deny): expected
     "Permission denied" / "Разрешението е отказано"
     [`map.permission_denied`] with body [`map.permission_denied_body`]
     ("Allow the app to see where you are… Station search works without it")
     and an "Open settings" / "Отвори настройките" [`map.open_settings`]
     action. **No prompt loop**: asking again must be possible only after an
     explicit user action.
6. Map attribution is reachable and announced
   (`map.attribution_label` + the provider's attribution text from the
   dataset — never a paraphrase).

## 5. Script D — error and empty states

For each case: the screen announces the state title **and** the actionable
message, and a "Try again" / "Опитай отново" [`common.retry`] button is
reachable. Never a bare "something went wrong" (checklist §7).

| Case | Expected title | Expected message (en / bg key) |
|---|---|---|
| Airplane mode + any search | "No internet connection" / "Няма връзка с интернет" [`states.offline`] | "You are offline. Check your network and try again." / `errors.offline` |
| Slow/hung request (throttle) | "The request timed out" / "Изтече времето за отговор" [`states.timeout`] | `errors.timeout` |
| Provider failure (mock can simulate) | "An error occurred. Please try again." / `states.error` | `errors.upstream_error` or `errors.unknown` |
| Malformed payload (dev build) | `states.error` | `errors.invalid_response` — tells the user to report the problem |
| Empty list (nothing saved yet) | "Nothing to show yet" / "Няма нищо за показване" [`states.empty`] | plus a next action (e.g. go to search) |

Also verify while testing errors:

1. The provenance badge still announces its label (demo/cached) — error
   states must not silently upgrade data trust.
2. Re-trying after restoring connectivity succeeds and the state change is
   announced (polite live region, not an interruption mid-typing).
3. In every language pair tested, no announcement claims "live", "real-time"
   information, "official BDZ" status, positions or delays (rule 6) — except
   the provenance *category* names themselves (see
   `docs/accessibility-checklist.md` §8).

## 6. Recording template (copy per run)

| Field | Value |
|---|---|
| Date / tester | |
| Device + OS | |
| Screen reader + version | VoiceOver / TalkBack — |
| App language | bg / en |
| Script (A–D) | |
| Result | PASS / FAIL |
| Deviations from expected announcements | |
| Screenshots/notes | |

**Pass criteria for the flow:** every step announced with the expected label
or an equivalent in the correct language; focus order as designed; no trap;
all targets ≥ 44 pt (iOS) / 48 dp (Android) — see
`docs/accessibility-checklist.md` §5/§6; both languages complete.

When all four scripts pass on both platforms in both languages, update the
status tables in `docs/accessibility-checklist.md` (§1, §9) with the date,
tester and device — do not mark anything verified without a recorded run.
