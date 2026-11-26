// Unit tests for the store refund notifications (src/notifications.js). Run from the repo root:
//   node --test services/dropolis/test/notifications.test.mjs
// Apple: App Store Server Notifications V2 signed with a fake Apple like chain made with openssl at runtime.
// Google: Pub/Sub push with an injected token verifier. Everything is in memory (fake D1 over node:sqlite), no network.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { appleNotification, googleNotification } from "../src/notifications.js";
import { BUNDLE_ID, PACKAGE_NAME } from "../src/purchases.js";

const SERVICE = resolve(import.meta.dirname, "..");

// ---------- fake D1 over node:sqlite ----------
const norm = (args) => args.map((a) => (a === undefined ? null : a));
class Stmt {
  constructor(raw, sql, args = []) { this.raw = raw; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.raw, this.sql, norm(args)); }
  async first() { return this.raw.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.raw.prepare(this.sql).all(...this.args) }; }
  async run() {
    const r = this.raw.prepare(this.sql).run(...this.args);
    return { results: [], meta: { changes: Number(r.changes) } };
  }
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
}

// ---------- helpers ----------
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const b64u = (buf) => Buffer.from(buf).toString("base64url");

let db, env, userId;
beforeEach(() => {
  db = new FakeD1();
  env = { DB: db, GOOGLE_RTDN_AUDIENCE: "https://api.test/rtdn", GOOGLE_RTDN_SA_EMAIL: "pubsub@example.iam.gserviceaccount.com" };
  const now = new Date().toISOString();
  db.raw.prepare("insert into users (id, device_id, name, avatar, country, created_at, last_seen, is_test) values ('u1','dev1','P','a1','US',?,?,0)").run(now, now);
  userId = "u1";
});

function addPurchase(platform, transactionId, over = {}) {
  db.raw.prepare(`insert into purchases (platform, transaction_id, client_transaction_id, user_id, product_id, gems, items, sandbox, status, created_at)
    values (?, ?, ?, ?, 'dropolis.gems_m', 450, '{}', 0, ?, ?)`)
    .run(platform, transactionId, transactionId, over.userId || userId, over.status || "granted", new Date().toISOString());
}
const row = (platform, id) => db.raw.prepare("select * from purchases where platform = ? and transaction_id = ?").get(platform, id);

// ---------- fake Apple chain ----------
let tmp, chain;
const sh = (args) => execFileSync("openssl", args, { cwd: tmp, stdio: ["ignore", "pipe", "pipe"] });
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
  return { der, b64: der.toString("base64"), key: crypto.createPrivateKey(readFileSync(join(tmp, `${name}.key`))) };
}
before(() => {
  tmp = mkdtempSync(join(tmpdir(), "dropolis-notif-"));
  const root = makeCert("root", { curve: "secp384r1", cn: "Test Root CA", ext: "basicConstraints=critical,CA:TRUE" });
  const mid = makeCert("mid", { curve: "secp384r1", cn: "Test Intermediate", signer: "root", ext: "basicConstraints=critical,CA:TRUE\n1.2.840.113635.100.6.2.1=DER:05:00" });
  const leaf = makeCert("leaf", { curve: "prime256v1", cn: "Test Leaf", signer: "mid", ext: "basicConstraints=CA:FALSE\n1.2.840.113635.100.6.11.1=DER:05:00" });
  chain = { root, mid, leaf, rootSha: crypto.createHash("sha256").update(root.der).digest("hex") };
});
after(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });

function makeJws(payload) {
  const head = b64u(JSON.stringify({ alg: "ES256", x5c: [chain.leaf.b64, chain.mid.b64, chain.root.b64] }));
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.sign("sha256", Buffer.from(`${head}.${body}`), { key: chain.leaf.key, dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${b64u(sig)}`;
}
const appleOpts = () => ({ rootSha256: chain.rootSha });
const tx = (id, over = {}) => ({ transactionId: id, originalTransactionId: id, bundleId: BUNDLE_ID, productId: "dropolis.gems_m", environment: "Production", signedDate: Date.now(), ...over });
const notif = (type, txPayload, { bundleId = BUNDLE_ID } = {}) => makeJws({
  notificationType: type, notificationUUID: crypto.randomUUID(), signedDate: Date.now(),
  data: { bundleId, environment: "Production", ...(txPayload ? { signedTransactionInfo: makeJws(txPayload) } : {}) },
});

async function apple(body) {
  const req = new Request("https://api.test/v1/store/apple/notifications", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
  const res = await appleNotification(req, env, { json, appleOpts: appleOpts() });
  return { status: res.status, body: await res.json() };
}

// ---------- Apple ----------
test("apple: REFUND marks the ios row refunded", async () => {
  addPurchase("ios", "2000000001");
  const r = await apple({ signedPayload: notif("REFUND", tx("2000000001")) });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, refunded: 1 });
  const p = row("ios", "2000000001");
  assert.equal(p.status, "refunded");
  assert.ok(p.refunded_at);
});

test("apple: REVOKE marks the ios row refunded too", async () => {
  addPurchase("ios", "2000000002");
  const r = await apple({ signedPayload: notif("REVOKE", tx("2000000002")) });
  assert.deepEqual(r.body, { ok: true, refunded: 1 });
  assert.equal(row("ios", "2000000002").status, "refunded");
});

test("apple: REFUND_REVERSED restores the row to granted", async () => {
  addPurchase("ios", "2000000003");
  await apple({ signedPayload: notif("REFUND", tx("2000000003")) });
  assert.equal(row("ios", "2000000003").status, "refunded");
  const r = await apple({ signedPayload: notif("REFUND_REVERSED", tx("2000000003")) });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  const p = row("ios", "2000000003");
  assert.equal(p.status, "granted");
  assert.equal(p.refunded_at, null);
});

test("apple: refunding twice changes nothing the second time", async () => {
  addPurchase("ios", "2000000004");
  await apple({ signedPayload: notif("REFUND", tx("2000000004")) });
  const first = row("ios", "2000000004").refunded_at;
  const r = await apple({ signedPayload: notif("REFUND", tx("2000000004")) });
  assert.deepEqual(r.body, { ok: true, refunded: 0 });
  assert.equal(row("ios", "2000000004").refunded_at, first);
});

test("apple: unknown transaction answers 200 with refunded 0", async () => {
  const r = await apple({ signedPayload: notif("REFUND", tx("9999999999")) });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, refunded: 0 });
});

test("apple: wrong bundle id is ignored with 200 and touches nothing", async () => {
  addPurchase("ios", "2000000005");
  const r = await apple({ signedPayload: notif("REFUND", tx("2000000005", { bundleId: "com.other.app" }), { bundleId: "com.other.app" }) });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, ignored: "bundle_id" });
  assert.equal(row("ios", "2000000005").status, "granted");
});

test("apple: TEST and other types are ignored with 200", async () => {
  addPurchase("ios", "2000000006");
  for (const type of ["TEST", "CONSUMPTION_REQUEST", "DID_RENEW"]) {
    const r = await apple({ signedPayload: notif(type) });
    assert.equal(r.status, 200, type);
    assert.deepEqual(r.body, { ok: true, ignored: type });
  }
  assert.equal(row("ios", "2000000006").status, "granted");
});

test("apple: tampered signedPayload answers 401 bad_signature", async () => {
  addPurchase("ios", "2000000007");
  const good = notif("REFUND", tx("2000000007"));
  const [h, p, s] = good.split(".");
  const body = JSON.parse(Buffer.from(p, "base64url"));
  body.notificationType = "REFUND";
  body.data.bundleId = BUNDLE_ID;
  body.extra = "tampered";
  const forged = `${h}.${b64u(JSON.stringify(body))}.${s}`;
  const r = await apple({ signedPayload: forged });
  assert.equal(r.status, 401);
  assert.deepEqual(r.body, { error: "bad_signature" });
  assert.equal(row("ios", "2000000007").status, "granted");
});

test("apple: payload signed by the default Apple root pin is rejected (test chain is not Apple)", async () => {
  const req = new Request("https://api.test/x", { method: "POST", body: JSON.stringify({ signedPayload: notif("REFUND", tx("1")) }) });
  const res = await appleNotification(req, env, { json });
  assert.equal(res.status, 401);
});

test("apple: tampered inner transaction answers 401", async () => {
  addPurchase("ios", "2000000008");
  const inner = makeJws(tx("2000000008"));
  const [h, , s] = inner.split(".");
  const forgedInner = `${h}.${b64u(JSON.stringify(tx("2000000008", { productId: "x" })))}.${s}`;
  const outer = makeJws({ notificationType: "REFUND", signedDate: Date.now(), data: { bundleId: BUNDLE_ID, signedTransactionInfo: forgedInner } });
  const r = await apple({ signedPayload: outer });
  assert.equal(r.status, 401);
  assert.equal(row("ios", "2000000008").status, "granted");
});

test("apple: bad bodies answer 400 bad_request", async () => {
  for (const body of ["{not json", "null", "[]", "{}", { signedPayload: 5 }, { signedPayload: "" }, JSON.stringify({ signedPayload: "x".repeat(70 * 1024) })]) {
    const r = await apple(body);
    assert.equal(r.status, 400, String(body).slice(0, 30));
    assert.deepEqual(r.body, { error: "bad_request" });
  }
});

test("apple: REFUND without a signedTransactionInfo answers 400", async () => {
  const r = await apple({ signedPayload: notif("REFUND") });
  assert.equal(r.status, 400);
  assert.deepEqual(r.body, { error: "bad_request" });
});

test("apple: a refund never touches an android row with the same id or another ios transaction", async () => {
  addPurchase("ios", "2000000010");
  addPurchase("ios", "2000000011");
  addPurchase("android", "2000000010");
  const r = await apple({ signedPayload: notif("REFUND", tx("2000000010")) });
  assert.deepEqual(r.body, { ok: true, refunded: 1 });
  assert.equal(row("ios", "2000000010").status, "refunded");
  assert.equal(row("ios", "2000000011").status, "granted");
  assert.equal(row("android", "2000000010").status, "granted");
});

// ---------- Google ----------
const SA = "pubsub@example.iam.gserviceaccount.com";
const goodClaims = (over = {}) => ({ email: SA, email_verified: true, aud: "https://api.test/rtdn", ...over });
const pubsub = (msg, raw) => ({ message: { data: raw ?? Buffer.from(JSON.stringify(msg)).toString("base64"), messageId: "m1" } });
const voided = (token, over = {}) => ({
  version: "1.0", packageName: PACKAGE_NAME, eventTimeMillis: String(Date.now()),
  voidedPurchaseNotification: { purchaseToken: token, orderId: "GPA.1", productType: 2, ...over },
});

async function google(body, { auth = "Bearer good-token", verifier, e = env } = {}) {
  const calls = [];
  const verifyGoogleToken = verifier || (async (t, aud) => { calls.push([t, aud]); return goodClaims(); });
  const headers = auth ? { Authorization: auth } : {};
  const req = new Request("https://api.test/v1/store/google/rtdn", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
  const res = await googleNotification(req, e, { json, verifyGoogleToken });
  return { status: res.status, body: await res.json(), calls };
}

test("google: valid voided purchase marks the android row refunded", async () => {
  addPurchase("android", "tok-1");
  const r = await google(pubsub(voided("tok-1")));
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, refunded: 1 });
  assert.deepEqual(r.calls, [["good-token", ["https://api.test/rtdn"]]]);
  const p = row("android", "tok-1");
  assert.equal(p.status, "refunded");
  assert.ok(p.refunded_at);
});

test("google: a voided purchase never touches an ios row with the same id or another token", async () => {
  addPurchase("android", "tok-2");
  addPurchase("android", "tok-3");
  addPurchase("ios", "tok-2");
  const r = await google(pubsub(voided("tok-2")));
  assert.deepEqual(r.body, { ok: true, refunded: 1 });
  assert.equal(row("android", "tok-3").status, "granted");
  assert.equal(row("ios", "tok-2").status, "granted");
});

test("google: unknown token answers 200 with refunded 0", async () => {
  const r = await google(pubsub(voided("nope")));
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, refunded: 0 });
});

test("google: wrong service account email answers 401", async () => {
  addPurchase("android", "tok-4");
  const r = await google(pubsub(voided("tok-4")), { verifier: async () => goodClaims({ email: "evil@example.com" }) });
  assert.equal(r.status, 401);
  assert.deepEqual(r.body, { error: "unauthorized" });
  assert.equal(row("android", "tok-4").status, "granted");
});

test("google: unverified email answers 401", async () => {
  const r = await google(pubsub(voided("tok-5")), { verifier: async () => goodClaims({ email_verified: false }) });
  assert.equal(r.status, 401);
});

test("google: verifier throws answers 401", async () => {
  const r = await google(pubsub(voided("tok-6")), { verifier: async () => { throw new Error("bad signature"); } });
  assert.equal(r.status, 401);
  assert.deepEqual(r.body, { error: "unauthorized" });
});

test("google: missing or malformed Authorization header answers 401", async () => {
  for (const auth of [null, "Basic abc", "Bearer"]) {
    const r = await google(pubsub(voided("tok-7")), { auth });
    assert.equal(r.status, 401, String(auth));
  }
});

test("google: missing env answers 503 not_configured", async () => {
  for (const missing of ["GOOGLE_RTDN_AUDIENCE", "GOOGLE_RTDN_SA_EMAIL"]) {
    const e = { ...env };
    delete e[missing];
    const r = await google(pubsub(voided("tok-8")), { e });
    assert.equal(r.status, 503, missing);
    assert.deepEqual(r.body, { error: "not_configured" });
  }
});

test("google: another package is ignored with 200", async () => {
  addPurchase("android", "tok-9");
  const r = await google(pubsub({ ...voided("tok-9"), packageName: "com.other.app" }));
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, ignored: "package_name" });
  assert.equal(row("android", "tok-9").status, "granted");
});

test("google: test notification and other types are ignored with 200", async () => {
  const test1 = await google(pubsub({ version: "1.0", packageName: PACKAGE_NAME, eventTimeMillis: "1", testNotification: { version: "1.0" } }));
  assert.equal(test1.status, 200);
  assert.equal(test1.body.ok, true);
  assert.equal(test1.body.ignored, "test");
  const other = await google(pubsub({ version: "1.0", packageName: PACKAGE_NAME, eventTimeMillis: "1", oneTimeProductNotification: { sku: "x", purchaseToken: "t", notificationType: 1 } }));
  assert.equal(other.status, 200);
  assert.equal(other.body.ok, true);
});

test("google: bad base64, bad JSON and bad bodies answer 400", async () => {
  const cases = [
    pubsub(null, "!!!not base64!!!"),
    pubsub(null, Buffer.from("not json").toString("base64")),
    pubsub(null, ""),
    { message: {} },
    {},
    "{not json",
    JSON.stringify({ message: { data: "x".repeat(70 * 1024) } }),
  ];
  for (const body of cases) {
    const r = await google(body);
    assert.equal(r.status, 400, String(JSON.stringify(body)).slice(0, 40));
    assert.deepEqual(r.body, { error: "bad_request" });
  }
});

test("google: voided notification without a purchase token answers 400", async () => {
  const r = await google(pubsub({ packageName: PACKAGE_NAME, voidedPurchaseNotification: { orderId: "x" } }));
  assert.equal(r.status, 400);
});
