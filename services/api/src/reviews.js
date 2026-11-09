// Store reviews collector (founder request 2026-11-09, page promovote.com/admin/yorumlar). Runs from the "0 * * * *"
// job, one app per run, each app about every 6 hours, so one run stays far under the Workers subrequest limit.
// Apple: the public customer reviews RSS feed (newest 50 per country, no key). Google: the monthly reviews CSV in the
// Play reports bucket (same service account as the store stats). Reviewer names and devices are never stored.
import { APPS, googleToken } from "./stats.js";

const APPLE_COUNTRIES = ["us", "tr", "gb", "ca", "au", "de", "fr", "mx", "br", "es", "it", "nl"];
const EVERY = 6 * 3600e3;

// Real CSV: quoted fields with commas, double quotes and new lines (review text has all of them).
export function parseCsvFull(text) {
  const rows = []; let row = []; let f = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(f); f = ""; if (row.some((x) => x !== "")) rows.push(row); row = [];
    } else f += c;
  }
  row.push(f); if (row.some((x) => x !== "")) rows.push(row);
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}
const decode = (buf) => {
  const u8 = new Uint8Array(buf);
  return u8[0] === 0xff && u8[1] === 0xfe ? new TextDecoder("utf-16le").decode(u8.subarray(2)) : new TextDecoder().decode(u8).replace(/^﻿/, "");
};
const clip = (s, n) => (s ? String(s).slice(0, n) : null);

async function appleReviews(app) {
  const out = [];
  for (const cc of APPLE_COUNTRIES) {
    const r = await fetch(`https://itunes.apple.com/${cc}/rss/customerreviews/id=${app.apple}/sortby=mostrecent/json`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) continue;
    const j = await r.json().catch(() => null);
    let e = j?.feed?.entry; if (!e) continue; if (!Array.isArray(e)) e = [e];
    for (const x of e) {
      const rating = Number(x?.["im:rating"]?.label);
      const id = x?.id?.label;
      if (!id || !(rating >= 1 && rating <= 5)) continue; // skips the app info entry some feeds start with
      out.push({ store: "app_store", id: String(id), country: cc, rating, title: clip(x?.title?.label, 200), body: clip(x?.content?.label, 4000),
        version: clip(x?.["im:version"]?.label, 40), at: new Date(x?.updated?.label || Date.now()).toISOString(), reply: null });
    }
  }
  return out;
}

async function googleReviews(env, app, token) {
  const out = [];
  const now = new Date();
  const months = [0, 1].map((k) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1)); return d.toISOString().slice(0, 7).replace("-", ""); });
  for (const ym of months) {
    const name = `reviews/reviews_${app.play}_${ym}.csv`;
    const r = await fetch(`https://storage.googleapis.com/storage/v1/b/${env.PLAY_REPORTS_BUCKET}/o/${encodeURIComponent(name)}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 404) continue;
    if (!r.ok) throw new Error(`reviews ${r.status}`);
    for (const x of parseCsvFull(decode(await r.arrayBuffer()))) {
      const rating = Number(x["star rating"]);
      if (!(rating >= 1 && rating <= 5)) continue;
      const ms = Number(x["review last update millis since epoch"] || x["review submit millis since epoch"]);
      const link = x["review link"] || "";
      const id = (link.match(/reviewid=([^&]+)/i) || [])[1] || `${x["review submit millis since epoch"]}-${x["app version code"]}-${rating}`;
      out.push({ store: "google_play", id: decodeURIComponent(id), country: clip(x["reviewer language"], 10), rating, title: clip(x["review title"], 200),
        body: clip(x["review text"], 4000), version: clip(x["app version name"] || x["app version code"], 40),
        at: new Date(ms > 0 ? ms : Date.now()).toISOString(), reply: clip(x["developer reply text"], 4000) });
    }
  }
  return out;
}

export async function collectReviews(env) {
  const db = env.DB;
  const { results } = await db.prepare("select name, ran_at from job_runs where name like 'reviews_%' or name = 'store_stats'").all();
  const ran = Object.fromEntries((results || []).map((r) => [r.name, new Date(r.ran_at).getTime()]));
  // The store stats job used most of this run's request budget: wait for the next hour.
  if (ran.store_stats && Date.now() - ran.store_stats < 15 * 60e3) return;
  const app = APPS.map((a) => ({ a, t: ran["reviews_" + a.product] || 0 })).sort((x, y) => x.t - y.t)[0];
  if (!app || Date.now() - app.t < EVERY) return;
  const a = app.a;
  const notes = [];
  let rows = [];
  try { rows = rows.concat(await appleReviews(a)); } catch (e) { notes.push("apple: " + e.message); }
  if (env.GOOGLE_PLAY_SA_JSON && env.PLAY_REPORTS_BUCKET) {
    try { rows = rows.concat(await googleReviews(env, a, await googleToken(env))); } catch (e) { notes.push("google: " + e.message); }
  } else notes.push("google: missing_key");
  const now = new Date().toISOString();
  const stmts = rows.map((r) => db.prepare(
    "insert into store_reviews (store, review_id, product_id, country, rating, title, body, version, reviewed_at, reply, collected_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
    "on conflict (store, review_id) do update set rating = excluded.rating, title = excluded.title, body = excluded.body, version = excluded.version, reviewed_at = excluded.reviewed_at, reply = excluded.reply, collected_at = excluded.collected_at",
  ).bind(r.store, r.id, a.product, r.country, r.rating, r.title, r.body, r.version, r.at, r.reply, now));
  stmts.push(db.prepare("insert into job_runs (name, ran_at) values (?, ?) on conflict (name) do update set ran_at = excluded.ran_at").bind("reviews_" + a.product, now));
  stmts.push(db.prepare("insert into job_runs (name, ran_at) values (?, ?) on conflict (name) do update set ran_at = excluded.ran_at").bind("reviews_note_" + a.product, notes.join(" | ").slice(0, 300) || `ok ${rows.length}`));
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
  if (notes.length) console.error("store_reviews", a.product, notes.join(" | "));
}
