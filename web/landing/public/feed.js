(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  // =====================================================================
  // Language: saved choice, else browser language, else English
  // =====================================================================
  const I18N = window.PV_I18N || { ui: { en: {} }, promos: {}, creators: {} };
  const LANGS = Object.keys(I18N.ui);
  const detect = () => {
    const saved = store.get("pv_lang");
    if (saved && LANGS.includes(saved)) return saved;
    for (const l of navigator.languages || [navigator.language || "en"]) {
      const short = String(l).slice(0, 2).toLowerCase();
      if (LANGS.includes(short)) return short;
    }
    return "en";
  };
  let lang = detect();
  const T = (key) => (I18N.ui[lang] && I18N.ui[lang][key]) || (I18N.ui.en && I18N.ui.en[key]) || key;

  function applyLang(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = T(el.dataset.i18n); });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = T(el.dataset.i18nPlaceholder); });
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", T(el.dataset.i18nAria)));
    root.querySelectorAll("[data-t]").forEach((el) => {
      const holder = el.closest("[data-id]");
      const p = holder && I18N.promos[holder.dataset.id];
      if (p && p[el.dataset.t]) el.textContent = p[el.dataset.t][lang] || p[el.dataset.t].en;
    });
    root.querySelectorAll("[data-ct]").forEach((el) => {
      const holder = el.closest("[data-creator]") || el.closest("[data-creator-page]");
      const cid = holder && (holder.dataset.creator || holder.dataset.creatorPage);
      const c = cid && I18N.creators[cid];
      if (c && c[el.dataset.ct]) el.textContent = c[el.dataset.ct][lang] || c[el.dataset.ct].en;
    });
    root.querySelectorAll("[data-lang-chip]").forEach((el) => {
      const r = el.closest("[data-lang]");
      el.hidden = !r || r.dataset.lang === lang;
    });
  }
  let soundBtn = null;
  function setLang(l) {
    lang = l;
    store.set("pv_lang", l);
    document.documentElement.lang = l;
    applyLang();
    document.querySelectorAll(".lang-select").forEach((s) => { s.value = l; });
    if (window.PV_onLang) window.PV_onLang();
    if (soundBtn) renderSound();
  }
  document.documentElement.lang = lang;
  document.querySelectorAll(".lang-select").forEach((s) => {
    s.value = lang;
    s.addEventListener("change", () => setLang(s.value));
  });
  applyLang();

  // =====================================================================
  // Feed (home page only): endless vertical promo feed
  // =====================================================================
  const feed = document.getElementById("feed");
  let current = null;
  let muted = true;
  const userPaused = new WeakSet();
  const pausePlayback = () => { const v = current && current.querySelector("video"); if (v && !v.paused) v.pause(); };
  const resumePlayback = () => { if (current) play(current); };

  function renderSound() {
    soundBtn.innerHTML = `<svg aria-hidden="true"><use href="/icons.svg#i-speaker-${muted ? "slash" : "high"}"/></svg>`;
    soundBtn.setAttribute("aria-label", T(muted ? "sound_on" : "sound_off"));
  }

  function play(reel) {
    const v = reel.querySelector("video");
    if (!v) return;
    v.muted = muted;
    if (v.preload === "none") v.preload = "auto";
    if (reduceMotion || userPaused.has(v)) { reel.classList.add("is-paused"); return; }
    v.play().then(() => reel.classList.remove("is-paused")).catch(() => reel.classList.add("is-paused"));
  }
  function stop(reel) {
    const v = reel.querySelector("video");
    if (v && !v.paused) v.pause();
  }

  if (feed) {
    // ---------- Fair rotation queue (per viewer) ----------
    // Each round gives every creator the same number of slots, so a creator with many
    // promos cannot crowd out others. Inside a creator: least seen first, then the
    // viewer's language, then English, then the rest, random within ties.
    // A promo counts as seen after 3 seconds on screen and moves to the back.
    // Creators alternate, so the same creator is not shown twice in a row.
    const SLOTS_PER_CREATOR = 2;
    const templates = new Map();
    feed.querySelectorAll("[data-reel]").forEach((r) => templates.set(r.dataset.id, r.cloneNode(true)));
    const SEEN_KEY = "pv_seen_v1";
    let seen = {};
    try { seen = JSON.parse(store.get(SEEN_KEY) || "{}") || {}; } catch { seen = {}; }
    const saveSeen = () => store.set(SEEN_KEY, JSON.stringify(seen));
    const queuedUnseen = {}; // queued in this session but not watched yet
    const creatorOf = (id) => templates.get(id).dataset.creator;
    const langOf = (id) => templates.get(id).dataset.lang;
    const exposure = (id) => (seen[id]?.n || 0) + (queuedUnseen[id] || 0);
    const langRank = (id) => (langOf(id) === lang ? 0 : langOf(id) === "en" ? 1 : 2);

    function shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function nextRound(prevId, firstId) {
      const byCreator = new Map();
      for (const id of shuffle([...templates.keys()])) {
        const c = creatorOf(id);
        if (!byCreator.has(c)) byCreator.set(c, []);
        byCreator.get(c).push(id);
      }
      for (const list of byCreator.values()) {
        list.sort((a, b) => langRank(a) - langRank(b) || exposure(a) - exposure(b)); // language first, then least seen; random within ties
      }
      const out = [];
      if (firstId && templates.has(firstId)) {
        out.push(firstId);
        const list = byCreator.get(creatorOf(firstId));
        list.splice(list.indexOf(firstId), 1);
      }
      // Random creator order, never starting with the creator that was just shown.
      const lastCreator = out.length ? creatorOf(out[0]) : prevId && templates.has(prevId) ? creatorOf(prevId) : null;
      const order = shuffle([...byCreator.keys()]);
      if (order.length > 1 && order[0] === lastCreator) order.push(order.shift());
      const taken = new Map(order.map((c) => [c, out.length && creatorOf(out[0]) === c ? 1 : 0]));
      let progress = true;
      while (progress) {
        progress = false;
        for (const c of order) {
          const list = byCreator.get(c);
          if (!list.length || taken.get(c) >= SLOTS_PER_CREATOR) continue;
          out.push(list.shift());
          taken.set(c, taken.get(c) + 1);
          progress = true;
        }
      }
      out.forEach((id) => { queuedUnseen[id] = (queuedUnseen[id] || 0) + 1; });
      return out;
    }

    function markSeen(id) {
      const s = seen[id] || { n: 0, t: 0 };
      seen[id] = { n: s.n + 1, t: Date.now() };
      if (queuedUnseen[id] > 0) queuedUnseen[id]--;
      saveSeen();
    }

    const reels = () => [...feed.querySelectorAll("[data-reel]")];

    // Early access bar (2026-10-10): visitors watched but never found "Join". Shows after 6 s of watching,
    // opens the same join sheet, and stays away for 3 days once dismissed or after joining.
    const NUDGE_KEY = "pv_nudge_off";
    const nudgeOff = () => store.get("pv_joined") === "1" || Date.now() < Number(store.get(NUDGE_KEY) || 0);
    if (!nudgeOff()) {
      setTimeout(() => {
        if (nudgeOff() || document.querySelector(".sheet:not([hidden])")) return;
        const bar = document.createElement("div");
        bar.className = "join-nudge";
        bar.setAttribute("role", "region");
        bar.setAttribute("aria-label", T("nudge_t"));
        bar.innerHTML = `<span class="join-nudge-t"></span><button type="button" class="btn btn-small" data-sheet="join"></button><button type="button" class="join-nudge-x"><svg aria-hidden="true"><use href="/icons.svg#i-x"/></svg></button>`;
        bar.querySelector(".join-nudge-t").textContent = T("nudge_t");
        bar.querySelector("[data-sheet]").textContent = T("nudge_b");
        bar.querySelector(".join-nudge-x").setAttribute("aria-label", T("nudge_x"));
        const hide = () => { store.set(NUDGE_KEY, String(Date.now() + 3 * 864e5)); bar.remove(); };
        bar.querySelector(".join-nudge-x").addEventListener("click", hide);
        bar.querySelector("[data-sheet]").addEventListener("click", () => bar.remove());
        document.body.appendChild(bar);
      }, 6000);
    }

    soundBtn = document.createElement("button");
    soundBtn.type = "button";
    soundBtn.className = "sound-btn";
    document.body.appendChild(soundBtn);
    renderSound();
    soundBtn.addEventListener("click", () => {
      muted = !muted;
      renderSound();
      const v = current && current.querySelector("video");
      if (v) { v.muted = muted; if (v.paused && !userPaused.has(v)) v.play().catch(() => {}); }
    });

    let seenTimer = null;
    const visible = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          if (current && current !== e.target) stop(current);
          current = e.target;
          play(current);
          clearTimeout(seenTimer);
          const watching = current;
          seenTimer = setTimeout(() => { if (current === watching && watching.dataset.id) markSeen(watching.dataset.id); }, 3000);
          const list = reels();
          const i = list.indexOf(current);
          const next = list[i + 1];
          const nv = next && next.querySelector("video");
          if (nv && nv.preload === "none") nv.preload = "metadata";
          if (i >= list.length - 3) appendRound(); // endless
          const id = current.dataset.id;
          if (id) history.replaceState(null, "", `/?v=${id}`);
        } else if (e.target === current && e.intersectionRatio < 0.6) {
          stop(e.target);
        }
      });
    }, { root: feed, threshold: [0, 0.6, 1] });

    function setupReel(reel) {
      applyLang(reel);
      const v = reel.querySelector("video");
      if (v) {
        const bar = reel.querySelector(".progress i");
        v.addEventListener("timeupdate", () => { if (v.duration) bar.style.width = `${(v.currentTime / v.duration) * 100}%`; });
        v.addEventListener("play", () => reel.classList.remove("is-paused"));
        v.addEventListener("pause", () => reel.classList.add("is-paused"));
        v.addEventListener("click", () => {
          if (v.paused) { userPaused.delete(v); v.muted = muted; v.play().catch(() => {}); }
          else { userPaused.add(v); v.pause(); }
        });
      }
      visible.observe(reel);
    }

    function appendRound(firstId) {
      const list = reels();
      const lastId = list.length ? list[list.length - 1].dataset.id : null;
      nextRound(lastId, firstId).forEach((id, i) => {
        const r = templates.get(id).cloneNode(true);
        r.querySelectorAll("video").forEach((v) => { v.preload = !list.length && i === 0 ? "metadata" : "none"; });
        feed.appendChild(r);
        setupReel(r);
      });
    }

    // First rounds: deep link (/?v=id) goes first, then the fair queue
    const wanted = new URLSearchParams(location.search).get("v");
    reels().forEach((r) => r.remove());
    appendRound(wanted);
    appendRound();
    feed.scrollTop = 0;

    const go = (dir) => {
      const list = reels();
      const i = Math.max(0, list.indexOf(current));
      const target = list[Math.min(list.length - 1, Math.max(0, i + dir))];
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    };
    document.addEventListener("keydown", (e) => {
      if (sheetOpen() || e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); go(-1); }
      else if (e.key === "m") soundBtn.click();
      else if (e.key === " " && current) {
        const v = current.querySelector("video");
        if (v) { e.preventDefault(); v.click(); }
      }
    });
  }

  // =====================================================================
  // Share (feed and profiles)
  // =====================================================================
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-share]");
    if (!b) return;
    const reel = b.closest("[data-reel]");
    const title = (reel && reel.querySelector(".reel-title")?.textContent) || document.title;
    const url = reel && reel.dataset.id ? `https://promovote.com/?v=${reel.dataset.id}` : location.href;
    try {
      if (navigator.share) await navigator.share({ title, text: `${title} | PromoVote`, url });
      else {
        await navigator.clipboard.writeText(url);
        const label = b.querySelector("span");
        if (label) {
          const old = label.textContent;
          b.classList.add("is-shared");
          label.textContent = T("link_copied");
          setTimeout(() => { b.classList.remove("is-shared"); label.textContent = old; }, 1600);
        }
      }
    } catch {}
  });

  // =====================================================================
  // Sheet: members-only actions open a join form
  // =====================================================================
  const sheet = document.querySelector(".sheet");
  const sheetOpen = () => sheet && !sheet.hidden;
  if (!sheet) return;
  const backdrop = document.querySelector(".sheet-backdrop");
  const titleEl = sheet.querySelector(".sheet-title");
  const textEl = sheet.querySelector(".sheet-body > .sheet-text");
  const form = sheet.querySelector(".sheet-form");
  const done = sheet.querySelector(".sheet-done");
  const perkReveal = sheet.querySelector(".perk-reveal");
  const doneDefault = sheet.querySelector(".done-default");
  const msg = form.querySelector(".form-msg");
  const submitBtn = form.querySelector("button[type=submit]");
  const perkCodeEl = sheet.querySelector(".perk-code");
  const perkLinkEl = sheet.querySelector(".perk-link");
  const SITE_KEY = "0x4AAAAAAFMH6xbA0dPcxH_-";
  const MODES = ["join", "vote", "save", "follow", "notify", "perk"];
  let widgetId = null;
  let mode = "join";
  let lastFocus = null;
  let pendingSubmit = false;
  let doneKey = null;
  const joined = () => store.get("pv_joined") === "1";

  const applyPerk = (p) => {
    if (!p) return;
    perkCodeEl.textContent = p.code;
    perkLinkEl.href = p.url;
    store.set("pv_perk_nicheable", JSON.stringify(p));
  };
  try { applyPerk(JSON.parse(store.get("pv_perk_nicheable") || "null")); } catch {}

  function renderTexts() {
    titleEl.textContent = T(`s_${mode}_t`);
    textEl.textContent = doneKey ? T(doneKey) : T(`s_${mode}_p`);
  }
  window.PV_onLang = () => { if (!sheet.hidden) renderTexts(); };

  function renderTurnstile() {
    if (widgetId !== null || !window.turnstile) return;
    widgetId = window.turnstile.render(sheet.querySelector(".sheet-turnstile"), {
      sitekey: SITE_KEY, theme: "dark", size: "flexible", language: lang,
      callback: () => { if (pendingSubmit) { pendingSubmit = false; form.requestSubmit(); } },
      "error-callback": () => { pendingSubmit = false; resetSubmit(); msg.textContent = T("e_turnstile"); },
    });
  }

  function showDone(key) {
    doneKey = key;
    renderTexts();
    form.hidden = true;
    done.hidden = false;
    const isPerk = mode === "perk";
    perkReveal.hidden = !isPerk;
    doneDefault.hidden = isPerk;
  }

  function openSheet(kind) {
    mode = MODES.includes(kind) ? kind : "join";
    doneKey = null;
    msg.textContent = "";
    const hasPerk = Boolean(perkCodeEl.textContent);
    if (joined() && mode !== "perk") showDone("d_already");
    else if (joined() && hasPerk) showDone("d_thanks_perk");
    else { renderTexts(); form.hidden = false; done.hidden = true; }
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    sheet.hidden = false;
    pausePlayback();
    renderTurnstile();
    (form.hidden ? sheet.querySelector(".sheet-close") : form.email).focus();
  }

  function closeSheet() {
    sheet.hidden = true;
    backdrop.hidden = true;
    resumePlayback();
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sheet]");
    if (b) openSheet(b.dataset.sheet);
  });
  sheet.querySelector(".sheet-close").addEventListener("click", closeSheet);
  backdrop.addEventListener("click", closeSheet);
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (e.key === "Tab") {
      const f = [...sheet.querySelectorAll("button, a[href], input")].filter((el) => !el.closest("[hidden]"));
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  function resetSubmit() {
    submitBtn.disabled = false;
    submitBtn.textContent = T("f_submit");
  }

  const ERR = { invalid_email: "e_email", verification_failed: "e_human" };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    const email = form.email.value.trim();
    if (!email || !form.email.checkValidity()) { msg.textContent = T("e_email"); form.email.focus(); return; }
    const token = widgetId !== null && window.turnstile ? window.turnstile.getResponse(widgetId) : "";
    submitBtn.disabled = true;
    if (!token) {
      pendingSubmit = true;
      submitBtn.textContent = T("f_checking");
      renderTurnstile();
      return;
    }
    submitBtn.textContent = T("f_joining");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "viewer", turnstileToken: token, perk: mode === "perk" ? "nicheable" : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        store.set("pv_joined", "1");
        applyPerk(data.perk);
        showDone(mode === "perk" ? "d_thanks_perk" : "d_thanks");
        resetSubmit();
        return;
      }
      msg.textContent = T(ERR[data.error] || "e_generic");
    } catch {
      msg.textContent = T("e_network");
    }
    if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    resetSubmit();
  });

  sheet.querySelector("[data-copy]").addEventListener("click", async (e) => {
    try { await navigator.clipboard.writeText(perkCodeEl.textContent); e.target.textContent = T("p_copied"); } catch {}
  });
})();
