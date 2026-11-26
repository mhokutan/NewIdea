// Run: node --test test/calls.test.mjs
// POST /v1/calls against an in-memory SQLite copy of the real schema (migrations 0001, 0002 and 0007), signed in through
// a real Better Auth session cookie. No wrangler, no network, no live data.
import { test } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";
import { d1 } from "./d1-shim.mjs";

const M = new URL("../migrations/", import.meta.url).pathname;
const SECRET = "k9Q2x7Lp4Zr8Vw1Nc6Ty3Hb5Mj0Gd2Fs";
const later = new Date(Date.now() + 864e5).toISOString();

async function cookieFor(token) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(token));
  return `__Secure-better-auth.session_token=${encodeURIComponent(token + "." + btoa(String.fromCharCode(...new Uint8Array(s))))}`;
}

function world() {
  const DB = d1(["0001_auth.sql", "0002_core.sql", "0007_jobs_and_logs.sql"].map((f) => M + f));
  const q = (sql) => DB.sqlite.exec(sql);
  const person = (id, type, handle, status = "active") => {
    q(`insert into user (id, name, email, emailVerified, createdAt, updatedAt) values ('${id}', '${id}', '${id}@x.test', 1, '${later}', '${later}')`);
    q(`insert into session (id, expiresAt, token, createdAt, updatedAt, userId) values ('s-${id}', '${later}', 'tok-${id}', '${later}', '${later}', '${id}')`);
    q(`insert into profiles (id, owner_user_id, type, handle, display_name, status) values ('p-${id}', '${id}', '${type}', '${handle}', '${handle}', '${status}')`);
  };
  person("maker", "creator", "maker");
  person("scout", "scout", "scout");
  const promo = (id, status = "live", creator = "p-maker") =>
    q(`insert into promos (id, creator_profile_id, slug, title, status) values ('${id}', '${creator}', '${id}', 'Promo ${id}', '${status}')`);
  promo("live1");
  promo("draft1", "draft");
  for (let i = 0; i < 9; i++) promo("bulk" + i);
  const env = { DB, BETTER_AUTH_SECRET: SECRET, API_URL: "https://api.test" };
  const vote = async (who, body) => {
    const r = await app.fetch(new Request("https://api.test/v1/calls", {
      method: "POST", headers: { cookie: await cookieFor("tok-" + who), "content-type": "application/json" }, body: JSON.stringify(body),
    }), env, { waitUntil() {}, passThroughOnException() {} });
    return { status: r.status, body: await r.json() };
  };
  return { DB, q, person, promo, vote, rows: (sql) => DB.sqlite.prepare(sql).all() };
}

test("guests and creators cannot call", async () => {
  const w = world();
  const r = await app.fetch(new Request("https://api.test/v1/calls", { method: "POST", body: JSON.stringify({ promoId: "live1", choice: "not_for_me" }) }),
    { DB: w.DB, BETTER_AUTH_SECRET: SECRET, API_URL: "https://api.test" }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(r.status, 401);
  assert.equal((await w.vote("maker", { promoId: "live1", choice: "will_blow_up" })).status, 403);
  assert.equal(w.rows("select * from calls").length, 0);
});

test("inactive scouts cannot call", async () => {
  const w = world();
  for (const s of ["suspended", "pending_deletion", "deleted"]) {
    w.person("x" + s.slice(0, 6), "scout", "x" + s.slice(0, 6), s);
    assert.equal((await w.vote("x" + s.slice(0, 6), { promoId: "live1", choice: "will_blow_up" })).status, 403, s);
  }
  assert.equal(w.rows("select * from calls").length, 0);
});

test("one call per promo, a second call never changes the first", async () => {
  const w = world();
  const a = await w.vote("scout", { promoId: "live1", choice: "will_blow_up" });
  assert.equal(a.status, 201);
  assert.equal(a.body.call.choice, "will_blow_up");
  const b = await w.vote("scout", { promoId: "live1", choice: "not_for_me" });
  assert.equal(b.status, 409);
  assert.equal(b.body.error.code, "already_voted");
  assert.equal(b.body.call.choice, "will_blow_up");
  assert.deepEqual(w.rows("select choice, voter_ordinal from calls").map((r) => ({ ...r })), [{ choice: "will_blow_up", voter_ordinal: 1 }]);
});

test("only live promos of active creators can be called", async () => {
  const w = world();
  assert.equal((await w.vote("scout", { promoId: "draft1", choice: "will_blow_up" })).status, 404);
  assert.equal((await w.vote("scout", { promoId: "nope", choice: "will_blow_up" })).status, 404);
  w.person("gone", "creator", "gone", "suspended");
  w.promo("orphan", "live", "p-gone");
  assert.equal((await w.vote("scout", { promoId: "orphan", choice: "will_blow_up" })).status, 404);
  assert.equal(w.rows("select * from calls").length, 0);
});

test("bad input is a 4xx, never a server error", async () => {
  const w = world();
  for (const body of [{ choice: "will_blow_up" }, { promoId: { x: 1 }, choice: "will_blow_up" }, { promoId: ["live1"], choice: "will_blow_up" }, { promoId: "live1", choice: "yes" }, {}]) {
    const r = await w.vote("scout", body);
    assert.ok(r.status >= 400 && r.status < 500, JSON.stringify(body) + " -> " + r.status);
  }
  assert.equal(w.rows("select * from calls").length, 0);
});

test("only the first 7 calls of a UTC day are score eligible; yesterday's calls do not count", async () => {
  const w = world();
  // Two eligible calls from yesterday (UTC) must not use up today's 7.
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10) + "T23:59:59.000Z";
  w.promo("old1"); w.promo("old2");
  w.q(`insert into calls (id, scout_profile_id, promo_id, choice, voter_ordinal, score_eligible, created_at) values
    ('c-old1', 'p-scout', 'old1', 'not_for_me', 1, 1, '${y}'), ('c-old2', 'p-scout', 'old2', 'not_for_me', 1, 1, '${y}')`);
  for (let i = 0; i < 9; i++) assert.equal((await w.vote("scout", { promoId: "bulk" + i, choice: "not_for_me" })).status, 201);
  const today = w.rows("select promo_id, score_eligible from calls where promo_id like 'bulk%' order by created_at, promo_id");
  assert.equal(today.filter((r) => r.score_eligible === 1).length, 7);
  assert.deepEqual(today.slice(7).map((r) => r.score_eligible), [0, 0]);
});

// The hourly resolver must be idempotent (2026-11-26): two overlapping runs over the same due calls add the points,
// the counters and the score event once, never twice.
test("two overlapping resolver runs never add the same points twice", async () => {
  const w = world();
  const old = new Date(Date.now() - 30 * 864e5).toISOString();
  const at = (days) => new Date(Date.now() - days * 864e5).toISOString();
  w.q(`update profiles set created_at = '${old}'`);
  // The scout called first, 9 days ago; 6 other scouts called later and mostly agreed.
  w.q(`insert into calls (id, scout_profile_id, promo_id, choice, voter_ordinal, score_eligible, created_at) values ('c-first', 'p-scout', 'live1', 'will_blow_up', 1, 1, '${at(9)}')`);
  for (let i = 0; i < 6; i++) {
    w.person("late" + i, "scout", "late" + i);
    w.q(`update profiles set created_at = '${old}' where id = 'p-late${i}'`);
    w.q(`insert into calls (id, scout_profile_id, promo_id, choice, voter_ordinal, score_eligible, created_at) values ('c-late${i}', 'p-late${i}', 'live1', '${i < 5 ? "will_blow_up" : "not_for_me"}', ${i + 2}, 1, '${at(8 - i * 0.1)}')`);
  }
  const worker = (await import("../src/index.js")).default;
  const run = () => new Promise((done) => worker.scheduled({ cron: "7 * * * *" }, { DB: w.DB }, { waitUntil: (p) => p.then(done, done) }));
  await Promise.all([run(), run()]);
  const [first] = w.rows("select outcome, score_delta from calls where id = 'c-first'");
  assert.equal(first.outcome, "correct");
  assert.ok(first.score_delta > 0);
  const [stats] = w.rows("select scout_score, calls_resolved_wbu, calls_correct_wbu from scout_stats where profile_id = 'p-scout'");
  assert.equal(stats.scout_score, first.score_delta, "points added once");
  assert.equal(stats.calls_resolved_wbu, 1);
  assert.equal(stats.calls_correct_wbu, 1);
  assert.equal(w.rows("select * from score_events where call_id = 'c-first'").length, 1, "one score event");
  // A third run later finds nothing new.
  await run();
  assert.equal(w.rows("select scout_score from scout_stats where profile_id = 'p-scout'")[0].scout_score, first.score_delta);
});
