const ROLES = new Set(["creator", "developer", "brand", "viewer"]);
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "www.promovote.com") {
      url.hostname = "promovote.com";
      return Response.redirect(url.toString(), 301);
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
