# Station dataset licensing — how station names/coordinates may lawfully enter the app

**Date of research: 2026-10-23.** Prepared by the map-stations specialist agent.
Companion to `docs/map-sdk-comparison.md` and input to DEC-012 ("licensed station
dataset" is an explicit prerequisite of the `mapStationDiscovery` feature flag,
DEC-004).

**Evidence labels (every factual claim carries one):**

- **[verified from source — URL, 2026-10-23]** — observed directly in the cited
  public source on that date.
- **[assumption]** — inference/judgement of this agent; not observed in a source this
  session. Items marked **NEEDS LAWYER** require qualified Bulgarian/EU legal review
  before any decision relies on them.

**Standing project rules:** no scraping; no reverse engineering; unofficial
third-party GTFS mirrors are **not** a lawful source (DEC-013); station data may only
come from a verified, licensed dataset (addbeforerelease.txt §9); the UI must show
only verified data and must carry provenance labels (DEC-006, rule 6).

---

## 0. Current status (what the app ships today)

- **No licensed station dataset exists for this project.** The Phase 0 discovery
  record found no official BDZ API, open-data feed or GTFS publication, and the only
  published BDZ data-sharing arrangement found is a 2019 licensed agreement with
  Google Maps. **[verified from source — docs/bdz-integration-review.md §§3–8,
  2026-10-22, re-read 2026-10-23]** Appendix C of docs/decisions.md lists the
  licensed station dataset as **UNVERIFIED**.
- Consequently the station feature ships with a **synthetic DEMO dataset**
  (`src/features/stations/data/demoStations.ts`), every record carrying `demo`
  provenance and rendered with a mandatory demo label. The demo names are invented
  ("Демо гара …") and are **not** real BDZ stations, real coordinates or timetable
  data. **[verified from source — the fixture file in this repository, 2026-10-23]**
- Nothing in the app may claim a station name/coordinate is official BDZ data until a
  licensed dataset exists. (rule 6; plan.md §17.5 "verified data only")

---

## 1. Option A — a licensed / official BDZ station dataset (PREFERRED)

What exists today:

- BDZ publishes browser-facing services (timetable search at razpisanie.bdz.bg,
  ticketing at bileti.bdz.bg, live board, radar) but **no machine-readable station
  dataset, API terms or data-reuse licence were found** on its sitemap or
  "Access to information" section. **[verified from source —
  docs/bdz-integration-review.md §3 #7/#8 and §4, 2026-10-22]**
- BDZ's "Access to information" section contains only a 2021 FOI report and **no
  data-reuse licence or open-data terms**. **[verified from source —
  docs/bdz-integration-review.md §3 #8, 2026-10-22]**
- BDZ demonstrably licenses its timetable data contractually (Google Maps agreement,
  March 2019). **[verified from source —
  https://holding.bdz.bg/bg/novini/razpisanieto-na-bdj-veche-i-v-google-maps.html via
  docs/bdz-integration-review.md §6, 2026-10-22]** The inference that BDZ would
  license a station list to this app, and on what terms/fees, is
  **[assumption — unknown; no contact has been made. NEEDS LAWYER]**

Route to obtain it (human decision, DEC-013 "Human decisions required" #2/#5):

1. Written request to the correct BDZ entity ("BDZ – Passenger Services" EOOD vs
   "Holding BDZ" EAD — ownership is **[assumption/unknown, docs/bdz-integration-review.md §7.5]`)
   asking for a **station directory licence** (names, official display form,
   optional aliases, coordinates, station kind, update cadence).
2. The licence must state at minimum: permitted uses, redistribution of a bundled
   extract, attribution wording, update cadence, warranty of accuracy, term and
   termination consequences for already-shipped app versions. **[assumption — this
   is the checklist we should bring to the negotiation; NEEDS LAWYER]**
3. Alternative lawful route: a Bulgarian access-to-public-information / open-data
   reuse request (FOI). Whether this can yield reusable timetable/station data, and
   under which licence, is explicitly unresolved.
   **[assumption — docs/bdz-integration-review.md §11.4. NEEDS LAWYER]**

Database-rights caution: whether BDZ timetables/station lists attract the EU
sui-generis database right, and whether a station directory built from any source
infringes it, is **NEEDS LAWYER** (docs/bdz-integration-review.md §11.3).

**Assessment: the only source that satisfies "verified, licensed station dataset"
for *BDZ* stations without legal risk. Blocked on human action (contact + licence).**

---

## 2. Option B — OpenStreetMap-derived station data (conditional fallback)

OSM is the only broadly available, openly licensed candidate found. Its obligations
are real and must be spelled out before use.

### The obligations, spelled out (from primary sources)

1. **Licence:** OSM data is licensed under the **Open Database License (ODbL) 1.0** by
   the OpenStreetMap Foundation. **[verified from source —
   https://www.openstreetmap.org/copyright and
   https://osmfoundation.org/wiki/Licence, 2026-10-23]**
2. **Attribution is mandatory.** "Where you use OpenStreetMap data, you are required
   to do the following two things: Provide credit to OpenStreetMap by displaying our
   attribution notice. Make clear that the data is available under the Open Database
   License." For a browsable map the credit normally appears on the map corner; a
   link to https://www.openstreetmap.org/copyright makes the ODbL notice clear; where
   links are impossible, print the full URL. **[verified from source —
   https://www.openstreetmap.org/copyright, 2026-10-23]**
3. **Share-alike.** "If you distribute our data onwards to third parties, you must do
   so under the ODbL license… The same applies for any Derivative Database you
   create." A **Collective Database**'s other parts may be licensed freely. For
   **Produced Works** (e.g. an app screen rendering the data) you may choose any
   licence, **but** "any recipient to which you make the Produced Work available can
   ask for a copy of both: our data and any Derivative Database you use in connection
   with that Produced Work. You are required to provide these, if requested." If you
   made no changes, referring users to openstreetmap.org suffices. Internal-only use
   triggers no sharing. **[verified from source —
   https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ §1.7.1, 2026-10-23]**
4. **What "Derivative Database" means for a station extract** (a filtered cut of OSM
   `railway=station`/`public_transport=station` objects for Bulgaria) is governed by
   OSMF's Horizontal Layers / Regional Cuts / Collective Database guidelines.
   **[verified from source — the FAQ references those guidelines,
   https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ, 2026-10-23]** The
   classification of *our* extract is **[assumption — likely a Derivative Database
   (a "regional cut"), which would make the extract itself share-alike under ODbL.
   NEEDS LAWYER]**.
5. **OSM provides no free tile API for third parties** (relevant to map display, see
   `docs/map-sdk-comparison.md`): "we cannot provide a free-of-charge map API or map
   tiles for third-parties". **[verified from source —
   https://www.openstreetmap.org/copyright, 2026-10-23]**
6. **Accuracy:** OSM is community-maintained; names/coordinates may be wrong,
   outdated, or recorded in mixed scripts. Presenting OSM station data as "BDZ
   official" would be a false claim regardless of licence.
   **[assumption — quality judgement. The app would label it
   "OSM-derived, unverified against BDZ data".]**

### Attribution text that would be required (assumption — needs legal review)

For the station list/detail screens (data attribution):

> Station data © OpenStreetMap contributors. Data available under the Open Database
> License (ODbL), https://www.openstreetmap.org/copyright

For a map view additionally (verified wording from openfreemap.org when using
OpenFreeMap tiles):

> OpenFreeMap © OpenMapTiles Data from OpenStreetMap

Plus, if the extract is a Derivative Database and is redistributed (e.g. bundled in
the app binary): make the extract itself available under ODbL on request/at a URL and
keep the notice. **[assumption — exact redistribution mechanics. NEEDS LAWYER]**

**Assessment: technically the fastest lawful-looking path, but share-alike and
database-right questions must be cleared by a lawyer BEFORE any OSM extract is
committed to this repository. Until then: not used.**

---

## 3. Option C — national / EU open-data portals

- Bulgaria's national open-data portal **data.egov.bg exists** — "Портал за отворени
  данни… Достъп до публични данни в Република България в отворен и машинночетим
  формат", listing **547 organizations and 11,751 datasets**, a "Transport" theme
  category, a data-request feature ("Заявки за данни"), and a published API
  specification. **[verified from source — https://data.egov.bg/, 2026-10-23]**
- **Whether any dataset on it contains BDZ station names/coordinates is NOT verified**
  — a catalogue search was not performed this session.
  **[assumption — unknown. Follow-up: query the portal's catalogue/API for "БДЖ",
  "железопътни гари", "спирки", organization "Холдинг БДЖ"/"БДЖ Пътнически
  превози".]** The Phase 0 record likewise found no BDZ open-data publication.
  **[verified from source — docs/bdz-integration-review.md §4, 2026-10-22]**
- The portal has a data-request mechanism, so a formal request for a railway-station
  dataset is a low-cost next step (human decision — DEC-013 #5).
  **[verified from source — the "Заявки за данни" menu item, https://data.egov.bg/,
  2026-10-23]**
- EU level: data.europa.eu aggregates national portals; no BDZ station dataset was
  identified there this session. **[assumption — not searched.]**
- Sofia urban transport publishes its own open data (sofiatraffic.bg) but is a
  **different operator** — not a rail-station source. **[verified from source —
  docs/bdz-integration-review.md §10-D, 2026-10-22]**
- If a state dataset is found, its **reuse licence must be read** (the portal's
  "Условия за ползване" exists) and its attribution preserved; a national dataset
  could also be protected by the sui-generis database right.
  **[assumption. NEEDS LAWYER]**

**Assessment: cheap to check (one catalogue search + one data request); do it before
considering Option B.**

---

## 4. Option D — prohibited: community GTFS mirrors and scraped sources

**Do not use, under any circumstances, without written legal clearance:**

- Transitland feed `f-bdz~bg` (feed file hosted at a `jbb.ghsq.de` URL) and the
  commercial "corrected" mirror on busmaps.com — third-party community data of
  unverified provenance, containing no `feed_info.txt`, covering several operators;
  labelled ODbL-1.0 by the aggregator only. Using them would be unlicensed data
  reuse and possibly infringe BDZ's database rights.
  **[verified from source — docs/bdz-integration-review.md §10-B and DEC-013 risk 1,
  2026-10-22]**
- Scraping razpisanie.bdz.bg / bileti.bdz.bg / radar pages, or reproducing regex
  extraction techniques from third-party blog posts — explicitly prohibited by
  plan.md §17.1 and AGENTS.md rules 1–2.
  **[verified from source — docs/bdz-integration-review.md §10-C, 2026-10-22]**
- Any GTFS feed without `feed_info.txt`/provenance, and any dataset whose licence
  cannot be produced on paper. **[assumption — policy interpretation of the rules
  above.]**

**Status: PROHIBITED (DEC-013). Recorded here so nobody "just wires up" a feed.**

---

## 5. Option E — synthetic DEMO dataset (what ships now)

- A fully synthetic fixture set (invented names "Демо гара …", invented coordinates,
  one station without coordinates) with `demo` provenance on every record and a
  mandatory demo label in every UI surface that renders it.
  **[verified from source — src/features/stations/data/demoStations.ts, 2026-10-23]**
- Licence: it is authored by this project (Apache-2.0 repo) — no third-party rights.
  **[assumption — trivially true for invented data; NEEDS LAWYER only if any real
  toponym sneaks in. A test asserts every fixture name carries the "Демо/Demo"
  marker to prevent that.]**
- It satisfies plan.md §4.5's fallback: "ship with clearly labelled demo data… do not
  imply results are current", and rule 6.

---

## 6. Recommendation

1. **Now:** ship only the labelled DEMO dataset (Option E). This wave does exactly
   that. Nothing user-visible may present demo stations as real.
2. **Next (human actions):** (a) search data.egov.bg's catalogue for a
   railway-station dataset and file a data request if none exists (Option C);
   (b) decide whether to open licence negotiations with BDZ (Option A — the only
   risk-free source for real BDZ stations).
3. **Conditional fallback:** an OpenStreetMap-derived Bulgarian station extract
   (Option B) **only after** a lawyer confirms (i) the extract's classification
   under the ODbL (Derivative Database vs Collective Database / Produced Work),
   (ii) the exact attribution strings and placement, (iii) redistribution mechanics
   for a bundled extract, and (iv) the database-right question vs BDZ. The proposed
   attribution texts in §2 are **assumptions — needs legal review**.
4. **Never:** Option D sources.
5. **When a real dataset lands:** it enters through `src/services/` with a versioned
   `StationDirectory` (DEC-006: `fetchedAt`/`expiresAt`/`attribution`), aliases only
   where the source defines them (plan.md §3.4), and provenance `scheduled` or
   `cached-stale` — never `demo`, never `real-time` (DEC-002).

### Attribution strings — status table

| Context | Text | Status |
|---|---|---|
| Demo dataset | "Demo dataset — synthetic stations, not real BDZ data." (localised) | **assumption — wording approved by product?** No third-party rights involved |
| OSM-derived station data | "Station data © OpenStreetMap contributors. Data available under the Open Database License (ODbL), https://www.openstreetmap.org/copyright" | **assumption — needs legal review** (based on verified OSM attribution requirements, §2.2) |
| OpenFreeMap tiles on a map | "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" | **verified wording from https://openfreemap.org/, 2026-10-23**; placement legal check **assumption** |
| Future licensed BDZ data | whatever the licence states | **UNVERIFIED — licence does not exist yet** |

---

## 7. Open questions for the human/legal owner

1. Which entity can license a BDZ station directory, and what are terms/fees?
   **NEEDS LAWYER** (docs/bdz-integration-review.md §11.1–11.2).
2. Does a formal FOI/open-data request under Bulgarian law yield reusable data, and
   under which licence? **NEEDS LAWYER** (§11.4).
3. Is a Bulgarian railway-station extract from OSM a Derivative Database (share-alike)
   or can it be treated as a Produced Work input? **NEEDS LAWYER** (§2.4 above).
4. Do BDZ station lists attract the EU sui-generis database right, and would a
   station directory from *any* source infringe it? **NEEDS LAWYER** (§11.3).
5. Does data.egov.bg hold (or can it be asked to publish) a railway-station dataset?
   (Option C follow-up — owner: whoever holds the open-data role, UNASSIGNED.)
