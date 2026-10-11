# SQL vs NoSQL — Notes (simple version)

> One-line definition: **SQL vs NoSQL is NOT "old vs new" or "slow vs fast." It's
> a trade: SQL answers *any* question but lives on one machine; NoSQL answers *one
> known question* but scales across many machines.**

```
SQL:   "Ask me anything."  (joins, ad-hoc filters, transactions) — but one big box.
NoSQL: "Tell me the ONE way you'll read this, and I'll scale it forever." — but that's all you get.
```

---

## 0. The #1 rule (the whole topic in one line)

> **Reason DATA PROPERTY → database. NEVER database feature → data.**

State a fact about the **data** first (Is it money? Is it connected to other data?
Do I know the access pattern up front?). *Then* the database choice falls out.

- ❌ "I chose SQL **because it has ACID**." ← circular. That's a feature of the DB,
  not a reason. (Like "I bought the waterproof jacket because it's waterproof.")
- ✅ "This is **money** — multi-row, all-or-nothing, under concurrency, with
  invariants that can never break — **so** I need ACID, **so** SQL."

The feature-list answer ("SQL has tables/joins/ACID, NoSQL is schemaless/fast")
gets you dinged at SDE2. It's memorized, not reasoned.

---

## 1. What each one actually is

| | **SQL (relational)** | **NoSQL** |
|---|---|---|
| Examples | Postgres, MySQL | Mongo, Cassandra, DynamoDB, Redis |
| Data shape | Rows in tables, fixed schema | Documents / key-value / wide-column |
| Relationships | **Joins, foreign keys** (connected) | Standalone records (you denormalize) |
| Queries | **Any** ad-hoc query, any WHERE | Mostly by the **key/partition** you chose |
| Transactions | **ACID** across many rows | Usually per-record; weak cross-record |
| Scaling | Vertical first (one big box); sharding is painful | **Horizontal** — sharding is built in |
| Consistency | Strong (ACID) | Often eventual (BASE) |

NoSQL isn't one thing — it's a family (document, key-value, wide-column,
time-series). They share one idea: **drop relational power to gain scale.**

---

## 2. The real question: 3 properties of the data

Ask these three about the data, in order:

1. **Is it money / does it have invariants that can never break?**
   → Yes → you need ACID → **SQL**. (Balance ≥ 0, total conserved, no double-spend.)

2. **Is the data connected (joins) or standalone?**
   → Connected (a trade points to buyer, seller, order, account, fee) → **SQL**.
   → Standalone (a price tick is just `{symbol, price, ts}`, points to nothing) → NoSQL is fine.

3. **Do I know the ONE access pattern up front, or do I need ad-hoc queries?**
   → Known single shape ("by symbol + time range") → NoSQL can make that key the
     partition key and scale it horizontally.
   → Unpredictable / ad-hoc filters on many fields → **SQL** (secondary indexes).

---

## 3. The trade, stated plainly

> **NoSQL = give up flexibility to buy scale.**
> SQL lets you ask *any* question (joins, ad-hoc WHERE, cross-row transactions).
> NoSQL says: *"Tell me the ONE way you'll read this data, and I'll make that one
> way infinitely scalable — but you lose everything else."*

⭐ **NoSQL's scaling is only worth its cost when you ACTUALLY have a scale problem.**
If one SQL box fits your data + QPS, use SQL — joins, ad-hoc queries, and ACID come
**free** with zero downside. Kills the junior mistake *"it's big-tech, so NoSQL."*
**Prove the scale problem first, then give up SQL reluctantly.**

---

## 4. Worked examples (the exchange)

### (A) Wallet balance / trades ledger → **SQL**
- **Why:** it's money. Moving money is multi-row + all-or-nothing (debit X *and*
  credit Y, or neither), under concurrency, with invariants. That *forces* ACID.
- Highly **connected**: a trade joins buyer, seller, order, account, fee schedule.
  That web is exactly what joins/foreign keys exist for.

### (B) Market data (price ticks) → **NoSQL**
- **NOT because "50k writes/sec"** — a sharded Postgres does 50k WPS too. If write
  volume were the only reason, you'd lose the argument.
- Real reasons: (1) **append-only** (ticks keep coming, never updated);
  (2) **self-contained** — a tick points to nothing, no joins;
  (3) **one predictable query shape** — always `WHERE symbol=BTC AND ts BETWEEN a AND b`.
- That known pattern → make `symbol` the **partition key** → scatter across 100
  machines → cheap horizontal write-scaling. You trade joins you don't use for scale.

### (C) User profiles (10M users) → **SQL** — the tricky one (there's a tension)
- 99% of reads are **by `userId`** = a pure key lookup → *screams NoSQL / key-value.*
- But compliance runs **"all users WHERE country=X AND kyc_status=pending"** = an
  ad-hoc query on **non-key** fields → NoSQL would have to scan every machine →
  *screams SQL.*
- **The tension IS the question** — not "which DB" but "which access pattern do I
  optimize, and what do I give up?"
- **Verdict: SQL**, because (1) 10M profiles is *tiny* → no scale pressure → NoSQL's
  only advantage doesn't apply; (2) the compliance query needs SQL's secondary
  indexes. The by-`userId` lookup that tempted you is handled equally well by a
  SQL primary key.

---

## 5. ACID vs BASE (the consistency half)

Two acronyms, but strip them to **ONE question:**

> When a write happens, does **every** reader see it **immediately** (ACID / strong),
> or do copies **disagree for a few ms** until it propagates (BASE / eventual)?

| | **ACID** | **BASE** |
|---|---|---|
| Stands for | Atomicity, Consistency, Isolation, Durability | Basically Available, Soft state, Eventual consistency |
| Promise | Correct now, every reader agrees | Available now, agree *eventually* |
| Under a network partition | **Rejects** the write (can't confirm agreement) | **Accepts** it, reconciles later |
| Picks | "Be correct or be down" | "Stay up, fix it later" |

- This is the **same disease as caching**: a second copy can disagree. Replication
  is that disease again — you choose whether to *wait* for all copies to agree.
- **Why BASE exists (not laziness):** if data spans 3 data centers and one hiccups,
  ACID must reject the write; BASE accepts it and stays **available**. That trade —
  **consistency vs availability under failure** — is literally half of CAP.

### How to choose: match the **consequence of being wrong**
| Data | Consequence if stale/wrong | Choice |
|---|---|---|
| Wallet balance / settlement | Financial loss, double-spend | **ACID** |
| Likes / view-count on a coin page | Nothing (100 vs 101, who cares) | **BASE** |
| Profile display name (friend sees old name 2s) | Cosmetic, self-corrects | **BASE** |

> **Don't buy consistency you don't need.** Paying ACID's cost for a like-counter
> is as silly as skipping it for money.

---

## 6. Exchange connection (Binance-type systems)

- **Orders / ledger / wallets** → SQL (Postgres), ACID — money, connected, invariants.
- **Market data / ticks / candles** → NoSQL time-series (Cassandra / a TSDB) — append-only,
  standalone, one query shape (symbol+time), huge volume.
- **Sessions / rate-limit counters / hot prices** → Redis (key-value, fast, often BASE-ish).
- Same wallet balance, two paths: **display** path can be cached / BASE-tolerant;
  **trading / matching-engine** path must be ACID, read-the-truth under a lock. Never
  one API for both. (Ties to the caching-session lesson.)

---

## The 3 sentences to memorize

1. *"State a property of the **data** first — is it money, is it connected, do I know
   the access pattern — then the database falls out. Never lead with 'it has ACID.'"*
2. *"NoSQL trades flexibility (joins, ad-hoc queries) for horizontal scale, and it's
   only worth it when I actually have a scale problem. If one SQL box fits, use SQL —
   the relational power is free."*
3. *"ACID vs BASE is consistency vs availability under failure; I choose by the
   consequence of being wrong — money is ACID, likes/display are BASE."*

---

## Still fuzzy / drill before next time
- **Feature-list reflex** — I reached for "ACID" / "BSON" before stating a data
  property. Drill: data property FIRST, always.
- **Vertical vs horizontal flip (AGAIN)** — said NoSQL "scales in one machine."
  Horizontal = across MANY machines. This has cost me 3 sessions; make it reflex.
- Couldn't produce the **no-joins / known-access-pattern** reasons for market data
  unprompted — only write volume came out. Practice naming all three properties.

## Next topic
- **CAP theorem** — I half-derived it here (consistency vs availability under a
  partition). Formalize C/A/P, "you only choose during a partition," CP vs AP, with
  crypto tie-in: matching engine/ledger = CP, market-data feed = AP. Then Replication
  & Sharding.
