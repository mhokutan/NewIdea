// Explore page: search, category and hashtag filters over the promo grid.
// Runs after i18n.js and feed.js. Filters live in the URL (?q=, ?cat=, ?tag=) so links can be shared.
(() => {
  const grid = document.querySelector(".xgrid");
  if (!grid) return;
  const I18N = window.PV_I18N || { ui: {}, promos: {}, creators: {} };
  const input = document.getElementById("xq");
  const tiles = [...grid.querySelectorAll(".ptile")];
  const cards = [...document.querySelectorAll(".xcreator")];
  const catBtns = [...document.querySelectorAll(".xchip[data-cat]")];
  const tagLinks = [...document.querySelectorAll(".xtag[data-tag]")];
  const empty = document.querySelector(".xempty");
  const clear = document.querySelector(".xclear");
  const count = document.querySelector(".xcount");

  // Lowercase, drop accents and "#", treat Turkish dotless i as i.
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/#/g, "").trim();

  // Search text per tile: titles and descriptions in every language, creator name and kind, hashtags, category names.
  const catWords = (cat) => Object.values(I18N.ui).map((u) => u["cat_" + cat] || "").join(" ");
  const haystack = new Map(tiles.map((el) => {
    const p = I18N.promos[el.dataset.id] || {};
    const c = I18N.creators[el.dataset.creator] || {};
    const parts = [
      ...Object.values(p.title || {}), ...Object.values(p.desc || {}),
      ...Object.values(c.kind || {}), el.querySelector(".ptile-who")?.textContent,
      el.dataset.tags, catWords(el.dataset.cat),
    ];
    return [el, norm(parts.join(" "))];
  }));

  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get("q") || "",
    cat: catBtns.some((b) => b.dataset.cat === params.get("cat")) ? params.get("cat") : "all",
    tag: norm(params.get("tag")),
  };
  input.value = state.q;

  function syncUrl() {
    const u = new URLSearchParams();
    if (state.q) u.set("q", state.q);
    if (state.cat !== "all") u.set("cat", state.cat);
    if (state.tag) u.set("tag", state.tag);
    const qs = u.toString();
    history.replaceState(null, "", "/explore" + (qs ? "?" + qs : ""));
  }

  function render() {
    const words = norm(state.q).split(/\s+/).filter(Boolean);
    let shown = 0;
    tiles.forEach((el) => {
      const okCat = state.cat === "all" || el.dataset.cat === state.cat;
      const okTag = !state.tag || el.dataset.tags.split(" ").includes(state.tag);
      const text = haystack.get(el);
      const okQ = words.every((w) => text.includes(w));
      el.hidden = !(okCat && okTag && okQ);
      if (!el.hidden) shown++;
    });
    // A creator card stays if its category matches and it still has a promo on screen.
    const live = new Set(tiles.filter((el) => !el.hidden).map((el) => el.dataset.creator));
    cards.forEach((el) => { el.hidden = !live.has(el.dataset.creator); });
    catBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === state.cat)));
    tagLinks.forEach((a) => {
      const on = a.dataset.tag === state.tag;
      a.classList.toggle("is-on", on);
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
    empty.hidden = shown > 0;
    clear.hidden = !(state.q || state.cat !== "all" || state.tag);
    count.textContent = shown ? "(" + shown + ")" : "";
  }

  let timer = 0;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = input.value.trim(); syncUrl(); render(); }, 120);
  });
  input.form.addEventListener("submit", (ev) => { ev.preventDefault(); state.q = input.value.trim(); syncUrl(); render(); input.blur(); });
  catBtns.forEach((b) => b.addEventListener("click", () => { state.cat = b.dataset.cat; syncUrl(); render(); }));
  tagLinks.forEach((a) => a.addEventListener("click", (ev) => {
    ev.preventDefault();
    state.tag = state.tag === a.dataset.tag ? "" : a.dataset.tag;
    syncUrl(); render();
  }));
  clear.addEventListener("click", () => {
    state.q = ""; state.cat = "all"; state.tag = ""; input.value = "";
    syncUrl(); render(); input.focus();
  });
  render();
})();
