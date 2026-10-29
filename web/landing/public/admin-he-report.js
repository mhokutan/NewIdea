// Hauling Empire weekly report (admin page /admin/hauling-empire/rapor, founder request 2026-10-30).
// Reads only: one RPC, admin_weekly_report(p_week_start), on the Hauling Empire Supabase project, with the public
// anon key and the signed in Hauling Empire admin's own session. The PromoVote admin password gives no access here.
// No Supabase library: Auth and RPC are plain REST calls. The session lives under its own storage key.
// Player text (feedback) is always set as text, never as HTML.
(() => {
  const root = document.getElementById("he-report");
  if (!root) return;
  const URL_ = root.dataset.url;
  const KEY = root.dataset.key;
  const STORE = "he-admin-auth";
  const back = location.origin + location.pathname;

  // ---------- tiny DOM helper: strings become text nodes, never HTML ----------
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
    return el;
  };
  const show = (...nodes) => root.replaceChildren(...nodes);
  const box = (text, cls = "empty") => h("p", { class: cls }, text);

  // ---------- session ----------
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch { return null; } };
  const save = (s) => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* private mode */ } };
  const clear = () => { try { localStorage.removeItem(STORE); } catch { /* ignore */ } };
  const fromAuth = (j) => ({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + Number(j.expires_in || 3600), email: j.user?.email || "" });

  async function auth(path, body) {
    const r = await fetch(`${URL_}/auth/v1/${path}`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.msg || j.error_description || j.message || `HTTP ${r.status}`), { status: r.status });
    return j;
  }
  async function session() {
    let s = load();
    if (!s?.access_token) return null;
    if (s.expires_at - Date.now() / 1000 < 60) {
      try { s = fromAuth(await auth("token?grant_type=refresh_token", { refresh_token: s.refresh_token })); save(s); }
      catch { clear(); return null; }
    }
    return s;
  }
  async function rpc(name, args) {
    const s = await session();
    if (!s) throw Object.assign(new Error("no session"), { kind: "login" });
    let r;
    try {
      r = await fetch(`${URL_}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(args || {}) });
    } catch { throw Object.assign(new Error("network"), { kind: "network" }); }
    const j = await r.json().catch(() => null);
    if (r.status === 401) { clear(); throw Object.assign(new Error("expired"), { kind: "login" }); }
    if (!r.ok) throw Object.assign(new Error(j?.message || `HTTP ${r.status}`), { kind: j?.code === "42501" ? "admin" : "server" });
    return j;
  }

  // Magic link or Google/Apple return: tokens arrive in the URL hash.
  const hash = new URLSearchParams(location.hash.slice(1));
  const hashError = hash.get("error_description");
  if (hash.get("access_token")) save(fromAuth({ access_token: hash.get("access_token"), refresh_token: hash.get("refresh_token"), expires_at: Number(hash.get("expires_at")) || 0, expires_in: hash.get("expires_in") }));
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);

  // ---------- login ----------
  function loginView(msg) {
    let email = "";
    const note = h("p", { class: "countries", "aria-live": "polite" }, msg || "");
    const codeRow = h("div", { style: "display:none;gap:10px;margin-top:12px;max-width:360px" },
      h("input", { class: "tsearch", inputmode: "numeric", autocomplete: "one-time-code", placeholder: "E postadaki kod", "aria-label": "E postadaki kod", id: "he-code" }),
      h("button", { class: "morebtn", style: "margin:0", onclick: async () => {
        const token = document.getElementById("he-code").value.trim();
        if (!token) return;
        note.textContent = "Kontrol ediliyor...";
        try { save(fromAuth(await auth("verify", { type: "email", email, token }))); start(); }
        catch { note.textContent = "Kod kabul edilmedi. Yeniden dene ya da e postadaki linke dokun."; }
      } }, "Giriş yap"));
    const emailIn = h("input", { class: "tsearch", type: "email", autocomplete: "email", placeholder: "Hauling Empire hesabının e postası", "aria-label": "E posta" });
    const oauth = (p) => () => { location.href = `${URL_}/auth/v1/authorize?provider=${p}&redirect_to=${encodeURIComponent(back)}`; };
    show(
      h("div", { class: "st-card", style: "max-width:520px" },
        h("div", { class: "st-head" }, h("h2", {}, "Hauling Empire hesabıyla giriş yap")),
        h("p", { class: "countries", style: "margin-bottom:12px" }, "Bu rapor Hauling Empire'ın kendi admin hesabıyla açılır. PromoVote admin şifresi burada yetki vermez."),
        h("div", { style: "display:grid;gap:10px;max-width:360px" },
          emailIn,
          h("button", { class: "morebtn", style: "margin:0", onclick: async () => {
            email = emailIn.value.trim();
            if (!/^\S+@\S+\.\S+$/.test(email)) { note.textContent = "Geçerli bir e posta yaz."; return; }
            note.textContent = "Gönderiliyor...";
            try {
              await auth(`otp?redirect_to=${encodeURIComponent(back)}`, { email, create_user: false });
              note.textContent = "E posta gönderildi. İçindeki kodu aşağıya yaz ya da linke dokun.";
              codeRow.style.display = "grid";
            } catch (e) { note.textContent = e.status === 429 ? "Çok sık denendi. Bir dakika bekle." : "E posta gönderilemedi. Bu e posta Hauling Empire'da kayıtlı olmayabilir."; }
          } }, "Kod gönder"),
          h("div", { style: "display:flex;gap:10px;flex-wrap:wrap" },
            h("button", { class: "morebtn", style: "margin:0", onclick: oauth("google") }, "Google ile"),
            h("button", { class: "morebtn", style: "margin:0", onclick: oauth("apple") }, "Apple ile"))),
        codeRow, note));
  }

  // ---------- formatting ----------
  const num = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
  const fmtN = (v) => (num(v) == null ? "–" : Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 1 }));
  const pct = (v) => { const n = num(v); if (n == null) return null; return `%${(n < 1 && n > 0 ? n * 100 : n).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`; };
  const mmss = (s) => { const n = num(s); if (n == null) return null; const m = Math.floor(n / 60), r = Math.round(n % 60); return `${m}:${String(r).padStart(2, "0")}`; };
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const trDate = (s) => new Date(s + "T00:00:00Z").toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
  const entries = (o) => Object.entries(o || {}).map(([k, v]) => [k, num(v) ?? 0]).sort((a, b) => b[1] - a[1]);
  const NOT_YET = "henüz hesaplanmadı";
  const val = (v) => (v == null ? h("span", { class: "dim", style: "font-size:16px" }, "Veri yok") : v === NOT_YET ? h("span", { class: "dim", style: "font-size:16px" }, NOT_YET) : v);

  const tile = (label, value, { level = "", note = null } = {}) =>
    h("div", { class: `tile${level ? " lv-" + level : ""}` }, h("b", {}, val(value)), h("span", {}, label), note ? h("small", { class: "dim", style: "display:block;margin-top:4px" }, note) : null);
  const tiles = (...t) => h("div", { class: "tiles" }, ...t);
  const sec = (t) => h("h2", { style: "font-size:22px;margin:34px 0 12px" }, t);
  const bars = (rows, total) => {
    const max = Math.max(1, ...rows.map((r) => r[1]));
    return h("div", {}, ...rows.map(([l, n]) => h("div", { class: "fun" },
      h("span", { class: "fun-l", title: l }, l),
      h("span", { class: "fun-b" }, h("i", { style: `width:${Math.round((100 * n) / max)}%` })),
      h("span", { class: "fun-n" }, `${fmtN(n)}${total ? ` · %${Math.round((100 * n) / total)}` : ""}`))));
  };
  const table = (head, rows) => rows.length
    ? h("div", { class: "tablewrap" }, h("table", {}, h("thead", {}, h("tr", {}, ...head.map((x) => h("th", {}, x)))), h("tbody", {}, ...rows.map((r) => h("tr", {}, ...r.map((c) => h("td", { style: "white-space:normal" }, c)))))))
    : box("Bu hafta kayıt yok.");
  const delta = (cur, prev) => {
    const a = num(cur), b = num(prev);
    if (a == null || b == null) return null;
    if (b === 0) return a > 0 ? "▲ yeni" : "aynı";
    const d = Math.round(((a - b) / b) * 100);
    return d === 0 ? "aynı" : `${d > 0 ? "▲" : "▼"} %${Math.abs(d)} (önceki ${fmtN(b)})`;
  };

  const FUNNEL = { app_open: "Uygulamayı açtı", newgame_start: "Yeni oyun", first_job_accepted: "İlk iş", first_delivery: "İlk teslimat", driver_hired: "Şoför aldı", truck_bought: "Araç aldı", license_bought: "Lisans aldı" };
  const REGIONS = { us: "ABD", tr: "Türkiye", eu: "Avrupa", sam: "Güney Amerika" };
  const SUMMARY = [["wau", "Haftalık aktif oyuncu"], ["new_players", "Yeni oyuncu"], ["avg_dau", "Günlük ortalama aktif"], ["peak_dau", "En yüksek günlük aktif"], ["sessions", "Oturum"], ["jobs_completed", "Tamamlanan iş"], ["total_players", "Toplam oyuncu"]];
  const BEHAVIOUR = [["top10_job_share_pct", "En aktif 10 oyuncunun iş payı", pct], ["median_jobs_per_player", "Oyuncu başı iş (ortanca)", fmtN], ["autodispatch_jobs", "Otomatik gönderilen iş", fmtN], ["ui_stuck_players", "Arayüzde takılan oyuncu", fmtN], ["quick_backout_players", "Hemen geri çıkan oyuncu", fmtN], ["solo_job_players", "Solo iş yapan oyuncu", fmtN], ["online_job_players", "Online iş yapan oyuncu", fmtN], ["daily_reward_claim_pct", "Günlük ödülü alanlar", pct]];

  // ---------- report ----------
  function render(r, prev, week) {
    const s = r.summary || {}, p = prev?.summary || {};
    const nav = h("div", { class: "top", style: "margin-top:4px" },
      h("div", { style: "display:flex;align-items:center;gap:10px" },
        h("a", { class: "tab", href: `?w=${addDays(r.week_start, -7)}`, "aria-label": "Önceki hafta" }, "‹"),
        h("b", { style: "font-size:16px" }, `${trDate(r.week_start)} – ${trDate(r.week_end)}`),
        new Date(addDays(r.week_start, 7) + "T00:00:00Z") <= new Date() ? h("a", { class: "tab", href: `?w=${addDays(r.week_start, 7)}`, "aria-label": "Sonraki hafta" }, "›") : null,
        week ? h("a", { class: "tab", href: "?" }, "Geçen hafta") : null),
      h("button", { class: "morebtn", style: "margin:0", onclick: (e) => { const m = markdown(r, prev); (navigator.clipboard?.writeText(m) || Promise.reject()).then(() => { e.target.textContent = "Kopyalandı"; }, () => { e.target.textContent = "Kopyalanamadı"; }); } }, "Markdown olarak kopyala"),
      h("button", { class: "logout", style: "cursor:pointer;background:none", onclick: logout }, "HE hesabından çık"));
    if (!num(s.wau)) return show(nav, box("Bu hafta için veri yok. Önceki haftaya bak ya da hafta bitince tekrar gel."));

    const days = (r.daily || []).map((d) => [d.day, num(d.dau) ?? 0]);
    const maxDau = Math.max(1, ...days.map((d) => d[1]));
    const daily = h("div", { style: "display:flex;align-items:flex-end;gap:8px;height:180px;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--surface)", role: "img", "aria-label": "Günlük aktif oyuncu" },
      ...days.map(([d, n]) => h("div", { style: "flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end" },
        h("small", {}, fmtN(n)),
        h("div", { style: `width:100%;max-width:48px;height:${Math.max(2, Math.round((120 * n) / maxDau))}px;background:var(--lime);border-radius:6px 6px 2px 2px` }),
        h("small", { class: "dim" }, new Date(d + "T00:00:00Z").toLocaleDateString("tr-TR", { weekday: "short", timeZone: "UTC" })))));

    const ret = r.retention || {};
    const ses = r.sessions || {};
    const plat = Object.entries(r.platforms || {}).map(([k, v]) => [k === "ios" ? "iOS" : k === "android" ? "Android" : k, num(v) ?? 0]);
    const reg = Object.entries(r.regions || {}).map(([k, v]) => [REGIONS[k] || k, num(v) ?? 0]);
    const sum = (a) => a.reduce((x, y) => x + y[1], 0);

    const fun = r.funnel || [];
    const first = num(fun[0]?.players) || 0;
    const funnel = fun.length ? h("div", {}, ...fun.map((f, i) => {
      const n = num(f.players) || 0, before = i ? num(fun[i - 1].players) || 0 : n;
      const lost = i && before ? Math.round(((before - n) / before) * 100) : 0;
      return h("div", { class: "fun", style: "grid-template-columns:minmax(110px,200px) 1fr 160px" },
        h("span", { class: "fun-l" }, FUNNEL[f.step] || f.step),
        h("span", { class: "fun-b" }, h("i", { style: `width:${first ? Math.round((100 * n) / first) : 0}%` })),
        h("span", { class: "fun-n" }, `${fmtN(n)} · %${first ? Math.round((100 * n) / first) : 0}${i ? ` (−%${lost})` : ""}`));
    })) : box("Huni verisi yok.");

    const b = r.behaviour || {}, m = r.monetization || {}, st = r.stability || {}, fb = r.feedback || {};
    const failRate = num(m.iap_start_players) ? (num(m.iap_failed_players) || 0) / num(m.iap_start_players) : 0;
    const objTable = (o, a, bLabel) => table([a, bLabel], entries(o).map(([k, n]) => [k, fmtN(n)]));

    show(nav,
      sec("Özet"),
      tiles(...SUMMARY.map(([k, l]) => tile(l, num(s[k]) == null ? null : fmtN(s[k]), { note: delta(s[k], p[k]) }))),
      sec("Günlük aktif oyuncu"), daily,
      sec("Tutma"),
      tiles(tile("1. gün dönen", pct(ret.d1) ?? NOT_YET), tile("3. gün dönen", pct(ret.d3) ?? NOT_YET), tile("7. gün dönen", pct(ret.d7) ?? NOT_YET),
        tile("Sadece 1 gün oynayan", pct(ret.one_day_only_pct) ?? NOT_YET), tile("Kohort (yeni oyuncu)", num(ret.cohort) == null ? null : fmtN(ret.cohort))),
      sec("Oturum süresi"),
      tiles(tile("Ortanca", mmss(ses.median_s)), tile("Ortalama", mmss(ses.avg_s)), tile("%90 dilim", mmss(ses.p90_s)), tile("1 dk altı", pct(ses.under_1m_pct)), tile("10 dk üstü", pct(ses.over_10m_pct))),
      h("div", { class: "st-grid" },
        h("div", { class: "st-card" }, h("div", { class: "st-head" }, h("h2", {}, "Platform")), bars(plat, sum(plat))),
        h("div", { class: "st-card" }, h("div", { class: "st-head" }, h("h2", {}, "Bölge")), bars(reg, sum(reg)))),
      sec("Yeni oyuncu hunisi"),
      h("p", { class: "countries" }, "Yüzde ilk adıma göre, parantez içi bir önceki adıma göre kayıp."), funnel,
      sec("Davranış"),
      tiles(...BEHAVIOUR.map(([k, l, f]) => tile(l, num(b[k]) == null ? null : f(b[k])))),
      sec("İlerleme engelleri"),
      h("div", { class: "st-grid" },
        h("div", {}, h("h3", { style: "font-size:16px;margin:0 0 8px" }, "Seviye atlama"), objTable(r.tier_ups, "Seviye", "Oyuncu")),
        h("div", {}, h("h3", { style: "font-size:16px;margin:0 0 8px" }, "Lisans engeli"), objTable(r.license_blocks, "Lisans", "Engel")),
        h("div", {}, h("h3", { style: "font-size:16px;margin:0 0 8px" }, "Başarısız komutlar"), objTable(r.failed_commands, "Komut", "Sayı"))),
      sec("Para kazanma"),
      tiles(tile("Reklam teklifi gören", fmtN(m.ad_offer_players)), tile("Reklam ödülü alan oyuncu", fmtN(m.ad_reward_players)), tile("Reklam ödülü (adet)", fmtN(m.ad_rewards)),
        tile("Satın almayı başlatan", fmtN(m.iap_start_players)),
        tile("Ödemesi hata veren", fmtN(m.iap_failed_players), { level: failRate >= 0.2 && (num(m.iap_failed_players) || 0) >= 2 ? "r" : "", note: num(m.iap_start_players) ? `başlatanların %${Math.round(failRate * 100)}` : null }),
        tile("Vazgeçen", fmtN(m.iap_cancel_players))),
      entries(m.production_purchases).length ? h("div", {}, h("h3", { style: "font-size:16px;margin:12px 0 8px" }, "Üretim satın alımları"), objTable(m.production_purchases, "Ürün", "Adet")) : null,
      sec("Kararlılık"),
      tiles(tile("Çökme raporu", fmtN(st.crash_reports), { level: (num(st.crash_reports) || 0) > 0 ? "y" : "g" }), tile("Etkilenen oyuncu", fmtN(st.crash_players))),
      table(["Tür", "Mesaj", "Sayı", "Oyuncu"], (st.top || []).slice(0, 5).map((x) => [x.kind || "", x.message || "", fmtN(x.count), fmtN(x.players)])),
      sec("Geri bildirim"),
      tiles(tile("Toplam", fmtN(fb.count)), ...entries(fb.by_category).map(([k, n]) => tile(k, fmtN(n)))),
      table(["Tarih", "Kategori", "Yorum"], (fb.latest || []).slice(0, 10).map((x) => [x.at ? new Date(x.at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "", x.category || "", x.text || ""])));
  }

  function markdown(r, prev) {
    const s = r.summary || {}, p = prev?.summary || {}, ret = r.retention || {}, ses = r.sessions || {}, m = r.monetization || {}, st = r.stability || {};
    const line = (l, v) => `- ${l}: ${v ?? "veri yok"}`;
    return [
      `# Hauling Empire haftalık rapor (${r.week_start} / ${r.week_end})`, "",
      "## Özet", ...SUMMARY.map(([k, l]) => line(l, num(s[k]) == null ? null : `${fmtN(s[k])}${delta(s[k], p[k]) ? ` (${delta(s[k], p[k])})` : ""}`)), "",
      "## Tutma", line("D1", pct(ret.d1)), line("D3", pct(ret.d3)), line("D7", pct(ret.d7)), line("Sadece 1 gün", pct(ret.one_day_only_pct)), line("Kohort", fmtN(ret.cohort)), "",
      "## Oturum", line("Ortanca", mmss(ses.median_s)), line("Ortalama", mmss(ses.avg_s)), line("%90", mmss(ses.p90_s)), "",
      "## Huni", ...(r.funnel || []).map((f) => line(FUNNEL[f.step] || f.step, fmtN(f.players))), "",
      "## Para", line("Reklam ödülü", fmtN(m.ad_rewards)), line("Satın alma başlatan", fmtN(m.iap_start_players)), line("Ödeme hatası", fmtN(m.iap_failed_players)), "",
      "## Kararlılık", line("Çökme", fmtN(st.crash_reports)), line("Etkilenen oyuncu", fmtN(st.crash_players)),
      ...(st.top || []).slice(0, 5).map((x) => `  - ${x.kind}: ${String(x.message || "").slice(0, 80)} (${fmtN(x.count)})`), "",
    ].join("\n");
  }

  async function logout() {
    const s = load();
    clear();
    if (s?.access_token) fetch(`${URL_}/auth/v1/logout`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${s.access_token}` } }).catch(() => {});
    loginView("Çıkış yapıldı.");
  }

  const why = (e) => e.kind === "admin" ? "Bu hesap admin değil."
    : e.kind === "network" ? "Hauling Empire sunucusuna ulaşılamadı. İnternet bağlantını kontrol et, sonra sayfayı yenile."
    : `Rapor alınamadı: ${e.message}`;

  async function start() {
    if (!KEY) return show(box("Hauling Empire anahtarı girilmedi. Worker'a HE_SUPABASE_ANON_KEY (public anon anahtar) eklenince bu sayfa çalışır."));
    if (!(await session())) return loginView(hashError ? `Giriş tamamlanamadı: ${hashError}` : "");
    show(box("Yükleniyor...", "countries"));
    try {
      const ok = await rpc("am_i_admin");
      if (ok !== true) return show(box("Bu hesap admin değil."), h("button", { class: "morebtn", onclick: logout }, "Başka hesapla giriş yap"));
      const week = /^\d{4}-\d{2}-\d{2}$/.test(new URLSearchParams(location.search).get("w") || "") ? new URLSearchParams(location.search).get("w") : null;
      const r = await rpc("admin_weekly_report", { p_week_start: week });
      if (!r || !r.week_start) return show(box("Bu hafta için veri yok."));
      const prev = await rpc("admin_weekly_report", { p_week_start: addDays(r.week_start, -7) }).catch(() => null);
      render(r, prev, week);
    } catch (e) {
      if (e.kind === "login") return loginView("Oturumun süresi doldu, tekrar giriş yap.");
      show(box(why(e)), e.kind === "admin" ? h("button", { class: "morebtn", onclick: logout }, "Başka hesapla giriş yap") : null);
    }
  }
  start();
})();
