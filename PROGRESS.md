# Progress

## Current Topic
> What am I working on right now, and which step of the framework am I on?

Fundamentals → **Scalability** ✅ and **Latency vs Throughput** ✅ (both completed).
Next: **Load Balancers**, then SQL vs NoSQL, then Caching Strategies — or start
Topic 01, Rate Limiter.

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

## Weak Areas
> Things I couldn't answer or had to look up. Revisit these.

- Vertical vs horizontal naming — drill until automatic.
- Whether fast-changing data (live prices) is safe to TTL-cache — still fuzzy;
  revisit in Topic 07 (snapshots + deltas over WebSockets vs TTL cache).
- Replication and sharding (Redis/DB) — only touched briefly; learn as fundamentals.

## Next Steps
> The specific next action to take.

- Say the 3 scalability interview questions out loud without notes.
- Then quiz on **Latency vs Throughput** (next always-on basic), or start Topic 01.

## Session Log
> One line per session: `YYYY-MM-DD — summary`

- 2026-09-21 — Repo initialized. Structure, templates, and mentor rules set up.
- 2026-09-27 — Scalability fundamental: bottlenecks, vertical vs horizontal, load
  balancers, statelessness, shared state, costs. Weak on naming & TTL-caching prices.
- 2026-09-27 — Latency vs Throughput: latency = 1 request's time, throughput = req/s;
  they don't move together; horizontal scaling raises throughput not latency;
  latency levers = less work / caching / geography+CDN / faster storage / vertical;
  individual trader cares latency, platform cares throughput.
