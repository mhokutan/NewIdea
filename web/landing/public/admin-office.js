// Office page (promovote.com/admin/office). Version 2 (founder 2026-11-12: "Ofis hiç ofise benzemiyor"): a roofless
// floor plan seen from above at an angle. Every unit has its own room with half height walls, a door gap and the unit
// name over the door, its own wall and rug color, real CC0 furniture and a real CC0 character that acts out its
// status. Read only: data comes from /admin/office.json (same admin login). Models: public/office/models (credits in
// web/landing/CREDITS.md). If WebGL or the models fail, the page keeps the plain list the server rendered.
// Every text from the data goes in through textContent or a canvas, never HTML.
import * as THREE from "/vendor/three-0.160.0.module.min.js";
import { GLTFLoader } from "/vendor/three-0.160.0-GLTFLoader.js";
import { clone as cloneSkinned } from "/vendor/three-0.160.0-SkeletonUtils.js";
import { OrbitControls } from "/vendor/three-0.160.0-OrbitControls.js";

const STATUS = {
  working: { label: "Çalışıyor", css: "chip-g" },
  idle: { label: "Boşta", css: "chip-n" },
  waiting_owner: { label: "Senden evet bekliyor", css: "chip-y" },
  blocked: { label: "Takıldı", css: "chip-r" },
  offline: { label: "Kapalı", css: "chip-n" },
};
const st = (s) => STATUS[s] || STATUS.idle;

// Project colors (founder 2026-11-12): Hauling orange, Dropolis blue, PromoVote purple, Dovelet pink, shared units green.
const COLORS = {
  hauling: { wall: 0xf28c28, rug: 0xffb560 },
  dropolis: { wall: 0x2f7de1, rug: 0x7fb6ff },
  promovote: { wall: 0x8a4fd8, rug: 0xc39bff },
  dovelet: { wall: 0xe8559a, rug: 0xff9cc8 },
  shared: { wall: 0x2fa35a, rug: 0x86dca4 },
};
// The fixed rooms, in plan order. A row in office_agents goes to the room whose words match its id; anything else
// opens a new room at the end.
const ROOMS = [
  { key: "hauling-dev", name: "Hauling Geliştirici", color: "hauling", match: (id) => /hauling|empire/.test(id) && !/desk|masa|empire-desktop/.test(id) },
  { key: "hauling-desktop", name: "Hauling Masaüstü", color: "hauling", match: (id) => /(hauling|empire).*(desk|masa)|(desk|masa).*(hauling|empire)/.test(id) },
  { key: "dropolis", name: "Dropolis", color: "dropolis", match: (id) => /dropolis|robo/.test(id) },
  { key: "promovote-dev", name: "PromoVote Geliştirici", color: "promovote", match: (id) => /promovote/.test(id) },
  { key: "ceo", name: "CEO", color: "shared", ceo: true, match: (id) => /(^|-)ceo($|-)/.test(id) },
  { key: "dovelet-dev", name: "Dovelet Geliştirici", color: "dovelet", match: (id) => /dovelet|lovelet|couple/.test(id) },
  { key: "macmini-test", name: "Mac mini Test", color: "shared", match: (id) => /mac/.test(id) },
  { key: "analyst", name: "Analist", color: "shared", match: (id) => /analy|analist/.test(id) },
];
const colorFor = (id) => /hauling|empire/.test(id) ? "hauling" : /dropolis|robo/.test(id) ? "dropolis" : /promovote/.test(id) ? "promovote" : /dovelet|lovelet|couple/.test(id) ? "dovelet" : "shared";

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
const waitingCount = (agents) => agents.filter((a) => a.status === "waiting_owner" || a.needs_owner).length;
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

let agents = [];
try { agents = JSON.parse(document.getElementById("of-data").textContent || "[]"); } catch { agents = []; }
let selected = null; // room key

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
    return el("li", { class: "of-item" + (roomOf(a.id) === selected ? " sel" : ""), "data-id": a.id, tabindex: "0", role: "button", "aria-label": `${a.role}: ${s.label}` },
      el("div", { class: "st-head", style: "margin:0 0 6px" }, el("b", {}, a.role), el("span", { class: "chip " + s.css }, s.label)),
      a.last_action ? el("p", { style: "margin:0 0 6px" }, a.last_action) : null,
      a.needs_owner ? el("p", { class: "of-need" }, el("b", {}, "Senden beklenen:"), " " + a.needs_owner) : null,
      el("p", { class: "dim", style: "margin:0;font-size:13px" }, ny(a.updated_at)));
  }));
}

// Room plan: which agent sits in which room (computed again on every refresh).
let plan = [];
function makePlan() {
  const used = new Set();
  const rooms = ROOMS.map((r) => ({ ...r, agent: null }));
  for (const a of agents) {
    const r = rooms.find((x) => !x.agent && x.match(a.id));
    if (r) { r.agent = a; used.add(a.id); }
  }
  // New rows open new rooms (founder: "yeni satır gelirse yeni oda otomatik açılsın").
  for (const a of agents) if (!used.has(a.id)) rooms.push({ key: "x-" + a.id, name: a.role, color: colorFor(a.id), agent: a, match: () => false });
  return rooms;
}
const roomOf = (agentId) => plan.find((r) => r.agent?.id === agentId)?.key || null;

function openPanel(key) {
  const r = plan.find((x) => x.key === key);
  if (!r || !panel) return;
  selected = key;
  const a = r.agent;
  pTitle.textContent = a ? a.role : r.name;
  const row = (k, v) => [el("dt", {}, k), el("dd", {}, v || "-")];
  pBody.replaceChildren(...(a
    ? [...row("Oda", r.name), ...row("Durum", st(a.status).label), ...row("Son iş", a.last_action), ...row("Senden beklenen", a.needs_owner), ...row("Güncelleme", ny(a.updated_at))]
    : [...row("Oda", r.name), ...row("Durum", "Bu odada henüz oturum yok")]));
  panel.classList.add("on");
  renderList();
}
function closePanel() { selected = null; panel?.classList.remove("on"); renderList(); }
document.getElementById("of-close")?.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });
listEl.addEventListener("click", (e) => { const li = e.target.closest?.("[data-id]"); if (li) { const k = roomOf(li.getAttribute("data-id")); if (k) openPanel(k); } });
listEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const li = e.target.closest?.("[data-id]");
  if (li) { e.preventDefault(); const k = roomOf(li.getAttribute("data-id")); if (k) openPanel(k); }
});

// ---------- 3D office ----------
const stage = document.getElementById("of-stage");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let renderer = null;
try {
  const probe = document.createElement("canvas");
  if (probe.getContext("webgl2") || probe.getContext("webgl")) renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
} catch { renderer = null; }

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
let controls = null;
const clock = new THREE.Clock();
let roomGroups = []; // { key, group, mixer, bob, actor, status }
let world = null; // group holding everything that is rebuilt
const M = {}; // loaded models by name

const MODEL_FILES = ["table", "chaircushioned", "computer", "houseplant_1", "houseplant_3", "houseplant_6", "bookshelf", "bookcasebooks", "shelf_large", "drawer_1",
  "table_roundlarge", "chair_1", "light_desk", "trashcan_small1", "light_floor1", "couch_medium1",
  "mini_male_a", "mini_male_b", "mini_male_c", "mini_female_a", "mini_female_b", "mini_female_c"];
const PEOPLE = ["mini_male_a", "mini_female_a", "mini_male_b", "mini_female_b", "mini_male_c", "mini_female_c"];

// Scale a model so its height (or its larger floor side) matches the target, and stand it on the floor.
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
function prop(name, size, x, z, rotY = 0, y = 0) {
  const src = M[name];
  if (!src) return null;
  const o = fit(src.scene.clone(true), size);
  o.position.set(x, y, z);
  o.rotation.y = rotY;
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return o;
}

function textTexture(text, { bg, fg = "#ffffff", w = 512, h = 128, size = 58 }) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 22); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  let fs = size;
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  const t = text.length > 28 ? text.slice(0, 27) + "…" : text;
  while (ctx.measureText(t).width > w - 40 && fs > 22) { fs -= 2; ctx.font = `700 ${fs}px system-ui, sans-serif`; }
  ctx.fillText(t, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function badge(text, bg, fg) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, { bg, fg, w: 256, h: 96, size: 46 }), depthTest: false }));
  sp.scale.set(1.25, 0.47, 1);
  sp.renderOrder = 20;
  return sp;
}
function bang() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffd60a"; ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = "#1a1a1a"; ctx.stroke();
  ctx.fillStyle = "#111"; ctx.font = "900 90px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sp.scale.set(0.75, 0.75, 1);
  sp.renderOrder = 21;
  return sp;
}

// Light wood floor: planks drawn on a canvas.
function woodTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const ctx = c.getContext("2d");
  const tones = ["#e2c193", "#dcb887", "#e8cba0", "#d7b27f", "#e5c597"];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = tones[i % tones.length];
    ctx.fillRect(0, i * 64, 512, 64);
    ctx.fillStyle = "rgba(120,80,40,.18)";
    ctx.fillRect(0, i * 64, 512, 2);
    const off = (i * 137) % 512;
    ctx.fillRect(off, i * 64, 2, 64);
    ctx.fillRect((off + 256) % 512, i * 64, 2, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const WALL_H = 1.15, WALL_T = 0.14, DOOR = 1.5;
function wallMat(color, dark) {
  const c = new THREE.Color(color);
  if (dark) c.multiplyScalar(0.32);
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
}
// One straight wall from (x1, z1) to (x2, z2), with an optional door gap in the middle and a sign over it.
function wall(g, x1, z1, x2, z2, mat, door, sign) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ang = Math.atan2(z2 - z1, x2 - x1);
  const parts = door ? [[0, (len - DOOR) / 2], [(len + DOOR) / 2, len]] : [[0, len]];
  for (const [a, b] of parts) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(b - a, WALL_H, WALL_T), mat);
    const mid = (a + b) / 2;
    seg.position.set(x1 + Math.cos(ang) * mid, WALL_H / 2, z1 + Math.sin(ang) * mid);
    seg.rotation.y = -ang;
    seg.castShadow = true; seg.receiveShadow = true;
    g.add(seg);
  }
  if (door && sign) {
    // Two posts and a name board over the door gap.
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 0.1), mat);
      post.position.set(mx + Math.cos(ang) * s * DOOR / 2, 0.95, mz + Math.sin(ang) * s * DOOR / 2);
      g.add(post);
    }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.72), new THREE.MeshBasicMaterial({ map: sign, transparent: true, side: THREE.DoubleSide }));
    board.position.set(mx, 2.2, mz);
    board.rotation.y = -ang;
    board.renderOrder = 5;
    g.add(board);
  }
}

// Layout: 3 columns. The CEO room is the big middle one; the other 7 fill the ring; extra rooms add rows below.
// A corridor runs between every two rows, and every door opens onto a corridor, so the name boards never meet.
const COR = 2.2;
function cells(n) {
  const cw = [6, 8.5, 6];
  const xs = [-(cw[1] / 2 + cw[0]), -cw[1] / 2, cw[1] / 2];
  const rd = (r) => (r === 1 ? 8 : 6);
  const out = [];
  let z = 0;
  for (let r = 0; out.length < Math.max(n, 9); r++) {
    for (let c = 0; c < 3; c++) out.push({ x: xs[c], z, w: cw[c], d: rd(r), r, c });
    z += rd(r) + COR;
  }
  return out;
}
function buildRoom(r, cell) {
  const g = new THREE.Group();
  g.userData.key = r.key;
  const a = r.agent;
  const dark = !a || a.status === "offline"; // offline or empty: the room light is off
  const col = COLORS[r.color] || COLORS.shared;
  const { x, z, w, d } = cell;
  const cx = x + w / 2, cz = z + d / 2;
  // Click target: the whole room floor.
  const hit = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ visible: false }));
  hit.rotation.x = -Math.PI / 2; hit.position.set(cx, 0.02, cz);
  g.add(hit);
  // Rug in the project color.
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.62, d * 0.55), new THREE.MeshStandardMaterial({ color: new THREE.Color(col.rug).multiplyScalar(dark ? 0.3 : 1), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(cx, 0.012, cz + d * 0.06); rug.receiveShadow = true;
  g.add(rug);
  if (dark) {
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, d - 0.2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    shade.rotation.x = -Math.PI / 2; shade.position.set(cx, 0.03, cz); g.add(shade);
  }
  // Walls (inset so neighbours show two colors on a shared wall). The door faces the middle of the plan.
  const mat = wallMat(col.wall, dark);
  const i = WALL_T / 2 + 0.02;
  const sign = textTexture(r.name, { bg: "#" + new THREE.Color(col.wall).getHexString(), fg: "#ffffff" });
  const doorSide = cell.r === 0 || r.ceo ? "s" : "n";
  wall(g, x + i, z + i, x + w - i, z + i, mat, doorSide === "n", doorSide === "n" && sign);
  wall(g, x + i, z + d - i, x + w - i, z + d - i, mat, doorSide === "s", doorSide === "s" && sign);
  wall(g, x + i, z + i, x + i, z + d - i, mat, doorSide === "w", doorSide === "w" && sign);
  wall(g, x + w - i, z + i, x + w - i, z + d - i, mat, doorSide === "e", doorSide === "e" && sign);

  // Furniture: desk against the back wall (the wall opposite the door), chair, computer, plant, shelf, cabinet.
  // Desks always stand against the north wall, so the camera (south) sees every character from behind at its screen.
  const back = "n";
  // Local frame: "forward" points from the back wall into the room.
  const f = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[back === "n" ? "s" : back === "s" ? "n" : back === "w" ? "e" : "w"];
  const rx = [f[1] * -1, f[0]]; // right hand side, seen from the desk looking into the room... used for side items
  const half = back === "n" || back === "s" ? d / 2 : w / 2;
  const deskAt = (along, depth) => [cx + f[0] * (-half + depth) + rx[0] * along, cz + f[1] * (-half + depth) + rx[1] * along];
  const faceIn = Math.atan2(f[0], f[1]); // rotation so a model's +z looks into the room
  const items = [];
  // Keep the desk clear of a door in the same (north) wall.
  const deskOff = r.ceo ? 1.6 : doorSide === "n" ? (hash(r.key) % 2 ? 1.5 : -1.5) : 0;
  const [dx, dz] = deskAt(deskOff, 1.05);
  items.push(prop("table", { w: 1.9 }, dx, dz, faceIn));
  const [mx, mz] = deskAt(deskOff, 0.82);
  items.push(prop("computer", { h: 0.72 }, mx, mz, faceIn + Math.PI, 0.78));
  const [lx, lz] = deskAt(deskOff + 0.75, 0.85);
  items.push(prop("light_desk", { h: 0.42 }, lx, lz, faceIn, 0.78));
  const [chx, chz] = deskAt(deskOff, 1.75);
  const chair = prop("chaircushioned", { h: 1.0 }, chx, chz, faceIn + Math.PI);
  items.push(chair);
  const side = (back === "n" || back === "s" ? w : d) / 2 - 0.6;
  const [px, pz] = deskAt(-side, 0.55);
  items.push(prop(["houseplant_1", "houseplant_3", "houseplant_6"][hash(r.key) % 3], { h: 1.15 }, px, pz, 0));
  const [sx, sz] = deskAt(side - 0.1, 0.4);
  items.push(prop(hash(r.key) % 2 ? "bookcasebooks" : "bookshelf", { h: 1.75 }, sx, sz, faceIn));
  const [kx, kz] = deskAt(-side + 0.2, (back === "n" || back === "s" ? d : w) - 1.3);
  items.push(prop("drawer_1", { h: 0.85 }, kx, kz, faceIn + Math.PI / 2));
  const [tx, tz] = deskAt(deskOff - 1.2, 0.6);
  items.push(prop("trashcan_small1", { h: 0.4 }, tx, tz, 0));
  if (r.ceo) {
    // CEO room: meeting table with four chairs, a couch and a floor lamp.
    const [ux, uz] = deskAt(-1.9, d * 0.55);
    items.push(prop("table_roundlarge", { w: 1.9 }, ux, uz, 0));
    for (let k = 0; k < 4; k++) {
      const an = k * Math.PI / 2 + Math.PI / 4;
      items.push(prop("chair_1", { h: 0.95 }, ux + Math.sin(an) * 1.35, uz + Math.cos(an) * 1.35, an + Math.PI));
    }
    const [vx, vz] = deskAt(2.2, d - 1.0);
    items.push(prop("couch_medium1", { w: 2.1 }, vx, vz, faceIn + Math.PI));
    const [fx, fz] = deskAt(side, d - 0.8);
    items.push(prop("light_floor1", { h: 1.7 }, fx, fz, 0));
  }
  for (const it of items) if (it) g.add(it);

  // Character and status.
  let mixer = null, actor = null, bob = null;
  if (a && a.status !== "offline") {
    const name = PEOPLE[hash(a.id) % PEOPLE.length];
    const src = M[name];
    if (src) {
      const body = cloneSkinned(src.scene);
      body.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
      actor = fit(body, { h: 1.4 });
      mixer = new THREE.AnimationMixer(body);
      const clip = (n) => THREE.AnimationClip.findByName(src.animations, n);
      const play = (n, wgt = 1) => { const c = clip(n); if (c) { const ac = mixer.clipAction(c); ac.setEffectiveWeight(wgt); ac.play(); return ac; } return null; };
      if (a.status === "waiting_owner") {
        // Standing next to the desk, waiting for the founder.
        const [wx, wz] = deskAt(deskOff + 1.15, 1.8);
        actor.position.set(wx, 0, wz); actor.rotation.y = faceIn;
        play("idle");
        bob = bang(); bob.position.set(wx, 2.05, wz); g.add(bob);
      } else {
        // Sitting at the desk, facing the computer.
        actor.position.set(chx, 0.05, chz); actor.rotation.y = faceIn + Math.PI;
        if (a.status === "working") { play("sit"); play("interact-right", 0.7).timeScale = 1.6; }
        else play("sit");
        if (a.status === "idle") { actor.rotation.x = 0; body.rotation.x = -0.28; actor.position.y = 0.0; } // leaning back
        if (a.status === "blocked") {
          const tag = badge("takıldı", "#ef4444", "#ffffff"); tag.position.set(chx, 2.1, chz); g.add(tag);
          const lamp = new THREE.PointLight(0xff3030, 6, 5, 1.6); lamp.position.set(cx, 2.2, cz); g.add(lamp);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
          bulb.position.set(cx, 2.2, cz); g.add(bulb);
        }
      }
      g.add(actor);
      if (reduce) mixer.update(0.5); // a still pose, no motion
    }
  }
  world.add(g);
  return { key: r.key, group: g, mixer, bob, status: a?.status || "empty" };
}

let floor;
function build() {
  if (world) {
    scene.remove(world);
    world.traverse((o) => { o.geometry?.dispose?.(); const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; for (const m of ms) { m.map?.dispose?.(); m.dispose?.(); } });
  }
  world = new THREE.Group();
  scene.add(world);
  plan = makePlan();
  const cs = cells(plan.length);
  roomGroups = plan.map((r, i) => buildRoom(r, cs[i]));
  // Floor under the whole plan.
  const minX = Math.min(...cs.slice(0, plan.length).map((c) => c.x)), maxX = Math.max(...cs.slice(0, plan.length).map((c) => c.x + c.w));
  const minZ = Math.min(...cs.slice(0, plan.length).map((c) => c.z)), maxZ = Math.max(...cs.slice(0, plan.length).map((c) => c.z + c.d));
  const W = maxX - minX, D = maxZ - minZ;
  const tex = woodTexture(); tex.repeat.set(W / 2.5, D / 2.5);
  floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, D + 0.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2); floor.receiveShadow = true;
  world.add(floor);
  frame(minX, maxX, minZ, maxZ);
  renderList();
}

// Camera: from the south, looking down at about 50 degrees, the whole plan in view.
let view = null;
function frame(minX, maxX, minZ, maxZ) {
  view = { minX, maxX, minZ, maxZ };
  const W = maxX - minX, D = maxZ - minZ;
  const target = new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2 + D * 0.03);
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const needH = Math.max(D * 0.84, (W / camera.aspect) * 1.0) + 2.0;
  const dist = needH / (2 * Math.tan(vfov / 2));
  const tilt = THREE.MathUtils.degToRad(52);
  camera.position.set(target.x, Math.sin(tilt) * dist + 1, target.z + Math.cos(tilt) * dist);
  camera.lookAt(target);
  if (controls) { controls.target.copy(target); controls.minDistance = dist * 0.35; controls.maxDistance = dist * 1.4; controls.update(); }
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (view) frame(view.minX, view.maxX, view.minZ, view.maxZ);
}

// Tap or click a room (not a drag) opens the side panel.
const ray = new THREE.Raycaster();
let down = null;
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObjects(roomGroups.map((x) => x.group), true)[0];
  let o = hit?.object;
  while (o && !o.userData.key) o = o.parent;
  if (o) openPanel(o.userData.key); else closePanel();
}

function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) return;
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  if (!reduce) for (const r of roomGroups) {
    r.mixer?.update(dt);
    if (r.bob) r.bob.position.y = 2.05 + Math.sin(t * 3) * 0.08;
  }
  controls?.update();
  renderer.render(scene, camera);
}

async function start() {
  stage.classList.add("on");
  stage.prepend(renderer.domElement);
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", "Ofis: her oda bir birim, içindeki karakter bir Claude oturumu. Liste aşağıda.");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const small = stage.clientWidth < 600;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.background = new THREE.Color(0xf3efe8);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c7a8, 1.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-10, 22, 14);
  sun.castShadow = !small;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reduce;
  controls.enableRotate = true;
  controls.minPolarAngle = THREE.MathUtils.degToRad(20);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(62);
  controls.minAzimuthAngle = -Math.PI / 4;
  controls.maxAzimuthAngle = Math.PI / 4;
  controls.screenSpacePanning = false;

  const loader = new GLTFLoader();
  await Promise.all(MODEL_FILES.map((n) => loader.loadAsync(`/office/models/${n}.glb`).then((g) => { M[n] = g; }).catch(() => { /* a missing model only drops that item */ })));
  if (!M.table || !PEOPLE.some((p) => M[p])) throw new Error("models");
  new ResizeObserver(resize).observe(stage);
  resize();
  build();
  renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8) pick(e);
    down = null;
  });
  stage.dataset.ready = "1";
  requestAnimationFrame(animate);
}

plan = makePlan();
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
    if (!same && renderer && world) build(); else plan = makePlan();
    renderList();
    if (selected) { if (plan.some((x) => x.key === selected)) openPanel(selected); else closePanel(); }
  } catch { /* keep the last data */ }
}
setInterval(refresh, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
