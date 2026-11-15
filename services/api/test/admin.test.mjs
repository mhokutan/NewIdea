// Run: node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { admin, secretsMatch } from "../src/admin.js";

class FakeR2 {
  constructor() { this.m = new Map(); }
  async put(k, v, o) { this.m.set(k, { v: new Uint8Array(v), o }); }
  async delete(keys) { for (const k of [].concat(keys)) this.m.delete(k); }
  async get(k, opts) {
    const e = this.m.get(k); if (!e) return null;
    let body = e.v, range;
    if (opts?.range) {
      const r = opts.range;
      const offset = r.suffix != null ? e.v.length - r.suffix : r.offset;
      const length = r.suffix != null ? r.suffix : r.length ?? e.v.length - offset;
      body = e.v.slice(offset, offset + length); range = { offset, length };
    }
    return { body, size: e.v.length, httpMetadata: { contentType: e.o.httpMetadata.contentType }, range };
  }
}
// Tiny D1 stand in: records statements, answers the two lookups the endpoint makes.
function fakeDb({ creator = true, dup = false, failBatch = false } = {}) {
  const log = [];
  const stmt = (sql) => ({ sql, args: [], bind(...a) { this.args = a; return this; },
    async first() { return sql.includes("from profiles") ? (creator ? { id: "prof1" } : null) : sql.includes("from promos") ? (dup ? { id: "x" } : null) : null; },
    async run() { return { meta: { changes: 1 } }; } });
  return { log, prepare: (s) => stmt(s), async batch(s) { if (failBatch) throw new Error("boom"); log.push(...s); } };
}
const mp4 = () => new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0, 1, 2, 3, 4]);
const jpg = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
function req(meta, { token = "secret", video = mp4(), poster = jpg() } = {}) {
  const f = new FormData();
  f.set("meta", JSON.stringify(meta));
  f.set("video", new File([video], "v.mp4", { type: "video/mp4" }));
  f.set("poster", new File([poster], "p.jpg", { type: "image/jpeg" }));
  return new Request("https://api.test/v1/admin/promos", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: f });
}
const good = { handle: "haulingempire", slug: "hauling-sample", title: "Hauling Empire sample", durationMs: 28000, tags: ["#TruckGame", "tycoon"] };
const env = (o = {}) => ({ ADMIN_PASSWORD: "secret", API_URL: "https://api.test", MEDIA: new FakeR2(), DB: fakeDb(), ...o });

test("secretsMatch", async () => {
  assert.equal(await secretsMatch("a", "a"), true);
  assert.equal(await secretsMatch("a", "b"), false);
  assert.equal(await secretsMatch("", "b"), false);
  assert.equal(await secretsMatch("a", undefined), false);
});
test("rejects missing or wrong token, and unset secret", async () => {
  assert.equal((await admin.fetch(req(good, { token: "" }), env())).status, 401);
  assert.equal((await admin.fetch(req(good, { token: "nope" }), env())).status, 401);
  assert.equal((await admin.fetch(req(good), env({ ADMIN_PASSWORD: undefined }))).status, 401);
});
test("503 when the bucket is not bound", async () => {
  assert.equal((await admin.fetch(req(good), env({ MEDIA: undefined }))).status, 503);
});
test("creates a draft by default, stores files, lowercases tags", async () => {
  const e = env();
  const r = await admin.fetch(req(good), e);
  assert.equal(r.status, 201);
  const j = await r.json();
  assert.equal(j.status, "draft");
  assert.equal(e.MEDIA.m.size, 2);
  assert.ok(j.video.startsWith("https://api.test/v1/media/promos/"));
  const promoInsert = e.DB.log[0];
  assert.equal(promoInsert.args[7], "draft");
  assert.deepEqual(e.DB.log.filter((s) => s.sql.includes("promo_hashtags")).map((s) => s.args[1]), ["truckgame", "tycoon"]);
});
test("publish true makes it live", async () => {
  const e = env();
  const r = await admin.fetch(req({ ...good, publish: true }), e);
  assert.equal((await r.json()).status, "live");
  assert.equal(e.DB.log[0].args[7], "live");
});
test("validation errors", async () => {
  for (const [m, code] of [
    [{ ...good, title: "ab" }, "bad_title"], [{ ...good, slug: "Bad Slug" }, "bad_slug"],
    [{ ...good, tags: ["a", "b", "c", "d", "e", "f"] }, "bad_tags"], [{ ...good, tags: ["bad tag"] }, "bad_tags"],
    [{ ...good, durationMs: 1000 }, "bad_duration"], [{ ...good, ctaUrl: "http://x.com" }, "bad_cta"],
  ]) {
    const r = await admin.fetch(req(m), env());
    assert.equal(r.status, 400); assert.equal((await r.json()).error.code, code);
  }
  assert.equal((await (await admin.fetch(req(good, { video: new Uint8Array(30) }), env())).json()).error.code, "bad_video");
  assert.equal((await (await admin.fetch(req(good, { poster: new Uint8Array(30) }), env())).json()).error.code, "bad_poster");
});
test("unknown creator 404, duplicate slug 409, nothing stored", async () => {
  let e = env({ DB: fakeDb({ creator: false }) });
  assert.equal((await admin.fetch(req(good), e)).status, 404); assert.equal(e.MEDIA.m.size, 0);
  e = env({ DB: fakeDb({ dup: true }) });
  assert.equal((await admin.fetch(req(good), e)).status, 409); assert.equal(e.MEDIA.m.size, 0);
});
test("db failure removes uploaded files", async () => {
  const e = env({ DB: fakeDb({ failBatch: true }) });
  assert.equal((await admin.fetch(req(good), e)).status, 500);
  assert.equal(e.MEDIA.m.size, 0);
});
test("media delivery with range, and key whitelist", async () => {
  const e = env();
  const j = await (await admin.fetch(req(good), e)).json();
  const path = new URL(j.video).pathname;
  const full = await admin.fetch(new Request("https://api.test" + path), e);
  assert.equal(full.status, 200); assert.equal(full.headers.get("Accept-Ranges"), "bytes");
  const part = await admin.fetch(new Request("https://api.test" + path, { headers: { Range: "bytes=4-7" } }), e);
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("Content-Range"), "bytes 4-7/20");
  assert.equal((await part.arrayBuffer()).byteLength, 4);
  assert.equal((await admin.fetch(new Request("https://api.test/v1/media/../secret"), e)).status, 404);
  assert.equal((await admin.fetch(new Request("https://api.test/v1/media/promos/x/video.mp4"), e)).status, 404);
});
