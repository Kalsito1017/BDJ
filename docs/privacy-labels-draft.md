# Privacy labels & data-safety form — DRAFT

**Status: DRAFT — every row needs security and legal sign-off before it is
submitted to Apple or Google.** Compiled 2026-10-25 by the docs-release agent
from the **current code facts** (not aspirations). If the code changes, this
document must change with it.

Evidence basis (all verified in this repo):

- Persisted data is exactly: app language + onboarding-completed flag
  (`src/services/storage/settingsStorage.ts`) and favourites / recent searches
  (`src/services/storage/localStore.ts`) — stored in **AsyncStorage on the
  device**, asserted field-by-field by `tests/storage/localStore-privacy.test.ts`
  (DEC-025 P5-M2).
- No analytics, no crash reporting, no advertising, no telemetry of any kind is
  installed (feature flag `analytics` OFF, DEC-004; dependency scan of
  `package.json` shows no analytics/crash SDK).
- No accounts, no login, no server of ours (DEC-003/DEC-004).
- The app makes **no** network request of its own. The only network traffic in
  the codebase is the map: when the map surface renders (development builds
  only), MapLibre fetches the map style and raster/vector tiles from the
  OpenFreeMap public instance (`MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'`,
  `src/features/stations/map/StationsMap.tsx`).
- Location: a `LocationPort` seam exists for a future "nearby stations" feature
  (`src/features/stations/types.ts`, `src/features/stations/model/nearby.ts`).
  It is **tap-gated** (nothing touches it at mount), foreground-only by design,
  never persisted, never logged. `expo-location` is **not installed** — the
  default port reports "unavailable", so the shipped app today cannot access
  location at all.

---

## 1. Apple App Store — privacy nutrition labels (DRAFT)

| Data type | Collected? | Linked to identity? | Used for tracking? | Notes |
|-----------|------------|---------------------|--------------------|-------|
| Contact info | **No** | — | — | No contact forms, no accounts |
| Health & fitness | **No** | — | — | |
| Financial info | **No** | — | — | No payment fields exist anywhere in the types (rule 4) |
| Location | **No** (not collected/stored) | — | — | Foreground, tap-gated `LocationPort` for a future "nearby stations" feature; never stored, never sent, feature not enabled; `expo-location` not installed |
| Sensitive info | **No** | — | — | |
| Contacts | **No** | — | — | |
| User content | **No** | — | — | Favourites/recents stay on device (see below) |
| Browsing history | **No** | — | — | |
| Search history | **No** (not off-device) | — | — | Recent searches are stored **locally only** and are user-deletable |
| Identifiers | **No** | — | — | No device/advertising identifiers are read or stored by app code |
| Usage data | **No** | — | — | No analytics/telemetry SDK |
| Diagnostics | **No** | — | — | No crash reporting SDK |
| Other data | **No** | — | — | |

**Data linked to the user: none. Data collected: none.** The App Store form can
therefore be answered "Data Not Collected" — **provided** the map-tile traffic
below is accepted by legal as non-collected technical traffic, or is disclosed.
That judgement is a legal call — hence "draft — needs security/legal sign-off".

## 2. Google Play — Data safety form (DRAFT)

| Section | Draft answer |
|---------|--------------|
| Does the app collect or share user data? | **No, the app does not collect user data** (all app data stays on the device) |
| Data collected | **None** |
| Data shared | **None** |
| Encryption in transit | N/A (no user data leaves the device). Map tiles are fetched over HTTPS |
| Data deletion request available | N/A — no data is collected; locally stored favourites/recents can be deleted in-app at any time |
| Automatic data deletion | On-device records expire (90-day TTL) and are capped (20 recents / 100 favourites), enforced in `localStore` |
| Account deletion path | **N/A while accounts are disabled** (flag `accounts` OFF, DEC-004) |

## 3. Local storage inventory (the complete list)

| What | Where | Purpose | Retention / deletion |
|------|-------|---------|----------------------|
| App language (`bg`/`en`) | AsyncStorage `settings.language` | Remember the user's language choice (checklist §8) | Until the user changes it or clears app data |
| Onboarding completed flag | AsyncStorage `settings.onboardingCompleted` | Show the first-launch guide once (plan.md 17.7) | Until app data is cleared |
| Favourite stations/routes | AsyncStorage `@bdz/local-store/v1` (versioned snapshot) | User's saved items | User can delete individually or clear all (with confirmation); 100-item cap |
| Recent searches | same snapshot | Convenience ("search again") | User-deletable; 20-item cap; 90-day TTL |

Nothing else is persisted. No identifiers, no analytics IDs, no location, no
credentials. The snapshot's exact shape is locked by a privacy test
(`tests/storage/localStore-privacy.test.ts`) that fails if any field is added
without updating this document.

## 4. Network egress (the complete list)

| Request | When | Sent to | Technical data the server sees |
|---------|------|---------|-------------------------------|
| Map style + tiles | Only when the map surface actually renders — i.e. a **development build** with the MapLibre native module present. The map is not shown in Expo Go/web/tests (graceful labelled fallback) | `tiles.openfreemap.org` (OpenFreeMap public instance) | IP address, User-Agent, viewport/tile coordinates (i.e. roughly the area viewed), request time. **No account id, no user id, no search terms, no favourites** are sent — tile URLs contain only map coordinates and zoom level |

**Disclose this row** in the store questionnaires ("approximate location — map
tile requests" or per each store's technical-data category) unless legal rules
it non-collected. OpenFreeMap/OSM licence and attribution obligations are
handled in the map UI (DEC-012, `MapAttribution.tsx`) — attribution wording is
not translatable on purpose.

## 5. Location handling (current, exact)

- The only location code is the `LocationPort` seam: foreground-only,
  request-on-user-tap ("nearby stations"), single shot, in-flight guard against
  double taps (`NearbyStationsSection.tsx`).
- The default port reports **unavailable** — `expo-location` is deliberately
  not installed (DEC-024), so **no build of this app can currently read
  location**.
- If the feature is ever enabled: foreground permission only, prompt at the
  moment of the tap (never at startup/onboarding), result used in memory and
  **never stored, never logged, never uploaded** (checklist §6).
- **Feature not enabled yet — mark accordingly in the store forms ("app does
  not request location" is true of today's build).**

## 6. Third parties / processors

| Party | Role | Status |
|-------|------|--------|
| OpenFreeMap / OpenStreetMap (ODbL) | Map style + tile delivery in dev builds | Public instances, no contract, no account. DPA question → legal |
| Apple / Google | Store distribution, platform services | Store agreements, not reviewed — legal |
| Expo / EAS | Build tooling only (not shipped data) | No runtime data flow |

No email provider, no payment provider, no analytics vendor, no crash vendor,
no AI provider processes any data (none are integrated).

## 7. Rows requiring sign-off before submission

- [ ] "Data not collected" answers accepted by legal given the map-tile traffic
      (or amended with the disclosure in §4) — **draft — needs security/legal
      sign-off**.
- [ ] Google Play data-safety answers match the store's definitions of
      "collect" and "share" — **draft — needs security/legal sign-off**.
- [ ] Location question answered "no" while the feature is disabled — correct
      for the shipped build; revisit if `expo-location` is ever added —
      **draft — needs security/legal sign-off**.
- [ ] Privacy policy published and consistent with this document (currently
      **blocked** — no policy exists, see `docs/store-metadata-draft.md` §7).
- [ ] Support contact for privacy requests (UNASSIGNED).
- [ ] If `accounts`, `analytics`, `ticketSales` or `realTimeData` flags are ever
      enabled (all require human approval, DEC-004), this document must be
      rewritten **before** the change ships.
