# App store listing — metadata DRAFT

**Status: DRAFT. Every field below requires human and legal approval before it
is used in any store listing. Nothing here has been submitted to Apple or
Google; no store account exists.** Compiled 2026-10-25 by the docs-release
agent from verified code facts only.

Evidence basis: `app.json`, `package.json`, `docs/checklist-status.md`,
`docs/decisions.md` (DEC-002/004/012/027), `docs/privacy-labels-draft.md`.

---

## 1. App title

- **Working name:** `BDZ Train Companion`
- **Status: UNCONFIRMED.** The name is taken from `package.json` / `app.json` /
  README and is flagged in the catalogs as `review.common.app_name`
  ("PRODUCT NAME UNCONFIRMED: … Substitute the approved brand name before
  release", `src/i18n/locales/{bg,en}.json`).
- **Before this can be published:** a human must confirm the product name and
  the legal position of using "BDZ" in a product name (trademark/passing-off
  review — the app must never suggest it is an official BDZ product).

## 2. Subtitle / short description (≤80 chars)

> Plan rail journeys in Bulgaria — demo timetable, stations and map. (DRAFT)

Bulgarian (draft, needs human translation review):

> Планирайте пътувания с влак в България — демо разписание, гари и карта. (DRAFT)

Rules baked in: says **demo**; no "live", "real-time", "official", "buy" or
"tickets" wording (claim lexicon, DEC-016 §5).

## 3. Full description (DRAFT)

> BDZ Train Companion is an independent journey-planning app for rail travel in
> Bulgaria. It is **not** an official Bulgarian State Railways (BDZ) product and
> is not endorsed by BDZ.
>
> What the app does today:
>
> - Search journeys between stations and view results and journey details.
> - Browse a station list and (in development builds) a map with required open
>   map attribution.
> - Save favourite routes and recent searches on your device only.
> - Choose Bulgarian or English.
> - A skippable first-launch guide.
>
> What the app does NOT do:
>
> - **It does not sell tickets.** There is no purchase or payment flow in the
>   app. Ticket sales are disabled by a feature flag pending authorization.
> - **It does not show live departures, delays, positions or official service
>   status.** All schedule-like data shown is clearly labelled **demo data**.
>   It is not a real timetable and must not be used for travel decisions.
>
> Privacy: everything you save (favourites, recent searches, language choice)
> stays on your device. See the privacy labels draft for the full factual
> picture (`docs/privacy-labels-draft.md`).

(Subject to review: wording, length limits per store, and the product name. Do
not add performance, capacity, or "works offline" claims — none are verified.)

## 4. Keywords (DRAFT)

`train, rail, Bulgaria, journey, timetable, stations, map, demo, BDZ`

- Must not include: `official`, `tickets`, `buy tickets`, `live`, `real-time`,
  `delay`, or any word that implies BDZ affiliation or live data.
- Keyword use of the term "BDZ" itself needs legal sign-off (see §1).

## 5. Category

- **Primary:** Travel (iOS) / Maps & Navigation or Travel (Google Play).
- **Secondary (iOS):** Navigation.
- Decision owner: UNASSIGNED [mobile release + product].

## 6. Support contact — **REQUIRED, currently missing**

| Field | Value |
|-------|-------|
| Support URL | **UNASSIGNED — does not exist** |
| Support email | **UNASSIGNED — does not exist** |
| Contact for `security.txt` | **UNASSIGNED** |

Both stores require a working support contact before submission
(checklist §6/§17). Blocked on the operating legal entity being decided
(DEC-013 human decision 4). **This blocks store submission.**

## 7. Privacy policy URL — **BLOCKED**

- **Does not exist.** No privacy policy document is in the repository; a URL
  cannot be published until legal counsel drafts and approves one
  (checklist §1/§6, plan.md 17.8).
- The eventual policy must match what the code actually does — the factual
  basis is `docs/privacy-labels-draft.md` (summary: no data collection, no
  accounts, no analytics, local-only storage).
- **This blocks store submission.**

## 8. Content rating inputs (DRAFT answers)

| Question (both stores, condensed) | Answer |
|-----------------------------------|--------|
| Violence / adult / gambling content | None |
| User-generated content / chat / social | None |
| Shares location | The app **can** request foreground location for a "nearby stations" feature that is **tap-gated and not enabled yet**; location is never stored. Disclose "shares precise location — not linked to identity, not collected" only if the feature ships |
| Shares user data with third parties | No (except unavoidable map-tile requests to OpenFreeMap when the map renders — see privacy labels draft) |
| In-app purchases / digital goods | None (ticket sales disabled) |
| Advertising | None |
| Account creation | None (accounts flag OFF) |
| Web links out | None in the current build. If the "Continue to official BDZ ticketing" link is ever approved (DEC-004 `officialBdzTicketingLink`, OFF), it opens an external browser and must be disclosed in review notes |
| Rating guess | 4+ / PEGI 3 (no objectionable content) — **final rating is the store's decision** |

## 9. Account-deletion path

- **N/A while accounts are disabled** (feature flag `accounts` OFF, DEC-004).
  There is no account and no server-side personal data to delete.
- The app does provide in-app deletion of locally stored favourites and recent
  searches (clear actions with confirmation, DEC-024).
- **If `accounts` is ever enabled**, the store-required account-deletion path
  becomes mandatory at that moment (checklist §3/§6) and this section must be
  rewritten with the real flow.

## 10. Review notes for the stores (DRAFT)

> This app is a demo-labelled journey planner. It contains NO ticket sales and
> NO live data: all schedule-like values are synthetic demo fixtures clearly
> labelled in the UI. It is not affiliated with or endorsed by Bulgarian State
> Railways. No account is required. All user data stays on the device.

## 11. What must NOT appear in any listing or screenshot

- Any claim of being an **official BDZ product** or being endorsed by BDZ
  (checklist §1; the app is not).
- Any **live-data** claims: "live", "real-time", "delays", "positions",
  "on-time", "guaranteed" (rule 6; claim-lexicon guards fail the build if such
  copy enters the catalogs).
- Any **ticket-sale** or payment capability ("buy tickets", "purchase",
  "checkout") — in-app ticket sales are disabled (DEC-004, rule 3).
- Any **capacity claim** ("supports 1,000,000 concurrent users") — load test
  NOT RUN (DEC-011).
- Any screenshot or illustration that does not show the **real** UI
  (checklist §10).
- Any real timetable figures presented as real — fixtures are synthetic.
- Any statement that unverified items are verified (e.g. device testing, store
  approval, CI status — see `docs/checklist-status.md`).

## 12. Open blockers before this draft can become a submission

1. Product name confirmed + trademark position of "BDZ" cleared (legal).
2. Privacy policy published at a stable URL (legal).
3. Support contact + support URL exist (product/ops).
4. ToS for the service (legal).
5. Real-UI screenshots on real devices (device testing is NOT RUN —
   `docs/checklist-status.md` §10/§14).
6. Human translation review of all bg/en copy incl. this listing (§8).
7. Store accounts owned by the company, real bundle IDs replacing
   `com.example.bdztrain` (checklist §1, DEC-014 F-05).
8. Named owners for all §17 roles — and explicit human approval for the store
   submission itself (rule 10: irreversible).
