// Hauling Empire reports (admin page /admin/hauling-empire/rapor, founder request 2026-10-30, second version):
// Claude's written player analyses (kind analysis) and the weekly reports (kind weekly), all players. Reads only,
// through this Worker (/admin/hauling-empire/rapor.json, behind the admin login), which calls Hauling Empire's
// store-stats function with the server key HE_STATS_KEY. No second sign in (founder 2026-10-30). Markdown is turned
// into DOM nodes by a small renderer that never parses HTML (player quotes in the reports can hold anything).
// No Supabase library: Auth and RPC are plain REST calls. The session lives under its own storage key.
// Player text (feedback) is always set as text, never as HTML.
(() => {
  const root = document.getElementById("he-report");
  if (!root) return;
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

  // ---------- data: same origin, the Worker adds the server key ----------
  async function api(q) {
    let r;
    try { r = await fetch(`/admin/hauling-empire/rapor.json?${new URLSearchParams(q)}`, { credentials: "same-origin" }); }
    catch { throw Object.assign(new Error("network"), { kind: "network" }); }
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) throw Object.assign(new Error(j?.why || `HTTP ${r.status}`), { kind: "server" });
    return j.data;
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
  function renderRaw(r, prev) {
    const s = r.summary || {}, p = prev?.summary || {};
    if (!num(s.wau)) return [box("Bu hafta için ham sayı yok.")];

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

    return [
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
      table(["Tarih", "Kategori", "Yorum"], (fb.latest || []).slice(0, 10).map((x) => [x.at ? new Date(x.at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "", x.category || "", x.text || ""]))];
  }

  const why = (e) => e.kind === "network" ? "Hauling Empire sunucusuna ulaşılamadı. İnternet bağlantını kontrol et, sonra sayfayı yenile."
    : `Rapor alınamadı: ${e.message}`;

  // ---------- safe Markdown: text only, no HTML ever parsed ----------
  const slug = (t, used) => { let b = t.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "bolum"; let k = b, i = 2; while (used.has(k)) k = `${b}-${i++}`; used.add(k); return k; };
  function inline(text) {
    const out = [];
    const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      if (m[2] || m[3]) out.push(h("strong", {}, ...inline(m[2] || m[3])));
      else if (m[4] || m[5]) out.push(h("em", {}, m[4] || m[5]));
      else if (m[6]) out.push(h("code", {}, m[6]));
      else if (m[7]) out.push(/^https:\/\//.test(m[8]) ? h("a", { href: m[8], target: "_blank", rel: "noopener noreferrer" }, m[7]) : m[7]);
      last = re.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }
  const isNum = (c) => /^[\s$€£₺%+\-−]*[\d.,]+\s*(%|s|dk|sn|x)?\s*$/.test(c) && /\d/.test(c);
  function md(src) {
    const L = String(src || "").replace(/\r/g, "").split("\n");
    const nodes = [], toc = [], used = new Set();
    let i = 0;
    const cells = (row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    while (i < L.length) {
      const line = L[i];
      if (!line.trim()) { i++; continue; }
      let m;
      if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
        const lv = m[1].length, txt = m[2].replace(/#+\s*$/, "").trim(), id = slug(txt, used);
        nodes.push(h(`h${Math.min(lv + 1, 5)}`, { id, class: "md-h" }, ...inline(txt)));
        if (lv <= 3) toc.push({ lv, txt, id });
        i++; continue;
      }
      if (/^(-{3,}|\*{3,})\s*$/.test(line)) { nodes.push(h("hr", {})); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(L[i + 1] || "")) {
        const head = cells(line); i += 2;
        const rows = [];
        while (i < L.length && /^\s*\|.*\|\s*$/.test(L[i])) rows.push(cells(L[i++]));
        const right = head.map((_, c) => rows.length > 0 && rows.every((r) => !r[c] || isNum(r[c])));
        nodes.push(h("div", { class: "tablewrap md-table" }, h("table", {},
          h("thead", {}, h("tr", {}, ...head.map((c, k) => h("th", { style: right[k] ? "text-align:right" : "" }, ...inline(c))))),
          h("tbody", {}, ...rows.map((r) => h("tr", {}, ...head.map((_, k) => h("td", { style: `white-space:normal${right[k] ? ";text-align:right" : ""}` }, ...inline(r[k] || "")))))))));
        continue;
      }
      if (/^\s*>/.test(line)) {
        const q = [];
        while (i < L.length && /^\s*>/.test(L[i])) q.push(L[i++].replace(/^\s*>\s?/, ""));
        nodes.push(h("blockquote", { class: "md-quote" }, ...inline(q.join(" "))));
        continue;
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
        const ordered = /^\s*\d/.test(line), items = [];
        while (i < L.length && /^\s*([-*+]|\d+[.)])\s+/.test(L[i]) && /^\s*\d/.test(L[i]) === ordered) {
          let t = L[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, "");
          while (i < L.length && /^\s{2,}\S/.test(L[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(L[i])) t += " " + L[i++].trim();
          items.push(h("li", {}, ...inline(t)));
        }
        nodes.push(h(ordered ? "ol" : "ul", { class: "md-list" }, ...items));
        continue;
      }
      if (/^```/.test(line)) {
        const code = []; i++;
        while (i < L.length && !/^```/.test(L[i])) code.push(L[i++]);
        i++;
        nodes.push(h("pre", { class: "md-pre" }, code.join("\n")));
        continue;
      }
      const para = [];
      while (i < L.length && L[i].trim() && !/^(#{1,4}\s|\s*\||\s*>|\s*([-*+]|\d+[.)])\s+|```|-{3,}\s*$)/.test(L[i])) para.push(L[i++].trim());
      if (!para.length) { para.push(L[i++].trim()); }
      nodes.push(h("p", { class: "md-p" }, ...inline(para.join(" "))));
    }
    return { nodes, toc };
  }

  // ---------- reports viewer ----------
  const KIND = { weekly: "Haftalık", analysis: "Analiz" };
  const period = (r) => r.period_start ? `${trDate(String(r.period_start).slice(0, 10))} – ${trDate(String(r.period_end || r.period_start).slice(0, 10))}` : "";
  const isNew = (r) => r.created_at && Date.now() - new Date(r.created_at).getTime() < 7 * 864e5;
  const copy = (text, btn) => (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => { btn.textContent = "Kopyalandı"; }, () => { btn.textContent = "Kopyalanamadı"; });

  function highlights(x) {
    const g = x || {};
    const out = [];
    const ch = num(g.wau_change_pct);
    if (num(g.players) != null) out.push(tile("Oyuncu", fmtN(g.players)));
    if (num(g.wau) != null) out.push(tile("Haftalık aktif", fmtN(g.wau), { level: ch == null ? "" : ch >= 0 ? "g" : "r", note: ch == null ? null : `${ch >= 0 ? "▲" : "▼"} %${Math.abs(ch).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} önceki haftaya göre` }));
    if (num(g.new_players) != null) out.push(tile("Yeni oyuncu", fmtN(g.new_players)));
    if (num(g.d1_pct) != null) out.push(tile("1. gün dönen (D1)", pct(g.d1_pct)));
    if (num(g.d7_pct) != null) out.push(tile("7. gün dönen (D7)", pct(g.d7_pct)));
    if (num(g.median_session_s) != null) out.push(tile("Ortanca oturum", mmss(g.median_session_s)));
    if (num(g.crash_players) != null) out.push(tile("Çökme yaşayan oyuncu", fmtN(g.crash_players), { level: num(g.crash_players) > 0 ? "y" : "g" }));
    if (out.length < 4) {
      if (num(g.avg_dau) != null) out.push(tile("Günlük ortalama aktif", fmtN(g.avg_dau)));
      if (num(g.first_delivery_pct) != null) out.push(tile("İlk teslimata ulaşan", pct(g.first_delivery_pct)));
      if (num(g.iap_failed_players) != null) out.push(tile("Ödemesi hata veren", fmtN(g.iap_failed_players)));
    }
    return out.length ? tiles(...out.slice(0, 6)) : null;
  }

  async function viewer() {
    const list = await api({ feed: "reports" });
    // The feed may send the list bare or inside an object ({ reports: [...] }, { data: [...] }...).
    const reports = Array.isArray(list) ? list : (list && (list.reports || list.items || list.data || list.rows || Object.values(list).find(Array.isArray))) || [];
    const bar = h("div", { class: "top no-print", style: "margin:4px 0 16px" },
      h("span", { class: "countries", style: "margin:0" }, "Bütün oyuncuları kapsar."));
    if (!reports.length) return show(bar, box("Henüz rapor yok. Haftalık rapor her Pazartesi sabahı eklenir."),
      list && !Array.isArray(list) && typeof list === "object" ? h("p", { class: "dim", style: "font-size:12px" }, `Sunucu cevabındaki alanlar: ${Object.keys(list).join(", ") || "boş"}`) : null);
    const pane = h("section", { class: "rp-pane", "aria-live": "polite" });
    const items = reports.map((r) => h("button", { class: "rp-item", "data-id": r.id, onclick: () => open(r.id) },
      h("span", { class: "rp-tags" }, h("span", { class: "role" }, KIND[r.kind] || r.kind || "Rapor"), isNew(r) ? h("span", { class: "badge-on" }, "Yeni") : null),
      h("b", {}, r.title || "Rapor"), h("small", { class: "dim" }, period(r))));
    const listEl = h("nav", { class: "rp-list no-print", "aria-label": "Raporlar" }, ...items);
    show(bar, h("div", { class: "rp-grid" }, listEl, pane));

    async function open(id) {
      items.forEach((b) => b.classList.toggle("on", b.dataset.id === String(id)));
      pane.replaceChildren(box("Yükleniyor...", "countries"));
      let r;
      try {
        r = await api({ feed: "report", id });
        if (Array.isArray(r)) r = r[0];
        if (r && r.body_md == null) r = r.report || r.data || r.item || r;
        if (Array.isArray(r)) r = r[0];
      }
      catch (e) { return pane.replaceChildren(box(why(e))); }
      if (!r) return pane.replaceChildren(box("Rapor bulunamadı."));
      const { nodes, toc } = md(r.body_md);
      const body = h("article", { class: "md" }, ...nodes);
      const tocEl = toc.length > 2 ? h("details", { class: "rp-toc no-print", open: true }, h("summary", {}, "İçindekiler"),
        h("ol", {}, ...toc.map((t) => h("li", { style: `margin-left:${(t.lv - 1) * 14}px` }, h("a", { href: `#${t.id}` }, t.txt))))) : null;
      const btnCopy = h("button", { class: "morebtn", style: "margin:0", onclick: (e) => copy(r.body_md || "", e.target) }, "Markdown kopyala");
      const btnPrint = h("button", { class: "morebtn", style: "margin:0", onclick: () => window.print() }, "Yazdır / PDF");
      const tabs = h("div", { class: "tabs no-print", style: "margin:16px 0" });
      const content = h("div", {});
      const textTab = [highlights(r.highlights), tocEl, body];
      const setTab = async (which) => {
        tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.t === which));
        if (which === "text") return content.replaceChildren(...textTab.filter(Boolean));
        content.replaceChildren(box("Yükleniyor...", "countries"));
        try {
          const w = String(r.period_start).slice(0, 10);
          const [raw, prev] = await Promise.all([api({ feed: "weekly", week: w }), api({ feed: "weekly", week: addDays(w, -7) }).catch(() => null)]);
          content.replaceChildren(...(raw && raw.week_start ? renderRaw(raw, prev) : [box("Bu hafta için ham sayı yok.")]).filter(Boolean));
        } catch (e) { content.replaceChildren(box(why(e))); }
      };
      tabs.append(h("a", { class: "tab", href: "#", "data-t": "text", onclick: (e) => { e.preventDefault(); setTab("text"); } }, "Rapor"));
      if (r.kind === "weekly" && r.period_start) tabs.append(h("a", { class: "tab", href: "#", "data-t": "raw", onclick: (e) => { e.preventDefault(); setTab("raw"); } }, "Ham sayılar"));
      pane.replaceChildren(
        h("div", { class: "rp-head" },
          h("div", {}, h("span", { class: "role" }, KIND[r.kind] || r.kind || "Rapor"), h("h2", { style: "font-size:26px;margin:8px 0 4px" }, r.title || "Rapor"), h("p", { class: "dim", style: "margin:0" }, period(r))),
          h("div", { class: "no-print", style: "display:flex;gap:8px;flex-wrap:wrap" }, btnCopy, btnPrint)),
        tabs, content);
      setTab("text");
      if (window.matchMedia("(max-width:860px)").matches) pane.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    open(reports[0].id);
  }

  // Until store-stats serves the written reports (feed=reports), last week's raw numbers are shown instead.
  async function start() {
    show(box("Yükleniyor...", "countries"));
    try { await viewer(); }
    catch (e) {
      try {
        const raw = await api({ feed: "weekly" });
        const before = raw?.week_start ? await api({ feed: "weekly", week: addDays(raw.week_start, -7) }).catch(() => null) : null;
        show(h("p", { class: "warnbar", style: "margin:0 0 16px" }, "Yazılı raporlar henüz bağlı değil. Şimdilik geçen haftanın sayıları gösteriliyor."),
          ...(raw?.week_start ? renderRaw(raw, before) : [box(why(e))]).filter(Boolean));
      } catch { show(box(why(e))); }
    }
  }
  start();
})();
