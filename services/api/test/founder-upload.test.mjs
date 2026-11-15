// Run: node --test test/founder-upload.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";

const r2 = () => ({ m: new Map(), async put(k, v) { this.m.set(k, v); }, async delete(k) { for (const x of [].concat(k)) this.m.delete(x); } });
function db({ creator = true, fail = false } = {}) {
  const log = [];
  const st = (sql) => ({ sql, args: [], bind(...a) { this.args = a; return this; },
    async first() { return sql.includes("founder_owned") && creator ? { id: "11111111-1111-1111-1111-111111111111" } : null; },
    async run() { return { meta: { changes: 1 } }; } });
  return { log, prepare: st, async batch(s) { if (fail) throw new Error("boom"); log.push(...s); } };
}
const env = (o = {}) => ({ ADMIN_API_TOKEN: "tok", API_URL: "https://api.test", MEDIA: r2(), DB: db(), ...o });
const mp4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 1, 2, 3, 4, 5, 6, 7, 8]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const good = { handle: "haulingempire", title: "Hauling Empire sample", durationMs: 24000, tags: ["#TruckGame", "tycoon"] };
function post(meta, { token = "tok", video = mp4, poster = jpg } = {}) {
  const f = new FormData();
  f.set("meta", JSON.stringify(meta));
  f.set("video", new File([video], "v.mp4")); f.set("poster", new File([poster], "p.jpg"));
  return new Request("https://api.test/v1/admin/promos", { method: "POST", headers: token ? { "X-Admin-Token": token } : {}, body: f });
}
const call = (req, e) => app.fetch(req, e, { waitUntil() {}, passThroughOnException() {} });

test("needs the admin token", async () => {
  assert.equal((await call(post(good, { token: "" }), env())).status, 401);
  assert.equal((await call(post(good, { token: "bad" }), env())).status, 401);
  assert.equal((await call(post(good), env({ ADMIN_API_TOKEN: undefined }))).status, 401);
});
test("creates a draft, stores both files, cleans tags", async () => {
  const e = env();
  const res = await call(post(good), e);
  assert.equal(res.status, 201);
  const j = await res.json();
  assert.equal(j.status, "draft");
  assert.equal(e.MEDIA.m.size, 2);
  assert.ok(j.video.startsWith("https://api.test/media/promos/"));
  assert.deepEqual(e.DB.log.filter((s) => s.sql.includes("promo_hashtags")).map((s) => s.args[1]), ["truckgame", "tycoon"]);
});
test("publish true makes it live", async () => {
  const e = env();
  assert.equal((await (await call(post({ ...good, publish: true }), e)).json()).status, "live");
});
test("rejects bad input", async () => {
  for (const [m, o] of [[{ ...good, title: "ab" }, {}], [{ ...good, durationMs: 1000 }, {}], [{ ...good, tags: ["a b"] }, {}],
    [good, { video: new Uint8Array(30) }], [good, { poster: new Uint8Array(30) }]]) {
    assert.equal((await call(post(m, o), env())).status, 400);
  }
});
test("only founder creators, nothing stored on failure", async () => {
  let e = env({ DB: db({ creator: false }) });
  assert.equal((await call(post(good), e)).status, 404); assert.equal(e.MEDIA.m.size, 0);
  e = env({ DB: db({ fail: true }) });
  assert.equal((await call(post(good), e)).status, 500); assert.equal(e.MEDIA.m.size, 0);
});
test("publish endpoint", async () => {
  const req = (token) => new Request("https://api.test/v1/admin/promos/abc/publish", { method: "POST", headers: { "X-Admin-Token": token, "Content-Type": "application/json" }, body: '{"live":true}' });
  assert.equal((await call(req("bad"), env())).status, 401);
  assert.equal((await call(req("tok"), env())).status, 200);
});
