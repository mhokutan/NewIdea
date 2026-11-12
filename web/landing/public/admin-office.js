// Office page (promovote.com/admin/office, founder request 2026-11-12): the founder's Claude sessions as low poly
// characters at desks. Read only: data comes from /admin/office.json (same admin login). three.js is vendored in
// /vendor because the site CSP allows scripts from 'self' only. If WebGL is not available the page keeps the plain
// list that the server already rendered. Every text from the data goes in through textContent or a canvas, never HTML.
import * as THREE from "/vendor/three-0.160.0.module.min.js";

const STATUS = {
  working: { label: "Çalışıyor", color: 0x4ade80, css: "chip-g" },
  idle: { label: "Boşta", color: 0x8e8e93, css: "chip-n" },
  waiting_owner: { label: "Senden evet bekliyor", color: 0xffd60a, css: "chip-y" },
  blocked: { label: "Takıldı", color: 0xf87171, css: "chip-r" },
  offline: { label: "Kapalı", color: 0x3a3a40, css: "chip-n" },
};
const st = (s) => STATUS[s] || STATUS.idle;
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

let agents = [];
try { agents = JSON.parse(document.getElementById("of-data").textContent || "[]"); } catch { agents = []; }
let selected = null;

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
    const li = el("li", { class: "of-item" + (a.id === selected ? " sel" : ""), "data-id": a.id, tabindex: "0", role: "button", "aria-label": `${a.role}: ${s.label}` },
      el("div", { class: "st-head", style: "margin:0 0 6px" }, el("b", {}, a.role), el("span", { class: "chip " + s.css }, s.label)),
      a.last_action ? el("p", { style: "margin:0 0 6px" }, a.last_action) : null,
      a.needs_owner ? el("p", { class: "of-need" }, el("b", {}, "Senden beklenen:"), " " + a.needs_owner) : null,
      el("p", { class: "dim", style: "margin:0;font-size:13px" }, ny(a.updated_at)));
    return li;
  }));
}

function openPanel(id) {
  const a = agents.find((x) => x.id === id);
  if (!a || !panel) return;
  selected = id;
  const s = st(a.status);
  pTitle.textContent = a.role;
  const row = (k, v) => [el("dt", {}, k), el("dd", {}, v || "-")];
  pBody.replaceChildren(
    ...row("Durum", s.label), ...row("Son iş", a.last_action), ...row("Senden beklenen", a.needs_owner), ...row("Güncelleme", ny(a.updated_at)));
  panel.classList.add("on");
  renderList();
}
function closePanel() { selected = null; panel?.classList.remove("on"); renderList(); }
document.getElementById("of-close")?.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

// ---------- 3D office ----------
const stage = document.getElementById("of-stage");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let renderer = null;
try {
  const probe = document.createElement("canvas");
  if (probe.getContext("webgl2") || probe.getContext("webgl")) renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
} catch { renderer = null; }

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
let people = []; // { id, group, body, head, armL, armR, screen, bang, phase }
let needsRender = true;

function labelSprite(text, { bg = "rgba(10,10,12,.85)", fg = "#f5f5f7", size = 30 } = {}) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  const t = text.length > 20 ? text.slice(0, 19) + "…" : text;
  const w = Math.ceil(ctx.measureText(t).width) + 28, h = size + 22;
  c.width = w; c.height = h;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 14); ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = "middle"; ctx.fillText(t, 14, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sp.scale.set(w / 175, h / 175, 1);
  sp.renderOrder = 10;
  return sp;
}
function bangSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffd60a"; ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0a0a0a"; ctx.font = "800 92px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sp.scale.set(0.42, 0.42, 1);
  sp.renderOrder = 11;
  return sp;
}

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, flatShading: true, ...extra });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

function buildPerson(a, x, z) {
  const s = st(a.status);
  const off = a.status === "offline";
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.userData.id = a.id;
  // Desk with a monitor; the screen glows in the status color while the agent works.
  const wood = mat(0x2a2a30);
  const top = box(1.6, 0.08, 0.8, wood); top.position.set(0, 0.75, 0); g.add(top);
  for (const [lx, lz] of [[-0.72, -0.32], [0.72, -0.32], [-0.72, 0.32], [0.72, 0.32]]) { const l = box(0.06, 0.75, 0.06, wood); l.position.set(lx, 0.375, lz); g.add(l); }
  const frame = box(0.62, 0.42, 0.05, mat(0x18181b)); frame.position.set(0, 1.04, -0.22); g.add(frame);
  const screen = box(0.56, 0.36, 0.01, new THREE.MeshStandardMaterial({ color: 0x111114, emissive: a.status === "working" ? s.color : 0x000000, emissiveIntensity: 0.35 }));
  screen.position.set(0, 1.04, -0.19); g.add(screen);
  const kb = box(0.5, 0.03, 0.16, mat(0x3a3a40)); kb.position.set(0, 0.8, 0.12); g.add(kb);
  // Chair and character (low poly). Faded when the session is offline.
  const chair = box(0.55, 0.08, 0.55, mat(0x222226)); chair.position.set(0, 0.48, 0.72); g.add(chair);
  const back = box(0.55, 0.6, 0.07, mat(0x222226)); back.position.set(0, 0.8, 1.0); g.add(back);
  const skin = mat(off ? 0x55555a : 0xe8e8ec, off ? { transparent: true, opacity: 0.35 } : {});
  const shirt = mat(s.color, off ? { transparent: true, opacity: 0.35 } : {});
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.62, 6), shirt); body.position.set(0, 0.86, 0.68); g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), skin); head.position.set(0, 1.33, 0.66); g.add(head);
  const armL = box(0.09, 0.09, 0.42, shirt); armL.position.set(-0.2, 0.92, 0.42); g.add(armL);
  const armR = box(0.09, 0.09, 0.42, shirt); armR.position.set(0.2, 0.92, 0.42); g.add(armR);
  const lab = labelSprite(a.role); lab.position.set(0, 0.12, 1.45); g.add(lab);
  let bang = null;
  if (a.status === "waiting_owner") { bang = bangSprite(); bang.position.set(0, 1.85, 0.66); g.add(bang); }
  if (a.status === "blocked") { const b = labelSprite("takıldı", { bg: "rgba(248,113,113,.95)", fg: "#0a0a0a", size: 24 }); b.position.set(0, 1.75, 0.66); g.add(b); }
  scene.add(g);
  return { id: a.id, status: a.status, group: g, body, head, armL, armR, bang, phase: Math.random() * 6 };
}

function layout() {
  for (const p of people) {
    scene.remove(p.group);
    p.group.traverse((o) => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } });
  }
  people = [];
  const n = agents.length;
  if (!n) { needsRender = true; return; }
  const narrow = stage.clientWidth < 600;
  const cols = narrow ? Math.min(2, n) : Math.min(4, Math.ceil(Math.sqrt(n * 1.5)));
  const rows = Math.ceil(n / cols);
  const gx = 2.9, gz = 3.2;
  agents.forEach((a, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    people.push(buildPerson(a, (c - (cols - 1) / 2) * gx, (r - (rows - 1) / 2) * gz));
  });
  // Fit the camera to the room: look down at about 40 degrees.
  const w = cols * gx + 1, d = rows * gz + 1.5;
  // The view is tilted, so the room looks about 0.7 times as deep as it is.
  const fitH = Math.max(d * 0.72, w / camera.aspect) * 1.05;
  const dist = fitH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) + 1;
  camera.position.set(0, dist * 0.72, dist * 0.78);
  camera.lookAt(0, 0.6, 0.3);
  floor.scale.set(Math.max(12, w * 2), 1, Math.max(12, d * 2));
  needsRender = true;
}

let floor;
function setupScene() {
  scene.background = new THREE.Color(0x111114);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222226, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(4, 8, 6); scene.add(sun);
  floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x1b1b20, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const grid = new THREE.GridHelper(40, 40, 0x26262c, 0x202026); grid.position.y = 0.002; scene.add(grid);
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  layout();
}

// Tap or click a character (not a drag) opens the side panel.
const ray = new THREE.Raycaster();
let down = null;
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  const v = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(v, camera);
  const hit = ray.intersectObjects(people.map((p) => p.group), true)[0];
  let o = hit?.object;
  while (o && !o.userData.id) o = o.parent;
  if (o) openPanel(o.userData.id); else closePanel();
}

function animate(t) {
  requestAnimationFrame(animate);
  if (document.hidden) return;
  const time = t / 1000;
  if (!reduce) {
    for (const p of people) {
      if (p.status === "working") {
        // Typing: arms tap, the head nods a little.
        p.armL.position.y = 0.92 + Math.max(0, Math.sin(time * 14 + p.phase)) * 0.04;
        p.armR.position.y = 0.92 + Math.max(0, Math.sin(time * 14 + p.phase + 1.6)) * 0.04;
        p.head.rotation.x = Math.sin(time * 2 + p.phase) * 0.06;
      } else if (p.status === "idle") {
        p.head.rotation.y = Math.sin(time * 0.6 + p.phase) * 0.4;
      }
      if (p.bang) p.bang.position.y = 1.85 + Math.sin(time * 3 + p.phase) * 0.06;
    }
    needsRender = true;
  }
  if (needsRender) { renderer.render(scene, camera); needsRender = false; }
}

if (renderer && stage) {
  stage.classList.add("on");
  stage.prepend(renderer.domElement);
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", "Ofis: her masa bir Claude oturumu. Liste aşağıda.");
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  setupScene();
  new ResizeObserver(resize).observe(stage);
  renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8) pick(e);
    down = null;
  });
  resize();
  requestAnimationFrame(animate);
}

// List items open the same panel (keyboard too).
listEl.addEventListener("click", (e) => { const li = e.target.closest?.("[data-id]"); if (li) openPanel(li.getAttribute("data-id")); });
listEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const li = e.target.closest?.("[data-id]");
  if (li) { e.preventDefault(); openPanel(li.getAttribute("data-id")); }
});

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
    renderList();
    if (selected) { if (agents.some((a) => a.id === selected)) openPanel(selected); else closePanel(); }
    if (!same && renderer) layout();
  } catch { /* keep the last data */ }
}
setInterval(refresh, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
renderList();
