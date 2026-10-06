(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  // =====================================================================
  // Feed (home page only): endless vertical promo feed
  // =====================================================================
  const feed = document.getElementById("feed");
  let current = null;
  let muted = true;
  const userPaused = new WeakSet();
  const pausePlayback = () => { const v = current && current.querySelector("video"); if (v && !v.paused) v.pause(); };
  const resumePlayback = () => { if (current) play(current); };

  let soundBtn = null;
  function renderSound() {
    soundBtn.innerHTML = `<svg aria-hidden="true"><use href="/icons.svg#i-speaker-${muted ? "slash" : "high"}"/></svg>`;
    soundBtn.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
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
    const base = [...feed.querySelectorAll("[data-reel]")].map((r) => r.cloneNode(true));
    const reels = () => [...feed.querySelectorAll("[data-reel]")];

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

    const visible = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) {
          if (current && current !== e.target) stop(current);
          current = e.target;
          play(current);
          const list = reels();
          const i = list.indexOf(current);
          const next = list[i + 1];
          const nv = next && next.querySelector("video");
          if (nv && nv.preload === "none") nv.preload = "metadata";
          if (i >= list.length - 3) appendCycle(); // endless: add another round before the end
          const id = current.dataset.id;
          if (id) history.replaceState(null, "", `/?v=${id}`);
        } else if (e.target === current && e.intersectionRatio < 0.6) {
          stop(e.target);
        }
      });
    }, { root: feed, threshold: [0, 0.6, 1] });

    function setupReel(reel) {
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

    function appendCycle() {
      base.forEach((tpl) => {
        const r = tpl.cloneNode(true);
        r.querySelectorAll("video").forEach((v) => { v.preload = "none"; });
        feed.appendChild(r);
        setupReel(r);
      });
    }

    reels().forEach(setupReel);

    // Deep link: /?v=nicheable-grade-tracker opens that promo first
    const wanted = new URLSearchParams(location.search).get("v");
    const start = wanted && reels().find((r) => r.dataset.id === wanted);
    if (start) requestAnimationFrame(() => start.scrollIntoView());

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
      if (navigator.share) await navigator.share({ title, text: `${title} on PromoVote`, url });
      else {
        await navigator.clipboard.writeText(url);
        const label = b.querySelector("span");
        if (label) {
          const old = label.textContent;
          b.classList.add("is-shared");
          label.textContent = "Link copied";
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
  let widgetId = null;
  let mode = "join";
  let lastFocus = null;
  let pendingSubmit = false;
  const joined = () => store.get("pv_joined") === "1";

  const applyPerk = (p) => {
    if (!p) return;
    perkCodeEl.textContent = p.code;
    perkLinkEl.href = p.url;
    store.set("pv_perk_nicheable", JSON.stringify(p));
  };
  try { applyPerk(JSON.parse(store.get("pv_perk_nicheable") || "null")); } catch {}

  const COPY = {
    join: ["Join PromoVote", "Watching is always free. Join the waitlist to vote, save promos and earn Scout Score when accounts open."],
    vote: ["Votes are for members", "Watching is free for everyone. Join the waitlist to vote on what will blow up and earn Scout Score when accounts open."],
    save: ["Save promos with an account", "Join the waitlist and you can save promos to your list when accounts open."],
    follow: ["Follow creators with an account", "Join the waitlist and you can follow creators and hear about their new promos when accounts open."],
    notify: ["Get notified at launch", "Leave your email and we'll tell you when this game is out on iOS and Android."],
    perk: ["Unlock 25% off at Nicheable", "Perks are for members. Join the waitlist with your email to see the code right away."],
  };

  function renderTurnstile() {
    if (widgetId !== null || !window.turnstile) return;
    widgetId = window.turnstile.render(sheet.querySelector(".sheet-turnstile"), {
      sitekey: SITE_KEY, theme: "dark", size: "flexible",
      callback: () => { if (pendingSubmit) { pendingSubmit = false; form.requestSubmit(); } },
      "error-callback": () => { pendingSubmit = false; resetSubmit(); msg.textContent = "The human check could not load. Please refresh and try again."; },
    });
  }

  function showDone() {
    form.hidden = true;
    done.hidden = false;
    const isPerk = mode === "perk";
    perkReveal.hidden = !isPerk;
    doneDefault.hidden = isPerk;
  }

  function openSheet(kind) {
    mode = kind;
    const [t, p] = COPY[kind] || COPY.join;
    titleEl.textContent = t;
    textEl.textContent = p;
    msg.textContent = "";
    const hasPerk = Boolean(perkCodeEl.textContent);
    if (joined() && kind !== "perk") {
      textEl.textContent = "You're on the waitlist. We'll email you when accounts open.";
      showDone();
    } else if (joined() && hasPerk) {
      textEl.textContent = "Thanks for joining. Here is your perk.";
      showDone();
    } else {
      form.hidden = false;
      done.hidden = true;
    }
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
    submitBtn.textContent = "Join the waitlist";
  }

  const ERR = {
    invalid_email: "Please enter a valid email address.",
    verification_failed: "Quick human check failed. Please try again.",
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    const email = form.email.value.trim();
    if (!email || !form.email.checkValidity()) { msg.textContent = ERR.invalid_email; form.email.focus(); return; }
    const token = widgetId !== null && window.turnstile ? window.turnstile.getResponse(widgetId) : "";
    submitBtn.disabled = true;
    if (!token) {
      pendingSubmit = true;
      submitBtn.textContent = "Checking you're human...";
      renderTurnstile();
      return;
    }
    submitBtn.textContent = "Joining...";
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
        textEl.textContent = mode === "perk" ? "Thanks for joining. Here is your perk." : "Thanks for joining.";
        showDone();
        resetSubmit();
        return;
      }
      msg.textContent = ERR[data.error] || "Something went wrong. Please try again.";
    } catch {
      msg.textContent = "Network error. Please try again.";
    }
    if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    resetSubmit();
  });

  sheet.querySelector("[data-copy]").addEventListener("click", async (e) => {
    try { await navigator.clipboard.writeText(perkCodeEl.textContent); e.target.textContent = "Copied"; } catch { e.target.textContent = "Select and copy"; }
  });
})();
