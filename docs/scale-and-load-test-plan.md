# Scale and Load-Test Plan — BDZ Train Companion App

**Status:** DRAFT DESIGN DOCUMENT — **no load test has been run.** There is
currently no backend (DEC-003) and no live data source (DEC-002); the app runs
against a mock provider. This document defines the load model, the test plan
and the SLO **targets** so that measurements can replace assumptions later.

**Date:** 2026-10-22 · **Owner of record:** to be named (DevOps engineer,
checklist §17) · **Companion docs:** `docs/decisions.md` (DEC-003, DEC-011),
plan.md 17.4, addbeforerelease.txt §13 [SCALE GATE].

**Labeling rule (mandatory):** every number in this document is either
`ASSUMPTION — to be confirmed by the product owner`, `ASSUMPTION-CONFIRMED`
(confirmed by a named human on a recorded date), `TARGET` (SLO objective, not a
guarantee) or `MEASURED` (from an actual test run, with date and environment).
Nothing is `MEASURED` yet.

**Capacity-claims gate (DEC-011 / checklist §13):** the phrase
"supports 1,000,000 concurrent users" is **forbidden** until the agreed test
below passes in a representative environment and a human signs off. Until then
the only permitted wording is: *"designed for up to 1,000,000 concurrent active
clients — load test not yet run."* A single Docker Compose stack is local
development only (checklist §13).

---

## 1. Expected requests per active user per minute

Definition of "concurrent active client": an app instance in the foreground or
with an active query within the last 5 minutes.

| Quantity | Value | Label |
|----------|-------|-------|
| Requests per active user per minute (aggregate) | 2.0 | **ASSUMPTION — to be confirmed by the product owner** |
| Of which journey searches | 0.6 | **ASSUMPTION — to be confirmed by the product owner** |
| Of which station/map reads | 1.2 | **ASSUMPTION — to be confirmed by the product owner** |
| Of which writes (favourites, settings — local only today) | 0.2 | **ASSUMPTION — to be confirmed by the product owner** |

Basis (reasoning, not measurement): a session = 1 search + results + details
screen ≈ 3–6 requests, users browse a few minutes. The definition of
"1,000,000 concurrent" itself is **ASSUMPTION — to be confirmed by the product
owner** (registered vs foreground vs recently-active users differ by an order
of magnitude; the concurrency multiplier below assumes "recently-active").

## 2. Peak search rate and ticket checkout rate

Derived from 1,000,000 concurrent active clients (design goal, plan.md 17.4):

| Quantity | Value | Label |
|----------|-------|-------|
| Aggregate peak request rate | 1,000,000 × 2.0 / 60 ≈ **33,300 req/s** | **ASSUMPTION — to be confirmed by the product owner** |
| Peak journey-search rate | ≈ **10,000 searches/s** | **ASSUMPTION — to be confirmed by the product owner** |
| Peak station/map read rate | ≈ **20,000 reads/s** | **ASSUMPTION — to be confirmed by the product owner** |
| Daily active-user peak factor (morning/evening rush vs average) | 3× average | **ASSUMPTION — to be confirmed by the product owner** |
| Checkout initiations (when ticketing is enabled) | 0.5 per 1,000 active users/min ≈ **8/s** steady | **ASSUMPTION — to be confirmed by the product owner** |
| Ticket-purchase burst test rate (separate test) | 10× steady ≈ **80/s** for 10 min | **ASSUMPTION — to be confirmed by the product owner** |

Note (honest scope): ticketing is **disabled** (DEC-004) and these checkout
numbers exist only to size a future, authorised system. The checkout burst test
is mandatory before ticketing goes live (checklist §13) and must demonstrate
**zero duplicate charges/orders under retries**.

## 3. Read/write mix and cache hit assumptions

| Quantity | Value | Label |
|----------|-------|-------|
| Read/write mix (public API) | 95% reads / 5% writes | **ASSUMPTION — to be confirmed by the product owner** |
| Station directory cache hit ratio (on-device + CDN) | ≥ 99% (near-static, versioned dataset) | **ASSUMPTION — to be confirmed by the product owner** |
| Journey search cache hit ratio (common O-D pairs, short TTL) | 60% | **ASSUMPTION — to be confirmed by the product owner** |
| Journey search cache hit ratio (long-tail O-D pairs) | 10% | **ASSUMPTION — to be confirmed by the product owner** |
| Authenticated/personalised responses in shared caches | **0% — forbidden by design** (plan.md 17.4) | TARGET |
| Timetable cache TTL (fresh) | 5 min | **ASSUMPTION — to be confirmed by the product owner** |
| Stale-while-revalidate window after TTL (labelled `cached-stale`) | 24 h | **ASSUMPTION — to be confirmed by the product owner** |

Cache invalidation: directory invalidates on dataset version change; journey
search invalidates on TTL only; payment/order data is **never** cached for truth
(plan.md 17.4). All cache hits still carry provenance labels (DEC-006).

## 4. Dataset sizes and timetable update patterns

| Quantity | Value | Label |
|----------|-------|-------|
| Station dataset size | order of 10²–10³ records (exact count **unknown** until a licensed dataset is obtained — DEC-002/DEC-012) | **ASSUMPTION — to be confirmed by the product owner** |
| Station records with coordinates | unknown share | **ASSUMPTION — to be confirmed by the product owner** |
| Timetable records (legs/day) | unknown — depends entirely on the future data source | **UNKNOWN — cannot be assumed; blocked on DEC-002** |
| Timetable update pattern | unknown; planning assumption is periodic publication (daily/weekly) with intra-day corrections | **ASSUMPTION — to be confirmed by the product owner** |
| Journey results per search | 0–50 | **ASSUMPTION — to be confirmed by the product owner** |
| Orders/tickets per user (eventual) | 0–50/year | **ASSUMPTION — to be confirmed by the product owner** |
| Growth horizon for sizing | 24 months | **ASSUMPTION — to be confirmed by the product owner** |

Index and query expectations (for the future backend, checklist §2): search and
order/ticket queries indexed and tested at **millions of rows**, not tens.

## 5. Load-test tool, environment, duration, ramp-up

**Tool:** Grafana **k6** (checked 2026-10-22: stable 2.1.0, AGPL-3.0, actively
maintained). Acceptable as internal test tooling that is never linked into or
distributed with the product; do not modify/distribute k6 itself without
understanding AGPL-3.0 obligations (DEC-009). Alternatives to evaluate before
committing (verify licenses then): Gatling, Locust. Final tool choice:
**ASSUMPTION — to be confirmed by the product owner / DevOps owner.**

**Environment:** a **representative staging environment** that mirrors
production topology (same instance types, same DB tier, same CDN, same limits).
A laptop or Docker Compose run is a smoke test only and produces no publishable
numbers (checklist §13). Environment provisioning itself is blocked on DEC-003
(backend does not exist yet).

**Scenarios (all durations/ramps ASSUMPTION — to be confirmed by the product
owner):**

| Test | Profile | Duration | Ramp-up |
|------|---------|----------|---------|
| Smoke | 50 VUs constant | 10 min | 1 min |
| Peak load | to 33,300 req/s modelled mix (§1–§3) | 2 h sustained | staged 0→25→50→75→100% over 30 min |
| Soak | 50% of peak | 24 h | 30 min |
| Spike | 0→200% of peak | 15 min | 2 min |
| Checkout burst (ticketing only) | 80 payment initiations/s | 10 min | 1 min |
| Overload/backpressure | 300% of peak until limits engage | 15 min | 1 min |

Additional required checks (checklist §13): rate limits/timeouts/backpressure
verified under overload; duplicate-charge invariants asserted in the checkout
burst; sharding/partitioning considered **only after** measurements justify it.

## 6. p50/p95/p99 latency, error rate, saturation, cost

**SLO targets (plan.md 17.4) — TARGETS, NOT GUARANTEES:**

| Metric | Target | Label |
|--------|--------|-------|
| Public journey-search p95 (cached/common queries, excluding upstream provider latency) | < 500 ms | TARGET (plan.md 17.4) |
| API availability, agreed production scope | 99.9% monthly | TARGET (plan.md 17.4) |
| Duplicate successful charges or orders under retries | 0 | TARGET (plan.md 17.4) |

**Additional thresholds proposed for validation (all ASSUMPTION — to be
confirmed by the product owner):**

| Metric | Proposed threshold | Label |
|--------|--------------------|-------|
| Search p50 | < 150 ms | **ASSUMPTION — to be confirmed by the product owner** |
| Search p99 | < 1,500 ms | **ASSUMPTION — to be confirmed by the product owner** |
| Station reads p95 | < 200 ms | **ASSUMPTION — to be confirmed by the product owner** |
| Checkout API p95 (excluding payment provider hosted page) | < 1,000 ms | **ASSUMPTION — to be confirmed by the product owner** |
| Error rate (non-4xx, non-user-cancelled) | < 0.1% of requests (0.1% = the 99.9% availability budget) | **ASSUMPTION — to be confirmed by the product owner** |
| CPU saturation at peak | < 70% per instance | **ASSUMPTION — to be confirmed by the product owner** |
| DB connection pool utilisation | < 80% | **ASSUMPTION — to be confirmed by the product owner** |
| Queue depth (background jobs) | bounded; no unbounded growth in 24 h soak | **ASSUMPTION — to be confirmed by the product owner** |
| Memory | no monotonic growth over soak | **ASSUMPTION — to be confirmed by the product owner** |

**Cost:** **UNKNOWN — cannot be estimated yet.** Cloud provider, region (EU
residency required — checklist §6), map SDK, email and payment provider costs
are undecided (DEC-003/DEC-012). Requirement regardless of numbers: cost
alerts and spending caps from day one (checklist §11). A cost-per-1,000-search
figure must be added here after the first representative test.

## 7. Results, bottlenecks, fixes, and repeatable regression test

**Results: NOT RUN — no load test has been executed. This section is empty by
design and must be filled with real numbers from real runs before any capacity
statement is made (DEC-011).**

Template to complete per run (each run dated, with environment + commit SHA):

| Field | Content |
|-------|---------|
| Run date / operator | — |
| Environment (topology, instance types) | — |
| Commit SHA + config version | — |
| Tool + version + scenario | — |
| Achieved rate (req/s) vs target | — |
| p50 / p95 / p99 per endpoint | — |
| Error rate + error breakdown | — |
| Saturation signals (CPU/mem/DB/queue/net) | — |
| Bottlenecks found | — |
| Fixes applied (PR links) | — |
| Re-test result | — |
| Cost of the run + projected monthly cost | — |

**Bottleneck playbook (expected candidates — hypotheses, not findings):**
upstream provider latency and rate limits (mitigate: caching, backoff,
degradation to `cached-stale` labelling); DB hot rows on popular O-D searches
(mitigate: read replicas/cache before any sharding — checklist §13); thundering
herd on cache expiry (mitigate: jittered TTLs, request coalescing); checkout
reconciliation lag (mitigate: queue + idempotent workers, DEC-008).

**Repeatable regression test:** a scaled-down k6 scenario (~10% of modelled
peak, 15 min) wired into CI or a scheduled job **once a backend exists**, with
threshold assertions on p95, error rate and duplicate-order invariants. A
regression run that fails thresholds blocks release of the affected service
until explained. The regression scenario definition lives in the backend repo
(future) and is referenced from here.

---

## Go/no-go checklist for making ANY capacity claim (SCALE GATE)

- [ ] Backend exists in a representative staging environment (DEC-003).
- [ ] All `ASSUMPTION` labels above replaced by `ASSUMPTION-CONFIRMED`
      (product owner, dated) or `MEASURED` values.
- [ ] Peak-load and soak tests run and recorded in §7 with real numbers.
- [ ] Separate checkout burst test passed with **zero** duplicate charges/orders.
- [ ] Overload behaviour (rate limits, timeouts, backpressure) verified.
- [ ] p95/availability targets measured or explicitly conceded with a plan.
- [ ] Cost measured and budgets/alerts configured.
- [ ] Human sign-off recorded (DEC-011).

Until every box is checked: no "supports 1,000,000 concurrent users" claims
anywhere — README, store listings, reports or code comments.
