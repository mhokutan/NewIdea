// Office page tests (2026-11-12). Run from the repo root: node --test web/landing/tests/office.test.mjs
// Starts promovote-api and the landing Worker locally (wrangler dev) on one shared local D1, applies the migrations
// and writes test rows the way the CEO session will (direct SQL), then checks: no write endpoint exists, the data
// is readable only with the admin token (API) and the admin login (site), the table rules hold, and the page shows
// the list, the 3D canvas and the side panel. Saves phone and desktop screenshots. Never touches the live database.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const ROOT = resolve(import.meta.dirname, "../../..");
const API_DIR = join(ROOT, "services/api");
const WEB_DIR = join(ROOT, "web/landing");
const STATE = mkdtempSync(join(tmpdir(), "office-d1-"));
const SHOTS = process.env.OFFICE_SHOTS || join(ROOT, "docs/review/office");
const TOKEN = randomBytes(24).toString("hex"); // test only, never a real secret
const PASS = "test-only-admin-pass";
const API = "http://127.0.0.1:8791", WEB = "http://127.0.0.1:8792";
const AUTH = "Basic " + Buffer.from("admin:" + PASS).toString("base64");
const ENV = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" };
const procs = [];

function startWorker(dir, port, vars) {
  const args = ["wrangler", "dev", "--local", "--ip", "127.0.0.1", "--port", String(port), "--persist-to", STATE, "--inspector-port", "0"];
  for (const [k, v] of Object.entries(vars)) args.push("--var", `${k}:${v}`);
  const p = spawn("npx", args, { cwd: dir, detached: true, env: ENV, stdio: ["ignore", "pipe", "pipe"] });
  procs.push(p);
  return new Promise((ok, bad) => {
    let log = "";
    const t = setTimeout(() => bad(new Error("worker did not start: " + log.slice(-800))), 90000);
    const on = (b) => { log += b; if (/Ready on/.test(log)) { clearTimeout(t); ok(); } };
    p.stdout.on("data", on); p.stderr.on("data", on);
  });
}
const sql = (command) => spawnSync("npx", ["wrangler", "d1", "execute", "promovote-db", "--local", "--persist-to", STATE, "--command", command], { cwd: API_DIR, env: ENV, encoding: "utf8" });
// The local dev server can close a kept alive socket between requests ("other side closed"); try once more then.
const get = async (url, opts) => { try { return await fetch(url, opts); } catch { return fetch(url, opts); } };
const q = (s) => (s === null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

const AGENTS = [
  ["ceo", "CEO", "working", "Haftalık planı güncelliyor", null],
  ["hauling-dev", "Hauling Geliştirici", "waiting_owner", "2.5.2 derlemesi hazır", "2.5.2 iOS ve Android derlemesi için evet"],
  ["empire-desktop", "Masaüstü (derleme, mağaza)", "idle", "Mağaza testleri bitti", null],
  ["robo-works", "Robo Works", "blocked", "Android manifest kontrolü takıldı", null],
  ["promovote", "PromoVote", "working", "Ofis sayfasını kuruyor", null],
  ["poleris", "Poleris", "offline", null, null],
];

before(async () => {
  execFileSync("npx", ["wrangler", "d1", "migrations", "apply", "promovote-db", "--local", "--persist-to", STATE], { cwd: API_DIR, stdio: "ignore", env: ENV });
  // The CEO session writes like this (direct SQL through the D1 tool).
  const r = sql("insert into office_agents (id, role, status, last_action, needs_owner) values " + AGENTS.map((a) => `(${a.map(q).join(", ")})`).join(", "));
  assert.equal(r.status, 0, r.stderr);
  await Promise.all([
    startWorker(API_DIR, 8791, { ADMIN_API_TOKEN: TOKEN }),
    startWorker(WEB_DIR, 8792, { ADMIN_PASSWORD: PASS, ADMIN_API_TOKEN: TOKEN, API_BASE_URL: API }),
  ]);
});
// Kill the whole process group (npx, wrangler and workerd), or node --test waits for them forever.
after(() => { for (const p of procs) { try { process.kill(-p.pid, "SIGTERM"); } catch { /* already gone */ } } });

test("no write endpoint: anon cannot write through the API", async () => {
  const r = await fetch(API + "/v1/office/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "x", role: "x", status: "working" }) });
  assert.equal(r.status, 404);
  const r2 = await fetch(API + "/v1/admin/office", { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Token": TOKEN }, body: "{}" });
  assert.equal(r2.status, 404);
});

test("table rules refuse bad rows", () => {
  assert.notEqual(sql("insert into office_agents (id, role, status) values ('bad-status', 'X', 'sleeping')").status, 0);
  assert.notEqual(sql("insert into office_agents (id, role, status) values ('Bad Id', 'X', 'idle')").status, 0);
  assert.notEqual(sql(`insert into office_agents (id, role, status, last_action) values ('too-long', 'X', 'idle', '${"a".repeat(161)}')`).status, 0);
  assert.notEqual(sql("insert into office_notes (id, text, status) values ('n1', 'hi', 'done')").status, 0);
});

test("API read needs the admin token", async () => {
  assert.equal((await get(API + "/v1/admin/office")).status, 401);
  assert.equal((await get(API + "/v1/admin/office", { headers: { "X-Admin-Token": "x".repeat(TOKEN.length) } })).status, 401);
  const r = await get(API + "/v1/admin/office", { headers: { "X-Admin-Token": TOKEN } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.agents.length, 6);
  assert.equal(j.agents[0].id, "ceo");
});

test("site read needs the admin login", async () => {
  assert.equal((await get(WEB + "/admin/office.json")).status, 401);
  assert.equal((await get(WEB + "/admin/office.json", { headers: { Authorization: "Basic " + Buffer.from("admin:wrong").toString("base64") } })).status, 401);
  const r = await get(WEB + "/admin/office.json", { headers: { Authorization: AUTH } });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).agents.length, 6);
});

test("page renders list, 3D canvas and panel; screenshots", async () => {
  const req = createRequire(import.meta.url);
  let pw;
  try { pw = req("playwright"); } catch { pw = req(join(execFileSync("npm", ["root", "-g"]).toString().trim(), "playwright")); }
  const { chromium, devices } = pw;
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 }], ["phone", { ...devices["iPhone 13"], viewport: { width: 320, height: 640 } }]]) {
      const ctx = await browser.newContext({ ...opts, httpCredentials: { username: "admin", password: PASS } });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(WEB + "/admin/office", { waitUntil: "networkidle" });
      assert.match(await page.locator("#of-ask").innerText(), /Senden beklenen: 1 evet/);
      assert.equal(await page.locator("#of-list [data-id]").count(), 6);
      await page.waitForSelector("#of-stage canvas", { timeout: 15000 });
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `${name}: no horizontal scroll (${overflow}px)`);
      await page.locator("#of-stage").scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(SHOTS, `office-${name}.png`) });
      await page.locator('#of-list [data-id="hauling-dev"]').click();
      assert.equal(await page.locator("#of-p-title").innerText(), "Hauling Geliştirici");
      await page.locator("#of-stage").scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(SHOTS, `office-${name}-panel.png`) });
      assert.deepEqual(errors, [], `${name}: no page errors`);
      await ctx.close();
    }
  } finally { await browser.close(); }
});
