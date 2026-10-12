// Admin tables: click a header to sort (uses data-v on cells when present), type in a search box to filter rows.
(() => {
  document.querySelectorAll("table[data-sortable]").forEach((table) => {
    const body = table.tBodies[0];
    table.querySelectorAll("thead th").forEach((th, i) => {
      th.style.cursor = "pointer";
      th.title = "Sırala";
      th.addEventListener("click", () => {
        const dir = th.dataset.dir === "asc" ? "desc" : "asc";
        table.querySelectorAll("thead th").forEach((h) => { delete h.dataset.dir; h.removeAttribute("aria-sort"); });
        th.dataset.dir = dir;
        th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
        const rows = [...body.rows].filter((r) => !r.dataset.empty);
        const val = (r) => { const c = r.cells[i]; const v = c ? (c.dataset.v ?? c.textContent.trim()) : ""; const n = Number(v); return v !== "" && !isNaN(n) ? n : v.toLowerCase(); };
        rows.sort((a, b) => { const x = val(a), y = val(b); const r = x < y ? -1 : x > y ? 1 : 0; return dir === "asc" ? r : -r; });
        rows.forEach((r) => body.appendChild(r));
      });
    });
  });
  document.querySelectorAll("input[data-filter]").forEach((input) => {
    const table = document.getElementById(input.dataset.filter);
    if (!table) return;
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      [...table.tBodies[0].rows].forEach((r) => {
        if (r.dataset.empty) return;
        r.hidden = q && !(r.dataset.search || "").includes(q);
      });
    });
  });
})();
