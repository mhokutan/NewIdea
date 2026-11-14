// Test accounts in Dropolis (founder decision 2026-11-14: flagged, never deleted). Run from the repo root:
//   node --test services/dropolis/test/is-test.test.mjs
// Starts dropolis-api and the promovote.com admin site locally (wrangler dev) on one fresh local dropolis-db, applies
// the migrations (0001 to 0003) and checks: a request with "X-Dropolis-Test: 1" or a HeadlessChrome User-Agent flags
// the player (and the flag never goes back to 0); test players are left out of the leaderboard, of invite counts and
// rewards, and of the admin page numbers. Never touches the live database.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const GAME_DIR = join(ROOT, "services/dropolis");
const WEB_DIR = join(ROOT, "web/landing");
const WRANGLER = join(ROOT, "services/api/node_modules/.bin/wrangler");
const STATE = mkdtempSync(join(tmpdir(), "dropolis-d1-"));
const GAME = "http://127.0.0.1:8793", WEB = "http://127.0.0.1:8794";
const PASS = "test-only-admin-pass";
const ENV = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" };
const procs = [];

function startWorker(dir, port, vars) {
  const args = ["dev", "--local", "--ip", "127.0.0.1", "--port", String(port), "--persist-to", STATE, "--inspector-port", "0"];
  for (const [k, v] of Object.entries(vars)) args.push("--var", `${k}:${v}`);
  const p = spawn(WRANGLER, args, { cwd: dir, detached: true, env: ENV, stdio: ["ignore", "pipe", "pipe"] });
  procs.push(p);
  return new Promise((ok, bad) => {
    let log = "";
    const t = setTimeout(() => bad(new Error("worker did not start: " + log.slice(-800))), 90000);
    const on = (b) => { log += b; if (/Ready on/.test(log)) { clearTimeout(t); ok(); } };
    p.stdout.on("data", on); p.stderr.on("data", on);
  });
}
const sql = (command) => {
  const r = spawnSync(WRANGLER, ["d1", "execute", "dropolis-db", "--local", "--persist-to", STATE, "--json", "--command", command], { cwd: GAME_DIR, env: ENV, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return JSON.parse(r.stdout)[0].results;
};
const UA = "Mozilla/5.0 (Linux; Android 14) Dropolis/1.0";
const HEADLESS = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36";
async function call(path, { token, method = "GET", body, headers = {} } = {}) {
  const opts = {
    method, body: body ? JSON.stringify(body) : undefined,
    headers: { "User-Agent": UA, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
  };
  // The local dev server can drop the very first connection or a kept alive socket; try once more then.
  let r;
  try { r = await fetch(GAME + path, opts); } catch { await new Promise((ok) => setTimeout(ok, 1500)); r = await fetch(GAME + path, opts); }
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}
const guest = async (deviceId, headers = {}) => call("/v1/auth/guest", { method: "POST", body: { deviceId }, headers });
const flag = (id) => sql(`select is_test from users where id = '${id}'`)[0].is_test;

before(async () => {
  execFileSync(WRANGLER, ["d1", "migrations", "apply", "dropolis-db", "--local", "--persist-to", STATE], { cwd: GAME_DIR, stdio: "ignore", env: ENV });
  await Promise.all([startWorker(GAME_DIR, 8793, {}), startWorker(WEB_DIR, 8794, { ADMIN_PASSWORD: PASS })]);
});
after(() => {
  for (const p of procs) { try { process.kill(-p.pid, "SIGTERM"); } catch { /* already gone */ } }
  rmSync(STATE, { recursive: true, force: true });
});

const P = {}; // players: real, real2, testHeader, testHeadless

test("migration 0003 adds is_test with default 0 and its index", () => {
  const col = sql("select dflt_value, \"notnull\" from pragma_table_info('users') where name = 'is_test'");
  assert.deepEqual(col, [{ dflt_value: "0", notnull: 1 }]);
  assert.equal(sql("select count(*) as n from sqlite_master where name = 'idx_users_is_test'")[0].n, 1);
});

test("guest sign in flags test requests only", async () => {
  P.real = await guest("device-real-1");
  P.real2 = await guest("device-real-2");
  P.testHeader = await guest("device-test-1", { "X-Dropolis-Test": "1" });
  P.testHeadless = await guest("device-test-2");
  for (const k of ["real", "real2", "testHeader", "testHeadless"]) assert.ok(P[k].token, k);
  assert.equal(flag(P.real.user.id), 0);
  assert.equal(flag(P.real2.user.id), 0);
  assert.equal(flag(P.testHeader.user.id), 1);
  assert.equal(flag(P.testHeadless.user.id), 0); // a normal phone so far
  // "X-Dropolis-Test: 0" or any other value is not a test request.
  const other = await guest("device-other", { "X-Dropolis-Test": "0" });
  assert.equal(flag(other.user.id), 0);
});

test("any authenticated request from a headless browser flags the player, and the flag never goes back", async () => {
  await call("/v1/me", { token: P.testHeadless.token, headers: { "User-Agent": HEADLESS } });
  assert.equal(flag(P.testHeadless.user.id), 1);
  await call("/v1/me", { token: P.testHeadless.token });
  await call("/v1/me", { token: P.testHeader.token, headers: { "X-Dropolis-Test": "0" } });
  assert.equal(flag(P.testHeadless.user.id), 1);
  assert.equal(flag(P.testHeader.user.id), 1);
  // A reinstall on the same phone gives the same (still flagged) guest back.
  const again = await guest("device-test-1");
  assert.equal(again.user.id, P.testHeader.user.id);
  assert.equal(flag(again.user.id), 1);
  // Real players stay real.
  await call("/v1/me", { token: P.real.token });
  assert.equal(flag(P.real.user.id), 0);
});

test("leaderboards leave test players out, but a test player still sees its own value", async () => {
  await call("/v1/me", { token: P.real.token, method: "PATCH", body: { name: "RealOne" } });
  await call("/v1/me", { token: P.real2.token, method: "PATCH", body: { name: "RealTwo" } });
  await call("/v1/me", { token: P.testHeader.token, method: "PATCH", body: { name: "TestBot" } });
  await call("/v1/scores", { token: P.real.token, method: "POST", body: { board: "city_level", value: 50 } });
  await call("/v1/scores", { token: P.real2.token, method: "POST", body: { board: "city_level", value: 30 } });
  await call("/v1/scores", { token: P.testHeader.token, method: "POST", body: { board: "city_level", value: 999 } });
  const lb = await call("/v1/leaderboard/city_level", { token: P.real.token });
  assert.deepEqual(lb.top.map((x) => x.name), ["RealOne", "RealTwo"]);
  assert.deepEqual(lb.me, { rank: 1, value: 50 });
  const asTest = await call("/v1/leaderboard/city_level", { token: P.testHeader.token });
  assert.ok(!asTest.top.some((x) => x.name === "TestBot"));
  assert.deepEqual(asTest.me, { rank: 1, value: 999 });
});

test("invites: a test invitee earns its inviter nothing and is not counted", async () => {
  const ref = await call("/v1/referral", { token: P.real.token });
  assert.match(ref.code, /^[A-Z2-9]{6,8}$/);
  // The test player redeems the real player's code and finishes chapter 1: no reward for the inviter.
  assert.equal((await call("/v1/referral/redeem", { token: P.testHeader.token, method: "POST", body: { code: ref.code } })).gems, 10);
  const tp = await call("/v1/referral/progress", { token: P.testHeader.token, method: "POST", body: { milestone: "chapter1" } });
  assert.deepEqual({ created: tp.created, reason: tp.reason }, { created: false, reason: "test_account" });
  // A real friend does the same: one reward.
  assert.equal((await call("/v1/referral/redeem", { token: P.real2.token, method: "POST", body: { code: ref.code } })).gems, 10);
  assert.equal((await call("/v1/referral/progress", { token: P.real2.token, method: "POST", body: { milestone: "chapter1" } })).created, true);
  const after = await call("/v1/referral", { token: P.real.token });
  assert.equal(after.invited, 1, "only the real friend counts");
  assert.equal(after.pending.length, 1);
  assert.equal(after.pending[0].friendName, "RealTwo");
  assert.equal(sql(`select count(*) as n from referral_rewards where inviter_id = '${P.real.user.id}'`)[0].n, 1);
});

test("admin page numbers leave test players out", async () => {
  const auth = { Authorization: "Basic " + Buffer.from("admin:" + PASS).toString("base64") };
  const r = await fetch(WEB + "/admin/dropolis/oyun", { headers: auth });
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Test hesapları \(otomatik testler\) hiçbir sayıya katılmaz/);
  // 3 real players (real, real2, other), 2 test players.
  assert.match(html, /<b>3<\/b><span>Toplam oyuncu<\/span>/);
  assert.match(html, /2 test hesabı sayılmadı/);
  assert.match(html, /RealOne/);
  assert.ok(!html.includes("TestBot"), "test player not on the admin leaderboard");
  // Invites: one real redeem, one conversion.
  assert.match(html, /<b>1<\/b><span>Kodla gelen oyuncu<\/span>/);
});
