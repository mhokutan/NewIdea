// Office page (promovote.com/admin/office). Version 3 (founder 2026-11-13): an isometric open plan office seen from
// above at an angle, no roof. White outer walls with windows, light wood floor, glass rooms per department (half
// height glass with thin dark frames) and corridors with floor stripes, a lounge corner, shelves, plants and a
// "Mevlüt HQ" sign. Every Claude session is a small CC0 character at a desk with a name bubble. Mail rows from
// office_mail (last 10 minutes) play as a walk with an envelope from one desk to another.
// Data: /admin/office.json (same admin login). Models: public/office/models (credits in web/landing/CREDITS.md).
// If WebGL or the models fail, the page keeps the plain list the server rendered.
// Every text from the data goes in through textContent or a canvas, never HTML.
import * as THREE from "/vendor/three-0.160.0.module.min.js";
import { GLTFLoader } from "/vendor/three-0.160.0-GLTFLoader.js";
import { clone as cloneSkinned } from "/vendor/three-0.160.0-SkeletonUtils.js";
import { OrbitControls } from "/vendor/three-0.160.0-OrbitControls.js";

const STATUS = {
  working: { label: "Çalışıyor", css: "chip-g", dot: "#22c55e" },
  idle: { label: "Boşta", css: "chip-n", dot: "#9ca3af" },
  waiting_owner: { label: "Senden evet bekliyor", css: "chip-y", dot: "#facc15" },
  blocked: { label: "Takıldı", css: "chip-r", dot: "#ef4444" },
  offline: { label: "Kapalı", css: "chip-n", dot: "#d4d4d8" },
};
const st = (s) => STATUS[s] || STATUS.idle;

// Departments (founder 2026-11-13, 52 person team): an agent's department comes from its id PREFIX, so new rows need
// no code change. Rooms are made from the member count (one spare desk, at most 9 desks) and packed in rows; each row
// has a corridor in front of it and every door opens onto that corridor. The right column holds the CEO room, the
// lounge and shelves; a vertical corridor joins all rows. World meters: x to the right, z toward the viewer.
const WALL_H = 2.7, GLASS_H = 1.15;
const DEPTS = [
  { key: "hauling", name: "HAULING EMPIRE", color: "#f97316", match: (id) => /^hauling-/.test(id) || id === "empire-desktop" },
  { key: "dropolis", name: "DROPOLIS", color: "#3b82f6", match: (id) => /^dropolis-/.test(id) || id === "robo-works" },
  { key: "dovelet", name: "DOVELET", color: "#ec4899", match: (id) => /^dovelet-/.test(id) },
  { key: "promovote", name: "PROMOVOTE", color: "#8b5cf6", match: (id) => /^promovote-/.test(id) },
  { key: "salesforce", name: "SALESFORCE", color: "#14b8c4", match: (id) => /^salesforce-/.test(id) },
  { key: "store", name: "MAĞAZA VE BÜYÜME", color: "#f59e0b", match: (id) => /^store-/.test(id) },
  { key: "social", name: "SOSYAL MEDYA", color: "#e11d74", match: (id) => /^social-/.test(id) },
  { key: "panel", name: "TEST PANELİ", color: "#6366f1", match: (id) => /^panel-/.test(id) },
  { key: "ortak", name: "ORTAK BİRİMLER", color: "#22c55e", match: (id) => /^ortak-/.test(id) || id === "analyst" || id === "mac-mini-test" },
  { key: "dopazon", name: "DOPAZON", color: "#f05a4f", match: (id) => /^dopazon-/.test(id) },
  { key: "diger", name: "DİĞER", color: "#64748b", match: () => true },
];
const CEO_DEPT = { key: "ceo", name: "GENEL MÜDÜR", color: "#facc15" };
const deptOf = (id) => (id === "ceo" ? "ceo" : DEPTS.find((d) => d.match(id)).key);
// Role text holds the model in brackets, for example "QA (Haiku)" (founder 2026-11-13).
const MODEL_RE = /\s*\((Opus|Sonnet|Haiku)\)\s*$/i;
const modelOf = (role) => (String(role || "").match(MODEL_RE)?.[1] || "").replace(/^./, (c) => c.toUpperCase());
const shortName = (role) => String(role || "").replace(MODEL_RE, "");
// Inside its own room a bubble drops the project word (founder 2026-11-13): "Hauling Lider Geliştirici" in the
// HAULING EMPIRE room reads "Lider Geliştirici". The side panel and the list keep the full role.
const ROOM_WORD = { hauling: "hauling", dropolis: "dropolis", dovelet: "dovelet", promovote: "promovote", dopazon: "dopazon", salesforce: "salesforce" };
function bubbleName(role, deptKey) {
  const name = shortName(role), word = ROOM_WORD[deptKey];
  if (!word) return name;
  const m = name.match(/^(\S+)\s+(.+)$/);
  return m && m[1].toLocaleLowerCase("tr") === word ? m[2] : name;
}

let W = 40, D = 30, ROOMS = [], CROSS_X = 30, RIGHT_X = 31, layoutKey = "";
const ROW_W = 44; // width of the room area before the vertical corridor (4 big rooms per row)
function layout() {
  const count = {};
  for (const a of agents) { const k = deptOf(a.id); count[k] = (count[k] || 0) + 1; }
  const rooms = [];
  for (const d of DEPTS) {
    const n = count[d.key] || 0;
    if (d.key === "diger" && !n) continue; // DİĞER opens when an unknown id arrives
    const desks = Math.min(9, Math.max(2, n + (n < 9 ? 1 : 0)));
    const cols = desks <= 2 ? 2 : desks === 4 ? 2 : 3;
    const rowsN = Math.ceil(desks / cols);
    rooms.push({ ...d, desks, cols, w: cols * 2.4 + 1.6, d: rowsN * 2.6 + 0.6, door: "s" });
  }
  rooms.push({ key: "bos", name: "BOŞ ODA", color: "#a8a29e", desks: 2, cols: 2, w: 6.4, d: 5.8, door: "s", spare: true });
  // Pack into rows.
  const rows = [];
  let cur = [], x = 1;
  for (const r of rooms) {
    if (cur.length && x + r.w > ROW_W) { rows.push(cur); cur = []; x = 1; }
    r.x = x; x += r.w + 1.4; cur.push(r);
  }
  if (cur.length) rows.push(cur);
  let z = 1;
  const corridorsZ = [];
  for (const row of rows) {
    const rd = Math.max(...row.map((r) => r.d));
    for (const r of row) { r.z = z; r.d = rd; }
    z += rd;
    corridorsZ.push(z);
    z += 2;
  }
  CROSS_X = Math.max(...rooms.map((r) => r.x + r.w)) + 0.9;
  RIGHT_X = CROSS_X + 0.9;
  const ceo = { ...CEO_DEPT, ceo: true, desks: 1, cols: 1, x: RIGHT_X, z: 1, w: 7.5, d: rows[0] ? Math.max(...rows[0].map((r) => r.d)) : 7, door: "s" };
  rooms.push(ceo);
  W = RIGHT_X + ceo.w + 1;
  D = Math.max(z, 1 + ceo.d + 2 + 11) + 0.5;
  ROOMS = rooms;
  return { rows, corridorsZ };
}
let plan = { rows: [], corridorsZ: [] };

const ny = (iso) => {
  const d = new Date(iso || "");
  if (isNaN(d)) return "-";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d) + " (New York)";
};
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const k of kids) if (k !== null && k !== undefined) n.append(k);
  return n;
};
const waitingCount = (list) => list.filter((a) => a.status === "waiting_owner" || a.needs_owner).length;
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

let agents = [], mail = [];
try {
  const j = JSON.parse(document.getElementById("of-data").textContent || "{}");
  agents = Array.isArray(j) ? j : j.agents || [];
  mail = Array.isArray(j.mail) ? j.mail : [];
} catch { agents = []; }
let selected = null; // agent id

// ---------- desk plan: which agent sits where ----------
function deskSlots(r) {
  const cols = r.cols || 1;
  const rows = Math.ceil(r.desks / cols);
  const out = [];
  for (let i = 0; i < r.desks; i++) {
    const c = i % cols, row = Math.floor(i / cols);
    const x = r.ceo ? r.x + r.w - 1.9 : r.x + 2.0 + c * 2.4;
    const z = r.door === "s" ? r.z + 1.7 + row * 2.6 : r.z + r.d - 1.9 - (rows - 1 - row) * 2.6;
    out.push({ room: r, x, z, agent: null });
  }
  return out;
}
let slots = [];
function makePlan() {
  plan = layout();
  layoutKey = ROOMS.map((r) => r.key + r.desks).join(",");
  slots = ROOMS.flatMap(deskSlots);
  const free = (key) => slots.find((s) => s.room.key === key && !s.agent);
  for (const a of agents) {
    // A tenth member of a full room sits in DİĞER, then in the empty room.
    const s = free(deptOf(a.id)) || free("diger") || free("bos");
    if (s) s.agent = a;
  }
}
const slotOf = (id) => slots.find((s) => s.agent?.id === id) || null;
const roomLabel = (r) => (r.spare && slots.some((s) => s.room === r && s.agent) ? "DİĞER" : r.name);

// ---------- plain list and side panel (work with or without 3D) ----------
const listEl = document.getElementById("of-list");
const askEl = document.getElementById("of-ask");
const panel = document.getElementById("of-panel");
const pTitle = document.getElementById("of-p-title");
const pBody = document.getElementById("of-p-body");

function renderList() {
  askEl.replaceChildren("Senden beklenen: ", el("b", {}, String(waitingCount(agents))), " evet");
  if (!agents.length) return;
  listEl.replaceChildren(...agents.map((a) => {
    const s = st(a.status);
    return el("li", { class: "of-item" + (a.id === selected ? " sel" : ""), "data-id": a.id, tabindex: "0", role: "button", "aria-label": `${a.role}: ${s.label}` },
      el("div", { class: "st-head", style: "margin:0 0 6px" }, el("b", {}, shortName(a.role), modelOf(a.role) ? el("span", { class: "of-model" }, modelOf(a.role)) : null), el("span", { class: "chip " + s.css }, s.label)),
      a.last_action ? el("p", { style: "margin:0 0 6px" }, a.last_action) : null,
      a.needs_owner ? el("p", { class: "of-need" }, el("b", {}, "Senden beklenen:"), " " + a.needs_owner) : null,
      el("p", { class: "dim", style: "margin:0;font-size:13px" }, ny(a.updated_at)));
  }));
}
function openPanel(id) {
  const a = agents.find((x) => x.id === id);
  if (!a || !panel) return;
  selected = id;
  const s = slotOf(id);
  pTitle.replaceChildren(shortName(a.role), modelOf(a.role) ? el("span", { class: "of-model" }, modelOf(a.role)) : "");
  const row = (k, v) => [el("dt", {}, k), el("dd", {}, v || "-")];
  pBody.replaceChildren(...row("Birim", s ? roomLabel(s.room) : "-"), ...row("Durum", st(a.status).label), ...row("Son iş", a.last_action),
    ...row("Senden beklenen", a.needs_owner), ...row("Güncelleme", ny(a.updated_at)));
  panel.classList.add("on");
  renderList();
  syncBubbles();
}
function closePanel() { selected = null; panel?.classList.remove("on"); renderList(); syncBubbles(); }
document.getElementById("of-close")?.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });
listEl.addEventListener("click", (e) => { const li = e.target.closest?.("[data-id]"); if (li) openPanel(li.getAttribute("data-id")); });
listEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const li = e.target.closest?.("[data-id]");
  if (li) { e.preventDefault(); openPanel(li.getAttribute("data-id")); }
});

// ---------- note to the CEO (the page's only write) ----------
const noteForm = document.getElementById("of-note");
const noteMsg = document.getElementById("of-note-msg");
noteForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ta = noteForm.querySelector("textarea"), btn = noteForm.querySelector("button");
  const text = ta.value.trim();
  if (!text) return;
  if (text.length > 1000) { noteMsg.textContent = "Not en fazla 1000 karakter olabilir."; return; }
  btn.disabled = true;
  noteMsg.textContent = "Gönderiliyor...";
  try {
    const r = await fetch("/admin/office/note", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (r.ok) { ta.value = ""; noteMsg.textContent = "Not CEO'ya bırakıldı."; } else noteMsg.textContent = "Not gönderilemedi. Biraz sonra tekrar dene.";
  } catch { noteMsg.textContent = "Not gönderilemedi. Bağlantını kontrol et."; }
  btn.disabled = false;
});

// ---------- 3D office ----------
const stage = document.getElementById("of-stage");
const tagsEl = document.getElementById("of-tags");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let renderer = null;
try {
  const probe = document.createElement("canvas");
  if (probe.getContext("webgl2") || probe.getContext("webgl")) renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
} catch { renderer = null; }

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
let controls = null;
const clock = new THREE.Clock();
const M = {};
const MODEL_FILES = ["table", "chaircushioned", "computer", "houseplant_1", "houseplant_3", "houseplant_6", "bookshelf", "bookcasebooks", "shelf_large", "drawer_1",
  "table_roundlarge", "chair_1", "light_desk", "trashcan_small1", "light_floor1", "couch_medium1",
  "mini_male_a", "mini_male_b", "mini_male_c", "mini_female_a", "mini_female_b", "mini_female_c"];
const PEOPLE = ["mini_male_a", "mini_female_a", "mini_male_b", "mini_female_b", "mini_male_c", "mini_female_c"];

function fit(obj, { h, w }) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const k = h ? h / (size.y || 1) : w / (Math.max(size.x, size.z) || 1);
  obj.scale.multiplyScalar(k);
  const b2 = new THREE.Box3().setFromObject(obj);
  const c = b2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
  const wrap = new THREE.Group();
  wrap.add(obj);
  return wrap;
}
function prop(parent, name, size, x, z, rotY = 0, y = 0) {
  const src = M[name];
  if (!src) return null;
  const o = fit(src.scene.clone(true), size);
  o.position.set(x, y, z);
  o.rotation.y = rotY;
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  parent.add(o);
  return o;
}
const box = (parent, w, h, d, color, x, y, z, opts = {}) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.mat || new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85 }));
  m.position.set(x, y, z);
  m.castShadow = opts.shadow ?? true; m.receiveShadow = true;
  parent.add(m);
  return m;
};
const flat = (parent, w, d, color, x, z, y = 0.01, opts = {}) => {
  const m = new THREE.Mesh(opts.circle ? new THREE.CircleGeometry(w / 2, 40) : new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: opts.opacity !== undefined, opacity: opts.opacity ?? 1 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true;
  parent.add(m);
  return m;
};

function woodTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const ctx = c.getContext("2d");
  const tones = ["#d9a45f", "#d39b55", "#dfad6b", "#cf9650", "#dca866"]; // honey oak
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = tones[i % tones.length];
    ctx.fillRect(0, i * 64, 512, 64);
    ctx.fillStyle = "rgba(255,236,200,.35)"; // light plank lines
    ctx.fillRect(0, i * 64, 512, 2);
    const off = (i * 137) % 512;
    ctx.fillRect(off, i * 64, 2, 64);
    ctx.fillRect((off + 256) % 512, i * 64, 2, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Outer walls: white, with windows, only on the back (z = 0) and the left (x = 0), so the camera sees in.
function outerWalls(g) {
  const white = new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.95 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfe1f2, roughness: 0.15, metalness: 0.1, emissive: 0x9fd0ea, emissiveIntensity: 0.25 });
  const frame = new THREE.MeshStandardMaterial({ color: 0xe5e3dc, roughness: 0.8 });
  box(g, W + 0.25, WALL_H, 0.25, 0, W / 2 - 0.125, WALL_H / 2, -0.125, { mat: white });
  box(g, 0.25, WALL_H, D, 0, -0.125, WALL_H / 2, D / 2, { mat: white });
  box(g, W + 0.25, 0.12, 0.3, 0, W / 2 - 0.125, 0.06, -0.15, { mat: frame, shadow: false }); // skirting
  const win = (x, z, alongX) => {
    const ww = 2.2, wh = 1.3, y = 1.55;
    if (alongX) { box(g, ww, wh, 0.04, 0, x, y, 0.02, { mat: glass, shadow: false }); box(g, ww + 0.12, 0.08, 0.08, 0, x, y - wh / 2, 0.04, { mat: frame }); box(g, 0.06, wh, 0.06, 0, x, y, 0.05, { mat: frame }); }
    else { box(g, 0.04, wh, ww, 0, 0.02, y, z, { mat: glass, shadow: false }); box(g, 0.08, 0.08, ww + 0.12, 0, 0.04, y - wh / 2, z, { mat: frame }); box(g, 0.06, wh, 0.06, 0, 0.05, y, z, { mat: frame }); }
  };
  for (let x = 4; x < W - 2; x += 6.5) win(x, 0, true);
  for (let z = 4.5; z < D - 2; z += 8) win(0, z, false);
  // Wall sign over the CEO room and lounge.
  const sign = canvasTex(1024, 256, (ctx) => {
    ctx.fillStyle = "#18181b"; ctx.beginPath(); ctx.roundRect(8, 8, 1008, 240, 40); ctx.fill();
    ctx.fillStyle = "#ffd60a"; ctx.beginPath(); ctx.arc(130, 128, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "800 120px system-ui, sans-serif"; ctx.textBaseline = "middle"; ctx.fillText("Mevlüt HQ", 210, 134);
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshBasicMaterial({ map: sign, transparent: true }));
  board.position.set(RIGHT_X + 3.75, 1.95, 0.03);
  g.add(board);
}

// Corridors: a lighter band with two thin white stripes on the wood.
function corridors(g) {
  const band = 0xe7ddcc, line = 0xffffff;
  const hz = (z0, z1, x0 = 0, x1 = W) => { const zc = (z0 + z1) / 2, w = x1 - x0, xc = (x0 + x1) / 2; flat(g, w, z1 - z0 - 0.3, band, xc, zc, 0.006); flat(g, w, 0.07, line, xc, z0 + 0.25, 0.008); flat(g, w, 0.07, line, xc, z1 - 0.25, 0.008); };
  const vt = (x0, x1, z0, z1) => { const xc = (x0 + x1) / 2, d = z1 - z0, zc = (z0 + z1) / 2; flat(g, x1 - x0 - 0.3, d, band, xc, zc, 0.005); flat(g, 0.07, d, line, x0 + 0.25, zc, 0.007); flat(g, 0.07, d, line, x1 - 0.25, zc, 0.007); };
  for (const z of plan.corridorsZ) hz(z, z + 2);
  const last = plan.corridorsZ.at(-1) ?? 8;
  vt(CROSS_X - 0.75, CROSS_X + 0.75, 1, last);
}

// Glass room: thin dark frame, clear half height glass, a door gap, a colored rug under the desks.
const glassMat = new THREE.MeshStandardMaterial({ color: 0xe3f2fc, emissive: 0xcfe8f8, emissiveIntensity: 0.25, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false });
const frameMat = new THREE.MeshStandardMaterial({ color: 0xf1f3f5, roughness: 0.5 }); // white frame posts and rails
function glassWall(g, x1, z1, x2, z2, door) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const alongX = Math.abs(z2 - z1) < 1e-6;
  const parts = door ? [[0, door[0]], [door[1], len]] : [[0, len]];
  for (const [a, b] of parts) {
    if (b - a < 0.05) continue;
    const mid = (a + b) / 2, L = b - a;
    const px = alongX ? x1 + mid : x1, pz = alongX ? z1 : z1 + mid;
    const pane = new THREE.Mesh(alongX ? new THREE.BoxGeometry(L, GLASS_H, 0.03) : new THREE.BoxGeometry(0.03, GLASS_H, L), glassMat);
    pane.position.set(px, GLASS_H / 2, pz); pane.renderOrder = 2;
    g.add(pane);
    // Top rail and bottom rail.
    box(g, alongX ? L : 0.045, 0.04, alongX ? 0.045 : L, 0, px, GLASS_H, pz, { mat: frameMat, shadow: false });
    box(g, alongX ? L : 0.04, 0.04, alongX ? 0.04 : L, 0, px, 0.02, pz, { mat: frameMat, shadow: false });
    // White posts at the corners, at the door and between every glass panel (about 1.2 m wide).
    const n = Math.max(1, Math.round(L / 1.2));
    for (let i = 0; i <= n; i++) {
      const t = a + (L * i) / n;
      box(g, 0.05, GLASS_H, 0.05, 0, alongX ? x1 + t : x1, GLASS_H / 2, alongX ? z1 : z1 + t, { mat: frameMat, shadow: false });
    }
  }
}
const doorX = (r) => r.x + 1.1;
function buildRoom(g, r) {
  const filled = slots.filter((s) => s.room === r);
  const used = filled.some((s) => s.agent);
  // Rug under the desks in the department color.
  if (filled.length) {
    const xs = filled.map((s) => s.x), zs = filled.map((s) => s.z);
    const minX = Math.min(...xs) - 1.15, maxX = Math.max(...xs) + 1.15, minZ = Math.min(...zs) - 1.35, maxZ = Math.max(...zs) + 0.9;
    flat(g, maxX - minX, maxZ - minZ, new THREE.Color(r.color).lerp(new THREE.Color(0xffffff), r.spare && !used ? 0.75 : 0.45), (minX + maxX) / 2, (minZ + maxZ) / 2, 0.015);
  }
  const front = r.z + r.d, back = r.z;
  const dg = [doorX(r) - r.x - 0.6, doorX(r) - r.x + 0.6];
  glassWall(g, r.x, back, r.x + r.w, back, r.door === "n" ? dg : null);
  glassWall(g, r.x, front, r.x + r.w, front, r.door === "s" ? dg : null);
  glassWall(g, r.x, back, r.x, front, null);
  glassWall(g, r.x + r.w, back, r.x + r.w, front, null);
  // Desks.
  for (const s of filled) {
    prop(g, "table", { w: 1.5 }, s.x, s.z, 0);
    // The person sits on the viewer's side of the desk, back to the camera, facing the screen.
    prop(g, "computer", { h: 0.5 }, s.x, s.z - 0.1, Math.PI, 0.74);
    prop(g, "chaircushioned", { h: 0.95 }, s.x, s.z + 0.75, 0);
    if (hash(r.key + s.x) % 2) prop(g, "light_desk", { h: 0.38 }, s.x + 0.55, s.z - 0.1, 0, 0.74);
  }
  // Room furniture: a plant in a corner and a shelf or cabinet against the side glass.
  prop(g, ["houseplant_1", "houseplant_3", "houseplant_6"][hash(r.key) % 3], { h: 1.0 }, r.x + r.w - 0.55, r.door === "s" ? r.z + 0.55 : r.z + r.d - 0.55);
  if (r.ceo) {
    prop(g, "table_roundlarge", { w: 1.5 }, r.x + 2.0, r.z + 4.2);
    for (let k = 0; k < 3; k++) { const an = k * (Math.PI * 2 / 3) + 0.4; prop(g, "chair_1", { h: 0.9 }, r.x + 2.0 + Math.sin(an) * 1.05, r.z + 4.2 + Math.cos(an) * 1.05, an + Math.PI); }
    prop(g, "bookcasebooks", { h: 1.7 }, r.x + 1.0, r.z + 0.45, 0);
  } else {
    prop(g, hash(r.key) % 2 ? "drawer_1" : "shelf_large", { h: 0.9 }, r.x + 0.45, r.door === "s" ? r.z + 3.4 : r.z + 3.0, Math.PI / 2);
  }
}

function lounge(g) {
  // Open lounge under the CEO room in the right column: round rug, two sofas, coffee table, lamp, plants and shelves.
  const ceo = ROOMS.find((r) => r.ceo);
  const cx = RIGHT_X + 3.9, cz = ceo.z + ceo.d + 2 + 4.2;
  flat(g, 4.6, 4.6, 0xd9cfe8, cx, cz, 0.014, { circle: true });
  flat(g, 3.6, 3.6, 0xc6b9dd, cx, cz, 0.016, { circle: true });
  prop(g, "couch_medium1", { w: 2.4 }, cx, cz - 1.7, 0);
  prop(g, "couch_medium1", { w: 2.4 }, cx - 1.75, cz + 0.3, Math.PI / 2);
  prop(g, "table_roundlarge", { w: 1.15 }, cx, cz, 0);
  prop(g, "light_floor1", { h: 1.7 }, cx + 1.8, cz - 1.8);
  prop(g, "houseplant_6", { h: 1.3 }, cx + 2.2, cz + 2.0);
  prop(g, "houseplant_3", { h: 1.1 }, RIGHT_X + 0.4, cz - 2.6);
  prop(g, "bookshelf", { h: 1.9 }, W - 0.7, cz + 4.4, -Math.PI / 2);
  prop(g, "bookcasebooks", { h: 1.9 }, W - 0.7, cz + 6.8, -Math.PI / 2);
  prop(g, "houseplant_1", { h: 1.2 }, RIGHT_X + 0.5, Math.min(D - 0.8, cz + 9));
  prop(g, "trashcan_small1", { h: 0.4 }, RIGHT_X + 0.3, ceo.z + ceo.d + 0.3);
  for (const z of plan.corridorsZ) prop(g, "houseplant_6", { h: 1.2 }, 0.6, z + 1.0);
}

// ---------- people, bubbles and labels ----------
let people = []; // { agent, slot, actor, mixer, body, bubble }
let peopleGroup = null;
let deptTags = [];
function makeActor(name) {
  const src = M[name];
  if (!src) return null;
  const body = cloneSkinned(src.scene);
  body.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
  const actor = fit(body, { h: 1.35 });
  const mixer = new THREE.AnimationMixer(body);
  const play = (n, wgt = 1, ts = 1) => { const c = THREE.AnimationClip.findByName(src.animations, n); if (!c) return null; const ac = mixer.clipAction(c); ac.setEffectiveWeight(wgt); ac.timeScale = ts; ac.reset().play(); return ac; };
  return { actor, body, mixer, play };
}
const personName = (a) => PEOPLE[hash(a.id) % PEOPLE.length];

function buildPeople() {
  if (peopleGroup) { scene.remove(peopleGroup); }
  peopleGroup = new THREE.Group();
  scene.add(peopleGroup);
  for (const p of people) p.bubble.remove();
  people = [];
  for (const s of slots) {
    if (!s.agent) continue;
    const a = s.agent;
    const made = makeActor(personName(a));
    let rec = { agent: a, slot: s, actor: null, mixer: null };
    if (made) {
      const { actor, body, mixer, play } = made;
      if (a.status === "waiting_owner") {
        actor.position.set(s.x + 0.95, 0, s.z + 0.2);
        play("idle");
      } else {
        actor.position.set(s.x, 0.02, s.z + 0.72);
        actor.rotation.y = Math.PI;
        play("sit");
        if (a.status === "working") play("interact-right", 0.65, 1.7);
        if (a.status === "idle") body.rotation.x = -0.22;
        if (a.status === "blocked") play("interact-left", 0.25, 0.4);
      }
      if (a.status === "offline") {
        body.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.35; m.castShadow = false; } });
      }
      actor.userData.agentId = a.id;
      peopleGroup.add(actor);
      // Performance with 52 people (founder 2026-11-13): only working, waiting and blocked people keep a running
      // animation; idle and offline ones are posed once and then cost nothing per frame.
      const moving = !reduce && (a.status === "working" || a.status === "waiting_owner" || a.status === "blocked");
      mixer.update(0.5);
      rec = { ...rec, actor, mixer: moving ? mixer : null };
      if (a.status === "blocked") {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
        bulb.position.set(s.x - 0.55, 0.85, s.z); peopleGroup.add(bulb);
        const lamp = new THREE.PointLight(0xff3030, 3, 3, 1.6); lamp.position.set(s.x, 1.4, s.z); peopleGroup.add(lamp);
      }
    }
    // Hit box over the desk and chair, so a tap anywhere there opens the panel.
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 1.9), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(s.x, 0.7, s.z + 0.3); hit.userData.agentId = a.id;
    peopleGroup.add(hit);
    const ss = st(a.status);
    const quiet = a.status === "idle" || a.status === "offline";
    const bubble = el("div", { class: "of-name" + (a.status === "offline" ? " off" : "") + (quiet ? " quiet" : ""), style: `--c:${ss.dot}`, title: `${a.role}: ${ss.label}` },
      el("i"), el("span", {}, bubbleName(a.role, s.room.key)),
      a.status === "blocked" ? el("em", {}, "takıldı") : null,
      a.status === "waiting_owner" ? el("b", {}, "!") : null);
    bubble.addEventListener("click", () => openPanel(a.id));
    tagsEl.append(bubble);
    rec.bubble = bubble;
    rec.rank = quiet ? (a.status === "offline" ? 2 : 1) : 0;
    people.push(rec);
  }
  // Department labels: rebuilt with the people, because DİĞER and the empty rooms change names.
  for (const t of deptTags) t.el.remove();
  deptTags = ROOMS.map((r) => {
    const e = el("div", { class: "of-dept", style: `--c:${r.color}` }, el("i"), roomLabel(r));
    tagsEl.prepend(e);
    return { el: e, pos: new THREE.Vector3(r.x + 0.2, GLASS_H + 0.1, r.z + r.d) };
  });
  syncBubbles();
  tagsKey = "";
}
function syncBubbles() { for (const p of people) p.bubble.classList.toggle("sel", p.agent.id === selected); }

const tmp = new THREE.Vector3();
function project(v) {
  tmp.copy(v).project(camera);
  return [(tmp.x * 0.5 + 0.5) * stage.clientWidth, (-tmp.y * 0.5 + 0.5) * stage.clientHeight];
}
function place(elm, v) {
  const [x, y] = project(v);
  const w = stage.clientWidth, h = stage.clientHeight;
  const out = x < -60 || x > w + 60 || y < -40 || y > h + 40;
  elm.style.display = out ? "none" : "";
  elm.style.left = x.toFixed(1) + "px"; elm.style.top = y.toFixed(1) + "px";
}
// Labels and name bubbles never cover each other (founder 2026-11-13): each one takes the first free spot from a short
// list of screen offsets around its anchor. Department labels go first, then working, waiting and blocked people, then
// idle, then offline. A bubble with no free spot shrinks to its status dot, and only if even that has no room is it
// left out until the view changes (the person stays in the list). Runs only when the view changes, not every frame.
const GAP = 3;
const hits = (a, b) => a.l < b.r + GAP && b.l < a.r + GAP && a.t < b.b + GAP && b.t < a.b + GAP;
function sizeOf(elm) {
  const k = elm.classList.contains("mini") ? "m" : "f";
  if (!elm._size || elm._size.k !== k || elm._size.vw !== stage.clientWidth) elm._size = { k, vw: stage.clientWidth, w: elm.offsetWidth, h: elm.offsetHeight };
  return elm._size;
}
function trySpot(it, taken) {
  const { elm, x, y, kind } = it;
  const { w, h } = sizeOf(elm);
  const bang = kind === "name" && elm.querySelector("b") ? (stage.clientWidth < 600 ? 24 : 28) : 0;
  const rect = (dx, dy) => kind === "dept"
    ? { l: x + dx - w / 2, r: x + dx + w / 2, t: y + dy - h / 2, b: y + dy + h / 2 }
    : { l: x + dx - w / 2, r: x + dx + w / 2, t: y + dy - h - 5 - bang, b: y + dy };
  const sy = h + GAP + 2, sx = w / 2 + GAP + 2;
  const tries = kind === "dept"
    ? [[0, 0], [0, sy], [0, -sy], [sx, 0], [-sx, 0], [0, 2 * sy], [sx, sy], [-sx, sy], [0, -2 * sy]]
    : [[0, 0], [0, -sy], [sx, 0], [-sx, 0], [sx, -sy], [-sx, -sy], [0, -2 * sy], [0, sy], [sx, -2 * sy], [-sx, -2 * sy], [0, -3 * sy]];
  // Idle and offline names only take a spot right next to the person; otherwise they become a dot, so no name
  // floats far from its owner.
  if (kind === "name" && elm.classList.contains("quiet") && !elm.classList.contains("mini")) tries.splice(4);
  if (kind === "name" && elm.classList.contains("mini")) {
    // A status dot may move a little further: a ring of spots around the person.
    for (let k = 1, kMax = stage.clientWidth < 600 ? 3 : 7; k <= kMax; k++) for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2 - Math.PI / 2; tries.push([Math.cos(an) * k * (w + GAP + 1), Math.sin(an) * k * (h + GAP + 1)]); }
  }
  for (const [dx, dy] of tries) {
    const c = rect(dx, dy);
    if (!taken.some((o) => hits(c, o))) return { dx, dy, r: c };
  }
  return null;
}
function settle(items, taken) {
  for (const it of items) {
    const { elm } = it;
    elm.classList.remove("mini", "nospot");
    let spot = trySpot(it, taken);
    if (!spot && it.kind === "name") { elm.classList.add("mini"); spot = trySpot(it, taken); }
    if (!spot) { elm.classList.add("nospot"); elm.style.display = "none"; continue; }
    elm.style.display = "";
    taken.push(spot.r);
    elm.style.left = (it.x + spot.dx).toFixed(1) + "px";
    elm.style.top = (it.y + spot.dy).toFixed(1) + "px";
  }
}
let tagsKey = "";
const head = new THREE.Vector3();
function placeTags() {
  const W0 = stage.clientWidth, H0 = stage.clientHeight;
  const key = [W0, H0, camera.zoom, ...camera.position.toArray().map((v) => v.toFixed(3)), ...people.map((p) => (p.walking ? 1 : 0)), selected].join("|");
  if (key === tagsKey) return;
  tagsKey = key;
  const visible = ([x, y]) => x > -60 && x < W0 + 60 && y > -40 && y < H0 + 40;
  const depts = [], names = [];
  for (const t of deptTags) {
    const xy = project(t.pos);
    t.el.style.display = visible(xy) ? "" : "none";
    if (visible(xy)) depts.push({ elm: t.el, x: xy[0], y: xy[1], kind: "dept" });
  }
  for (const p of people) {
    if (p.walking) { p.bubble.style.display = "none"; continue; }
    const base = p.actor ? p.actor.position : new THREE.Vector3(p.slot.x, 0, p.slot.z + 0.72);
    head.set(base.x, p.agent.status === "waiting_owner" ? 1.6 : 1.45, base.z);
    const xy = project(head);
    p.bubble.style.display = visible(xy) ? "" : "none";
    if (visible(xy)) names.push({ elm: p.bubble, x: xy[0], y: xy[1], kind: "name", rank: p.agent.id === selected ? -1 : p.rank });
  }
  names.sort((a, b) => a.rank - b.rank || b.y - a.y);
  const taken = [];
  settle(depts, taken);
  settle(names, taken);
}

// ---------- mail: walk with an envelope from one desk to another ----------
const SHOWN_KEY = "office-mail-shown";
let shown = [];
try { shown = JSON.parse(localStorage.getItem(SHOWN_KEY) || "[]"); if (!Array.isArray(shown)) shown = []; } catch { shown = []; }
const remember = (id) => { shown.push(id); shown = shown.slice(-200); try { localStorage.setItem(SHOWN_KEY, JSON.stringify(shown)); } catch { /* private mode */ } };
const queue = [];
let current = null; // running mail animation
let pendingRebuild = false; // agents changed while a mail was walking
function enqueueMail(rows) {
  for (const m of rows) if (m && m.id && !shown.includes(m.id) && !queue.some((q) => q.id === m.id) && current?.id !== m.id) queue.push(m);
}
const corrZ = (r) => (r.door === "s" ? r.z + r.d + 1 : r.z - 1);
function routeTo(s) {
  // From the corridor in front of the room's door to the front of the desk.
  // The visitor drops the mail from the far side of the desk, so it walks around the other chairs.
  const r = s.room, dx = doorX(r), cz = corrZ(r), dz = r.door === "s" ? r.z + r.d : r.z, fz = s.z - 0.95;
  return [[dx, cz], [dx, dz], [dx, fz], [s.x, fz]];
}
function route(from, to) {
  // Stand up, step aside, walk round the desk, then out of the door.
  const out = [[from.x, from.z + 0.72], [from.x - 1.15, from.z + 0.72], [from.x - 1.15, from.z - 0.95]];
  const a = routeTo(from).reverse(); // far side of the desk ... corridor
  out.push(...a.slice(1));
  const za = corrZ(from.room), zb = corrZ(to.room);
  if (Math.abs(za - zb) > 0.01) out.push([CROSS_X, za], [CROSS_X, zb]);
  out.push(...routeTo(to));
  return out.map(([x, z]) => new THREE.Vector3(x, 0, z));
}
function envelopeSprite(label) {
  const tex = canvasTex(320, 220, (ctx) => {
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.roundRect(20, 14, 280, 150, 14); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, 22); ctx.lineTo(160, 104); ctx.lineTo(296, 22); ctx.stroke();
    ctx.fillStyle = "#18181b"; ctx.beginPath(); ctx.roundRect(4, 168, 312, 48, 14); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    let fs = 30; ctx.font = `700 ${fs}px system-ui, sans-serif`;
    const t = label.length > 30 ? label.slice(0, 29) + "…" : label;
    while (ctx.measureText(t).width > 290 && fs > 14) { fs -= 2; ctx.font = `700 ${fs}px system-ui, sans-serif`; }
    ctx.fillText(t, 160, 193);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(0.95, 0.65, 1);
  sp.renderOrder = 30;
  return sp;
}
function popAt(x, z, text) {
  const e = el("div", { class: "of-pop" }, text);
  tagsEl.append(e);
  place(e, new THREE.Vector3(x, 1.9, z));
  setTimeout(() => e.remove(), 2500);
}
function startNextMail() {
  if (current || !queue.length || !peopleGroup) return;
  const m = queue.shift();
  remember(m.id);
  const from = slotOf(m.from_id), to = slotOf(m.to_id);
  if (!from || !to || from === to) return startNextMail();
  const fromRec = people.find((p) => p.agent.id === m.from_id);
  const made = makeActor(personName(fromRec?.agent || { id: m.from_id }));
  if (!made) return startNextMail();
  const path = route(from, to);
  const segs = [];
  let len = 0;
  for (let i = 1; i < path.length; i++) { const l = path[i].distanceTo(path[i - 1]); segs.push(l); len += l; }
  // One way takes about 2.2 to 2.8 s, so the whole trip with the drop is about 5 to 6 s.
  const oneWay = Math.min(2.8, Math.max(2.2, len / 9));
  made.play("walk", 1, 1.6);
  made.actor.position.copy(path[0]);
  peopleGroup.add(made.actor);
  const env = envelopeSprite(String(m.label || ""));
  peopleGroup.add(env);
  if (fromRec?.actor) fromRec.actor.visible = false;
  if (fromRec) fromRec.walking = true;
  current = { id: m.id, path, segs, len, oneWay, t: 0, made, env, fromRec, to, dropped: false, label: String(m.label || "") };
}
function pointAt(c, d) {
  let rest = d;
  for (let i = 0; i < c.segs.length; i++) {
    if (rest <= c.segs[i] || i === c.segs.length - 1) {
      const k = c.segs[i] ? Math.min(1, rest / c.segs[i]) : 1;
      return { p: c.path[i].clone().lerp(c.path[i + 1], k), dir: c.path[i + 1].clone().sub(c.path[i]) };
    }
    rest -= c.segs[i];
  }
  return { p: c.path.at(-1).clone(), dir: new THREE.Vector3(0, 0, -1) };
}
function stepMail(dt) {
  if (!current) return;
  const c = current, pause = 0.7, total = c.oneWay * 2 + pause;
  c.t += dt;
  let d, back = false;
  if (c.t < c.oneWay) d = (c.t / c.oneWay) * c.len;
  else if (c.t < c.oneWay + pause) {
    d = c.len;
    if (!c.dropped) {
      c.dropped = true;
      c.made.mixer.stopAllAction(); c.made.play("pick-up", 1, 1.4);
      c.env.position.set(c.to.x + 0.35, 0.95, c.to.z + 0.15);
      c.env.scale.set(0.6, 0.41, 1);
      popAt(c.to.x, c.to.z, "Yeni posta: " + c.label);
      c.envDropAt = c.t;
    }
  } else {
    if (!c.walkingBack) { c.walkingBack = true; c.made.mixer.stopAllAction(); c.made.play("walk", 1, 1.6); }
    back = true;
    d = Math.max(0, c.len - ((c.t - c.oneWay - pause) / c.oneWay) * c.len);
  }
  const { p, dir } = pointAt(c, d);
  c.made.actor.position.copy(p);
  if (dir.lengthSq() > 1e-6 && !(c.dropped && !back)) c.made.actor.rotation.y = Math.atan2(back ? -dir.x : dir.x, back ? -dir.z : dir.z);
  if (!c.dropped) c.env.position.set(p.x, 1.75, p.z);
  if (c.dropped && c.t - c.envDropAt > 2.2) c.env.material.opacity = Math.max(0, 1 - (c.t - c.envDropAt - 2.2) / 0.6);
  c.made.mixer.update(dt);
  if (c.t >= total) {
    peopleGroup.remove(c.made.actor); peopleGroup.remove(c.env);
    c.env.material.map.dispose(); c.env.material.dispose();
    if (c.fromRec?.actor) c.fromRec.actor.visible = true;
    if (c.fromRec) c.fromRec.walking = false;
    current = null;
    if (pendingRebuild) { const fn = pendingRebuild; pendingRebuild = false; fn(); }
    startNextMail();
  }
}

// ---------- camera ----------
const VIEW_DIR = new THREE.Vector3(1, 1.05, 1.15).normalize();
const center = new THREE.Vector3();
function frame() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  center.set(W / 2, 0, D / 2);
  const aspect = w / h;
  camera.position.copy(center).addScaledVector(VIEW_DIR, 60);
  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  const pts = [];
  // On a phone frame the department rooms only (the empty rooms at the front stay a pan away).
  const small = w < 600;
  // On a phone frame the first two room rows on the left (pan and pinch for the rest).
  // A phone starts on the first two rooms of the front row (Hauling, Dropolis) and pans to the rest.
  const firstRow = plan.rows[0] || [];
  const phoneX = firstRow[1] ? firstRow[1].x + firstRow[1].w + 0.5 : W;
  for (const x of [0, small ? phoneX : W]) for (const z of [0, small ? (plan.corridorsZ[0] ?? D) + 2 : D]) for (const y of [0, WALL_H + 1.2]) pts.push(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const hw = (Math.max(...xs) - Math.min(...xs)) / 2, hh = (Math.max(...ys) - Math.min(...ys)) / 2;
  // Shift the view so the plan is centered.
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const shift = right.multiplyScalar(cx).add(up.multiplyScalar(cy));
  const target = center.clone().add(shift);
  camera.position.copy(target).addScaledVector(VIEW_DIR, 60);
  camera.lookAt(target);
  const half = Math.max(hh, hw / aspect) * 1.08; // room for the bubbles over the back row
  camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  if (controls) { controls.target.copy(target); controls.update(); }
}
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(w, h, false);
  frame();
}

const ray = new THREE.Raycaster();
let down = null;
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObjects(peopleGroup ? peopleGroup.children : [], true)[0];
  let o = hit?.object;
  while (o && !o.userData.agentId) o = o.parent;
  if (o) openPanel(o.userData.agentId); else closePanel();
}

function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) return;
  const raw = clock.getDelta(), dt = Math.min(0.05, raw);
  if (!reduce) for (const p of people) p.mixer?.update(dt);
  stepMail(Math.min(0.25, raw)); // real time, so a mail takes 5 to 6 s even on a slow device
  controls?.update();
  renderer.render(scene, camera);
  placeTags();
}

// Static office (floor, walls, corridors, lounge, rooms). Built again when the room plan changes.
let officeGroup = null, sunLight = null;
function buildOffice() {
  if (officeGroup) {
    scene.remove(officeGroup);
    officeGroup.traverse((o) => { if (o.isMesh && !o.userData.shared) { o.geometry?.dispose?.(); } });
  }
  const office = new THREE.Group();
  officeGroup = office;
  scene.add(office);
  const tex = woodTexture(); tex.repeat.set(W / 3, D / 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(W / 2, 0, D / 2); floor.receiveShadow = true;
  office.add(floor);
  // A thin base under the floor so the plan reads as a model.
  box(office, W + 0.25, 0.3, D + 0.25, 0xcbbfae, W / 2 - 0.125, -0.151, D / 2 - 0.125 + 0.125, { shadow: false });
  outerWalls(office);
  corridors(office);
  lounge(office);
  for (const r of ROOMS) buildRoom(office, r);

  if (sunLight) {
    sunLight.position.set(W / 2 + 14, 30, D / 2 + 10);
    sunLight.target.position.set(W / 2, 0, D / 2);
    const r = Math.max(W, D) * 0.75;
    Object.assign(sunLight.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 120 });
    sunLight.shadow.camera.updateProjectionMatrix();
  }
  if (stage.clientWidth) frame();
}

async function start() {
  stage.classList.add("on");
  stage.prepend(renderer.domElement);
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", "Ofis: her cam oda bir birim, masadaki karakter bir Claude oturumu. Liste aşağıda.");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const small = stage.clientWidth < 600;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.background = new THREE.Color(0xe9e4dc);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c7a8, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  scene.add(sun.target);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(2048, 2048);
  sunLight = sun;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const loader = new GLTFLoader();
  await Promise.all(MODEL_FILES.map((n) => loader.loadAsync(`/office/models/${n}.glb`).then((g) => { M[n] = g; }).catch(() => { /* a missing model only drops that item */ })));
  if (!M.table || !PEOPLE.some((p) => M[p])) throw new Error("models");

  makePlan();
  buildOffice();
  buildPeople();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reduce;
  controls.enableRotate = true;
  controls.minPolarAngle = THREE.MathUtils.degToRad(35);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(62);
  controls.minAzimuthAngle = THREE.MathUtils.degToRad(15);
  controls.maxAzimuthAngle = THREE.MathUtils.degToRad(75);
  controls.minZoom = 0.8; controls.maxZoom = 4;
  controls.screenSpacePanning = true;
  new ResizeObserver(resize).observe(stage);
  resize();
  renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8) pick(e);
    down = null;
  });
  stage.dataset.ready = "1";
  requestAnimationFrame(animate);
  enqueueMail(mail);
  startNextMail();
}

plan = layout();
makePlan();
renderList();
if (renderer && stage) {
  start().catch(() => {
    // 3D could not start (models or WebGL): keep the list only.
    stage.classList.remove("on");
    renderer.domElement.remove();
    renderer = null;
  });
}

// ---------- refresh every 30 s ----------
async function refresh() {
  if (document.hidden) return;
  try {
    const r = await fetch("/admin/office.json", { credentials: "same-origin", cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    if (!j || !Array.isArray(j.agents)) return;
    const same = JSON.stringify(j.agents) === JSON.stringify(agents);
    agents = j.agents;
    if (!same) {
      const before = layoutKey;
      makePlan();
      if (renderer && peopleGroup) {
        const rebuild = () => { if (layoutKey !== before) buildOffice(); buildPeople(); };
        if (current) pendingRebuild = rebuild; else rebuild();
      }
    }
    renderList();
    if (selected) { if (agents.some((x) => x.id === selected)) openPanel(selected); else closePanel(); }
    if (renderer && peopleGroup && Array.isArray(j.mail)) { enqueueMail(j.mail); startNextMail(); }
  } catch { /* keep the last data */ }
}
setInterval(refresh, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
