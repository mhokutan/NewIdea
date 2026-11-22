// Unit tests for the Dropolis in-app purchase module (src/purchases.js). Run from the repo root:
//   node --test services/dropolis/test/purchases.test.mjs
// Covers: Google Play receipt check (valid, test purchase, sandbox policy, store down, invalid answers), the ledger
// (one grant per transaction, owned by one player, one time items, concurrent calls), request validation, the purchase
// list, account deletion (anonymous totals and tombstones), and the Apple StoreKit 2 JWS chain check with a fake
// Apple like certificate chain made with openssl at runtime. Everything runs in memory: a small fake D1 over
// node:sqlite, a stubbed fetch (no real Apple or Google server is ever called), and keys generated at test time.
import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  verifyPurchase, listPurchases, purchaseDeleteStatements, resetGoogleTokenCache, verifyAppleJWS,
  BUNDLE_ID, PRODUCTS,
} from "../src/purchases.js";

const SERVICE = resolve(import.meta.dirname, "..");

// ---------- fake D1 over node:sqlite ----------
const norm = (args) => args.map((a) => (a === undefined ? null : a));

class Stmt {
  constructor(raw, sql, args = []) { this.raw = raw; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.raw, this.sql, norm(args)); }
  _exec() {
    const st = this.raw.prepare(this.sql);
    if (/^\s*select/i.test(this.sql)) {
      return { results: st.all(...this.args), meta: { changes: 0 } };
    }
    const r = st.run(...this.args);
    return { results: [], meta: { changes: Number(r.changes) } };
  }
  async first() { return this.raw.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.raw.prepare(this.sql).all(...this.args) }; }
  async run() { return this._exec(); }
}

class FakeD1 {
  constructor() {
    this.raw = new DatabaseSync(":memory:");
    this.raw.exec("PRAGMA foreign_keys = ON");
    const dir = join(SERVICE, "migrations");
    for (const f of readdirSync(dir).filter((n) => /^000[1-4].*\.sql$/.test(n)).sort()) {
      this.raw.exec(readFileSync(join(dir, f), "utf8"));
    }
  }
  prepare(sql) { return new Stmt(this.raw, sql); }
  async batch(stmts) {
    this.raw.exec("BEGIN");
    try {
      const out = stmts.map((s) => s._exec());
      this.raw.exec("COMMIT");
      return out;
    } catch (e) {
      this.raw.exec("ROLLBACK");
      throw e;
    }
  }
}

// ---------- helpers ----------
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const readBody = async (req) => {
  const text = await req.text();
  return text ? JSON.parse(text) : {}; // throws on bad JSON, like index.js
};
const post = (body) => new Request("https://api.test/v1/purchases/verify", {
  method: "POST", body: typeof body === "string" ? body : JSON.stringify(body),
});

let userSeq = 0;
function makeUser(db, { isTest = 0 } = {}) {
  const id = `u${++userSeq}`;
  const now = new Date().toISOString();
  db.raw.prepare("insert into users (id, device_id, name, avatar, country, created_at, last_seen, is_test) values (?,?,?,?,?,?,?,?)")
    .run(id, `dev${userSeq}`, `Player ${userSeq}`, "a1", "US", now, now, isTest);
  return db.raw.prepare("select * from users where id = ?").get(id);
}

// Calls verifyPurchase and returns { status, body }.
async function verify(env, me, body, extra = {}) {
  const res = await verifyPurchase(post(body), env, me, { json, readBody, ...extra });
  return { status: res.status, body: await res.json() };
}
async function list(env, me) {
  const res = await listPurchases(env, me, { json });
  return { status: res.status, body: await res.json() };
}
const rows = (db, sql = "select * from purchases", ...a) => db.raw.prepare(sql).all(...a);

// Fetch stub: every test sets a handler; any call without one fails loudly (never reaches a real server).
const realFetch = globalThis.fetch;
let calls;
function stubFetch(handler) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  };
}
const TOKEN_URI = "https://oauth2.googleapis.com/token";
const playUrl = (product, token) =>
  `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.promovote.dropolis/purchases/products/${product}/tokens/${encodeURIComponent(token)}`;
const playCalls = () => calls.filter((c) => c.url.includes("androidpublisher"));

// Handler: token endpoint works, the Play API answers with `purchase` (an object) or a custom Response function.
function googleHandler(purchase, { status = 200 } = {}) {
  return (url) => {
    if (url === TOKEN_URI) return json({ access_token: "fake-access-token", expires_in: 3600 });
    if (url.includes("androidpublisher")) {
      return typeof purchase === "function" ? purchase(url) : json(purchase, status);
    }
    throw new Error(`unexpected fetch ${url}`);
  };
}
const goodPurchase = (over = {}) => ({ purchaseState: 0, orderId: "GPA.1234-5678", ...over });

let SA_JSON;
before(() => {
  // Real RSA key made at runtime, never stored.
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  SA_JSON = JSON.stringify({
    client_email: "test-sa@example.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
    token_uri: TOKEN_URI,
  });
});

let db, env;
beforeEach(() => {
  db = new FakeD1();
  env = { DB: db, GOOGLE_PLAY_SERVICE_ACCOUNT: SA_JSON };
  resetGoogleTokenCache();
  stubFetch(() => { throw new Error("fetch not expected"); });
});
afterEach(() => { globalThis.fetch = realFetch; });

const android = (over = {}) => ({
  platform: "android", productId: "dropolis.gems_m", transactionId: "GPA.1234-5678", purchaseToken: "tok-1", ...over,
});

// ---------- Google Play ----------
test("android: valid purchase grants gems and writes the ledger", async () => {
  stubFetch(googleHandler(goodPurchase()));
  const me = makeUser(db);
  const r = await verify(env, me, android());
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, {
    ok: true, transactionId: "GPA.1234-5678", productId: "dropolis.gems_m", again: false,
    grant: { gems: 450, skin: null, cityCard: false }, sandbox: false,
  });
  const all = rows(db);
  assert.equal(all.length, 1);
  assert.equal(all[0].transaction_id, "tok-1"); // keyed on the purchase token
  assert.equal(all[0].client_transaction_id, "GPA.1234-5678");
  assert.equal(all[0].order_id, "GPA.1234-5678");
  assert.equal(all[0].user_id, me.id);
  assert.equal(all[0].gems, 450);
  assert.equal(all[0].sandbox, 0);
  assert.equal(all[0].price_usd, 4.99); // catalog list price (owner approved 2026-11-21)
  // The Play API was called with the Bearer token from the token endpoint.
  const pc = playCalls();
  assert.equal(pc.length, 1);
  assert.equal(pc[0].url, playUrl("dropolis.gems_m", "tok-1"));
  assert.equal(pc[0].init.headers.Authorization, "Bearer fake-access-token");
  const tokenCall = calls.find((c) => c.url === TOKEN_URI);
  assert.equal(tokenCall.init.method, "POST");
  assert.match(tokenCall.init.body, /grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=/);
});

test("android: purchase token accepted as transactionId when Google gives no order id", async () => {
  stubFetch(googleHandler({ purchaseState: 0 }));
  const me = makeUser(db);
  const r = await verify(env, me, android({ transactionId: "tok-1" }));
  assert.equal(r.status, 200);
  assert.equal(r.body.transactionId, "tok-1");
  assert.equal(rows(db)[0].order_id, null);
});

test("android: test purchase is sandbox, price 0", async () => {
  stubFetch(googleHandler(goodPurchase({ purchaseType: 0 })));
  const me = makeUser(db);
  const r = await verify(env, me, android());
  assert.equal(r.status, 200);
  assert.equal(r.body.sandbox, true);
  const row = rows(db)[0];
  assert.equal(row.sandbox, 1);
  assert.equal(row.price_usd, 0);
});

test("android: IAP_SANDBOX=testers blocks sandbox for normal players, allows is_test players", async () => {
  stubFetch(googleHandler(goodPurchase({ purchaseType: 0 })));
  env.IAP_SANDBOX = "testers";
  const normal = makeUser(db);
  const r1 = await verify(env, normal, android());
  assert.equal(r1.status, 402);
  assert.deepEqual(r1.body, { error: "not_valid", reason: "sandbox_not_allowed" });
  assert.equal(rows(db).length, 0);
  const tester = makeUser(db, { isTest: 1 });
  const r2 = await verify(env, tester, android());
  assert.equal(r2.status, 200);
  assert.equal(r2.body.sandbox, true);
  assert.equal(rows(db).length, 1);
});

test("android: a used token on a second account answers 409 owned_by_other", async () => {
  stubFetch(googleHandler(goodPurchase()));
  const a = makeUser(db), b = makeUser(db);
  assert.equal((await verify(env, a, android())).status, 200);
  const r = await verify(env, b, android());
  assert.equal(r.status, 409);
  assert.deepEqual(r.body, { error: "owned_by_other" });
  assert.equal(rows(db).length, 1);
  assert.equal(rows(db)[0].user_id, a.id);
});

test("same transaction twice: again=true, one row, store not called the second time", async () => {
  stubFetch(googleHandler(goodPurchase()));
  const me = makeUser(db);
  const first = await verify(env, me, android());
  const playBefore = playCalls().length;
  const second = await verify(env, me, android());
  assert.equal(second.status, 200);
  assert.equal(first.body.again, false);
  assert.equal(second.body.again, true);
  assert.deepEqual(second.body.grant, first.body.grant);
  assert.equal(rows(db).length, 1);
  assert.equal(playCalls().length, playBefore, "second call must not reach the store");
});

test("ledger answer: same token with another product answers 402 product_id", async () => {
  stubFetch(googleHandler(goodPurchase()));
  const me = makeUser(db);
  await verify(env, me, android());
  const r = await verify(env, me, android({ productId: "dropolis.gems_s" }));
  assert.equal(r.status, 402);
  assert.deepEqual(r.body, { error: "not_valid", reason: "product_id" });
});

test("two concurrent calls make one row and exactly one again=false", async () => {
  stubFetch(googleHandler(goodPurchase()));
  const me = makeUser(db);
  const [a, b] = await Promise.all([verify(env, me, android()), verify(env, me, android())]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(rows(db).length, 1);
  assert.equal([a, b].filter((x) => x.body.again === false).length, 1);
  assert.equal([a, b].filter((x) => x.body.again === true).length, 1);
});

test("android: network failure answers 503 store_unreachable and writes nothing", async () => {
  stubFetch((url) => {
    if (url === TOKEN_URI) return json({ access_token: "t", expires_in: 3600 });
    throw new TypeError("fetch failed");
  });
  const me = makeUser(db);
  const r = await verify(env, me, android());
  assert.equal(r.status, 503);
  assert.deepEqual(r.body, { error: "store_unreachable" });
  assert.equal(rows(db).length, 0);
});

test("android: Google 500 answers 503", async () => {
  stubFetch(googleHandler({}, { status: 500 }));
  const me = makeUser(db);
  const r = await verify(env, me, android());
  assert.equal(r.status, 503);
  assert.deepEqual(r.body, { error: "store_unreachable" });
  assert.equal(rows(db).length, 0);
});

test("android: token endpoint failure answers 503", async () => {
  stubFetch((url) => (url === TOKEN_URI ? json({ error: "bad" }, 400) : json({}, 200)));
  const r = await verify(env, makeUser(db), android());
  assert.equal(r.status, 503);
  assert.deepEqual(r.body, { error: "store_unreachable" });
});

test("android: Google 404 answers 402 not_valid", async () => {
  stubFetch(googleHandler({}, { status: 404 }));
  const r = await verify(env, makeUser(db), android());
  assert.equal(r.status, 402);
  assert.deepEqual(r.body, { error: "not_valid", reason: "google_http_404" });
  assert.equal(rows(db).length, 0);
});

test("android: purchaseState 1 (canceled) and 2 (pending) answer 402", async () => {
  stubFetch(googleHandler(goodPurchase({ purchaseState: 1 })));
  const r = await verify(env, makeUser(db), android());
  assert.equal(r.status, 402);
  assert.deepEqual(r.body, { error: "not_valid", reason: "not_purchased" });
  stubFetch(googleHandler(goodPurchase({ purchaseState: 2 })));
  const r2 = await verify(env, makeUser(db), android({ purchaseToken: "tok-2" }));
  assert.equal(r2.status, 402);
  assert.deepEqual(r2.body, { error: "not_valid", reason: "pending" });
  assert.equal(rows(db).length, 0);
});

test("android: transactionId that is neither orderId nor token answers 402", async () => {
  stubFetch(googleHandler(goodPurchase()));
  const r = await verify(env, makeUser(db), android({ transactionId: "GPA.9999-0000" }));
  assert.equal(r.status, 402);
  assert.deepEqual(r.body, { error: "not_valid", reason: "transaction_id" });
  assert.equal(rows(db).length, 0);
});

test("android: missing or broken service account answers 503", async () => {
  stubFetch(googleHandler(goodPurchase()));
  const me = makeUser(db);
  for (const val of [undefined, "", "not json", JSON.stringify({ client_email: "x" })]) {
    const e = { DB: db, GOOGLE_PLAY_SERVICE_ACCOUNT: val };
    const r = await verify(e, me, android());
    assert.equal(r.status, 503);
    assert.deepEqual(r.body, { error: "store_unreachable" });
  }
  assert.equal(calls.length, 0);
});

test("android: the access token is cached between calls", async () => {
  stubFetch(googleHandler(goodPurchase()));
  const me = makeUser(db);
  await verify(env, me, android());
  await verify(env, me, android({ purchaseToken: "tok-2", productId: "dropolis.gems_s" }));
  assert.equal(calls.filter((c) => c.url === TOKEN_URI).length, 1);
});

// ---------- request validation ----------
test("bad requests answer 400 bad_request", async () => {
  const me = makeUser(db);
  const cases = {
    "unknown productId": android({ productId: "dropolis.nope" }),
    "__proto__ productId": android({ productId: "__proto__" }),
    "constructor productId": android({ productId: "constructor" }),
    "bad platform": android({ platform: "windows" }),
    "android without purchaseToken": android({ purchaseToken: undefined }),
    "ios without jws and receipt": { platform: "ios", productId: "dropolis.gems_s", transactionId: "1" },
    "missing transactionId": android({ transactionId: undefined }),
    "invalid JSON body": "{not json",
  };
  for (const [name, body] of Object.entries(cases)) {
    const r = await verify(env, me, body);
    assert.equal(r.status, 400, name);
    assert.deepEqual(r.body, { error: "bad_request" }, name);
  }
  assert.equal(calls.length, 0);
  assert.equal(rows(db).length, 0);
});

// A JSON body that is not an object (null, a number, an array) is a bad request, never a 500.
test("non object JSON body answers 400 bad_request", async () => {
  for (const raw of ["null", "123", "[]"]) {
    const r = await verify(env, makeUser(db), raw);
    assert.equal(r.status, 400, raw);
    assert.deepEqual(r.body, { error: "bad_request" }, raw);
  }
});

// ---------- one time items ----------
test("one time item: a second token for starter_pack is stored without gems and answered again", async () => {
  stubFetch((url) => {
    if (url === TOKEN_URI) return json({ access_token: "t", expires_in: 3600 });
    const tok = decodeURIComponent(url.split("/tokens/")[1]);
    return json({ purchaseState: 0, orderId: `GPA.${tok}` });
  });
  const me = makeUser(db);
  const body = (t) => ({ platform: "android", productId: "dropolis.starter_pack", transactionId: `GPA.${t}`, purchaseToken: t });
  const r1 = await verify(env, me, body("sp-1"));
  assert.equal(r1.status, 200);
  assert.equal(r1.body.again, false);
  assert.deepEqual(r1.body.grant, { gems: 150, skin: "sky_rovi", cityCard: false });
  const r2 = await verify(env, me, body("sp-2"));
  assert.equal(r2.status, 200);
  assert.equal(r2.body.again, true);
  assert.deepEqual(r2.body.grant, r1.body.grant);
  const all = rows(db, "select * from purchases order by id");
  assert.equal(all.length, 2);
  assert.equal(all[0].gems, 150);
  assert.equal(all[0].restored, 0);
  assert.equal(all[1].gems, 0);
  assert.equal(all[1].restored, 1);
  assert.equal(JSON.parse(all[0].items).starterPack, true);
});

// ---------- listPurchases ----------
test("listPurchases: items, gemsBought and transaction ids", async () => {
  stubFetch((url) => {
    if (url === TOKEN_URI) return json({ access_token: "t", expires_in: 3600 });
    const tok = decodeURIComponent(url.split("/tokens/")[1]);
    return json({ purchaseState: 0, orderId: `GPA.${tok}` });
  });
  const me = makeUser(db);
  const other = makeUser(db);
  const buy = (u, product, t) => verify(env, u, { platform: "android", productId: product, transactionId: `GPA.${t}`, purchaseToken: t });
  // Slightly different created_at so the order is stable.
  await buy(me, "dropolis.gems_s", "t1");
  await buy(other, "dropolis.gems_xl", "t-other");
  await buy(me, "dropolis.gems_m", "t2");
  await buy(me, "dropolis.city_card", "t3");
  db.raw.exec("update purchases set created_at = '2026-01-01T00:00:0' || id");
  const r = await list(env, me);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, {
    items: { starterPack: false, cityCard: true },
    gemsBought: 530,
    transactions: ["GPA.t1", "GPA.t2", "GPA.t3"],
  });
  const empty = await list(env, makeUser(db));
  assert.deepEqual(empty.body, { items: { starterPack: false, cityCard: false }, gemsBought: 0, transactions: [] });
});

// ---------- account deletion ----------
test("account deletion keeps anonymous totals and tombstones; a new account restores without gems", async () => {
  stubFetch((url) => {
    if (url === TOKEN_URI) return json({ access_token: "t", expires_in: 3600 });
    const tok = decodeURIComponent(url.split("/tokens/")[1]);
    return json({ purchaseState: 0, orderId: `GPA.${tok}` });
  });
  const me = makeUser(db);
  const buy = (u, product, t) => verify(env, u, { platform: "android", productId: product, transactionId: `GPA.${t}`, purchaseToken: t });
  await buy(me, "dropolis.gems_s", "d1");
  await buy(me, "dropolis.gems_m", "d2");
  await buy(me, "dropolis.city_card", "d3");

  await db.batch([
    ...await purchaseDeleteStatements(db, me),
    db.prepare("delete from users where id = ?").bind(me.id),
  ]);

  assert.equal(rows(db, "select * from purchases where user_id = ?", me.id).length, 0);
  assert.equal(rows(db, "select * from users where id = ?", me.id).length, 0);
  const tot = rows(db, "select sum(purchases) as n, sum(gems) as g from purchase_deleted_totals")[0];
  assert.equal(tot.n, 3);
  assert.equal(tot.g, 530);
  assert.equal(rows(db, "select * from purchase_deleted_totals where is_test = 1").length, 0);
  const tombs = rows(db, "select * from purchase_tombstones");
  assert.equal(tombs.length, 3);
  // The tombstone is a hash, never the raw token.
  const h = crypto.createHash("sha256").update("dropolis-purchase:android:d2").digest("hex");
  assert.ok(tombs.some((t) => t.tx_hash === h));

  const fresh = makeUser(db);
  const r = await buy(fresh, "dropolis.gems_m", "d2");
  assert.equal(r.status, 200);
  assert.equal(r.body.again, true);
  assert.deepEqual(r.body.grant, { gems: 450, skin: null, cityCard: false });
  const row = rows(db, "select * from purchases where user_id = ?", fresh.id)[0];
  assert.equal(row.gems, 0);
  assert.equal(row.restored, 1);
});

test("account deletion: restored rows are not counted in totals, test accounts are flagged", async () => {
  stubFetch(googleHandler(goodPurchase()));
  const tester = makeUser(db, { isTest: 1 });
  await verify(env, tester, android());
  await db.batch([...await purchaseDeleteStatements(db, tester), db.prepare("delete from users where id = ?").bind(tester.id)]);
  const t = rows(db, "select * from purchase_deleted_totals");
  assert.equal(t.length, 1);
  assert.equal(t[0].is_test, 1);
  assert.equal(t[0].purchases, 1);
  assert.equal(t[0].usd, 4.99); // list price kept; the is_test flag keeps it out of revenue
  // A player with no purchases deletes cleanly.
  const nobody = makeUser(db);
  await db.batch([...await purchaseDeleteStatements(db, nobody), db.prepare("delete from users where id = ?").bind(nobody.id)]);
  assert.equal(rows(db, "select * from purchase_tombstones").length, 1);
});

// ---------- Apple JWS ----------
let tmp, chain;
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const sh = (args, opts) => execFileSync("openssl", args, { cwd: tmp, stdio: ["ignore", "pipe", "pipe"], ...opts });

// Makes a certificate. kind: "ec384" | "ec256". signer null = self signed. ext: extension file text.
function makeCert(name, { curve, cn, signer, ext }) {
  sh(["ecparam", "-name", curve, "-genkey", "-noout", "-out", `${name}.key`]);
  writeFileSync(join(tmp, `${name}.ext`), ext);
  if (!signer) {
    writeFileSync(join(tmp, `${name}.cnf`), `[req]\ndistinguished_name=dn\nprompt=no\nx509_extensions=ext\n[dn]\nCN=${cn}\n[ext]\n${ext}\n`);
    sh(["req", "-x509", "-new", "-key", `${name}.key`, "-sha384", "-days", "3650", "-config", `${name}.cnf`, "-out", `${name}.pem`]);
  } else {
    sh(["req", "-new", "-key", `${name}.key`, "-subj", `/CN=${cn}`, "-out", `${name}.csr`]);
    sh(["x509", "-req", "-in", `${name}.csr`, "-CA", `${signer}.pem`, "-CAkey", `${signer}.key`, "-CAcreateserial",
      "-sha384", "-days", "3000", "-extfile", `${name}.ext`, "-out", `${name}.pem`]);
  }
  const der = sh(["x509", "-in", `${name}.pem`, "-outform", "DER"]);
  return { name, der, b64: der.toString("base64"), key: crypto.createPrivateKey(readFileSync(join(tmp, `${name}.key`))) };
}

const APPLE_LEAF = "1.2.840.113635.100.6.11.1=DER:05:00";
const APPLE_WWDR = "1.2.840.113635.100.6.2.1=DER:05:00";

before(() => {
  tmp = mkdtempSync(join(tmpdir(), "dropolis-iap-"));
  const root = makeCert("root", { curve: "secp384r1", cn: "Test Root CA", ext: "basicConstraints=critical,CA:TRUE" });
  const mid = makeCert("mid", { curve: "secp384r1", cn: "Test Intermediate", signer: "root", ext: `basicConstraints=critical,CA:TRUE\n${APPLE_WWDR}` });
  const leaf = makeCert("leaf", { curve: "prime256v1", cn: "Test Leaf", signer: "mid", ext: `basicConstraints=CA:FALSE\n${APPLE_LEAF}` });
  // Intermediate with the same name but no Apple marker.
  const midPlain = makeCert("midplain", { curve: "secp384r1", cn: "Test Intermediate", signer: "root", ext: "basicConstraints=critical,CA:TRUE" });
  const leafPlain = makeCert("leafplain", { curve: "prime256v1", cn: "Test Leaf", signer: "midplain", ext: `basicConstraints=CA:FALSE\n${APPLE_LEAF}` });
  // Rogue intermediate: same subject name and marker as the real one, different key, so only the signature differs.
  const rogue = makeCert("rogue", { curve: "secp384r1", cn: "Test Intermediate", signer: "root", ext: `basicConstraints=critical,CA:TRUE\n${APPLE_WWDR}` });
  const leafRogue = makeCert("leafrogue", { curve: "prime256v1", cn: "Test Leaf", signer: "rogue", ext: `basicConstraints=CA:FALSE\n${APPLE_LEAF}` });
  chain = {
    root, mid, leaf, midPlain, leafPlain, rogue, leafRogue,
    rootSha: crypto.createHash("sha256").update(root.der).digest("hex"),
  };
});
after(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });

const goodTx = (over = {}) => ({
  transactionId: "2000000123", originalTransactionId: "2000000123", bundleId: BUNDLE_ID, productId: "dropolis.gems_l",
  environment: "Production", signedDate: Date.now(), purchaseDate: Date.now(), ...over,
});
// Builds a signed JWS. x5c is [leaf, mid, root] by default; key is the leaf key.
function makeJws(payload, { x5c, key } = {}) {
  x5c = x5c || [chain.leaf.b64, chain.mid.b64, chain.root.b64];
  const head = b64u(JSON.stringify({ alg: "ES256", x5c }));
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), { key: key || chain.leaf.key, dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${b64u(sig)}`;
}
const ios = (jws, over = {}) => ({ platform: "ios", productId: "dropolis.gems_l", transactionId: "2000000123", jws, ...over });
const appleOpts = () => ({ appleOpts: { rootSha256: chain.rootSha } });

test("ios: valid JWS grants gems (and the store is not called)", async () => {
  const me = makeUser(db);
  const r = await verify(env, me, ios(makeJws(goodTx())), appleOpts());
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, {
    ok: true, transactionId: "2000000123", productId: "dropolis.gems_l", again: false,
    grant: { gems: 1000, skin: null, cityCard: false }, sandbox: false,
  });
  const row = rows(db)[0];
  assert.equal(row.platform, "ios");
  assert.equal(row.transaction_id, "2000000123");
  assert.equal(row.original_transaction_id, "2000000123");
  assert.equal(calls.length, 0);
});

test("ios: same JWS from another account answers 409", async () => {
  const jws = makeJws(goodTx());
  await verify(env, makeUser(db), ios(jws), appleOpts());
  const r = await verify(env, makeUser(db), ios(jws), appleOpts());
  assert.equal(r.status, 409);
  assert.deepEqual(r.body, { error: "owned_by_other" });
});

test("ios: a new transaction of the same original purchase for another player answers 409", async () => {
  await verify(env, makeUser(db), ios(makeJws(goodTx())), appleOpts());
  const jws2 = makeJws(goodTx({ transactionId: "2000000999" }));
  const r = await verify(env, makeUser(db), ios(jws2, { transactionId: "2000000999" }), appleOpts());
  assert.equal(r.status, 409);
  assert.deepEqual(r.body, { error: "owned_by_other" });
});

test("ios: default Apple root pin rejects the test chain (jws_root)", async () => {
  const r = await verify(env, makeUser(db), ios(makeJws(goodTx())));
  assert.equal(r.status, 402);
  assert.deepEqual(r.body, { error: "not_valid", reason: "jws_root" });
  assert.equal(rows(db).length, 0);
});

test("ios: tampered payload fails the signature", async () => {
  const jws = makeJws(goodTx());
  const [h, , s] = jws.split(".");
  const forged = `${h}.${b64u(JSON.stringify(goodTx({ productId: "dropolis.gems_xl" })))}.${s}`;
  const r = await verify(env, makeUser(db), ios(forged, { productId: "dropolis.gems_xl" }), appleOpts());
  assert.equal(r.status, 402);
  assert.deepEqual(r.body, { error: "not_valid", reason: "jws_signature" });
});

test("ios: wrong bundleId, product mismatch, revoked, bad environment", async () => {
  const me = makeUser(db);
  const cases = [
    [goodTx({ bundleId: "com.other.app" }), {}, "bundle_id"],
    [goodTx({ productId: "dropolis.gems_s" }), {}, "product_id"], // body says gems_l
    [goodTx({ revocationDate: Date.now() }), {}, "revoked"],
    [goodTx({ environment: "Xcode" }), {}, "environment"],
    [goodTx({ transactionId: "55" }), {}, "transaction_id"],
  ];
  for (const [tx, over, reason] of cases) {
    const r = await verify(env, me, ios(makeJws(tx), over), appleOpts());
    assert.equal(r.status, 402, reason);
    assert.deepEqual(r.body, { error: "not_valid", reason }, reason);
  }
  assert.equal(rows(db).length, 0);
});

test("ios: Sandbox environment is accepted and flagged", async () => {
  const r = await verify(env, makeUser(db), ios(makeJws(goodTx({ environment: "Sandbox" }))), appleOpts());
  assert.equal(r.status, 200);
  assert.equal(r.body.sandbox, true);
  assert.equal(rows(db)[0].sandbox, 1);
  assert.equal(rows(db)[0].price_usd, 0);
});

test("ios: intermediate without the Apple marker fails the chain", async () => {
  const jws = makeJws(goodTx(), { x5c: [chain.leafPlain.b64, chain.midPlain.b64, chain.root.b64], key: chain.leafPlain.key });
  const r = await verify(env, makeUser(db), ios(jws), appleOpts());
  assert.equal(r.status, 402);
  assert.deepEqual(r.body, { error: "not_valid", reason: "jws_chain" });
});

test("ios: leaf signed by an unrelated intermediate key fails the chain", async () => {
  // x5c carries the real intermediate, but the leaf was signed by the rogue one.
  const jws = makeJws(goodTx(), { x5c: [chain.leafRogue.b64, chain.mid.b64, chain.root.b64], key: chain.leafRogue.key });
  const r = await verify(env, makeUser(db), ios(jws), appleOpts());
  assert.equal(r.status, 402);
  assert.deepEqual(r.body, { error: "not_valid", reason: "jws_chain" });
});

test("ios: malformed JWS shapes", async () => {
  const me = makeUser(db);
  for (const [jws, reason] of [["a.b", "jws_shape"], ["a.b.c", "jws_shape"]]) {
    const r = await verify(env, me, ios(jws), appleOpts());
    assert.equal(r.status, 402);
    assert.equal(r.body.reason, reason);
  }
  const noX5c = `${b64u(JSON.stringify({ alg: "ES256" }))}.${b64u("{}")}.sig`;
  const r = await verify(env, me, ios(noX5c), appleOpts());
  assert.equal(r.body.reason, "jws_header");
});

test("verifyAppleJWS called directly returns the payload and rejects an old signedDate window", async () => {
  const tx = goodTx();
  const payload = await verifyAppleJWS(makeJws(tx), { rootSha256: chain.rootSha });
  assert.equal(payload.transactionId, "2000000123");
  assert.equal(payload.productId, "dropolis.gems_l");
  // Signed in the future relative to "now": rejected.
  await assert.rejects(
    verifyAppleJWS(makeJws(goodTx({ signedDate: Date.now() + 3600e3 })), { rootSha256: chain.rootSha }),
    (e) => e.kind === "invalid" && e.reason === "jws_date",
  );
  // Certificates not yet valid at the signed date: rejected.
  await assert.rejects(
    verifyAppleJWS(makeJws(goodTx({ signedDate: Date.now() - 365 * 86400e3 })), { rootSha256: chain.rootSha }),
    (e) => e.kind === "invalid" && e.reason === "jws_cert_expired",
  );
});

test("ios: receipt only path without Apple secrets answers 503", async () => {
  const r = await verify(env, makeUser(db), { platform: "ios", productId: "dropolis.gems_s", transactionId: "2000000555", receipt: "abc" });
  assert.equal(r.status, 503);
  assert.deepEqual(r.body, { error: "store_unreachable" });
  assert.equal(rows(db).length, 0);
  assert.equal(calls.length, 0);
});

// ---------- catalog ----------
test("catalog: grants and list prices match the owner approved table (2026-11-21)", () => {
  const want = {
    "dropolis.starter_pack": [150, 1.99], "dropolis.city_card": [0, 4.99], "dropolis.gems_s": [80, 0.99],
    "dropolis.gems_m": [450, 4.99], "dropolis.gems_l": [1000, 9.99], "dropolis.gems_xl": [2200, 19.99],
  };
  assert.deepEqual(Object.keys(PRODUCTS).sort(), Object.keys(want).sort());
  for (const [id, [gems, usd]] of Object.entries(want)) {
    assert.equal(PRODUCTS[id].gems, gems, id);
    assert.equal(PRODUCTS[id].usd, usd, id);
  }
  assert.equal(PRODUCTS["dropolis.starter_pack"].oneTime, true);
  assert.equal(PRODUCTS["dropolis.city_card"].cityCard, true);
});

// ---------- iOS receipt path (App Store Server API, stubbed) ----------
// The signed transaction Apple returns must pass the same checks as a JWS from the phone: chain, bundle id, product.
const APPLE_PROD = "https://api.storekit.itunes.apple.com/inApps/v1/transactions/";
const APPLE_SANDBOX = "https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/";
function appleEnv() {
  const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  return {
    ...env, APPLE_IAP_KEY_ID: "TESTKEYID", APPLE_IAP_ISSUER_ID: "test-issuer",
    APPLE_IAP_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }),
  };
}
const receiptBody = (over = {}) => ({ platform: "ios", productId: "dropolis.gems_l", transactionId: "2000000123", receipt: "base64receipt", ...over });
function appleApi(tx, { prodStatus = 200 } = {}) {
  return (url) => {
    if (url.startsWith(APPLE_PROD)) return prodStatus === 200 ? json({ signedTransactionInfo: makeJws(tx) }) : json({}, prodStatus);
    if (url.startsWith(APPLE_SANDBOX)) return json({ signedTransactionInfo: makeJws(tx) });
    throw new Error(`unexpected fetch ${url}`);
  };
}

test("ios receipt path: valid signed transaction from Apple grants, with a signed ES256 bearer", async () => {
  const e = appleEnv();
  stubFetch(appleApi(goodTx()));
  const r = await verify(e, makeUser(db), receiptBody(), appleOpts());
  assert.equal(r.status, 200);
  assert.equal(r.body.grant.gems, 1000);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, APPLE_PROD + "2000000123");
  const bearer = calls[0].init.headers.Authorization.replace("Bearer ", "").split(".");
  const head = JSON.parse(Buffer.from(bearer[0], "base64url"));
  const claims = JSON.parse(Buffer.from(bearer[1], "base64url"));
  assert.deepEqual([head.alg, head.kid], ["ES256", "TESTKEYID"]);
  assert.deepEqual([claims.iss, claims.aud, claims.bid], ["test-issuer", "appstoreconnect-v1", BUNDLE_ID]);
});

test("ios receipt path: wrong bundle id or product in Apple's answer answers 402", async () => {
  const e = appleEnv();
  stubFetch(appleApi(goodTx({ bundleId: "com.other.app" })));
  let r = await verify(e, makeUser(db), receiptBody(), appleOpts());
  assert.equal(r.status, 402);
  assert.deepEqual(r.body, { error: "not_valid", reason: "bundle_id" });
  stubFetch(appleApi(goodTx({ productId: "dropolis.gems_s" })));
  r = await verify(e, makeUser(db), receiptBody(), appleOpts());
  assert.equal(r.status, 402);
  assert.deepEqual(r.body, { error: "not_valid", reason: "product_id" });
  assert.equal(rows(db).length, 0);
});

test("ios receipt path: not in production, found in sandbox; not found anywhere answers 402; Apple down answers 503", async () => {
  const e = appleEnv();
  stubFetch(appleApi(goodTx({ environment: "Sandbox" }), { prodStatus: 404 }));
  let r = await verify(e, makeUser(db), receiptBody(), appleOpts());
  assert.equal(r.status, 200);
  assert.equal(r.body.sandbox, true);
  stubFetch(() => json({}, 404));
  r = await verify(e, makeUser(db), receiptBody({ transactionId: "2000000777" }), appleOpts());
  assert.equal(r.status, 402);
  stubFetch(() => json({}, 500));
  r = await verify(e, makeUser(db), receiptBody({ transactionId: "2000000778" }), appleOpts());
  assert.equal(r.status, 503);
});
