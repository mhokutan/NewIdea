// PromoVote API (Cloudflare Worker + D1). Used by the iOS and Android apps, later by the website.
// Public reads: feed, explore, profiles. Signed in: onboarding, follow, vote, save, report, block, delete account.
// Payments arrive only from RevenueCat webhooks (Apple and Google in-app purchases).
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth.js";

const app = new Hono();
const LANGS = ["en", "es", "tr"];
const CATEGORIES = ["games", "apps", "shops", "creators", "brands"];
const HANDLE_RE = /^[a-z][a-z0-9_]{2,23}$/;
const TERMS_VERSION = "2026-10-02";
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const uuid = () => crypto.randomUUID();
const json = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

// ------------------------------------------------------------------ setup
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  if (!c.res.headers.get("Cache-Control")) c.header("Cache-Control", "no-store");
});
app.use("*", cors({
  // Local development (DEV_LOG_OTP=1 in .dev.vars) also allows localhost so the app's web build can be tested.
  origin: (o, c) => (o === "https://promovote.com" || (c.env.DEV_LOG_OTP === "1" && /^http:\/\/localhost:\d+$/.test(o || "")) ? o : null),
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}));

// Writes: small JSON bodies only, and a per IP rate limit (Workers Rate Limiting binding WRITE_LIMIT).
app.use("/v1/*", async (c, next) => {
  if (c.req.method === "GET" || c.req.method === "OPTIONS") return next();
  if (+(c.req.header("Content-Length") || 0) > 16384) return c.json({ error: { code: "too_large", message: "Request too large." } }, 413);
  if (c.env.WRITE_LIMIT) {
    const { success } = await c.env.WRITE_LIMIT.limit({ key: c.req.header("CF-Connecting-IP") || "unknown" });
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
  select pr.id, pr.slug, pr.lang, pr.title, pr.description, pr.i18n, pr.cta_kind, pr.cta_url, pr.has_perk, pr.live_at,
         pr.public_view_bucket,
         v.mp4_url, v.webm_url, v.poster_url, v.stream_uid, v.duration_ms, v.width, v.height,
         p.handle, p.display_name, p.avatar_url, p.i18n as p_i18n, p.is_verified,
         d.category, d.release_status, d.android_status, d.ios_status, d.founder_owned,
         (select group_concat(tag, ' ') from (select tag from promo_hashtags h where h.promo_id = pr.id order by position)) as tags
  from promos pr
  join profiles p on p.id = pr.creator_profile_id
  join creator_details d on d.profile_id = p.id
  left join promo_videos v on v.promo_id = pr.id and v.label = 'A'
  where pr.status = 'live' and p.status = 'active'`;

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
    cta: r.cta_kind ? { kind: r.cta_kind, url: r.cta_url } : null,
    hasPerk: !!r.has_perk,
    views: r.public_view_bucket,
    liveAt: r.live_at,
    creator: {
      handle: r.handle, name: r.display_name, avatar: r.avatar_url, mono: pi.mono || null,
      kind: pick(pi.kind, lang, null), category: r.category, verified: !!r.is_verified,
      releaseStatus: r.release_status, androidStatus: r.android_status, iosStatus: r.ios_status,
      founderOwned: !!r.founder_owned,
    },
  };
}

// ------------------------------------------------------------------ public reads
app.get("/health", (c) => c.json({ ok: true, time: now() }));

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
app.get("/v1/home", async (c) => {
  const lang = langOf(c);
  const tab = c.req.query("tab");
  const db = c.env.DB;
  let rows;
  if (tab === "new") {
    ({ results: rows } = await db.prepare(PROMO_SELECT + " order by pr.live_at desc limit 50").all());
  } else if (tab === "featured") {
    ({ results: rows } = await db.prepare(PROMO_SELECT + " and pr.featured_at is not null order by pr.featured_at desc, pr.live_at desc limit 30").all());
  } else if (tab === "top") {
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
    return fail(c, 400, "bad_tab", "Use tab=new, top or featured.");
  }
  c.header("Cache-Control", "public, max-age=60");
  return c.json({ tab, promos: rows.map((r) => promoOut(r, lang)) });
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
  const { results } = await c.env.DB.prepare(sql + " order by pr.live_at desc limit 100").bind(...args).all();
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
             from profiles p join creator_details d on d.profile_id = p.id where p.status = 'active'`;
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
    `select p.*, s.show_follower_count, s.show_calls, d.kind, d.category, d.release_status, d.android_status, d.ios_status, d.founder_owned, d.founding_creator
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
    const [links, promos] = await db.batch([
      db.prepare("select platform, canonical_url, label from profile_links where profile_id = ? and safety_status = 'safe' order by position").bind(p.id),
      db.prepare(PROMO_SELECT + " and pr.creator_profile_id = ? order by pr.is_pinned desc, pr.live_at desc limit 60").bind(p.id),
    ]);
    Object.assign(out, {
      kind: pick(i.kind, lang, p.kind), category: p.category,
      releaseStatus: p.release_status, androidStatus: p.android_status, iosStatus: p.ios_status,
      founderOwned: !!p.founder_owned, foundingCreator: !!p.founding_creator,
      followers: p.show_follower_count ? p.follower_count : null,
      links: links.results.map((l) => ({ platform: l.platform, url: l.canonical_url, label: l.label })),
      promos: promos.results.map((r) => promoOut(r, lang)),
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
    user: { id: v.user.id, email: v.user.email, emailVerified: !!v.user.emailVerified },
    account: v.priv && { type: v.priv.account_type, language: v.priv.language, country: v.priv.country_code, perkEmails: !!v.priv.perk_email_opt_in, followEmails: !!v.priv.follow_email_opt_in },
    profile: v.profile && { handle: v.profile.handle, name: v.profile.display_name, bio: v.profile.bio, type: v.profile.type, status: v.profile.status, avatar: v.profile.avatar_url },
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
  const lang = LANGS.includes(b.language) ? b.language : "en";
  const country = /^[A-Z]{2}$/.test(b.country || "") ? b.country : (c.req.raw.cf?.country || null);
  let category = null, kind = null;
  if (type === "creator") {
    category = CATEGORIES.includes(b.category) ? b.category : null;
    const kinds = { games: "game_dev", apps: "app_maker", shops: "shop", creators: "short_video", brands: "brand" };
    if (!category) return fail(c, 400, "bad_category", "Choose a category.");
    kind = kinds[category];
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
    db.prepare("insert into profiles (id, owner_user_id, type, handle, display_name) values (?, ?, ?, ?, ?)").bind(pid, v.user.id, type, handle, name),
    db.prepare("insert into profile_settings (profile_id) values (?)").bind(pid),
  ];
  if (type === "scout") stmts.push(db.prepare("insert into scout_stats (profile_id) values (?)").bind(pid));
  else stmts.push(db.prepare("insert into creator_details (profile_id, kind, category) values (?, ?, ?)").bind(pid, kind, category));
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
    stmts.push(db.prepare("update profiles set display_name = ?, updated_at = ? where id = ?").bind(name, now(), v.profile.id));
  }
  if (typeof b.bio === "string") {
    const bio = b.bio.trim().slice(0, 600);
    if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|app|gg|ly)\b/i.test(bio)) return fail(c, 400, "bio_links", "Links go in the links section, not the bio.");
    stmts.push(db.prepare("update profiles set bio = ?, updated_at = ? where id = ?").bind(bio || null, now(), v.profile.id));
  }
  if (LANGS.includes(b.language)) stmts.push(db.prepare("update account_private set language = ?, updated_at = ? where user_id = ?").bind(b.language, now(), v.user.id));
  if (typeof b.perkEmails === "boolean") stmts.push(db.prepare("update account_private set perk_email_opt_in = ? where user_id = ?").bind(+b.perkEmails, v.user.id));
  if (typeof b.followEmails === "boolean") stmts.push(db.prepare("update account_private set follow_email_opt_in = ? where user_id = ?").bind(+b.followEmails, v.user.id));
  if (stmts.length) await db.batch(stmts);
  return c.json({ ok: true });
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
  if (r.meta.changes) await db.prepare("update profiles set follower_count = follower_count + 1 where id = ?").bind(target.id).run();
  return c.json({ ok: true, following: true });
});

app.delete("/v1/follows/:handle", async (c) => {
  const [v, err] = await requireProfile(c);
  if (err) return err;
  const db = c.env.DB;
  const target = await creatorByHandle(db, c.req.param("handle"));
  if (!target) return fail(c, 404, "not_found", "Creator not found.");
  const r = await db.prepare("delete from follows where follower_profile_id = ? and creator_profile_id = ?").bind(v.profile.id, target.id).run();
  if (r.meta.changes) await db.prepare("update profiles set follower_count = max(follower_count - 1, 0) where id = ?").bind(target.id).run();
  return c.json({ ok: true, following: false });
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
  const r = await db.prepare(
    `insert or ignore into calls (id, scout_profile_id, promo_id, choice, voter_ordinal)
     values (?, ?, ?, ?, (select count(*) + 1 from calls where promo_id = ?))`,
  ).bind(uuid(), v.profile.id, promo.id, b.choice, promo.id).run();
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
    db.prepare("select promo_id, choice, voter_ordinal, created_at, outcome from calls where scout_profile_id = ? order by created_at desc limit 500").bind(v.profile.id),
    db.prepare("select promo_id from saves where scout_profile_id = ? order by created_at desc limit 500").bind(v.profile.id),
    db.prepare("select p.handle from follows f join profiles p on p.id = f.creator_profile_id where f.follower_profile_id = ? limit 500").bind(v.profile.id),
    db.prepare("select p.handle from blocks b join profiles p on p.id = b.blocked_profile_id where b.blocker_profile_id = ? limit 500").bind(v.profile.id),
  ]);
  c.header("Cache-Control", "no-store");
  return c.json({
    calls: Object.fromEntries(calls.results.map((r) => [r.promo_id, {
      choice: r.choice, rank: r.voter_ordinal, outcome: r.outcome,
      resolvesAt: new Date(new Date(r.created_at).getTime() + CALL_DAYS * 864e5).toISOString(),
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
app.post("/v1/events/view", (c) => trackEvent(c, "view_events"));
app.post("/v1/events/click", (c) => trackEvent(c, "click_events"));

const REPORT_REASONS = ["impersonation", "spam_or_scam", "malicious_link", "nudity_or_sexual", "hate_or_harassment", "violence", "copyright", "trademark", "minor", "misleading_perk", "perk_not_working", "asks_for_votes_or_follows", "other"];
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
    .bind(uuid(), v.user.id, b.targetType, String(b.targetId).slice(0, 64), targetProfile || null, b.reason, b.details ? String(b.details).slice(0, 500) : null, priority).run();
  // Minor reports go to the top of the moderator queue. The profile is limited automatically only when at least
  // two different people report it as a minor within 7 days, so one person cannot take down an account.
  if (b.reason === "minor" && targetProfile) {
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const r = await db.prepare("select count(distinct reporter_user_id) as n from reports where target_profile_id = ? and reason = 'minor' and created_at >= ?").bind(targetProfile, since).first();
    if ((r?.n || 0) >= 2) await db.prepare("update profiles set status = 'limited' where id = ? and status = 'active'").bind(targetProfile).run();
  }
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
async function daily(env) {
  const db = env.DB;
  const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
  // Hard delete accounts whose 30 day grace has ended (cascades to profile, follows, saves, calls).
  const { results } = await db.prepare(
    "select dr.user_id from data_requests dr where dr.kind = 'delete_account' and dr.status = 'pending' and dr.created_at < ?",
  ).bind(cutoff).all();
  for (const r of results) {
    await db.batch([
      db.prepare("update data_requests set status = 'done', completed_at = ? where user_id = ? and kind = 'delete_account'").bind(now(), r.user_id),
      db.prepare('delete from "user" where id = ?').bind(r.user_id),
    ]);
  }
  await db.batch([
    db.prepare("update boosts set status = 'done' where status = 'running' and ends_at < ?").bind(now()),
    db.prepare('delete from "verification" where expiresAt < ?').bind(now()),
    db.prepare('delete from "session" where expiresAt < ?').bind(now()),
    db.prepare("delete from view_events where day < ?").bind(new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10)),
  ]);
}

export default {
  fetch: app.fetch,
  scheduled: (_event, env, ctx) => ctx.waitUntil(daily(env)),
};
