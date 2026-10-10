// PromoVote API (Cloudflare Worker + D1). Used by the iOS and Android apps, later by the website.
// Public reads: feed, explore, profiles. Signed in: onboarding, follow, vote, save, report, block, delete account.
// Payments (version 2) arrive from Apple App Store Server Notifications and Google Play RTDN (Pub/Sub push).
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth.js";

const app = new Hono();
const LANGS = ["en", "es", "tr"];
// Creator categories (expert review 2026-10-07). Local opens in Explore once there are 20 local creators.
const CATEGORIES = ["games", "apps", "streams", "videos", "shops", "brands", "local"];
const KIND_BY_CATEGORY = { games: "game_dev", apps: "app_maker", streams: "streamer", videos: "short_video", shops: "shop", brands: "brand", local: "local_business" };
const CTA_KINDS = ["website", "app_store", "google_play", "steam", "itch", "shop", "etsy", "watch", "watch_live", "notify"];
// Names and bios may not pose as PromoVote staff (impersonation is the most common scam on new platforms).
const STAFF_NAME = /\b(promo ?vote|admin(istrator)?|moderator|official support|support team|trust (and|&) safety)\b/i;
const HANDLE_RE = /^[a-z][a-z0-9_]{2,23}$/;
const TERMS_VERSION = "2026-10-07";
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const uuid = () => crypto.randomUUID();
const json = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

// ------------------------------------------------------------------ setup
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("X-Frame-Options", "DENY");
  if (!c.res.headers.get("Cache-Control")) c.header("Cache-Control", "no-store");
});
app.use("*", cors({
  // Local development (DEV_LOG_OTP=1 in .dev.vars) also allows localhost so the app's web build can be tested.
  origin: (o, c) => (o === "https://promovote.com" || (c.env.DEV_LOG_OTP === "1" && /^http:\/\/localhost:\d+$/.test(o || "")) ? o : null),
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));

// Store notifications. Version 1 sells nothing, so they are acknowledged and ignored. They must answer 2xx:
// Pub/Sub retries every unacknowledged push forever (a 404 here caused about 1,500 retries an hour on 2026-10-07).
// Registered before the write limit so Google's retries never get a 429. No database work.
app.post("/v1/webhooks/google", (c) => c.body(null, 204));
app.post("/v1/webhooks/apple", (c) => c.body(null, 200));

// Writes: small JSON bodies only, and a per IP rate limit (Workers Rate Limiting binding WRITE_LIMIT).
app.use("/v1/*", async (c, next) => {
  if (c.req.method === "GET" || c.req.method === "OPTIONS") return next();
  // Photo uploads check their own (larger) limit in the route.
  if (c.req.path !== "/v1/me/media") {
    // A chunked body has no Content-Length and could skip the size check, so it is refused.
    // Requests without a body (taps like save or claim) still pass.
    if (/chunked/i.test(c.req.header("Transfer-Encoding") || "")) return c.json({ error: { code: "length_required", message: "Content-Length required." } }, 411);
    if (+(c.req.header("Content-Length") || 0) > 16384) return c.json({ error: { code: "too_large", message: "Request too large." } }, 413);
  }
  if (c.env.WRITE_LIMIT) {
    // Events (views, taps) get their own bucket so watching never blocks a call, but a script cannot flood writes.
    const ip = c.req.header("CF-Connecting-IP") || "unknown";
    const { success } = await c.env.WRITE_LIMIT.limit({ key: c.req.path.startsWith("/v1/events/") ? `ev:${ip}` : ip });
    if (!success) return c.json({ error: { code: "rate_limited", message: "Too many requests. Wait a minute." } }, 429);
  }
  return next();
});

function sendCodeFor(env) {
  return async (email, otp) => {
    if (env.REVIEW_EMAIL && email === env.REVIEW_EMAIL) return; // fixed code, nothing to send
    if (env.EMAIL) {
      await env.EMAIL.send({
        from: { email: "login@promovote.com", name: "PromoVote" },
        to: email,
        subject: `${otp} is your PromoVote code`,
        text: `Your PromoVote sign in code is ${otp}\n\nIt expires in 10 minutes. If you did not ask for it, you can ignore this email.\n\nPromoVote, promovote.com`,
        html: `<p>Your PromoVote sign in code is</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${otp}</p><p>It expires in 10 minutes. If you did not ask for it, you can ignore this email.</p><p>PromoVote, promovote.com</p>`,
      });
      return;
    }
    if (env.DEV_LOG_OTP === "1") { console.log(`[dev] OTP for ${email}: ${otp}`); return; }
    throw new Error("Email sending is not configured");
  };
}

function authFor(c) {
  let auth = c.get("auth");
  if (!auth) { auth = createAuth(c.env, sendCodeFor(c.env)); c.set("auth", auth); }
  return auth;
}
// Until email sending is enabled, email codes only work for the app review account.
app.post("/api/auth/email-otp/send-verification-otp", async (c) => {
  if (!c.env.EMAIL && c.env.DEV_LOG_OTP !== "1") {
    const body = await c.req.raw.clone().json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!c.env.REVIEW_EMAIL || email !== c.env.REVIEW_EMAIL) {
      return c.json({ code: "EMAIL_LOGIN_SOON", message: "Email sign in is not open yet. Please continue with Apple or Google." }, 403);
    }
  }
  return authFor(c).handler(c.req.raw);
});
app.on(["GET", "POST"], "/api/auth/*", (c) => authFor(c).handler(c.req.raw));

// Loads the signed in user, their private row and profile. Returns null for guests.
async function viewer(c) {
  if (c.get("viewer") !== undefined) return c.get("viewer");
  const s = await authFor(c).api.getSession({ headers: c.req.raw.headers });
  let v = null;
  if (s?.user) {
    const db = c.env.DB;
    const [priv, profile] = await db.batch([
      db.prepare("select * from account_private where user_id = ?").bind(s.user.id),
      db.prepare("select * from profiles where owner_user_id = ?").bind(s.user.id),
    ]);
    v = { user: s.user, priv: priv.results[0] || null, profile: profile.results[0] || null };
  }
  c.set("viewer", v);
  return v;
}
const fail = (c, status, code, message) => c.json({ error: { code, message } }, status);

// Requires a finished account. Optional type check ('scout' or 'creator').
async function requireProfile(c, type) {
  const v = await viewer(c);
  if (!v) return [null, fail(c, 401, "auth_required", "Sign in first.")];
  if (!v.profile) return [null, fail(c, 403, "onboarding_required", "Finish creating your profile first.")];
  if (v.profile.status !== "active") return [null, fail(c, 403, "account_inactive", "This account is not active.")];
  if (type && v.profile.type !== type) {
    const msg = type === "scout" ? "Only scout accounts can do this." : "Only creator accounts can do this.";
    return [null, fail(c, 403, `${type}_only`, msg)];
  }
  return [v, null];
}

const langOf = (c) => {
  const l = (c.req.query("lang") || "").slice(0, 2).toLowerCase();
  return LANGS.includes(l) ? l : "en";
};
const pick = (map, lang, fallback) => (map && (map[lang] || map.en)) || fallback;

// ------------------------------------------------------------------ shapes
const PROMO_SELECT = `
  select pr.id, pr.slug, pr.lang, pr.title, pr.description, pr.i18n, pr.cta_kind, pr.cta_url, pr.live_at,
         (exists (select 1 from perks k where k.creator_profile_id = pr.creator_profile_id and k.status = 'active' and k.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now') and (k.stock_left is null or k.stock_left > 0))) as has_perk,
         pr.public_view_bucket, pr.is_pinned, pr.ai_generated, d.ai_persona,
         (select count(*) from saves sv where sv.promo_id = pr.id) as save_count,
         v.mp4_url, v.webm_url, v.poster_url, v.stream_uid, v.duration_ms, v.width, v.height,
         p.handle, p.display_name, p.avatar_url, p.i18n as p_i18n, p.is_verified,
         d.category, d.release_status, d.android_status, d.ios_status, d.founder_owned,
         (select group_concat(tag, ' ') from (select tag from promo_hashtags h where h.promo_id = pr.id order by position)) as tags,
         (select l.canonical_url from profile_links l where l.profile_id = pr.creator_profile_id and l.platform = 'google_play' and l.safety_status = 'safe' order by l.position limit 1) as play_url
  from promos pr
  join profiles p on p.id = pr.creator_profile_id
  join creator_details d on d.profile_id = p.id
  left join promo_videos v on v.promo_id = pr.id and v.label = 'A'
  where pr.status = 'live' and p.status = 'active'`;

// Outbound links carry utm tags so creators see PromoVote traffic in their own analytics.
// Store links stay untouched (Apple and Google use their own campaign parameters).
const NO_UTM = /(^|\.)(apps\.apple\.com|play\.google\.com|store\.steampowered\.com|steamcommunity\.com)$/;
function withUtm(raw, campaign) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || NO_UTM.test(u.hostname) || u.searchParams.has("utm_source")) return raw;
    u.searchParams.set("utm_source", "promovote");
    u.searchParams.set("utm_medium", "referral");
    if (campaign) u.searchParams.set("utm_campaign", campaign);
    return u.toString();
  } catch { return raw; }
}
// Which link platforms can back each main button type (first match in the creator's link order wins).
const CTA_PLATFORMS = {
  website: ["website"], app_store: ["app_store"], google_play: ["google_play"], steam: ["steam"], itch: ["itch"],
  shop: ["shopify", "amazon", "etsy", "website"], etsy: ["etsy"], watch: ["youtube", "tiktok", "instagram"],
  watch_live: ["twitch", "kick", "youtube"], notify: [],
};

function promoOut(r, lang) {
  const i = json(r.i18n) || {};
  const pi = json(r.p_i18n) || {};
  return {
    id: r.id,
    slug: r.slug,
    lang: r.lang,
    title: pick(i.title, lang, r.title),
    description: pick(i.desc, lang, r.description),
    tags: r.tags ? r.tags.split(" ") : [],
    video: {
      mp4: r.mp4_url, webm: r.webm_url, poster: r.poster_url,
      hls: r.stream_uid ? `https://videodelivery.net/${r.stream_uid}/manifest/video.m3u8` : null,
      durationMs: r.duration_ms, width: r.width, height: r.height,
    },
    cta: r.cta_kind ? { kind: r.cta_kind, url: r.cta_url ? withUtm(r.cta_url, r.slug) : r.cta_url } : null,
    // App Store or "notify" promos of creators who are on Google Play: Android viewers get the Play button instead.
    ctaAndroid: (r.cta_kind === "app_store" || r.cta_kind === "notify") && r.play_url ? { kind: "google_play", url: r.play_url } : null,
    hasPerk: !!r.has_perk,
    views: r.public_view_bucket,
    saves: r.save_count || 0, // neutral count (our "likes"); never the call split, which would bias calls
    pinned: !!r.is_pinned,
    // Shown as "Made with AI". Promos of virtual creators always carry it.
    aiGenerated: !!r.ai_generated || !!r.ai_persona,
    liveAt: r.live_at,
    creator: {
      handle: r.handle, name: r.display_name, avatar: r.avatar_url, mono: pi.mono || null,
      kind: pick(pi.kind, lang, null), category: r.category, verified: !!r.is_verified,
      releaseStatus: r.release_status, androidStatus: r.android_status, iosStatus: r.ios_status,
      founderOwned: !!r.founder_owned, aiPersona: !!r.ai_persona,
    },
  };
}

// ------------------------------------------------------------------ public reads
// Health: database reachable, last run of each job, and "stale" when a job is late (hourly resolve > 2 h, daily > 26 h).
app.get("/health", async (c) => {
  try {
    const { results } = await c.env.DB.prepare("select name, ran_at from job_runs where name not like 'streaks:%'").all();
    const jobs = Object.fromEntries(results.map((r) => [r.name, r.ran_at]));
    const age = (k) => (jobs[k] ? Date.now() - new Date(jobs[k]).getTime() : Infinity);
    const stale = [age("resolve_calls") > 2 * 3600e3 && "resolve_calls", age("daily") > 26 * 3600e3 && "daily"].filter(Boolean);
    return c.json({ ok: true, time: now(), jobs, stale });
  } catch (e) {
    console.error("health_failed", e?.message);
    return c.json({ ok: false, time: now(), error: "database_unavailable" }, 500);
  }
});

// Live promos. The app runs the fair rotation per viewer (same rules as the website) until it moves server side.
app.get("/v1/feed", async (c) => {
  const lang = langOf(c);
  const { results } = await c.env.DB.prepare(PROMO_SELECT + " order by pr.live_at desc limit 300").all();
  c.header("Cache-Control", "public, max-age=60");
  return c.json({ promos: results.map((r) => promoOut(r, lang)) });
});

// Home tabs. new: latest first. featured: team picks (never paid). top: last 7 days of valid views from
// signed in viewers only (guest device ids are free to fake, so they never rank; boosted views never count)
// plus 3 points per valid "will blow up" call. A promo needs at least
// TOP_MIN_VIEWS weighted views to show up, so the tab stays honestly empty until real data exists (docs/04).
const TOP_MIN_VIEWS = 50;
const CHARTS_GOAL = 20; // scouts calling in the last 7 days before Charts feel alive
app.get("/v1/home", async (c) => {
  const lang = langOf(c);
  const tab = c.req.query("tab");
  const db = c.env.DB;
  let rows;
  if (tab === "following") {
    // Promos from creators the viewer follows, newest first. No ranking, no Boost (founder request 2026-10-07).
    const [v, err] = await requireProfile(c);
    if (err) return err;
    ({ results: rows } = await db.prepare(PROMO_SELECT + ` and pr.creator_profile_id in (select creator_profile_id from follows where follower_profile_id = ?1)
      and pr.creator_profile_id not in (select blocked_profile_id from blocks where blocker_profile_id = ?1) order by pr.live_at desc limit 50`).bind(v.profile.id).all());
    return c.json({ tab, promos: rows.map((r) => promoOut(r, lang)) });
  } else if (tab === "new") {
    ({ results: rows } = await db.prepare(PROMO_SELECT + " order by pr.live_at desc limit 50").all());
  } else if (tab === "featured") {
    ({ results: rows } = await db.prepare(PROMO_SELECT + " and pr.featured_at is not null order by pr.featured_at desc, pr.live_at desc limit 30").all());
  } else if (tab === "top") {
    // Charts open only when enough scouts call promos this week (one gate for the list and the progress card).
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const sc = await db.prepare("select count(distinct scout_profile_id) as n from calls where created_at >= ?").bind(weekAgo).first();
    if ((sc?.n || 0) < CHARTS_GOAL) {
      c.header("Cache-Control", "public, max-age=60");
      return c.json({ tab, promos: [], progress: { scouts: sc?.n || 0, goal: CHARTS_GOAL } });
    }
    const since = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
    const { results: scores } = await db.prepare(
      `select promo_id, count(*) as views from view_events
       where day >= ? and is_boost = 0 and is_guest = 0 group by promo_id having views >= ?`,
    ).bind(since, TOP_MIN_VIEWS).all();
    if (!scores.length) {
      rows = [];
    } else {
      const { results: votes } = await db.prepare(
        `select promo_id, count(*) as n from calls where is_valid = 1 and choice = 'will_blow_up' and created_at >= ? group by promo_id`,
      ).bind(since).all();
      const voteMap = Object.fromEntries(votes.map((v) => [v.promo_id, v.n]));
      const score = Object.fromEntries(scores.map((s) => [s.promo_id, s.views + 3 * (voteMap[s.promo_id] || 0)]));
      const ids = Object.keys(score);
      // json_each keeps this to one bound parameter (D1 allows at most 100).
      const { results } = await db.prepare(PROMO_SELECT + " and pr.id in (select value from json_each(?))").bind(JSON.stringify(ids)).all();
      rows = results.sort((a, b) => score[b.id] - score[a.id]).slice(0, 50);
    }
  } else {
    return fail(c, 400, "bad_tab", "Use tab=following, new, top or featured.");
  }
  let progress;
  if (tab === "top") {
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const r = await db.prepare("select count(distinct scout_profile_id) as n from calls where created_at >= ?").bind(since).first();
    progress = { scouts: r?.n || 0, goal: CHARTS_GOAL };
  }
  c.header("Cache-Control", "public, max-age=60");
  return c.json({ tab, promos: rows.map((r) => promoOut(r, lang)), progress });
});

// Today's Drop: the same 7 promos for everyone today (per language), picked fairly across creators.
// Viewer language first, then English; game promos lead so a first session opens on a trailer.
const DROP_SIZE = 7;
const DROP_POOL = 21;
function seeded(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
app.get("/v1/drop", async (c) => {
  const lang = langOf(c);
  const day = today();
  const { results } = await c.env.DB.prepare(PROMO_SELECT + " order by pr.live_at desc limit 300").all();
  // Each promo gets its own random rank for the day (hash of day, language and promo id), so adding a new
  // promo never reshuffles the rest and the drop stays the same all day.
  const rank = (r) => seeded(`${day}:${lang}:${r.id}`)();
  const langRank = (r) => (r.lang === lang ? 0 : r.lang === "en" ? 1 : 2);
  const byCreator = new Map();
  for (const r of [...results].sort((a, b) => rank(a) - rank(b))) {
    if (!byCreator.has(r.handle)) byCreator.set(r.handle, []);
    byCreator.get(r.handle).push(r);
  }
  const lists = [...byCreator.values()].map((l) => l.sort((a, b) => langRank(a) - langRank(b)))
    .sort((a, b) => (a[0].category === "games" ? 0 : 1) - (b[0].category === "games" ? 0 : 1) || langRank(a[0]) - langRank(b[0]));
  // Round robin across creators, viewer language and English only. The app takes the first 7 the viewer has
  // not called yet, so a pool of up to DROP_POOL keeps tomorrow's drop fresh for returning scouts.
  const out = [];
  for (let i = 0; out.length < DROP_POOL && lists.some((l) => l[i]); i++) {
    for (const l of lists) if (l[i] && out.length < DROP_POOL && langRank(l[i]) < 2) out.push(l[i]);
  }
  c.header("Cache-Control", "public, max-age=300");
  return c.json({ day, size: DROP_SIZE, promos: out.map((r) => promoOut(r, lang)) });
});

app.get("/v1/promos/:id", async (c) => {
  const r = await c.env.DB.prepare(PROMO_SELECT + " and (pr.id = ?1 or pr.slug = ?1)").bind(c.req.param("id")).first();
  if (!r) return fail(c, 404, "not_found", "Promo not found.");
  return c.json({ promo: promoOut(r, langOf(c)) });
});

// Search, category and hashtag filters. q matches titles, descriptions, creator names and hashtags.
app.get("/v1/explore", async (c) => {
  const lang = langOf(c);
  const q = (c.req.query("q") || "").trim().toLowerCase().replace(/#/g, "").slice(0, 60);
  const cat = c.req.query("cat");
  const tag = (c.req.query("tag") || "").toLowerCase().replace(/#/g, "").slice(0, 30);
  let sql = PROMO_SELECT;
  const args = [];
  if (CATEGORIES.includes(cat)) { sql += " and d.category = ?"; args.push(cat); }
  if (tag) { sql += " and exists (select 1 from promo_hashtags h where h.promo_id = pr.id and h.tag = ?)"; args.push(tag); }
  for (const w of q.split(/\s+/).filter(Boolean).slice(0, 5)) {
    const like = `%${w.replace(/[%_\\]/g, "\\$&")}%`;
    sql += ` and (lower(pr.title) like ? escape '\\' or lower(coalesce(pr.description, '')) like ? escape '\\' or lower(coalesce(pr.i18n, '')) like ? escape '\\'
              or lower(p.display_name) like ? escape '\\' or exists (select 1 from promo_hashtags h where h.promo_id = pr.id and h.tag like ? escape '\\'))`;
    args.push(like, like, like, like, like);
  }
  // Viewer language first, then English, then the rest (same rule as the drop and the feed).
  const { results } = await c.env.DB.prepare(sql + " order by (pr.lang = ?) desc, (pr.lang = 'en') desc, pr.live_at desc limit 100").bind(...args, lang).all();
  return c.json({ promos: results.map((r) => promoOut(r, lang)) });
});

app.get("/v1/hashtags", async (c) => {
  const { results } = await c.env.DB.prepare(
    "select tag, use_count from hashtags where blocked = 0 and use_count > 0 order by use_count desc, tag limit 30",
  ).all();
  c.header("Cache-Control", "public, max-age=300");
  return c.json({ hashtags: results.map((r) => ({ tag: r.tag, count: r.use_count })) });
});

app.get("/v1/creators", async (c) => {
  const lang = langOf(c);
  const cat = c.req.query("cat");
  const args = [];
  let sql = `select p.handle, p.display_name, p.avatar_url, p.i18n, p.is_verified, p.follower_count, d.category
             from profiles p join creator_details d on d.profile_id = p.id where p.status = 'active'
             and exists (select 1 from promos x where x.creator_profile_id = p.id and x.status = 'live')`;
  if (CATEGORIES.includes(cat)) { sql += " and d.category = ?"; args.push(cat); }
  const { results } = await c.env.DB.prepare(sql + " order by p.follower_count desc, p.created_at limit 50").bind(...args).all();
  return c.json({
    creators: results.map((r) => {
      const i = json(r.i18n) || {};
      return { handle: r.handle, name: r.display_name, avatar: r.avatar_url, mono: i.mono || null, kind: pick(i.kind, lang, null), category: r.category, verified: !!r.is_verified };
    }),
  });
});

// Charts open when real vote and view data exists (docs/04). Until then the list is empty on purpose.
app.get("/v1/charts", async (c) => {
  const kind = ["day", "week", "month"].includes(c.req.query("period")) ? c.req.query("period") : "week";
  const row = await c.env.DB.prepare("select max(period) as period from rankings where period_kind = ? and scope = 'promo'").bind(kind).first();
  if (!row?.period) return c.json({ period: null, items: [], open: false });
  const { results } = await c.env.DB.prepare(
    "select rank, entity_id, score, metric, category from rankings where period_kind = ? and period = ? and scope = 'promo' order by metric, category, rank",
  ).bind(kind, row.period).all();
  return c.json({ period: row.period, items: results, open: true });
});

app.get("/v1/profiles/:handle", async (c) => {
  const lang = langOf(c);
  const handle = c.req.param("handle").toLowerCase().replace(/^@/, "");
  const db = c.env.DB;
  const p = await db.prepare(
    `select p.*, s.show_follower_count, s.show_view_counts, s.show_calls, d.kind, d.category, d.release_status, d.android_status, d.ios_status, d.founder_owned, d.founding_creator, d.primary_cta, d.ai_persona
     from profiles p left join profile_settings s on s.profile_id = p.id left join creator_details d on d.profile_id = p.id
     where p.handle = ? and p.status = 'active'`,
  ).bind(handle).first();
  if (!p) return fail(c, 404, "not_found", "Profile not found.");
  const i = json(p.i18n) || {};
  const out = {
    handle: p.handle, type: p.type, name: p.display_name,
    bio: pick(i.bio, lang, p.bio), avatar: p.avatar_url, banner: p.banner_url, mono: i.mono || null,
    verified: !!p.is_verified, createdAt: p.created_at,
  };
  if (p.type === "creator") {
    const [links, promos, counts, views] = await db.batch([
      db.prepare("select platform, canonical_url, label from profile_links where profile_id = ? and safety_status = 'safe' order by position").bind(p.id),
      db.prepare(PROMO_SELECT + " and pr.creator_profile_id = ? order by pr.is_pinned desc, (pr.lang = ?) desc, (pr.lang = 'en') desc, pr.live_at desc limit 60").bind(p.id, lang),
      // Profile stats row (founder request 2026-10-07): neutral totals only, never the Will blow up split.
      db.prepare(`select (select count(*) from saves s join promos pr on pr.id = s.promo_id where pr.creator_profile_id = ?1 and pr.status = 'live') as saves,
        (select count(*) from calls ca join promos pr on pr.id = ca.promo_id where pr.creator_profile_id = ?1 and pr.status = 'live' and ca.is_valid = 1) as calls,
        (select count(*) from promos where creator_profile_id = ?1 and status = 'live') as promos`).bind(p.id),
      db.prepare("select promo_id, count(*) as n from view_events where is_boost = 0 and is_guest = 0 and promo_id in (select id from promos where creator_profile_id = ? and status = 'live') group by promo_id").bind(p.id),
    ]);
    const st = counts.results[0] || {};
    const viewMap = Object.fromEntries(views.results.map((x) => [x.promo_id, x.n]));
    Object.assign(out, {
      kind: pick(i.kind, lang, p.kind), category: p.category,
      releaseStatus: p.release_status, androidStatus: p.android_status, iosStatus: p.ios_status,
      founderOwned: !!p.founder_owned, foundingCreator: !!p.founding_creator, aiPersona: !!p.ai_persona,
      followers: p.show_follower_count !== 0 ? p.follower_count : null,
      stats: { followers: p.show_follower_count !== 0 ? p.follower_count : null, saves: st.saves || 0, calls: st.calls || 0, promos: st.promos || 0 },
      newCreator: p.follower_count < 10,
      links: links.results.map((l) => ({ platform: l.platform, url: withUtm(l.canonical_url, "profile"), label: l.label })),
      primaryCta: (() => {
        if (!p.primary_cta) return null;
        if (p.primary_cta === "notify") return { kind: "notify", url: null };
        const l = links.results.find((x) => (CTA_PLATFORMS[p.primary_cta] || []).includes(x.platform));
        return l ? { kind: p.primary_cta, url: withUtm(l.canonical_url, "profile") } : null;
      })(),
      promos: promos.results.map((r) => ({ ...promoOut(r, lang), views: p.show_view_counts === 0 ? null : viewMap[r.id] || 0 })),
    });
  } else {
    const st = await db.prepare("select scout_score, level, called_it_count from scout_stats where profile_id = ?").bind(p.id).first();
    out.stats = st ? { score: st.scout_score, level: st.level, calledIt: st.called_it_count } : null;
  }
  const v = await viewer(c);
  if (v?.profile) {
    const f = await db.prepare("select 1 from follows where follower_profile_id = ? and creator_profile_id = ?").bind(v.profile.id, p.id).first();
    out.viewer = { following: !!f, isMe: v.profile.id === p.id };
  }
  return c.json({ profile: out });
});

app.get("/v1/handles/:handle", async (c) => {
  const h = c.req.param("handle").toLowerCase();
  if (!HANDLE_RE.test(h) || h.includes("__") || h.endsWith("_")) return c.json({ handle: h, available: false, reason: "format" });
  const db = c.env.DB;
  const [taken, reserved, held] = await db.batch([
    db.prepare("select 1 from profiles where handle = ?").bind(h),
    db.prepare("select 1 from reserved_handles where handle = ?").bind(h),
    db.prepare("select 1 from handle_history where old_handle = ? and hold_until > ?").bind(h, now()),
  ]);
  const reason = taken.results.length ? "taken" : reserved.results.length ? "reserved" : held.results.length ? "held" : null;
  return c.json({ handle: h, available: !reason, reason });
});

// ------------------------------------------------------------------ account
app.get("/v1/me", async (c) => {
  const v = await viewer(c);
  if (!v) return fail(c, 401, "auth_required", "Sign in first.");
  return c.json({
    user: { id: v.user.id, email: v.user.email, emailVerified: !!v.user.emailVerified, name: v.user.name || null },
    account: v.priv && { type: v.priv.account_type, language: v.priv.language, country: v.priv.country_code, perkEmails: !!v.priv.perk_email_opt_in, followEmails: !!v.priv.follow_email_opt_in },
    profile: v.profile && { handle: v.profile.handle, name: v.profile.display_name, bio: v.profile.bio, type: v.profile.type, status: v.profile.status, avatar: v.profile.avatar_url, interests: json(v.profile.interests) || [] },
    needsOnboarding: !v.profile,
  });
});

// Creates the private row and the profile. Asks the full birth date but keeps only the year (docs/03 6.1).
app.post("/v1/onboarding", async (c) => {
  const v = await viewer(c);
  if (!v) return fail(c, 401, "auth_required", "Sign in first.");
  if (v.profile) return fail(c, 409, "already_onboarded", "Your profile already exists.");
  const b = await c.req.json().catch(() => ({}));
  const type = b.accountType;
  if (!["scout", "creator"].includes(type)) return fail(c, 400, "bad_account_type", "Choose scout or creator.");
  if (b.acceptTerms !== true) return fail(c, 400, "terms_required", "Please accept the Terms and Community Guidelines.");
  const dob = new Date(Date.UTC(+b.birthYear, +b.birthMonth - 1, +b.birthDay));
  if (Number.isNaN(dob.getTime()) || +b.birthYear < 1900) return fail(c, 400, "bad_birth_date", "Enter a valid birth date.");
  const n = new Date();
  let age = n.getUTCFullYear() - dob.getUTCFullYear();
  if (n.getUTCMonth() < dob.getUTCMonth() || (n.getUTCMonth() === dob.getUTCMonth() && n.getUTCDate() < dob.getUTCDate())) age--;
  if (age < 18) {
    // No email is kept for under 18 sign ups (docs/03 6.1).
    await c.env.DB.prepare('delete from "user" where id = ?').bind(v.user.id).run();
    return fail(c, 403, "under_18", "PromoVote is for people 18 and older.");
  }
  const handle = String(b.handle || "").toLowerCase();
  if (!HANDLE_RE.test(handle) || handle.includes("__") || handle.endsWith("_")) return fail(c, 400, "bad_handle", "Handles use 3 to 24 lowercase letters, numbers or _ and start with a letter.");
  const name = String(b.displayName || "").trim().slice(0, 80);
  if (!name) return fail(c, 400, "bad_name", "Enter a display name.");
  if (STAFF_NAME.test(name)) return fail(c, 400, "reserved_name", "That name looks like PromoVote staff. Please choose another.");
  const lang = LANGS.includes(b.language) ? b.language : "en";
  const country = /^[A-Z]{2}$/.test(b.country || "") ? b.country : (c.req.raw.cf?.country || null);
  let category = null, kind = null;
  if (type === "creator") {
    category = CATEGORIES.includes(b.category) ? b.category : null;
    if (!category) return fail(c, 400, "bad_category", "Choose a category.");
    kind = KIND_BY_CATEGORY[category];
  }
  // The rest of the profile comes in the same request, so nobody ends up with a half empty page.
  // Builds up to 8 send only the basics; they still work (and finish the page in Edit profile).
  const legacy = b.bio === undefined && b.links === undefined && b.interests === undefined;
  const bio = typeof b.bio === "string" ? b.bio.trim().slice(0, type === "creator" ? 300 : 160) : "";
  if (!legacy && type === "creator" && bio.length < 20) return fail(c, 400, "bio_required", "Tell scouts what you make in at least 20 characters.");
  if (bio && STAFF_NAME.test(bio)) return fail(c, 400, "reserved_name", "Your bio cannot say you are PromoVote staff.");
  if (bio && BIO_LINKS.test(bio)) return fail(c, 400, "bio_links", "Links go in the links section, not the bio.");
  const interests = Array.isArray(b.interests) ? [...new Set(b.interests.filter((x) => CATEGORIES.includes(x)))].slice(0, 7) : [];
  if (!legacy && type === "scout" && !interests.length) return fail(c, 400, "interests_required", "Pick at least one thing you like to discover.");
  let links = [], secondary = [], primaryCta = null;
  const releaseStatus = b.releaseStatus === "soon" ? "soon" : "live";
  if (type === "creator") {
    const checked = validateLinks(b.links || []);
    if (checked.error) return fail(c, 400, checked.code, checked.error);
    links = checked.rows;
    if (!legacy && !links.length) return fail(c, 400, "link_required", "Add at least one link: your website, store or channel.");
    secondary = Array.isArray(b.secondaryCategories) ? [...new Set(b.secondaryCategories.filter((x) => CATEGORIES.includes(x) && x !== category))].slice(0, 2) : [];
    if (b.primaryCta != null) {
      if (!CTA_KINDS.includes(b.primaryCta)) return fail(c, 400, "bad_cta", "Unknown button type.");
      primaryCta = b.primaryCta;
    }
  }
  const db = c.env.DB;
  const blocked = await db.batch([
    db.prepare("select 1 from profiles where handle = ?").bind(handle),
    db.prepare("select 1 from reserved_handles where handle = ?").bind(handle),
  ]);
  if (blocked.some((r) => r.results.length)) return fail(c, 409, "handle_unavailable", "That handle is not available.");
  const pid = uuid(), t = now();
  const stmts = [
    db.prepare(`insert into account_private (user_id, account_type, birth_year, age_confirmed_at, country_code, language, terms_accepted_at, terms_version)
                values (?, ?, ?, ?, ?, ?, ?, ?)`).bind(v.user.id, type, dob.getUTCFullYear(), t, country, lang, t, TERMS_VERSION),
    db.prepare("insert into profiles (id, owner_user_id, type, handle, display_name, bio, interests) values (?, ?, ?, ?, ?, ?, ?)").bind(pid, v.user.id, type, handle, name, bio || null, interests.length ? JSON.stringify(interests) : null),
    db.prepare("insert into profile_settings (profile_id) values (?)").bind(pid),
  ];
  if (type === "scout") stmts.push(db.prepare("insert into scout_stats (profile_id) values (?)").bind(pid));
  else {
    stmts.push(db.prepare("insert into creator_details (profile_id, kind, category, secondary_categories, primary_cta, release_status) values (?, ?, ?, ?, ?, ?)")
      .bind(pid, kind, category, JSON.stringify(secondary), primaryCta, releaseStatus));
    for (const r of links) {
      stmts.push(db.prepare("insert into profile_links (id, profile_id, platform, url_input, canonical_url, label, position, safety_status, last_scanned_at) values (?, ?, ?, ?, ?, ?, ?, 'safe', ?)")
        .bind(uuid(), pid, r.platform, r.url, r.url, r.label, r.position, t));
    }
  }
  try {
    await db.batch(stmts);
  } catch (e) {
    if (String(e).includes("UNIQUE")) return fail(c, 409, "handle_unavailable", "That handle is not available.");
    throw e;
  }
  return c.json({ ok: true, handle }, 201);
});

app.patch("/v1/me", async (c) => {
  const [v, err] = await requireProfile(c);
  if (err) return err;
  const b = await c.req.json().catch(() => ({}));
  const db = c.env.DB;
  const stmts = [];
  if (typeof b.displayName === "string") {
    const name = b.displayName.trim().slice(0, 80);
    if (!name) return fail(c, 400, "bad_name", "Enter a display name.");
    if (STAFF_NAME.test(name) && !v.profile.is_verified) return fail(c, 400, "reserved_name", "That name looks like PromoVote staff. Please choose another.");
    stmts.push(db.prepare("update profiles set display_name = ?, updated_at = ? where id = ?").bind(name, now(), v.profile.id));
  }
  if (typeof b.bio === "string") {
    const bio = b.bio.trim().slice(0, 600);
    if (STAFF_NAME.test(bio)) return fail(c, 400, "reserved_name", "Your bio cannot say you are PromoVote staff.");
    if (BIO_LINKS.test(bio)) return fail(c, 400, "bio_links", "Links go in the links section, not the bio.");
    stmts.push(db.prepare("update profiles set bio = ?, updated_at = ? where id = ?").bind(bio || null, now(), v.profile.id));
  }
  if (v.profile.type === "creator") {
    if (b.category !== undefined) {
      if (!CATEGORIES.includes(b.category)) return fail(c, 400, "bad_category", "Choose a category.");
      stmts.push(db.prepare("update creator_details set category = ?, kind = ?, updated_at = ? where profile_id = ?").bind(b.category, KIND_BY_CATEGORY[b.category], now(), v.profile.id));
    }
    if (Array.isArray(b.secondaryCategories)) {
      const sec = [...new Set(b.secondaryCategories.filter((x) => CATEGORIES.includes(x) && x !== b.category))].slice(0, 2);
      stmts.push(db.prepare("update creator_details set secondary_categories = ? where profile_id = ?").bind(JSON.stringify(sec), v.profile.id));
    }
    if (b.primaryCta !== undefined) {
      if (b.primaryCta !== null && !CTA_KINDS.includes(b.primaryCta)) return fail(c, 400, "bad_cta", "Unknown button type.");
      stmts.push(db.prepare("update creator_details set primary_cta = ? where profile_id = ?").bind(b.primaryCta, v.profile.id));
    }
    if (["live", "soon"].includes(b.releaseStatus)) stmts.push(db.prepare("update creator_details set release_status = ? where profile_id = ?").bind(b.releaseStatus, v.profile.id));
  }
  if (Array.isArray(b.interests)) {
    const list = [...new Set(b.interests.filter((x) => CATEGORIES.includes(x)))].slice(0, 7);
    stmts.push(db.prepare("update profiles set interests = ?, updated_at = ? where id = ?").bind(list.length ? JSON.stringify(list) : null, now(), v.profile.id));
  }
  if (LANGS.includes(b.language)) stmts.push(db.prepare("update account_private set language = ?, updated_at = ? where user_id = ?").bind(b.language, now(), v.user.id));
  if (typeof b.perkEmails === "boolean") stmts.push(db.prepare("update account_private set perk_email_opt_in = ? where user_id = ?").bind(+b.perkEmails, v.user.id));
  if (typeof b.followEmails === "boolean") stmts.push(db.prepare("update account_private set follow_email_opt_in = ? where user_id = ?").bind(+b.followEmails, v.user.id));
  if (stmts.length) await db.batch(stmts);
  return c.json({ ok: true });
});

// ------------------------------------------------------------------ profile links
// Up to 8 links. https only, no URL shorteners or link-in-bio pages, platform detected from the host.
// Known platforms and plain websites pass basic checks; a URL safety scan is added before user uploads open.
const LINK_HOSTS = [
  ["youtube", /(^|\.)(youtube\.com|youtu\.be)$/], ["twitch", /(^|\.)twitch\.tv$/], ["kick", /(^|\.)kick\.com$/],
  ["tiktok", /(^|\.)tiktok\.com$/], ["instagram", /(^|\.)instagram\.com$/], ["x", /(^|\.)(x\.com|twitter\.com)$/],
  ["steam", /(^|\.)(store\.steampowered\.com|steamcommunity\.com)$/], ["app_store", /(^|\.)apps\.apple\.com$/],
  ["google_play", /(^|\.)play\.google\.com$/], ["etsy", /(^|\.)etsy\.com$/], ["discord", /(^|\.)(discord\.gg|discord\.com)$/],
  ["itch", /(^|\.)itch\.io$/], ["amazon", /(^|\.)amazon\.(com|co\.uk|de|fr|it|es|ca|com\.mx|com\.br|co\.jp|in|com\.tr|nl|se|pl|com\.au)$/], ["shopify", /(^|\.)myshopify\.com$/],
  ["google_maps", /^(maps\.google\.com|www\.google\.com|maps\.app\.goo\.gl)$/],
];
const BAD_HOSTS = /(^|\.)(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at|linktr\.ee|beacons\.ai|lnk\.bio|taplink\.cc|linkin\.bio)$/;
function checkLink(raw) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch { return { error: "Enter a full link that starts with https://" }; }
  if (u.protocol !== "https:") return { error: "Links must start with https://" };
  const host = u.hostname.toLowerCase();
  if (/^[\d.]+$/.test(host) || host.includes(":") || !host.includes(".")) return { error: "Use a normal website address." };
  if (BAD_HOSTS.test(host) && !/^maps\.app\.goo\.gl$/.test(host)) return { error: "Short links and link-in-bio pages are not allowed. Add each link directly." };
  if (u.username || u.password) return { error: "Use a normal website address." };
  u.hash = "";
  const platform = (LINK_HOSTS.find(([, re]) => re.test(host)) || ["website"])[0];
  return { platform, url: u.toString().slice(0, 500) };
}
// Validates a list of {url, label}: up to 8, https, no shorteners, labels may not name another platform.
function validateLinks(raw) {
  const list = Array.isArray(raw) ? raw.slice(0, 9) : null;
  if (!list) return { code: "bad_links", error: "Send a list of links." };
  if (list.length > 8) return { code: "too_many_links", error: "You can add up to 8 links." };
  const rows = [];
  for (const [i, l] of list.entries()) {
    const r = checkLink(l?.url);
    if (r.error) return { code: "bad_link", error: `${r.error} (${String(l?.url || "").slice(0, 60)})` };
    const label = l?.label ? String(l.label).trim().slice(0, 40) : null;
    const PLATFORM_WORDS = /(app ?store|google ?play|steam|youtube|twitch|kick|tiktok|instagram|etsy|amazon|discord|itch|shopify|maps)/i;
    if (label && PLATFORM_WORDS.test(label) && !new RegExp(r.platform.replace("_", " ?"), "i").test(label.replace(/\s/g, " "))) {
      return { code: "bad_label", error: `The label "${label}" names a different platform than the link.` };
    }
    if (rows.some((x) => x.url === r.url)) continue;
    rows.push({ ...r, label, position: rows.length });
  }
  return { rows };
}
const BIO_LINKS = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|app|gg|ly)\b/i;

app.put("/v1/me/links", async (c) => {
  const [v, err] = await requireProfile(c, "creator");
  if (err) return err;
  const b = await c.req.json().catch(() => ({}));
  const checked = validateLinks(b.links);
  if (checked.error) return fail(c, 400, checked.code, checked.error);
  const rows = checked.rows;
  const db = c.env.DB, t = now();
  // A link a moderator blocked or flagged keeps that status when saved again (no laundering by re-saving).
  const { results: prev } = await db.prepare("select canonical_url, safety_status, click_count from profile_links where profile_id = ?").bind(v.profile.id).all();
  const prevBy = Object.fromEntries(prev.map((p) => [p.canonical_url, p]));
  // A URL our team blocked on any profile stays blocked everywhere, and blocked rows are never deleted.
  const blocked = rows.length ? await db.prepare("select canonical_url from profile_links where safety_status = 'blocked' and canonical_url in (select value from json_each(?)) limit 1").bind(JSON.stringify(rows.map((r) => r.url))).first() : null;
  if (blocked) return fail(c, 400, "link_blocked", "One of these links was removed by our team and cannot be added again.");
  await db.batch([
    db.prepare("delete from profile_links where profile_id = ? and safety_status != 'blocked'").bind(v.profile.id),
    ...rows.map((r) => db.prepare(
      "insert into profile_links (id, profile_id, platform, url_input, canonical_url, label, position, safety_status, last_scanned_at, click_count) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(uuid(), v.profile.id, r.platform, r.url, r.url, r.label, r.position, prevBy[r.url]?.safety_status || "safe", t, prevBy[r.url]?.click_count || 0)),
  ]);
  return c.json({ ok: true, links: rows.map((r) => ({ platform: r.platform, url: r.url, label: r.label })) });
});

// ------------------------------------------------------------------ media (avatar, banner) on R2
// The app resizes before upload (avatar 512 px, banner 1500 x 500). Served from api.promovote.com/media/...
// Moderation: shown right away; reports and the admin queue can remove it (image classifier comes with uploads).
const MEDIA_LIMITS = { avatar: 2 * 1024 * 1024, banner: 4 * 1024 * 1024 };
const MEDIA_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
app.post("/v1/me/media", async (c) => {
  const [v, err] = await requireProfile(c);
  if (err) return err;
  if (!c.env.MEDIA) return fail(c, 503, "media_unavailable", "Photo upload is not available yet.");
  const kind = c.req.query("kind");
  if (!MEDIA_LIMITS[kind]) return fail(c, 400, "bad_kind", "Choose avatar or banner.");
  const type = (c.req.header("Content-Type") || "").split(";")[0].trim();
  if (!MEDIA_TYPES[type]) return fail(c, 400, "bad_type", "Use a JPEG, PNG or WebP image.");
  const declared = +(c.req.header("Content-Length") || 0);
  if (!declared || declared > MEDIA_LIMITS[kind]) return fail(c, 413, "too_large", "That image is too large.");
  const body = await c.req.arrayBuffer();
  if (!body.byteLength || body.byteLength > MEDIA_LIMITS[kind]) return fail(c, 413, "too_large", "That image is too large.");
  // Trust the file bytes, not the header: JPEG FF D8 FF, PNG 89 50 4E 47, WebP "RIFF....WEBP".
  const h = new Uint8Array(body.slice(0, 12));
  const isJpeg = h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff;
  const isPng = h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47;
  const isWebp = String.fromCharCode(...h.slice(0, 4)) === "RIFF" && String.fromCharCode(...h.slice(8, 12)) === "WEBP";
  if (!((type === "image/jpeg" && isJpeg) || (type === "image/png" && isPng) || (type === "image/webp" && isWebp))) return fail(c, 400, "bad_type", "Use a JPEG, PNG or WebP image.");
  const id = uuid();
  const key = `profiles/${v.profile.id}/${kind}-${id}.${MEDIA_TYPES[type]}`;
  await c.env.MEDIA.put(key, body, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } });
  const url = `${c.env.API_URL || "https://api.promovote.com"}/media/${key}`;
  const db = c.env.DB;
  const old = await db.prepare(`select ${kind === "avatar" ? "avatar_url" : "banner_url"} as u from profiles where id = ?`).bind(v.profile.id).first();
  await db.batch([
    db.prepare("insert into media_assets (id, owner_user_id, kind, r2_key, public_url, bytes, mime, moderation_status) values (?, ?, ?, ?, ?, ?, ?, 'approved')").bind(id, v.user.id, kind, key, url, body.byteLength, type),
    db.prepare(`update profiles set ${kind === "avatar" ? "avatar_url" : "banner_url"} = ?, ${kind === "avatar" ? "avatar_media_id" : "banner_media_id"} = ?, updated_at = ? where id = ?`).bind(url, id, now(), v.profile.id),
  ]);
  // Remove the previous file we stored (curated founder media on promovote.com is left alone).
  const prefix = `${c.env.API_URL || "https://api.promovote.com"}/media/`;
  if (old?.u && old.u.startsWith(prefix)) await c.env.MEDIA.delete(old.u.slice(prefix.length)).catch(() => {});
  return c.json({ ok: true, url }, 201);
});
app.get("/media/*", async (c) => {
  if (!c.env.MEDIA) return c.notFound();
  const key = c.req.path.slice("/media/".length);
  if (!/^profiles\/[a-f0-9-]{36}\/(avatar|banner)-[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key)) return c.notFound();
  const obj = await c.env.MEDIA.get(key);
  if (!obj) return c.notFound();
  return new Response(obj.body, { headers: { "Content-Type": obj.httpMetadata?.contentType || "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
});

// ------------------------------------------------------------------ perks (gifts)
// A creator offers one active gift at a time (v1): a shared code, a discount or a beta invite.
// RULE: claiming a perk never depends on calls, follows, saves or watch time. Any signed in person can claim it.
// The claim handler below reads only the perk and the claimer's user id; do not add votes or follows to it.
// Codes are stored encrypted (AES-GCM, key derived from BETTER_AUTH_SECRET).
const PERK_KINDS = ["code", "discount", "beta_invite"];
const GIFT_CONDITIONS = /\b(vote|votes|voting|follow|follows|following|like|likes|subscribe|review|reviews|rate|rating|call|calls|share|shares|comment|comments)\b/i;
async function perkKey(env) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.BETTER_AUTH_SECRET || (() => { throw new Error("BETTER_AUTH_SECRET missing"); })()), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("promovote-perks"), info: new Uint8Array() }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function sealCode(env, code) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await perkKey(env), new TextEncoder().encode(code)));
  return `${b64(iv)}.${b64(ct)}`;
}
async function openCode(env, sealed) {
  if (sealed.startsWith("plain:")) return sealed.slice(6); // founder seed codes that are public anyway
  const [iv, ct] = sealed.split(".");
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await perkKey(env), unb64(ct)));
}
const perkOut = (k) => ({
  id: k.id, kind: k.kind, title: k.title, description: k.description, redeemUrl: k.redeem_url,
  endsAt: k.ends_at, stockLeft: k.stock_left, status: k.status,
});

app.post("/v1/me/perks", async (c) => {
  const [v, err] = await requireProfile(c, "creator");
  if (err) return err;
  const b = await c.req.json().catch(() => ({}));
  const title = String(b.title || "").trim();
  if (title.length < 3 || title.length > 60) return fail(c, 400, "bad_title", "Title must be 3 to 60 characters.");
  const kind = PERK_KINDS.includes(b.kind) ? b.kind : "code";
  const code = String(b.code || "").trim();
  if (code.length < 2 || code.length > 64) return fail(c, 400, "bad_code", "Enter the code people will use (2 to 64 characters).");
  const description = b.description ? String(b.description).trim().slice(0, 200) : null;
  // Gifts can never ask for anything in return, in the title or the description.
  if (GIFT_CONDITIONS.test(`${title} ${description || ""}`)) return fail(c, 400, "no_conditions", "Gifts cannot ask for votes, follows, likes, reviews or shares.");
  if (STAFF_NAME.test(`${title} ${description || ""}`)) return fail(c, 400, "reserved_name", "Gifts cannot say they come from PromoVote staff.");
  // Only creators with a live promo (or verified) can offer gifts, so a brand new account cannot post a fake one.
  if (!v.profile.is_verified) {
    const live = await c.env.DB.prepare("select 1 from promos where creator_profile_id = ? and status = 'live' limit 1").bind(v.profile.id).first();
    if (!live) return fail(c, 403, "gift_needs_promo", "Gifts open after your first promo is live.");
  }
  let redeem = null;
  if (b.redeemUrl) { const r = checkLink(b.redeemUrl); if (r.error) return fail(c, 400, "bad_link", r.error); redeem = r.url; }
  const days = Math.max(1, Math.min(90, Math.floor(+b.days || 30)));
  const stock = b.stock ? Math.max(1, Math.min(10000, Math.floor(+b.stock))) : null;
  const db = c.env.DB, id = uuid(), t = now();
  const ends = new Date(Date.now() + days * 864e5).toISOString();
  await db.batch([
    db.prepare("update perks set status = 'ended' where creator_profile_id = ? and status = 'active'").bind(v.profile.id),
    db.prepare(`insert into perks (id, creator_profile_id, kind, mode, title, description, redeem_url, stock_total, stock_left, starts_at, ends_at, status)
                values (?, ?, ?, 'shared', ?, ?, ?, ?, ?, ?, ?, 'active')`).bind(id, v.profile.id, kind, title, description, redeem, stock, stock, t, ends),
    db.prepare("insert into perk_codes (id, perk_id, code_encrypted) values (?, ?, ?)").bind(uuid(), id, await sealCode(c.env, code)),
  ]);
  return c.json({ ok: true, id }, 201);
});

app.delete("/v1/me/perks/:id", async (c) => {
  const [v, err] = await requireProfile(c, "creator");
  if (err) return err;
  await c.env.DB.prepare("update perks set status = 'ended' where id = ? and creator_profile_id = ?").bind(c.req.param("id"), v.profile.id).run();
  return c.json({ ok: true });
});

// The active gift of a creator, public (no code).
app.get("/v1/creators/:handle/perk", async (c) => {
  const k = await c.env.DB.prepare(
    `select k.* from perks k join profiles p on p.id = k.creator_profile_id where p.handle = ? and k.status = 'active'
     and k.ends_at > ? and (k.stock_left is null or k.stock_left > 0) order by k.created_at desc limit 1`,
  ).bind(c.req.param("handle").toLowerCase(), now()).first();
  return c.json({ perk: k ? perkOut(k) : null });
});

// Claim: needs a signed in account, nothing else (see RULE above).
app.post("/v1/perks/:id/claim", async (c) => {
  const [v, err] = await requireProfile(c);
  if (err) return err;
  const db = c.env.DB, id = c.req.param("id");
  const k = await db.prepare("select * from perks where id = ? and status = 'active' and ends_at > ?").bind(id, now()).first();
  if (!k) return fail(c, 404, "perk_ended", "This gift has ended.");
  // Claim first, then take stock only for a new claim, so two taps at once never use two units.
  const ins = await db.prepare("insert or ignore into perk_claims (perk_id, user_id) values (?, ?)").bind(id, v.user.id).run();
  if (ins.meta.changes && k.stock_left !== null) {
    const r = await db.prepare("update perks set stock_left = stock_left - 1 where id = ? and stock_left > 0").bind(id).run();
    if (!r.meta.changes) {
      await db.prepare("delete from perk_claims where perk_id = ? and user_id = ?").bind(id, v.user.id).run();
      return fail(c, 410, "perk_gone", "All gifts have been claimed.");
    }
  }
  const code = await db.prepare("select code_encrypted from perk_codes where perk_id = ? limit 1").bind(id).first();
  return c.json({ ok: true, perk: perkOut(k), code: code ? await openCode(c.env, code.code_encrypted) : null });
});

// Wallet: gifts this person claimed (with codes). Creators also get their own gifts with claim counts.
app.get("/v1/me/perks", async (c) => {
  const v = await viewer(c);
  if (!v) return fail(c, 401, "auth_required", "Sign in first.");
  const db = c.env.DB;
  const { results: claimed } = await db.prepare(
    `select k.*, p.handle, p.display_name, p.avatar_url, cl.claimed_at, pc.code_encrypted from perk_claims cl
     join perks k on k.id = cl.perk_id join profiles p on p.id = k.creator_profile_id
     left join perk_codes pc on pc.perk_id = k.id where cl.user_id = ? order by cl.claimed_at desc limit 100`,
  ).bind(v.user.id).all();
  const wallet = [];
  for (const r of claimed) wallet.push({ ...perkOut(r), creator: { handle: r.handle, name: r.display_name, avatar: r.avatar_url }, claimedAt: r.claimed_at, code: r.code_encrypted ? await openCode(c.env, r.code_encrypted) : null });
  let own = [];
  if (v.profile?.type === "creator") {
    const { results } = await db.prepare("select k.*, (select count(*) from perk_claims cl where cl.perk_id = k.id) as claims from perks k where k.creator_profile_id = ? order by k.created_at desc limit 20").bind(v.profile.id).all();
    own = results.map((k) => ({ ...perkOut(k), claims: k.claims }));
  }
  c.header("Cache-Control", "no-store");
  return c.json({ wallet, own });
});

// ------------------------------------------------------------------ own profile summaries
// Scout: Scout Score (reputation only, no cash value), level, open calls with their result date, saved, following.
app.get("/v1/me/scout", async (c) => {
  const [v, err] = await requireProfile(c, "scout");
  if (err) return err;
  const lang = langOf(c), db = c.env.DB;
  const [stats, open, done, saved, following, recent, week] = await db.batch([
    db.prepare("select * from scout_stats where profile_id = ?").bind(v.profile.id),
    db.prepare(PROMO_SELECT.replace("select pr.id,", "select ca.choice as call_choice, ca.created_at as call_at, ca.voter_ordinal as call_rank, pr.id,").replace("from promos pr", "from calls ca join promos pr on pr.id = ca.promo_id") + " and ca.scout_profile_id = ? and ca.outcome = 'pending' order by ca.created_at desc limit 50").bind(v.profile.id),
    db.prepare("select count(*) as n, sum(outcome = 'correct') as right, sum(is_called_it) as called_it from calls where scout_profile_id = ? and outcome in ('correct', 'incorrect')").bind(v.profile.id),
    db.prepare(PROMO_SELECT.replace("from promos pr", "from saves sv join promos pr on pr.id = sv.promo_id") + " and sv.scout_profile_id = ? order by sv.created_at desc limit 60").bind(v.profile.id),
    db.prepare("select p.handle, p.display_name, p.avatar_url, p.i18n from follows f join profiles p on p.id = f.creator_profile_id where f.follower_profile_id = ? and p.status = 'active' order by f.created_at desc limit 100").bind(v.profile.id),
    db.prepare(PROMO_SELECT.replace("select pr.id,", "select ca.choice as call_choice, ca.outcome as call_outcome, ca.score_delta as call_delta, ca.resolved_at as call_resolved, pr.id,").replace("from promos pr", "from calls ca join promos pr on pr.id = ca.promo_id") + " and ca.scout_profile_id = ? and ca.outcome in ('correct', 'incorrect', 'void') order by ca.resolved_at desc limit 20").bind(v.profile.id),
    db.prepare("select count(distinct substr(created_at, 1, 10)) as days from calls where scout_profile_id = ? and created_at >= ?").bind(v.profile.id, weekStart(new Date()).toISOString()),
  ]);
  const st = stats.results[0] || { scout_score: 0, level: 1, current_streak_weeks: 0 };
  const d = done.results[0] || {};
  c.header("Cache-Control", "no-store");
  return c.json({
    score: st.scout_score, level: st.level, nextLevelAt: nextLevelAt(st.level), streakWeeks: st.current_streak_weeks,
    streak: { weeks: st.current_streak_weeks || 0, best: st.best_streak_weeks || 0, freezes: st.freezes_available || 0, daysThisWeek: week.results[0]?.days || 0, daysNeeded: STREAK_DAYS },
    resolved: d.n || 0, right: d.right || 0, calledIt: d.called_it || 0,
    open: open.results.map((r) => ({ promo: promoOut(r, lang), choice: r.call_choice, rank: r.call_rank, resolvesAt: new Date(new Date(r.call_at).getTime() + CALL_DAYS * 864e5).toISOString(), finalBy: new Date(new Date(r.call_at).getTime() + RESOLVE_MAX_DAYS * 864e5).toISOString() })),
    accuracy: d.n ? Math.round((100 * (d.right || 0)) / d.n) : null,
    results: recent.results.map((r) => ({ promo: promoOut(r, lang), choice: r.call_choice, outcome: r.call_outcome, points: r.call_delta || 0, resolvedAt: r.call_resolved })),
    saved: saved.results.map((r) => promoOut(r, lang)),
    following: following.results.map((r) => ({ handle: r.handle, name: r.display_name, avatar: r.avatar_url, mono: (json(r.i18n) || {}).mono || null })),
  });
});

// Creator studio: setup checklist, links, promos and free stats (7 and 28 days). Delivery numbers stay free forever.
// Activity (founder request 2026-10-07, like the TikTok and Instagram inbox). Built from existing rows, nothing stored.
// Scouts: call results and new promos from followed creators. Creators: weekly totals only, never who followed or saved.
// Creators mark their own promo as made or changed with AI (founder request 2026-10-08). The upload form will ask
// the same question when uploads open. Promos of virtual creators are always labeled.
app.patch("/v1/me/promos/:id", async (c) => {
  const [v, err] = await requireProfile(c, "creator");
  if (err) return err;
  const b = await c.req.json().catch(() => ({}));
  if (typeof b.aiGenerated !== "boolean") return fail(c, 400, "bad_request", "Send aiGenerated true or false.");
  const r = await c.env.DB.prepare("update promos set ai_generated = ? where id = ? and creator_profile_id = ?").bind(b.aiGenerated ? 1 : 0, c.req.param("id"), v.profile.id).run();
  if (!r.meta.changes) return fail(c, 404, "not_found", "Promo not found.");
  return c.json({ ok: true, aiGenerated: b.aiGenerated });
});

app.get("/v1/me/activity", async (c) => {
  const [v, err] = await requireProfile(c);
  if (err) return err;
  const lang = langOf(c);
  const db = c.env.DB;
  const items = [];
  if (v.profile.type === "scout") {
    const since30 = new Date(Date.now() - 30 * 864e5).toISOString(), since14 = new Date(Date.now() - 14 * 864e5).toISOString();
    const [results, fresh] = await db.batch([
      db.prepare(PROMO_SELECT.replace("select pr.id,", "select ca.choice as call_choice, ca.outcome as call_outcome, ca.score_delta as call_delta, ca.resolved_at as call_resolved, pr.id,").replace("from promos pr", "from calls ca join promos pr on pr.id = ca.promo_id")
        + " and ca.scout_profile_id = ? and ca.outcome in ('correct', 'incorrect', 'void') and ca.resolved_at >= ? order by ca.resolved_at desc limit 20").bind(v.profile.id, since30),
      db.prepare(PROMO_SELECT + ` and pr.creator_profile_id in (select creator_profile_id from follows where follower_profile_id = ?1)
        and pr.creator_profile_id not in (select blocked_profile_id from blocks where blocker_profile_id = ?1) and pr.live_at >= ?2 order by pr.live_at desc limit 20`).bind(v.profile.id, since14),
    ]);
    for (const r of results.results) items.push({ kind: "result", at: r.call_resolved, outcome: r.call_outcome, choice: r.call_choice, points: r.call_delta || 0, promo: promoOut(r, lang) });
    for (const r of fresh.results) items.push({ kind: "new_promo", at: r.live_at, promo: promoOut(r, lang) });
  } else {
    const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
    const w = await db.prepare(`select
        (select count(*) from follows where creator_profile_id = ?1 and created_at >= ?2) as followers,
        (select count(*) from saves s join promos pr on pr.id = s.promo_id where pr.creator_profile_id = ?1 and s.created_at >= ?2) as saves,
        (select count(*) from calls ca join promos pr on pr.id = ca.promo_id where pr.creator_profile_id = ?1 and ca.is_valid = 1 and ca.created_at >= ?2) as calls`).bind(v.profile.id, since7).first();
    for (const k of ["followers", "saves", "calls"]) if (w?.[k]) items.push({ kind: "week_" + k, at: now(), n: w[k] });
  }
  items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return c.json({ items: items.slice(0, 40) });
});

app.get("/v1/me/studio", async (c) => {
  const [v, err] = await requireProfile(c, "creator");
  if (err) return err;
  const lang = langOf(c), db = c.env.DB;
  const d7 = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const d28 = new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10);
  const pid = v.profile.id;
  const [prof, links, promos, views7, views28, clicks7, clicks28, saves, follows, linkTaps, calls] = await db.batch([
    db.prepare("select p.display_name, p.bio, p.avatar_url, p.banner_url, p.follower_count, d.category, d.secondary_categories, d.primary_cta, d.release_status from profiles p join creator_details d on d.profile_id = p.id where p.id = ?").bind(pid),
    db.prepare("select platform, canonical_url, label from profile_links where profile_id = ? order by position").bind(pid),
    db.prepare(PROMO_SELECT + " and pr.creator_profile_id = ? order by pr.live_at desc limit 60").bind(pid),
    db.prepare("select count(*) as n, sum(completed) as done, avg(max_seconds) as secs from view_events v join promos pr on pr.id = v.promo_id where pr.creator_profile_id = ? and v.day >= ? and v.is_boost = 0").bind(pid, d7),
    db.prepare("select count(*) as n, sum(completed) as done, avg(max_seconds) as secs from view_events v join promos pr on pr.id = v.promo_id where pr.creator_profile_id = ? and v.day >= ? and v.is_boost = 0").bind(pid, d28),
    db.prepare("select count(*) as n from click_events e join promos pr on pr.id = e.promo_id where pr.creator_profile_id = ? and e.day >= ? and e.is_boost = 0").bind(pid, d7),
    db.prepare("select count(*) as n from click_events e join promos pr on pr.id = e.promo_id where pr.creator_profile_id = ? and e.day >= ? and e.is_boost = 0").bind(pid, d28),
    db.prepare("select count(*) as n, sum(s.created_at >= ?2) as n7, sum(s.created_at >= ?3) as n28 from saves s join promos pr on pr.id = s.promo_id where pr.creator_profile_id = ?1").bind(pid, d7, d28),
    db.prepare("select sum(created_at >= ?2) as n7, sum(created_at >= ?3) as n28 from follows where creator_profile_id = ?1").bind(pid, d7, d28),
    db.prepare("select sum(day >= ?2) as n7, sum(day >= ?3) as n28 from link_click_events where profile_id = ?1").bind(pid, d7, d28),
    db.prepare("select count(*) as n, sum(choice = 'will_blow_up') as up from calls ca join promos pr on pr.id = ca.promo_id where pr.creator_profile_id = ? and ca.is_valid = 1").bind(pid),
  ]);
  const p = prof.results[0] || {};
  const sv = saves.results[0] || {}, fw = follows.results[0] || {}, lt = linkTaps.results[0] || {};
  const stat = (v, cl, saved, followed, taps) => ({ saves: saved || 0, follows: followed || 0, linkTaps: taps || 0, views: v.n || 0, completion: v.n ? Math.round((100 * (v.done || 0)) / v.n) : 0, avgSeconds: Math.round(v.secs || 0), clicks: cl.n || 0, ctr: v.n ? Math.round((1000 * (cl.n || 0)) / v.n) / 10 : 0 });
  const cl = calls.results[0] || {};
  const checklist = {
    logo: !!p.avatar_url, banner: !!p.banner_url, bio: !!p.bio, links: links.results.length > 0, promo: promos.results.length > 0,
  };
  c.header("Cache-Control", "no-store");
  return c.json({
    profile: { name: p.display_name, bio: p.bio, avatar: p.avatar_url, banner: p.banner_url, followers: p.follower_count || 0,
      category: p.category, secondaryCategories: json(p.secondary_categories) || [], primaryCta: p.primary_cta, releaseStatus: p.release_status },
    links: links.results.map((l) => ({ platform: l.platform, url: l.canonical_url, label: l.label })),
    checklist,
    stats: { d7: stat(views7.results[0] || {}, clicks7.results[0] || {}, sv.n7, fw.n7, lt.n7), d28: stat(views28.results[0] || {}, clicks28.results[0] || {}, sv.n28, fw.n28, lt.n28), saves: sv.n || 0, followers: p.follower_count || 0 },
    // The vote split is shown to the owner only after 30 calls, so a few early votes do not mislead.
    calls: (cl.n || 0) >= 30 ? { total: cl.n, blowUpPct: Math.round((100 * (cl.up || 0)) / cl.n) } : { total: cl.n || 0, blowUpPct: null },
    promos: promos.results.map((r) => promoOut(r, lang)),
  });
});

// Apple 5.1.1(v): delete from inside the app. 30 day grace, then the daily job removes the user.
app.delete("/v1/me", async (c) => {
  const v = await viewer(c);
  if (!v) return fail(c, 401, "auth_required", "Sign in first.");
  const db = c.env.DB, t = now();
  const stmts = [db.prepare('delete from "session" where userId = ?').bind(v.user.id)];
  if (v.profile) stmts.unshift(db.prepare("update profiles set status = 'pending_deletion', deletion_requested_at = ?, updated_at = ? where id = ?").bind(t, t, v.profile.id));
  stmts.unshift(db.prepare("insert into data_requests (id, user_id, kind) values (?, ?, 'delete_account')").bind(uuid(), v.user.id));
  await db.batch(stmts);
  return c.json({ ok: true, deleteAfterDays: 30 });
});

// Signing in during the 30 day grace period offers this.
app.post("/v1/me/restore", async (c) => {
  const v = await viewer(c);
  if (!v?.profile) return fail(c, 401, "auth_required", "Sign in first.");
  if (v.profile.status !== "pending_deletion") return c.json({ ok: true, restored: false });
  const db = c.env.DB;
  await db.batch([
    db.prepare("update profiles set status = 'active', deletion_requested_at = null, updated_at = ? where id = ?").bind(now(), v.profile.id),
    db.prepare("update data_requests set status = 'cancelled' where user_id = ? and kind = 'delete_account' and status = 'pending'").bind(v.user.id),
  ]);
  return c.json({ ok: true, restored: true });
});

// ------------------------------------------------------------------ social actions
async function creatorByHandle(db, handle) {
  return db.prepare("select id, owner_user_id from profiles where handle = ? and type = 'creator' and status = 'active'").bind(String(handle).toLowerCase()).first();
}

app.post("/v1/follows/:handle", async (c) => {
  const [v, err] = await requireProfile(c);
  if (err) return err;
  const db = c.env.DB;
  const target = await creatorByHandle(db, c.req.param("handle"));
  if (!target) return fail(c, 404, "not_found", "Creator not found.");
  if (target.id === v.profile.id) return fail(c, 400, "self_follow", "You cannot follow yourself.");
  const blocked = await db.prepare("select 1 from blocks where (blocker_profile_id = ?1 and blocked_profile_id = ?2) or (blocker_profile_id = ?2 and blocked_profile_id = ?1)").bind(v.profile.id, target.id).first();
  if (blocked) return fail(c, 403, "blocked", "You cannot follow this creator.");
  const b = await c.req.json().catch(() => ({}));
  const source = ["profile", "feed", "explore", "share"].includes(b.source) ? b.source : "other";
  const r = await db.prepare("insert or ignore into follows (follower_profile_id, creator_profile_id, source) values (?, ?, ?)").bind(v.profile.id, target.id, source).run();
  const n = r.meta.changes
    ? await db.prepare("update profiles set follower_count = follower_count + 1 where id = ? returning follower_count").bind(target.id).first()
    : await db.prepare("select follower_count from profiles where id = ?").bind(target.id).first();
  return c.json({ ok: true, following: true, followers: n?.follower_count ?? null });
});

app.delete("/v1/follows/:handle", async (c) => {
  const [v, err] = await requireProfile(c);
  if (err) return err;
  const db = c.env.DB;
  const target = await creatorByHandle(db, c.req.param("handle"));
  if (!target) return fail(c, 404, "not_found", "Creator not found.");
  const r = await db.prepare("delete from follows where follower_profile_id = ? and creator_profile_id = ?").bind(v.profile.id, target.id).run();
  const n = r.meta.changes
    ? await db.prepare("update profiles set follower_count = max(follower_count - 1, 0) where id = ? returning follower_count").bind(target.id).first()
    : await db.prepare("select follower_count from profiles where id = ?").bind(target.id).first();
  return c.json({ ok: true, following: false, followers: n?.follower_count ?? null });
});

async function livePromo(db, id) {
  return db.prepare(
    "select pr.id, pr.creator_profile_id, (select max(duration_ms) from promo_videos v where v.promo_id = pr.id) as duration_ms from promos pr where pr.id = ? and pr.status = 'live'",
  ).bind(id).first();
}

// Votes ("calls"): scouts only, one per promo, skip is free and not stored. A call resolves 7 days after it
// is made (per call, so late joiners can still be right). The crowd split is returned only after voting.
const CALL_DAYS = 7;
async function callInfo(db, promoId, profileId) {
  const [mine, split] = await db.batch([
    db.prepare("select choice, voter_ordinal, created_at, outcome from calls where promo_id = ? and scout_profile_id = ?").bind(promoId, profileId),
    db.prepare("select sum(choice = 'will_blow_up') as up, count(*) as n from calls where promo_id = ? and is_valid = 1").bind(promoId),
  ]);
  const m = mine.results[0];
  if (!m) return null;
  const s = split.results[0] || { up: 0, n: 0 };
  return {
    choice: m.choice,
    rank: m.voter_ordinal,
    resolvesAt: new Date(new Date(m.created_at).getTime() + CALL_DAYS * 864e5).toISOString(),
    outcome: m.outcome,
    split: { total: s.n || 0, blowUpPct: s.n ? Math.round((100 * (s.up || 0)) / s.n) : 0 },
  };
}

app.post("/v1/calls", async (c) => {
  const [v, err] = await requireProfile(c, "scout");
  if (err) return err;
  const b = await c.req.json().catch(() => ({}));
  if (!["will_blow_up", "not_for_me"].includes(b.choice)) return fail(c, 400, "bad_choice", "Unknown vote.");
  const db = c.env.DB;
  const promo = await livePromo(db, b.promoId);
  if (!promo) return fail(c, 404, "not_found", "Promo not found.");
  // Only the first SCORED_CALLS_PER_DAY calls of a scout per UTC day can earn points.
  const r = await db.prepare(
    `insert or ignore into calls (id, scout_profile_id, promo_id, choice, voter_ordinal, score_eligible)
     values (?, ?, ?, ?, (select count(*) + 1 from calls where promo_id = ?),
       (select count(*) < ? from calls where scout_profile_id = ? and score_eligible = 1 and created_at >= ?))`,
  ).bind(uuid(), v.profile.id, promo.id, b.choice, promo.id, SCORED_CALLS_PER_DAY, v.profile.id, today() + "T00:00:00.000Z").run();
  const info = await callInfo(db, promo.id, v.profile.id);
  if (!r.meta.changes) return c.json({ error: { code: "already_voted", message: "You already called this promo." }, call: info }, 409);
  return c.json({ ok: true, call: info }, 201);
});

// What the signed in scout already did, so buttons show the right state after a restart.
app.get("/v1/me/state", async (c) => {
  const v = await viewer(c);
  if (!v?.profile) return c.json({ calls: {}, saves: [], following: [], blocked: [] });
  const db = c.env.DB;
  const [calls, saves, follows, blocks] = await db.batch([
    db.prepare("select promo_id, choice, voter_ordinal, created_at, outcome, score_delta from calls where scout_profile_id = ? order by created_at desc limit 500").bind(v.profile.id),
    db.prepare("select promo_id from saves where scout_profile_id = ? order by created_at desc limit 500").bind(v.profile.id),
    db.prepare("select p.handle from follows f join profiles p on p.id = f.creator_profile_id where f.follower_profile_id = ? limit 500").bind(v.profile.id),
    db.prepare("select p.handle from blocks b join profiles p on p.id = b.blocked_profile_id where b.blocker_profile_id = ? limit 500").bind(v.profile.id),
  ]);
  c.header("Cache-Control", "no-store");
  return c.json({
    calls: Object.fromEntries(calls.results.map((r) => [r.promo_id, {
      choice: r.choice, rank: r.voter_ordinal, outcome: r.outcome, points: r.score_delta || 0,
      resolvesAt: new Date(new Date(r.created_at).getTime() + CALL_DAYS * 864e5).toISOString(),
      finalBy: new Date(new Date(r.created_at).getTime() + RESOLVE_MAX_DAYS * 864e5).toISOString(),
    }])),
    saves: saves.results.map((r) => r.promo_id),
    following: follows.results.map((r) => r.handle),
    blocked: blocks.results.map((r) => r.handle),
  });
});

app.post("/v1/saves/:promoId", async (c) => {
  const [v, err] = await requireProfile(c, "scout");
  if (err) return err;
  const db = c.env.DB;
  const promo = await livePromo(db, c.req.param("promoId"));
  if (!promo) return fail(c, 404, "not_found", "Promo not found.");
  await db.prepare("insert or ignore into saves (scout_profile_id, promo_id) values (?, ?)").bind(v.profile.id, promo.id).run();
  return c.json({ ok: true, saved: true });
});

app.delete("/v1/saves/:promoId", async (c) => {
  const [v, err] = await requireProfile(c, "scout");
  if (err) return err;
  await c.env.DB.prepare("delete from saves where scout_profile_id = ? and promo_id = ?").bind(v.profile.id, c.req.param("promoId")).run();
  return c.json({ ok: true, saved: false });
});

app.get("/v1/saves", async (c) => {
  const [v, err] = await requireProfile(c, "scout");
  if (err) return err;
  const { results } = await c.env.DB.prepare(PROMO_SELECT + " and pr.id in (select promo_id from saves where scout_profile_id = ?) order by pr.live_at desc").bind(v.profile.id).all();
  return c.json({ promos: results.map((r) => promoOut(r, langOf(c))) });
});

// View and click events. Guests send a random device id; signed in viewers are keyed by profile.
// One row per viewer, promo and day, so refreshing cannot inflate numbers.
const DEVICE_RE = /^[a-f0-9-]{16,64}$/i;
async function trackEvent(c, table) {
  const b = await c.req.json().catch(() => ({}));
  const v = await viewer(c);
  const key = v?.profile ? `p:${v.profile.id}` : DEVICE_RE.test(b.deviceId || "") ? `d:${b.deviceId}` : null;
  if (!key) return fail(c, 400, "bad_device", "Missing device id.");
  const db = c.env.DB;
  const promo = await livePromo(db, b.promoId);
  if (!promo) return fail(c, 404, "not_found", "Promo not found.");
  if (v?.profile?.id === promo.creator_profile_id) return c.json({ ok: true, counted: false });
  const guest = v?.profile ? 0 : 1;
  if (table === "view_events") {
    // Seconds can never exceed the video length (plus 1 s rounding), so a client cannot fake long watches.
    const maxSecs = promo.duration_ms ? Math.ceil(promo.duration_ms / 1000) + 1 : 60;
    const secs = Math.max(0, Math.min(maxSecs, Math.floor(+b.seconds || 0)));
    if (secs < 3) return c.json({ ok: true, counted: false });
    const r = await db.prepare(
      `insert into view_events (promo_id, viewer_key, day, is_guest, max_seconds, completed, country_code) values (?, ?, ?, ?, ?, ?, ?)
       on conflict (promo_id, viewer_key, day) do update set max_seconds = max(max_seconds, excluded.max_seconds), completed = max(completed, excluded.completed)`,
    ).bind(promo.id, key, today(), guest, secs, b.completed ? 1 : 0, c.req.raw.cf?.country || null).run();
    return c.json({ ok: true, counted: !!r.meta.changes });
  }
  await db.prepare("insert or ignore into click_events (promo_id, viewer_key, day, is_guest) values (?, ?, ?, ?)").bind(promo.id, key, today(), guest).run();
  return c.json({ ok: true });
}
// Funnel steps (see docs/review: activation and D1/D7 come from these). Unknown names are ignored.
// D7 example: select count(distinct a.viewer_key) from app_events a join app_events b on b.viewer_key = a.viewer_key
//   and b.name = 'app_open' and b.day = date(a.day, '+7 day') where a.name = 'app_open' and a.day = ?;
const APP_EVENTS = new Set(["app_open", "drop_view", "first_call", "call", "drop_complete", "sign_in_view", "sign_in_done", "onboarding_done", "reminder_on", "reveal_view", "share", "gift_claim"]);
app.post("/v1/events/app", async (c) => {
  const b = await c.req.json().catch(() => ({}));
  if (!APP_EVENTS.has(b.name)) return c.json({ ok: true, counted: false });
  const v = await viewer(c);
  const key = v?.profile ? `p:${v.profile.id}` : DEVICE_RE.test(b.deviceId || "") ? `d:${b.deviceId}` : null;
  if (!key) return fail(c, 400, "bad_device", "Missing device id.");
  const r = await c.env.DB.prepare("insert or ignore into app_events (name, viewer_key, day) values (?, ?, ?)").bind(b.name, key, today()).run();
  return c.json({ ok: true, counted: !!r.meta.changes });
});

// The stored form of an outbound link: no utm tags, no trailing slash (withUtm adds a "/" to bare domains).
const plainUrl = (raw) => {
  try {
    const u = new URL(String(raw || ""));
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) u.searchParams.delete(k);
    return u.toString().replace(/\/$/, "");
  } catch { return ""; }
};
// Profile link taps: one per viewer per link per day; the owner's own taps do not count.
app.post("/v1/events/link", async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const v = await viewer(c);
  const key = v?.profile ? `p:${v.profile.id}` : DEVICE_RE.test(b.deviceId || "") ? `d:${b.deviceId}` : null;
  if (!key) return fail(c, 400, "bad_device", "Missing device id.");
  const db = c.env.DB;
  const link = await db.prepare(
    "select l.profile_id, l.canonical_url from profile_links l join profiles p on p.id = l.profile_id where p.handle = ? and p.status = 'active' and l.safety_status = 'safe' and rtrim(l.canonical_url, '/') = ?",
  ).bind(String(b.handle || "").toLowerCase(), plainUrl(b.url)).first();
  if (!link) return c.json({ ok: true, counted: false });
  if (v?.profile?.id === link.profile_id) return c.json({ ok: true, counted: false });
  const r = await db.prepare("insert or ignore into link_click_events (profile_id, url, viewer_key, day) values (?, ?, ?, ?)").bind(link.profile_id, link.canonical_url, key, today()).run();
  return c.json({ ok: true, counted: !!r.meta.changes });
});
app.post("/v1/events/view", (c) => trackEvent(c, "view_events"));
app.post("/v1/events/click", (c) => trackEvent(c, "click_events"));

const REPORT_REASONS = ["undisclosed_ai", "impersonation", "spam_or_scam", "malicious_link", "nudity_or_sexual", "hate_or_harassment", "violence", "copyright", "trademark", "minor", "misleading_perk", "perk_not_working", "asks_for_votes_or_follows", "other"];
const REPORT_TARGETS = ["profile", "promo", "link", "perk", "hashtag", "bio", "avatar", "banner", "display_name"];
app.post("/v1/reports", async (c) => {
  const v = await viewer(c);
  if (!v) return fail(c, 401, "auth_required", "Sign in to report.");
  const b = await c.req.json().catch(() => ({}));
  if (!REPORT_REASONS.includes(b.reason) || !REPORT_TARGETS.includes(b.targetType) || !b.targetId) return fail(c, 400, "bad_report", "Choose what is wrong.");
  const db = c.env.DB;
  let targetProfile = null;
  if (b.targetType === "promo") targetProfile = (await db.prepare("select creator_profile_id as id from promos where id = ?").bind(b.targetId).first())?.id;
  else if (b.targetType === "profile") targetProfile = (await db.prepare("select id from profiles where id = ? or handle = ?").bind(b.targetId, b.targetId).first())?.id;
  const priority = ["minor", "malicious_link"].includes(b.reason) ? 1 : ["spam_or_scam", "nudity_or_sexual", "hate_or_harassment", "violence"].includes(b.reason) ? 2 : 3;
  await db.prepare("insert into reports (id, reporter_user_id, target_type, target_id, target_profile_id, reason, details, priority) values (?, ?, ?, ?, ?, ?, ?, ?)")
    // "Undisclosed AI" is stored as other with a tag: the reports table check list predates it.
    .bind(uuid(), v.user.id, b.targetType, String(b.targetId).slice(0, 64), targetProfile || null, b.reason === "undisclosed_ai" ? "other" : b.reason,
      b.reason === "undisclosed_ai" ? ("[undisclosed_ai] " + (b.details || "")).slice(0, 500) : b.details ? String(b.details).slice(0, 500) : null, priority).run();
  // Minor reports go to the top of the moderator queue (priority 1). A moderator decides; nothing is limited
  // automatically, so a few fake accounts cannot take down a creator (security review 2026-10-09).
  return c.json({ ok: true }, 201);
});

app.post("/v1/blocks/:handle", async (c) => {
  const [v, err] = await requireProfile(c);
  if (err) return err;
  const db = c.env.DB;
  const t = await db.prepare("select id from profiles where handle = ?").bind(c.req.param("handle").toLowerCase()).first();
  if (!t || t.id === v.profile.id) return fail(c, 404, "not_found", "Profile not found.");
  const unfollow = await db.prepare("delete from follows where (follower_profile_id = ?1 and creator_profile_id = ?2) or (follower_profile_id = ?2 and creator_profile_id = ?1)").bind(v.profile.id, t.id).run();
  await db.batch([
    db.prepare("insert or ignore into blocks (blocker_profile_id, blocked_profile_id) values (?, ?)").bind(v.profile.id, t.id),
    db.prepare("update profiles set follower_count = (select count(*) from follows where creator_profile_id = profiles.id) where id in (?, ?)").bind(v.profile.id, t.id),
  ]);
  return c.json({ ok: true, blocked: true, removedFollows: unfollow.meta.changes });
});

app.delete("/v1/blocks/:handle", async (c) => {
  const [v, err] = await requireProfile(c);
  if (err) return err;
  const t = await c.env.DB.prepare("select id from profiles where handle = ?").bind(c.req.param("handle").toLowerCase()).first();
  if (t) await c.env.DB.prepare("delete from blocks where blocker_profile_id = ? and blocked_profile_id = ?").bind(v.profile.id, t.id).run();
  return c.json({ ok: true, blocked: false });
});

// ------------------------------------------------------------------ payments
// In-app purchases ship in version 2: Apple and Google will be verified directly here (no RevenueCat).

// A creator spends a verified purchase on one of their live promos.
app.post("/v1/boosts", async (c) => {
  const [v, err] = await requireProfile(c, "creator");
  if (err) return err;
  const b = await c.req.json().catch(() => ({}));
  const db = c.env.DB;
  const purchase = await db.prepare(
    "select pu.id, pr.boost_hours from purchases pu join iap_products pr on pr.id = pu.product_id where pu.id = ? and pu.profile_id = ? and pu.status = 'active' and pr.kind = 'boost'",
  ).bind(b.purchaseId, v.profile.id).first();
  if (!purchase) return fail(c, 404, "purchase_not_found", "No unused boost found.");
  const promo = await db.prepare("select id from promos where id = ? and creator_profile_id = ? and status = 'live'").bind(b.promoId, v.profile.id).first();
  if (!promo) return fail(c, 404, "not_found", "Promo not found.");
  const start = new Date(), end = new Date(start.getTime() + purchase.boost_hours * 3600e3);
  await db.batch([
    db.prepare("insert into boosts (id, purchase_id, promo_id, starts_at, ends_at, status) values (?, ?, ?, ?, ?, 'running')").bind(uuid(), purchase.id, promo.id, start.toISOString(), end.toISOString()),
    db.prepare("update purchases set status = 'consumed' where id = ?").bind(purchase.id),
  ]);
  return c.json({ ok: true, endsAt: end.toISOString() }, 201);
});

app.notFound((c) => fail(c, 404, "not_found", "Not found."));
app.onError((e, c) => {
  console.error(e);
  return fail(c, 500, "server_error", "Something went wrong. Try again.");
});

// ------------------------------------------------------------------ daily jobs
// Resolves calls by the crowd that came after them (per call, so new scouts can be right too).
// Rules (expert review round 2):
// * A call is checked 7 days after it was made. If fewer than RESOLVE_MIN_LATER later valid calls exist, it stays
//   open and is checked again daily, up to RESOLVE_MAX_DAYS; then it is void ("not enough scouts, no points lost").
// * "Will blow up" is right when the promo's later "will blow up" share is at or above the bar: the median share of
//   the promos resolved in the last 7 days (at least BAR_MIN_PROMOS of them), else 50%. This stops "yes to
//   everything" from winning. "Not for me" is right when the share is below the bar.
// * Only score eligible calls earn points (the first 7 calls per scout per UTC day). Every call still gets a result.
// * Early multiplier by percentile among all valid calls on that promo: first 10% x3, next 20% x2, else x1.
//   Right "Will blow up" = 10 x multiplier, right "Not for me" = 5. A wrong call never costs points.
// Scout Score is reputation only, never cash.
// A call needs this many later calls on the same promo to resolve. During the beta (fewer than BETA_SCOUTS
// scouts calling in a week) 5 is enough, so early scouts are not left with void results.
const RESOLVE_MIN_LATER = 10;
const RESOLVE_MIN_LATER_BETA = 5;
const BETA_SCOUTS = 50;
const RESOLVE_MAX_DAYS = 21;
const BAR_MIN_PROMOS = 5;
// Levels: level L starts at 25 x (L - 1)^2 points, so one right early call reaches level 2.
const levelFor = (score) => 1 + Math.floor(Math.sqrt(Math.max(0, score) / 25));
const nextLevelAt = (level) => 25 * level * level;
const LEVEL_SQL = `(case ${Array.from({ length: 19 }, (_, i) => 20 - i).map((l) => `when scout_score >= ${25 * (l - 1) * (l - 1)} then ${l}`).join(" ")} else 1 end)`;
const SCORED_CALLS_PER_DAY = 7;
async function minLater(db) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const r = await db.prepare("select count(distinct scout_profile_id) as n from calls where created_at >= ?").bind(since).first();
  return (r?.n || 0) < BETA_SCOUTS ? RESOLVE_MIN_LATER_BETA : RESOLVE_MIN_LATER;
}
// The bar a "Will blow up" share must reach: the median share of promos called in the last 14 days, never below 50%.
async function crowdBar(db, need) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const { results } = await db.prepare(
    `select promo_id, avg(choice = 'will_blow_up') as share from calls where is_valid = 1 and created_at >= ?
     group by promo_id having count(*) >= ?`,
  ).bind(since, need).all();
  if (results.length < BAR_MIN_PROMOS) return 0.5;
  const shares = results.map((r) => r.share).sort((a, b) => a - b);
  const mid = Math.floor(shares.length / 2);
  return Math.max(0.5, shares.length % 2 ? shares[mid] : (shares[mid - 1] + shares[mid]) / 2);
}
// Set based so one run stays far under the Workers Free limit of 50 D1 queries per invocation:
// about 10 queries per run whatever the number of due calls (up to RESOLVE_BATCH).
const RESOLVE_BATCH = 500;
async function resolveCalls(db) {
  const due = new Date(Date.now() - CALL_DAYS * 864e5).toISOString();
  const expire = new Date(Date.now() - RESOLVE_MAX_DAYS * 864e5).toISOString();
  const need = await minLater(db);
  const bar = await crowdBar(db, need);
  const t = now();
  const { results: batch } = await db.prepare(
    `select id, scout_profile_id, promo_id, choice, voter_ordinal, score_eligible, created_at from calls
     where outcome = 'pending' and is_valid = 1 and created_at < ? and (resolved_at is null or resolved_at < ?) order by created_at limit ?`,
  ).bind(due, new Date(Date.now() - 20 * 3600e3).toISOString(), RESOLVE_BATCH).all();
  let done = 0;
  if (batch.length) {
    // Every valid call on the promos involved, in one query; later counts are computed here.
    const promoIds = [...new Set(batch.map((c) => c.promo_id))];
    const { results: all } = await db.prepare(
      `select ca.id, ca.promo_id, ca.choice, ca.created_at, p.created_at as account_at from calls ca join profiles p on p.id = ca.scout_profile_id
       where ca.is_valid = 1 and ca.promo_id in (select value from json_each(?))`,
    ).bind(JSON.stringify(promoIds)).all();
    // Collusion guard: later calls count only from accounts at least 3 days old, so a ring of fresh accounts cannot flip a result.
    const settled = new Date(Date.now() - 3 * 864e5).toISOString();
    const byPromo = new Map();
    for (const c of all) { if (!byPromo.has(c.promo_id)) byPromo.set(c.promo_id, []); byPromo.get(c.promo_id).push(c); }
    const recheck = [], resolved = [], perScout = new Map();
    for (const call of batch) {
      const calls = byPromo.get(call.promo_id) || [];
      const later = calls.filter((c) => c.created_at > call.created_at && c.id !== call.id && c.account_at < settled);
      const n = later.length, share = n ? later.filter((c) => c.choice === "will_blow_up").length / n : 0;
      if (n < need && call.created_at >= expire) { recheck.push(call.id); continue; } // check again tomorrow
      let o = "void", d = 0, m = null;
      if (n >= need) {
        const right = call.choice === "will_blow_up" ? share >= bar : share < bar;
        o = right ? "correct" : "incorrect";
        const pct = (call.voter_ordinal || 1) / Math.max(1, calls.length);
        m = pct <= 0.1 ? 3 : pct <= 0.3 ? 2 : 1;
        // Same pay for both sides, so tapping "Will blow up" on everything is not the best strategy.
        if (right && call.score_eligible) d = 10 * m;
      }
      const ci = o === "correct" && call.choice === "will_blow_up" && m === 3 ? 1 : 0;
      resolved.push({ id: call.id, o, d, m, ci, p: call.scout_profile_id });
      if (o !== "void") {
        const s = perScout.get(call.scout_profile_id) || { p: call.scout_profile_id, d: 0, wbu: 0, ok: 0, ci: 0 };
        s.d += d; s.ci += ci;
        if (call.choice === "will_blow_up") { s.wbu += 1; if (o === "correct") s.ok += 1; }
        perScout.set(call.scout_profile_id, s);
      }
    }
    const R = JSON.stringify(resolved), S = JSON.stringify([...perScout.values()]);
    const stmts = [];
    if (recheck.length) stmts.push(db.prepare("update calls set resolved_at = ? where id in (select value from json_each(?))").bind(t, JSON.stringify(recheck)));
    if (resolved.length) stmts.push(db.prepare(
      `update calls set outcome = j.value ->> 'o', score_delta = j.value ->> 'd', multiplier = j.value ->> 'm', is_called_it = j.value ->> 'ci', resolved_at = ?
       from json_each(?) j where calls.id = j.value ->> 'id'`,
    ).bind(t, R));
    if (perScout.size) {
      stmts.push(db.prepare("insert or ignore into scout_stats (profile_id) select value ->> 'p' from json_each(?)").bind(S));
      stmts.push(db.prepare(
        `update scout_stats set scout_score = scout_score + (j.value ->> 'd'), calls_resolved_wbu = calls_resolved_wbu + (j.value ->> 'wbu'),
           calls_correct_wbu = calls_correct_wbu + (j.value ->> 'ok'), called_it_count = called_it_count + (j.value ->> 'ci'), updated_at = ?
         from json_each(?) j where scout_stats.profile_id = j.value ->> 'p'`,
      ).bind(t, S));
      stmts.push(db.prepare(`update scout_stats set level = ${LEVEL_SQL} where profile_id in (select value ->> 'p' from json_each(?))`).bind(S));
      stmts.push(db.prepare(
        "insert into score_events (profile_id, delta, reason, call_id) select value ->> 'p', value ->> 'd', 'call_correct', value ->> 'id' from json_each(?) where (value ->> 'd') > 0",
      ).bind(R));
    }
    if (stmts.length) await db.batch(stmts);
    done = resolved.length;
  }
  await db.prepare("insert into job_runs (name, ran_at, info) values ('resolve_calls', ?, ?) on conflict (name) do update set ran_at = excluded.ran_at, info = excluded.info")
    .bind(t, JSON.stringify({ resolved: done, due: batch.length, bar, need })).run().catch(() => {});
  return done;
}

// Forgiving weekly streak: a week counts when a scout makes calls on at least STREAK_DAYS different days
// (Monday to Sunday, UTC). A missed week uses a freeze if one is saved; a freeze is earned every 4 counted
// weeks (at most 2). Runs once per week from the daily job; the job_runs row makes it safe to re-run.
const STREAK_DAYS = 3;
const weekStart = (d) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; };
async function weeklyStreaks(db) {
  const thisWeek = weekStart(new Date());
  const lastWeek = new Date(thisWeek.getTime() - 7 * 864e5);
  const key = `streaks:${lastWeek.toISOString().slice(0, 10)}`;
  if (await db.prepare("select 1 from job_runs where name = ?").bind(key).first()) return;
  const from = lastWeek.toISOString(), to = thisWeek.toISOString();
  await db.batch([
    db.prepare("insert or ignore into scout_stats (profile_id) select distinct scout_profile_id from calls where created_at >= ? and created_at < ?").bind(from, to),
    // Counted week: streak + 1, a freeze every 4 weeks (max 2).
    db.prepare(`update scout_stats set current_streak_weeks = current_streak_weeks + 1,
        best_streak_weeks = max(best_streak_weeks, current_streak_weeks + 1),
        freezes_available = min(2, freezes_available + (case when (current_streak_weeks + 1) % 4 = 0 then 1 else 0 end)),
        updated_at = ?3
      where profile_id in (select scout_profile_id from calls where created_at >= ?1 and created_at < ?2
        group by scout_profile_id having count(distinct substr(created_at, 1, 10)) >= ${STREAK_DAYS})`).bind(from, to, now()),
    // Missed week with a streak running: spend a freeze, else the streak ends.
    db.prepare(`update scout_stats set
        freezes_available = case when freezes_available > 0 then freezes_available - 1 else 0 end,
        current_streak_weeks = case when freezes_available > 0 then current_streak_weeks else 0 end,
        updated_at = ?3
      where current_streak_weeks > 0 and profile_id not in (select scout_profile_id from calls where created_at >= ?1 and created_at < ?2
        group by scout_profile_id having count(distinct substr(created_at, 1, 10)) >= ${STREAK_DAYS})`).bind(from, to, now()),
    db.prepare("insert into job_runs (name, ran_at) values (?, ?)").bind(key, now()),
  ]);
}

async function daily(env) {
  const db = env.DB;
  const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
  // Hard delete accounts whose 30 day grace has ended (cascades to profile, follows, saves, calls).
  const { results } = await db.prepare(
    "select dr.user_id from data_requests dr where dr.kind = 'delete_account' and dr.status = 'pending' and dr.created_at < ?",
  ).bind(cutoff).all();
  for (const r of results) {
    const req = await db.prepare("select min(created_at) as at from data_requests where user_id = ? and kind = 'delete_account'").bind(r.user_id).first();
    await db.batch([
      db.prepare("insert into deletion_log (user_id, requested_at, completed_at) values (?, ?, ?)").bind(r.user_id, req?.at || null, now()),
      db.prepare('delete from "user" where id = ?').bind(r.user_id),
    ]);
  }
  await db.batch([
    db.prepare("update boosts set status = 'done' where status = 'running' and ends_at < ?").bind(now()),
    db.prepare('delete from "verification" where expiresAt < ?').bind(now()),
    db.prepare('delete from "session" where expiresAt < ?').bind(now()),
    db.prepare("delete from view_events where day < ?").bind(new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10)),
    db.prepare("insert into job_runs (name, ran_at) values ('daily', ?) on conflict (name) do update set ran_at = excluded.ran_at").bind(now()),
  ]);
}

// ------------------------------------------------------------------ social posting (PromoVote's own X account)
// OAuth 1.0a user context (the app's key and secret plus the account's access token and secret, all Worker secrets).
const pct = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase());
// Signs one request. Query parameters are part of the signature; JSON and multipart bodies are not.
async function xAuth(env, method, url, query = {}) {
  const oauth = {
    oauth_consumer_key: env.X_API_KEY, oauth_nonce: crypto.randomUUID().replace(/-/g, ""), oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: env.X_ACCESS_TOKEN, oauth_version: "1.0",
  };
  const all = { ...oauth, ...query };
  const params = Object.keys(all).sort().map((k) => `${pct(k)}=${pct(all[k])}`).join("&");
  const base = `${method}&${pct(url)}&${pct(params)}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(`${pct(env.X_API_SECRET)}&${pct(env.X_ACCESS_SECRET)}`), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(base)))));
  return "OAuth " + Object.entries({ ...oauth, oauth_signature: sig }).map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(", ");
}

async function xCall(env, method, url, { query = {}, json, form } = {}) {
  const qs = Object.keys(query).length ? "?" + Object.entries(query).map(([k, v]) => `${pct(k)}=${pct(v)}`).join("&") : "";
  const headers = { Authorization: await xAuth(env, method, url, query) };
  let body;
  if (json) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  else if (form) body = form;
  const r = await fetch(url + qs, { method, headers, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${j.detail || j.title || JSON.stringify(j).slice(0, 200)}`);
  return j;
}

// Chunked v2 media upload for a video (or image) at a public https URL on our own domain; returns the media id.
async function xUploadMedia(env, mediaUrl) {
  if (!/^https:\/\/promovote\.com\//.test(mediaUrl)) throw new Error("media_url must be on https://promovote.com/");
  // Through the service binding when present: a Worker fetching another Worker on the same zone by URL can be refused.
  const res = env.LANDING ? await env.LANDING.fetch(new Request(mediaUrl)) : await fetch(mediaUrl);
  if (!res.ok) throw new Error(`media fetch ${res.status}`);
  const type = (res.headers.get("content-type") || "video/mp4").split(";")[0];
  const blob = await res.blob();
  const video = type.startsWith("video/");
  const init = await xCall(env, "POST", "https://api.x.com/2/media/upload/initialize", {
    json: { media_type: type, total_bytes: blob.size, media_category: video ? "tweet_video" : "tweet_image" },
  });
  const id = init.data?.id;
  if (!id) throw new Error("media init: no id");
  const CHUNK = 4 * 1024 * 1024;
  for (let i = 0, seg = 0; i < blob.size; i += CHUNK, seg++) {
    const form = new FormData();
    form.append("segment_index", String(seg));
    form.append("media", blob.slice(i, i + CHUNK), "chunk");
    await xCall(env, "POST", `https://api.x.com/2/media/upload/${id}/append`, { form });
  }
  let info = (await xCall(env, "POST", `https://api.x.com/2/media/upload/${id}/finalize`)).data?.processing_info;
  // Videos are processed by X after finalize; wait until ready (at most about 2 minutes).
  for (let n = 0; info && info.state !== "succeeded"; n++) {
    if (info.state === "failed" || n > 20) throw new Error(`media processing ${info.state}: ${JSON.stringify(info.error || {}).slice(0, 120)}`);
    await new Promise((ok) => setTimeout(ok, Math.min(10, info.check_after_secs || 3) * 1000));
    info = (await xCall(env, "GET", "https://api.x.com/2/media/upload", { query: { command: "STATUS", media_id: id } })).data?.processing_info;
  }
  return id;
}

async function xPost(env, text, mediaUrl) {
  const json = { text };
  if (mediaUrl) json.media = { media_ids: [await xUploadMedia(env, mediaUrl)] };
  const j = await xCall(env, "POST", "https://api.x.com/2/tweets", { json });
  return j.data?.id;
}

// Reads public stats twice per post: once a day after posting and once three days after (reads are billed per post,
// so refreshing every post every day would soon cost more than posting). Runs from the hourly job; 100 ids per request.
async function refreshSocialStats(env) {
  if (!env.X_API_KEY || !env.X_ACCESS_TOKEN) return;
  const db = env.DB;
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const { results } = await db.prepare(
    `select id, external_id from social_posts where status = 'posted' and external_id is not null and (
       (stats_at is null and posted_at <= ?1) or
       (posted_at <= ?2 and posted_at > ?3 and stats_at < strftime('%Y-%m-%dT%H:%M:%fZ', posted_at, '+60 hours')))
     limit 100`,
  ).bind(ago(24), ago(72), ago(120)).all();
  if (!results.length) return;
  const j = await xCall(env, "GET", "https://api.x.com/2/tweets", { query: { ids: results.map((r) => r.external_id).join(","), "tweet.fields": "public_metrics" } });
  const byExt = new Map((j.data || []).map((t) => [t.id, t.public_metrics || {}]));
  // Deleted posts come back without data; stamp them too so they are not read again.
  await db.batch(results.map((r) => {
    const m = byExt.get(r.external_id) || {};
    return db.prepare("update social_posts set impressions = coalesce(?, impressions), likes = coalesce(?, likes), reposts = coalesce(?, reposts), replies = coalesce(?, replies), bookmarks = coalesce(?, bookmarks), stats_at = ? where id = ?")
      .bind(m.impression_count ?? null, m.like_count ?? null, m.retweet_count ?? null, m.reply_count ?? null, m.bookmark_count ?? null, now(), r.id);
  }));
}

// One due post per hourly run at most, so a backlog never floods the account.
// graceMs: the hourly :07 run passes 5 minutes so it only picks up a post the :00 run missed (Cloudflare skipped
// every "0 * * * *" run on 2026-10-09), never one the :00 run is about to send.
async function postDueSocial(env, graceMs = 0) {
  if (!env.X_API_KEY || !env.X_API_SECRET || !env.X_ACCESS_TOKEN || !env.X_ACCESS_SECRET) return;
  const db = env.DB;
  const due = new Date(Date.now() - graceMs).toISOString();
  const p = await db.prepare("select id, body, media_url from social_posts where status = 'queued' and network = 'x' and scheduled_at <= ? order by scheduled_at limit 1").bind(due).first();
  if (!p) return;
  try {
    const id = await xPost(env, p.body, p.media_url);
    await db.prepare("update social_posts set status = 'posted', posted_at = ?, external_id = ?, error = null where id = ?").bind(now(), id || null, p.id).run();
  } catch (e) {
    await db.prepare("update social_posts set status = 'failed', error = ? where id = ?").bind(String(e?.message || e).slice(0, 300), p.id).run();
  }
}

export default {
  fetch: app.fetch,
  // Hourly: resolve calls (so "Result Oct 14" is true in every time zone). Daily (04:17 UTC): deletions, cleanup and the
  // weekly streak, in their own run so the two jobs never share the per invocation query budget.
  scheduled: (event, env, ctx) => ctx.waitUntil(
    event.cron === "17 4 * * *"
      ? daily(env).catch((e) => console.error("daily_failed", e?.message)).then(() => weeklyStreaks(env.DB)).catch((e) => console.error("streaks_failed", e?.message))
      // Social posts go out on the hour (founder request: round times like 13:00).
      : event.cron === "0 * * * *"
        ? postDueSocial(env).catch((e) => console.error("social_failed", e?.message))
        : resolveCalls(env.DB).catch((e) => console.error("resolve_calls_failed", e?.message))
          .then(() => postDueSocial(env, 5 * 60 * 1000)).catch((e) => console.error("social_failed", e?.message))
          .then(() => refreshSocialStats(env)).catch((e) => console.error("social_stats_failed", e?.message)),
  ),
};
