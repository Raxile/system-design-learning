# Prerequisite Topics (learn before each project)

What to understand *before* starting each project. You don't need mastery — just
enough to answer the 3 prompts in `notes/fundamentals.md` for each prereq. Links
point to the fundamentals headings; use the quiz prompt in `INDEX.md` to test
yourself. **Core** = you'll be lost without it. **Helpful** = deepens the design.

---

## Always-on basics (before ANY project)
- Scalability
- Latency vs Throughput
- Load Balancers
- Databases: SQL vs NoSQL basics
- Caching Strategies (read-through, write-through, TTL, eviction)

---

## 01 — Rate Limiter
- **Core:** Rate Limiting (token bucket, leaky bucket, fixed/sliding window)
- **Core:** Caching Strategies (Redis counters, TTL, atomic increments)
- **Core:** Consistency Patterns (why distributed counting is hard)
- **Helpful:** Load Balancers (where the limiter sits in the request path)
- **Helpful:** Idempotency (retries after a 429)

## 02 — URL Shortener
- **Core:** Databases — Indexing, SQL vs NoSQL, key-value stores
- **Core:** Caching Strategies (read-heavy, cache the hot short-codes)
- **Core:** Hashing & unique ID generation (base62, counters, collisions)
- **Helpful:** Databases — Sharding & Replication (scaling reads/writes)
- **Helpful:** CDN (serving redirects close to users)

## 03 — Notification System
- **Core:** Message Queues (decoupling, retries, dead-letter queues)
- **Core:** Idempotency (don't send the same alert twice)
- **Core:** Consistency Patterns (at-least-once vs exactly-once delivery)
- **Helpful:** Databases — Sharding (per-user notification storage)
- **Helpful:** Rate Limiting (throttling per user/channel)

## 04 — Chat System (WebSockets)
- **Core:** WebSockets & Real-time (connections, heartbeats, reconnection)
- **Core:** Load Balancers (sticky sessions, connection fan-out)
- **Core:** Message Queues (delivering messages between servers)
- **Helpful:** Databases — Sharding (message history at scale)
- **Helpful:** Caching Strategies (presence / online status)

## 05 — News Feed
- **Core:** Caching Strategies (precomputed feeds)
- **Core:** Databases — SQL vs NoSQL, Sharding, Replication
- **Core:** Fan-out on write vs fan-out on read (the central trade-off)
- **Helpful:** Message Queues (async feed generation)
- **Helpful:** CDN (media in the feed)

## 06 — Search Autocomplete
- **Core:** Tries / prefix trees + Caching Strategies (hot prefixes)
- **Core:** Latency vs Throughput (this must feel instant)
- **Helpful:** Databases — Indexing
- **Helpful:** CDN / edge caching (serve suggestions close to users)

## 07 — Live Price Feed / Order Book UI
- **Core:** WebSockets & Real-time (streaming, snapshots + deltas)
- **Core:** Latency vs Throughput (market data is latency-critical)
- **Core:** Message Queues / pub-sub (fan-out to many subscribers)
- **Core:** Consistency Patterns (ordering, sequence numbers, gap recovery)
- **Helpful:** Caching Strategies (order-book snapshots)
- **Helpful:** Load Balancers (scaling WebSocket connections)

---

**Rule of thumb:** if you can't answer *"what problem does it solve?"* and
*"what does it cost?"* for every **Core** item, learn it first — do the design second.
