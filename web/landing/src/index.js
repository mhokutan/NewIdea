const ROLES = new Set(["creator", "developer", "brand", "viewer"]);
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
    "INSERT INTO waitlist (email, role, link, country) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(email) DO UPDATE SET role = excluded.role, link = COALESCE(excluded.link, waitlist.link)"
  )
    .bind(email, role, link, country)
    .run();

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

const ADMIN_HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", ...SECURITY_HEADERS };
const ROLE_LABELS = { creator: "Creator / Streamer", developer: "Game developer", brand: "Brand / Business", viewer: "Viewer" };

async function handleAdmin(request, env, url) {
  if (!env.ADMIN_PASSWORD) return new Response("Not found", { status: 404 });
  if (!isAdmin(request, env)) {
    return new Response("Login required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="PromoVote admin", charset="UTF-8"', ...ADMIN_HEADERS },
    });
  }

  const { results: rows } = await env.DB.prepare(
    "SELECT id, email, role, link, country, created_at FROM waitlist ORDER BY id DESC"
  ).all();

  if (url.pathname === "/admin/export.csv") {
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

  const tiles = [
    ["Total signups", rows.length],
    ["Today", today],
    ...Object.keys(ROLE_LABELS).map((k) => [ROLE_LABELS[k], byRole[k] || 0]),
  ]
    .map(([l, n]) => `<div class="tile"><b>${n}</b><span>${esc(l)}</span></div>`)
    .join("");

  const table = rows.length
    ? rows
        .map(
          (r) => `<tr><td>${r.id}</td><td>${esc(r.email)}</td><td><span class="role role-${esc(r.role)}">${esc(ROLE_LABELS[r.role] || r.role)}</span></td><td>${
            r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener noreferrer">${esc(r.link.replace(/^https?:\/\//, ""))}</a>` : '<span class="dim">none</span>'
          }</td><td>${esc(r.country || "")}</td><td class="dim">${esc(r.created_at)} UTC</td></tr>`
        )
        .join("")
    : '<tr><td colspan="6" class="dim center">No signups yet.</td></tr>';

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Waitlist | PromoVote admin</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/styles.css">
<style>
.admin{padding:40px 0 80px}.admin h1{font-size:36px;margin:0}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:28px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}.tile{padding:18px;border-radius:16px;background:var(--surface);border:1px solid var(--line)}
.tile b{display:block;font:800 30px var(--display)}.tile span{color:var(--muted);font-size:14px}.countries{color:var(--muted);font-size:14px;margin-bottom:24px}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:16px}table{width:100%;border-collapse:collapse;font-size:14px}
th,td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--muted);font-weight:600;background:var(--surface)}
td a{color:#b394ff}.dim{color:var(--dim)}.center{text-align:center}.role{padding:3px 10px;border-radius:99px;font-size:12px;background:var(--surface-2)}
.role-creator{color:#ff8fa3}.role-developer{color:var(--lime)}.role-brand{color:#b394ff}.role-viewer{color:#7dd3fc}
</style></head><body><main class="wrap admin">
<div class="top"><div><p class="kicker" style="margin:0 0 6px">PromoVote admin</p><h1>Waitlist</h1></div>
<a class="btn btn-small" href="/admin/export.csv">Download CSV</a></div>
<div class="tiles">${tiles}</div>
<p class="countries">Top countries: ${topCountries.length ? topCountries.map(([c, n]) => `${esc(c)} (${n})`).join(", ") : "none yet"}</p>
<div class="tablewrap"><table><thead><tr><th>#</th><th>Email</th><th>Role</th><th>Link</th><th>Country</th><th>Joined</th></tr></thead><tbody>${table}</tbody></table></div>
</main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", ...ADMIN_HEADERS } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "www.promovote.com") {
      url.hostname = "promovote.com";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/.well-known/security.txt") {
      // Wrangler does not upload dot folders, so serve the RFC 9116 path from /security.txt.
      const res = await env.ASSETS.fetch(new Request(new URL("/security.txt", url), request));
      return new Response(res.body, { status: res.status, headers: { "Content-Type": "text/plain; charset=utf-8", ...SECURITY_HEADERS } });
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return handleAdmin(request, env, url);
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
    return out;
  },
};
