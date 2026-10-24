# Map SDK comparison (DEC-012 research input)

**Date of research: 2026-10-23.** Prepared by the map-stations specialist agent for
the human decision recorded as DEC-012 (currently `Open`). This document does NOT
select an SDK — DEC-012 is a human decision. It is the review required by
plan.md §17.5 and addbeforerelease.txt §9 before any map SDK is installed.

**Evidence labels used throughout (every factual claim carries one):**

- **[verified from source — URL, 2026-10-23]** — the claim was observed directly in
  the cited public source on that date.
- **[assumption]** — inference, memory, or judgement by this agent; not observed in a
  source this session. Must not be treated as fact. Items marked **NEEDS LAWYER**
  require qualified legal review.

**Scope limits (honest):** no package was installed, no SDK was built or run, no app
was tested on a device. Version/compatibility statements come from package metadata
and documentation, not from a build. Google's and Mapbox's full legal texts were not
read end to end; only the quoted clauses were observed.

**Non-negotiable rules applied (plan.md §17.5, addbeforerelease.txt §9, AGENTS.md):**
no tile scraping; tiles cached only where the provider explicitly permits; required
attribution displayed; a map line must never imply an operational route and a marker
must never imply live service; map SDK keys are **public identifiers** restricted by
bundle ID/package name — never secrets.

---

## 1. Candidates compared

1. `react-native-maps` (Apple MapKit / Google Maps provider switch)
2. MapLibre React Native (`@maplibre/maplibre-react-native`) + OSM-based tiles
3. Google Maps SDK via Expo config plugins (through `react-native-maps` provider="google"
   or `expo-maps`)
4. `expo-maps` (Expo's own module: Apple Maps on iOS + Google Maps on Android)
5. `@rnmapbox/maps` (Mapbox Maps SDK v11 wrapper)

---

## 2. Option A — `react-native-maps`

### What it is

- "React Native Mapview component for iOS + Android", rendering **Apple Maps/MapKit on
  iOS** and **Google Maps on Android** by default, with a `provider` switch and
  tile-overlay components (`UrlTile`, `LocalTile`). **[verified from source —
  https://github.com/react-native-maps/react-native-maps, 2026-10-23]**
- The repository ships an Expo config plugin (`app.plugin.js` / `plugin/`).
  **[verified from source — https://github.com/react-native-maps/react-native-maps, 2026-10-23]**

### Licensing

- Library license: **MIT**. **[verified from source —
  https://github.com/react-native-maps/react-native-maps (LICENSE), 2026-10-23]**
- The library license does NOT license the underlying map content: MapKit content is
  governed by Apple's terms and Google Maps content by the Google Maps Platform Terms.
  **[assumption — standard practice; Apple/Google terms not read this session. NEEDS LAWYER]**

### Versions / Expo SDK 58 compatibility

- Latest npm version **1.29.11**; peer dependencies `react >= 18.3.1`,
  `react-native >= 0.76.0`. **[verified from source —
  https://registry.npmjs.org/react-native-maps/latest, 2026-10-23]**
- Fabric (New Architecture): "1.26.1+ → React Native >= 0.81.1".
  **[verified from source — https://github.com/react-native-maps/react-native-maps (README
  compatibility table), 2026-10-23]**
- This project pins React Native **0.88.0** / React **19.3.0** (package.json). The
  declared peer ranges include our versions, so the metadata is compatible with
  Expo SDK 58. **[verified from source — package.json + registry metadata above,
  2026-10-23]** Whether it actually builds and runs under SDK 58 has NOT been tested
  (nothing is installed). **[assumption — build compatibility unverified until the
  scaffold + map wave runs a real build]**

### Cost / quotas / rate limits

- The library itself is free. With the default providers, cost comes from Apple
  (none billed to the developer for MapKit display **[assumption]**) and from Google
  Maps Platform (see Option C cost facts, which apply identically here).
  **[assumption on the Apple part; Google part verified below]**
- No library-level rate limit exists. **[assumption]**

### Attribution obligations

- Apple MapKit renders Apple's own attribution; Apple's MapKit additional terms
  require attribution and restrict some uses (e.g. navigation-like uses).
  **[assumption — Apple terms NOT read this session. NEEDS LAWYER]**
- Google Maps attribution is required (Google logo/copyright per Google terms).
  **[assumption — clause not located this session. NEEDS LAWYER]**

### Data / privacy (what leaves the device)

- Map tiles/styles are fetched by the device from Apple (iOS) and Google (Android).
  IP address and request metadata reach those providers. **[assumption —
  standard SDK behaviour; provider privacy policies not read this session]**
- If the user's location is shown on the Google map, the Google ToS location-consent
  clause applies (quoted in Option C). **[verified from source — clause quoted below]**

### Offline behaviour / tile-caching rights

- `LocalTile` overlays can render pre-stored XYZ tiles, and the README even points at
  the OSM wiki "Tile downloading" page. **[verified from source —
  https://github.com/react-native-maps/react-native-maps (README), 2026-10-23]**
- **Rendering tiles locally is NOT the same as having the right to download/cache
  them.** For Google content the Google ToS says: **"(b) No Caching. Customer will not
  cache Google Maps Content except as expressly permitted under the Maps Service
  Specific Terms."** **[verified from source —
  https://cloud.google.com/maps-platform/terms, 2026-10-23]** What the Maps Service
  Specific Terms permit (e.g. limited mobile offline storage) was NOT read this
  session. **[assumption — do not cache Google tiles until that text is checked. NEEDS LAWYER]**
- Apple MapKit tile caching/extracting rights: **[assumption — not read this session.
  NEEDS LAWYER]** Apple's SDK does not expose a documented offline tile-pack API to
  third parties. **[assumption]**

### Key handling

- Apple Maps (default iOS provider) needs **no API key**. **[assumption — widely
  documented behaviour; not verified from a primary source this session]**
- Google Maps on Android needs a Google Cloud API key (same restrictions as Option C).
  **[verified from source — see Option C key-restriction quotes]**

### Verdict for this project

Workable, but it mixes two different providers with two different terms, attribution
rules and offline stories on iOS vs Android. Offline behaviour — a stated product goal
(plan.md §17.5 "offline states") — is constrained by the Google "No Caching" clause on
Android.

---

## 3. Option B — MapLibre React Native + OSM-based tiles (RECOMMENDED)

### What it is

- `@maplibre/maplibre-react-native`: "React Native library for creating maps with
  MapLibre Native for Android & iOS". **[verified from source —
  https://registry.npmjs.org/@maplibre/maplibre-react-native/latest, 2026-10-23]**
- MapLibre Native engine license: **BSD 2-Clause**. **[verified from source —
  https://raw.githubusercontent.com/maplibre/maplibre-native/main/LICENSE.md, 2026-10-23]**

### Licensing

- Wrapper library: **MIT**. **[verified from source —
  https://registry.npmjs.org/@maplibre/maplibre-react-native/latest, 2026-10-23]**
- Engine: **BSD 2-Clause** (notice retention in source/binaries).
  **[verified from source — LICENSE.md URL above, 2026-10-23]**
- Tile *content* is licensed separately by whoever serves it. For OpenStreetMap-based
  tiles the data is ODbL (see `docs/station-dataset-licensing.md` for the full ODbL
  obligations). **[verified from source — https://www.openstreetmap.org/copyright, 2026-10-23]**

### Versions / Expo SDK 58 compatibility

- Latest npm version **11.5.0**; peer dependencies `react >= 19.1.0`,
  `react-native >= 0.80.0`, `expo >= 54.0.0` (**optional** peer). Ships an Expo
  config plugin (`./plugin` → `withMapLibre`, `app.plugin.js`).
  **[verified from source —
  https://registry.npmjs.org/@maplibre/maplibre-react-native/latest, 2026-10-23]**
- Declared ranges include our React 19.3 / RN 0.88 / Expo 58 versions, so metadata is
  compatible. **[verified from source — registry metadata + package.json, 2026-10-23]**
  Build/runtime behaviour under SDK 58: **[assumption — not built or run]**

### Cost / quotas / rate limits (with OpenFreeMap public instance)

- OpenFreeMap public tile instance: "completely free: there are no limits on the number
  of map views or requests", **no registration, no API keys**, commercial use allowed.
  **[verified from source — https://openfreemap.org/, 2026-10-23]**
- No SLA and no personalized support at present ("If there's enough interest, I may
  introduce a Pro plan in the future"). The instance is donation-funded and run by a
  single maintainer. **[verified from source — https://openfreemap.org/, 2026-10-23]**
  Sustainability/availability risk judgement: **[assumption]**
- Alternative tile sources if OpenFreeMap is not acceptable: self-host the tiles
  (OpenFreeMap publishes weekly full-planet MBTiles/Btrfs downloads for self-hosting —
  **[verified from source — https://openfreemap.org/, 2026-10-23]**) or a commercial
  provider (MapTiler, Protomaps, etc.). Prices/quotas of those providers were NOT
  checked this session. **[assumption]**

### Attribution obligations

- Required attribution string for non-MapLibre clients or print/video:
  **"OpenFreeMap © OpenMapTiles Data from OpenStreetMap"** (the "OpenFreeMap" part is
  optional but appreciated). With MapLibre, attribution is added automatically.
  **[verified from source — https://openfreemap.org/, 2026-10-23]**
- Underlying OSM data additionally requires crediting OpenStreetMap and making clear
  the data is available under the ODbL (link to
  https://www.openstreetmap.org/copyright). **[verified from source —
  https://www.openstreetmap.org/copyright, 2026-10-23]**

### Data / privacy (what leaves the device)

- Tile HTTP requests go to the tile server (e.g. `openfreemap.org`); the server sees
  IP address, User-Agent and requested tile coordinates (which approximate the viewed
  area). **[assumption — standard HTTP/tile behaviour]**
- OpenFreeMap requires "a unique User-Agent identifying your app" for offline
  downloads. **[verified from source — https://openfreemap.org/, 2026-10-23]**
- OpenFreeMap's privacy policy was NOT read this session. **[assumption — minimal
  logging; NEEDS REVIEW]** With **self-hosted tiles** nothing leaves the project's own
  infrastructure. **[assumption]**
- No account, no per-user identifier and no API key are involved (public instance).
  **[verified from source — https://openfreemap.org/, 2026-10-23]**

### Offline behaviour / tile-caching rights — the decisive advantage

- OpenFreeMap explicitly permits offline area downloads with concrete limits:
  **"each download is at most 3,000 tiles or 50 MB, uses at most 4 parallel requests,
  and sends a unique User-Agent identifying your app. For anything larger, please
  contact us."** **[verified from source — https://openfreemap.org/, 2026-10-23]**
  This is written permission to cache tiles within stated limits — exactly what
  addbeforerelease.txt §9 requires ("tile caching only if the provider permits it").
- MapLibre Native supports offline tile packs/MBTiles-style storage in the engine.
  **[assumption — engine capability not verified from docs this session]** The exact
  RN API for offline packs should be confirmed at implementation time.
- A bundled MBTiles extract for Bulgaria (self-hosted or per the provider's terms)
  would give fully offline basemap rendering. **[assumption — technically plausible;
  the licence of the bundled extract must be confirmed (ODbL notice + share-alike
  questions for the extract — see docs/station-dataset-licensing.md). NEEDS LAWYER]**

### Key handling

- **No API key at all** for the OpenFreeMap public instance — nothing to leak, nothing
  to rotate, nothing to restrict. **[verified from source — https://openfreemap.org/,
  2026-10-23]**
- If a keyed provider (e.g. MapTiler) or a protected self-hosted endpoint is adopted
  later, the key/token must be treated as a **public identifier** (plan.md §17.5):
  restrict it by iOS bundle ID / Android package name where the provider supports
  restriction, use separate keys per platform per app, and never treat it as a server
  secret. **[assumption — general guidance consistent with
  addbeforerelease.txt §5]**

### Risks

- Single-maintainer public service without SLA. **[verified from source —
  https://openfreemap.org/, 2026-10-23]** Mitigation: the app must degrade to the
  list-based station view (already built) when tiles fail to load; self-hosting is the
  documented fallback. **[assumption — design judgement]**
- MapLibre RN is a community project (MapLibre organisation).
  **[verified from source — npm maintainer "maplibreorg", registry, 2026-10-23]**
  Bus factor judgement: **[assumption]**

---

## 4. Option C — Google Maps SDK via Expo config plugins

### What it is

- Google's native Maps SDK for Android / iOS used from React Native either through
  `react-native-maps` (`provider="google"`) or through `expo-maps` (Android only).
  **[verified from source —
  https://github.com/react-native-maps/react-native-maps and
  https://docs.expo.dev/versions/latest/sdk/maps/, 2026-10-23]**
- `expo-maps` explicitly supports **Google Maps on Android only**: "While Google
  provides a Google Maps SDK for iOS, Expo Maps supports it exclusively on Android.
  If you want to use Google Maps on iOS, you can look into using an alternative
  library". **[verified from source —
  https://docs.expo.dev/versions/latest/sdk/maps/, 2026-10-23]**

### Licensing / terms

- Proprietary Google Maps Platform Terms of Service; observed clause:
  **"(b) No Caching. Customer will not cache Google Maps Content except as expressly
  permitted under the Maps Service Specific Terms."** and **"(c) No Creating Content
  From Google Maps Content"** (e.g. no tracing/digitizing of roads or buildings).
  **[verified from source — https://cloud.google.com/maps-platform/terms, 2026-10-23]**
- Location clause observed: the application must notify end users of data collection
  and use, and **"will not obtain or cache any End User's location except with the End
  User's express, prior, revocable consent."**
  **[verified from source — https://cloud.google.com/maps-platform/terms, 2026-10-23]**
- The full Terms (Universal + Maps Service Specific Terms) were NOT read this session
  — the ToS page renders its body client-side and only the quoted clauses above were
  recovered from the served HTML. **[assumption on everything not quoted. NEEDS LAWYER]**

### Cost / quotas / rate limits

- Since **2025-03-01** Google "replaced the USD $200 monthly credit with free monthly
  calls per SKU"; Essentials tier offers "up to 10K free* calls per product per
  month" (footnote: "Essentials Map Tiles APIs provide up to 100,000 calls at no cost
  per SKU per month"); new customers get a $300 trial credit; subscription plans shown
  at $100 / $275 / $1,200 per month (Starter / Essentials / Pro) with pay-as-you-go
  beyond; "Product availability, functionality and terms may differ for customers with
  billing addresses in the European Economic Area (EEA)".
  **[verified from source — https://mapsplatform.google.com/pricing/, 2026-10-23]**
- Mobile Maps SDKs are billed per map load under the Maps SKUs ("Maps: Maps SDK for
  Android; Maps SDK for iOS; ..."). **[verified from source —
  https://mapsplatform.google.com/pricing/, 2026-10-23]** Exact per-map-load definition
  and quotas: **[assumption — read the pricing guide at implementation time]**
- Requires a billing account. A misconfigured or abused key can produce a real bill —
  set budget alerts and caps. **[assumption — standard practice]**

### Attribution obligations

- Google requires its attribution/logo on the map. Exact wording/placement:
  **[assumption — not located in a fetched source this session. NEEDS LAWYER]**

### Data / privacy (what leaves the device)

- Tile/render requests and SDK telemetry go to Google from user devices.
  **[assumption — standard SDK behaviour; Google privacy documentation not read]**
- The quoted ToS location clause (above) legally constrains how location may be
  combined/cached — relevant to the nearby-stations flow.
  **[verified from source — clause quoted above]**

### Offline behaviour / tile-caching rights

- Own caching of Google Maps Content is forbidden except as the Maps Service Specific
  Terms permit. **[verified from source —
  https://cloud.google.com/maps-platform/terms, 2026-10-23]** Whether those specific
  terms allow limited mobile offline tile storage (and under what limits) is
  **[assumption — NOT verified. Do not implement Google tile caching before reading
  them. NEEDS LAWYER]**
- SDK-internal cache behaviour is managed by Google's SDK.
  **[assumption]**

### Key handling (exact guidance, verified)

- Android: restrict the key under "Key restrictions → Application restrictions →
  Android apps", adding the app's **package name (`android.package`)** and **SHA-1
  certificate fingerprint** (Play App Signing SHA-1 for store builds; debug keystore
  SHA-1 for development builds); store it in `app.json` under
  `android.config.googleMaps.apiKey`; "Use separate keys for each app and platform."
  **[verified from source —
  https://docs.expo.dev/versions/latest/sdk/maps/ and
  https://developers.google.com/maps/documentation/android-sdk/get-api-key, 2026-10-23]**
- iOS: "Restricting keys is vital for security; use the console or `gcloud` commands to
  limit usage by selecting the 'Maps SDK for iOS' and specifying **iOS bundle
  identifiers**."
  **[verified from source —
  https://developers.google.com/maps/documentation/ios-sdk/get-api-key, 2026-10-23]**
- The key is a **public identifier** (it ships inside the app); its protection comes
  from application restriction + API restriction + billing caps, NOT from secrecy.
  Never place it in a server-only secret store "for safety" and never gate features on
  its secrecy. **[assumption — consistent with plan.md §17.5 and addbeforerelease.txt §5]**

---

## 5. Option D — `expo-maps` (Expo's own module)

### What it is

- `expo-maps` — "Provides a Map component that uses Google Maps on Android and Apple
  Maps on iOS", part of the Expo SDK 58 line (npm version **58.0.10**, `expo` MIT
  packages). **[verified from source —
  https://registry.npmjs.org/expo-maps/latest and
  https://docs.expo.dev/versions/latest/sdk/maps/, 2026-10-23]**
- Apple Maps on iOS requires **iOS 17+**; some callbacks (marker/annotation taps,
  programmatic selection) require **iOS 18+**.
  **[verified from source —
  https://docs.expo.dev/versions/latest/sdk/maps/, 2026-10-23]**
- Config plugin `expo-maps` with `requestLocationPermission` /
  `locationPermission` options; `useLocationPermissions()` hook and
  `Maps.getPermissionsAsync()` / `Maps.requestPermissionsAsync()` API.
  **[verified from source —
  https://docs.expo.dev/versions/latest/sdk/maps/, 2026-10-23]**

### Licensing / cost / attribution / offline

- Library MIT. **[verified from source — npm registry, 2026-10-23]**
- Map content on Android = Google Maps Platform (all Option C facts apply: pricing,
  "No Caching" clause, key restrictions, attribution).
  **[verified from source — docs + ToS quotes above]**
- Map content on iOS = Apple Maps (MapKit) — Apple terms apply.
  **[assumption — Apple terms not read. NEEDS LAWYER]**
- Offline: no offline tile API is exposed in the documented surface.
  **[assumption — based on the fetched API reference; no offline section present]**

### Key handling

- Android only: `android.config.googleMaps.apiKey` with the Android app restrictions
  above. iOS Apple Maps: no key.
  **[verified from source —
  https://docs.expo.dev/versions/latest/sdk/maps/, 2026-10-23]**

### Verdict

The lowest-friction *Expo-native* choice and first-party maintained with SDK 58
(versioning tracks the SDK), but it inherits Google's terms/billing on Android and
offers no documented offline story; the two platforms show different basemaps with
different data sources. **[assumption — judgement]**

---

## 6. Option E — `@rnmapbox/maps` (Mapbox Maps SDK v11)

### What it is

- "Community-supported, open-source React Native library for building maps using
  Mapbox native maps SDK for iOS and Android"; supports Mapbox Maps SDK v11;
  requires a **Mapbox account and access token**; "This package is not available in
  the Expo Go app" (custom dev clients only). **[verified from source —
  https://github.com/rnmapbox/maps (README), 2026-10-23]**
- npm version **10.3.11**, library license **MIT**, peer `react-native >= 0.79`,
  optional peer `expo >= 47`; bundles native Mapbox SDKs (iOS `~> 11.23.1`, Android
  `11.23.1`). **[verified from source —
  https://registry.npmjs.org/@rnmapbox/maps/latest, 2026-10-23]**
- The README carries "Call for additional maintainers" — bus-factor signal.
  **[verified from source — https://github.com/rnmapbox/maps, 2026-10-23]**

### Cost / quotas

- Mapbox Maps SDKs for Mobile are metered per **monthly active user**: first
  **25,000 MAU free**, then $4.00 / $3.20 / $2.40 per 1,000 in tiers; Vector Tiles API
  200,000 tile requests free per month. **[verified from source —
  https://www.mapbox.com/pricing, 2026-10-23]**
- "Customers may not use any Licensed Map Content in any printed or video media except
  expressly as set forth in the Mapbox Product Terms." **[verified from source —
  https://www.mapbox.com/pricing, 2026-10-23]**

### Attribution / privacy / offline / keys

- Required attribution (typically "© Mapbox © OpenStreetMap"), account telemetry and
  opt-out rules are set by the Mapbox Product Terms — **NOT read this session**.
  **[assumption. NEEDS LAWYER]**
- An `OfflineManager` API exists in the wrapper. **[verified from source —
  https://github.com/rnmapbox/maps (docs list), 2026-10-23]** Offline download quotas
  and caching rights under Mapbox terms: **[assumption — not verified]**
- Token handling: `Mapbox.setAccessToken('<TOKEN>')` at runtime; token is a public
  identifier — restrict by app bundle/package via the Mapbox account dashboard where
  supported. **[verified from source for the API —
  https://github.com/rnmapbox/maps, 2026-10-23; assumption for dashboard restriction]**
- Not usable in Expo Go → custom dev client required for any map work.
  **[verified from source — https://github.com/rnmapbox/maps, 2026-10-23]**

### Verdict

Capable, but adds a commercial account, MAU-based billing, unread terms and a
community wrapper with a maintainer call-out. Not justified for a Bulgaria-only
station map. **[assumption — judgement]**

---

## 7. Comparison matrix (facts carry labels above)

| Criterion | A: react-native-maps | B: MapLibre RN + OSM tiles (**REC.**) | C/D: Google via config plugin / expo-maps | E: @rnmapbox/maps |
|---|---|---|---|---|
| Library license | MIT [v] | MIT wrapper + BSD-2 engine [v] | MIT wrappers [v] | MIT wrapper [v] |
| Map content license | Apple + Google terms [a] | ODbL data (OSM) + tile provider terms [v/a] | Google ToS (+ Apple on iOS) [v] | Mapbox Product Terms [a] |
| API key needed | iOS: none [a]; Android: Google key [v] | **None** (OpenFreeMap) [v] | Android: Google key [v]; iOS Apple: none [a] | Mapbox token [v] |
| Cost signal | Google billing if provider=google [v] | $0 tiles, no SLA [v] | per-SKU free tier then paid; billing account required [v] | 25k MAU free then per-MAU [v] |
| Tile caching / offline | Google "No Caching" clause [v]; LocalTile is rendering-only [v] | **Written permission: 3,000 tiles or 50 MB / download, 4 parallel, unique UA** [v] | Google "No Caching" except Maps Service Specific Terms [v] (specifics [a]) | OfflineManager API [v]; quota/terms [a] |
| Attribution | Apple + Google marks [a] | "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" + OSM/ODbL notice [v] | Google attribution [a] | "© Mapbox © OpenStreetMap" [a] |
| Privacy: what leaves device | Apple/Google tile requests [a] | tile HTTP to chosen tile host; no account/key [v/a] | Google tile + telemetry requests [a] | Mapbox tile + telemetry [a] |
| Expo SDK 58 metadata compat | peer RN ≥ 0.76 [v] | peer RN ≥ 0.80, expo ≥ 54 optional [v] | expo-maps 58.x [v] | peer RN ≥ 0.79 [v] |
| Expo config plugin | yes [v] | yes (`withMapLibre`) [v] | yes (`expo-maps` plugin) [v] | yes (plugin export) [v] |
| Built/tested in this repo | no — nothing installed | no — nothing installed | no — nothing installed | no — nothing installed |

Legend: [v] = verified from source (URLs above, 2026-10-23); [a] = assumption.

---

## 8. Recommendation (proposal for DEC-012 — human decides)

**Recommend: Option B — MapLibre React Native (`@maplibre/maplibre-react-native`)
with OSM-based tiles, starting with the OpenFreeMap public instance and a documented
self-host fallback.**

Reasons:

1. **No API key and no billing account** — removes an entire class of security and
   cost failure modes; nothing secret-like exists to leak or rotate. [verified facts
   above; judgement **[assumption]**]
2. **Tile caching is explicitly permitted with written limits** — the only candidate
   where addbeforerelease.txt §9's "tile caching only if the provider permits it" is
   satisfied out of the box. Google's ToS conversely forbids caching except as its
   unread Service Specific Terms allow. [verified quotes above]
3. **Cost is zero at our scale** with no surprise-bill vector, versus Google/Mapbox
   metering. [verified pricing facts above]
4. **Attribution is short, static and app-compatible**: "OpenFreeMap © OpenMapTiles
   Data from OpenStreetMap" plus the OSM/ODbL notice; MapLibre adds it automatically.
   [verified]
5. **Privacy surface is minimal**: plain HTTPS tile fetches, no account, no SDK
   telemetry contract unread-but-mandatory (unlike Mapbox/Google). [partly
   **[assumption]** — OpenFreeMap privacy policy still to be read]
6. The accessible **list alternative** (this wave's deliverable) already guarantees
   station discovery works even if the map never ships, so choosing the simplest,
   most-controllable map engine is low-risk. [design judgement **[assumption]**]

Accepting the recommendation means accepting: no SLA on the public tile instance
[self-host or paid provider is the mitigation], and MapLibre's rendering being
slightly less polished than Google's on low-end Android devices [assumption — must be
tested on low-end hardware per plan.md §17.5 before release].

**Fallback if the human owner prefers a first-party, styled commercial basemap:**
Option D (`expo-maps`) — best Expo SDK 58 integration, Apple Maps on iOS without a
key; accept Google billing + "No Caching" constraints on Android, and accept
platform-divergent basemaps.

### DEC-012 entry text proposed for the lead (do not treat as decided)

> DEC-012 (proposed, 2026-10-23): Map SDK = MapLibre React Native
> (`@maplibre/maplibre-react-native`, MIT; engine BSD-2) with OSM-based tiles
> (OpenFreeMap public instance initially; self-host fallback documented). No map API
> key. Tile caching permitted by OpenFreeMap terms: ≤3,000 tiles or ≤50 MB per
> download, ≤4 parallel requests, unique User-Agent. Required attribution in the map
> UI: "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" plus "© OpenStreetMap
> contributors — data available under the Open Database License (ODbL),
> https://www.openstreetmap.org/copyright". Map lines/markers never imply operational
> routes or real-time service. Installed only after human confirmation. Research
> evidence: docs/map-sdk-comparison.md.

### If any Google-backed option is chosen instead — key restriction (exact steps)

1. Create a Google Cloud project; enable **Maps SDK for Android** (and **Maps SDK for
   iOS** if Google Maps on iOS is used via `react-native-maps`).
2. Create an API key per platform ("Use separate keys for each app and platform").
   [verified]
3. Android key → Application restrictions "Android apps" → add
   `android.package` (package name) + SHA-1 (Play App Signing for release, debug
   keystore for development). [verified]
4. iOS key → Application restrictions "iOS apps" → add the **bundle identifier**.
   [verified]
5. Also restrict each key to the specific APIs. [assumption — standard guidance]
6. Put the keys in `app.json` (`android.config.googleMaps.apiKey` / `ios` equivalent)
   — they are public identifiers; add **billing budget alerts and hard caps** in
   Google Cloud. [alert guidance **[assumption]**]
7. Placeholder bundle IDs (`com.example.bdztrain`, see DEC-014 L6) must be replaced
   before the restrictions mean anything. [verified from docs/decisions.md]

---

## 9. Explicitly NOT verified in this session

- Google Maps Service Specific Terms (offline caching allowances) — the ToS page body
  is client-rendered; only quoted clauses were recovered. **NEEDS LAWYER.**
- Apple MapKit additional terms (attribution text, navigation restrictions, caching).
  **NEEDS LAWYER.**
- Mapbox Product Terms (attribution, telemetry, offline quotas). **NEEDS LAWYER.**
- MapTiler/Protomaps/other tile-provider pricing and quotas.
- Any build/runtime behaviour of any candidate under Expo SDK 58 — nothing was
  installed (by design: the lead installs after the human confirms DEC-012).
- OpenFreeMap privacy policy contents. **NEEDS REVIEW.**
- Performance of any candidate on low-end devices (plan.md §17.5 requires this test).
