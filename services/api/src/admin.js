// Founder tools: upload a video and create a promo, plus public media delivery from R2.
// Protected by the ADMIN_PASSWORD Worker secret (same value as the landing page admin). Never log it.
// New promos are created as 'draft'. They go live only when the request says publish=true.
import { Hono } from "hono";

const MAX_VIDEO = 60 * 1024 * 1024;
const MAX_POSTER = 2 * 1024 * 1024;
const TAG_RE = /^[\p{L}\p{N}_]{2,30}$/u;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,59}$/;
const CTA_KINDS = ["app_store", "google_play", "shop", "etsy", "watch", "website", "notify"];
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const err = (c, status, code, message) => c.json({ error: { code, message } }, status);

async function sha(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}
// Compares two secrets without leaking where they differ.
export async function secretsMatch(given, expected) {
  if (!expected || !given) return false;
  const [a, b] = await Promise.all([sha(given), sha(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function bearer(c) {
  const h = c.req.header("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

const isMp4 = (b) => b.length > 12 && String.fromCharCode(b[4], b[5], b[6], b[7]) === "ftyp";
const isJpeg = (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isPng = (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

export const admin = new Hono();

// ---------------------------------------------------------------- public media
// GET /v1/media/promos/<id>/video.mp4 (supports Range, needed by Safari)
admin.get("/v1/media/*", async (c) => {
  if (!c.env.MEDIA) return err(c, 404, "not_found", "Not found.");
  const key = decodeURIComponent(new URL(c.req.url).pathname.slice("/v1/media/".length));
  if (!/^promos\/[0-9a-f-]{36}\/(video\.mp4|poster\.(jpg|png))$/.test(key)) return err(c, 404, "not_found", "Not found.");
  const range = c.req.header("Range");
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  let opts;
  if (m && (m[1] || m[2])) {
    opts = { range: m[1] === "" ? { suffix: Number(m[2]) } : { offset: Number(m[1]), ...(m[2] !== "" ? { length: Number(m[2]) - Number(m[1]) + 1 } : {}) } };
  }
  const obj = await c.env.MEDIA.get(key, opts);
  if (!obj) return err(c, 404, "not_found", "Not found.");
  const headers = new Headers({
    "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  if (opts && obj.range) {
    const start = obj.range.offset ?? obj.size - obj.range.length;
    const length = obj.range.length ?? obj.size - start;
    headers.set("Content-Range", `bytes ${start}-${start + length - 1}/${obj.size}`);
    headers.set("Content-Length", String(length));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(obj.size));
  return new Response(obj.body, { status: 200, headers });
});

// ---------------------------------------------------------------- founder upload
// POST /v1/admin/promos  (multipart/form-data)
//   video   file, MP4, up to 60 MB
//   poster  file, JPEG or PNG, up to 2 MB
//   meta    JSON: { handle, slug, title, description?, lang?, tags?: [..max 5], durationMs, width?, height?,
//                   ctaKind?, ctaUrl?, i18n?, publish?: boolean }
admin.post("/v1/admin/promos", async (c) => {
  if (!(await secretsMatch(bearer(c), c.env.ADMIN_PASSWORD))) return err(c, 401, "unauthorized", "Not allowed.");
  if (!c.env.MEDIA) return err(c, 503, "media_not_configured", "Media storage is not set up yet.");

  let form;
  try { form = await c.req.formData(); } catch { return err(c, 400, "bad_request", "Send multipart/form-data."); }
  let meta;
  try { meta = JSON.parse(String(form.get("meta") || "")); } catch { return err(c, 400, "bad_meta", "meta must be JSON."); }
  const video = form.get("video"), poster = form.get("poster");
  if (!video || typeof video === "string" || !poster || typeof poster === "string") return err(c, 400, "missing_file", "video and poster files are required.");
  if (video.size > MAX_VIDEO) return err(c, 413, "video_too_big", "Video is over 60 MB.");
  if (poster.size > MAX_POSTER) return err(c, 413, "poster_too_big", "Poster is over 2 MB.");
  const vb = new Uint8Array(await video.arrayBuffer()), pb = new Uint8Array(await poster.arrayBuffer());
  if (!isMp4(vb)) return err(c, 400, "bad_video", "Video must be an MP4 file.");
  const posterExt = isJpeg(pb) ? "jpg" : isPng(pb) ? "png" : null;
  if (!posterExt) return err(c, 400, "bad_poster", "Poster must be JPEG or PNG.");

  const title = String(meta.title || "").trim();
  const description = meta.description == null ? null : String(meta.description).trim();
  const slug = String(meta.slug || "");
  const lang = ["en", "es", "tr"].includes(meta.lang) ? meta.lang : "en";
  const tags = [...new Set((meta.tags || []).map((t) => String(t).toLowerCase().replace(/^#/, "")))];
  const durationMs = Number(meta.durationMs);
  if (title.length < 3 || title.length > 60) return err(c, 400, "bad_title", "Title must be 3 to 60 characters.");
  if (description && description.length > 280) return err(c, 400, "bad_description", "Description is over 280 characters.");
  if (!SLUG_RE.test(slug)) return err(c, 400, "bad_slug", "Slug: lowercase letters, digits, dashes, 3 to 60 characters.");
  if (tags.length > 5 || tags.some((t) => !TAG_RE.test(t))) return err(c, 400, "bad_tags", "Up to 5 tags, letters, digits or underscore.");
  if (!(durationMs >= 5000 && durationMs <= 60500)) return err(c, 400, "bad_duration", "durationMs must be 5000 to 60500.");
  if (meta.ctaKind && !CTA_KINDS.includes(meta.ctaKind)) return err(c, 400, "bad_cta", "Unknown ctaKind.");
  if (meta.ctaUrl && !/^https:\/\//.test(meta.ctaUrl)) return err(c, 400, "bad_cta", "ctaUrl must start with https://.");

  const db = c.env.DB;
  const prof = await db.prepare("select id from profiles where handle = ? and type = 'creator' and status = 'active'").bind(String(meta.handle || "")).first();
  if (!prof) return err(c, 404, "creator_not_found", "No active creator with that handle.");
  const dup = await db.prepare("select id from promos where creator_profile_id = ? and slug = ?").bind(prof.id, slug).first();
  if (dup) return err(c, 409, "slug_taken", "This creator already has a promo with that slug.");

  const promoId = uuid();
  const base = `promos/${promoId}`;
  const videoKey = `${base}/video.mp4`, posterKey = `${base}/poster.${posterExt}`;
  await c.env.MEDIA.put(videoKey, vb, { httpMetadata: { contentType: "video/mp4" } });
  await c.env.MEDIA.put(posterKey, pb, { httpMetadata: { contentType: posterExt === "jpg" ? "image/jpeg" : "image/png" } });

  const publish = meta.publish === true;
  const t = now();
  const url = (k) => `${c.env.API_URL}/v1/media/${k}`;
  const stmts = [
    db.prepare(
      `insert into promos (id, creator_profile_id, slug, lang, title, description, i18n, status, cta_kind, cta_url, cta_safety_status, rights_confirmed_at, submitted_at, approved_at, live_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(promoId, prof.id, slug, lang, title, description, meta.i18n ? JSON.stringify(meta.i18n) : null,
      publish ? "live" : "draft", meta.ctaKind || null, meta.ctaUrl || null, meta.ctaUrl ? "safe" : "pending",
      t, t, publish ? t : null, publish ? t : null),
    db.prepare(
      "insert into promo_videos (id, promo_id, label, mp4_url, poster_url, duration_ms, width, height) values (?, ?, 'A', ?, ?, ?, ?, ?)",
    ).bind(uuid(), promoId, url(videoKey), url(posterKey), durationMs, meta.width || 720, meta.height || 1280),
  ];
  tags.forEach((tag, i) => {
    stmts.push(db.prepare("insert into hashtags (tag, use_count) values (?, 1) on conflict(tag) do update set use_count = use_count + 1").bind(tag));
    stmts.push(db.prepare("insert into promo_hashtags (promo_id, tag, position) values (?, ?, ?)").bind(promoId, tag, i));
  });
  try {
    await db.batch(stmts);
  } catch (e) {
    await c.env.MEDIA.delete([videoKey, posterKey]);
    console.error(e);
    return err(c, 500, "db_error", "Could not save the promo.");
  }
  return c.json({ ok: true, id: promoId, status: publish ? "live" : "draft", video: url(videoKey), poster: url(posterKey) }, 201);
});

// POST /v1/admin/promos/:id/publish  { "live": true|false }  moves a draft live, or pauses a live promo.
admin.post("/v1/admin/promos/:id/publish", async (c) => {
  if (!(await secretsMatch(bearer(c), c.env.ADMIN_PASSWORD))) return err(c, 401, "unauthorized", "Not allowed.");
  const b = await c.req.json().catch(() => ({}));
  const t = now();
  const res = b.live === true
    ? await c.env.DB.prepare("update promos set status = 'live', live_at = coalesce(live_at, ?), approved_at = coalesce(approved_at, ?), updated_at = ? where id = ? and status in ('draft', 'paused')").bind(t, t, t, c.req.param("id")).run()
    : await c.env.DB.prepare("update promos set status = 'paused', paused_at = ?, updated_at = ? where id = ? and status = 'live'").bind(t, t, c.req.param("id")).run();
  if (!res.meta?.changes) return err(c, 404, "not_found", "No promo in a state that can change.");
  return c.json({ ok: true });
});
