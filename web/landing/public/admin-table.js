// Admin tables: click a header to sort (uses data-v on cells when present), type in a search box to filter rows,
// and long tables (data-collapse="N") show only N rows until "Tümünü göster" is pressed.
(() => {
  const rowsOf = (table) => [...table.tBodies[0].rows].filter((r) => !r.dataset.empty);

  // Show or hide rows: a search query shows every match; otherwise a collapsed table shows its first N rows.
  const apply = (table) => {
    const q = table.dataset.q || "";
    const limit = table.dataset.open === "1" ? Infinity : Number(table.dataset.collapse) || Infinity;
    let shown = 0;
    rowsOf(table).forEach((r) => {
      const match = !q || (r.dataset.search || r.textContent.toLowerCase()).includes(q);
      const visible = match && (q ? true : shown < limit);
      r.hidden = !visible;
      if (visible) shown++;
    });
    const btn = table._moreBtn;
    if (btn) {
      const total = rowsOf(table).length;
      btn.hidden = !!q || total <= (Number(table.dataset.collapse) || 0);
      btn.textContent = table.dataset.open === "1" ? "Daha az göster" : `Tümünü göster (${total})`;
    }
  };

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
        const rows = rowsOf(table);
        const val = (r) => { const c = r.cells[i]; const v = c ? (c.dataset.v ?? c.textContent.trim()) : ""; const n = Number(v); return v !== "" && !isNaN(n) ? n : v.toLowerCase(); };
        rows.sort((a, b) => { const x = val(a), y = val(b); const r = x < y ? -1 : x > y ? 1 : 0; return dir === "asc" ? r : -r; });
        rows.forEach((r) => body.appendChild(r));
        apply(table);
      });
    });
  });

  document.querySelectorAll("table[data-collapse]").forEach((table) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "morebtn";
    btn.addEventListener("click", () => {
      table.dataset.open = table.dataset.open === "1" ? "0" : "1";
      apply(table);
    });
    (table.closest(".tablewrap") || table).after(btn);
    table._moreBtn = btn;
    apply(table);
  });

  document.querySelectorAll("input[data-filter]").forEach((input) => {
    const table = document.getElementById(input.dataset.filter);
    if (!table) return;
    input.addEventListener("input", () => {
      table.dataset.q = input.value.trim().toLowerCase();
      apply(table);
    });
  });
})();
