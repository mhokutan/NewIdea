// TikTok for the founder's own account (founder request 2026-11-16), admin only: /admin/tiktok.
// Keys are Worker secrets on promovote-landing: TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET (production app) and
// TIKTOK_SANDBOX_CLIENT_KEY / TIKTOK_SANDBOX_CLIENT_SECRET (sandbox, posts are private until TikTok audits the app).
// Flow: Connect (Login Kit, state cookie) > callback stores the tokens AES-GCM sealed in D1 promovote-waitlist
// (tables tiktok_auth, tiktok_posts) > the owner picks a promo video, writes the caption, chooses the privacy level
// from TikTok's own options and presses a button: draft to the TikTok inbox (video.upload) or direct post
// (video.publish). Nothing is ever posted without that press (TikTok content sharing rules). Tokens never leave the
// Worker and are never shown.

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const API = "https://open.tiktokapis.com";
const REDIRECT = "https://promovote.com/admin/tiktok/callback";
const SCOPES = "user.info.basic,video.upload,video.publish";
const ORIGIN = "https://promovote.com";
const MAX_BYTES = 60 * 1024 * 1024;
const PRIVACY_TR = { PUBLIC_TO_EVERYONE: "Herkese açık", MUTUAL_FOLLOW_FRIENDS: "Arkadaşlar", FOLLOWER_OF_CREATOR: "Takipçiler", SELF_ONLY: "Sadece ben" };
const STATUS_TR = { PROCESSING_UPLOAD: "Yükleniyor", PROCESSING_DOWNLOAD: "İşleniyor", SEND_TO_USER_INBOX: "TikTok gelen kutusunda", PUBLISH_COMPLETE: "Paylaşıldı", FAILED: "Hata" };

export function tiktokKeys(env, mode) {
  return mode === "sandbox"
    ? { key: env.TIKTOK_SANDBOX_CLIENT_KEY, secret: env.TIKTOK_SANDBOX_CLIENT_SECRET }
    : { key: env.TIKTOK_CLIENT_KEY, secret: env.TIKTOK_CLIENT_SECRET };
}

async function ensureTables(env) {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS tiktok_auth (id TEXT PRIMARY KEY, mode TEXT NOT NULL, open_id TEXT, display_name TEXT, scope TEXT,
      access_enc TEXT NOT NULL, access_expires_at INTEGER NOT NULL, refresh_enc TEXT NOT NULL, refresh_expires_at INTEGER NOT NULL,
      connected_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS tiktok_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      kind TEXT NOT NULL, video_path TEXT NOT NULL, caption TEXT, privacy TEXT, publish_id TEXT, status TEXT, error TEXT)`),
  ]);
}

// ---- sealing (AES-GCM, key derived from the app's client secret: a D1 leak alone reveals no token)
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function aesKey(secret) {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`promovote-tiktok-v1|${secret}`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function seal(secret, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret), new TextEncoder().encode(text)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64(out);
}
export async function unseal(secret, sealed) {
  const all = unb64(sealed);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: all.slice(0, 12) }, await aesKey(secret), all.slice(12));
  return new TextDecoder().decode(pt);
}

// ---- TikTok API helpers
async function tokenCall(k, params) {
  const r = await fetch(`${API}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({ client_key: k.key, client_secret: k.secret, ...params }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error || !j.access_token) throw new Error(`token: ${j.error || r.status} ${j.error_description || ""}`.trim());
  return j;
}
async function apiCall(path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json; charset=UTF-8" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  const code = j?.error?.code;
  if (!r.ok || (code && code !== "ok")) throw new Error(`${path.split("/").slice(-2).join("/")}: ${code || r.status} ${j?.error?.message || ""}`.trim());
  return j.data || {};
}

async function saveTokens(env, mode, k, t, user) {
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO tiktok_auth (id, mode, open_id, display_name, scope, access_enc, access_expires_at, refresh_enc, refresh_expires_at)
      VALUES ('main', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      ON CONFLICT (id) DO UPDATE SET mode = ?1, open_id = ?2, display_name = coalesce(?3, display_name), scope = ?4, access_enc = ?5, access_expires_at = ?6,
        refresh_enc = ?7, refresh_expires_at = ?8, updated_at = datetime('now')`)
    .bind(mode, t.open_id || null, user?.display_name ?? null, t.scope || null, await seal(k.secret, t.access_token),
      now + (Number(t.expires_in) || 7200) * 1000, await seal(k.secret, t.refresh_token), now + (Number(t.refresh_expires_in) || 15552000) * 1000)
    .run();
}

// Returns { row, token } with a fresh access token (refreshed when it ends within 5 minutes), or null.
async function session(env) {
  const row = await env.DB.prepare("SELECT * FROM tiktok_auth WHERE id = 'main'").first();
  if (!row) return null;
  const k = tiktokKeys(env, row.mode);
  if (!k.key || !k.secret) return { row, token: null, error: "Bu bağlantının anahtarları Worker'da yok." };
  try {
    if (row.access_expires_at - Date.now() > 5 * 60 * 1000) return { row, token: await unseal(k.secret, row.access_enc) };
    if (row.refresh_expires_at <= Date.now()) return { row, token: null, error: "TikTok girişinin süresi doldu, yeniden bağla." };
    const t = await tokenCall(k, { grant_type: "refresh_token", refresh_token: await unseal(k.secret, row.refresh_enc) });
    await saveTokens(env, row.mode, k, t, null);
    return { row, token: t.access_token };
  } catch (e) {
    console.error("tiktok_session", e.message);
    return { row, token: null, error: `TikTok girişi yenilenemedi (${e.message}). Yeniden bağla.` };
  }
}

async function founderVideos(env) {
  if (!env.APPDB) return [];
  const { results } = await env.APPDB.prepare(`SELECT pr.slug, pr.title, p.handle, v.mp4_url, v.duration_ms FROM promos pr
      JOIN promo_videos v ON v.promo_id = pr.id AND v.label = 'A' JOIN profiles p ON p.id = pr.creator_profile_id
      JOIN creator_details d ON d.profile_id = p.id
      WHERE pr.status = 'live' AND d.founder_owned = 1 ORDER BY pr.live_at DESC LIMIT 60`).all();
  return results
    .map((r) => ({ ...r, path: String(r.mp4_url || "").startsWith(`${ORIGIN}/media/`) ? r.mp4_url.slice(ORIGIN.length) : null }))
    .filter((r) => r.path && /^\/media\/[a-z0-9-]+\.mp4$/.test(r.path));
}

// ---- pages
function notice(url) {
  const ok = url.searchParams.get("ok");
  const err = url.searchParams.get("err");
  const OK = { connected: "TikTok hesabı bağlandı.", disconnected: "Bağlantı kesildi.", inbox: "Video TikTok gelen kutuna gönderildi. TikTok uygulamasında bildirimi açıp paylaşabilirsin.", direct: "Video TikTok'a gönderildi. Birkaç dakika içinde durum aşağıda güncellenir." };
  if (ok === "bulk") return `<p class="warnbar" style="background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.5);color:#bbf7d0">${Number(url.searchParams.get("n")) || 0} video TikTok gelen kutuna gönderildi. TikTok uygulamasında bildirimlerden her birini açıp "Paylaş"a bas.</p>`;
  if (ok && OK[ok]) return `<p class="warnbar" style="background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.5);color:#bbf7d0">${OK[ok]}</p>`;
  if (err) return `<p class="warnbar" style="background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.5);color:#fecaca">Olmadı: ${escText(err.slice(0, 300))}</p>`;
  return "";
}
const escText = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function mainPage(env, url) {
  const esc = escText;
  const head = `<div class="top"><h1>TikTok</h1></div>${notice(url)}`;
  const hasProd = !!(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET);
  const hasSand = !!(env.TIKTOK_SANDBOX_CLIENT_KEY && env.TIKTOK_SANDBOX_CLIENT_SECRET);
  if (!hasProd && !hasSand) return head + '<p class="empty">TikTok anahtarları Worker\'da yok.</p>';
  await ensureTables(env);
  const s = await session(env);
  const card = (inner) => `<div class="st-card" style="margin:18px 0">${inner}</div>`;
  if (!s) {
    return head + card(`<div class="st-head"><h2>Hesap bağlı değil</h2></div>
      <p class="dim" style="margin:0 0 16px">Bir kere bağlarsın. TikTok giriş sayfası açılır, hesabınla girip "Authorize" dersin.</p>
      ${hasSand ? '<a class="tab on" href="/admin/tiktok/connect?mode=sandbox">Test hesabıyla bağla (sandbox)</a> ' : ""}
      ${hasProd ? '<a class="tab" href="/admin/tiktok/connect?mode=production">Canlı uygulamayla bağla</a>' : ""}
      <p class="dim" style="margin:16px 0 0;font-size:13px">TikTok uygulamayı onaylayana kadar sandbox kullan. Sandbox ve onaysız uygulamada paylaşımlar sadece sana görünür (TikTok kuralı).</p>`);
  }
  const r = s.row;
  let out = head + card(`<div class="st-head"><h2>${esc(r.display_name || "TikTok hesabı")}</h2><span class="chip ${s.token ? "chip-g" : "chip-r"}">${s.token ? "Bağlı" : "Sorun var"}</span></div>
    <div class="st-row"><span>Mod</span><span class="st-v">${r.mode === "sandbox" ? "Sandbox (test, paylaşımlar gizli)" : "Canlı"}</span></div>
    <div class="st-row"><span>Bağlandı</span><span class="st-v">${esc(r.connected_at)} UTC</span></div>
    <div class="st-row"><span>Giriş geçerli</span><span class="st-v">${new Date(r.refresh_expires_at).toISOString().slice(0, 10)} tarihine kadar</span></div>
    ${s.error ? `<p class="st-note">${esc(s.error)}</p>` : ""}
    <form method="post" action="/admin/tiktok/disconnect" style="margin-top:14px"><button class="tab" type="submit">Bağlantıyı kes</button></form>`);

  if (s.token) {
    const batch = await weekBatch(env);
    out += card(`<div class="st-head"><h2>Bu haftanın videoları</h2><span class="dim">${batch.length} video hazır</span></div>
      ${batch.length ? `<ul style="margin:0 0 14px;padding-left:18px">${batch.map((b) => `<li style="margin:4px 0">${esc(b.caption.slice(0, 90))}…</li>`).join("")}</ul>
      <form method="post" action="/admin/tiktok/bulk"><button class="tab on" type="submit" style="font-size:16px;padding:12px 20px">Hepsini TikTok'a gönder (taslak)</button></form>
      <p class="dim" style="margin:12px 0 0;font-size:13px">Videolar TikTok uygulamanın gelen kutusuna düşer. Her birini açıp "Paylaş"a basman yeterli.</p>` : '<p class="empty">Bu hafta gönderilmemiş video yok.</p>'}`);
    let info = null;
    let infoErr = "";
    try { info = await apiCall("/v2/post/publish/creator_info/query/", s.token, {}); } catch (e) { infoErr = e.message; }
    const vids = await founderVideos(env);
    if (info) {
      const opts = (info.privacy_level_options || []).map((p) => `<option value="${esc(p)}">${esc(PRIVACY_TR[p] || p)}</option>`).join("");
      const max = Number(info.max_video_post_duration_sec) || 0;
      const vOpts = vids.map((v) => {
        const tooLong = max && v.duration_ms / 1000 > max;
        return `<option value="${esc(v.path)}"${tooLong ? " disabled" : ""}>@${esc(v.handle)}: ${esc(v.title)} (${Math.round(v.duration_ms / 1000)} sn)${tooLong ? " çok uzun" : ""}</option>`;
      }).join("");
      const box = (name, label, disabled) => `<label style="display:flex;gap:8px;align-items:center;margin:6px 0${disabled ? ";opacity:.5" : ""}"><input type="checkbox" name="${name}" value="1"${disabled ? " disabled" : ""}> ${label}${disabled ? " (hesapta kapalı)" : ""}</label>`;
      out += card(`<div class="st-head"><h2>Yeni TikTok paylaşımı</h2><span class="dim">@${esc(info.creator_username || "")} olarak</span></div>
        <form method="post" action="/admin/tiktok/post" style="display:grid;gap:12px">
          <label>Video<br><select name="video" required class="tsearch" style="max-width:640px"><option value="">Seç</option>${vOpts}</select></label>
          <label>Açıklama (en çok 2200 karakter, hashtag olabilir)<br><textarea name="caption" maxlength="2200" rows="3" class="tsearch" style="max-width:640px"></textarea></label>
          <label>Kim görebilir (doğrudan paylaşım için)<br><select name="privacy" class="tsearch" style="max-width:320px"><option value="">Seç</option>${opts}</select></label>
          <div>${box("comment", "Yorumlara izin ver", info.comment_disabled)}${box("duet", "Duet'e izin ver", info.duet_disabled)}${box("stitch", "Stitch'e izin ver", info.stitch_disabled)}
            ${box("brand", "Bu video kendi ürünümü tanıtıyor (Your brand)", false)}</div>
          <p class="dim" style="margin:0;font-size:13px">Paylaşınca TikTok'un Music Usage Confirmation koşullarını kabul etmiş olursun. Video işlenince profilinde görünmesi birkaç dakika sürebilir.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="tab on" type="submit" name="kind" value="inbox">Taslak olarak gönder (TikTok gelen kutusu)</button>
            <button class="tab" type="submit" name="kind" value="direct">Doğrudan paylaş</button>
          </div>
        </form>`);
    } else {
      out += card(`<p class="st-note">TikTok paylaşım bilgisi alınamadı: ${esc(infoErr)}</p>`);
    }
  }

  // Recent posts; refresh the status of up to 5 unfinished ones.
  const { results: posts } = await env.DB.prepare("SELECT * FROM tiktok_posts ORDER BY id DESC LIMIT 20").all();
  if (s.token) {
    for (const p of posts.filter((x) => x.publish_id && !["PUBLISH_COMPLETE", "FAILED", "SEND_TO_USER_INBOX"].includes(x.status)).slice(0, 5)) {
      try {
        const st = await apiCall("/v2/post/publish/status/fetch/", s.token, { publish_id: p.publish_id });
        if (st.status && st.status !== p.status) {
          p.status = st.status;
          p.error = st.fail_reason || null;
          await env.DB.prepare("UPDATE tiktok_posts SET status = ?1, error = ?2 WHERE id = ?3").bind(p.status, p.error, p.id).run();
        }
      } catch (e) { console.error("tiktok_status", e.message); }
    }
  }
  out += card(`<div class="st-head"><h2>Gönderilenler</h2></div>${posts.length ? `<div class="tablewrap"><table><thead><tr><th>Zaman (UTC)</th><th>Tür</th><th>Video</th><th>Durum</th></tr></thead><tbody>${posts.map((p) => `<tr><td class="dim">${esc(p.created_at)}</td><td>${p.kind === "inbox" ? "Taslak" : "Doğrudan"}</td><td>${esc(p.video_path.replace("/media/", ""))}</td><td>${esc(STATUS_TR[p.status] || p.status || "")}${p.error ? ` <span class="dim">${esc(p.error)}</span>` : ""}</td></tr>`).join("")}</tbody></table></div>` : '<p class="empty">Henüz gönderilen yok.</p>'}`);
  return out;
}

function connect(env, url) {
  const mode = url.searchParams.get("mode") === "sandbox" ? "sandbox" : "production";
  const k = tiktokKeys(env, mode);
  if (!k.key) return Response.redirect(`${ORIGIN}/admin/tiktok?err=${encodeURIComponent("Bu modun anahtarı yok.")}`, 303);
  const state = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const auth = new URL(AUTH_URL);
  auth.search = new URLSearchParams({ client_key: k.key, scope: SCOPES, response_type: "code", redirect_uri: REDIRECT, state }).toString();
  return new Response(null, {
    status: 302,
    headers: { Location: auth.toString(), "Cache-Control": "no-store", "Set-Cookie": `tt_state=${mode}.${state}; Path=/admin/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=600` },
  });
}

async function callback(request, env, url) {
  const back = (q) => new Response(null, { status: 303, headers: { Location: `${ORIGIN}/admin/tiktok?${q}`, "Set-Cookie": "tt_state=; Path=/admin/tiktok; HttpOnly; Secure; SameSite=Lax; Max-Age=0", "Cache-Control": "no-store" } });
  const cookie = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)tt_state=([a-z]+)\.([a-f0-9]{48})/);
  const state = url.searchParams.get("state");
  if (!cookie || !state || state !== cookie[2]) return back(`err=${encodeURIComponent("Güvenlik kontrolü tutmadı, Bağla'ya yeniden bas.")}`);
  if (url.searchParams.get("error")) return back(`err=${encodeURIComponent(`TikTok: ${url.searchParams.get("error_description") || url.searchParams.get("error")}`)}`);
  const code = url.searchParams.get("code");
  if (!code) return back(`err=${encodeURIComponent("TikTok kod göndermedi.")}`);
  const mode = cookie[1] === "sandbox" ? "sandbox" : "production";
  const k = tiktokKeys(env, mode);
  try {
    await ensureTables(env);
    const t = await tokenCall(k, { code, grant_type: "authorization_code", redirect_uri: REDIRECT });
    let user = null;
    try { user = (await apiCall("/v2/user/info/?fields=open_id,display_name", t.access_token)).user || null; } catch (e) { console.error("tiktok_user", e.message); }
    await saveTokens(env, mode, k, t, user);
    return back("ok=connected");
  } catch (e) {
    console.error("tiktok_callback", e.message);
    return back(`err=${encodeURIComponent(e.message)}`);
  }
}

async function disconnect(env) {
  await ensureTables(env);
  const row = await env.DB.prepare("SELECT * FROM tiktok_auth WHERE id = 'main'").first();
  if (row) {
    const k = tiktokKeys(env, row.mode);
    try {
      await fetch(`${API}/v2/oauth/revoke/`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_key: k.key, client_secret: k.secret, token: await unseal(k.secret, row.access_enc) }) });
    } catch (e) { console.error("tiktok_revoke", e.message); }
    await env.DB.prepare("DELETE FROM tiktok_auth WHERE id = 'main'").run();
  }
  return Response.redirect(`${ORIGIN}/admin/tiktok?ok=disconnected`, 303);
}

async function post(request, env) {
  const fail = (m) => Response.redirect(`${ORIGIN}/admin/tiktok?err=${encodeURIComponent(m)}`, 303);
  const f = await request.formData();
  const kind = f.get("kind") === "direct" ? "direct" : f.get("kind") === "inbox" ? "inbox" : null;
  const path = String(f.get("video") || "");
  const caption = String(f.get("caption") || "").slice(0, 2200);
  const privacy = String(f.get("privacy") || "");
  if (!kind) return fail("Gönderme türü yok.");
  await ensureTables(env);
  const s = await session(env);
  if (!s?.token) return fail(s?.error || "TikTok hesabı bağlı değil.");
  const vids = await founderVideos(env);
  const v = vids.find((x) => x.path === path);
  if (!v) return fail("Video listede yok.");
  let info;
  try { info = await apiCall("/v2/post/publish/creator_info/query/", s.token, {}); } catch (e) { return fail(e.message); }
  if (kind === "direct" && !(info.privacy_level_options || []).includes(privacy)) return fail("Kim görebilir seçilmedi.");
  if (info.max_video_post_duration_sec && v.duration_ms / 1000 > info.max_video_post_duration_sec) return fail("Video bu hesap için çok uzun.");

  const file = await env.ASSETS.fetch(new Request(`${ORIGIN}${path}`));
  if (!file.ok) return fail("Video dosyası okunamadı.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return fail("Video boyutu uygun değil.");
  const source_info = { source: "FILE_UPLOAD", video_size: bytes.length, chunk_size: bytes.length, total_chunk_count: 1 };
  const body = kind === "inbox" ? { source_info } : {
    post_info: {
      title: caption, privacy_level: privacy,
      disable_comment: f.get("comment") !== "1" || !!info.comment_disabled,
      disable_duet: f.get("duet") !== "1" || !!info.duet_disabled,
      disable_stitch: f.get("stitch") !== "1" || !!info.stitch_disabled,
      video_cover_timestamp_ms: 1700, brand_content_toggle: false, brand_organic_toggle: f.get("brand") === "1",
    },
    source_info,
  };
  let init;
  try {
    init = await apiCall(kind === "inbox" ? "/v2/post/publish/inbox/video/init/" : "/v2/post/publish/video/init/", s.token, body);
  } catch (e) {
    await env.DB.prepare("INSERT INTO tiktok_posts (kind, video_path, caption, privacy, status, error) VALUES (?1, ?2, ?3, ?4, 'FAILED', ?5)").bind(kind, path, caption, privacy || null, e.message.slice(0, 300)).run();
    return fail(e.message);
  }
  const up = await fetch(init.upload_url, { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}` }, body: bytes });
  const status = up.ok ? "PROCESSING_UPLOAD" : "FAILED";
  await env.DB.prepare("INSERT INTO tiktok_posts (kind, video_path, caption, privacy, publish_id, status, error) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
    .bind(kind, path, caption, privacy || null, init.publish_id || null, status, up.ok ? null : `upload ${up.status}`).run();
  if (!up.ok) return fail(`Yükleme olmadı (${up.status}).`);
  return Response.redirect(`${ORIGIN}/admin/tiktok?ok=${kind}`, 303);
}

// One press sends the newest founder promos of the last 8 days that were not sent yet, as drafts to the TikTok
// inbox (video.upload). The owner still publishes each one in the TikTok app, so a person posts every video.
async function sendOne(env, token, path, caption) {
  const file = await env.ASSETS.fetch(new Request(`${ORIGIN}${path}`));
  if (!file.ok) throw new Error("video dosyası okunamadı");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error("video boyutu uygun değil");
  const init = await apiCall("/v2/post/publish/inbox/video/init/", token, { source_info: { source: "FILE_UPLOAD", video_size: bytes.length, chunk_size: bytes.length, total_chunk_count: 1 } });
  const up = await fetch(init.upload_url, { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}` }, body: bytes });
  if (!up.ok) throw new Error(`yükleme ${up.status}`);
  return init.publish_id || null;
}

async function weekBatch(env) {
  if (!env.APPDB) return [];
  const { results } = await env.APPDB.prepare(`SELECT pr.title, pr.description, v.mp4_url,
      (SELECT group_concat(tag, ' ') FROM (SELECT tag FROM promo_hashtags h WHERE h.promo_id = pr.id ORDER BY position)) AS tags
      FROM promos pr JOIN promo_videos v ON v.promo_id = pr.id AND v.label = 'A' JOIN creator_details d ON d.profile_id = pr.creator_profile_id
      WHERE pr.status = 'live' AND d.founder_owned = 1 AND pr.live_at >= datetime('now', '-8 days') ORDER BY pr.live_at DESC LIMIT 5`).all();
  const sent = new Set((await env.DB.prepare("SELECT video_path FROM tiktok_posts WHERE status IS NOT 'FAILED'").all()).results.map((r) => r.video_path));
  return results
    .map((r) => ({ path: String(r.mp4_url || "").startsWith(`${ORIGIN}/media/`) ? r.mp4_url.slice(ORIGIN.length) : null, caption: captionOf(r) }))
    .filter((r) => r.path && /^\/media\/[a-z0-9-]+\.mp4$/.test(r.path) && !sent.has(r.path));
}
export function captionOf(r) {
  const tags = String(r.tags || "").split(" ").filter(Boolean).slice(0, 4).map((t) => `#${t}`).join(" ");
  const title = String(r.title || "").replace(/[.!?]?$/, ".");
  return `${title} ${String(r.description || "")} ${tags}`.replace(/\s+/g, " ").trim().slice(0, 2200);
}

async function bulk(env) {
  await ensureTables(env);
  const s = await session(env);
  if (!s?.token) return Response.redirect(`${ORIGIN}/admin/tiktok?err=${encodeURIComponent(s?.error || "TikTok hesabı bağlı değil.")}`, 303);
  const list = await weekBatch(env);
  if (!list.length) return Response.redirect(`${ORIGIN}/admin/tiktok?err=${encodeURIComponent("Gönderilecek yeni video yok.")}`, 303);
  let ok = 0;
  const errs = [];
  for (const v of list) {
    try {
      const id = await sendOne(env, s.token, v.path, v.caption);
      await env.DB.prepare("INSERT INTO tiktok_posts (kind, video_path, caption, publish_id, status) VALUES ('inbox', ?1, ?2, ?3, 'PROCESSING_UPLOAD')").bind(v.path, v.caption, id).run();
      ok++;
    } catch (e) {
      errs.push(e.message);
      await env.DB.prepare("INSERT INTO tiktok_posts (kind, video_path, caption, status, error) VALUES ('inbox', ?1, ?2, 'FAILED', ?3)").bind(v.path, v.caption, e.message.slice(0, 300)).run();
    }
  }
  if (!ok) return Response.redirect(`${ORIGIN}/admin/tiktok?err=${encodeURIComponent(errs[0] || "Gönderilemedi.")}`, 303);
  return Response.redirect(`${ORIGIN}/admin/tiktok?ok=bulk&n=${ok}`, 303);
}

// Daily job (founder 2026-11-17: "herkesin paylaşımını yapmaya başla"): sends up to 2 founder promos that were never
// sent (English, newest first, any age) as drafts to the TikTok inbox, and refreshes the status of open ones. TikTok
// allows only a few pending inbox shares per day, so it never sends while 4 or more drafts from the last 24 h exist.
// Drafts only: the owner publishes each video in the TikTok app.
export async function tiktokCron(env) {
  if (!env.DB) return;
  await ensureTables(env);
  const s = await session(env);
  if (!s?.token) { console.log("tiktok_cron: not connected", s?.error || ""); return; }
  const { results: open } = await env.DB.prepare("SELECT id, publish_id, status FROM tiktok_posts WHERE publish_id IS NOT NULL AND status IN ('PROCESSING_UPLOAD','PROCESSING_DOWNLOAD') ORDER BY id DESC LIMIT 10").all();
  for (const p of open) {
    try {
      const st = await apiCall("/v2/post/publish/status/fetch/", s.token, { publish_id: p.publish_id });
      if (st.status && st.status !== p.status) await env.DB.prepare("UPDATE tiktok_posts SET status = ?1, error = ?2 WHERE id = ?3").bind(st.status, st.fail_reason || null, p.id).run();
    } catch (e) { console.error("tiktok_cron_status", e.message); }
  }
  const recent = (await env.DB.prepare("SELECT COUNT(*) AS n FROM tiktok_posts WHERE kind = 'inbox' AND status IS NOT 'FAILED' AND created_at >= datetime('now', '-1 day')").first())?.n || 0;
  const room = Math.min(2, 4 - recent);
  if (room <= 0) { console.log("tiktok_cron: inbox busy", recent); return; }
  const list = (await catalog(env)).slice(0, room);
  for (const v of list) {
    try {
      const id = await sendOne(env, s.token, v.path, v.caption);
      await env.DB.prepare("INSERT INTO tiktok_posts (kind, video_path, caption, publish_id, status) VALUES ('inbox', ?1, ?2, ?3, 'PROCESSING_UPLOAD')").bind(v.path, v.caption, id).run();
    } catch (e) {
      console.error("tiktok_cron_send", v.path, e.message);
      await env.DB.prepare("INSERT INTO tiktok_posts (kind, video_path, caption, status, error) VALUES ('inbox', ?1, ?2, 'FAILED', ?3)").bind(v.path, v.caption, e.message.slice(0, 300)).run();
      break;
    }
  }
}

// Every live English founder promo of 8 s or more that was never sent (a failed send can be retried by the bulk button).
async function catalog(env) {
  if (!env.APPDB) return [];
  const { results } = await env.APPDB.prepare(`SELECT pr.title, pr.description, v.mp4_url,
      (SELECT group_concat(tag, ' ') FROM (SELECT tag FROM promo_hashtags h WHERE h.promo_id = pr.id ORDER BY position)) AS tags
      FROM promos pr JOIN promo_videos v ON v.promo_id = pr.id AND v.label = 'A' JOIN creator_details d ON d.profile_id = pr.creator_profile_id
      WHERE pr.status = 'live' AND d.founder_owned = 1 AND pr.lang = 'en' AND coalesce(v.duration_ms, 0) >= 8000
      ORDER BY pr.live_at DESC LIMIT 100`).all();
  const sent = new Set((await env.DB.prepare("SELECT video_path FROM tiktok_posts").all()).results.map((r) => r.video_path));
  return results
    .map((r) => ({ path: String(r.mp4_url || "").startsWith(`${ORIGIN}/media/`) ? r.mp4_url.slice(ORIGIN.length) : null, caption: captionOf(r) }))
    .filter((r) => r.path && /^\/media\/[a-z0-9-]+\.mp4$/.test(r.path) && !sent.has(r.path));
}

// Entry from handleAdmin (admin login already checked). Returns null for paths it does not own.
export async function handleTiktok(request, env, url, path, { adminPage, ADMIN_HEADERS }) {
  if (path === "/admin/tiktok") return adminPage(path, "TikTok", await mainPage(env, url));
  if (path === "/admin/tiktok/connect" && request.method === "GET") return connect(env, url);
  if (path === "/admin/tiktok/callback" && request.method === "GET") return callback(request, env, url);
  if (path === "/admin/tiktok/disconnect" || path === "/admin/tiktok/post" || path === "/admin/tiktok/bulk") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: ADMIN_HEADERS });
    if (request.headers.get("Origin") !== ORIGIN) return new Response("Forbidden", { status: 403, headers: ADMIN_HEADERS });
    if (path === "/admin/tiktok/bulk") return bulk(env);
    return path === "/admin/tiktok/post" ? post(request, env) : disconnect(env);
  }
  return null;
}
