# Mobile App Development Plan

**Project:** Cross-platform BDZ train companion app\
**Platforms:** iOS and Android\
**Mobile stack:** React Native + TypeScript\
**Containerization:** Docker for repeatable development tooling and
Android builds\
**Status:** Implementation plan for coding agents

## 1. Mission

Build a reliable, accessible mobile app for passengers using Bulgarian
State Railways (BDZ). The app should make it easy to find train journeys
and access useful trip information on both iOS and Android from one
shared React Native + TypeScript codebase.

The first release should focus on journey planning and clear
presentation of train information. Do not claim live train positions,
live delays, ticket purchasing, or official BDZ integration unless an
authorised and working data source has been verified.

## 2. Important platform and Docker constraint

React Native shares most application code across iOS and Android, but
**Docker alone cannot produce a native iOS app on a standard Linux
host**. iOS builds require macOS and Apple's Xcode toolchain.

Use Docker for: - A consistent Node.js development environment and
dependency tooling. - Running linting, type checks, unit tests, and
other platform-independent checks. - Android builds, provided the
container has the required Android SDK/JDK setup. - Optional backend
services, if the project later needs them.

Use one of these supported paths for iOS: - A Mac with Xcode for local
iOS builds and simulator testing. - A macOS CI runner for signed release
builds. - Expo Application Services (EAS Build) or another approved
cloud build service, if the project uses a compatible Expo workflow.

Do not promise that a Linux Docker container can run the iOS Simulator
or replace Xcode.

## 3. Product scope

### MVP features

1.  **Journey search**
    -   Search by departure station, arrival station, and travel date.
    -   Validate required fields and provide useful empty/error states.
    -   Support Bulgarian station names and Cyrillic input.
2.  **Journey results**
    -   Show available journeys returned by the configured data
        provider.
    -   Display departure/arrival times, stations, duration, transfers,
        and provider-supplied status when available.
    -   Clearly label missing or unavailable data instead of inventing
        it.
3.  **Journey details**
    -   Show the selected journey's segments and transfer information.
4.  **Stations**
    -   Search a station list and select a station reliably.
    -   Support aliases/alternate spellings only when defined by the
        data source.
5.  **Favourites and recent searches**
    -   Store preferences locally on the device.
    -   Let users remove saved items.
6.  **Language and accessibility**
    -   Bulgarian as the initial language; structure translations so
        additional languages can be added.
    -   Respect system font scaling, use accessible labels, and ensure
        sufficient contrast.
7.  **Network and offline states**
    -   Loading, no results, timeout, offline, and retry states.
    -   Cache static station data and recent searches where practical.

### Explicitly out of scope unless separately approved

-   Purchasing or issuing tickets.
-   Payments, user accounts, or identity verification.
-   Real-time train tracking, delay predictions, or push notifications.
-   Scraping websites or bypassing access controls.
-   Presenting the app as an official BDZ product without permission.

## 4. Data-source strategy

Before building the journey-search screens, agents must identify and
document a lawful, reliable data source.

1.  Check for an official BDZ API, open-data feed, or written permission
    to access a service.
2.  Record the source owner, terms, rate limits, fields, update
    frequency, and attribution requirements.
3.  Define a typed `TrainDataProvider` interface so the UI does not
    depend on one provider implementation.
4.  Add a mock provider for development and tests.
5.  If no suitable live source is available, ship the MVP with clearly
    labelled demo data or a station directory, and do not imply that
    journey results are current.

Suggested interface:

``` ts
export interface JourneySearch {
  fromStationId: string;
  toStationId: string;
  date: string; // ISO date: YYYY-MM-DD
}

export interface TrainSegment {
  fromStationId: string;
  toStationId: string;
  departureTime: string | null;
  arrivalTime: string | null;
  trainNumber?: string;
}

export interface Journey {
  id: string;
  segments: TrainSegment[];
  durationMinutes?: number;
  sourceUpdatedAt?: string;
}

export interface TrainDataProvider {
  searchJourneys(input: JourneySearch): Promise<Journey[]>;
}
```

Treat provider data as untrusted input: validate it at the boundary,
handle missing fields, and never hard-code live-looking schedules as
real data.

## 5. Recommended technology stack

  -----------------------------------------------------------------------
  Area                                Recommendation
  ----------------------------------- -----------------------------------
  Mobile framework                    React Native with TypeScript

  Project workflow                    Expo + Expo Router, unless a
                                      verified native requirement makes
                                      bare React Native preferable

  Navigation                          Expo Router / React Navigation

  Server state                        TanStack Query

  Local UI state                      React hooks; add Zustand only if
                                      shared state warrants it

  Forms and validation                React Hook Form + Zod

  HTTP                                Fetch or a small typed API client

  Local persistence                   AsyncStorage; use SecureStore only
                                      for secrets/tokens

  UI                                  React Native Paper or a small
                                      consistent custom design system

  Tests                               Jest or the framework's supported
                                      test runner; React Native Testing
                                      Library

  Quality                             ESLint, Prettier, TypeScript strict
                                      mode

  Container tooling                   Docker and Docker Compose where
                                      useful

  CI                                  GitHub Actions or the repository's
                                      existing CI
  -----------------------------------------------------------------------

Agents must check the current stable versions and compatibility before
pinning dependencies. Commit the lockfile and avoid unreviewed
dependency churn.

## 6. Architecture

Keep the app feature-oriented and separate presentation from data
access.

``` text
src/
  app/                  # routes / screen entry points
  components/           # reusable UI
  features/
    journey-search/
    journey-results/
    journey-details/
    stations/
    favourites/
  services/
    train-data/
      TrainDataProvider.ts
      MockTrainDataProvider.ts
      LiveTrainDataProvider.ts
    api/
  hooks/
  store/
  theme/
  i18n/
  utils/
  types/
  test/
```

Architecture rules: - Screens must not call provider endpoints directly;
use service modules/hooks. - Keep provider-specific mapping inside
`services/train-data/`. - Use typed domain models and runtime validation
for external responses. - Keep secrets out of the mobile bundle and Git
history. - If credentials or protected upstream access are needed, use a
backend proxy; never embed private API keys in the app. - Do not
introduce a backend unless a verified data source, secret, caching, or
operational need justifies it.

## 7. Repository and Docker setup

A suggested repository layout:

``` text
bdz-mobile/
  src/
  assets/
  tests/
  scripts/
  Dockerfile
  docker-compose.yml
  .dockerignore
  .env.example
  .gitignore
  package.json
  package-lock.json
  tsconfig.json
  app.json
  eas.json                 # if using Expo EAS
  README.md
  plan.md
```

Docker should make the development toolchain repeatable, not hide
platform limitations.

### Dockerfile baseline

Agents should adapt this example to the chosen Expo/React Native
workflow and pin the Node image to a supported LTS version.

``` dockerfile
FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies reproducibly.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8081

CMD ["npm", "start", "--", "--host", "0.0.0.0"]
```

### Compose baseline

``` yaml
services:
  mobile:
    build:
      context: .
    working_dir: /app
    ports:
      - "8081:8081"
    volumes:
      - .:/app
      - mobile_node_modules:/app/node_modules
    environment:
      - CI=false
    command: npm start -- --host 0.0.0.0

volumes:
  mobile_node_modules:
```

The exact command and ports may change with the selected Expo/Metro
version. Verify that hot reload works from a physical device or emulator
on the host network. Do not assume a container can directly launch the
host's iOS Simulator.

### Android build container

If agents choose native Android builds inside Docker, create a separate
build stage/image with a compatible JDK, Android command-line tools, SDK
platform, and build-tools versions. Accept Android SDK licences in the
documented build process and cache Gradle dependencies. Pin versions and
verify the build in CI.

If using Expo, prefer Expo's supported local/cloud build workflows
rather than maintaining a custom Android toolchain without need.

### Environment configuration

-   Commit `.env.example` with variable names and safe placeholders
    only.
-   Ignore `.env`, signing files, keystores, provisioning profiles, and
    credentials.
-   Validate required public configuration at app startup.
-   Never put server secrets in `EXPO_PUBLIC_*` variables; these are
    public in the client bundle.

## 8. UI/UX requirements

-   Use a clean, readable interface suitable for travellers checking
    information quickly.
-   Make departure and arrival stations visually distinct.
-   Show local times consistently and define how dates/time zones are
    handled.
-   Support Cyrillic, long station names, small screens, and dynamic
    text sizing.
-   Provide visible loading, error, retry, no-results, and offline
    states.
-   Avoid false precision: distinguish scheduled information from
    real-time status.
-   Ask for location permission only if a feature genuinely requires it;
    station search should work without it.
-   Add confirmation for destructive actions such as clearing saved
    items.
-   Keep touch targets accessible and test VoiceOver and TalkBack on key
    flows.

## 9. Implementation phases and agent tasks

### Phase 0 --- Discovery and decisions

**Tasks** - Inspect the repository before modifying it. - Confirm
whether Expo is appropriate. - Research and document the train-data
source and its permitted use. - Define the MVP and record unresolved
assumptions in `docs/decisions.md`.

**Acceptance criteria** - Data source status is explicit: approved live
provider, mock-only, or blocked. - Platform build approach is documented
for Android and iOS. - No invented API endpoints or credentials.

### Phase 1 --- Scaffold and quality gates

**Tasks** - Create the React Native + TypeScript project. - Configure
strict TypeScript, linting, formatting, tests, and path aliases if
useful. - Add Docker development tooling and setup instructions. - Add
CI checks for install, type check, lint, and tests.

**Acceptance criteria** - Clean install succeeds from the lockfile. -
App starts on Android and the documented iOS path. - Docker development
server is reachable from the host/device as documented. -
`npm run typecheck`, `npm run lint`, and `npm test` pass (scripts may be
named consistently in the project).

### Phase 2 --- Design system and navigation

**Tasks** - Implement theme, typography, buttons, inputs, cards, loading
indicators, and error states. - Build navigation for Search, Results,
Details, and Favourites/Recent. - Add Bulgarian strings via a central
translation layer.

**Acceptance criteria** - All core screens are navigable. - Layout
adapts to supported screen sizes and larger text. - No screen relies on
hard-coded mock results without a visible demo label.

### Phase 3 --- Station search and journey search

**Tasks** - Implement station picker and search form. - Validate station
selections and date. - Add unit tests for form validation and station
filtering.

**Acceptance criteria** - Invalid and incomplete input is handled
clearly. - Cyrillic station search works. - Search requests use typed
domain models.

### Phase 4 --- Provider integration and results

**Tasks** - Implement the mock provider first. - Integrate the approved
live provider only after validating terms and schema. - Add runtime
response validation, timeouts, cancellation where possible, caching, and
error mapping. - Build results and journey detail views.

**Acceptance criteria** - Mock tests cover success, empty results,
malformed response, timeout, and server error. - UI clearly
distinguishes demo, scheduled, and real-time information. - No provider
failure crashes the app.

### Phase 5 --- Favourites, recent searches, and resilience

**Tasks** - Persist favourites and recent searches locally. - Add
offline/error states and retry. - Define cache expiry and stale-data
labels.

**Acceptance criteria** - Saved items survive app restarts. - Users can
remove saved items. - Cached or stale information is clearly labelled.

### Phase 6 --- Test and harden

**Tasks** - Add component and service tests. - Add end-to-end smoke
tests for the main journey-search flow where practical. - Test on a real
Android device and an iOS simulator/device using the supported Mac/cloud
path. - Check accessibility, app permissions, privacy disclosures, and
crash logs.

**Acceptance criteria** - Core flow works on both platforms. - No
critical or high-severity known defects remain. - No secrets are present
in source control or the app bundle. - CI quality gates pass.

### Phase 7 --- Build and release

**Tasks** - Configure app identifiers, icons, splash screen, versioning,
and signing. - Build Android artifacts through the chosen reproducible
path. - Build iOS artifacts on macOS/Xcode or approved cloud CI. -
Prepare store metadata, privacy disclosures, and release notes. - Keep
release credentials in protected CI secrets.

**Acceptance criteria** - A test build is installed and verified on each
platform. - Release steps are documented and repeatable. - Store
submission is not described as complete until the stores approve the
app.

## 10. Suggested npm scripts

Adapt these to the generated project and ensure every script actually
exists.

``` json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "jest"
  }
}
```

`expo run:ios` requires macOS with Xcode for a local native build. In an
Expo-managed workflow, cloud builds can be used for iOS without running
Xcode in the Linux container.

## 11. Testing strategy

-   **Unit tests:** station filtering, validation, time formatting,
    provider mapping, and cache rules.
-   **Component tests:** search form, station picker, results list,
    error states, and favourites.
-   **Integration tests:** provider-to-domain mapping and query/cache
    behaviour.
-   **Platform smoke tests:** app launch, search, result selection,
    navigation, and persistence on Android and iOS.
-   **Regression tests:** malformed provider payloads, offline mode,
    empty results, long station names, and Bulgarian text.
-   **Manual accessibility checks:** VoiceOver, TalkBack, font scaling,
    contrast, and touch target sizes.

Do not test only on simulators; verify at least one physical device per
platform before release where access is available.

## 12. Security, privacy, and reliability

-   Request the minimum permissions needed.
-   Do not collect personal data unless a feature requires it and the
    purpose is documented.
-   Use HTTPS for network traffic.
-   Never commit tokens, passwords, signing keys, or private
    certificates.
-   Avoid logging sensitive request data.
-   Validate network responses and handle unexpected values defensively.
-   Provide a privacy policy and accurate store disclosures before
    public release.
-   Respect upstream terms, rate limits, attribution, and caching
    restrictions.

## 13. CI/CD checklist

For each pull request: - Install dependencies with the lockfile
(`npm ci`). - Run TypeScript checks. - Run lint and unit tests. - Build
or validate the Android app where CI resources allow. - Run an iOS build
on a macOS runner when native iOS validation is required. - Cache
dependencies safely and avoid caching secrets. - Upload build artifacts
only from protected workflows.

For releases: - Use protected branches and approval for signing/release
jobs. - Store credentials in CI secret storage. - Build from a tagged
commit. - Record artifact version, commit SHA, and build result.

## 14. Definition of done

The MVP is done only when: - \[ \] A single React Native + TypeScript
codebase supports iOS and Android. - \[ \] The data-source status and
limitations are documented honestly. - \[ \] Search, results, details,
and saved journeys work end-to-end with the configured provider. - \[ \]
Loading, empty, offline, timeout, and error states are implemented. - \[
\] Bulgarian text and Cyrillic station search work. - \[ \] Type
checking, linting, and tests pass in CI. - \[ \] Docker setup is
documented and verified for its supported tasks. - \[ \] Android build
is reproducible. - \[ \] iOS build path is reproducible on macOS or
approved cloud build infrastructure. - \[ \] README documents
prerequisites, setup, environment variables, testing, and build
commands. - \[ \] No secrets or unapproved data access methods are
included.

## 15. Agent working rules

1.  Inspect the existing repository and report findings before large
    changes.
2.  Implement small, reviewable increments; do not rewrite unrelated
    files.
3.  Prefer official documentation and verify package compatibility
    before choosing versions.
4.  Never invent an API, endpoint, live schedule, or integration status.
5.  Keep mock data clearly separated from production data.
6.  Run relevant tests and checks after each meaningful change.
7.  Update `README.md` and decision records when setup or architecture
    changes.
8.  If blocked by API access, Apple signing, device access, or
    credentials, document the blocker and continue with mock-based work
    where possible.
9.  Do not claim a build, test, deployment, or store submission
    succeeded unless it was actually run and verified.

## 16. First actions for the agents

1.  Inspect the repository and available development environment.
2.  Decide between Expo and bare React Native, documenting the reason.
3.  Verify the train-data source and usage rights; use a mock provider
    if no approved source is available.
4.  Scaffold the TypeScript app and quality scripts.
5.  Add Docker development tooling and verify host/device connectivity.
6.  Implement the station picker and journey-search flow with mock data.
7.  Add tests and CI gates before integrating a live provider.
8.  Verify Android and iOS build paths separately and document the exact
    commands.

------------------------------------------------------------------------

**Core principle:** one shared React Native + TypeScript codebase;
Docker for reproducible tooling and supported builds; macOS/Xcode or a
compatible cloud build service for native iOS builds.


# 17. Expanded Product Requirements (Sign-in, Ticketing, Map, Scale, Onboarding)

This section extends the original MVP. It does not replace the data-source, platform, security, or Docker constraints above.

## 17.1 BDZ documentation and integration boundary

Agents must review the following public BDZ resources before implementing ticketing or representing any data as official:

- BDZ online ticketing portal: https://tickets.bdz.bg/
- Online sales terms: https://bileti.bdz.bg/terms
- Ticketing portal help/API documentation: https://tickets.bdz.bg/portal/Help
- BDZ general passenger transport conditions: https://www.bdz.bg/bg/a/obshchi-usloviya
- BDZ personal-data protection information: https://www.bdz.bg/en/a/zashchita-na-lichni-danni-en
- BDZ passenger FAQs: https://www.bdz.bg/bg/a/chesto-zadavani-vprosi

The public ticketing portal describes account registration, journey search, electronic ticket purchase, payment, ticket retrieval, and displaying an electronic ticket on a phone. Its terms describe restrictions and conditions for online sales, reservations, cancellation, and refunds. The public API help page lists endpoints but does not provide complete endpoint documentation in the page itself.

**Critical:** public documentation is not permission to reuse BDZ APIs, scrape the portal, impersonate the official service, or sell tickets through an unofficial client. Before direct integration, obtain written authorization and technical/payment integration requirements from BDZ. Do not reverse engineer private endpoints or automate browser sessions as a substitute for an approved integration.

Until authorization and a supported integration are confirmed:
- Use a mock ticketing provider in development.
- Provide a clearly labelled “Continue to official BDZ ticketing” link to the official portal if approved by product/legal review.
- Do not collect payment card details in the app.
- Do not claim a ticket is purchased unless the authorised ticketing system confirms it.
- Do not copy or store BDZ account credentials.
- Keep ticketing behind a `TicketingProvider` interface so the approved implementation can be added later without rewriting screens.

Record the date the documentation was reviewed, relevant terms, contact/authorization status, API owner, supported functions, and unresolved legal questions in `docs/bdz-integration-review.md`.

## 17.2 Authentication and account lifecycle

Implement account features only for the app's own service, unless BDZ explicitly authorizes account federation.

Required flows:
- Sign up with email and password, or an approved identity provider.
- Verify email.
- Sign in and sign out.
- Forgot-password / reset-password flow.
- Session refresh and secure session expiry.
- Delete account and request data export where applicable.
- Clear error messages for invalid credentials, rate limits, network failures, and unverified accounts.
- Guest access to public timetable/map features where practical; do not force account creation for features that do not need an account.

Security requirements:
- Use a reputable identity provider or well-maintained authentication service; do not invent custom cryptography.
- Store refresh tokens only in platform-secure storage (e.g. Keychain/Keystore via an appropriate library); never AsyncStorage or plaintext files.
- Enforce authorization server-side for every private resource.
- Use rate limits, abuse detection, secure password-reset tokens, and email verification.
- Never log passwords, access tokens, payment data, or sensitive personal information.
- Add automated tests for account enumeration risks, token expiry, revoked sessions, and unauthorized access.
- Define account retention/deletion behaviour before launch.

## 17.3 Ticket purchasing — authorized-provider-only workflow

Model the purchase as a server-controlled state machine, for example:

`draft → price_confirmed → pending_payment → paid → ticket_issued`

Failure/edge states must include `payment_failed`, `issuance_failed`, `cancelled`, `refund_pending`, and `refunded` where the provider supports them.

Requirements:
- Display journey, travel date, passenger count, fare, reservation/seat details, discounts, and final total before confirmation.
- Clearly state applicable fare, cancellation, refund, and discount conditions from the authorized provider.
- Revalidate availability and price on the server immediately before payment.
- Use a PCI-compliant payment service/provider-hosted checkout; never store raw card numbers or CVVs.
- Use idempotency keys for purchase and payment operations to prevent duplicate charges.
- Verify payment status server-to-server; do not trust a mobile client success callback alone.
- Issue tickets only after the authoritative provider confirms the transaction.
- Store ticket references and minimal metadata server-side; display/download the official ticket artifact or approved representation.
- Make ticket status and support/refund routes visible in the user's account.
- Handle delayed payment callbacks, duplicate callbacks, timeouts, provider downtime, and payment-success/ticket-issuance-failure cases with reconciliation jobs and support procedures.
- Keep audit trails for orders and status changes without logging payment secrets.
- Test the full sandbox flow before production; no live payment tests with real customer data.

BDZ's currently published terms may specify sales cutoffs, reservation limitations, required passenger details, ticket display requirements, and cancellation/refund rules. These rules can change and may vary by product. Do not hard-code policy copied from a webpage; use current approved terms and provider responses, and show the applicable terms at purchase time.

## 17.4 One million concurrent users — measurable scale target

“1 million people at once” is a capacity goal, not something a mobile framework or Docker can guarantee. Define the target precisely with load profiles and service-level objectives. The architecture must be designed and load-tested for up to 1,000,000 concurrent active clients, while expected request rates, traffic bursts, and purchase concurrency are established from product assumptions.

Required architecture principles:
- Stateless API instances behind a load balancer and autoscaling.
- CDN for static assets and map tiles where licensing permits.
- Cache public, non-personal station and timetable data with explicit freshness/expiry rules.
- Use a managed, highly available database with indexes, connection pooling, backups, and tested recovery.
- Add a queue for asynchronous email, ticket notifications, reconciliation, and other non-interactive work.
- Apply rate limits, request timeouts, bounded retries with jitter, circuit breakers, and backpressure.
- Use idempotency and transactional consistency for orders and payments; never rely on caches for payment truth.
- Partition or shard data only when measured workloads justify the added operational complexity.
- Add observability: metrics, structured logs, distributed traces, dashboards, alerts, and correlation IDs.
- Protect against DDoS and abusive traffic using infrastructure/provider controls.
- Design graceful degradation so timetable/map browsing can remain available if noncritical services fail.
- Keep user-specific data private; never cache authenticated responses in a shared CDN cache.

Initial service objectives to validate with load tests (targets, not guarantees):
- Public journey-search API: p95 latency under 500 ms for cached/common queries, excluding upstream provider latency.
- API availability target: 99.9% monthly for the agreed production scope.
- No duplicate successful charges or orders under retries.
- Define recovery point objective (RPO) and recovery time objective (RTO) with the operator.
- Load-test at the agreed peak request rate, ramp-up profile, and sustained duration, including a separate ticket-purchase burst test.

Before production, create `docs/scale-and-load-test-plan.md` documenting:
1. Expected requests per active user per minute.
2. Peak search rate and ticket checkout rate.
3. Read/write mix and cache hit assumptions.
4. Dataset sizes and timetable update patterns.
5. Load-test tool, test environment, test duration, and ramp-up.
6. p50/p95/p99 latency, error rate, saturation, and cost.
7. Results, bottlenecks, fixes, and a repeatable regression test.

Do not state that the system supports one million concurrent users until the agreed test has passed in a representative environment. A single Docker Compose stack is for local development, not a production deployment strategy at this scale.

## 17.5 Bulgaria map and station discovery

Build an interactive map focused on Bulgaria with:
- Map markers for stations from a verified, licensed station dataset.
- Station search and a list/map toggle for accessibility.
- Station detail cards showing only verified data.
- Optional route display between selected stations if reliable route geometry is available.
- Clear loading, empty, offline, and location-permission states.
- Manual station selection that works without granting location permission.
- Deep links from a station or journey result into the relevant details screen.

Map requirements:
- Choose a map SDK/provider after reviewing mobile SDK support, offline behaviour, costs, attribution, data licensing, privacy, and rate limits.
- Do not scrape map tiles or use a provider's tiles in violation of its terms.
- Store only the minimum location data necessary; request foreground location permission only for a user-initiated nearby-station feature.
- Do not assume that a map line is an operational train route or that a marker implies real-time service.
- Provide an accessible list alternative to the map, and test performance on low-end devices.
- Cache tiles only if explicitly permitted by the provider.
- Keep map keys restricted by platform/package/bundle ID where supported; treat mobile SDK keys as public identifiers, not server secrets.

## 17.6 English and Bulgarian localization

Support `bg` and `en` from the first release.

Requirements:
- Put all user-visible strings in translation resources, never scatter literal text through screens.
- Detect device locale on first launch, while allowing the user to change language in Settings.
- Persist the user's language choice.
- Provide a reliable fallback language for missing translations.
- Localize dates, times, numbers, currency, validation messages, ticket states, legal disclosures, onboarding, accessibility labels, and error messages.
- Use correct Bulgarian Cyrillic and reviewed English translations; do not rely on machine translation for legal or payment text without review.
- Keep station names in the provider's official display form, with searchable aliases where licensed and verified.
- Test long translations, text scaling, and layout expansion in both languages.

Suggested resource layout:

```text
src/i18n/
  index.ts
  locales/
    bg.json
    en.json
```

## 17.7 First-launch onboarding and user-friendly UI

On the first launch, show a short, skippable guide (three or four screens maximum):
1. **Find a train** — choose departure, destination, and date.
2. **Check your trip** — review times, transfers, and the freshness/source of information.
3. **Tickets** — explain the official/authorized purchase path and how to show a valid ticket.
4. **Map and language** — find stations on the map and switch Bulgarian/English.

Requirements:
- Include visible Skip and Next actions, a page indicator, and a final “Start using the app” action.
- Ask for notification or location permission only at the point the user activates a feature that needs it, not as a condition of onboarding.
- Save onboarding completion locally; do not show it every launch.
- Make the guide accessible with screen readers, adequate contrast, dynamic font scaling, and clear focus order.
- Let users reopen the guide from Settings → Help.
- Do not use onboarding to hide or preselect marketing consent, location consent, or legal acceptance.
- Use screenshots/illustrations only if they match the actual implemented UI.
- Add analytics for onboarding only after privacy review; avoid collecting unnecessary identifiers.

Core navigation should stay simple:
- **Search**
- **Map**
- **My trips / Tickets**
- **Settings**

When not signed in, public search and map can remain available. Prompt for sign-in only when a feature genuinely needs an account.

## 17.8 Legal, privacy, and compliance checklist

This is an engineering checklist, not a substitute for advice from a qualified Bulgarian/EU lawyer.

Before public launch, assign an owner to verify:
- **BDZ authorization and contracts:** permission to use data, APIs, logos, timetable content, ticketing, fares, and ticket artefacts; service-level commitments and support responsibilities.
- **GDPR:** identify controller/processor roles, lawful basis for each processing purpose, privacy notices, data minimization, retention/deletion schedules, data-subject request handling, processor agreements, security measures, and international transfers where applicable.
- **Consent:** separate optional analytics/marketing consent from essential service processing; do not treat acceptance of terms as blanket consent for every purpose.
- **Children:** determine whether the service is directed at or used by children and apply appropriate age/privacy safeguards.
- **Payments and consumer law:** use an approved payment provider, display total prices and seller identity, explain cancellation/refund rights and exceptions, and provide complaint/support channels. Confirm whether additional consumer or payment regulation applies to the actual business model.
- **Ticket terms:** accurately display the authorized carrier's applicable conditions, discount eligibility, required proof, seat/reservation constraints, cancellation deadlines, and ticket inspection rules.
- **Accessibility:** review applicable EU/Bulgarian accessibility obligations for the service and its distribution channels.
- **App stores:** prepare accurate privacy labels/disclosures, account deletion paths if accounts can be created, support contact, and required review notes.
- **Security:** threat model, dependency scanning, secure secrets, incident response, backups, penetration testing appropriate to risk, and breach-response process.
- **Intellectual property:** permission for logos, station imagery, map assets, translations, and third-party datasets.
- **Terms of service:** define the app operator, service availability, limitations, support, dispute process, and relationship to BDZ. Never imply BDZ endorses the app unless that is true.

Create `docs/legal-compliance-matrix.md` with columns: requirement, why it applies, responsible owner, evidence/source, status, due date, and launch blocker. Any unresolved authorization for ticket sales is a **launch blocker** for in-app ticket purchase.

## 17.9 Expanded test plan and acceptance criteria

Add tests for:
- Sign-up, verification, login, logout, password reset, session expiry, and account deletion.
- Authorization boundaries and attempts to access another user's tickets.
- Duplicate purchase submissions, payment callbacks arriving more than once, timeouts, and provider reconciliation.
- Price/availability changes between search and checkout.
- Both languages across onboarding, auth, search, map, ticketing, and error states.
- Map attribution, station selection, denied permissions, offline use, and list fallback.
- Load and soak tests for journey search, map/station reads, authentication, and checkout APIs.
- Accessibility checks using VoiceOver and TalkBack.
- Privacy checks ensuring tokens, passwords, payment details, and unnecessary location history never appear in logs.

The expanded release is not done until the original definition of done and all applicable requirements in this section are met. In-app ticket sales remain disabled until the legal and technical authorization gate passes.
