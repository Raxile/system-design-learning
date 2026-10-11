"I chose SQL because it has ACID."

I used to say this in system design discussions. It sounds right, but it's circular, like saying you bought a waterproof jacket because it's waterproof.

Here's the reframe that finally made SQL vs NoSQL click for me:

Reason from the DATA to the database. Never from a database feature to the data.

SQL vs NoSQL isn't old vs new, or slow vs fast. It's a trade:
→ SQL: "Ask me anything." Joins, ad-hoc filters, multi-row transactions. But it wants to live on one big machine.
→ NoSQL: "Tell me the ONE way you'll read this, and I'll scale it across many machines." That's all you get.

So before picking, I ask three questions about the data:

1. Is it money, or does it have rules that can never break (balance ≥ 0, no double-spend)? If yes, you need ACID, so SQL.
2. Is it connected or standalone? A trade points to a buyer, seller, order, account and fee schedule. A price tick points to nothing.
3. Do I know the single access pattern up front, or will people run ad-hoc queries?

Running these on a crypto exchange:

💰 Wallets & trade ledger → SQL
Moving money means debit AND credit, or neither, under concurrency. And everything joins to everything.

📈 Market data ticks → NoSQL / time-series
Not because of 50k writes/sec. A sharded Postgres can handle that. It's because ticks are append-only, self-contained, and always read one way: symbol + time range. Make symbol the partition key and spread it across 100 machines.

👤 User profiles (10M users) → the tricky one
99% of reads are by userId, which looks like a key-value store. But compliance runs "all users in country X with pending KYC", an ad-hoc query on non-key fields.
Verdict: SQL. 10M rows is small, so NoSQL's one advantage (scale) doesn't apply. And a primary key handles userId lookups just as well.

That last one taught me the biggest lesson: NoSQL's scale is only worth its cost when you actually have a scale problem. If one SQL box fits your data, joins and ACID come for free.

The same logic applies to consistency (ACID vs BASE). Choose by the consequence of being wrong:
• A stale wallet balance means financial loss, so ACID.
• A like count that's off by one doesn't matter to anyone, so BASE.

Don't buy consistency you don't need. Don't skip it where you do.

How do you decide between SQL and NoSQL? Ever gone NoSQL and regretted it?

#SystemDesign #Databases #SQL #NoSQL #SoftwareEngineering #BackendDevelopment