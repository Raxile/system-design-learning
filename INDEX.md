# Learning Index

Everything to work through, with a ready-to-paste **AI prompt** for each.
Copy the prompt into a session to have Claude act as mentor/interviewer per the
rules in `CLAUDE.md`. Do the topics roughly top to bottom — fundamentals give you
the vocabulary the design topics assume.

**How to use:** pick a topic → paste its prompt → go through the 4-step framework
one step at a time → build the small version in `projects/` → update `PROGRESS.md`.

---

## Part A — System Design Topics (build these)

Each gets a design doc in `docs/` and a small Node.js/TypeScript build in `projects/`.

| #  | Topic                            | Status      | Crypto-exchange angle to keep in mind        |
|----|----------------------------------|-------------|----------------------------------------------|
| 01 | Rate Limiter                     | Not started | Protecting the order-placement & market-data APIs |
| 02 | URL Shortener                    | Not started | ID generation, hashing, read-heavy scaling   |
| 03 | Notification System              | Not started | Price alerts, trade fills, liquidation warnings |
| 04 | Chat System (WebSockets)         | Not started | Real-time connection fan-out, presence        |
| 05 | News Feed                        | Not started | Activity/trade feeds, fan-out on write vs read |
| 06 | Search Autocomplete              | Not started | Symbol/coin search, tries, ranking            |
| 07 | Live Price Feed / Order Book UI  | Not started | The core exchange problem: real-time market data |

### Prompts

**01 — Rate Limiter**
> Be my mentor/interviewer for Topic 01, Rate Limiter (rules in CLAUDE.md). Start me at Step 1 (requirements) and go one step at a time. Frame it for a crypto exchange.

**02 — URL Shortener**
> Be my mentor/interviewer for Topic 02, URL Shortener (rules in CLAUDE.md). Start me at Step 1 (requirements) and go one step at a time.

**03 — Notification System**
> Be my mentor/interviewer for Topic 03, Notification System (rules in CLAUDE.md). Start me at Step 1 (requirements) and go one step at a time. Frame it around exchange alerts (price alerts, fills, liquidations).

**04 — Chat System (WebSockets)**
> Be my mentor/interviewer for Topic 04, Chat System over WebSockets (rules in CLAUDE.md). Start me at Step 1 (requirements) and go one step at a time.

**05 — News Feed**
> Be my mentor/interviewer for Topic 05, News Feed (rules in CLAUDE.md). Start me at Step 1 (requirements) and go one step at a time. Contrast fan-out on write vs read.

**06 — Search Autocomplete**
> Be my mentor/interviewer for Topic 06, Search Autocomplete (rules in CLAUDE.md). Start me at Step 1 (requirements) and go one step at a time. Frame it as coin/symbol search.

**07 — Live Price Feed / Order Book UI**
> Be my mentor/interviewer for Topic 07, Live Price Feed / Order Book UI (rules in CLAUDE.md). Start me at Step 1 (requirements) and go one step at a time. This is the core exchange system — push me hard.

---

## Part B — Fundamentals (understand these)

Answer the 3 prompts in `notes/fundamentals.md` for each, then use the prompt below
to have Claude quiz you and fill gaps. Mark `[x]` when you can explain it out loud.

- [ ] Scalability
- [ ] Latency vs Throughput
- [ ] CAP Theorem
- [ ] Consistency Patterns
- [ ] DNS
- [ ] CDN
- [ ] Load Balancers
- [ ] Databases (SQL vs NoSQL, Indexing, Replication, Sharding)
- [ ] Caching Strategies
- [ ] Message Queues
- [ ] Rate Limiting
- [ ] WebSockets & Real-time
- [ ] Idempotency
- [ ] Security Basics

### Prompt (reuse for any fundamental)

> Quiz me on <FUNDAMENTAL> (mentor rules in CLAUDE.md). First ask me the 3 prompts
> from notes/fundamentals.md, critique my answers honestly, then ask 2 "what if?"
> follow-ups and connect it to crypto-exchange systems. Don't give me the answers
> unless I say "SHOW ME".
