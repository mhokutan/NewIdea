// Dropolis game API (Cloudflare Worker + D1 + one Durable Object). No framework, no dependencies.
// Auth: every player starts as a guest (bearer token). Apple (iOS) and Google (Android) sign in verify the ID token
// against the providers' public keys and link it to the guest account, so progress is never lost. No secrets needed:
// audiences (bundle id, client ids) are public vars. Tokens are random and stored only as SHA-256 hashes.

const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const BOARDS = ["city_level", "deliveries", "colonists"];
const MAX_SAVE = 128 * 1024;
const MAX_EVENTS = 200;
const MAX_BATCH = 64 * 1024;
// Friend invites (founder approved 2026-11-04): codes use A-Z and 2-9 without 0 O 1 I.
const CODE_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REDEEM_GEMS = 10, INVITE_COINS = 500, INVITE_GEMS = 20, INVITE_CAP = 50, REDEEM_DAYS = 7;
const INVITE_HOST = "dropolis.promovote.com";
const PLAY_URL = "https://play.google.com/store/apps/details?id=com.promovote.dropolis";
const APPSTORE_URL = "https://apps.apple.com/app/id6829947695";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS } });
const fail = (status, code, message) => json({ error: { code, message } }, status);

// Monday (UTC) of the current week, the key of weekly leaderboards.
function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
async function sha256(text) { return b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))); }
async function sha256hex(text) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, "0")).join(""); }

async function body(req, max = MAX_SAVE + 4096) {
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > max) throw Object.assign(new Error("too_large"), { status: 413 });
  const text = await req.text();
  if (text.length > max) throw Object.assign(new Error("too_large"), { status: 413 });
  try { return text ? JSON.parse(text) : {}; } catch { throw Object.assign(new Error("bad_json"), { status: 400 }); }
}

// ---------- sessions ----------
async function newSession(db, userId) {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  await db.prepare("insert into sessions (token_hash, user_id, created_at) values (?, ?, ?)").bind(await sha256(token), userId, now()).run();
  return token;
}
async function currentUser(req, env) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.get("Authorization") || "");
  if (!m) return null;
  const row = await env.DB.prepare("select u.* from sessions s join users u on u.id = s.user_id where s.token_hash = ?").bind(await sha256(m[1])).first();
  if (!row) return null;
  // One activity row and one last_seen update per player per day (DAU, MAU, retention) instead of a write per call.
  const day = today();
  if (String(row.last_seen).slice(0, 10) !== day) {
    await env.DB.batch([
      env.DB.prepare("insert or ignore into daily_active (user_id, day) values (?, ?)").bind(row.id, day),
      env.DB.prepare("update users set last_seen = ? where id = ?").bind(now(), row.id),
    ]);
  }
  return row;
}
const publicUser = (u, linked = []) => ({ id: u.id, name: u.name, avatar: u.avatar, country: u.country, createdAt: u.created_at, linked });
async function linkedOf(db, userId) {
  const { results } = await db.prepare("select provider from identities where user_id = ?").bind(userId).all();
  return results.map((r) => r.provider);
}
async function createUser(db, deviceId, country) {
  const id = crypto.randomUUID(), t = now();
  await db.batch([
    db.prepare("insert into users (id, device_id, name, avatar, country, created_at, last_seen) values (?, ?, null, null, ?, ?, ?)").bind(id, deviceId, country, t, t),
    db.prepare("insert or ignore into daily_active (user_id, day) values (?, ?)").bind(id, t.slice(0, 10)),
  ]);
  return { id, device_id: deviceId, name: null, avatar: null, country, created_at: t, last_seen: t };
}

// ---------- ID tokens (Apple, Google) ----------
const JWKS = { apple: "https://appleid.apple.com/auth/keys", google: "https://www.googleapis.com/oauth2/v3/certs" };
const ISS = { apple: ["https://appleid.apple.com"], google: ["https://accounts.google.com", "accounts.google.com"] };
async function verifyIdToken(provider, idToken, audiences, nonce) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("bad_token");
  let header, claims;
  try {
    header = JSON.parse(new TextDecoder().decode(fromB64url(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
  } catch { throw new Error("bad_token"); }
  if (header.alg !== "RS256") throw new Error("bad_alg");
  const res = await fetch(JWKS[provider], { cf: { cacheTtl: 3600, cacheEverything: true } });
  const { keys } = await res.json();
  const jwk = (keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("unknown_key");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, fromB64url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new Error("bad_signature");
  const t = Date.now() / 1000;
  if (!ISS[provider].includes(claims.iss)) throw new Error("bad_issuer");
  if (!(claims.exp > t - 60)) throw new Error("expired");
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.some((a) => audiences.includes(a))) throw new Error("bad_audience");
  // Apple puts SHA-256(nonce) in the token when the app sent one; Google puts the nonce itself.
  if (claims.nonce && nonce && claims.nonce !== nonce && claims.nonce !== await sha256hex(nonce)) throw new Error("bad_nonce");
  if (!claims.sub) throw new Error("no_subject");
  return claims;
}

async function signIn(req, env, provider) {
  const b = await body(req, 16 * 1024);
  const audiences = String(provider === "apple" ? env.APPLE_AUDIENCES : env.GOOGLE_CLIENT_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!audiences.length) return fail(503, "not_configured", `${provider} sign in is not configured yet.`);
  let claims;
  try { claims = await verifyIdToken(provider, b.idToken, audiences, b.nonce); }
  catch (e) { return fail(401, "invalid_token", e.message); }
  const db = env.DB;
  const me = await currentUser(req, env);
  const known = await db.prepare("select user_id from identities where provider = ? and subject = ?").bind(provider, claims.sub).first();
  let user, switched = false, token = null;
  if (known) {
    // This Apple / Google account already has a player: sign in to it. A different guest on this phone stays as it was.
    user = await db.prepare("select * from users where id = ?").bind(known.user_id).first();
    switched = !!me && me.id !== user.id;
    if (!me || switched) token = await newSession(db, user.id);
  } else {
    user = me || await createUser(db, b.deviceId ? String(b.deviceId).slice(0, 100) : null, countryOf(req));
    if (!me) token = await newSession(db, user.id);
    await db.prepare("insert into identities (provider, subject, user_id, email, created_at) values (?, ?, ?, ?, ?)")
      .bind(provider, claims.sub, user.id, claims.email ? String(claims.email).slice(0, 200) : null, now()).run();
  }
  return json({ token, user: publicUser(user, await linkedOf(db, user.id)), switched });
}

const countryOf = (req) => (req.cf && typeof req.cf.country === "string" && /^[A-Z]{2}$/.test(req.cf.country) ? req.cf.country : null);
const cleanName = (s) => String(s ?? "").normalize("NFKC").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 24);

// ---------- invite helpers ----------
const isNew = (u) => Date.now() - new Date(u.created_at).getTime() < REDEEM_DAYS * 864e5;
async function deviceRedeemed(db, deviceId) {
  if (!deviceId) return false;
  return !!await db.prepare("select 1 as x from referral_devices where device_hash = ?").bind(await sha256(`dropolis-device:${deviceId}`)).first();
}
async function ensureCode(db, userId) {
  const row = await db.prepare("select code from referral_codes where user_id = ?").bind(userId).first();
  if (row) return row.code;
  for (let i = 0; i < 6; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(7));
    const code = [...bytes].map((b) => CODE_ABC[b % CODE_ABC.length]).join("");
    const r = await db.prepare("insert or ignore into referral_codes (user_id, code, created_at) values (?, ?, ?)").bind(userId, code, now()).run();
    if (r.meta.changes === 1) return code;
    const again = await db.prepare("select code from referral_codes where user_id = ?").bind(userId).first();
    if (again) return again.code;
  }
  throw new Error("code_generation_failed");
}
// Server side analytics event in the same batch table the game uses.
const serverEvent = (db, userId, name, props) => db.prepare("insert into event_batches (user_id, day, received_at, payload) values (?, ?, ?, ?)")
  .bind(userId, today(), now(), JSON.stringify([{ name, at: now(), props: { ...props, source: "server" } }]));

// Invite landing page (dropolis.promovote.com/i/<code>): the code and both store buttons. Play gets the code as the
// install referrer, so the game can fill it in after install.
function invitePage(code) {
  const c = /^[A-Z2-9]{6,8}$/.test(code) ? code : "";
  const play = `${PLAY_URL}${c ? `&referrer=${encodeURIComponent(`code=${c}`)}` : ""}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Join me in Dropolis</title><meta name="description" content="Build a city, then a colony on Mars. Use my invite code for 10 free gems.">
<meta property="og:title" content="Join me in Dropolis"><meta property="og:description" content="Build a city, then a colony on Mars. Use my invite code for 10 free gems.">
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0b0d14;color:#f5f5f7;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:420px;padding:32px 20px;text-align:center}h1{font-size:32px;margin:0 0 8px}p{color:#b0b3c0;margin:0 0 20px}
.code{display:inline-block;margin:6px 0 22px;padding:14px 22px;border-radius:14px;background:#171a26;border:1px solid #2a2e3f;font:700 30px ui-monospace,Menlo,monospace;letter-spacing:4px}
.btns{display:grid;gap:10px}a.btn,button{display:block;padding:14px 18px;border-radius:12px;font-weight:700;text-decoration:none;border:0;font-size:16px;cursor:pointer}
.btn.apple{background:#f5f5f7;color:#0b0d14}.btn.play{background:#ffd60a;color:#0b0d14}button{background:transparent;color:#b0b3c0;border:1px solid #2a2e3f}
small{display:block;margin-top:22px;color:#6f7385}small a{color:#b0b3c0}</style></head><body><main>
<h1>Join me in Dropolis</h1><p>Build a city, then a colony on Mars. Install the game and enter my code in Friends to get 10 free gems.</p>
${c ? `<div class="code" id="c">${c}</div>` : ""}
<div class="btns"><a class="btn apple" href="${APPSTORE_URL}">Download on the App Store</a><a class="btn play" href="${play}">Get it on Google Play</a>
${c ? `<button onclick="navigator.clipboard&&navigator.clipboard.writeText('${c}').then(()=>this.textContent='Code copied')">Copy code</button>` : ""}</div>
<small>Codes work in a player's first ${REDEEM_DAYS} days. <a href="https://promovote.com/dropolis/privacy">Privacy</a></small></main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}

// ---------- routes ----------
async function route(req, env, url) {
  const p = url.pathname, m = req.method, db = env.DB;

  if (url.hostname === INVITE_HOST) {
    const mm = /^\/i\/([A-Za-z0-9]{1,12})\/?$/.exec(p);
    return invitePage(mm ? mm[1].toUpperCase() : "");
  }
  if (p === "/health") return json({ ok: true, time: now() });

  // Public: players online now (seen in the last 6 minutes). Used by the PromoVote admin panel.
  if (p === "/v1/online" && m === "GET") {
    const r = await env.PRESENCE.get(env.PRESENCE.idFromName("global")).fetch("https://presence/count");
    return json(await r.json());
  }

  if (p === "/v1/auth/guest" && m === "POST") {
    const b = await body(req, 4096);
    const deviceId = b.deviceId ? String(b.deviceId).slice(0, 100) : null;
    // Reinstall on the same phone: give the old guest back if it never linked Apple / Google.
    let user = deviceId ? await db.prepare("select u.* from users u where u.device_id = ? and not exists (select 1 from identities i where i.user_id = u.id) order by u.created_at desc limit 1").bind(deviceId).first() : null;
    if (!user) user = await createUser(db, deviceId, countryOf(req));
    return json({ token: await newSession(db, user.id), user: publicUser(user, []) });
  }
  if (p === "/v1/auth/apple" && m === "POST") return signIn(req, env, "apple");
  if (p === "/v1/auth/google" && m === "POST") return signIn(req, env, "google");

  // Everything below needs a player token.
  const me = await currentUser(req, env);
  if (!me) return fail(401, "unauthorized", "Sign in as a guest first (POST /v1/auth/guest).");

  if (p === "/v1/me" && m === "GET") return json({ user: publicUser(me, await linkedOf(db, me.id)) });
  if (p === "/v1/me" && m === "PATCH") {
    const b = await body(req, 4096);
    const name = b.name !== undefined ? cleanName(b.name) || null : me.name;
    const avatar = b.avatar !== undefined ? (String(b.avatar).match(/^[a-z0-9_-]{1,40}$/) || [null])[0] : me.avatar;
    const country = b.country !== undefined ? (/^[A-Z]{2}$/.test(String(b.country)) ? String(b.country) : null) : me.country;
    await db.prepare("update users set name = ?, avatar = ?, country = ? where id = ?").bind(name, avatar, country, me.id).run();
    return json({ user: publicUser({ ...me, name, avatar, country }, await linkedOf(db, me.id)) });
  }
  // Account deletion (App Store rule 5.1.1(v)): the player, the save, scores, events and sessions are gone at once.
  if (p === "/v1/me" && m === "DELETE") {
    await db.batch([
      db.prepare("delete from event_batches where user_id = ?").bind(me.id),
      db.prepare("delete from scores where user_id = ?").bind(me.id),
      db.prepare("delete from saves where user_id = ?").bind(me.id),
      db.prepare("delete from daily_active where user_id = ?").bind(me.id),
      db.prepare("delete from identities where user_id = ?").bind(me.id),
      db.prepare("delete from sessions where user_id = ?").bind(me.id),
      db.prepare("delete from users where id = ?").bind(me.id),
      db.prepare("insert into deletion_log (day, count) values (?, 1) on conflict (day) do update set count = count + 1").bind(today()),
    ]);
    return json({ deleted: true });
  }
  if (p === "/v1/auth/logout" && m === "POST") {
    const t = /^Bearer\s+(\S+)$/.exec(req.headers.get("Authorization") || "")[1];
    await db.prepare("delete from sessions where token_hash = ?").bind(await sha256(t)).run();
    return json({ ok: true });
  }

  // Cloud save: one per player. version must match the server's, so two phones never overwrite each other silently.
  if (p === "/v1/save" && m === "GET") {
    const s = await db.prepare("select data, version, updated_at from saves where user_id = ?").bind(me.id).first();
    return json(s ? { data: JSON.parse(s.data), version: s.version, updatedAt: s.updated_at } : { data: null, version: 0, updatedAt: null });
  }
  if (p === "/v1/save" && m === "PUT") {
    const b = await body(req);
    const data = JSON.stringify(b.data ?? null);
    if (b.data == null) return fail(400, "no_data", "data is required.");
    if (data.length > MAX_SAVE) return fail(413, "too_large", "Save is larger than 128 KB.");
    const cur = await db.prepare("select data, version, updated_at from saves where user_id = ?").bind(me.id).first();
    const curVersion = cur ? cur.version : 0;
    if (Number(b.version) !== curVersion && !b.force) {
      return json({ error: { code: "version_conflict", message: "The server has a newer save." }, server: cur ? { data: JSON.parse(cur.data), version: cur.version, updatedAt: cur.updated_at } : null }, 409);
    }
    const next = curVersion + 1, t = now();
    await db.prepare("insert into saves (user_id, data, version, updated_at) values (?, ?, ?, ?) on conflict (user_id) do update set data = excluded.data, version = excluded.version, updated_at = excluded.updated_at")
      .bind(me.id, data, next, t).run();
    return json({ version: next, updatedAt: t });
  }

  // Scores: the best value is kept for all time and for the current week.
  if (p === "/v1/scores" && m === "POST") {
    const b = await body(req, 4096);
    const items = Array.isArray(b.scores) ? b.scores : [{ board: b.board, value: b.value }];
    const wk = weekKey(), t = now(), stmts = [];
    for (const it of items.slice(0, 3)) {
      const v = Math.floor(Number(it.value));
      if (!BOARDS.includes(it.board) || !Number.isFinite(v) || v < 0 || v > 1e9) return fail(400, "bad_score", "board must be city_level, deliveries or colonists; value 0 to 1e9.");
      for (const period of ["all", wk]) {
        stmts.push(db.prepare("insert into scores (user_id, board, period, value, updated_at) values (?, ?, ?, ?, ?) on conflict (user_id, board, period) do update set value = max(scores.value, excluded.value), updated_at = case when excluded.value > scores.value then excluded.updated_at else scores.updated_at end")
          .bind(me.id, it.board, period, v, t));
      }
    }
    if (stmts.length) await db.batch(stmts);
    return json({ ok: true, week: wk });
  }
  let lb;
  if ((lb = /^\/v1\/leaderboard\/(city_level|deliveries|colonists)$/.exec(p)) && m === "GET") {
    const period = url.searchParams.get("period") === "week" ? weekKey() : "all";
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const { results } = await db.prepare("select s.value, u.id, u.name, u.avatar, u.country from scores s join users u on u.id = s.user_id where s.board = ? and s.period = ? order by s.value desc, s.updated_at asc limit ?").bind(lb[1], period, limit).all();
    const mine = await db.prepare("select value from scores where user_id = ? and board = ? and period = ?").bind(me.id, lb[1], period).first();
    const rank = mine ? (await db.prepare("select count(*) as n from scores where board = ? and period = ? and value > ?").bind(lb[1], period, mine.value).first()).n + 1 : null;
    return json({ board: lb[1], period: period === "all" ? "all" : "week", week: period === "all" ? null : period,
      top: results.map((r, i) => ({ rank: i + 1, value: r.value, name: r.name || "Player", avatar: r.avatar, country: r.country, me: r.id === me.id })),
      me: mine ? { rank, value: mine.value } : null });
  }

  // Behaviour events, batched on the phone: one D1 row per batch.
  if (p === "/v1/events" && m === "POST") {
    const b = await body(req, MAX_BATCH + 1024);
    const list = Array.isArray(b.events) ? b.events.slice(0, MAX_EVENTS) : [];
    const clean = list.filter((e) => e && /^[a-z][a-z0-9_]{1,40}$/.test(e.name || "")).map((e) => ({
      name: e.name, at: typeof e.at === "string" ? e.at.slice(0, 30) : now(),
      ...(e.props && typeof e.props === "object" ? { props: e.props } : {}),
    }));
    if (!clean.length) return json({ ok: true, stored: 0 });
    const payload = JSON.stringify(clean);
    if (payload.length > MAX_BATCH) return fail(413, "too_large", "Event batch is larger than 64 KB.");
    await db.prepare("insert into event_batches (user_id, day, received_at, payload) values (?, ?, ?, ?)").bind(me.id, today(), now(), payload).run();
    return json({ ok: true, stored: clean.length });
  }

  // ---------- friend invites ----------
  if (p === "/v1/referral" && m === "GET") {
    const code = await ensureCode(db, me.id);
    const [inv, pend, redeemed] = await db.batch([
      db.prepare("select count(*) as n from referrals where inviter_id = ?").bind(me.id),
      db.prepare("select r.id, r.coins, r.gems, u.name from referral_rewards r left join users u on u.id = r.invitee_id where r.inviter_id = ? and r.claimed_at is null order by r.created_at").bind(me.id),
      db.prepare("select 1 as x from referral_ledger where user_id = ? and kind = 'redeem_bonus' limit 1").bind(me.id),
    ]);
    const deviceUsed = await deviceRedeemed(db, me.device_id);
    return json({
      code, link: `https://${INVITE_HOST}/i/${code}`, invited: inv.results[0].n,
      canRedeem: !redeemed.results.length && !deviceUsed && isNew(me),
      pending: pend.results.map((r) => ({ id: r.id, friendName: r.name || "Friend", coins: r.coins, gems: r.gems })),
    });
  }
  if (p === "/v1/referral/redeem" && m === "POST") {
    const b = await body(req, 4096);
    const code = String(b.code || "").trim().toUpperCase();
    const owner = /^[A-Z2-9]{6,8}$/.test(code) ? await db.prepare("select user_id from referral_codes where code = ?").bind(code).first() : null;
    if (!owner) return fail(404, "unknown_code", "This invite code does not exist.");
    if (owner.user_id === me.id) return fail(400, "own_code", "You cannot use your own code.");
    if (await db.prepare("select 1 as x from referral_ledger where user_id = ? and kind = 'redeem_bonus' limit 1").bind(me.id).first()
      || await db.prepare("select 1 as x from referrals where invitee_id = ?").bind(me.id).first()) return fail(409, "already_redeemed", "You already used an invite code.");
    if (!isNew(me)) return fail(403, "too_old", `Invite codes work in the first ${REDEEM_DAYS} days only.`);
    const device = me.device_id || (b.deviceId ? String(b.deviceId).slice(0, 100) : null);
    if (!device) return fail(400, "device_required", "deviceId is required.");
    const deviceHash = await sha256(`dropolis-device:${device}`);
    if (await db.prepare("select 1 as x from referral_devices where device_hash = ?").bind(deviceHash).first()) return fail(409, "device_used", "An invite code was already used on this device.");
    // No swapping codes: a player cannot redeem the code of someone they invited.
    if (await db.prepare("select 1 as x from referrals where invitee_id = ? and inviter_id = ?").bind(owner.user_id, me.id).first()) return fail(400, "mutual", "You invited this player.");
    const t = now();
    try {
      await db.batch([
        db.prepare("insert into referrals (invitee_id, inviter_id, code, redeemed_at) values (?, ?, ?, ?)").bind(me.id, owner.user_id, code, t),
        db.prepare("insert into referral_devices (device_hash, redeemed_at) values (?, ?)").bind(deviceHash, t),
        db.prepare("insert into referral_ledger (at, kind, user_id, other_id, coins, gems) values (?, 'redeem_bonus', ?, ?, 0, ?)").bind(t, me.id, owner.user_id, REDEEM_GEMS),
        serverEvent(db, me.id, "referral_redeem", { code }),
      ]);
    } catch { return fail(409, "already_redeemed", "You already used an invite code."); }
    return json({ coins: 0, gems: REDEEM_GEMS });
  }
  if (p === "/v1/referral/progress" && m === "POST") {
    const b = await body(req, 1024);
    if (b.milestone !== "chapter1") return fail(400, "bad_milestone", "milestone must be chapter1.");
    const ref = await db.prepare("select inviter_id, chapter1_at from referrals where invitee_id = ?").bind(me.id).first();
    if (!ref) return fail(404, "not_invited", "This player was not invited.");
    if (ref.chapter1_at) return json({ created: false });
    const t = now();
    const paid = (await db.prepare("select count(*) as n from referral_rewards where inviter_id = ?").bind(ref.inviter_id).first()).n;
    const stmts = [db.prepare("update referrals set chapter1_at = ? where invitee_id = ? and chapter1_at is null").bind(t, me.id)];
    if (paid < INVITE_CAP) stmts.push(db.prepare("insert or ignore into referral_rewards (id, inviter_id, invitee_id, milestone, coins, gems, created_at) values (?, ?, ?, 'chapter1', ?, ?, ?)").bind(crypto.randomUUID(), ref.inviter_id, me.id, INVITE_COINS, INVITE_GEMS, t));
    const res = await db.batch(stmts);
    const created = paid < INVITE_CAP && res[0].meta.changes === 1 && res[1].meta.changes === 1;
    return json({ created, ...(paid >= INVITE_CAP ? { reason: "inviter_cap" } : {}) });
  }
  if (p === "/v1/referral/claim" && m === "POST") {
    const b = await body(req, 1024);
    const r = await db.prepare("select id, invitee_id, coins, gems, claimed_at from referral_rewards where id = ? and inviter_id = ?").bind(String(b.id || ""), me.id).first();
    if (!r) return fail(404, "not_found", "No such reward.");
    if (r.claimed_at) return fail(409, "already_claimed", "This reward was already claimed.");
    const t = now();
    const upd = await db.prepare("update referral_rewards set claimed_at = ? where id = ? and claimed_at is null").bind(t, r.id).run();
    if (upd.meta.changes !== 1) return fail(409, "already_claimed", "This reward was already claimed.");
    await db.batch([
      db.prepare("insert into referral_ledger (at, kind, user_id, other_id, coins, gems) values (?, 'invite_reward', ?, ?, ?, ?)").bind(t, me.id, r.invitee_id, r.coins, r.gems),
      serverEvent(db, me.id, "referral_claim", { reward: r.id }),
    ]);
    return json({ coins: r.coins, gems: r.gems });
  }

  // Heartbeat every 5 minutes while the game is open: counted in the Durable Object, never written to D1.
  if (p === "/v1/presence" && m === "POST") {
    await env.PRESENCE.get(env.PRESENCE.idFromName("global")).fetch("https://presence/beat", { method: "POST", body: me.id });
    return json({ ok: true });
  }

  return fail(404, "not_found", "Unknown route.");
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    if (env.LIMIT && url.pathname !== "/health" && url.pathname !== "/v1/online") {
      const { success } = await env.LIMIT.limit({ key: req.headers.get("CF-Connecting-IP") || "ip" });
      if (!success) return fail(429, "rate_limited", "Too many requests, slow down.");
    }
    try { return await route(req, env, url); }
    catch (e) {
      if (e.status) return fail(e.status, e.message, e.message);
      console.error("dropolis_error", e?.message);
      return fail(500, "server_error", "Something went wrong.");
    }
  },
};

// Players online: one row per player, refreshed by the heartbeat; counted over the last 6 minutes.
export class Presence {
  constructor(ctx) {
    this.sql = ctx.storage.sql;
    this.sql.exec("create table if not exists p (id text primary key, seen integer not null)");
  }
  async fetch(req) {
    const t = Math.floor(Date.now() / 1000);
    if (new URL(req.url).pathname === "/beat") {
      this.sql.exec("insert into p (id, seen) values (?, ?) on conflict (id) do update set seen = excluded.seen", await req.text(), t);
      return new Response("ok");
    }
    this.sql.exec("delete from p where seen < ?", t - 3600);
    const n = this.sql.exec("select count(*) as n from p where seen >= ?", t - 360).one().n;
    return Response.json({ online: n, at: new Date().toISOString() });
  }
}
