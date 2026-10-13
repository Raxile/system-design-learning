# Load Balancer — Notes (simple version)

> One-line definition: **A load balancer is a "traffic cop" that spreads incoming
> requests across many servers, so no single server gets overwhelmed.**

```
              ┌→ App server 1
User → LB ────┼→ App server 2
              └→ App server 3
```

Cars = requests. Lanes = servers. The LB decides which lane each car takes.

---

## 1. Why do we even need it?

- One server can only handle so much traffic. Add more servers → but now *who
  decides which server each request goes to?* That's the load balancer's job.
- It also makes the system **survive server failures**: if App 2 dies, the LB
  just stops sending traffic there.

---

## 2. L4 vs L7 (two types)

| | **L4 (connection level)** | **L7 (request level)** |
|---|---|---|
| What it sees | Just connections (IP + port) | The actual HTTP request (URL, headers) |
| Speed | Very fast (does little work) | Slower (reads every request) |
| Can route by URL/path? | ❌ No | ✅ Yes (`/api` vs `/ws`) |
| TLS termination | ❌ | ✅ |
| Best for | **Ultra-low-latency** (order entry, FIX) | REST APIs, WebSockets |

**Senior answer to "L4 or L7?":** *"Depends on the traffic. I'd use L4 for the
latency-critical order path, and L7 at the edge for REST + WebSocket."*
Don't pick one religion — split by traffic type.

---

## 3. The #1 rule: the LB must NOT be a single point of failure

The LB sits in front of **every** request. If it dies, the whole system is down.

- ❌ **1 LB** = if it dies, everything is down.
- ✅ **2+ LBs** = if one dies, the other keeps working. This is **redundancy**.

### Active–Active vs Active–Passive
- **Active–Passive**: LB1 works, LB2 waits as backup. (Simple, LB2 sits idle.)
- **Active–Active**: both work at the same time, either can absorb the other's
  load if it dies. ✅ Preferred — you use both machines you paid for.

### Why not 10 LBs?
Because **machines cost money**. You use *"enough to handle the traffic + 1 or 2
spare"* (called **N+1**). The number **follows the traffic** — you don't pick a
random big number.

---

## 4. What if BOTH LBs die? → Failure domains

Two LBs only help if they **don't fail together**. A "failure domain" = the thing
that can take out multiple machines at once.

| Setup | Survives... |
|---|---|
| 1 LB | nothing |
| 2 LBs, same server | just a software crash |
| 2 LBs, different racks | rack/power failure |
| 2 LBs, different data centers | whole data center outage |
| 2 data centers + DNS failover | regional disaster |

**Golden line:** *"Redundancy only helps if the copies don't share a failure
domain."* Two LBs in the same box is NOT real redundancy.

For a whole-data-center failure, **DNS** points users to a second data center.

---

## 5. How does the LB choose a server? (Algorithms)

- **Round Robin** — just take turns: 1, 2, 3, 1, 2, 3...
  - ✅ Good for: short requests that all cost about the same (normal REST API).
  - ❌ Bad for long-lived connections (they drift out of balance over time).

- **Least Connections** — send the new request to the server with the *fewest*
  open connections right now.
  - ✅ Good for: **WebSockets / streaming** that stay open for hours.
  - Why: connections live a long time, so you must account for who's *still*
    connected — Round Robin can't see that.

**Rule of thumb:**
- Short, similar requests → **Round Robin**
- Long-lived / uneven cost → **Least Connections**

(Others exist: weighted, IP-hash, consistent-hashing — learn later.)

---

## 6. Sessions & statelessness (very important idea)

Problem: user logs in, session stored in App 1's memory. Next request goes to
App 3 → App 3 doesn't know them → user looks logged out. 😱

Two fixes:
1. **Sticky sessions** — LB always sends a user to the same server.
   - ❌ Fragile: if that server dies, user loses session; load gets uneven.
2. **Externalize the state** ✅ — store sessions in a **shared store (Redis/DB)**,
   so every server can read them. Now servers are **stateless** and
   **interchangeable** — the LB can send you anywhere.

**Golden principle:** *Keep servers stateless. Push state into a shared store.*
This is what makes scaling and failover easy. Shows up in almost every design.

---

## 7. Retries & idempotency (the trap)

When a backend dies mid-request, the LB may retry on another server. But:
- Retrying a **read** (`GET /balance`) → safe.
- Retrying a **write** (`POST /order`) → could **place the order twice** = real
  money lost on an exchange. 😱

**Fix:** writes need **idempotency keys** (a unique ID so the system recognizes
"I already did this one"). Don't blindly retry writes.

---

## 8. Health checks

The LB constantly checks: "is this server alive?"
- **Active** — LB pings each server (e.g. `GET /health`) every few seconds.
  Detects death even with no traffic.
- **Passive** — LB watches real traffic; if a server keeps erroring/timing out,
  mark it down.
- Real systems use **both**. Tuning tradeoff: eject too fast → flap on a blip;
  too slow → send users to a dead server.

---

## Exchange connection (why this matters for Binance-type systems)

- **Order entry** (FIX/binary, microsecond-sensitive) → **L4** LB.
- **REST + WebSocket market data** → **L7** LB at the edge.
- The real load isn't inbound requests — it's **market-data fan-out**:
  ~1M messages/sec (~1.6 Gbps) pushed *out* to ~100k connected clients.
  That's why WebSocket LBs measure **concurrent connections**, not req/sec.

---

## The 3 sentences to memorize

1. *"A load balancer spreads requests across servers so none gets overwhelmed."*
2. *"It's on the critical path and a single point of failure, so I run 2+ across
   different failure domains — availability is the #1 concern."*
3. *"Keep servers stateless (state in Redis), so the LB can route freely and any
   server can handle any request."*

---

## Interview Q&A (drilled 2026-10-13 — debt from 2026-09-29 session, cleared)

### Q1 — Sticky-session logout debug
> 3 app servers behind an LB with sticky sessions. User clicks Logout, page
> reloads, still logged in; after a few refreshes it *eventually* logs out. Why?

- **Disease:** the session lives in each server's **local memory**, so the same
  identity has independent copies on A, B, and C.
- **Mechanics:** Logout hit **A** and cleared only A's copy. Refreshes bounce
  between servers; land on B/C → still logged in; land on A → logged out.
  **"Eventually"** = you finally hit the cleared server (or B/C time out).
- ⭐ The clue is the word *eventually* — it proves the client is NOT truly pinned;
  perfect stickiness would *hide* this bug (log out immediately & permanently).
- **Fix:** externalize the session to a **shared store** (Redis/DB) → one copy,
  one delete, all servers read the same source of truth → logged out everywhere.
- **Why not stickier sessions:** (1) hard-pinning fights load balancing — can't
  rebalance a hot server; (2) it ties **correctness to routing** — if A dies, the
  session dies; you'd be using the LB's routing table as your session DB (wrong
  tool); (3) it only *hides* the multiple-copies disease, never cures it.
- **One-liner:** *don't make state follow the request — make state shared so the
  request can go anywhere.*

### Q2 — Active vs passive health checks (wedged server)
> Server B accepts TCP connections but every request hangs 30s then errors.

- **Active** = LB *proactively* probes each server on an interval (`GET /health`
  every ~5s). **Passive** = LB *observes real user traffic* and ejects a server
  after N real failures (reactive — users are the detector, so slower to protect).
- ⭐ **The trap:** a shallow **TCP/port** active check reports wedged-B as
  **healthy** — the port is still open, so the ping passes. To catch a wedged
  server the active check must hit the **app path with a short timeout** (<2s).
- ⭐ **Passive is blind without traffic** — the single idea behind both its
  weaknesses: (1) under low traffic it detects failures slowly; (2) an *ejected*
  server gets **zero** traffic, so passive can **never** tell it recovered →
  B stays dead forever. That's why you need active checks: to eject *and* re-admit.

### Q3 — Safe retries on `POST /order`
> Order placed, response lost on the way back, client times out and retries.

- **(a)** Treating the retry as new → trader **buys 2 BTC**, real money lost.
- **(b) Idempotency key:** client generates a unique ID (UUID), sends it as a
  header. Server checks Redis: **new** → process, store the response under the key
  (24h TTL); **exists** → skip execution, **replay the cached response.**
- ⭐ **Concurrency fix:** two fast retries can both see "new" before either stores
  the key (read→decide→write gap). Make the **claim atomic**: Redis `SET key NX`
  (only one caller gets OK) or a SQL `UNIQUE` constraint (second INSERT fails).
  Same reflex as the flash-sale `UPDATE ... WHERE stock > 0` / `DECR` gate.
- **(c) Why not "just don't retry POST"?** (1) the trader is left in an **unknown
  state** — the response was lost, they don't know if it worked, can't safely
  retry by hand; (2) you **don't control the clients** — the mobile app auto-retries
  on a tower handoff, the user double-clicks Buy. **The server must guard its own
  state** — correctness lives at the source of truth, never in a network component
  you don't own.

---

## Still fuzzy — revisit later
- DNS-based failover / Virtual IP (VIP) / Anycast — *how* the browser finds the
  healthy LB. (Core idea is solid; the plumbing is the confusing part.)
- Deriving the NFR numbers (the "nines", latency budgets) from scratch.
- Consistent hashing (used when adding/removing servers without reshuffling everyone).
