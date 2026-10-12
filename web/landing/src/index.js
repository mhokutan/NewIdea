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
.empty{padding:28px;border:1px dashed var(--line);border-radius:16px;color:var(--muted);line-height:1.6}
</style></head><body><main class="wrap admin">
<p class="kicker" style="margin:0 0 12px">PromoVote yönetim paneli</p>
<nav class="tabs" aria-label="Admin">${nav}</nav>
${body}
</main><script src="/v-ignore.js"></script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", ...ADMIN_HEADERS } });
}

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
    const since = new Date(Date.now() - 13 * 864e5).toISOString().slice(0, 10);
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
<p class="countries">Son 14 gün. Botlar, tarayıcı robotları ve senin admin tarayıcın sayılmaz. Kaynağı gizleyen uygulamalardan (X uygulaması gibi) gelenler "doğrudan" görünür.</p>
${tilesHtml([["14 günde ziyaretçi", total], ["Bugün", daily[0] && daily[0].day === new Date().toISOString().slice(0, 10) ? daily[0].v : 0]])}
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

  if (path === "/admin/app-store" || path === "/admin/google-play") {
    const apple = path === "/admin/app-store";
    const platform = apple ? "ios" : "android";
    const store = apple ? "App Store" : "Google Play";
    const products = `<div class="tabs" style="border:0;margin-top:14px"><span class="tab on">Hauling Empire</span><span class="tab dim" title="Bağlanınca açılacak">Poleris (yakında)</span><span class="tab dim" title="Bağlanınca açılacak">PromoVote (yakında)</span></div>`;
    const data = await heStats(env);
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
    const last7 = rows.slice(0, 7);
    const sum7 = (k) => { const vals = last7.map((r) => num(r[k])).filter((v) => v !== null); return vals.length ? vals.reduce((a, v) => a + v, 0) : null; };
    const avg7 = (k) => { const vals = last7.map((r) => num(r[k])).filter((v) => v !== null); return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null; };
    const latest = (k) => { for (const r of rows) if (num(r[k]) !== null) return num(r[k]); return null; };
    const tile = (l, v) => [l, v === null ? '<span class="dim" style="font-size:16px">veri henüz yok</span>' : v];
    const tiles = tilesHtml([
      tile("7 günde yeni oyuncu", sum7("new_players")),
      tile("7 günde indirme", sum7("downloads")),
      tile(apple ? "7 günde sayfa görüntüleme" : "7 günde mağaza ziyareti", sum7("store_page_views")),
      tile("Ertesi gün geri gelen (ort.)", avg7("d1") === null ? null : `%${Math.round(avg7("d1") * 100)}`),
      tile("Puan", latest("rating_avg") === null ? null : `${latest("rating_avg").toFixed(1)} (${latest("ratings_count") ?? 0})`),
      tile("Çökme oranı", latest("crash_rate") === null ? null : `%${(latest("crash_rate") * 100).toFixed(2)}`),
    ]);
    // Simple bar chart of new players, last 30 days (server-drawn SVG, no scripts).
    const series = rows.slice(0, 30).reverse();
    const maxV = Math.max(1, ...series.map((r) => num(r.new_players) || 0));
    const bw = 18, gap = 6, h = 120;
    const bars = series.map((r, i) => { const v = num(r.new_players) || 0; const bh = Math.round((v / maxV) * (h - 20)); return `<rect x="${i * (bw + gap)}" y="${h - bh}" width="${bw}" height="${bh}" rx="4" fill="#c6ff3d"><title>${esc(r.date)}: ${v}</title></rect>`; }).join("");
    const chart = series.length ? `<h2 style="font-size:20px;margin:28px 0 10px">Günlük yeni oyuncu (son 30 gün)</h2><div class="tablewrap" style="padding:16px"><svg viewBox="0 0 ${Math.max(1, series.length * (bw + gap))} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Günlük yeni oyuncu">${bars}</svg></div>` : "";
    const table = rows.length
      ? rows.slice(0, 30).map((r) => `<tr><td>${esc(r.date)}</td><td>${show(r.new_players)}</td><td>${show(r.downloads)}</td><td>${show(r.store_page_views)}</td><td>${show(r.d1, 1)}</td><td>${show(r.d7, 1)}</td><td>${show(r.crash_rate, 2)}</td>${apple ? "" : `<td>${show(r.anr_rate, 2)}</td>`}<td>${show(r.rating_avg)}</td></tr>`).join("")
      : `<tr><td colspan="${apple ? 8 : 9}" class="dim center">Henüz veri yok.</td></tr>`;
    return adminPage(path, store, `${products}<div class="top"><h1>${store}: Hauling Empire</h1></div>
<p class="countries">${srcLine} Sadece biten günler görünür (UTC). Yeni oyuncu 5'ten azsa geri gelme oranı gizlenir.</p>
${tiles}
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
