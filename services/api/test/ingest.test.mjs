// Run: node --test test/ingest.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";

const TOK = "x".repeat(40);
const r2 = () => ({ m: new Map(), async put(k, v, o) { this.m.set(k, { body: await new Response(v).arrayBuffer(), o }); },
  async get(k) { const x = this.m.get(k); return x ? { body: x.body, httpMetadata: x.o.httpMetadata, size: x.body.byteLength } : null; } });
const env = (o = {}) => ({ INGEST_TOKEN: TOK, MEDIA: r2(), DB: { prepare: () => ({ bind() { return this; }, async first() { return null; } }) }, ...o });
const call = (req, e) => app.fetch(req, e, { waitUntil() {}, passThroughOnException() {} });
const put = (key, { token = TOK, body = new Uint8Array([1, 2, 3, 4]) } = {}) =>
  new Request(`https://api.promovote.com/v1/admin/ingest?key=${encodeURIComponent(key)}`, { method: "PUT", headers: { "X-Ingest-Token": token, "Content-Length": String(body.length) }, body });

test("ingest needs the right token and a long secret", async () => {
  assert.equal((await call(put("daily/2026-11-17/dropolis.mp4", { token: "bad" }), env())).status, 401);
  assert.equal((await call(put("daily/2026-11-17/dropolis.mp4", { token: "short" }), env({ INGEST_TOKEN: "short" }))).status, 401);
  assert.equal((await call(put("daily/2026-11-17/dropolis.mp4"), env({ INGEST_TOKEN: undefined }))).status, 401);
});

test("ingest only writes daily keys", async () => {
  for (const k of ["promos/a/b/c.mp4", "daily/2026-11-17/../x.mp4", "daily/2026-11-17/x.exe", "profiles/x/avatar-y.jpg"]) {
    assert.equal((await call(put(k), env())).status, 400, k);
  }
});

test("ingest stores a video larger than the normal body limit and it is served publicly", async () => {
  const e = env();
  const big = new Uint8Array(200000);
  const r = await call(put("daily/2026-11-17/dropolis-720.mp4", { body: big }), e);
  assert.equal(r.status, 201);
  assert.equal(e.MEDIA.m.get("daily/2026-11-17/dropolis-720.mp4").o.httpMetadata.contentType, "video/mp4");
  const g = await call(new Request("https://api.promovote.com/media/daily/2026-11-17/dropolis-720.mp4"), e);
  assert.equal(g.status, 200);
  assert.equal((await g.arrayBuffer()).byteLength, 200000);
});
