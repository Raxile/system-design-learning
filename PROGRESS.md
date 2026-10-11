# Progress

## Current Topic
> What am I working on right now, and which step of the framework am I on?

Fundamentals → **Scalability** ✅, **Latency vs Throughput** ✅,
**Load Balancers** ✅, **Capacity Estimation / Requirements-first thinking** ✅,
**Caching Strategies** ✅, **Concurrency / Oversell (flash sale)** ✅, and
**SQL vs NoSQL** ✅.
Next: **CAP theorem** (previewed), then **Replication & Sharding**.

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
- **Little's Law**: concurrent requests = arrival rate × time per request.
  100k rps × 1s = 100k in flight. This one number drives RAM + instance count.
- **CPU-bound vs I/O-bound**: Node blocks on CPU work (1 proc ≈ 1 req/s) but juggles
  thousands of I/O-waiting requests via the event loop. Decide this *first*.
- **Question the requirements** = the #1 senior skill. A "users API" taking 1s is a
  BUG (should be ~5ms), not a scaling problem. The fake number inflated the whole
  design ~200×. Kill the cause, don't scale the symptom.
- **Question the responsibility**: one endpoint touching 100 tables / taking 1s is
  doing too much → split into focused APIs (or denormalize / parallelize / precompute).
- **Unique reads kill cache hit rate** — caching only helps repeat/hot reads. Check
  the access distribution (power-law vs uniform) before assuming Redis saves you.
- **PgBouncer** multiplexes 1000s of app connections down to a small real DB pool.
- **Read replicas** scale read QPS but NOT writes or data size, and add replication
  lag → read-your-writes bug (route a user's fresh reads to the primary briefly).
- **Caching — a cache is a second copy, so two things can disagree.** That one fact
  is the whole topic.
- **cache-aside read (miss):** check cache → miss → read DB → store in cache (+TTL) →
  return. Next read = hit.
- **Write: update DB, THEN delete the cache key** (not update it). Delete > update
  because update has a race (out-of-order writes leave stale value stuck); delete just
  forces a clean reload from the source of truth.
- **Ordering matters: DB first, then delete.** Delete-first lets a concurrent reader
  refill the cache with the OLD value → stale until TTL. "Write the truth, then kill
  the stale copy."
- **Invalidation is best-effort; TTL bounds the damage.** Even DB-first-then-delete has
  a rare race (slow reader stores stale after the delete) → always keep a TTL backstop.
- **Thundering herd / stampede = a TIMING problem:** hot key expires → all N requests
  miss at once → wall of identical queries floods the DB. Fixes: single-flight lock,
  background refresh (never expire), serve-stale-while-refreshing.
- **Hot key = a CAPACITY problem:** one key lives on one Redis node → that node's
  CPU/NIC is the ceiling. Fixes: read-replicas, key-splitting (btc_price:0..9),
  client-side local cache. (Different disease from stampede, different cure.)
- **write-back** (cache-only, flush to DB later) = trades durability for speed → risks
  DATA LOSS (not just staleness) if the node dies before flush. Fine for view counts /
  last-seen; NEVER on the money/wallet path.
- ⭐ **Match strategy to read:write ratio.** TTL+lazy = read ≫ write (user profile).
  Push/write-through = write ≈ or > read (live price). Live prices are pushed as
  snapshot+delta over WebSocket, NOT pulled from a TTL cache — the key would be stale
  the instant it's set. (This finally kills the old weak area.)
- **Consistency matches the consequence of being wrong** (the big one): same wallet
  balance → *display path* can be cached/stale-tolerant; *trading/matching-engine
  path* must be strongly consistent, no cache, read-the-truth under a lock. Never
  serve both from one API.
- **Oversell / flash sale (1 item, 10k buyers) — core = ONE atomic operation that
  can't be interrupted.** The whole problem is "exactly one winner, never two."
- ⭐ **The one-liner that solves it:** `UPDATE items SET stock = stock - 1 WHERE id=1
  AND stock > 0`. DB runs it one row at a time internally → exactly one request gets
  `rows_affected=1` (winner); everyone else gets 0 → "out of stock". No explicit lock.
- **`AND stock > 0` is the magic** — it fuses "check available" + "take one" into a
  single unbreakable step. Delete it and stock goes 0 → -1 → -9999 = 10k oversells.
- **read → decide → write is NOT atomic** — the 3-step gap is where races live.
  Write-through caching keeps the cache *fresh for readers* but does NOT fix a *write*
  race (two readers both see stock=1 before either writes 0 → double sell). My mistake
  this session; the fix is to make the *decrement itself* the atomic gate.
- **Redis `DECR` as the gate in front of the DB** (Redis is single-threaded → each
  command finishes before the next): result >= 0 = winner → forward to DB; result < 0
  = reject instantly, never touches DB. Absorbs the 10k spike so only the winner hits
  the database.
- **Two layers, two jobs:** Redis = fast gate that bounces the 9,999 losers; DB =
  source of truth that records the actual sale/payment.
- **Reserve → confirm (two-phase):** click Buy = reserve/hold (atomic gate); then pay
  = confirm. Hold gets a TTL (e.g. 5 min). Pay in time → booked; expire → back in stock.
- **Don't conflate correctness with UX:** "lock one stock" (atomicity, required) is a
  different concern from "update all users" (real-time fan-out to 10k clients, optional
  — usually cheaper to just tell a loser "sold out" *when they click*, not push to all).
- **SQL vs NoSQL — reason DATA → database, never database → data.** State a property
  of the data (connected? known access pattern? is it money?), THEN the DB feature
  follows. "I chose SQL because it has ACID" is circular (the feature-list trap) — the
  real reason is "money is multi-row, all-or-nothing, under concurrency, with invariants
  that can never break," and ACID is what *satisfies* that.
- **NoSQL = give up flexibility to buy scale.** It's NOT "SQL but faster." SQL answers
  *any* question (joins, ad-hoc WHERE, cross-row transactions). NoSQL says "tell me the
  ONE way you read this, I'll make that infinitely scalable — you lose everything else."
- **Market data → NoSQL not because of write volume alone** (a sharded Postgres does 50k
  WPS too). The real reasons: (1) append-only, (2) self-contained / no joins, (3) ONE
  predictable query shape (symbol + time range) → that known access pattern becomes the
  partition key → cheap horizontal scaling. You trade a feature you don't use for one
  you need.
- ⭐ **NoSQL's scaling is only worth its cost when you ACTUALLY have a scale problem.**
  If one SQL box fits the data + QPS, use SQL — joins/ad-hoc queries/ACID come FREE with
  zero downside. Kills the junior mistake "it's big-tech so NoSQL." Prove the scale
  problem first, then give up SQL reluctantly. (10M user profiles = tiny → SQL, even
  though the by-userId lookup *tempts* you toward key-value NoSQL.)
- **The tension to look for:** primary access by a single key (userId) screams NoSQL,
  but an ad-hoc query on non-key fields (country + kyc_status) screams SQL. The question
  is never "which DB" but "which access pattern do I optimize, and what do I give up."
- **ACID vs BASE = consistency vs availability UNDER FAILURE**, chosen by *consequence
  of being wrong* (my own rule from caching). Strip the 8 acronym words to ONE idea: do
  all readers see a write immediately (ACID/strong) or do copies disagree for a few ms
  (BASE/eventual)? Same "a second copy can disagree" disease as caching — replication is
  that disease again. Money → ACID (be correct or be down). Likes/view-counts/display
  name → BASE (stay up, fix later; nobody's harmed). Don't buy consistency you don't need.
- **Why BASE exists (not laziness):** under a network partition an ACID system must
  REJECT the write (can't confirm all copies agree); a BASE system ACCEPTS it and
  reconciles later → stays available. (This is half of CAP, derived.)

## Weak Areas
> Things I couldn't answer or had to look up. Revisit these.

- Vertical vs horizontal naming — drill until automatic.
- ~~Whether fast-changing data (live prices) is safe to TTL-cache~~ ✅ RESOLVED:
  no — push snapshot+delta over WebSocket; match strategy to read:write ratio.
- Flipped the delete ordering once under pressure (said "cache then db"). Drill the
  mnemonic: "write the truth FIRST, then kill the stale copy" until automatic.
- Replication and sharding (Redis/DB) — only touched briefly; learn as fundamentals.
- NFR numbers (the "nines", latency budgets, throughput orders of magnitude) — had to
  be given these; practice deriving them from "critical path + SPOF".
- DNS-based failover / VIP / Anycast — got confused by the three options; revisit
  lightly later. Core idea (2 LBs so one can die) is solid; the plumbing is fuzzy.
- Active vs passive health checks — introduced but not drilled.
- **Flash-sale advanced edge cases (got overwhelmed, revisit gently later):**
  (1) how stock *mechanically* comes back on TTL expiry — Redis key expiry just deletes
  the key, it does NOT re-INCR the counter (needs cron / keyspace-notification / lazy
  reclaim); (2) the **late-payment race** (TTL expires → B buys → A's payment finally
  lands → double sell) → guard with a reservation-state check + idempotency;
  (3) **Redis↔DB consistency** when the fast gate and source of truth disagree
  (reconciliation / outbox / event log). Core is solid; these are the "scale it" layer.
- Reflex to build: when I hear "high concurrency on one resource," reach FIRST for the
  single atomic op (`UPDATE ... WHERE stock > 0` or `DECR`), not for a lock I manage.
- **SQL vs NoSQL reflexes still raw under pressure:** (1) reached for the feature-list
  ("ACID", "BSON") instead of a *data property* — drill "state the data property FIRST";
  (2) said NoSQL "scales in one machine" = the vertical/horizontal flip AGAIN (horizontal
  = across machines). (3) Couldn't produce the no-joins / known-access-pattern reasons
  for market data unprompted. Core landed by end of session; the *first-instinct* wording
  needs reps.

## Next Steps
> The specific next action to take.

- Answer the **3 SQL vs NoSQL interview questions** from the 2026-10-11 session (defend
  NoSQL beyond write volume; 5yr tick data for ad-hoc fraud queries; BASE withdrawal
  during a partition in CAP terms) — the 3rd previews CAP.
- Start **CAP theorem** (next session): already half-derived it (consistency vs
  availability under a partition). Formalize C/A/P, "you only choose during a partition,"
  CP vs AP systems, crypto tie-in = matching engine/ledger = CP, market-data feed = AP.
- Then **Replication & Sharding** (long-standing weak area, touched 3×).
- Build a small **cache-aside demo** in `projects/` (Node/TS + Redis mock): prove the
  read-miss→store→hit path and the DB-first-then-delete write path. I write it.
- Still owed: the 3 Load Balancer interview questions (sticky-session logout debug;
  active vs passive health checks; safe retries on POST /order).

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
- 2026-10-04 — Caching Strategies: cache-aside read/write paths; delete-vs-update
  (delete wins, race reasoning); DB-first-then-delete ordering + the stale-forever
  race; TTL as best-effort backstop; thundering herd (timing) vs hot key (capacity)
  and their different fixes; write-back = data-loss risk, never on money path.
  Big win: push vs pull — live prices are snapshot+delta over WS, not TTL-cached
  (old weak area killed). Flipped delete-ordering once; added a mnemonic to drill.
- 2026-10-07 — Concurrency / Oversell (flash sale: 1 item, 10k concurrent buyers):
  core = ONE atomic op that can't be interrupted → `UPDATE ... WHERE stock > 0` gives
  exactly one winner, no oversell (the `AND stock > 0` fuses check+take). Redis `DECR`
  as the gate in front to absorb the spike (single-threaded → safe). Reserve→confirm
  two-phase with TTL hold. Key correction: write-through caching does NOT fix a write
  race — read→decide→write has a gap; the decrement itself must be the atomic gate.
  Got overwhelmed by advanced edge cases (TTL-reclaim mechanics, late-payment race,
  Redis↔DB reconciliation) → parked in Weak Areas. Still owe full answers to Q1/Q3.
- 2026-10-03 — Capacity estimation + requirements-first thinking: Little's Law
  (concurrent = rps × latency), CPU vs I/O-bound, PgBouncer, read replicas +
  replication lag, unique reads kill caching. Big win: QUESTION THE REQUIREMENTS —
  a 1s users API is a bug, not a scaling problem (inflated design ~200×). Then wallet
  balance example → consistency matches consequence (display path cache-ok, trading
  path strong-consistent, never one API for both). Chose Caching Strategies next.
- 2026-10-11 — SQL vs NoSQL: the core skill = reason DATA PROPERTY → database, never
  the reverse ("it has ACID" is the feature-list trap). NoSQL = give up flexibility
  (joins, ad-hoc queries) to buy horizontal scale, and ONLY worth it with a real scale
  problem + one known access pattern. Market data → NoSQL for no-joins + predictable
  (symbol+time) key, not write volume alone. 10M profiles → SQL (small; by-userId tempts
  NoSQL but ad-hoc compliance query needs SQL). ACID vs BASE = consistency vs availability
  under failure, chosen by consequence of being wrong (money=ACID, likes/display=BASE).
  Stumbles: feature-list reflex, vertical/horizontal flip again, couldn't derive the
  no-joins reason unprompted. Half-derived CAP → picked CAP as next topic.
