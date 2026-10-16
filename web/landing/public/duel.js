// Duel (founder decision 2026-10-16): two promos at once, the viewer picks the one that blows up first.
// Web test before the app. Picks are sent to /api/duel without personal data; nobody sees who "lost".
(() => {
  const dataEl = document.getElementById("duel-data");
  const pairEl = document.querySelector(".dpair");
  if (!dataEl || !pairEl) return;
  const ALL = JSON.parse(dataEl.textContent);
  const I18N = window.PV_I18N || { ui: { en: {} }, promos: {} };
  const ROUNDS = 7;
  const lang = () => document.documentElement.lang || "en";
  const T = (k) => (I18N.ui[lang()] && I18N.ui[lang()][k]) || (I18N.ui.en && I18N.ui.en[k]) || k;
  const title = (p) => { const t = I18N.promos[p.id] && I18N.promos[p.id].title; return (t && (t[lang()] || t.en)) || p.t; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(navigator.userAgent);

  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // A session: up to 7 pairs, each promo used once, the two sides from different creators when possible.
  function makePairs() {
    const pool = shuffle(ALL.slice());
    const pairs = [];
    while (pool.length >= 2 && pairs.length < ROUNDS) {
      const a = pool.shift();
      let j = pool.findIndex((p) => p.c !== a.c);
      if (j < 0) j = 0;
      const b = pool.splice(j, 1)[0];
      pairs.push(Math.random() < 0.5 ? [a, b] : [b, a]);
    }
    return pairs;
  }

  // A shared link (?d=idA,idB) opens that duel first.
  function sharedPair() {
    const ids = (new URLSearchParams(location.search).get("d") || "").split(",");
    const a = ALL.find((p) => p.id === ids[0]), b = ALL.find((p) => p.id === ids[1]);
    return a && b && a.id !== b.id ? [a, b] : null;
  }

  let pairs = [], round = 0, picked = false;
  const progressEl = document.querySelector(".dprogress");
  const nextBtn = document.querySelector(".dnext");
  const endEl = document.querySelector(".dend");
  const headEl = document.querySelector(".dhead");

  function card(p, side) {
    return `<article class="dcard" data-id="${esc(p.id)}" data-creator="${esc(p.c)}" data-side="${side}">
      <div class="dstage">
        <video class="dvideo" muted loop playsinline autoplay preload="metadata" poster="/media/${esc(p.v)}-poster.jpg" aria-label="${esc(title(p))}">
          <source src="/media/${esc(p.v)}.mp4" type="video/mp4">
          <source src="/media/${esc(p.v)}.webm" type="video/webm">
        </video>
        <button type="button" class="dmute" aria-label="Sound" aria-pressed="false"><svg aria-hidden="true"><use href="/icons.svg#i-speaker-slash"/></svg></button>
        <div class="dinfo">
          <a class="dwho" href="/@${esc(p.c)}">${esc(p.n)}</a>
          <p class="dname">${esc(title(p))}</p>
        </div>
        <span class="dbadge" hidden>${esc(T("d_called"))}</span>
      </div>
      <button type="button" class="dpick"><svg class="dchev" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 35 32 23 44 35M20 46 32 34 44 46"/></svg><span>${esc(T("d_pick"))}</span></button>
    </article>`;
  }

  function render() {
    const [a, b] = pairs[round];
    picked = false;
    pairEl.innerHTML = card(a, "a") + `<span class="dvs" aria-hidden="true">${esc(T("d_vs"))}</span>` + card(b, "b");
    progressEl.textContent = T("d_progress").replace("{n}", round + 1).replace("{total}", pairs.length);
    nextBtn.hidden = true;
    pairEl.querySelectorAll("video").forEach((v) => { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); });
    pairEl.querySelectorAll(".dcard").forEach((el) => {
      const v = el.querySelector("video");
      const muteBtn = el.querySelector(".dmute");
      const toggle = () => {
        const turnOn = v.muted;
        pairEl.querySelectorAll(".dcard").forEach((o) => {
          const ov = o.querySelector("video");
          ov.muted = true;
          o.querySelector(".dmute").setAttribute("aria-pressed", "false");
          o.querySelector(".dmute use").setAttribute("href", "/icons.svg#i-speaker-slash");
        });
        if (turnOn) {
          v.muted = false;
          muteBtn.setAttribute("aria-pressed", "true");
          muteBtn.querySelector("use").setAttribute("href", "/icons.svg#i-speaker-high");
          const pr = v.play(); if (pr && pr.catch) pr.catch(() => {});
        }
      };
      v.addEventListener("click", toggle);
      muteBtn.addEventListener("click", toggle);
      el.querySelector(".dpick").addEventListener("click", () => pick(el));
    });
  }

  function pick(el) {
    if (picked) return;
    picked = true;
    const [a, b] = pairs[round];
    pairEl.querySelectorAll(".dcard").forEach((o) => {
      const mine = o === el;
      o.classList.add(mine ? "is-picked" : "is-other");
      o.querySelector(".dbadge").hidden = !mine;
      o.querySelector(".dpick").disabled = true;
    });
    try {
      fetch("/api/duel", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ a: a.id, b: b.id, pick: el.dataset.id }) }).catch(() => {});
    } catch {}
    nextBtn.hidden = false;
    nextBtn.textContent = round + 1 < pairs.length ? T("d_next") : T("d_done_t");
    nextBtn.focus({ preventScroll: true });
    nextBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function finish() {
    pairEl.querySelectorAll("video").forEach((v) => v.pause());
    pairEl.innerHTML = "";
    pairEl.hidden = true;
    headEl.hidden = true;
    nextBtn.hidden = true;
    endEl.hidden = false;
    endEl.querySelector(".dget-android").hidden = isIOS;
    endEl.querySelector(".dget-ios").hidden = isAndroid;
  }

  function start() {
    const first = sharedPair();
    pairs = makePairs();
    if (first) pairs = [first, ...pairs.filter(([x, y]) => ![x.id, y.id].some((id) => id === first[0].id || id === first[1].id))].slice(0, ROUNDS);
    round = 0;
    pairEl.hidden = false;
    headEl.hidden = false;
    endEl.hidden = true;
    render();
  }

  nextBtn.addEventListener("click", () => {
    if (round + 1 < pairs.length) { round++; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } else finish();
  });
  endEl.querySelector(".dagain").addEventListener("click", start);
  endEl.querySelector(".dshare").addEventListener("click", async () => {
    const [a, b] = pairs[0] || [];
    const url = a ? `https://promovote.com/duel?d=${encodeURIComponent(a.id)},${encodeURIComponent(b.id)}` : "https://promovote.com/duel";
    try {
      if (navigator.share) await navigator.share({ title: "PromoVote Duel", text: T("d_sub"), url });
      else { await navigator.clipboard.writeText(url); endEl.querySelector(".dshare").textContent = T("d_copied"); }
    } catch {}
  });
  window.PV_onLang = () => { if (!pairEl.hidden && pairs[round]) { const keepPicked = picked; if (!keepPicked) render(); } };

  start();
})();
