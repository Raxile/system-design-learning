# System Design — Learning Guide

> My personal study companion. Written for how *I* think: frontend dev (React/JS)
> prepping for SDE2 at crypto/fintech. I learn by doing. This file is for
> **learning concepts**; `PROGRESS.md` tracks *where I am*.

---

## 0. How to use this file

- Read **one section at a time**. Don't binge — you'll get overwhelmed (you know this).
- After each concept, try to say it out loud in one sentence before moving on.
- Every concept has a **crypto tie-in** because that's the job I'm aiming for.
- ⭐ = the "senior instinct" lessons. These matter more than memorizing tools.

---

## 1. The 4-Step Framework (use this for EVERY design)

Never jump to a solution. Walk these in order, one at a time:

1. **Requirements** — functional (what it does) + non-functional (fast? consistent?
   available?). ⭐ **Question the requirements here. This is where seniors win.**
2. **Estimates** — capacity. How many requests/sec? How much data? (see §3)
3. **High-level design** — boxes and arrows. Client → LB → servers → DB/cache/queue.
4. **Deep dive** — pick the hardest part and go deep (the bottleneck, the consistency
   problem, the hot path).

---

## 2. ⭐ The Two Senior Instincts (the whole game)

These two questions have solved more of my practice problems than any tool.

### Instinct 1 — "Question the number."
A `users` API that takes **1 second** is a **bug**, not a scaling problem. A single-row
read should be ~1–5 ms. If you accept the fake number, you design a system 200× too big.
**Kill the cause, don't scale the symptom.**

### Instinct 2 — "Question the responsibility."
One endpoint touching 100 tables / taking 1s is **doing too much**. Split it into
focused APIs, or denormalize / parallelize / precompute. A slow endpoint is usually a
**design** problem, not a **capacity** problem.

> The weak candidate scales the slow thing. The strong candidate asks *why is it slow?*

---

## 3. Capacity Estimation (the math I need automatic)

### Little's Law — the one formula that matters
```
concurrent requests = arrival rate (rps) × time per request (sec)
```
Example: 100,000 rps × 1s = **100,000 requests in flight at once.**
This one number drives RAM and server count.

### Two numbers, two different jobs
| Metric | Sizes | How to get it |
|---|---|---|
| **Requests/sec (peak)** | RAM, CPU, # servers, load balancer | ALB `RequestCount`, access logs |
| **Total rows / data size** | Storage, DB size, shard-or-not decision | row size × row count |

### Rough numbers to memorize
- One user row ≈ **1–2 KB**. → 41k users ≈ **~82 MB** (fits anywhere; no sharding).
- One in-flight request ≈ **~10–50 KB** RAM (sockets + buffers).
- A single Postgres: ~**a few k to ~tens of k** simple reads/sec before it strains.
- ⭐ **Real products run at ~tens–hundreds of rps**, not 100k. Interview numbers lie.

### CPU-bound vs I/O-bound (decide this FIRST for Node)
- **CPU-bound** (real computation): Node blocks. 1 process ≈ 1 req/sec. Ouch.
- **I/O-bound** (waiting on DB/network): Node's event loop juggles thousands at once.
- A `users` API is almost always **I/O-bound** → the DB is the bottleneck, not Node.

---

## 4. Scaling Levers (in the order I should reach for them)

1. **Fix the code / query first** (indexes, N+1, remove the 1s). Free. ⭐ Do this first.
2. **Cache** (Redis) — only helps **repeat/hot** reads. ⭐ Unique reads = ~0% hit rate.
3. **Vertical scale** — bigger box. Simple, but has a ceiling + is a single point of failure.
4. **Horizontal scale** — more boxes behind a load balancer. Needs **stateless** servers.
5. **Read replicas** — copies that serve reads. Scales read QPS. ⭐ NOT writes, NOT data
   size. Causes **replication lag** → read-your-writes bug.
6. **Sharding** — split data across DBs by a key (e.g. user_id). Scales reads + writes +
   storage. ⭐ Only when the table outgrows one machine. Adds routing pain.

**Connection pooling (PgBouncer):** multiplexes thousands of app connections down to a
small real DB pool. A DB can't take 100k direct connections — the pool protects it.

---

## 5. ⭐ Consistency — match it to the consequence of being wrong

This is THE core idea for money systems / crypto.

Same data (a wallet balance), two readers, two rules:

| Reader | Needs | Design |
|---|---|---|
| **User glancing at screen** (display path) | "about right" is fine | Cache it, short TTL, eventually consistent, scales huge |
| **Matching engine** deciding a trade (money path) | must be exact | No cache, read source of truth, under a lock/transaction |

> Stale display = nobody cares. Stale balance in a trade = double-spend, real money lost.

**Never serve both paths from one API.** Split: a fast cached **read path** and a slow,
strongly-consistent **write/trade path**.

---

## 6. Caching (next topic to study — details to fill in)

- Patterns: **cache-aside** (most common) · **write-through** · **write-back**.
- Invalidation: **TTL** (time-based) vs **explicit** (delete on write).
- Dangers: **thundering herd / stampede** (cache expires → everyone hits DB at once),
  **hot keys** (one key gets all the traffic).
- ⭐ Crypto tie-in: live prices are NOT TTL-cached — they're pushed as
  **snapshot + deltas over WebSocket** (a TTL would be stale the instant it's set).

---

## 7. Load Balancers (done — quick recap)

- **L4** (connections, fast, order-entry path) vs **L7** (HTTP, path/TLS routing, REST
  + WebSocket). Split by traffic type.
- LB is on the critical path + a single point of failure → run **2+ active-active**
  across failure domains (different DCs). HA is the #1 NFR.
- **Round Robin** for short uniform requests; **Least Connections** for long-lived
  WebSockets.
- Retries must respect **idempotency** (retrying `POST /order` can double-submit).
- Keep servers **stateless** (shared state in Redis/DB) — don't use sticky sessions.

---

## 8. The Roadmap (how much is left)

**~21 topics total. Fundamentals = Lego bricks; Designs = putting them together.**

### Fundamentals (~15) — done: 1-4
1. Scalability ✅ · 2. Latency vs Throughput ✅ · 3. Load Balancers ✅ ·
4. Capacity Estimation ✅ · 5. **Caching** ⏭️ · 6. SQL vs NoSQL · 7. Replication &
Sharding · 8. Consistency & CAP · 9. Message Queues (Kafka) · 10. Rate Limiting ·
11. DB Indexing · 12. WebSockets/real-time · 13. Idempotency & distributed txns ·
14. Monitoring · 15. API design (REST/gRPC)

### Full Designs (~6, crypto-flavored)
1. Rate Limiter (warm-up) · 2. **Order Book + Matching Engine** (the Binance one) ·
3. Real-time Price Feed / market-data fan-out · 4. Wallet / Ledger / Settlement ·
5. Notifications · 6. URL shortener or News Feed (generic)

**Short-on-time priority:** Caching → Consistency/CAP → Replication/Sharding →
Matching Engine. Those four ≈ 80% of a crypto interview loop.

---

## 9. ⭐ My one-line takeaways (read these before any interview)

- Name the **bottleneck** (CPU / RAM / DB / network) before reaching for a fix.
- **Question the number**, then **question the responsibility.**
- `concurrent = rps × latency` (Little's Law).
- Caching only helps **repeat** reads; **unique** reads need real DB scaling.
- Replicas scale **reads**, not writes or storage. Shard only when data outgrows one box.
- **Match consistency to consequence** — cache the display, protect the money.
- Scaling is never "done" — fix one bottleneck, it moves to the next.
