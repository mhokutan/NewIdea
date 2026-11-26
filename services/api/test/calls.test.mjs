// Run: node --test test/calls.test.mjs
// POST /v1/calls against an in-memory SQLite copy of the real schema (migrations 0001 and 0002), signed in through
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
  const DB = d1(["0001_auth.sql", "0002_core.sql"].map((f) => M + f));
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
