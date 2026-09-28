# Progress

## Current Topic
> What am I working on right now, and which step of the framework am I on?

Fundamentals → **Scalability** ✅, **Latency vs Throughput** ✅, and
**Load Balancers** ✅ (all completed).
Next: **SQL vs NoSQL**, then Caching Strategies — or start Topic 01, Rate Limiter.

## What I Learned
> Concrete takeaways — concepts, gotchas, "aha" moments.

- Bottleneck first: name the resource that runs out (CPU / RAM / DB / network)
  before reaching for a fix.
- **Vertical scaling** = bigger box (up ↑). **Horizontal scaling** = more boxes
  (out →). I had these two swapped at first.
- Vertical scaling limits: there's a biggest machine + it's a single point of failure.
- A **load balancer** routes requests across machines.
- **Stateless** servers (no per-user data in local memory; shared state in Redis/DB)
  are what make horizontal scaling possible.
- Caching (Redis + TTL) *reduces* load but isn't the same as *adding capacity*.
- Costs of scaling out: complexity, new single points of failure (Redis!), money.
- Meta-lesson: scaling is never "done" — fix one bottleneck and it moves to the next.
- **Load Balancer** — L4 (connections, fast, order-entry path) vs L7 (HTTP, path/TLS
  routing, REST + WebSocket). Split by traffic type; don't pick one religion.
- LB is on the critical path of every request + a SPOF → **high availability** is the
  #1 NFR. All other NFRs flow from that one fact.
- Never run 1 LB — run **2+ active-active** for redundancy. Instance count is driven
  by *availability*, not throughput (N+1, not a random big number).
- Redundancy only helps if copies **don't share a failure domain** (same box/rack/DC).
  Spread across DCs; use DNS for regional failover.
- Exchange load reality: ~40k rps inbound REST, but ~1M msg/sec (~1.6 Gbps) outbound
  **market-data fan-out** is the real beast (concurrent connections, not rps).
- Algorithms: **Round Robin** for short uniform requests; **Least Connections** for
  long-lived WebSockets (RR drifts out of balance because connections live for hours).
- Retries must respect **idempotency** — retrying a `POST /order` can double-submit.
- Fix for sessions: don't use sticky sessions — **externalize state** so servers stay
  stateless & interchangeable (ties back to statelessness lesson above).

## Weak Areas
> Things I couldn't answer or had to look up. Revisit these.

- Vertical vs horizontal naming — drill until automatic.
- Whether fast-changing data (live prices) is safe to TTL-cache — still fuzzy;
  revisit in Topic 07 (snapshots + deltas over WebSockets vs TTL cache).
- Replication and sharding (Redis/DB) — only touched briefly; learn as fundamentals.
- NFR numbers (the "nines", latency budgets, throughput orders of magnitude) — had to
  be given these; practice deriving them from "critical path + SPOF".
- DNS-based failover / VIP / Anycast — got confused by the three options; revisit
  lightly later. Core idea (2 LBs so one can die) is solid; the plumbing is fuzzy.
- Active vs passive health checks — introduced but not drilled.

## Next Steps
> The specific next action to take.

- Answer the 3 Load Balancer interview questions (sticky-session logout debug;
  active vs passive health checks; safe retries on POST /order).
- Then start **SQL vs NoSQL**, or begin Topic 01 (Rate Limiter) and build the Node.js
  version per mentor rule 5.

## Session Log
> One line per session: `YYYY-MM-DD — summary`

- 2026-09-21 — Repo initialized. Structure, templates, and mentor rules set up.
- 2026-09-27 — Scalability fundamental: bottlenecks, vertical vs horizontal, load
  balancers, statelessness, shared state, costs. Weak on naming & TTL-caching prices.
- 2026-09-27 — Latency vs Throughput: latency = 1 request's time, throughput = req/s;
  they don't move together; horizontal scaling raises throughput not latency;
  latency levers = less work / caching / geography+CDN / faster storage / vertical;
  individual trader cares latency, platform cares throughput.
- 2026-09-29 — Load Balancers: L4 vs L7 (split by traffic); HA is #1 NFR (critical
  path + SPOF); 2+ active-active across failure domains; market-data fan-out is the
  real load (~1M msg/sec); Round Robin vs Least Connections; retries + idempotency;
  externalize state over sticky sessions. Got overwhelmed by DNS/VIP/Anycast — kept
  the core (2 LBs so one can die) and moved on. Strong on the redundancy reasoning.
