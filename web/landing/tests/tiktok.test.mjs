// TikTok admin flow with a fake TikTok API and an in-memory D1 (node:sqlite). Run: node --test web/landing/tests/tiktok.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { handleTiktok, seal, unseal, tiktokCron } from "../src/tiktok.js";

function fakeD1(db) {
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { db.prepare(sql).run(...args); return { success: true }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => { for (const s of list) await s.run(); } };
}
function appdb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE promos (id TEXT, slug TEXT, title TEXT, description TEXT, creator_profile_id TEXT, status TEXT, live_at TEXT, lang TEXT DEFAULT 'en'); CREATE TABLE promo_hashtags (promo_id TEXT, tag TEXT, position INTEGER);
    CREATE TABLE promo_videos (promo_id TEXT, label TEXT, mp4_url TEXT, duration_ms INTEGER);
    CREATE TABLE profiles (id TEXT, handle TEXT); CREATE TABLE creator_details (profile_id TEXT, founder_owned INTEGER);
    INSERT INTO profiles VALUES ('p1','haulingempire'); INSERT INTO creator_details VALUES ('p1',1);
    INSERT INTO promos VALUES ('x1','hauling-empire-run-the-company','You run the company','Start with one van.','p1','live',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'en'); INSERT INTO promo_hashtags VALUES ('x1','tycoon',0);
    INSERT INTO promos (id,slug,title,description,creator_profile_id,status,live_at) VALUES ('x2','hauling-empire-first-truck','First truck','Get the keys.','p1','live','2026-10-02T12:00:00.000Z');
    INSERT INTO promo_videos VALUES ('x2','A','https://promovote.com/media/hauling-empire-first-truck.mp4',12000);
    INSERT INTO promo_videos VALUES ('x1','A','https://promovote.com/media/hauling-empire-run-the-company.mp4',22400);`);
  return fakeD1(db);
}

const calls = [];
let expiresIn = 7200;
globalThis.fetch = async (input, init = {}) => {
  const u = String(input);
  calls.push({ u, init });
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
  if (u.endsWith("/v2/oauth/token/")) {
    const p = new URLSearchParams(init.body);
    assert.equal(p.get("client_secret"), "sand-secret");
    if (p.get("grant_type") === "authorization_code") { assert.equal(p.get("code"), "CODE1"); assert.equal(p.get("redirect_uri"), "https://promovote.com/admin/tiktok/callback"); }
    const n = calls.filter((c) => c.u.endsWith("/token/")).length;
    return J({ access_token: `AT${n}`, expires_in: expiresIn, refresh_token: `RT${n}`, refresh_expires_in: 15552000, open_id: "o1", scope: "user.info.basic,video.upload,video.publish" });
  }
  if (u.includes("/v2/user/info/")) return J({ data: { user: { open_id: "o1", display_name: "Hauling Empire" } }, error: { code: "ok" } });
  if (u.endsWith("/creator_info/query/")) return J({ data: { creator_username: "haulingempire", privacy_level_options: ["SELF_ONLY"], comment_disabled: false, duet_disabled: true, stitch_disabled: false, max_video_post_duration_sec: 600 }, error: { code: "ok" } });
  if (u.endsWith("/inbox/video/init/") || u.endsWith("/publish/video/init/")) return J({ data: { publish_id: "pub1", upload_url: "https://upload.example/u1" }, error: { code: "ok" } });
  if (u === "https://upload.example/u1") { assert.equal(init.headers["Content-Range"], "bytes 0-9/10"); return new Response(null, { status: 201 }); }
  if (u.endsWith("/status/fetch/")) return J({ data: { status: "SEND_TO_USER_INBOX" }, error: { code: "ok" } });
  if (u.endsWith("/oauth/revoke/")) return J({});
  throw new Error("unexpected fetch " + u);
};

const env = {
  TIKTOK_SANDBOX_CLIENT_KEY: "sand-key", TIKTOK_SANDBOX_CLIENT_SECRET: "sand-secret",
  DB: fakeD1(new DatabaseSync(":memory:")), APPDB: appdb(),
  ASSETS: { fetch: async (req) => { assert.match(new URL(req.url).pathname, /^\/media\/hauling-empire-(run-the-company|first-truck)\.mp4$/); return new Response(new Uint8Array(10)); } },
};
const deps = { adminPage: (path, title, body) => new Response(body, { headers: { "Content-Type": "text/html" } }), ADMIN_HEADERS: {} };
const go = (path, init = {}) => { const url = new URL("https://promovote.com" + path); return handleTiktok(new Request(url, init), env, url, url.pathname, deps); };
const form = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

test("seal round trip and no plaintext", async () => {
  const s = await seal("k", "secret-token");
  assert.ok(!s.includes("secret-token"));
  assert.equal(await unseal("k", s), "secret-token");
});

let cookie;
test("page offers sandbox connect, connect sets state cookie and redirects to TikTok", async () => {
  assert.match(await (await go("/admin/tiktok")).text(), /connect\?mode=sandbox/);
  const r = await go("/admin/tiktok/connect?mode=sandbox");
  assert.equal(r.status, 302);
  const loc = new URL(r.headers.get("Location"));
  assert.equal(loc.origin + loc.pathname, "https://www.tiktok.com/v2/auth/authorize/");
  assert.equal(loc.searchParams.get("client_key"), "sand-key");
  assert.equal(loc.searchParams.get("scope"), "user.info.basic,video.upload,video.publish");
  cookie = r.headers.get("Set-Cookie").split(";")[0];
  assert.equal(cookie.split(".")[1], loc.searchParams.get("state"));
});

test("callback rejects a wrong state", async () => {
  const r = await go("/admin/tiktok/callback?code=CODE1&state=" + "0".repeat(48), { headers: { Cookie: cookie } });
  assert.match(r.headers.get("Location"), /err=/);
});

test("callback stores sealed tokens", async () => {
  const state = cookie.split(".")[1];
  const r = await go(`/admin/tiktok/callback?code=CODE1&state=${state}`, { headers: { Cookie: cookie } });
  assert.match(r.headers.get("Location"), /ok=connected/);
  const row = await env.DB.prepare("SELECT * FROM tiktok_auth").first();
  assert.equal(row.mode, "sandbox");
  assert.equal(row.display_name, "Hauling Empire");
  assert.ok(!row.access_enc.includes("AT1") && !row.refresh_enc.includes("RT1"));
});

test("connected page shows the post form with TikTok's privacy options", async () => {
  const html = await (await go("/admin/tiktok")).text();
  assert.match(html, /Bağlı/);
  assert.match(html, /value="SELF_ONLY"/);
  assert.match(html, /\/media\/hauling-empire-run-the-company\.mp4/);
  assert.match(html, /Duet'e izin ver \(hesapta kapalı\)/);
});

test("post needs same origin", async () => {
  const r = await go("/admin/tiktok/post", { method: "POST", body: form({ kind: "inbox", video: "/media/hauling-empire-run-the-company.mp4" }) });
  assert.equal(r.status, 403);
});

test("direct post without privacy is refused, inbox draft uploads the file", async () => {
  const bad = await go("/admin/tiktok/post", { method: "POST", headers: { Origin: "https://promovote.com" }, body: form({ kind: "direct", video: "/media/hauling-empire-run-the-company.mp4" }) });
  assert.match(bad.headers.get("Location"), /err=/);
  const r = await go("/admin/tiktok/post", { method: "POST", headers: { Origin: "https://promovote.com" }, body: form({ kind: "inbox", video: "/media/hauling-empire-run-the-company.mp4", caption: "Hi" }) });
  assert.match(r.headers.get("Location"), /ok=inbox/);
  assert.ok(calls.some((c) => c.u === "https://upload.example/u1"));
  const p = await env.DB.prepare("SELECT * FROM tiktok_posts WHERE publish_id = 'pub1'").first();
  assert.equal(p.status, "PROCESSING_UPLOAD");
  await go("/admin/tiktok");
  assert.equal((await env.DB.prepare("SELECT status FROM tiktok_posts WHERE publish_id = 'pub1'").first()).status, "SEND_TO_USER_INBOX");
});

test("bulk button sends this week's unsent videos once", async () => {
  await env.DB.prepare("DELETE FROM tiktok_posts").run();
  const html = await (await go("/admin/tiktok")).text();
  assert.match(html, /Hepsini TikTok'a gönder/);
  assert.match(html, /You run the company\. Start with one van\. #tycoon/);
  const r = await go("/admin/tiktok/bulk", { method: "POST", headers: { Origin: "https://promovote.com" } });
  assert.match(r.headers.get("Location"), /ok=bulk&n=1/);
  const again = await go("/admin/tiktok/bulk", { method: "POST", headers: { Origin: "https://promovote.com" } });
  assert.match(again.headers.get("Location"), /err=/);
  assert.equal((await env.DB.prepare("SELECT caption FROM tiktok_posts").first()).caption, "You run the company. Start with one van. #tycoon");
});

test("unknown video is refused", async () => {
  const r = await go("/admin/tiktok/post", { method: "POST", headers: { Origin: "https://promovote.com" }, body: form({ kind: "inbox", video: "/media/../secret.mp4" }) });
  assert.match(r.headers.get("Location"), /err=/);
});

test("expired access token is refreshed", async () => {
  await env.DB.prepare("UPDATE tiktok_auth SET access_expires_at = 0").run();
  const before = calls.filter((c) => c.u.endsWith("/token/")).length;
  await go("/admin/tiktok");
  const t = calls.filter((c) => c.u.endsWith("/token/"));
  assert.equal(t.length, before + 1);
  assert.equal(new URLSearchParams(t.at(-1).init.body).get("grant_type"), "refresh_token");
  assert.ok((await env.DB.prepare("SELECT access_expires_at FROM tiktok_auth").first()).access_expires_at > Date.now());
});

test("daily job sends unsent older promos as drafts, once", async () => {
  await tiktokCron(env);
  const rows = (await env.DB.prepare("SELECT video_path FROM tiktok_posts WHERE status IS NOT 'FAILED'").all()).results.map((r) => r.video_path);
  assert.ok(rows.includes("/media/hauling-empire-first-truck.mp4"));
  const n = rows.length;
  await tiktokCron(env);
  assert.equal((await env.DB.prepare("SELECT COUNT(*) AS n FROM tiktok_posts WHERE status IS NOT 'FAILED'").first()).n, n);
});

test("disconnect revokes and deletes", async () => {
  const r = await go("/admin/tiktok/disconnect", { method: "POST", headers: { Origin: "https://promovote.com" } });
  assert.match(r.headers.get("Location"), /ok=disconnected/);
  assert.ok(calls.some((c) => c.u.endsWith("/oauth/revoke/")));
  assert.equal(await env.DB.prepare("SELECT * FROM tiktok_auth").first(), null);
});
