(() => {
  const feed = document.getElementById("feed");
  const reels = [...document.querySelectorAll("[data-reel]")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  // ---------- Playback: only the reel on screen plays ----------
  let muted = true;
  let current = null;
  const userPaused = new WeakSet();

  const soundBtn = document.createElement("button");
  soundBtn.type = "button";
  soundBtn.className = "sound-btn";
  document.body.appendChild(soundBtn);
  const renderSound = () => {
    soundBtn.innerHTML = `<svg aria-hidden="true"><use href="/icons.svg#i-speaker-${muted ? "slash" : "high"}"/></svg>`;
    soundBtn.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
  };
  renderSound();
  soundBtn.addEventListener("click", () => {
    muted = !muted;
    renderSound();
    const v = current && current.querySelector("video");
    if (v) { v.muted = muted; if (v.paused && !userPaused.has(v)) v.play().catch(() => {}); }
  });

  const play = (reel) => {
    const v = reel.querySelector("video");
    soundBtn.hidden = !v;
    if (!v) return;
    v.muted = muted;
    if (v.preload === "none") v.preload = "auto";
    if (reduceMotion || userPaused.has(v)) { reel.classList.add("is-paused"); return; }
    v.play().then(() => reel.classList.remove("is-paused")).catch(() => reel.classList.add("is-paused"));
  };
  const stop = (reel) => {
    const v = reel.querySelector("video");
    if (v && !v.paused) v.pause();
  };

  const visible = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && e.intersectionRatio >= 0.6) {
        if (current && current !== e.target) stop(current);
        current = e.target;
        play(current);
        // warm up the next video
        const next = reels[reels.indexOf(current) + 1];
        const nv = next && next.querySelector("video");
        if (nv && nv.preload === "none") nv.preload = "metadata";
      } else if (e.target === current && e.intersectionRatio < 0.6) {
        stop(e.target);
      }
    });
  }, { root: feed, threshold: [0, 0.6, 1] });
  reels.forEach((r) => visible.observe(r));

  reels.forEach((reel) => {
    const v = reel.querySelector("video");
    if (!v) return;
    const bar = reel.querySelector(".progress i");
    v.addEventListener("timeupdate", () => {
      if (v.duration) bar.style.width = `${(v.currentTime / v.duration) * 100}%`;
    });
    v.addEventListener("play", () => reel.classList.remove("is-paused"));
    v.addEventListener("pause", () => reel.classList.add("is-paused"));
    // Tap the video to pause or resume
    v.addEventListener("click", () => {
      if (v.paused) { userPaused.delete(v); v.muted = muted; v.play().catch(() => {}); }
      else { userPaused.add(v); v.pause(); }
    });
  });

  // Keyboard: arrows or j/k move, space pauses, m toggles sound
  const go = (dir) => {
    const i = Math.max(0, reels.indexOf(current));
    const target = reels[Math.min(reels.length - 1, Math.max(0, i + dir))];
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };
  document.addEventListener("keydown", (e) => {
    if (!sheet.hidden || e.target.closest("input, textarea, select")) return;
    if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); go(-1); }
    else if (e.key === "m") soundBtn.click();
    else if (e.key === " " && current) {
      const v = current.querySelector("video");
      if (v) { e.preventDefault(); v.click(); }
    }
  });

  // ---------- Share ----------
  document.querySelectorAll("[data-share]").forEach((b) =>
    b.addEventListener("click", async () => {
      const title = b.closest("[data-reel]").querySelector(".reel-title")?.textContent || "PromoVote";
      const data = { title, text: `${title} on PromoVote`, url: "https://promovote.com/" };
      try {
        if (navigator.share) await navigator.share(data);
        else { await navigator.clipboard.writeText(data.url); flash(b, "Link copied"); }
      } catch {}
    })
  );
  function flash(btn, text) {
    const label = btn.querySelector("span");
    const old = label.textContent;
    btn.classList.add("is-shared");
    label.textContent = text;
    setTimeout(() => { btn.classList.remove("is-shared"); label.textContent = old; }, 1600);
  }

  // ---------- Sheet: members-only actions open a join form ----------
  const sheet = document.querySelector(".sheet");
  const backdrop = document.querySelector(".sheet-backdrop");
  const titleEl = sheet.querySelector(".sheet-title");
  const textEl = sheet.querySelector(".sheet-body > .sheet-text");
  const form = sheet.querySelector(".sheet-form");
  const done = sheet.querySelector(".sheet-done");
  const perkReveal = sheet.querySelector(".perk-reveal");
  const doneDefault = sheet.querySelector(".done-default");
  const msg = form.querySelector(".form-msg");
  const submitBtn = form.querySelector("button[type=submit]");
  const SITE_KEY = "0x4AAAAAAFMH6xbA0dPcxH_-";
  let widgetId = null;
  let mode = "join";
  let lastFocus = null;
  let pendingSubmit = false;
  const joined = () => store.get("pv_joined") === "1";
  const perkCodeEl = sheet.querySelector(".perk-code");
  const perkLinkEl = sheet.querySelector(".perk-link");
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
    if (joined() && (kind === "join" || kind === "notify" || (kind === "perk" && hasPerk))) {
      textEl.textContent = kind === "perk" ? "Thanks for joining. Here is your perk." : "You're already on the waitlist. Thanks!";
      showDone();
    } else {
      form.hidden = false;
      done.hidden = true;
    }
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    sheet.hidden = false;
    if (current) stop(current);
    renderTurnstile();
    (form.hidden ? sheet.querySelector(".sheet-close") : form.email).focus();
  }

  function closeSheet() {
    sheet.hidden = true;
    backdrop.hidden = true;
    if (current) play(current);
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll("[data-sheet]").forEach((b) => b.addEventListener("click", () => openSheet(b.dataset.sheet)));
  sheet.querySelector(".sheet-close").addEventListener("click", closeSheet);
  backdrop.addEventListener("click", closeSheet);
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (e.key === "Tab") { // keep focus inside the dialog
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
