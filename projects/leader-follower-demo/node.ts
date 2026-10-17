// node.ts — the replication logic. Bodies written by you; interface matches demo.ts.

export const LAG_MS = 100; // fake network travel time to a follower. THIS is the replication lag.

export class Follower {
  // each follower holds its OWN copy of the data
  store = new Map<string, number>();

  // return this follower's (possibly stale) copy for `key`
  read(key: string): number | undefined {
    return this.store.get(key);
  }

  // called by the leader AFTER the fake network delay
  apply(key: string, value: number): void {
    this.store.set(key, value);
  }
}

export class Leader {
  store = new Map<string, number>();

  constructor(public followers: Follower[]) {}

  // leader is the source of truth: its own copy must be correct INSTANTLY,
  // then replication to followers happens LAG_MS later.
  write(key: string, value: number): void {
    this.store.set(key, value); // instant truth on the leader
    for (const f of this.followers) {
      setTimeout(() => {
        f.apply(key, value); // follower updated LAG_MS later
      }, LAG_MS);
    }
  }

  readFromLeader(key: string): number | undefined {
    return this.store.get(key);
  }
}
