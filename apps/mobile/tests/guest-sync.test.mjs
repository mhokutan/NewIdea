// Run: node --test apps/mobile/tests/guest-sync.test.mjs (Node 22.18+ strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import { retryLater, sendAll, singleFlight } from "../src/lib/guest-sync.ts";

test("final server answers are not retried, missing answers are", () => {
  for (const s of [400, 404, 409]) assert.equal(retryLater(s), false, String(s));
  for (const s of [null, 401, 403, 408, 429, 500, 503]) assert.equal(retryLater(s), true, String(s));
});

test("a failed network send keeps the call, saved and settled calls are dropped", async () => {
  const out = { a: "saved", b: "settled", c: "retry" };
  const r = await sendAll(["a", "b", "c", "d"], async (g) => { if (g === "d") throw new TypeError("Network request failed"); return out[g]; });
  assert.equal(r.saved, 1);
  assert.deepEqual(r.kept, ["c", "d"]);
});

test("overlapping syncs share one run, so no call is sent twice", async () => {
  let runs = 0, release;
  const sync = singleFlight(() => { runs++; return new Promise((res) => { release = res; }); });
  const p1 = sync(), p2 = sync();
  assert.equal(p1, p2);
  release(3);
  assert.equal(await p2, 3);
  assert.equal(runs, 1);
  sync(); release(0);
  assert.equal(runs, 2); // a later sync (next sign in check) runs again
});
