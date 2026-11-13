// Office page tests (2026-11-12). Run from the repo root: node --test web/landing/tests/office.test.mjs
// Starts promovote-api and the landing Worker locally (wrangler dev) on shared local D1 (promovote-db and office-db),
// applies the migrations
// and writes test rows the way the CEO session will (direct SQL), then checks: no write endpoint exists, the data
// is readable only with the admin token (API) and the admin login (site), the table rules hold, and the page shows
// the list, the 3D canvas and the side panel. Saves phone and desktop screenshots. Never touches the live database.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const ROOT = resolve(import.meta.dirname, "../../..");
const API_DIR = join(ROOT, "services/api");
const WEB_DIR = join(ROOT, "web/landing");
const STATE = mkdtempSync(join(tmpdir(), "office-d1-"));
const SHOTS = process.env.OFFICE_SHOTS || join(ROOT, "docs/office-screenshots");
const TOKEN = randomBytes(24).toString("hex"); // test only, never a real secret
const PASS = "test-only-admin-pass";
const API = "http://127.0.0.1:8791", WEB = "http://127.0.0.1:8792";
const AUTH = "Basic " + Buffer.from("admin:" + PASS).toString("base64");
const ENV = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" };
const procs = [];
// The test swaps the real OFFICE_DB line for a local only id in a throwaway config next to it (gitignored).
const TEST_CFG = join(API_DIR, "wrangler.office-test.jsonc");
const OFFICE_LINE = '{ "binding": "OFFICE_DB", "database_name": "office-db", "database_id": "00000000-0000-4000-8000-0000000000aa", "migrations_dir": "office-migrations" },';

function startWorker(dir, port, vars, cfg) {
  const args = ["wrangler", "dev", ...(cfg ? ["-c", cfg] : []), "--local", "--ip", "127.0.0.1", "--port", String(port), "--persist-to", STATE, "--inspector-port", "0"];
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
const d1 = (db, command) => spawnSync("npx", ["wrangler", "d1", "execute", db, "-c", TEST_CFG, "--local", "--persist-to", STATE, "--json", "--command", command], { cwd: API_DIR, env: ENV, encoding: "utf8" });
const sql = (command) => d1("office-db", command);
// The local dev server can close a kept alive socket between requests ("other side closed"); try once more then.
const get = async (url, opts) => { try { return await fetch(url, opts); } catch { return fetch(url, opts); } };
const q = (s) => (s === null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

// A copy of the live 52 rows (read only, 2026-11-13), with one person set to "blocked" so that state is tested too.
const AGENTS = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures/office-agents-52.json"), "utf8"))
  .map((a) => (a[0] === "dropolis-qa" ? [a[0], a[1], "blocked", "Örnek: test cihazı takıldı", null] : a));
const WAITING = AGENTS.filter((a) => a[2] === "waiting_owner" || a[4]).length;
const MAIL = [
  ["11111111-1111-4111-8111-111111111111", "ceo", "promovote-dev", "Ofis v3 görevi"],
  ["22222222-2222-4222-8222-222222222222", "analyst", "hauling-dev", "Haftalık rapor"],
];

before(async () => {
  // Local only: point OFFICE_DB at a throwaway id so the test never needs the live database.
  const base = readFileSync(join(API_DIR, "wrangler.jsonc"), "utf8").replace(/^\s*\{ "binding": "OFFICE_DB".*$/m, "");
  const cfg = base.replace('"d1_databases": [', '"d1_databases": [\n    ' + OFFICE_LINE);
  writeFileSync(TEST_CFG, cfg);
  for (const db of ["promovote-db", "office-db"]) execFileSync("npx", ["wrangler", "d1", "migrations", "apply", db, "-c", TEST_CFG, "--local", "--persist-to", STATE], { cwd: API_DIR, stdio: "ignore", env: ENV });
  // The CEO session writes like this (direct SQL through the D1 tool).
  const r = sql("insert into office_agents (id, role, status, last_action, needs_owner) values " + AGENTS.map((a) => `(${a.map(q).join(", ")})`).join(", "));
  assert.equal(r.status, 0, r.stderr);
  const m = sql("insert into office_mail (id, from_id, to_id, label) values " + MAIL.map((x) => `(${x.map(q).join(", ")})`).join(", "));
  assert.equal(m.status, 0, m.stderr);
  await Promise.all([
    startWorker(API_DIR, 8791, { ADMIN_API_TOKEN: TOKEN }, TEST_CFG),
    startWorker(WEB_DIR, 8792, { ADMIN_PASSWORD: PASS, ADMIN_API_TOKEN: TOKEN, API_BASE_URL: API }),
  ]);
});
// Kill the whole process group (npx, wrangler and workerd), or node --test waits for them forever.
after(() => {
  for (const p of procs) { try { process.kill(-p.pid, "SIGTERM"); } catch { /* already gone */ } }
  rmSync(TEST_CFG, { force: true });
});

test("promovote-db has nothing of the office", () => {
  const r = d1("promovote-db", "select name from sqlite_master where name like 'office%'");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout)[0].results, []);
  const m = d1("office-db", "select name from sqlite_master where type = 'table' and name like 'office%' order by name");
  assert.deepEqual(JSON.parse(m.stdout)[0].results.map((x) => x.name), ["office_agents", "office_mail", "office_notes"]);
});

test("no write endpoint: anon cannot write through the API", async () => {
  const r = await fetch(API + "/v1/office/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "x", role: "x", status: "working" }) });
  assert.equal(r.status, 404);
  const r2 = await fetch(API + "/v1/admin/office", { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Token": TOKEN }, body: "{}" });
  assert.equal(r2.status, 404);
});

test("table rules refuse bad rows", () => {
  assert.notEqual(sql("insert into office_mail (id, from_id, to_id, label) values ('33333333-3333-4333-8333-333333333333', 'ceo', 'analyst', '')").status, 0);
  assert.notEqual(sql(`insert into office_mail (id, from_id, to_id, label) values ('44444444-4444-4444-8444-444444444444', 'ceo', 'analyst', '${"a".repeat(61)}')`).status, 0);
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
  assert.equal(j.agents.length, AGENTS.length);
  assert.equal(j.agents[0].id, "ceo");
  assert.deepEqual(j.mail.map((x) => x.id).sort(), MAIL.map((x) => x[0]).sort());
});

test("mail older than 10 minutes is not read", async () => {
  assert.equal(sql("insert into office_mail (id, from_id, to_id, label, created_at) values ('55555555-5555-4555-8555-555555555555', 'ceo', 'analyst', 'Eski', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-11 minutes'))").status, 0);
  const j = await (await get(API + "/v1/admin/office", { headers: { "X-Admin-Token": TOKEN } })).json();
  assert.ok(!j.mail.some((x) => x.id.startsWith("5555")));
});

test("note to the CEO: API needs the token and checks the length", async () => {
  const post = (body, token) => get(API + "/v1/admin/office/notes", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { "X-Admin-Token": token } : {}) }, body: JSON.stringify(body) });
  assert.equal((await post({ text: "merhaba" })).status, 401);
  assert.equal((await post({ text: "merhaba" }, "y".repeat(TOKEN.length))).status, 401);
  assert.equal((await post({ text: "" }, TOKEN)).status, 400);
  assert.equal((await post({ text: "a".repeat(1001) }, TOKEN)).status, 400);
  assert.equal((await post({ text: 5 }, TOKEN)).status, 400);
  const ok = await post({ text: "API notu" }, TOKEN);
  assert.equal(ok.status, 201);
  const row = JSON.parse(sql("select text, status from office_notes where text = 'API notu'").stdout)[0].results;
  assert.deepEqual(row, [{ text: "API notu", status: "new" }]);
});

test("note to the CEO: site needs the login and the same origin", async () => {
  const post = (headers, body = JSON.stringify({ text: "Site notu" })) => get(WEB + "/admin/office/note", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
  assert.equal((await post({ Origin: WEB })).status, 401);
  assert.equal((await post({ Origin: WEB, Authorization: "Basic " + Buffer.from("admin:wrong").toString("base64") })).status, 401);
  assert.equal((await post({ Origin: "https://evil.example", Authorization: AUTH })).status, 403);
  assert.equal((await post({ Authorization: AUTH })).status, 403);
  assert.equal((await post({ Origin: WEB, Authorization: AUTH, "Content-Type": "text/plain" })).status, 415);
  assert.equal((await post({ Origin: WEB, Authorization: AUTH }, JSON.stringify({ text: "b".repeat(1001) }))).status, 400);
  assert.equal((await get(WEB + "/admin/office/note", { headers: { Authorization: AUTH } })).status, 405);
  const ok = await post({ Origin: WEB, Authorization: AUTH });
  assert.equal(ok.status, 200);
  const row = JSON.parse(sql("select status from office_notes where text = 'Site notu'").stdout)[0].results;
  assert.deepEqual(row, [{ status: "new" }]);
});

test("site read needs the admin login", async () => {
  assert.equal((await get(WEB + "/admin/office.json")).status, 401);
  assert.equal((await get(WEB + "/admin/office.json", { headers: { Authorization: "Basic " + Buffer.from("admin:wrong").toString("base64") } })).status, 401);
  const r = await get(WEB + "/admin/office.json", { headers: { Authorization: AUTH } });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).agents.length, AGENTS.length);
});

test("page renders list, 3D office, mail walk, panel and note; screenshots", { timeout: 240000 }, async () => {
  const req = createRequire(import.meta.url);
  let pw;
  try { pw = req("playwright"); } catch { pw = req(join(execFileSync("npm", ["root", "-g"]).toString().trim(), "playwright")); }
  const { chromium, devices } = pw;
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 }], ["phone", { ...devices["iPhone 13"], viewport: { width: 320, height: 640 } }]]) {
      const ctx = await browser.newContext({ ...opts, httpCredentials: { username: "admin", password: PASS } });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(WEB + "/admin/office", { waitUntil: "networkidle" });
      assert.match(await page.locator("#of-ask").innerText(), new RegExp(`Senden beklenen: ${WAITING} evet`));
      assert.equal(await page.locator("#of-list [data-id]").count(), AGENTS.length);
      await page.waitForSelector('#of-stage[data-ready="1"] canvas', { timeout: 60000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `${name}: no horizontal scroll (${overflow}px)`);
      // Labels: every department, name bubbles for all 9, "!" for the waiting one, "takıldı" for the blocked one.
      const depts = await page.locator(".of-dept").allInnerTexts();
      for (const d of ["HAULING EMPIRE", "DROPOLIS", "PROMOVOTE", "DOVELET", "ORTAK BİRİMLER", "GENEL MÜDÜR", "SALESFORCE", "DOPAZON", "MAĞAZA VE BÜYÜME", "SOSYAL MEDYA", "TEST PANELİ", "BOŞ ODA"]) assert.ok(depts.includes(d), `${name}: label ${d}`);
      assert.equal(await page.locator(".of-name").count(), AGENTS.length);
      assert.equal(await page.locator(".of-name b").count(), 1);
      assert.equal(await page.locator(".of-name em").innerText(), "takıldı");
      await page.locator("#of-stage").scrollIntoViewIfNeeded();
      if (name === "desktop") {
        // The first mail is walking now.
        await page.waitForTimeout(1200);
        await page.screenshot({ path: join(SHOTS, `office-${name}-mail.png`) });
        await page.waitForSelector(".of-pop", { timeout: 15000 });
        assert.match(await page.locator(".of-pop").first().innerText(), /Yeni posta: /);
      }
      // Both mails play once, one after the other, then the browser remembers them.
      await page.waitForFunction(() => { try { return JSON.parse(localStorage.getItem("office-mail-shown") || "[]").length >= 2; } catch { return false; } }, null, { timeout: 30000 });
      await page.waitForTimeout(7000);
      await page.screenshot({ path: join(SHOTS, `office-${name}.png`) });
      // No department label or name bubble covers another one (founder 2026-11-13).
      const overlaps = await page.evaluate(() => {
        const st = document.getElementById("of-stage").getBoundingClientRect();
        const els = [...document.querySelectorAll("#of-tags .of-dept, #of-tags .of-name")].filter((e) => getComputedStyle(e).display !== "none");
        const boxes = els.map((e) => ({ t: e.textContent, r: e.getBoundingClientRect() }))
          .filter(({ r }) => r.right > st.left && r.left < st.right && r.bottom > st.top && r.top < st.bottom);
        const bad = [];
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].r, b = boxes[j].r;
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) bad.push(boxes[i].t + " / " + boxes[j].t);
        }
        const names = els.filter((e) => e.classList.contains("of-name"));
        return { n: boxes.length, bad, names: names.length, mini: names.filter((e) => e.classList.contains("mini")).length,
          activeHidden: [...document.querySelectorAll("#of-tags .of-name:not(.quiet)")].filter((e) => getComputedStyle(e).display === "none" || e.classList.contains("mini")).map((e) => e.textContent) };
      });
      assert.ok(overlaps.n >= 8, `${name}: labels on screen (${overlaps.n})`);
      assert.deepEqual(overlaps.bad, [], `${name}: no overlapping labels`);
      console.log(`# ${name}: ${overlaps.names} bubbles on screen, ${overlaps.mini} as dots, active not full: ${JSON.stringify(overlaps.activeHidden)}`);
      if (name === "desktop") {
        // At desktop every person in view gets a bubble (a name, or at least a status dot), none is dropped for space.
        assert.equal(await page.locator("#of-tags .of-name.nospot").count(), 0, "desktop: no bubble dropped for lack of space");
        assert.ok(overlaps.names >= AGENTS.length - 2, `desktop: bubbles on screen (${overlaps.names})`);
      }
      await page.screenshot({ path: join(SHOTS, `office-${name}.png`) });
      await page.locator('#of-list [data-id="hauling-dev"]').click();
      assert.match(await page.locator("#of-p-title").innerText(), /^Hauling Lider Geliştirici\s*Opus$/);
      assert.equal(await page.locator("#of-p-title .of-model").innerText(), "Opus");
      assert.match(await page.locator("#of-p-body").innerText(), /HAULING EMPIRE[\s\S]*Çalışıyor[\s\S]*EKIP-PLANI[\s\S]*New York/);
      await page.locator("#of-stage").scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(SHOTS, `office-${name}-panel.png`) });
      if (name === "desktop") {
        await page.fill("#of-note-text", "Tarayıcıdan not");
        await page.click("#of-note button");
        await page.waitForFunction(() => /bırakıldı/.test(document.getElementById("of-note-msg").textContent), null, { timeout: 10000 });
        const row = JSON.parse(sql("select status from office_notes where text = 'Tarayıcıdan not'").stdout)[0].results;
        assert.deepEqual(row, [{ status: "new" }]);
      }
      assert.deepEqual(errors, [], `${name}: no page errors`);
      await ctx.close();
    }
  } finally { await browser.close(); }
});
