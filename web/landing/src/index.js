const ROLES = new Set(["creator", "developer", "brand", "viewer", "api"]);

// Creator perks are only revealed after a verified waitlist signup (never in page source).
const PERKS = {
  nicheable: { code: "NEWIDEA25", url: "https://nicheable.etsy.com?coupon=NEWIDEA25", expires: "2026-12-31T23:59:59Z" },
};
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
    "frame-src https://challenges.cloudflare.com",
    "connect-src 'self' https://cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...SECURITY_HEADERS },
  });
}

async function verifyTurnstile(token, ip, secret) {
  if (!token || !secret) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const data = await res.json();
  return data.success === true;
}

function cleanLink(value) {
  if (!value) return null;
  const v = String(value).trim().slice(0, 300);
  if (!v) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function handleWaitlist(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "");
  if (!EMAIL_RE.test(email) || email.length > 254) return json({ ok: false, error: "invalid_email" }, 400);
  if (!ROLES.has(role)) return json({ ok: false, error: "invalid_role" }, 400);

  const ip = request.headers.get("CF-Connecting-IP");
  const human = await verifyTurnstile(body.turnstileToken, ip, env.TURNSTILE_SECRET);
  if (!human) return json({ ok: false, error: "verification_failed" }, 403);

  const link = role === "viewer" ? null : cleanLink(body.link);
  const country = request.cf?.country || null;

  await env.DB.prepare(
    "INSERT INTO waitlist (email, role, link, country) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(email) DO UPDATE SET link = COALESCE(waitlist.link, excluded.link)"
  )
    .bind(email, role, link, country)
    .run();

  const perk = PERKS[body.perk];
  if (perk && Date.now() < Date.parse(perk.expires)) {
    return json({ ok: true, perk: { code: perk.code, url: perk.url } });
  }
  return json({ ok: true });
}


function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const password = decoded.slice(decoded.indexOf(":") + 1);
  return timingSafeEqual(password, env.ADMIN_PASSWORD);
}

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|httpclient|go-http|java\//i;

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Daily random salt, so visitor hashes cannot be linked across days or reversed to an IP.
async function dailySalt(env, day) {
  const row = await env.DB.prepare("SELECT salt FROM visit_salt WHERE day = ?").bind(day).first();
  if (row) return row.salt;
  const salt = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO visit_salt (day, salt) VALUES (?, ?)").bind(day, salt),
    env.DB.prepare("DELETE FROM visit_salt WHERE day < ?").bind(day),
  ]);
  return (await env.DB.prepare("SELECT salt FROM visit_salt WHERE day = ?").bind(day).first()).salt;
}

async function handleVisit(request, env) {
  const ok = new Response(null, { status: 204 });
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const ua = request.headers.get("User-Agent") || "";
  if (request.headers.get("Origin") !== "https://promovote.com" || !ua || BOT_UA.test(ua)) return ok;
  const raw = await request.text();
  if (raw.length > 2048) return ok;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return ok;
  }
  const path = typeof data.p === "string" && data.p.startsWith("/") ? data.p.slice(0, 120) : "/";
  let ref = null;
  try {
    const host = new URL(data.r).hostname.replace(/^www\./, "");
    if (host && host !== "promovote.com") ref = host.slice(0, 80);
  } catch {}
  const day = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const visitor = (await sha256(`${await dailySalt(env, day)}|${ip}|${ua}`)).slice(0, 32);
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  await env.DB.prepare("INSERT INTO visits (day, path, ref, country, device, visitor) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(day, path, ref, request.cf?.country || null, device, visitor)
    .run();
  return ok;
}

const ADMIN_HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", ...SECURITY_HEADERS };
const ROLE_LABELS = { creator: "Creator / Streamer", developer: "Game developer", brand: "Brand / Business", viewer: "Viewer", api: "API early access" };

// Admin is split into pages (founder request 2026-10-12): waitlist, visitors, X, App Store, Google Play.
// Store pages fill in when the Hauling Empire stats endpoint is connected (secret stays on this Worker).
const ADMIN_TABS = [
  ["/admin", "Bekleme listesi"],
  ["/admin/visitors", "Ziyaretçiler"],
  ["/admin/x", "X"],
  ["/admin/app-store", "App Store"],
  ["/admin/google-play", "Google Play"],
  ["/admin/hauling-empire/oyun", "Hauling Empire oyun"],
  ["/admin/poleris/uygulama", "Poleris uygulama"],
];

function adminPage(path, title, body) {
  const nav = ADMIN_TABS.map(([href, label]) => `<a href="${href}" class="tab${href === path ? " on" : ""}"${href === path ? ' aria-current="page"' : ""}>${esc(label)}</a>`).join("");
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${esc(title)} | PromoVote admin</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/styles.css">
<style>
.admin{padding:32px 16px 80px}.admin h1{font-size:34px;margin:0}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin:22px 0 24px}
.tabs{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:12px}.tab{padding:8px 14px;border-radius:99px;color:var(--muted);text-decoration:none;font-weight:600;font-size:14px;background:var(--surface)}
.tab:hover{color:#fff}.tab.on{background:var(--lime);color:#101014}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}.tile{padding:18px;border-radius:16px;background:var(--surface);border:1px solid var(--line)}
.tile b{display:block;font:800 30px var(--display)}.tile span{color:var(--muted);font-size:14px}.countries{color:var(--muted);font-size:14px;margin-bottom:24px}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:16px}table{width:100%;border-collapse:collapse;font-size:14px}
th,td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--muted);font-weight:600;background:var(--surface)}
td a{color:#b394ff}.dim{color:var(--dim)}.center{text-align:center}.role{padding:3px 10px;border-radius:99px;font-size:12px;background:var(--surface-2)}
.role-creator{color:#ff8fa3}.role-developer{color:var(--lime)}.role-brand{color:#b394ff}.role-viewer{color:#7dd3fc}
.lv-g b{color:#4ade80}.lv-y b{color:#facc15}.lv-r b{color:#f87171}.warnbar{margin:18px 0 0;padding:12px 16px;border-radius:12px;background:rgba(250,204,21,.14);border:1px solid rgba(250,204,21,.5);color:#fde68a}
.fun{display:grid;grid-template-columns:minmax(120px,220px) 1fr 90px;gap:12px;align-items:center;padding:5px 0;font-size:14px}.fun-l{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fun-b{height:12px;border-radius:99px;background:var(--surface-2);overflow:hidden;display:block}.fun-b i{display:block;height:100%;background:var(--lime);border-radius:99px}.fun-n{text-align:right}
.empty{padding:28px;border:1px dashed var(--line);border-radius:16px;color:var(--muted);line-height:1.6}
</style></head><body><main class="wrap admin">
<p class="kicker" style="margin:0 0 12px">PromoVote yönetim paneli</p>
<nav class="tabs" aria-label="Admin">${nav}</nav>
${body}
</main><script src="/v-ignore.js"></script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", ...ADMIN_HEADERS } });
}

const RANGES = [7, 30, 90];
const rangeOf = (url) => { const r = Number(url.searchParams.get("range")); return RANGES.includes(r) ? r : 30; };
const rangePills = (path, range, extra = "") => `<div class="tabs" style="border:0;padding:0;margin:0 0 18px">${RANGES.map((r) => `<a class="tab${r === range ? " on" : ""}" href="${path}?range=${r}${extra}"${r === range ? ' aria-current="true"' : ""}>${r} gün</a>`).join("")}</div>`;

const tilesHtml = (items) => `<div class="tiles">${items.map(([l, n]) => `<div class="tile"><b>${n}</b><span>${esc(l)}</span></div>`).join("")}</div>`;

// Hauling Empire store and player stats (its own Supabase function, daily totals only). The key stays on this
// Worker; the answer is cached for an hour so admin page views never hammer the endpoint.
const HE_STATS_URL = "https://bcwahdyqpbzyqllszeng.supabase.co/functions/v1/store-stats?days=90";
async function heStats(env) {
  if (!env.HE_STATS_KEY) return { ok: false, reason: "no_key" };
  const cache = caches.default;
  const cacheKey = new Request("https://promovote.com/__cache/he-stats-v1");
  const hit = await cache.match(cacheKey);
  if (hit) return { ok: true, ...(await hit.json()) };
  try {
    const res = await fetch(HE_STATS_URL, { headers: { Authorization: `Bearer ${env.HE_STATS_KEY}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) { console.error("he_stats_status", res.status); return { ok: false, reason: "http_" + res.status }; }
    const text = await res.text();
    if (text.length > 500000) return { ok: false, reason: "too_big" };
    const data = JSON.parse(text);
    await cache.put(cacheKey, new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Cache-Control": "max-age=3600" } }));
    return { ok: true, ...data };
  } catch (err) {
    console.error("he_stats_error", err?.message);
    return { ok: false, reason: "fetch_failed" };
  }
}

// Product feeds (each product's own read-only endpoint, daily totals only). Keys stay on this Worker.
const FEEDS = {
  haulingempire: { name: "Hauling Empire", url: "https://bcwahdyqpbzyqllszeng.supabase.co/functions/v1/store-stats", key: (env) => env.HE_STATS_KEY },
  poleris: { name: "Poleris", url: "https://gcbcaunmxznaixwnnfux.supabase.co/functions/v1/store-stats", key: (env) => env.POLERIS_STATS_KEY },
};
async function productFeed(env, prod, query, ttl) {
  const f = FEEDS[prod];
  if (!f || !f.key(env)) return { ok: false, reason: "no_key" };
  const cache = caches.default;
  const cacheKey = new Request(`https://promovote.com/__cache/feed-v1-${prod}-${encodeURIComponent(query)}`);
  const hit = await cache.match(cacheKey);
  if (hit) return { ok: true, data: await hit.json() };
  try {
    const res = await fetch(`${f.url}?${query}`, { headers: { Authorization: `Bearer ${f.key(env)}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) { console.error("feed_status", prod, res.status); return { ok: false, reason: "http_" + res.status }; }
    const text = await res.text();
    if (text.length > 1000000) return { ok: false, reason: "too_big" };
    const data = JSON.parse(text);
    await cache.put(cacheKey, new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${ttl}` } }));
    return { ok: true, data };
  } catch (err) {
    console.error("feed_error", prod, err?.message);
    return { ok: false, reason: "fetch_failed" };
  }
}
const heOps = (env, days) => productFeed(env, "haulingempire", `feed=ops&days=${days}`, 300);

const fnum = (v) => (typeof v === "number" && isFinite(v) ? v : null);
const usd = (v) => (fnum(v) === null ? null : "$" + fnum(v).toFixed(2));
// level: "g" green, "y" yellow, "r" red, "" neutral
const ctile = (label, value, level = "", note = "") => `<div class="tile${level ? " lv-" + level : ""}"><b>${value === null || value === undefined ? '<span class="dim" style="font-size:16px">Veri yok</span>' : value}</b><span>${esc(label)}</span>${note ? `<small class="dim" style="display:block;margin-top:4px">${note}</small>` : ""}</div>`;
const ctiles = (items) => `<div class="tiles">${items.join("")}</div>`;
const lvl3 = (v, yAt, rAt) => (fnum(v) === null ? "" : v >= rAt ? "r" : v >= yAt ? "y" : "g");

function heSalesCard(ops) {
  const d = ops && ops.sales;
  if (!d) return '<h2 style="font-size:20px;margin:28px 0 10px">Satışlar (30 gün)</h2><p class="empty">Veri yok</p>';
  const days = Array.isArray(d.days) ? d.days : [];
  const sum = (k) => days.reduce((a, r) => a + (fnum(r[k]) || 0), 0);
  const total = sum("apple_usd") + sum("google_usd");
  const ref = sum("refunds_usd");
  const refPct = total > 0 ? ref / total : 0;
  return `<h2 style="font-size:20px;margin:28px 0 10px">Satışlar (son 30 gün)</h2>${ctiles([
    ctile("Apple (USD)", usd(sum("apple_usd"))),
    ctile("Google (USD)", usd(sum("google_usd"))),
    ctile("İade (USD)", usd(ref), ref > 0 ? (refPct >= 0.1 ? "r" : refPct >= 0.05 ? "y" : "g") : "g"),
    ctile("Şimdi etkin abonelik", fnum(d.subscriptions_30d?.active_now)),
  ])}`;
}

function heOpsPage(path, ops, range, name = "Hauling Empire", kind = "oyun") {
  const st = ops.status || {};
  const failed = Array.isArray(st.failed) && st.failed.length ? `<p class="countries">Alınamayan bölümler: ${st.failed.map((f) => esc(typeof f === "string" ? f : JSON.stringify(f))).join(", ")}</p>` : "";
  const banner = st.ok === false ? '<div class="warnbar">Bazı veriler eksik ya da gecikmeli. Aşağıda "Veri yok" yazan bölümler güncel değil.</div>' : "";
  const sec = (t) => `<h2 style="font-size:22px;margin:34px 0 12px">${esc(t)}</h2>`;
  const none = '<p class="empty">Veri yok</p>';
  const out = [banner, `<div class="top"><h1>${esc(name)}: ${esc(kind)}</h1></div>`, `<p class="countries">Son güncelleme: ${esc(String(ops.generated_at || "").slice(0, 16).replace("T", " "))} UTC. Veriler 5 dakika önbellekte tutulur.</p>`, failed, rangePills(path, range)];

  // 1. Now
  out.push(sec("Şu an"));
  out.push(ops.now ? ctiles([ctile("Son 5 dakikada aktif", fnum(ops.now.players_online_5min ?? ops.now.users_online_5min)), ...("online_mode_live" in ops.now ? [ctile("Online modda", fnum(ops.now.online_mode_live))] : [])]) : none);

  // 2. Days
  out.push(sec("Günler"));
  const days = Array.isArray(ops.days) ? ops.days.slice().sort((a, b) => (a.date < b.date ? -1 : 1)) : [];
  if (!days.length) out.push(none);
  else {
    const maxD = Math.max(1, ...days.map((r) => (fnum(r.dau_ios) || 0) + (fnum(r.dau_android) || 0)));
    const bw = days.length > 31 ? 6 : 16, gap = days.length > 31 ? 2 : 5, h = 130;
    const bars = days.map((r, i) => {
      const a = fnum(r.dau_ios) || 0, g = fnum(r.dau_android) || 0;
      const ha = Math.round((a / maxD) * (h - 16)), hg = Math.round((g / maxD) * (h - 16));
      const op = r.partial ? ' opacity="0.4"' : "";
      return `<g${op}><rect x="${i * (bw + gap)}" y="${h - ha - hg}" width="${bw}" height="${ha}" fill="#8b5cff"><title>${esc(r.date)} iOS: ${a}</title></rect><rect x="${i * (bw + gap)}" y="${h - hg}" width="${bw}" height="${hg}" fill="#c6ff3d"><title>${esc(r.date)} Android: ${g}</title></rect></g>`;
    }).join("");
    out.push(`<div class="tablewrap" style="padding:16px"><p class="countries" style="margin:0 0 8px">Günlük aktif oyuncu: <span style="color:#8b5cff">■</span> iOS <span style="color:#c6ff3d">■</span> Android</p><svg viewBox="0 0 ${days.length * (bw + gap)} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Günlük aktif oyuncu">${bars}</svg></div>`);
    const v = (x) => (fnum(x) === null ? '<span class="dim">veri yok</span>' : x);
    const has = (k) => days.some((r) => fnum(r[k]) !== null);
    const C = [
      ["Aktif iOS", (r) => v(r.dau_ios), true], ["Aktif Android", (r) => v(r.dau_android), true],
      ["Oturum", (r) => v(r.sessions), has("sessions")], ["Yeni hesap", (r) => v(r.new_accounts), true],
      ["Ort. oturum", (r) => (fnum(r.avg_session_min) === null ? '<span class="dim">veri yok</span>' : fnum(r.avg_session_min).toFixed(1) + " dk"), has("avg_session_min")],
      ["Reklam ödülü / dokunma", (r) => `${v(r.ad_rewards)} / ${v(r.ad_taps)}`, has("ad_rewards") || has("ad_taps")],
    ].filter((c) => c[2]);
    const rows = days.slice().reverse().map((r) => `<tr${r.partial ? ' class="dim"' : ""}><td>${esc(r.date)}${r.partial ? " (bugün, devam ediyor)" : ""}</td>${C.map((c) => `<td>${c[1](r)}</td>`).join("")}</tr>`).join("");
    out.push(`<div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>Gün</th>${C.map((c) => `<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`);
    const STD = new Set(["date", "dau_ios", "dau_android", "sessions", "new_accounts", "avg_session_min", "ad_rewards", "ad_taps", "partial"]);
    const LABEL = { installs: "Yükleme", onboarding_done: "Tanıtımı bitiren", rituals_started: "Ritüel başlatan", rituals_completed: "Ritüel bitiren", paywall_views: "Ödeme ekranı gören", trial_starts: "Deneme başlatan", purchase_events: "Satın alan", notif_permission_granted: "Bildirim izni veren", share_exports: "Paylaşan" };
    const extraKeys = [...new Set(days.flatMap((r) => Object.keys(r).filter((k) => !STD.has(k) && (typeof r[k] === "number" || r[k] === null))))];
    if (extraKeys.length) {
      const rowsX = days.slice().reverse().map((r) => `<tr${r.partial ? ' class="dim"' : ""}><td>${esc(r.date)}</td>${extraKeys.map((k) => `<td>${fnum(r[k]) ?? '<span class="dim">veri yok</span>'}</td>`).join("")}</tr>`).join("");
      out.push(`<h3 style="margin:22px 0 8px;font-size:16px">Uygulamaya özel (o gün olayı yaşayan cihaz sayısı)</h3><div class="tablewrap"><table><thead><tr><th>Gün</th>${extraKeys.map((k) => `<th>${esc(LABEL[k] || k)}</th>`).join("")}</tr></thead><tbody>${rowsX}</tbody></table></div>`);
    }
  }

  // 3. Sales
  out.push(sec("Satışlar"));
  const sales = ops.sales;
  if (!sales) out.push(none);
  else {
    const sd = Array.isArray(sales.days) ? sales.days.slice().sort((a, b) => (a.date < b.date ? -1 : 1)) : [];
    const sum = (k) => sd.reduce((a, r) => a + (fnum(r[k]) || 0), 0);
    const total = sum("apple_usd") + sum("google_usd");
    const refPct = total > 0 ? sum("refunds_usd") / total : 0;
    const refLv = sum("refunds_usd") > 0 ? (refPct >= 0.1 ? "r" : refPct >= 0.05 ? "y" : "g") : "g";
    const noUsd = sd.length && sd.every((r) => fnum(r.apple_usd) === null && fnum(r.google_usd) === null);
    out.push(ctiles([
      noUsd ? ctile(`Apple satış adedi (${range} gün)`, sum("apple_count"), "", "Fiyat tutulmuyor") : ctile(`Apple (${range} gün)`, usd(sum("apple_usd")), "", `${sum("apple_count")} satış`),
      noUsd ? ctile(`Google satış adedi (${range} gün)`, sum("google_count"), "", "Fiyat tutulmuyor") : ctile(`Google (${range} gün)`, usd(sum("google_usd")), "", `${sum("google_count")} satış`),
      noUsd ? ctile("İade", sd.some((r) => fnum(r.refunds_count) !== null) ? sum("refunds_count") : null) : ctile("İade", usd(sum("refunds_usd")), refLv, `${sum("refunds_count")} adet`),
      `<div class="tile" style="opacity:.6"><b>${fnum(sales.test_purchases_30d) ?? "Veri yok"}</b><span>Test satın almaları (sayılmaz, 30 gün)</span></div>`,
    ]));
    if (sd.length && !noUsd) {
      const maxS = Math.max(1, ...sd.map((r) => Math.max(fnum(r.apple_usd) || 0, fnum(r.google_usd) || 0)));
      const bw = sd.length > 31 ? 3 : 7, gap = sd.length > 31 ? 2 : 4, h = 110, step = bw * 2 + gap;
      const bars = sd.map((r, i) => {
        const a = fnum(r.apple_usd) || 0, g = fnum(r.google_usd) || 0;
        const ha = Math.round((a / maxS) * (h - 10)), hg = Math.round((g / maxS) * (h - 10));
        return `<rect x="${i * step}" y="${h - ha}" width="${bw}" height="${ha}" fill="#8b5cff"><title>${esc(r.date)} Apple $${a}</title></rect><rect x="${i * step + bw}" y="${h - hg}" width="${bw}" height="${hg}" fill="#c6ff3d"><title>${esc(r.date)} Google $${g}</title></rect>`;
      }).join("");
      out.push(`<div class="tablewrap" style="padding:16px"><p class="countries" style="margin:0 0 8px">Günlük satış (USD): <span style="color:#8b5cff">■</span> Apple <span style="color:#c6ff3d">■</span> Google</p><svg viewBox="0 0 ${sd.length * step} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Günlük satış">${bars}</svg></div>`);
    }
    // 4. Products
    out.push(sec("Ürünler (30 gün)"));
    const prods = Array.isArray(sales.by_product_30d) ? sales.by_product_30d : null;
    out.push(!prods ? none : !prods.length ? '<p class="empty">Bu dönemde satış yok.</p>' : `<div class="tablewrap"><table><thead><tr><th>Ürün</th><th>Mağaza</th><th>Adet</th><th>USD</th></tr></thead><tbody>${prods.map((r) => `<tr><td>${esc(r.product_id ?? "")}</td><td>${esc({ apple: "Apple", google: "Google" }[r.store] ?? r.store ?? "")}</td><td>${fnum(r.count) ?? ""}</td><td>${usd(r.usd) ?? ""}</td></tr>`).join("")}</tbody></table></div>`);
    // 5. Subscriptions
    out.push(sec("Abonelikler (30 gün)"));
    const sub = sales.subscriptions_30d;
    out.push(!sub ? none : ctiles([ctile("Yeni", fnum(sub.new)), ctile("Yenilenen", fnum(sub.renewed)), ctile("İptal / süresi biten", fnum(sub.cancelled_or_expired)), ctile("Şimdi etkin", fnum(sub.active_now))]));
  }

  // 6. Online
  out.push(sec("Online"));
  const on = ops.online;
  out.push(!on ? none : ctiles([
    ctile("Dünya", fnum(on.worlds)), ctile("Şirket", fnum(on.companies)), ctile("Dernek", fnum(on.guilds)),
    ctile("Mesaj (7 gün)", fnum(on.messages_7d)), ctile("Dernek mesajı (7 gün)", fnum(on.guild_messages_7d)),
    ctile("Açık şikayet", fnum(on.reports_open), lvl3(on.reports_open, 1, 10)),
    ctile("Açık hile işareti", fnum(on.cheat_flags_open), lvl3(on.cheat_flags_open, 1, 10)),
  ]));

  // 7. Funnel
  out.push(sec("Huni"));
  const fun = Array.isArray(ops.funnel) ? ops.funnel : null;
  if (!fun || !fun.length) out.push(none);
  else {
    const top = Math.max(1, fnum(fun[0].players) || 0);
    out.push(`<div class="tablewrap" style="padding:16px 18px">${fun.map((f, i) => {
      const n = fnum(f.players) || 0, prev = i ? fnum(fun[i - 1].players) || 0 : null;
      const pct = prev ? Math.round((n / prev) * 100) : null;
      return `<div class="fun"><span class="fun-l">${esc(f.step)}</span><span class="fun-b"><i style="width:${Math.max(1, Math.round((n / top) * 100))}%"></i></span><span class="fun-n">${n}${pct === null ? "" : ` <span class="dim">(%${pct})</span>`}</span></div>`;
    }).join("")}</div>`);
  }

  // 8. Health
  out.push(sec("Sağlık"));
  const he = ops.health;
  if (!he) out.push(none);
  else {
    const cf = fnum(he.crash_free_sessions_7d);
    const cron = Array.isArray(he.cron_failures_24h) ? he.cron_failures_24h : null;
    out.push(ctiles([
      ctile("Çökmesiz oturum (7 gün)", cf === null ? null : `%${(cf * 100).toFixed(2)}`, cf === null ? "" : cf >= 0.99 ? "g" : cf >= 0.97 ? "y" : "r"),
      ctile("Açık olay", fnum(he.incidents_open), lvl3(he.incidents_open, 1, 3)),
      ctile("Gönderilmemiş uyarı", fnum(he.alerts_unsent), lvl3(he.alerts_unsent, 1, 5)),
      ctile("Hatalı zamanlanmış iş (24 saat)", cron === null ? null : cron.length, cron === null ? "" : cron.length ? "r" : "g"),
      ctile("Veritabanı (MB)", fnum(he.db_size_mb), lvl3(he.db_size_mb, 6000, 7500)),
    ]));
    if (cron && cron.length) out.push(`<p class="countries">Hatalı işler: ${cron.map((c) => esc(typeof c === "string" ? c : c.job ?? c.name ?? JSON.stringify(c))).join(", ")}</p>`);
    const errs = Array.isArray(he.top_errors_7d) ? he.top_errors_7d : [];
    out.push(`<h3 style="margin:18px 0 8px;font-size:16px">En sık hatalar (7 gün)</h3>${errs.length ? `<div class="tablewrap"><table><thead><tr><th>Hata</th><th>Sayı</th></tr></thead><tbody>${errs.map((e) => `<tr><td style="white-space:normal">${esc(e.group ?? "")}</td><td>${fnum(e.count) ?? ""}</td></tr>`).join("")}</tbody></table></div>` : '<p class="empty">Hata yok.</p>'}`);
    const tabs = Array.isArray(he.largest_tables) ? he.largest_tables : [];
    if (tabs.length) out.push(`<h3 style="margin:18px 0 8px;font-size:16px">En büyük tablolar</h3><div class="tablewrap"><table><thead><tr><th>Tablo</th><th>MB</th></tr></thead><tbody>${tabs.map((t) => `<tr><td>${esc(t.table ?? "")}</td><td>${fnum(t.mb) ?? ""}</td></tr>`).join("")}</tbody></table></div>`);
  }
  return out.join("\n");
}

// Store pages for products without their own feed (PromoVote, Poleris): rows written by the API Worker's daily
// collector into promovote-db metrics_daily (Apple sales reports, Google Play report files).
async function storeMetricsPage(env, path, prod, name, apple, range, feed = null) {
  const store = apple ? "App Store" : "Google Play";
  const source = apple ? "app_store" : "google_play";
  if (!env.APPDB) return `<div class="top"><h1>${store}: ${esc(name)}</h1></div><p class="empty">Veri yok</p>`;
  const since = new Date(Date.now() - range * 864e5).toISOString().slice(0, 10);
  const [{ results }, last] = await Promise.all([
    env.APPDB.prepare("SELECT date, metric, value FROM metrics_daily WHERE product_id = ? AND source = ? AND date >= ? ORDER BY date DESC").bind(prod, source, since).all(),
    env.APPDB.prepare("SELECT name, ran_at FROM job_runs WHERE name IN ('store_stats', 'store_stats_note')").all(),
  ]);
  const runs = Object.fromEntries((last.results || []).map((r) => [r.name, r.ran_at]));
  const byDate = {};
  for (const r of results) (byDate[r.date] ||= {})[r.metric] = r.value;
  const dates = Object.keys(byDate).sort().reverse();
  const sum = (m) => { const v = dates.map((d) => byDate[d][m]).filter((x) => typeof x === "number"); return v.length ? v.reduce((a, x) => a + x, 0) : null; };
  const latest = (m) => { for (const d of dates) if (typeof byDate[d][m] === "number") return byDate[d][m]; return null; };
  const main = apple ? "downloads" : "installs";
  const tiles = apple
    ? [ctile(`${range} günde indirme`, sum("downloads")), ctile("Yeniden indirme", sum("redownloads")), ctile("Güncelleme", sum("updates")), ctile("Uygulama içi satın alma (adet)", sum("iap_units"))]
    : [ctile(`${range} günde yükleme`, sum("installs")), ctile("Kaldırma", sum("uninstalls")), ctile("Aktif cihaz", latest("active_devices")), ctile("Puan", latest("rating_avg") === null ? null : latest("rating_avg").toFixed(1)), ctile("Çökme", sum("crashes")), ctile("ANR", sum("anrs"))];
  if (feed && feed.ok) {
    const plat = apple ? "ios" : "android";
    const fr = (Array.isArray(feed.data.rows) ? feed.data.rows : []).filter((r) => r && r.platform === plat).sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, range);
    const fs = (k) => { const vals = fr.map((r) => fnum(r[k])).filter((x) => x !== null); return vals.length ? vals.reduce((a, x) => a + x, 0) : null; };
    const fa = (k) => { const vals = fr.map((r) => fnum(r[k])).filter((x) => x !== null); return vals.length ? vals.reduce((a, x) => a + x, 0) / vals.length : null; };
    tiles.push(ctile(`${range} günde ilk açılış (uygulamadan)`, fs("new_players")), ctile("Ertesi gün geri gelen (ortalama)", fa("d1") === null ? null : `%${Math.round(fa("d1") * 100)}`));
  }
  const series = dates.slice().reverse();
  const maxV = Math.max(1, ...series.map((d) => byDate[d][main] || 0));
  const bw = range > 30 ? 6 : 18, gap = range > 30 ? 2 : 6, h = 120;
  const bars = series.map((d, i) => { const v = byDate[d][main] || 0; const bh = Math.round((v / maxV) * (h - 20)); return `<rect x="${i * (bw + gap)}" y="${h - bh}" width="${bw}" height="${bh}" rx="4" fill="#c6ff3d"><title>${esc(d)}: ${v}</title></rect>`; }).join("");
  const v = (x) => (typeof x === "number" ? Math.round(x * 100) / 100 : '<span class="dim">veri yok</span>');
  const cols = apple ? [["downloads", "İndirme"], ["redownloads", "Yeniden indirme"], ["updates", "Güncelleme"], ["iap_units", "Satın alma"]] : [["installs", "Yükleme"], ["uninstalls", "Kaldırma"], ["active_devices", "Aktif cihaz"], ["rating_avg", "Puan"], ["crashes", "Çökme"], ["anrs", "ANR"]];
  const table = dates.length
    ? dates.map((d) => `<tr><td>${esc(d)}</td>${cols.map(([k]) => `<td>${v(byDate[d][k])}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${cols.length + 1}" class="dim center">Henüz veri yok.</td></tr>`;
  const note = apple ? "Apple satış raporu her gün güncellenir, 1 gün gecikmeli gelir." : "Google rapor dosyaları 2 ile 4 gün gecikmeli gelir; yeni bağlanan hesapta ilk veri 24 saat sürebilir.";
  const status = runs.store_stats_note && runs.store_stats_note !== "ok" ? ` Son toplama notu: ${esc(runs.store_stats_note)}.` : "";
  return `<div class="top"><h1>${store}: ${esc(name)}</h1></div>
<p class="countries">${note} Son toplama: ${esc(String(runs.store_stats || "henüz yok").slice(0, 16).replace("T", " "))} UTC.${status}</p>
${rangePills(path, range, `&p=${prod}`)}
${ctiles(tiles)}
${series.length ? `<h2 style="font-size:20px;margin:28px 0 10px">Günlük ${apple ? "indirme" : "yükleme"} (son ${range} gün)</h2><div class="tablewrap" style="padding:16px"><svg viewBox="0 0 ${Math.max(1, series.length * (bw + gap))} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Günlük ${apple ? "indirme" : "yükleme"}">${bars}</svg></div>` : ""}
<h2 style="font-size:20px;margin:28px 0 10px">Günlük tablo</h2>
<div class="tablewrap"><table><thead><tr><th>Gün</th>${cols.map(([, l]) => `<th>${l}</th>`).join("")}</tr></thead><tbody>${table}</tbody></table></div>`;
}

async function handleAdmin(request, env, url) {
  if (!env.ADMIN_PASSWORD) return new Response("Not found", { status: 404 });
  if (!isAdmin(request, env)) {
    return new Response("Login required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="PromoVote admin", charset="UTF-8"', ...ADMIN_HEADERS },
    });
  }
  const path = url.pathname.replace(/\/+$/, "") || "/admin";

  if (path === "/admin" || path === "/admin/export.csv") {
    const { results: rows } = await env.DB.prepare(
      "SELECT id, email, role, link, country, created_at FROM waitlist ORDER BY id DESC"
    ).all();

    if (path === "/admin/export.csv") {
      const cell = (v) => {
        let t = String(v ?? "");
        if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; // block spreadsheet formula injection
        return `"${t.replace(/"/g, '""')}"`;
      };
      const csv = ["id,email,role,link,country,created_at_utc"]
        .concat(rows.map((r) => [r.id, r.email, r.role, r.link, r.country, r.created_at].map(cell).join(",")))
        .join("\n");
      return new Response(csv, {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="promovote-waitlist.csv"', ...ADMIN_HEADERS },
      });
    }

    const byRole = {};
    const byCountry = {};
    let today = 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    for (const r of rows) {
      byRole[r.role] = (byRole[r.role] || 0) + 1;
      if (r.country) byCountry[r.country] = (byCountry[r.country] || 0) + 1;
      if (String(r.created_at).startsWith(todayStr)) today++;
    }
    const topCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const table = rows.length
      ? rows
          .map(
            (r) => `<tr><td>${r.id}</td><td>${esc(r.email)}</td><td><span class="role role-${esc(r.role)}">${esc(ROLE_LABELS[r.role] || r.role)}</span></td><td>${
              r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">${esc(r.link.replace(/^https?:\/\//, ""))}</a>` : '<span class="dim">yok</span>'
            }</td><td>${esc(r.country || "")}</td><td class="dim">${esc(r.created_at)} UTC</td></tr>`
          )
          .join("")
      : '<tr><td colspan="6" class="dim center">Henüz kayıt yok.</td></tr>';
    return adminPage(path, "Bekleme listesi", `<div class="top"><h1>Bekleme listesi</h1><a class="btn btn-small" href="/admin/export.csv">CSV indir</a></div>
${tilesHtml([["Toplam kayıt", rows.length], ["Bugün", today], ...Object.keys(ROLE_LABELS).map((k) => [ROLE_LABELS[k], byRole[k] || 0])])}
<p class="countries">En çok ülke: ${topCountries.length ? topCountries.map(([c, n]) => `${esc(c)} (${n})`).join(", ") : "henüz yok"}</p>
<div class="tablewrap"><table><thead><tr><th>#</th><th>E-posta</th><th>Rol</th><th>Link</th><th>Ülke</th><th>Tarih</th></tr></thead><tbody>${table}</tbody></table></div>`);
  }

  if (path === "/admin/visitors") {
    const range = rangeOf(url);
    const since = new Date(Date.now() - (range - 1) * 864e5).toISOString().slice(0, 10);
    const [{ results: daily }, { results: refs }, { results: vCountries }, { results: pages }] = await env.DB.batch([
      env.DB.prepare("SELECT day, COUNT(DISTINCT visitor) v, COUNT(*) pv, SUM(device = 'mobile') m FROM visits WHERE day >= ? GROUP BY day ORDER BY day DESC").bind(since),
      env.DB.prepare("SELECT ref k, COUNT(DISTINCT day || visitor) n FROM visits WHERE day >= ? AND ref IS NOT NULL GROUP BY ref ORDER BY n DESC LIMIT 10").bind(since),
      env.DB.prepare("SELECT country k, COUNT(DISTINCT day || visitor) n FROM visits WHERE day >= ? AND country IS NOT NULL GROUP BY country ORDER BY n DESC LIMIT 10").bind(since),
      env.DB.prepare("SELECT path k, COUNT(*) n FROM visits WHERE day >= ? GROUP BY path ORDER BY n DESC LIMIT 10").bind(since),
    ]);
    const list = (rows) => (rows.length ? rows.map((r) => `${esc(r.k)} (${r.n})`).join(", ") : "henüz yok");
    const visitRows = daily.length
      ? daily.map((d) => `<tr><td>${esc(d.day)}</td><td>${d.v}</td><td>${d.pv}</td><td>${d.m}</td></tr>`).join("")
      : '<tr><td colspan="4" class="dim center">Henüz ziyaret yok.</td></tr>';
    const total = daily.reduce((a, d) => a + d.v, 0);
    return adminPage(path, "Ziyaretçiler", `<div class="top"><h1>Gerçek ziyaretçiler</h1></div>
${rangePills(path, range)}
<p class="countries">Son ${range} gün. Botlar, tarayıcı robotları ve senin admin tarayıcın sayılmaz. Kaynağı gizleyen uygulamalardan (X uygulaması gibi) gelenler "doğrudan" görünür.</p>
${tilesHtml([[`${range} günde ziyaretçi`, total], ["Bugün", daily[0] && daily[0].day === new Date().toISOString().slice(0, 10) ? daily[0].v : 0]])}
<div class="tablewrap"><table><thead><tr><th>Gün (UTC)</th><th>Ziyaretçi</th><th>Sayfa görüntüleme</th><th>Mobil görüntüleme</th></tr></thead><tbody>${visitRows}</tbody></table></div>
<p class="countries" style="margin-top:16px">Nereden geldi: ${list(refs)}<br>Ülkeler: ${list(vCountries)}<br>Sayfalar: ${list(pages)}</p>`);
  }

  if (path === "/admin/x") {
    // Stats are read by the API Worker about 24 h and 72 h after each post.
    if (!env.APPDB) return adminPage(path, "X", '<div class="top"><h1>X paylaşımları</h1></div><p class="empty">Uygulama veritabanı bağlı değil.</p>');
    try {
      const [{ results: xPosts }, { results: xSum }] = await env.APPDB.batch([
        env.APPDB.prepare("SELECT posted_at, body, external_id, impressions, likes, reposts, replies, bookmarks, media_url IS NOT NULL AS video FROM social_posts WHERE status = 'posted' ORDER BY posted_at DESC LIMIT 60"),
        env.APPDB.prepare("SELECT status, COUNT(*) n, MAX(scheduled_at) last FROM social_posts GROUP BY status"),
      ]);
      const sum = Object.fromEntries(xSum.map((r) => [r.status, r]));
      const n = (v) => (v === null || v === undefined ? '<span class="dim">bekliyor</span>' : v);
      const withStats = xPosts.filter((p) => p.impressions !== null);
      const total = (k) => withStats.reduce((a, p) => a + (p[k] || 0), 0);
      const xRows = xPosts.length
        ? xPosts.map((p) => `<tr><td class="dim">${esc(String(p.posted_at).slice(0, 16).replace("T", " "))}</td><td style="white-space:normal;min-width:260px">${p.video ? '<span class="role role-developer">video</span> ' : ""}${
            p.external_id ? `<a href="https://x.com/i/status/${esc(p.external_id)}" target="_blank" rel="noopener noreferrer">${esc(String(p.body).slice(0, 90))}</a>` : esc(String(p.body).slice(0, 90))
          }</td><td>${n(p.impressions)}</td><td>${n(p.likes)}</td><td>${n(p.reposts)}</td><td>${n(p.replies)}</td><td>${n(p.bookmarks)}</td></tr>`).join("")
        : '<tr><td colspan="7" class="dim center">Henüz paylaşım yok.</td></tr>';
      return adminPage(path, "X", `<div class="top"><h1>X paylaşımları</h1></div>
<p class="countries">İstatistikler her paylaşımdan yaklaşık 24 ve 72 saat sonra okunur; yeni paylaşımlarda "bekliyor" yazar. Sıradaki son paylaşım: ${esc(String(sum.queued?.last || "yok").slice(0, 10))}.</p>
${tilesHtml([["Paylaşılan", sum.posted?.n || 0], ["Sırada", sum.queued?.n || 0], ["Hata", sum.failed?.n || 0], ["Toplam görüntülenme", total("impressions")], ["Beğeni", total("likes")], ["Repost", total("reposts")]])}
<div class="tablewrap"><table><thead><tr><th>Zaman (UTC)</th><th>Paylaşım</th><th>Görüntülenme</th><th>Beğeni</th><th>Repost</th><th>Yanıt</th><th>Kaydetme</th></tr></thead><tbody>${xRows}</tbody></table></div>`);
    } catch (err) {
      console.error("admin_x_error", err?.message);
      return adminPage(path, "X", '<div class="top"><h1>X paylaşımları</h1></div><p class="empty">Veri alınamadı. Biraz sonra tekrar dene.</p>');
    }
  }

  if (path === "/admin/poleris/uygulama") {
    const range = rangeOf(url);
    const r = await productFeed(env, "poleris", `feed=ops&days=${range}`, 300);
    if (!r.ok) return adminPage(path, "Poleris: uygulama", `<div class="top"><h1>Poleris: uygulama</h1></div><p class="empty">${r.reason === "no_key" ? "Bağlantı anahtarı (POLERIS_STATS_KEY) yok." : "Poleris verileri şu an alınamadı. Biraz sonra tekrar dene."}</p>`);
    return adminPage(path, "Poleris: uygulama", heOpsPage(path, r.data, range, "Poleris", "uygulama"));
  }

  if (path === "/admin/hauling-empire/oyun") {
    const range = rangeOf(url);
    const r = await heOps(env, range);
    if (!r.ok) return adminPage(path, "Hauling Empire: oyun", `<div class="top"><h1>Hauling Empire: oyun</h1></div><p class="empty">${r.reason === "no_key" ? "Bağlantı anahtarı (HE_STATS_KEY) yok." : "Oyun verileri şu an alınamadı. Biraz sonra tekrar dene."}</p>`);
    return adminPage(path, "Hauling Empire: oyun", heOpsPage(path, r.data, range));
  }

  if (path === "/admin/app-store" || path === "/admin/google-play") {
    const apple = path === "/admin/app-store";
    const platform = apple ? "ios" : "android";
    const store = apple ? "App Store" : "Google Play";
    const PRODUCTS = [["haulingempire", "Hauling Empire"], ["poleris", "Poleris"], ["promovote", "PromoVote"]];
    const prod = PRODUCTS.some(([k]) => k === url.searchParams.get("p")) ? url.searchParams.get("p") : "haulingempire";
    const range0 = rangeOf(url);
    const products = `<div class="tabs" style="border:0;margin-top:14px">${PRODUCTS.map(([k, n]) => `<a class="tab${k === prod ? " on" : ""}" href="${path}?p=${k}&range=${range0}">${n}</a>`).join("")}</div>`;
    if (prod !== "haulingempire") return adminPage(path, store, products + (await storeMetricsPage(env, path, prod, PRODUCTS.find(([k]) => k === prod)[1], apple, range0, FEEDS[prod] ? await productFeed(env, prod, "days=90", 3600) : null)));
    const [data, opsR] = await Promise.all([heStats(env), heOps(env, 30)]);
    if (!data.ok) {
      const msg = data.reason === "no_key"
        ? "Hauling Empire bağlantı anahtarı (HE_STATS_KEY) henüz bu Worker'a girilmedi. Girilince veriler burada görünür."
        : "Hauling Empire verileri şu an alınamadı. Biraz sonra tekrar dene.";
      return adminPage(path, store, `${products}<div class="top"><h1>${store}: Hauling Empire</h1></div><p class="empty">${esc(msg)}</p>`);
    }
    const SRC = { ok: "güncel", late: "gecikmeli", missing_key: "anahtar yok", error: "hata", unknown: "henüz bağlanmadı" };
    const srcLine = `Kaynaklar: ${apple ? "Apple" : "Google"} ${esc(SRC[data.sources?.[apple ? "apple" : "google"]] || "bilinmiyor")}, oyun sunucusu ${esc(SRC[data.sources?.game_server] || "bilinmiyor")}. Son güncelleme: ${esc(String(data.generated_at || "").slice(0, 16).replace("T", " "))} UTC.`;
    const rows = (Array.isArray(data.rows) ? data.rows : []).filter((r) => r && r.platform === platform && /^\d{4}-\d{2}-\d{2}$/.test(String(r.date))).sort((x, y) => (x.date < y.date ? 1 : -1));
    const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);
    const NA = '<span class="dim">veri henüz yok</span>';
    const show = (v, pct) => { v = num(v); return v === null ? NA : pct ? `%${(v * 100).toFixed(pct === 2 ? 2 : 0)}` : String(Math.round(v * 100) / 100); };
    const range = rangeOf(url);
    const last7 = rows.slice(0, range);
    const sum7 = (k) => { const vals = last7.map((r) => num(r[k])).filter((v) => v !== null); return vals.length ? vals.reduce((a, v) => a + v, 0) : null; };
    const avg7 = (k) => { const vals = last7.map((r) => num(r[k])).filter((v) => v !== null); return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null; };
    const latest = (k) => { for (const r of rows) if (num(r[k]) !== null) return num(r[k]); return null; };
    const tile = (l, v) => [l, v === null ? '<span class="dim" style="font-size:16px">veri henüz yok</span>' : v];
    const tiles = tilesHtml([
      tile(`${range} günde yeni oyuncu`, sum7("new_players")),
      tile(`${range} günde indirme`, sum7("downloads")),
      tile(apple ? `${range} günde sayfa görüntüleme` : `${range} günde mağaza ziyareti`, sum7("store_page_views")),
      tile("Ertesi gün geri gelen (ortalama)", avg7("d1") === null ? null : `%${Math.round(avg7("d1") * 100)}`),
      tile("Puan", latest("rating_avg") === null ? null : `${latest("rating_avg").toFixed(1)} (${latest("ratings_count") ?? 0})`),
      tile("Çökme oranı", latest("crash_rate") === null ? null : `%${(latest("crash_rate") * 100).toFixed(2)}`),
    ]);
    // Simple bar chart of new players, last 30 days (server-drawn SVG, no scripts).
    const series = rows.slice(0, range).reverse();
    const maxV = Math.max(1, ...series.map((r) => num(r.new_players) || 0));
    const bw = range > 30 ? 6 : 18, gap = range > 30 ? 2 : 6, h = 120;
    const bars = series.map((r, i) => { const v = num(r.new_players) || 0; const bh = Math.round((v / maxV) * (h - 20)); return `<rect x="${i * (bw + gap)}" y="${h - bh}" width="${bw}" height="${bh}" rx="4" fill="#c6ff3d"><title>${esc(r.date)}: ${v}</title></rect>`; }).join("");
    const chart = series.length ? `<h2 style="font-size:20px;margin:28px 0 10px">Günlük yeni oyuncu (son ${range} gün)</h2><div class="tablewrap" style="padding:16px"><svg viewBox="0 0 ${Math.max(1, series.length * (bw + gap))} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Günlük yeni oyuncu">${bars}</svg></div>` : "";
    const table = rows.length
      ? rows.slice(0, range).map((r) => `<tr><td>${esc(r.date)}</td><td>${show(r.new_players)}</td><td>${show(r.downloads)}</td><td>${show(r.store_page_views)}</td><td>${show(r.d1, 1)}</td><td>${show(r.d7, 1)}</td><td>${show(r.crash_rate, 2)}</td>${apple ? "" : `<td>${show(r.anr_rate, 2)}</td>`}<td>${show(r.rating_avg)}</td></tr>`).join("")
      : `<tr><td colspan="${apple ? 8 : 9}" class="dim center">Henüz veri yok.</td></tr>`;
    return adminPage(path, store, `${products}<div class="top"><h1>${store}: Hauling Empire</h1></div>
<p class="countries">${srcLine} Sadece biten günler görünür (UTC). Yeni oyuncu 5'ten azsa geri gelme oranı gizlenir.</p>
${rangePills(path, range, "&p=haulingempire")}
${tiles}
${heSalesCard(opsR.ok ? opsR.data : null)}
${chart}
<h2 style="font-size:20px;margin:28px 0 10px">Günlük tablo</h2>
<div class="tablewrap"><table><thead><tr><th>Gün</th><th>Yeni oyuncu</th><th>İndirme</th><th>${apple ? "Sayfa görüntüleme" : "Mağaza ziyareti"}</th><th>Ertesi gün</th><th>7. gün</th><th>Çökme</th>${apple ? "" : "<th>ANR</th>"}<th>Puan</th></tr></thead><tbody>${table}</tbody></table></div>`);
  }

  return adminPage(path, "Bulunamadı", '<div class="top"><h1>Sayfa bulunamadı</h1></div>');
}

// Static assets ignore Range headers, but Safari needs 206 responses to play <video>.
async function serveMedia(request, env) {
  const res = await env.ASSETS.fetch(new Request(request.url, { method: "GET" }));
  if (!res.ok) return res;
  const headers = new Headers(res.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=604800");
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  const range = request.headers.get("Range");
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m) return new Response(request.method === "HEAD" ? null : res.body, { status: 200, headers });
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  let start = m[1] === "" ? size - Number(m[2]) : Number(m[1]);
  let end = m[1] === "" || m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (Number.isNaN(start) || start < 0) start = 0;
  if (start > end || start >= size) {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(request.method === "HEAD" ? null : buf.slice(start, end + 1), { status: 206, headers });
}

// Adds the visit counter script to every HTML page served from static assets.
function withCounter(res) {
  if (!(res.headers.get("Content-Type") || "").includes("text/html")) return res;
  return new HTMLRewriter()
    .on("head", { element: (el) => el.append('<script src="/v.js" defer></script>', { html: true }) })
    .transform(res);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // developer.promovote.com is the API early access page (founder idea 2026-10-09).
    if (url.hostname === "developer.promovote.com") {
      return Response.redirect("https://promovote.com/developers", 301);
    }
    if (url.hostname === "www.promovote.com") {
      url.hostname = "promovote.com";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/.well-known/security.txt") {
      // Wrangler does not upload dot folders, so serve the RFC 9116 path from /security.txt.
      const res = await env.ASSETS.fetch(new Request(new URL("/security.txt", url), request));
      return new Response(res.body, { status: res.status, headers: { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS } });
    }

    // iOS universal links: shared promo links (promovote.com/?v=slug) open the app when it is installed.
    // Only links with ?v= go to the app; the plain site and every other page stay on the web.
    if (url.pathname === "/.well-known/apple-app-site-association" || url.pathname === "/apple-app-site-association") {
      const aasa = { applinks: { details: [{ appIDs: ["6WRT42YG28.com.miapera.promovote"], components: [{ "/": "/", "?": { v: "?*" }, comment: "Shared promo" }] }] } };
      return new Response(JSON.stringify(aasa), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } });
    }

    // Creator profiles: /@handle is served from /creators/<handle>.html
    const profile = /^\/@([a-z0-9_]{3,24})\/?$/.exec(url.pathname);
    if (profile) {
      const res = await env.ASSETS.fetch(new Request(new URL(`/creators/${profile[1]}`, url), request));
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
      return withCounter(out);
    }

    if (url.pathname.startsWith("/media/") && (request.method === "GET" || request.method === "HEAD")) {
      return serveMedia(request, env);
    }

    // Per IP limits (security review 2026-10-09): admin login guesses and visit counter padding.
    if (env.LIMIT && (url.pathname === "/admin" || url.pathname.startsWith("/admin/") || url.pathname === "/api/v")) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.LIMIT.limit({ key: (url.pathname === "/api/v" ? "v:" : "a:") + ip });
      if (!success) return new Response("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
    }
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return handleAdmin(request, env, url);
    }

    if (url.pathname === "/api/v") {
      try {
        return await handleVisit(request, env);
      } catch (err) {
        console.error("visit_error", err?.message);
        return new Response(null, { status: 204 });
      }
    }

    if (url.pathname === "/api/waitlist") {
      try {
        return await handleWaitlist(request, env);
      } catch (err) {
        console.error("waitlist_error", err?.message);
        return json({ ok: false, error: "server_error" }, 500);
      }
    }

    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
    return withCounter(out);
  },
};
