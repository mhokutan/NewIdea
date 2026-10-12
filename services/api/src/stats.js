// Store stats collector for all founder apps (docs/09-metrics-hub.md). Runs from the hourly "0 * * * *" job at most
// every 12 hours and writes daily rows to metrics_daily. Only totals, no personal data.
// Apple: Sales and Trends daily SUMMARY report (App Store Connect API key with Sales and Reports, secrets ASC_STATS_*).
// Google: monthly overview CSVs in the Play reports bucket (service account GOOGLE_PLAY_SA_JSON, bucket PLAY_REPORTS_BUCKET).

const APPS = [
  { product: "promovote", apple: "6819894584", play: "com.miapera.promovote" },
  { product: "poleris", apple: "6792844860", play: "com.miapera.poleris" },
  { product: "haulingempire", apple: "6815224121", play: "com.mhokutan.haulingempire" },
];
const ASC_VENDOR = "94642380"; // Sales report vendor number (not a secret)

const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlJson = (o) => b64url(enc.encode(JSON.stringify(o)));
function pemToDer(pem) {
  const bin = atob(String(pem).replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
const day = (offset) => new Date(Date.now() - offset * 864e5).toISOString().slice(0, 10);

async function appleToken(env) {
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(env.ASC_STATS_KEY_P8), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const head = b64urlJson({ alg: "ES256", kid: env.ASC_STATS_KEY_ID, typ: "JWT" });
  const body = b64urlJson({ iss: env.ASC_STATS_ISSUER_ID, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" });
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

async function googleToken(env) {
  const sa = JSON.parse(env.GOOGLE_PLAY_SA_JSON);
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const head = b64urlJson({ alg: "RS256", typ: "JWT" });
  const body = b64urlJson({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/devstorage.read_only", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(`${head}.${body}`));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${body}.${b64url(sig)}` }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error("google token " + r.status);
  return j.access_token;
}

// Apple daily sales summary: first downloads, redownloads, updates and in-app units per app.
const T_DOWNLOAD = new Set(["1", "1F", "1T", "F1", "1E", "1EP", "1EU"]);
const T_REDOWNLOAD = new Set(["3", "3F", "3T", "F3"]);
const T_UPDATE = new Set(["7", "7F", "7T", "F7"]);
const T_IAP = new Set(["IA1", "IA9", "IAY", "IAC", "FI1", "IA1-M", "IA9-M", "IAY-M", "IAC-M"]);

async function appleDay(token, date) {
  const q = new URLSearchParams({
    "filter[frequency]": "DAILY", "filter[reportType]": "SALES", "filter[reportSubType]": "SUMMARY",
    "filter[vendorNumber]": ASC_VENDOR, "filter[reportDate]": date, "filter[version]": "1_1",
  });
  const r = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${q}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/a-gzip" } });
  if (r.status === 404) return null; // no report (no activity yet, or not published yet)
  if (!r.ok) throw new Error(`apple ${date} ${r.status}`);
  const text = await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const head = lines.shift().split("\t");
  const col = (n) => head.indexOf(n);
  const [cType, cUnits, cId, cSku, cParent] = ["Product Type Identifier", "Units", "Apple Identifier", "SKU", "Parent Identifier"].map(col);
  const rows = lines.map((l) => l.split("\t"));
  const skuToProduct = {};
  for (const row of rows) { const app = APPS.find((a) => a.apple === row[cId]); if (app) skuToProduct[row[cSku]] = app.product; }
  const out = {};
  for (const app of APPS) out[app.product] = { downloads: 0, redownloads: 0, updates: 0, iap_units: 0 };
  for (const row of rows) {
    const type = row[cType], units = Number(row[cUnits]) || 0;
    const app = APPS.find((a) => a.apple === row[cId]);
    if (app) {
      if (T_DOWNLOAD.has(type)) out[app.product].downloads += units;
      else if (T_REDOWNLOAD.has(type)) out[app.product].redownloads += units;
      else if (T_UPDATE.has(type)) out[app.product].updates += units;
    } else if (T_IAP.has(type) && skuToProduct[row[cParent]]) {
      out[skuToProduct[row[cParent]]].iap_units += units;
    }
  }
  return out;
}

// Play overview CSVs are UTF-16 with a header row; one file per app per month.
function parseCsv(buf) {
  const u8 = new Uint8Array(buf);
  const text = u8[0] === 0xff && u8[1] === 0xfe ? new TextDecoder("utf-16le").decode(u8.subarray(2)) : new TextDecoder().decode(u8);
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(",").map((h) => h.replace(/"/g, "").trim().toLowerCase());
  return lines.map((l) => { const v = l.split(",").map((x) => x.replace(/"/g, "").trim()); return Object.fromEntries(head.map((h, i) => [h, v[i]])); });
}

async function playFile(token, bucket, name) {
  const r = await fetch(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`play ${name.split("/")[1]} ${r.status}`);
  return parseCsv(await r.arrayBuffer());
}

const num = (v) => (v === undefined || v === "" || v === null || isNaN(Number(v)) ? null : Number(v));

export async function collectStoreStats(env) {
  const db = env.DB;
  const last = await db.prepare("select ran_at from job_runs where name = 'store_stats'").first();
  if (last && Date.now() - new Date(last.ran_at).getTime() < 12 * 3600e3) return;
  const rows = []; // [product, source, date, metric, value]
  const notes = [];

  if (env.ASC_STATS_KEY_P8 && env.ASC_STATS_KEY_ID && env.ASC_STATS_ISSUER_ID) {
    try {
      const token = await appleToken(env);
      for (let i = 1; i <= 7; i++) {
        const date = day(i);
        const res = await appleDay(token, date);
        if (!res) { if (i >= 3) for (const a of APPS) rows.push([a.product, "app_store", date, "downloads", 0]); continue; }
        for (const [product, m] of Object.entries(res)) for (const [k, v] of Object.entries(m)) rows.push([product, "app_store", date, k, v]);
      }
    } catch (e) { notes.push("apple: " + e.message); }
  } else notes.push("apple: missing_key");

  if (env.GOOGLE_PLAY_SA_JSON && env.PLAY_REPORTS_BUCKET) {
    try {
      const token = await googleToken(env);
      const months = [day(0).slice(0, 7).replace("-", "")];
      if (Number(day(0).slice(8, 10)) <= 4) months.push(day(6).slice(0, 7).replace("-", ""));
      for (const app of APPS) for (const ym of months) {
        const inst = await playFile(token, env.PLAY_REPORTS_BUCKET, `stats/installs/installs_${app.play}_${ym}_overview.csv`);
        for (const r of inst || []) {
          const d = r["date"]; if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) continue;
          const add = (metric, v) => { if (num(v) !== null) rows.push([app.product, "google_play", d, metric, num(v)]); };
          add("installs", r["daily user installs"] ?? r["daily device installs"]);
          add("uninstalls", r["daily user uninstalls"] ?? r["daily device uninstalls"]);
          add("updates", r["daily device upgrades"]);
          add("active_devices", r["active device installs"]);
        }
        const rat = await playFile(token, env.PLAY_REPORTS_BUCKET, `stats/ratings/ratings_${app.play}_${ym}_overview.csv`);
        for (const r of rat || []) {
          const d = r["date"]; if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) continue;
          if (num(r["total average rating"]) !== null && num(r["total average rating"]) > 0) rows.push([app.product, "google_play", d, "rating_avg", num(r["total average rating"])]);
        }
        const cr = await playFile(token, env.PLAY_REPORTS_BUCKET, `stats/crashes/crashes_${app.play}_${ym}_overview.csv`);
        for (const r of cr || []) {
          const d = r["date"]; if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) continue;
          if (num(r["daily crashes"]) !== null) rows.push([app.product, "google_play", d, "crashes", num(r["daily crashes"])]);
          if (num(r["daily anrs"]) !== null) rows.push([app.product, "google_play", d, "anrs", num(r["daily anrs"])]);
        }
      }
    } catch (e) { notes.push("google: " + e.message); }
  } else notes.push("google: missing_key");

  const now = new Date().toISOString();
  const stmts = rows.map(([p, s, d, m, v]) => db.prepare(
    "insert into metrics_daily (product_id, source, date, metric, value, updated_at) values (?, ?, ?, ?, ?, ?) on conflict (product_id, source, date, metric) do update set value = excluded.value, updated_at = excluded.updated_at",
  ).bind(p, s, d, m, v, now));
  stmts.push(db.prepare("insert into job_runs (name, ran_at) values ('store_stats', ?) on conflict (name) do update set ran_at = excluded.ran_at").bind(now));
  stmts.push(db.prepare("insert into job_runs (name, ran_at) values ('store_stats_note', ?) on conflict (name) do update set ran_at = excluded.ran_at").bind(notes.join(" | ").slice(0, 300) || "ok"));
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
  if (notes.length) console.error("store_stats", notes.join(" | "));
}
