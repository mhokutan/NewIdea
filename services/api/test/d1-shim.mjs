// A tiny in-memory D1 stand-in over node:sqlite for API tests (no wrangler, no network).
// Applies the given migration files, then serves prepare/bind/first/all/run/raw/batch/exec like D1.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

export function d1(migrations = []) {
  const db = new DatabaseSync(":memory:");
  for (const f of migrations) db.exec(readFileSync(f, "utf8"));
  const norm = (a) => a.map((x) => (x === undefined ? (() => { throw new Error("D1_TYPE_ERROR: undefined bind"); })() : typeof x === "boolean" ? Number(x) : x));
  const stmt = (sql, args = []) => ({
    sql, args,
    bind(...a) { return stmt(sql, norm(a)); },
    async all() { return { results: db.prepare(sql).all(...args), success: true, meta: {} }; },
    async first(col) { const r = db.prepare(sql).get(...args) ?? null; return col && r ? r[col] : r; },
    async run() { const r = db.prepare(sql).run(...args); return { success: true, results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    async raw() { const s = db.prepare(sql); s.setReturnArrays?.(true); return s.all(...args).map((r) => (Array.isArray(r) ? r : Object.values(r))); },
  });
  return {
    sqlite: db,
    prepare: (sql) => stmt(sql),
    async exec(sql) { db.exec(sql); return { count: 1 }; },
    async batch(list) {
      db.exec("begin");
      try {
        const out = [];
        for (const s of list) {
          const p = db.prepare(s.sql);
          if (p.columns().length) out.push({ results: p.all(...s.args), success: true, meta: {} });
          else { const r = p.run(...s.args); out.push({ results: [], success: true, meta: { changes: Number(r.changes) } }); }
        }
        db.exec("commit");
        return out;
      } catch (e) { db.exec("rollback"); throw e; }
    },
  };
}
