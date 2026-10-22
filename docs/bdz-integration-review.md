# BDZ Integration Review (Phase 0 — discovery/legal)

**Data-source status: mock-only**

> The line above is the single, explicit data-source status required by plan.md §17.1 and
> Phase 0 acceptance criteria. It is exactly one of: "approved live" / "mock-only" / "blocked".
> Current status: **mock-only** — there is no approved live BDZ data source for this project.
> All journey/ticket data shown in the app must come from the clearly labelled mock provider
> (plan.md §4, addbeforerelease.txt §1). Ticket sales stay disabled behind a feature flag.

---

## 1. Review date

- **Review date: 2026-10-22** (all fetches below were performed on this date).
- Reviewer: AI agent (Phase 0 discovery-legal specialist). **This agent is not a lawyer.**
  Every item that requires legal judgement is flagged **NEEDS LAWYER**.
- Scope: what is lawfully and technically possible for integrating BDZ data/ticketing into
  this app, based only on genuinely public web pages.

## 2. Method and limits of this review (what was and was not done)

- Only public HTML pages (and one public PDF linked from a reviewed page) were loaded.
- **No API endpoint was called, probed, tested or authenticated against.** The endpoint
  route names recorded in §9 are transcribed from a public help page listing only.
- **No scraping, no reverse engineering, no browser-session automation was performed or is
  authorised by this review.** The JavaScript bundles of the ticketing portal were NOT
  downloaded or analysed.
- Where a page could not be read, the exact observed result is recorded instead of guessed
  content (see §3).
- Search results that are not official BDZ/authority sources are quarantined in §10 and
  marked **third-party commentary**. They are not permission and not evidence.

## 3. Source URLs actually fetched, with observed HTTP status

All statuses observed 2026-10-22 via plain HTTPS GET of the public page (curl and a
standard page fetcher). Every row in the table below is **[verified from source — fetched
2026-10-22]**. "Readability" describes what the server response contained.

| # | URL | Observed status | What was actually observed |
|---|-----|-----------------|----------------------------|
| 1 | https://tickets.bdz.bg/ | **200** (0 redirects) | JavaScript single-page-app shell only. Server-side text is just the page title "БДЖ билетоиздаване" ("BDZ ticket issuance") and meta description "BDZ online portal". No terms or API text is present in the HTML source. |
| 2 | https://bileti.bdz.bg/terms | **200** (0 redirects) | Same SPA shell (1,733 bytes of HTML; app mounts into `<div id="app">`). The terms text is rendered client-side and **could not be read from the public HTML** without executing/analysing the JS bundle, which was not done. Content of the online-sales terms is therefore **not verified** in this review. |
| 3 | https://tickets.bdz.bg/portal/Help | **200** (0 redirects) | "ASP.NET Web API Help Page" — a generated list of route names (see §9). Every single entry shows "No documentation available." Page footer is the ASP.NET template default "© 2026 - My ASP.NET Application" — it names no API owner. |
| 4 | https://www.bdz.bg/bg/a/obshchi-usloviya | **200** (0 redirects) | Page "Общи условия" ("General conditions"), dated 02.05.2025, linking a public PDF: "Общи условия за превоз на пътници с железопътния транспорт" (363 KB, an extract from the internal passenger Tariff). The PDF was downloaded (HTTP 200, 371,503 bytes) and its text extracted locally for the paraphrase in §5.2. |
| 5 | https://www.bdz.bg/en/a/zashchita-na-lichni-danni-en | **200** (0 redirects) | Page "Personal Data Protection", page date 27.01.2020. Names "BDZ – Passenger Services EOOD" as personal-data controller, lists a Data Protection Officer, and links GDPR privacy-policy / Art. 13 notice PDFs and a data-subject request form. Observed inconsistency: the displayed DPO e-mail text and the underlying `mailto:` link target on that page do not match each other — verify before relying on either. |
| 6 | https://www.bdz.bg/bg/a/chesto-zadavani-vprosi | **200** (0 redirects) | Passenger FAQ (page date 27.01.2020) with operational/ticketing facts paraphrased in §5.3. |
| 7 | https://www.bdz.bg/bg/a/sitemap | **200** (0 redirects) | Full official site map. **No API, developer-programme, open-data or machine-readable-feed page is listed anywhere on it.** The listed external services are: razpisanie.bdz.bg (timetable), bileti.bdz.bg (tickets), live.bdz.bg (online board), radar.bdz.bg (train locations), tenders.bdz.bg (tenders). |
| 8 | https://www.bdz.bg/bg/c/dostp-do-informatsiya | **200** (0 redirects) | "Access to information" section. Contains only a 2021 annual FOI report. **No data-reuse licence, open-data terms or API terms found.** |
| 9 | https://holding.bdz.bg/bg/novini/razpisanieto-na-bdj-veche-i-v-google-maps.html | **200** | Official BDZ Holding press release, 19.07.2019: states BDZ concluded a **licensed agreement with Google Maps in March [2019]** to provide timetable data (paraphrase in §6). |
| 10 | https://pitay.government.bg/application/18509/view | **403** (observed result for this reviewer's automated client) | Could not be read directly; content known only from a web-search index snippet (see §10, item A). Recorded as-is; not guessed around. |

No other URLs were fetched. Nothing at tickets.bdz.bg or bileti.bdz.bg beyond the two HTML
pages above was requested.

## 4. Search results for an official BDZ API / open-data feed / GTFS dataset / developer programme

Searches performed 2026-10-22 (general web search, English and Bulgarian queries:
"BDZ API open data GTFS developer", "data.egov.bg BDZ разписание отворени данни GTFS").

- **No official BDZ API, open-data portal entry, GTFS publication, or developer programme was
  found.** [verified from source — absence in the official sitemap (§3 #7), the
  "Access to information" section (§3 #8), and in the searches performed; **assumption** that
  no such programme exists at all, since search coverage is not exhaustive.]
- What BDZ does publish for the public are browser-facing services (timetable search, online
  board, train-location radar) [verified from source — §3 #7 navigation], i.e. HTML services,
  not a documented machine-readable feed. Their internals were NOT inspected.

## 5. Terms summary (paraphrased; original text not reproduced)

### 5.1 Online sales terms (https://bileti.bdz.bg/terms)

**Not readable in this review** (SPA shell only, §3 #2). plan.md §17.1 states these terms
"describe restrictions and conditions for online sales, reservations, cancellation, and
refunds" — that is a **project-internal note, NOT independently verified today
[assumption]**. Do not rely on it. Anything the app displays about online-sales conditions
must come from BDZ's current terms at the time of use, not from this file. **NEEDS LAWYER.**

### 5.2 General conditions for carriage of passengers (PDF linked from §3 #4, dated 02.05.2025)

Paraphrased summary of what the document says (it is an extract from BDZ's internal Tariff
and cites Tariff articles; the full Tariff is a separate document):

- Reserved-seat tickets can be bought up to 5 days before the travel date; sleeping/couchette
  products up to 30 days ahead (Tariff art. 20).
- Refunds: fully unused tickets can be refunded at a station/rail bureau up to 3 hours before
  departure with a 10% deduction; sleeping-place products up to 24 h before departure with a
  10% deduction; **a passenger who ordered an online ticket may cancel up to 24 h before
  travel without deduction** (Tariff art. 59). Complaints about wrongly refunded amounts or
  wrongly issued tickets are only accepted while the passenger is still at the ticket window.
- A ticket can be re-validated (endorsement) only once, and a re-validated ticket cannot be
  subject to a complaint.
- If a train is delayed more than 30 minutes from the passenger's origin station, the
  passenger may abandon the journey and receive a full refund without deduction (cited
  internal telegram 456/21.08.2012).
- No refund is given for: reserved-seat fees, price differences when the passenger
  voluntarily travels a longer route or a lower train category, lost or badly damaged
  tickets, subscription/discount cards, or the unused distance of passengers removed from a
  train for public-order violations (Tariff art. 61).
- Free hand luggage up to 30 kg; the carrier is liable for hand-luggage damage only when it
  caused the damage. Guide/assistance dogs travel free; transport of persons with
  disabilities/reduced mobility requires a request 3 days before travel.
- The ticket/subscription price includes passenger insurance and VAT (Tariff art. 6).
  [verified from source — PDF via §3 #4, 2026-10-22]
- Ticket inspection: the passenger must hold a travel document before travel and show it on
  inspection; without a valid document (or with a forged one, etc.) the onboard fare applies
  and refusal to pay leads to removal at the next station.

These are **BDZ's carrier conditions, not this app's rules**, and they change over time. The
app must never hard-code them as its own policy copy (plan.md §17.3): show the applicable
terms from the authorised provider at purchase time. **NEEDS LAWYER** for how they interact
with EU consumer law (e.g. the distance-contract right of withdrawal and its exemptions).

### 5.3 Passenger FAQ (§3 #6) — operational facts, paraphrased

- Ticket-office sales stop 5 minutes before a train departs; **online sales stop no later
  than 3 hours before departure**; at unstaffed stops tickets are sold on board by train
  staff, at a higher price than at a ticket office.
- Children under 7 travel free (a separate reserved seat costs extra; age proven by birth
  certificate). Various discount cards and commercial offers exist.
- Refunds for (partially) unused tickets/subscription cards follow a separate complaints and
  refund procedure linked from the FAQ.
- Timetable info is also available at ticket offices and by phone (info centre 02 931 11 11).
  [verified from source — §3 #6, 2026-10-22; values current as observed and subject to change]

### 5.4 Personal-data page (§3 #5)

- "BDZ – Passenger Services" EOOD is presented as data controller for its own processing;
  a Data Protection Officer is named with dedicated contact details, and GDPR Art. 13
  notices / privacy policy / data-subject request form are published as PDFs.
- This concerns **BDZ's own processing**. It says nothing about third-party apps.
  [verified from source — §3 #5, 2026-10-22]

## 6. BDZ's only published data-sharing arrangement found

- The official BDZ Holding press release (19.07.2019, §3 #9) states that BDZ and Google Maps
  concluded a **licensed agreement in March 2019** for provision of timetable data, and that
  BDZ timetable journeys appear in Google Maps. [verified from source — §3 #9, 2026-10-22]
- Interpretation [assumption]: BDZ treats timetable data as licensable content and deals
  with integrators contractually, one by one. Whether BDZ would license this app, and on what
  terms, is **unknown** — no contact has been made (§8). **NEEDS LAWYER.**
- Records on the official Bulgarian public-information platform (pitay.government.bg,
  **third-party to this project but an official state authority platform**) show 2026 FOI
  requests asking BDZ/authorities to publish GTFS data; the requester asserts in those
  records that the data is currently supplied only to Google. Direct fetch of those records
  returned **403** to this reviewer (§3 #10), so only search-index text was seen. The
  requester's assertion is **not** a verified fact. [observed; NEEDS LAWYER to assess whether
  a formal FOI request is a lawful route to obtain timetable data in Bulgaria.]

## 7. Rate limits, fields, update frequency, attribution, API owner

### 7.1 Rate limits

- **Rate limits:** not published on any reviewed source. [verified from source — absence on
  pages §3 #1–#9; **assumption** that none is published anywhere, coverage not exhaustive].
  No rate limit may be invented. Until BDZ publishes or contracts one, any integration design
  must not assume a quota exists.

### 7.2 Fields

- **Fields:** no request/response schemas are published. Every route on the API help page
  shows "No documentation available" (§3 #3). The only field-level data formats seen anywhere
  are the standard GTFS columns of third-party community feeds (§10, item B) — **not**
  BDZ-published fields. [verified from source — §3 #3, 2026-10-22]

### 7.3 Update frequency

- **Update frequency:** not published for any machine-readable source (none found). Content
  observations only: BDZ's site carries same-day delay notices, warns that timetables change
  due to infrastructure works, and announced a public consultation on the draft 2027
  timetable — i.e. schedules change periodically and at short notice. [verified from source —
  §3 #4/#6 page contents, 2026-10-22; **assumption** on cadence]

### 7.4 Attribution rules

- **Attribution rules:** none published in any reviewed source. The BDZ sites carry a
  copyright notice ("All rights reserved", Holding BDZ / BDZ Passengers) [verified from
  source — footers of §3 #4–#8, 2026-10-22]. Whether timetable databases attract EU
  sui-generis database rights and what attribution BDZ would require is **NEEDS LAWYER**.

### 7.5 API owner

- **API owner:** **not stated anywhere.** The help page footer is the ASP.NET template
  default and names nobody (§3 #3). Legal entities observed: "BDZ – Passenger Transport"
  EOOD (passenger services, data controller per §3 #5) and "Holding BDZ" EAD (parent,
  copyright notice). Which entity owns/operates the ticketing API and portal is **unknown
  [assumption]** — do not attribute it to any entity in writing until BDZ confirms. **NEEDS
  LAWYER.**

## 8. Authorization status

- **No contact has been made with BDZ by this project.** No request, application, e-mail,
  letter or meeting has occurred. [verified fact of this project's history — there is no
  correspondence to cite.]
- **No written BDZ authorization exists** for API use, timetable data, logos, ticketing, or
  any integration. No contract, NDA, or technical-integration requirement document exists.
- Consequence (per plan.md §17.1 / addbeforerelease.txt §1): the app may NOT call, scrape or
  mimic BDZ services, may NOT present itself as an official BDZ product, and ticketing stays
  disabled (feature flag OFF, mock `TicketingProvider` only). A "Continue to official BDZ
  ticketing" link to the official portal may only be added after product/legal approval.
- A "mock-only" status is recorded today; it changes to "approved live" only when written
  authorization and a supported integration are verified and documented here.

## 9. Supported functions (publicly listed only — NOT an integration, NOT permission)

The page https://tickets.bdz.bg/portal/Help (200, §3 #3) is an auto-generated ASP.NET help
listing. It shows route *names* grouped under: **Account** (registration, e-mail
confirmation, password reset, profile changes), **POSRoute** (train/route lookups),
**Schema** (seat-map info, seat block/release), **Payment** (ePay and BORICA payment
requests/notices, payment check and cancel), **PdfAdmin** (ticket PDF / receipt
generation), **Nomenclatures** (reference data, discount documents), **Content** (static
texts), **Ticket** (price check and ticket issue, user ticket lists, reclamation requests,
departure/arrival train-info lists, ticket PDF), **Service** (client-side error logging).
Every entry states "No documentation available."

- This listing is evidence of what BDZ's own portal exposes to its own frontend. It is **not**
  documentation, **not** an offer of an API, and **not** permission to call any of it.
  [verified from source — §3 #3, 2026-10-22]
- **No endpoint listed there was called, probed or tested.** Doing so without authorization
  would violate the project's non-negotiable rules (plan.md §17.1 "Critical",
  addbeforerelease.txt §1).
- Whether the app's journey-search needs could ever be met by this portal API is unknown;
  the portal is oriented to ticket sales/POS workflows [assumption from route names only].

## 10. Third-party sources found (clearly NOT official BDZ, NOT permission)

- **A. pitay.government.bg FOI records (2026)** — official *state* platform (Ministry of
  Transport public-information system), but third-party to BDZ's own publications; direct
  fetch 403 (§3 #10). Search-index text shows FOI requests for GTFS timetable data and
  recorded outcomes ("information does not exist" / forwarded to Holding BDZ and BDZ
  Passengers). Useful context; not authorization; not a data source.
- **B. Community GTFS feed on Transitland** (`f-bdz~bg`, feed file hosted at a
  `jbb.ghsq.de` URL) and a commercial "corrected" mirror on busmaps.com — **third-party
  community data**, labelled ODbL-1.0 by the aggregator, containing no `feed_info.txt` and
  covering several operators. **Provenance and reuse rights are unverified. Do NOT use this
  feed without written legal clearance** [NEEDS LAWYER]; using unverified third-party
  timetable data would conflict with the plan's "verified, licensed dataset" rule
  (plan.md §17.5) and possibly with BDZ's database rights.
- **C. A personal blog post (2026-08-12) describing scraping/regex extraction of BDZ's
  live radar pages** — **third-party commentary**. The techniques it describes (scraping,
  reverse engineering embedded page data) are **explicitly prohibited** for this project and
  must not be adopted under any circumstances (plan.md §17.1, addbeforerelease.txt §1). The
  post's claim that "BDZ has no public API" is third-party commentary, consistent with but
  not a substitute for our own finding in §4.
- **D. Sofia urban GTFS open data (sofiatraffic.bg)** — a *different* operator (Sofia urban
  transport) with its own open-data programme. Not BDZ rail data; noted only to show what a
  Bulgarian GTFS publication looks like.

## 11. Unresolved legal questions (all NEEDS LAWYER unless stated)

1. Which legal entity would contract for BDZ data/ticketing ("BDZ – Passenger Transport"
   EOOD vs "Holding BDZ" EAD vs another), and who owns the ticketing API? (§7)
2. Does BDZ licensing precedent (Google, 2019) imply a licensing route for this app, and what
   are the terms, fees, attribution and field-level rights? (§6)
3. Are BDZ timetables / station lists protected by the EU sui-generis database right, and
   would a station directory built from any source infringe it? (§7 attribution)
4. Under Bulgarian access-to-public-information law, is a formal FOI/reuse request a lawful
   route to obtain timetable data for reuse, and what licence would attach? (§6, §10-A)
5. Consumer-law treatment of the "online ticket cancellable up to 24 h before travel without
   deduction" rule and other refund rules versus EU distance-contract withdrawal rights and
   mandatory passenger rights (Reg. (EU) 2021/782 — applicability **assumption**). (§5.2)
6. Whether the app may lawfully deep-link to the official ticketing portal, and what
   disclaimer is required to avoid misrepresenting any relationship with BDZ.
7. Trademark/usage rights for the BDZ name, logos, station imagery and any map assets (see
   `docs/legal-compliance-matrix.md`).
8. If any timetable data is later obtained, what licensing/attribution obligations attach to
   it and to derived works (translations of station names, cached copies).
9. GDPR roles for the app itself (controller/processor mapping, lawful basis per purpose) —
   see `docs/legal-compliance-matrix.md`.

## 12. Evidence label legend

- **[verified from source — URL, 2026-10-22]**: content observed directly in the HTTP
  response of the cited public page on that date.
- **[assumption]**: inference by this agent; not observed in a source. Must not be treated as
  fact. Items marked **NEEDS LAWYER** require a qualified Bulgarian/EU lawyer before any
  decision is based on them.

*This document is an engineering discovery record, not legal advice, and does not grant any
permission to use BDZ data, APIs or brand assets. The app must never be presented as an
official BDZ product.*
