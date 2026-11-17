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
  // The right column under the CEO room is the open break area (founder 2026-11-17): coffee bar, sofas, game corner.
  D = Math.max(z, 1 + ceo.d + 2 + 16) + 0.5;
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

let agents = [], mail = [], tasks = null, notes = [], skillUse = []; // tasks: null until the office_tasks table exists
try {
  const j = JSON.parse(document.getElementById("of-data").textContent || "{}");
  agents = Array.isArray(j) ? j : j.agents || [];
  mail = Array.isArray(j.mail) ? j.mail : [];
  tasks = Array.isArray(j.tasks) ? j.tasks : null;
  notes = Array.isArray(j.notes) ? j.notes : [];
  skillUse = Array.isArray(j.skill_use) ? j.skill_use : [];
} catch { agents = []; }
// Skills and models (founder 2026-11-14): comma separated skill names on a session, a card and a timeline line.
const splitSkills = (str) => [...new Set(String(str || "").split(",").map((x) => x.trim()).filter(Boolean))];
const agentModel = (a) => a?.model || modelOf(a?.role) || "";
const chips = (list, model) => (list.length || model ? el("span", { class: "of-chips" }, ...(model ? [el("span", { class: "of-chip m" }, model)] : []), ...list.map((k) => el("span", { class: "of-chip" }, k))) : null);
// "Senden beklenen" counts task cards that wait for the owner's answer; before the board exists, the agents' asks.
// Asks written on a session itself (office_agents.status waiting_owner or needs_owner) also show on the board, as
// "Senden bekleyen" cards, so the board and the list below never disagree (founder 2026-11-13). Such a card is not a
// row in office_tasks: its Evet / Hayır goes to the CEO as a note (office_notes), and this browser remembers it.
// A session that already has an unanswered waiting task card shows only that card.
const ASKED_KEY = "office-asks-answered";
let answeredAsks = {};
try { answeredAsks = JSON.parse(localStorage.getItem(ASKED_KEY) || "{}") || {}; } catch { answeredAsks = {}; }
const askKey = (a) => a.id + "|" + (a.needs_owner || "");
function agentAsks() {
  const covered = new Set((tasks || []).filter((t) => t.status === "waiting_owner" && !t.owner_answer).map((t) => t.assignee_id));
  return agents.filter((a) => (a.status === "waiting_owner" || a.needs_owner) && !covered.has(a.id)).map((a) => {
    const done = answeredAsks[askKey(a)];
    return {
      id: "ask:" + a.id, fromAgent: true, agent: a, title: a.needs_owner || "Senden evet bekliyor", detail: a.last_action || "",
      project: deptOf(a.id), assignee_id: a.id, status: "waiting_owner", kind: "yes", priority: 2, created_at: a.updated_at,
      owner_answer: done?.answer || null, owner_note: done?.note || null, answered_at: done?.at || null,
    };
  });
}
const boardItems = () => [...(tasks || []), ...agentAsks()];
const ownerCount = () => boardItems().filter((t) => t.status === "waiting_owner" && !t.owner_answer).length;
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
  askEl.replaceChildren("Senden beklenen: ", el("b", {}, String(ownerCount())), " evet");
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
  if (tasks) { boardFilter = id; renderBoard(); } // a click on a person filters the board to that person's cards
  const s = slotOf(id);
  pTitle.replaceChildren(shortName(a.role), agentModel(a) ? el("span", { class: "of-model" }, agentModel(a)) : "");
  const row = (k, v) => [el("dt", {}, k), el("dd", {}, v || "-")];
  pBody.replaceChildren(...row("Birim", s ? roomLabel(s.room) : "-"), ...row("Durum", st(a.status).label),
    ...row("Model", agentModel(a) ? chips([], agentModel(a)) : null), ...row("Beceriler", chips(splitSkills(a.skills))),
    ...row("Kim", personaLine(a)), ...row("Şu an", doingText(people.find((p) => p.agent.id === id))),
    ...row("Son tartışma", lastTalk(people.find((p) => p.agent.id === id))), ...row("Son iş", a.last_action),
    ...row("Senden beklenen", a.needs_owner), ...row("Güncelleme", ny(a.updated_at)));
  panel.classList.add("on");
  renderList();
  syncBubbles();
}
// A department label opens the same side panel with the department's people and its main skills.
function deptSkills(key) {
  const count = new Map();
  for (const a of agents) if ((key === "ceo" ? a.id === "ceo" : deptOf(a.id) === key && a.id !== "ceo")) for (const k of splitSkills(a.skills)) count.set(k, (count.get(k) || 0) + 1);
  return [...count.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([k]) => k);
}
function openDeptPanel(room) {
  if (!panel) return;
  selected = null;
  const people = slots.filter((x) => x.room === room && x.agent).map((x) => x.agent);
  const row = (k, v) => [el("dt", {}, k), el("dd", {}, v || "-")];
  pTitle.replaceChildren(roomLabel(room));
  pBody.replaceChildren(...row("Kişi", String(people.length)), ...row("Ana beceriler", chips(deptSkills(room.key).slice(0, 8))),
    ...row("Ekip", people.length ? el("span", { class: "of-chips" }, ...people.map((a) => el("span", { class: "of-chip" }, shortName(a.role)))) : null));
  panel.classList.add("on");
  syncBubbles();
}
// Persona and last talk for the side panel.
function personaLine(a) {
  const ps = personaOf(a);
  if (!ps) return null;
  return el("span", { class: "of-persona" }, el("b", {}, ps.name), ps.style ? ` · ${ps.style}` : "", ps.bio ? el("small", {}, ps.bio) : null,
    ps.likes || ps.dislikes ? el("small", {}, [ps.expertise ? `Uzmanlık: ${ps.expertise}.` : "", ps.likes ? ` Sever: ${ps.likes}.` : "", ps.dislikes ? ` Sevmez: ${ps.dislikes}.` : ""].join("").trim()) : null);
}
function lastTalk(p) {
  const t = p?.lastTopic;
  if (!t) return null;
  return `${t.text}${t.with?.length ? " (" + t.with.join(", ") + " ile)" : ""}, ${ny(t.at)}`;
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

// ---------- task board ("Görevler", founder 2026-11-13) ----------
// Columns of cards from office_tasks. The CEO session writes the cards; the owner reads them here and answers the
// cards that wait for a yes. Every text goes in through textContent.
const COLS = [
  ["waiting_owner", "Senden bekleyen", "wait"], ["doing", "Yapılıyor", "doing"], ["done", "Bitti", "done"], ["blocked", "Takıldı", "blocked"],
];
const KIND = { yes: "Evet istiyor", info: "Bilgi", question: "Soru" };
const TASK_STATUS = { waiting_owner: "Senden bekleyen", doing: "Yapılıyor", done: "Bitti", blocked: "Takıldı" };
const colsEl = document.getElementById("of-b-cols");
const filterEl = document.getElementById("of-b-filter");
const drawer = document.getElementById("of-drawer");
const tabCount = document.getElementById("of-tab-count");
let boardFilter = null, openTaskId = null;
const projectOf = (key) => (key === "ceo" ? CEO_DEPT : DEPTS.find((d) => d.key === key)) || { name: String(key || "-").toLocaleUpperCase("tr"), color: "#94a3b8" };
const agentName = (id) => { const a = agents.find((x) => x.id === id); return a ? shortName(a.role) : id || "-"; };
// Stage and timeline (founder 2026-11-14). A card in "Yapılıyor" untouched for 2 hours gets an "eski" tag.
const STALE_MS = 2 * 60 * 60 * 1000;
const lastTouch = (t) => Math.max(Date.parse(t.updated_at || "") || 0, ...(t.log || []).map((l) => Date.parse(l.at || "") || 0));
const isStale = (t) => t.status === "doing" && lastTouch(t) > 0 && Date.now() - lastTouch(t) > STALE_MS;
const pct = (t) => (Number.isFinite(Number(t.progress)) && t.progress !== null && t.progress !== "" ? Math.max(0, Math.min(100, Math.round(Number(t.progress)))) : null);
const byPriority = (x, y) => (x.priority ?? 3) - (y.priority ?? 3) || String(x.created_at).localeCompare(String(y.created_at));
function renderBoard() {
  if (!colsEl) return;
  if (tabCount) tabCount.textContent = tasks ? `(${ownerCount()})` : "";
  renderList();

  filterEl.hidden = !boardFilter;
  if (boardFilter) {
    const clear = el("button", { type: "button" }, "× Filtreyi kaldır");
    clear.addEventListener("click", () => { boardFilter = null; renderBoard(); });
    filterEl.replaceChildren("Sadece: ", el("b", {}, agentName(boardFilter)), " ", clear);
  }
  const shown = boardItems().filter((t) => !boardFilter || t.assignee_id === boardFilter);
  colsEl.replaceChildren(...COLS.map(([status, label, cls]) => {
    const cards = shown.filter((t) => t.status === status).sort(byPriority);
    const ul = el("ul", { class: "of-cards" }, ...cards.map((t) => {
      const p = projectOf(t.project);
      const b = el("button", { type: "button", class: "of-card", "data-task": t.id },
        el("span", { class: "of-card-t" }, t.title),
        t.stage ? el("span", { class: "of-card-s" }, t.stage + (pct(t) !== null ? ` · %${pct(t)}` : "")) : null,
        chips(splitSkills(t.skills_used), t.model_used || ""),
        pct(t) !== null ? el("span", { class: "of-prog", role: "progressbar", "aria-valuenow": String(pct(t)), "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": "İlerleme" }, el("i", { style: `width:${pct(t)}%` })) : null,
        el("span", { class: "of-card-m" }, el("i", { style: `--c:${p.color}` }), p.name, " · ", agentName(t.assignee_id),
          (t.priority ?? 3) === 1 ? el("span", { class: "of-pri" }, "Öncelikli") : null,
          t.fromAgent ? el("span", { class: "of-ans" }, "Oturumdan") : null,
          isStale(t) ? el("span", { class: "of-old", title: "2 saattir güncelleme yok" }, "eski") : null,
          t.owner_answer ? el("span", { class: "of-ans" }, t.owner_answer === "yes" ? "Cevabın: Evet" : "Cevabın: Hayır") : null));
      b.addEventListener("click", () => openTask(t.id));
      return el("li", {}, b);
    }));
    return el("section", { class: "of-col " + cls, "data-col": status }, el("h3", {}, label, el("b", {}, String(cards.length))),
      cards.length ? ul : el("p", { class: "dim", style: "margin:0;font-size:13px" }, "Kart yok."));
  }));
}
function openTask(id, keepNote) {
  const t = boardItems().find((x) => x.id === id);
  if (!t || !drawer) { closeTask(); return; }
  openTaskId = id;
  const p = projectOf(t.project);
  document.getElementById("of-d-title").textContent = t.title;
  const row = (k, v) => [el("dt", {}, k), el("dd", {}, v || "-")];
  document.getElementById("of-d-meta").replaceChildren(...row("Proje", p.name), ...row("Kimde", agentName(t.assignee_id)),
    ...row("Durum", TASK_STATUS[t.status] || t.status), ...row("Tür", KIND[t.kind] || t.kind), ...row("Öncelik", String(t.priority ?? 3)),
    ...(t.model_used ? row("Model", chips([], t.model_used)) : []), ...(splitSkills(t.skills_used).length ? row("Beceriler", chips(splitSkills(t.skills_used))) : []),
    ...(t.stage ? row("Aşama", t.stage) : []), ...(pct(t) !== null ? row("İlerleme", "%" + pct(t)) : []),
    ...row("Son hareket", ((ms) => (ms ? ny(new Date(ms).toISOString()) : "-"))(lastTouch(t) || Date.parse(t.created_at || "") || 0) + (isStale(t) ? " (2 saattir güncelleme yok)" : "")),
    ...row("Açıldı", ny(t.created_at)), ...(t.owner_answer ? row("Cevabın", (t.owner_answer === "yes" ? "Evet" : "Hayır") + (t.owner_note ? ": " + t.owner_note : "") + " (" + ny(t.answered_at) + ")") : []));
  document.getElementById("of-d-detail").textContent = t.detail || "";
  // Timeline, newest first, New York time.
  const hist = document.getElementById("of-d-hist"), log = t.log || [];
  if (hist) {
    hist.hidden = !log.length;
    document.getElementById("of-d-log").replaceChildren(...[...log].sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .map((l) => el("li", {}, el("time", { datetime: l.at }, ny(l.at)), l.text, l.skill ? chips([l.skill]) : null)));
  }
  const box = document.getElementById("of-d-answer");
  const oldNote = keepNote ? document.getElementById("of-d-note")?.value : null;
  if (t.status === "waiting_owner") {
    const note = el("textarea", { id: "of-d-note", maxlength: "1000", rows: "3", placeholder: "Not (isteğe bağlı)", "aria-label": "Not" });
    note.value = oldNote ?? "";
    const yes = el("button", { type: "button", class: "of-yes" }, "Evet"), no = el("button", { type: "button", class: "of-no" }, "Hayır");
    const msg = el("p", { class: "of-d-small", "aria-live": "polite", id: "of-d-msg" });
    const send = async (answer) => {
      const text = note.value.trim();
      if (text.length > 1000) { msg.textContent = "Not en fazla 1000 karakter olabilir."; return; }
      yes.disabled = no.disabled = true;
      msg.textContent = "Gönderiliyor...";
      try {
        // A session's own ask has no task row: the answer goes to the CEO as a note instead.
        const r = t.fromAgent
          ? await fetch("/admin/office/note", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: `${answer === "yes" ? "EVET" : "HAYIR"} (${t.agent.id}, ${shortName(t.agent.role)}): ${t.title}${text ? "\nNot: " + text : ""}`.slice(0, 1000) }) })
          : await fetch(`/admin/office/task/${encodeURIComponent(t.id)}/answer`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer, note: text }) });
        if (r.ok) {
          const at = new Date().toISOString();
          if (t.fromAgent) {
            answeredAsks[askKey(t.agent)] = { answer, note: text || null, at };
            try { localStorage.setItem(ASKED_KEY, JSON.stringify(answeredAsks)); } catch { /* private mode */ }
          } else Object.assign(t, { owner_answer: answer, owner_note: text || null, answered_at: at });
          renderBoard(); openTask(t.id);
          document.getElementById("of-d-msg").textContent = answer === "yes" ? "Evet kaydedildi. CEO görecek." : "Hayır kaydedildi. CEO görecek.";
          return;
        }
        msg.textContent = r.status === 409 ? "Bu kart artık cevap beklemiyor." : "Cevap kaydedilemedi. Biraz sonra tekrar dene.";
      } catch { msg.textContent = "Cevap kaydedilemedi. Bağlantını kontrol et."; }
      yes.disabled = no.disabled = false;
    };
    yes.addEventListener("click", () => send("yes"));
    no.addEventListener("click", () => send("no"));
    box.replaceChildren(...[
      t.fromAgent ? el("p", { class: "of-d-small" }, "Bu istek oturumun kendi durumundan geliyor. Cevabın CEO'ya not olarak gider; CEO oturuma iletir ve isteği kapatır.") : null,
      t.owner_answer ? el("p", { class: "of-d-small" }, t.fromAgent ? "Cevabını gönderdin. İstersen yeniden gönderebilirsin." : "Cevabını değiştirebilirsin, CEO kartı taşıyana kadar.") : null,
      note, el("div", { class: "of-d-btns" }, yes, no), msg,
      el("p", { class: "of-d-small" }, "Mağaza, yayın, bütçe ve canlı veri işlerinde CEO sohbette bir kez daha teyit ister."),
    ].filter(Boolean));
  } else box.replaceChildren();
  drawer.hidden = false;
}
function closeTask() { openTaskId = null; if (drawer) drawer.hidden = true; }
document.getElementById("of-d-back")?.addEventListener("click", closeTask);
// Phone and narrow screens: the board is a tab next to the office.
const mainEl = document.getElementById("of-main");
for (const [id, board] of [["of-tab-office", false], ["of-tab-board", true]]) {
  document.getElementById(id)?.addEventListener("click", () => {
    mainEl.classList.toggle("board", board);
    document.getElementById("of-tab-office").setAttribute("aria-selected", String(!board));
    document.getElementById("of-tab-board").setAttribute("aria-selected", String(board));
  });
}
renderBoard();

// ---------- "Beceriler" (founder 2026-11-14): skills x departments, and when each skill last ran on which task ----------
const skillsEl = document.getElementById("of-skills");
const WEEK_MS = 7 * 864e5;
function renderSkills() {
  if (!skillsEl) return;
  const cols = [CEO_DEPT, ...DEPTS].filter((d) => agents.some((a) => (d.key === "ceo" ? a.id === "ceo" : a.id !== "ceo" && deptOf(a.id) === d.key)));
  const rows = new Map(); // lower name -> { name, per: {dept: n}, total, use }
  const keyOf = (n) => n.toLocaleLowerCase("tr");
  for (const a of agents) {
    const d = a.id === "ceo" ? "ceo" : deptOf(a.id);
    for (const k of splitSkills(a.skills)) {
      const r = rows.get(keyOf(k)) || { name: k, per: {}, total: 0, use: null };
      r.per[d] = (r.per[d] || 0) + 1; r.total += 1;
      rows.set(keyOf(k), r);
    }
  }
  for (const u of skillUse) {
    const r = rows.get(keyOf(u.name)) || { name: u.name, per: {}, total: 0, use: null };
    r.use = u; rows.set(keyOf(u.name), r);
  }
  if (!rows.size) {
    skillsEl.replaceChildren(el("p", { class: "dim" }, "Henüz beceri yazılmadı. CEO oturumların beceri listesini doldurunca bu tablo dolar."));
    return;
  }
  const list = [...rows.values()].sort((x, y) => String(y.use?.last_at || "").localeCompare(String(x.use?.last_at || "")) || y.total - x.total || x.name.localeCompare(y.name));
  const used = list.filter((r) => r.use && Date.now() - Date.parse(r.use.last_at) < WEEK_MS).length;
  // Only departments where someone holds a skill get a column; the last use sits under the skill name, so the table
  // fits the side panel.
  const shown = cols.filter((d) => list.some((r) => r.per[d.key]));
  const head = el("tr", {}, el("th", {}, "Beceri ve son kullanım"), ...shown.map((d) => el("th", { title: d.name }, el("i", { style: `--c:${d.color}` }), d.name.split(" ")[0])));
  const body = list.map((r) => el("tr", { "data-skill": r.name },
    el("td", { class: "last" }, el("b", {}, r.name), el("br"), ...(r.use
      ? [ny(r.use.last_at), " · ", r.use.task_title || "-", ` (${r.use.uses} kez)`, Date.now() - Date.parse(r.use.last_at) >= WEEK_MS ? el("span", { class: "of-idle", style: "margin-left:6px" }, "7 gündür boşta") : null]
      : [el("span", { class: "of-idle" }, "Kullanılmadı")])),
    ...shown.map((d) => (r.per[d.key] ? el("td", { class: "n", title: `${d.name}: ${r.per[d.key]} kişi` }, String(r.per[d.key])) : el("td", { class: "z" }, "·")))));
  skillsEl.replaceChildren(
    el("p", { class: "dim", style: "margin:0 0 8px;font-size:13px" }, `${list.length} beceri, son 7 günde ${used} tanesi kullanıldı. Sayılar: o birimde bu beceriye sahip kişi.`),
    el("div", { class: "of-skill-wrap" }, el("table", { class: "of-skill-t" }, el("thead", {}, head), el("tbody", {}, ...body))));
}
const segTasks = document.getElementById("of-seg-tasks"), segSkills = document.getElementById("of-seg-skills");
function showSkills(on) {
  segTasks?.setAttribute("aria-selected", String(!on)); segSkills?.setAttribute("aria-selected", String(on));
  if (colsEl) colsEl.hidden = on;
  if (skillsEl) skillsEl.hidden = !on;
  if (on) { closeTask(); renderSkills(); }
}
segTasks?.addEventListener("click", () => showSkills(false));
segSkills?.addEventListener("click", () => showSkills(true));

// ---------- "Notların": the founder's notes, their status and the CEO's answer (read only, 2026-11-13) ----------
const NOTE_STATUS = { new: ["Yeni", "chip-y"], read: ["Okundu", "chip-n"], answered: ["Cevaplandı", "chip-g"] };
const notesEl = document.getElementById("of-notes-list");
function renderNotes() {
  if (!notesEl) return;
  if (!notes.length) { notesEl.replaceChildren(el("li", { class: "dim" }, "Henüz not yok.")); return; }
  notesEl.replaceChildren(...notes.map((n) => {
    const [label, css] = NOTE_STATUS[n.status] || [n.status, "chip-n"];
    return el("li", { class: "of-note-item", "data-note": n.id },
      el("div", { class: "of-note-head" }, el("span", {}, ny(n.created_at)), el("span", { class: "chip " + css }, label)),
      el("p", {}, n.text),
      n.answer ? el("p", { class: "of-note-ans" }, el("b", {}, "CEO: "), n.answer) : null);
  }));
}
renderNotes();

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
    if (r.ok) { ta.value = ""; noteMsg.textContent = "Not CEO'ya bırakıldı. Durumunu aşağıda görürsün."; refresh(); } else noteMsg.textContent = "Not gönderilemedi. Biraz sonra tekrar dene.";
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

const windowMat = new THREE.MeshStandardMaterial({ color: 0xbfe1f2, roughness: 0.15, metalness: 0.1, emissive: 0x9fd0ea, emissiveIntensity: 0.25 });
// Outer walls: white, with windows, only on the back (z = 0) and the left (x = 0), so the camera sees in.
function outerWalls(g) {
  const white = new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.95 });
  const glass = windowMat;
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
  // Only the first corridor runs across the right column (it leads to the CEO room and the break area); the others end
  // at the vertical corridor, so the break area stays open floor.
  plan.corridorsZ.forEach((z, i) => hz(z, z + 2, 0, i === 0 ? W : CROSS_X + 0.75));
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
  // The person sits on the viewer's side of the desk, back to the camera, facing the screen. The monitor, keyboard,
  // mug, papers and plants on the desks are instanced in deskKits (2026-11-17).
  for (const s of filled) {
    prop(g, "table", { w: 1.5 }, s.x, s.z, 0);
    s.chair = prop(g, "chaircushioned", { h: 0.95 }, s.x, s.z + 0.75, 0);
    s.lamp = hash(r.key + s.x + ":" + s.z) % 2 ? prop(g, "light_desk", { h: 0.38 }, s.x + 0.6, s.z - 0.26, 0, DESK_Y) : null;
  }
  roomKit(g, r);
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

// ---------- a living office (founder 2026-11-17): things on the desks, room kits, the break area, day and night ----------
// Everything here is drawn in code (boxes, cylinders and canvas textures), so nothing new is downloaded.
let DESK_Y = 0.74; // desk top height, measured from the table model in start()
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
const MAT = {
  dark: std(0x1f2937, { roughness: 0.5 }), black: std(0x111318, { roughness: 0.45 }), white: std(0xf8fafc), paper: std(0xffffff, { roughness: 1 }),
  steel: std(0x9ca3af, { roughness: 0.35, metalness: 0.5 }), wood: std(0xb7793f), pot: std(0xc2410c), leaf: std(0x3f9b4a, { roughness: 0.9 }),
  green: std(0x15803d, { roughness: 0.9 }), led: new THREE.MeshBasicMaterial({ color: 0x4ade80 }), led2: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
  red: new THREE.MeshBasicMaterial({ color: 0xff4d4d }), glow: new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.55, depthWrite: false }),
  bulb: new THREE.MeshBasicMaterial({ color: 0xfff1b8 }), ring: new THREE.MeshBasicMaterial({ color: 0xfffbeb }),
};
const MUGS = [0xffffff, 0xffd60a, 0xef4444, 0x3b82f6, 0x22c55e, 0xf97316, 0x8b5cf6, 0x111827];

// Screens: a shared material per kind. "code", "chart" and "design" scroll while their owner works.
const SCREEN = {};
function makeScreens() {
  if (SCREEN.code) return;
  const tex = (w, h, seed, draw, rep) => {
    const r = rng(seed);
    const t = canvasTex(w, h, (ctx) => draw(ctx, r));
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    return t;
  };
  const basic = (map) => new THREE.MeshBasicMaterial({ map, toneMapped: false });
  SCREEN.code = basic(tex(256, 512, 11, (ctx, r) => {
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, 256, 512);
    const cols = ["#7dd3fc", "#c4b5fd", "#86efac", "#fcd34d", "#f9a8d4", "#e2e8f0", "#e2e8f0"];
    for (let y = 8; y < 512; y += 16) {
      let x = 10 + Math.floor(r() * 4) * 16;
      for (let k = 0, n = 1 + Math.floor(r() * 4); k < n && x < 236; k++) { const w = 14 + r() * 60; ctx.fillStyle = cols[Math.floor(r() * cols.length)]; ctx.fillRect(x, y, Math.min(w, 246 - x), 7); x += w + 9; }
    }
  }, [1, 0.5]));
  SCREEN.chart = basic(tex(512, 256, 23, (ctx, r) => {
    ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "rgba(148,163,184,.25)"; ctx.lineWidth = 2;
    for (let y = 40; y < 256; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
    for (let x = 6; x < 512; x += 32) { const h = 30 + r() * 150; ctx.fillStyle = x % 64 < 32 ? "#38bdf8" : "#a78bfa"; ctx.fillRect(x, 236 - h, 20, h); }
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 6; ctx.beginPath();
    for (let x = 0, y = 150; x <= 512; x += 32) { y = Math.max(40, Math.min(200, y + (r() - 0.55) * 60)); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }, [0.5, 1]));
  SCREEN.design = basic(tex(256, 512, 37, (ctx, r) => {
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, 256, 512);
    const cols = ["#fde68a", "#fbcfe8", "#bfdbfe", "#bbf7d0", "#ddd6fe", "#fed7aa"];
    for (let y = 10; y < 512; y += 64) {
      ctx.fillStyle = "#18181b"; ctx.fillRect(14, y, 90 + r() * 80, 10);
      ctx.fillStyle = cols[Math.floor(r() * cols.length)]; ctx.beginPath(); ctx.roundRect(14, y + 18, 110, 36, 8); ctx.fill();
      ctx.fillStyle = cols[Math.floor(r() * cols.length)]; ctx.beginPath(); ctx.roundRect(132, y + 18, 110, 36, 8); ctx.fill();
    }
  }, [1, 0.5]));
  SCREEN.idle = basic(canvasTex(128, 64, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 128, 64); g.addColorStop(0, "#1e293b"); g.addColorStop(1, "#312e81");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = "#ffd60a"; ctx.lineWidth = 5; ctx.lineJoin = "miter";
    for (const dx of [0, 14]) { ctx.beginPath(); ctx.moveTo(48 + dx, 18); ctx.lineTo(62 + dx, 32); ctx.lineTo(48 + dx, 46); ctx.stroke(); }
  }));
  SCREEN.wait = basic(canvasTex(128, 64, (ctx) => {
    ctx.fillStyle = "#facc15"; ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = "#18181b"; ctx.font = "900 40px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", 64, 34);
  }));
  SCREEN.err = basic(canvasTex(128, 64, (ctx) => {
    ctx.fillStyle = "#7f1d1d"; ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = "#fecaca"; ctx.font = "900 40px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", 64, 34);
  }));
  SCREEN.off = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.25, metalness: 0.2 });
  SCREEN.game = basic(tex(256, 128, 51, (ctx, r) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, "#38bdf8"); g.addColorStop(1, "#a7f3d0");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "#16a34a"; ctx.fillRect(0, 100, 256, 28);
    for (let x = 0; x < 256; x += 40) { ctx.fillStyle = "#a16207"; ctx.fillRect(x + r() * 20, 70 + r() * 20, 24, 30); }
    ctx.fillStyle = "#ef4444"; ctx.fillRect(60, 78, 16, 22);
  }, [0.5, 1]));
}
// What a working person has on the screen, from the role text.
function workKind(a) {
  const r = String(a.role || "").toLocaleLowerCase("tr");
  if (/tasar|ui |ui$|design|ikon|görsel/.test(r)) return "design";
  if (/analist|aso|rakip|reklam|mağaza|store|rapor|ads|büyüme/.test(r)) return "chart";
  return "code";
}
const SCREEN_GEO = new THREE.PlaneGeometry(0.58, 0.34);

// Instanced parts: one draw call per part for all desks.
const dummy = new THREE.Object3D();
function inst(g, geo, mat, list) {
  if (!list.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach(([x, y, z, ry = 0, color], i) => {
    dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix);
    if (color !== undefined) m.setColorAt(i, new THREE.Color(color));
  });
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  return m;
}
let nightGlow = null; // desk lamp bulbs and glow discs, shown in the evening and at night
function deskKits(g) {
  makeScreens();
  const P = { frame: [], stand: [], base: [], kb: [], mouse: [], mug: [], paper: [], pot: [], leaf: [], bulb: [], disc: [] };
  const y = DESK_Y;
  for (const s of slots) {
    const h = hash(s.room.key + ":" + s.x.toFixed(2) + ":" + s.z.toFixed(2));
    P.base.push([s.x, y + 0.01, s.z - 0.2]); P.stand.push([s.x, y + 0.12, s.z - 0.21]); P.frame.push([s.x, y + 0.42, s.z - 0.19]);
    P.kb.push([s.x, y + 0.012, s.z + 0.12]); P.mouse.push([s.x + 0.33, y + 0.015, s.z + 0.14]);
    P.mug.push([s.x - 0.46 + (h % 3) * 0.05, y + 0.055, s.z + 0.08, 0, MUGS[h % MUGS.length]]);
    if (h % 2) { P.paper.push([s.x + 0.5, y + 0.006, s.z + 0.06, ((h >> 2) % 7 - 3) * 0.1]); P.paper.push([s.x + 0.52, y + 0.013, s.z + 0.05, ((h >> 4) % 5 - 2) * 0.18]); }
    if (h % 3 === 0) { P.pot.push([s.x - 0.6, y + 0.06, s.z - 0.24]); P.leaf.push([s.x - 0.6, y + 0.2, s.z - 0.24]); }
    const scr = new THREE.Mesh(SCREEN_GEO, SCREEN.off);
    scr.position.set(s.x, y + 0.42, s.z - 0.171);
    g.add(scr);
    s.screen = scr;
    if (s.lamp) { P.bulb.push([s.x + 0.6, y + 0.3, s.z - 0.2]); P.disc.push([s.x + 0.45, y + 0.005, s.z - 0.05]); }
  }
  inst(g, new THREE.BoxGeometry(0.64, 0.4, 0.035), MAT.dark, P.frame);
  inst(g, new THREE.BoxGeometry(0.05, 0.22, 0.05), MAT.dark, P.stand);
  inst(g, new THREE.BoxGeometry(0.26, 0.02, 0.16), MAT.dark, P.base);
  inst(g, new THREE.BoxGeometry(0.42, 0.022, 0.13), MAT.black, P.kb);
  inst(g, new THREE.BoxGeometry(0.05, 0.025, 0.08), MAT.black, P.mouse);
  inst(g, new THREE.CylinderGeometry(0.045, 0.04, 0.1, 10), std(0xffffff), P.mug);
  inst(g, new THREE.BoxGeometry(0.21, 0.008, 0.29), MAT.paper, P.paper);
  inst(g, new THREE.CylinderGeometry(0.06, 0.045, 0.12, 8), MAT.pot, P.pot);
  inst(g, new THREE.IcosahedronGeometry(0.12, 0), MAT.leaf, P.leaf);
  nightGlow = new THREE.Group();
  const bulbs = inst(nightGlow, new THREE.SphereGeometry(0.05, 8, 6), MAT.bulb, P.bulb);
  const discs = inst(nightGlow, new THREE.CircleGeometry(0.42, 20).rotateX(-Math.PI / 2), MAT.glow, P.disc);
  for (const m of [bulbs, discs]) if (m) { m.castShadow = false; m.receiveShadow = false; }
  g.add(nightGlow);
}

// Room kits: a whiteboard in every department room, and things that fit the team.
function whiteboardTex(seed, title) {
  return canvasTex(256, 160, (ctx) => {
    const r = rng(seed);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 154);
    ctx.fillStyle = "#1e3a8a"; ctx.font = "700 18px system-ui, sans-serif"; ctx.fillText(title.slice(0, 18), 14, 28);
    const notes = ["#fde047", "#f9a8d4", "#86efac", "#93c5fd", "#fdba74"];
    for (let i = 0; i < 6; i++) { ctx.fillStyle = notes[Math.floor(r() * notes.length)]; ctx.fillRect(14 + (i % 3) * 52, 44 + Math.floor(i / 3) * 50, 40, 38); }
    ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(180, 120);
    for (let x = 180; x < 244; x += 8) ctx.lineTo(x, 120 - r() * 60);
    ctx.stroke();
  });
}
let blinkers = []; // LED materials that blink
function roomKit(g, r) {
  if (r.ceo) return;
  const front = r.z + r.d;
  // Whiteboard on a stand against the left glass, facing the room.
  const wb = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.78, 1.25), [MAT.white, MAT.white, MAT.white, MAT.white, MAT.white, MAT.white]);
  board.position.set(0, 1.12, 0);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.72), new THREE.MeshBasicMaterial({ map: whiteboardTex(hash(r.key), r.spare ? "" : r.name), toneMapped: false }));
  face.rotation.y = Math.PI / 2; face.position.set(0.025, 1.12, 0);
  wb.add(board, face);
  for (const dz of [-0.55, 0.55]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.04), MAT.steel); leg.position.set(0, 0.37, dz); wb.add(leg); }
  wb.position.set(r.x + 0.3, 0, r.z + 1.55);
  g.add(wb);
  if (r.spare) return;
  // Team corners.
  if (r.key === "ortak" || r.key === "dropolis") {
    // A server rack with blinking lights in the back corner.
    const rack = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.7, 0.6), MAT.black);
    body.position.y = 0.85; body.castShadow = true; rack.add(body);
    const leds = [MAT.led, MAT.led2];
    for (let i = 0; i < 7; i++) for (let k = 0; k < 3; k++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), leds[(i + k) % 2]);
      l.position.set(-0.18 + k * 0.08, 0.3 + i * 0.2, 0.305); rack.add(l);
    }
    rack.position.set(r.x + r.w - 0.55, 0, front - 0.55);
    rack.rotation.y = 0;
    g.add(rack);
  }
  if (r.key === "panel" || /qa|test/.test(r.key)) {
    // A small table with test phones on stands.
    prop(g, "drawer_1", { h: 0.75 }, r.x + r.w - 0.6, front - 0.6, -Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const ph = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.012), [MAT.black, MAT.black, MAT.black, MAT.black, SCREEN.idle, MAT.black]);
      ph.position.set(r.x + r.w - 0.85 + (i % 2) * 0.22, 0.85, front - 0.75 + Math.floor(i / 2) * 0.25); ph.rotation.x = -0.35;
      g.add(ph);
    }
  }
  if (r.key === "social") {
    // A ring light and a camera on a tripod.
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 28), MAT.ring);
    ring.position.set(r.x + r.w - 0.7, 1.45, front - 0.7); ring.rotation.y = -Math.PI / 4;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), MAT.dark); pole.position.set(r.x + r.w - 0.7, 0.6, front - 0.7);
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.1), MAT.black); cam.position.set(r.x + r.w - 1.4, 1.1, front - 0.55);
    const tri = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.05, 3, 1, true), MAT.dark); tri.position.set(r.x + r.w - 1.4, 0.52, front - 0.55);
    g.add(ring, pole, cam, tri);
  }
  if (r.key === "store" || r.key === "promovote") {
    // A big screen with live numbers on the front right corner.
    const tv = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.05), [MAT.black, MAT.black, MAT.black, MAT.black, SCREEN.chart, MAT.black]);
    tv.position.set(r.x + r.w - 0.9, 1.25, front - 0.45); tv.rotation.y = Math.PI / 5;
    const st2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), MAT.dark); st2.position.set(r.x + r.w - 0.9, 0.47, front - 0.45);
    g.add(tv, st2);
  }
}

// The break area in the right column: coffee bar, sofas and a game corner. Spots are places people go to.
let SPOTS = [];
function lounge(g) {
  const ceo = ROOMS.find((r) => r.ceo);
  const top = ceo.z + ceo.d + 2; // just under the first corridor
  const x0 = RIGHT_X + 0.3, x1 = W - 0.3;
  SPOTS = [];
  const spot = (kind, x, z, rot, via, extra = {}) => SPOTS.push({ kind, x, z, rot, via, used: null, ...extra });
  // Floor tiles under the coffee bar and the game corner.
  flat(g, x1 - x0, 2.2, 0xe5e7eb, (x0 + x1) / 2, top + 1.0, 0.012);
  // Coffee bar: a counter with a coffee machine, cups and a water cooler.
  const cbz = top + 0.45;
  box(g, 3.4, 0.92, 0.6, 0, x0 + 1.9, 0.46, cbz, { mat: MAT.wood });
  box(g, 3.5, 0.05, 0.66, 0, x0 + 1.9, 0.945, cbz, { mat: MAT.white });
  box(g, 0.42, 0.5, 0.36, 0, x0 + 0.9, 1.22, cbz - 0.05, { mat: MAT.black });
  box(g, 0.05, 0.05, 0.02, 0, x0 + 0.78, 1.36, cbz + 0.14, { mat: MAT.red, shadow: false });
  box(g, 0.36, 0.42, 0.32, 0, x0 + 1.5, 1.18, cbz - 0.05, { mat: MAT.steel });
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 10), std(MUGS[i])); c.position.set(x0 + 2.2 + i * 0.13, 1.02, cbz + 0.05); c.castShadow = true; g.add(c); }
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.white);
  bowl.position.set(x0 + 3.2, 1.12, cbz); bowl.rotation.x = Math.PI; g.add(bowl);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std([0xef4444, 0xfacc15, 0x22c55e, 0xf97316][i])); f.position.set(x0 + 3.15 + (i % 2) * 0.1, 1.08, cbz - 0.04 + Math.floor(i / 2) * 0.08); g.add(f); }
  box(g, 0.38, 0.9, 0.38, 0, x0 + 4.2, 0.45, cbz, { mat: MAT.white });
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.45, 14), new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.75, roughness: 0.1 }));
  bottle.position.set(x0 + 4.2, 1.13, cbz); g.add(bottle);
  const lane1 = top + 1.75;
  spot("coffee", x0 + 0.9, cbz + 0.75, Math.PI, [[x0 + 0.9, lane1]]);
  spot("coffee", x0 + 1.9, cbz + 0.75, Math.PI, [[x0 + 1.9, lane1]]);
  spot("water", x0 + 4.2, cbz + 0.75, Math.PI, [[x0 + 4.2, lane1]]);
  // Sofas around a round rug.
  const cx = RIGHT_X + 3.9, cz = top + 4.6;
  flat(g, 4.6, 4.6, 0xd9cfe8, cx, cz, 0.014, { circle: true });
  flat(g, 3.6, 3.6, 0xc6b9dd, cx, cz, 0.016, { circle: true });
  prop(g, "couch_medium1", { w: 2.4 }, cx, cz - 1.7, 0);
  prop(g, "couch_medium1", { w: 2.4 }, cx - 1.75, cz + 0.5, Math.PI / 2);
  prop(g, "table_roundlarge", { w: 1.0 }, cx + 0.3, cz + 0.3, 0);
  prop(g, "light_floor1", { h: 1.7 }, cx + 1.9, cz - 1.9);
  prop(g, "houseplant_6", { h: 1.3 }, cx + 2.3, cz + 2.0);
  const lane2 = cz - 0.85;
  spot("sofa", cx - 0.55, cz - 1.55, 0, [[cx - 0.55, lane2]], { y: 0.12 });
  spot("sofa", cx + 0.55, cz - 1.55, 0, [[cx + 0.55, lane2]], { y: 0.12 });
  spot("sofa", cx - 1.6, cz + 0.05, Math.PI / 2, [[cx - 0.95, lane2], [cx - 0.95, cz + 0.05]], { y: 0.12 });
  spot("sofa", cx - 1.6, cz + 0.95, Math.PI / 2, [[cx - 0.95, lane2], [cx - 0.95, cz + 0.95]], { y: 0.12 });
  // Game corner: a foosball table, and a TV with a console and two bean bags.
  const gz = cz + 5.4, fx = x0 + 2.2;
  flat(g, x1 - x0, 4.6, 0xdbeafe, (x0 + x1) / 2, gz + 0.4, 0.012);
  box(g, 1.3, 0.55, 0.75, 0, fx, 0.55, gz, { mat: std(0x7c3f12) });
  box(g, 1.22, 0.02, 0.67, 0, fx, 0.835, gz, { mat: MAT.green, shadow: false });
  for (const dx of [-0.55, 0.55]) for (const dz of [-0.3, 0.3]) box(g, 0.08, 0.3, 0.08, 0, fx + dx, 0.15, gz + dz, { mat: std(0x5b2c0a) });
  for (let i = 0; i < 6; i++) {
    const zz = gz - 0.25 + i * 0.1;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.7, 6), MAT.steel);
    rod.rotation.z = Math.PI / 2; rod.position.set(fx, 0.95, zz); g.add(rod);
    for (const px of [-0.3, 0, 0.3]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.03), std(i % 2 ? 0xef4444 : 0x2563eb)); pl.position.set(fx + px + (i % 2 ? 0.08 : -0.08), 0.92, zz); g.add(pl); }
  }
  const lane3 = gz - 1.6;
  flat(g, 0.1, 0.1, 0xffffff, fx, gz, 0.84); // the ball
  spot("foosball", fx - 0.95, gz, Math.PI / 2, [[fx - 0.95, lane3]], { pair: 1 });
  spot("foosball", fx + 0.95, gz, -Math.PI / 2, [[fx + 0.95, lane3]], { pair: 1 });
  const tvx = x1 - 0.35, tvz = gz + 0.9;
  box(g, 0.45, 0.45, 1.6, 0, tvx, 0.225, tvz, { mat: MAT.wood });
  box(g, 0.05, 0.75, 1.3, 0, tvx, 0.9, tvz, { mat: MAT.black });
  const game = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.66), SCREEN.game); game.rotation.y = -Math.PI / 2; game.position.set(tvx - 0.03, 0.9, tvz); g.add(game);
  box(g, 0.3, 0.06, 0.2, 0, tvx, 0.48, tvz - 0.5, { mat: MAT.black });
  for (const [dz, col] of [[-0.45, 0xf97316], [0.45, 0x8b5cf6]]) {
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), std(col, { roughness: 0.95 }));
    bag.scale.set(1, 0.55, 1); bag.position.set(tvx - 1.7, 0.2, tvz + dz); bag.castShadow = true; g.add(bag);
    spot("console", tvx - 1.7, tvz + dz, Math.PI / 2, [[tvx - 1.7, lane3]], { y: 0.12, pair: 2 });
  }
  // Plants and shelves along the edge.
  prop(g, "houseplant_3", { h: 1.1 }, RIGHT_X + 0.4, top + 2.4);
  prop(g, "bookshelf", { h: 1.9 }, x0 + 0.6, Math.min(D - 0.7, gz + 3.0), 0);
  prop(g, "bookcasebooks", { h: 1.9 }, x0 + 1.9, Math.min(D - 0.7, gz + 3.0), 0);
  prop(g, "houseplant_1", { h: 1.2 }, x1 - 0.4, Math.min(D - 0.6, gz + 3.0));
  prop(g, "trashcan_small1", { h: 0.4 }, x0 + 4.9, cbz + 0.1);
  for (const z of plan.corridorsZ) prop(g, "houseplant_6", { h: 1.2 }, 0.6, z + 1.0);
}

// Day and night by New York time.
let hemiLight = null;
const nyHour = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
  return (get("hour") % 24) + get("minute") / 60;
};
const NIGHT_SKY = new THREE.Color(0x8ea2e6), DAY_BG = new THREE.Color(0xe9e4dc), NIGHT_BG = new THREE.Color(0x1b2236), DUSK = new THREE.Color(0xffc48a), WHITE = new THREE.Color(0xffffff);
let clockEl = null;
function applyDaylight() {
  // ?saat=13 previews another hour (for checking day and night); otherwise New York time now.
  const q = new URLSearchParams(location.search).get("saat");
  const h = Number(stage?.dataset.hour ?? (q !== null && q !== "" ? q : NaN));
  const hour = Number.isFinite(h) ? h : nyHour();
  // 1 in the day, 0 at night, with a soft morning and evening.
  const k = hour < 5.5 ? 0 : hour < 7.5 ? (hour - 5.5) / 2 : hour < 17.5 ? 1 : hour < 20 ? 1 - (hour - 17.5) / 2.5 : 0;
  const dusk = hour >= 16.5 && hour < 20 ? Math.min(1, Math.min(hour - 16.5, 20 - hour)) : 0;
  if (hemiLight) { hemiLight.intensity = 0.3 + 1.2 * k; hemiLight.color.copy(NIGHT_SKY).lerp(WHITE, k); }
  if (sunLight) { sunLight.intensity = 0.08 + 1.42 * k; sunLight.color.copy(WHITE).lerp(DUSK, dusk * 0.8); }
  scene.background = NIGHT_BG.clone().lerp(DAY_BG, k);
  windowMat.emissive.set(k > 0.5 ? 0x9fd0ea : 0x1e3a5f); windowMat.emissiveIntensity = 0.25 + (1 - k) * 0.35;
  if (nightGlow) nightGlow.visible = k < 0.6;
  if (stage) stage.dataset.daylight = k > 0.6 ? "day" : k > 0 ? "evening" : "night";
  if (clockEl) {
    const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60);
    clockEl.textContent = `New York ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} · ${k > 0.6 ? "Gündüz" : k > 0 ? "Akşam" : "Gece"}`;
  }
}

// ---------- each person looks different (founder 2026-11-17) ----------
// The CC0 characters share one color atlas: 8 columns of swatches, a colored band (v 0.5 to 0.75) and a band of
// neutrals and skin tones (v 0.75 to 1). Moving a vertex's UV to another column changes that part's color, so every
// person gets their own skin, clothes and hair from a hash of their id, with no new texture.
const MODEL_TONE = { Opus: 0xf59e0b, Sonnet: 0x3b82f6, Haiku: 0x22c55e };
function look(a) {
  const h = hash("look:" + a.id);
  const shirt = (h >>> 3) % 8;
  return {
    h, skin: [5, 6, 7][h % 3], shirt, second: (shirt + 1 + ((h >>> 6) % 7)) % 8,
    hair: ["keep", "brown", "blonde", "ginger", "gray", "keep"][(h >>> 9) % 6],
    glasses: (h >>> 12) % 10 < 3 || a.id === "ceo",
    hat: (h >>> 15) % 10 === 0,
    phones: /qa|test|tester|panel/i.test(a.id + " " + a.role) ? "phone" : /ui|tasar|design/i.test(a.id + " " + a.role) ? "tablet" : null,
    headphones: (h >>> 18) % 10 < 4 && /dev|geliştirici|backend|unity|derleme|desktop/i.test(a.id + " " + a.role),
  };
}
function recolor(body, L) {
  body.traverse((m) => {
    if (!m.isMesh || !m.geometry?.attributes?.uv) return;
    m.geometry = m.geometry.clone();
    const uv = m.geometry.attributes.uv, pos = m.geometry.attributes.position, isHead = /head/.test(m.name);
    // Which colored columns this mesh uses, most used first: the first is the main color, the next the second one.
    const count = new Map();
    for (let i = 0; i < uv.count; i++) { const v = uv.getY(i); if (v >= 0.5 && v < 0.75) { const c = Math.min(7, Math.floor(uv.getX(i) * 8)); count.set(c, (count.get(c) || 0) + 1); } }
    const order = [...count.entries()].sort((x, y) => y[1] - x[1]).map(([c]) => c);
    const map = new Map(order.map((c, i) => [c, i === 0 ? L.shirt : i === 1 ? L.second : (L.shirt + 3 + i) % 8]));
    let midY = 0;
    if (isHead) { for (let i = 0; i < pos.count; i++) midY += pos.getY(i); midY /= pos.count || 1; }
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i), v = uv.getY(i), col = Math.min(7, Math.floor(u * 8));
      let nc = col, nv = v;
      if (v >= 0.75 && col >= 5) nc = L.skin; // skin tones
      else if (v >= 0.5 && v < 0.75) nc = map.get(col) ?? col; // clothes
      else if (isHead && v >= 0.75 && col === 0 && pos.getY(i) > midY && L.hair !== "keep") {
        // Dark hair on the top half of the head gets the person's hair color.
        if (L.hair === "brown") { nc = L.skin === 6 ? 7 : 6; }
        else if (L.hair === "gray") { nc = 3; }
        else { nc = L.hair === "blonde" ? 2 : 3; nv = v - 0.25; }
      }
      if (nc !== col || nv !== v) { uv.setX(i, u + (nc - col) / 8); uv.setY(i, nv); }
    }
    uv.needsUpdate = true;
  });
}
// Where the head and the right hand are, in bone space, per base model (found once from the mesh).
const RIG = {};
function rigOf(name, body) {
  if (RIG[name]) return RIG[name];
  body.updateMatrixWorld(true);
  const headBone = body.getObjectByName("head"), armR = body.getObjectByName("arm-right"), armL = body.getObjectByName("arm-left");
  const headMesh = body.getObjectByName("head-mesh"), bodyMesh = body.getObjectByName("body-mesh");
  if (!headBone || !armR || !headMesh || !bodyMesh) return (RIG[name] = null);
  const v = new THREE.Vector3();
  const local = (mesh, bone, filter) => {
    const out = [];
    const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert();
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      if (filter && !filter(i)) continue;
      mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld).applyMatrix4(inv); out.push(v.clone());
    }
    return out;
  };
  const hb = new THREE.Box3().setFromPoints(local(headMesh, headBone));
  const skinIdx = bodyMesh.geometry.attributes.skinIndex, skinW = bodyMesh.geometry.attributes.skinWeight;
  const bones = bodyMesh.skeleton.bones;
  const handOf = (arm) => {
    const bi = bones.indexOf(arm);
    const pts = local(bodyMesh, arm, (i) => skinIdx.getX(i) === bi && skinW.getX(i) > 0.5);
    if (!pts.length) return new THREE.Vector3(0, -0.1, 0.02);
    const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    const low = pts.filter((p) => p.y < minY + (maxY - minY) * 0.25);
    return low.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / low.length);
  };
  return (RIG[name] = { head: hb, handR: handOf(armR), handL: armL ? handOf(armL) : null });
}
const ACC = { glass: std(0x111111, { roughness: 0.3 }), phone: std(0x111111), cup: std(0xffffff) };
function accessories(body, name, L, a) {
  const rig = rigOf(name, body);
  if (!rig) return;
  const headBone = body.getObjectByName("head");
  const sz = rig.head.getSize(new THREE.Vector3()), c = rig.head.getCenter(new THREE.Vector3());
  const add = (bone, mesh) => { bone.add(mesh); mesh.castShadow = true; return mesh; };
  if (L.glasses) {
    const gw = sz.x * 0.2, gh = sz.y * 0.11, z = rig.head.max.z + sz.z * 0.005, y = c.y + sz.y * 0.02;
    for (const sx of [-1, 1]) { const lens = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, sz.z * 0.03), ACC.glass); lens.position.set(sx * sz.x * 0.19, y, z); add(headBone, lens); }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(sz.x * 0.2, gh * 0.25, sz.z * 0.02), ACC.glass); bridge.position.set(0, y + gh * 0.2, z); add(headBone, bridge);
  }
  if (L.headphones) {
    const col = std([0x111827, 0xef4444, 0x2563eb, 0xffd60a][L.h % 4], { roughness: 0.4 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(sz.x * 0.54, sz.x * 0.05, 6, 18, Math.PI), col);
    band.position.set(0, c.y + sz.y * 0.05, c.z); add(headBone, band);
    for (const sx of [-1, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(sz.y * 0.17, sz.y * 0.17, sz.x * 0.1, 12), col); cup.rotation.z = Math.PI / 2; cup.position.set(sx * sz.x * 0.54, c.y + sz.y * 0.02, c.z); add(headBone, cup); }
  } else if (L.hat) {
    const col = std(MUGS[(L.h >>> 4) % MUGS.length], { roughness: 0.8 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(sz.x * 0.54, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), col);
    cap.scale.y = 0.55; cap.position.set(0, rig.head.max.y - sz.y * 0.22, c.z); add(headBone, cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(sz.x * 0.7, sz.y * 0.04, sz.z * 0.4), col);
    brim.position.set(0, rig.head.max.y - sz.y * 0.2, rig.head.max.z + sz.z * 0.1); add(headBone, brim);
  }
  // Model badge: a small colored gem on the chest (Opus amber, Sonnet blue, Haiku green).
  const model = agentModel(a);
  const torso = body.getObjectByName("torso");
  if (model && torso && MODEL_TONE[model]) {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(sz.x * 0.09), new THREE.MeshBasicMaterial({ color: MODEL_TONE[model] }));
    gem.position.set(sz.x * 0.16, -sz.y * 0.05, rig.head.max.z * 0.62); add(torso, gem);
  }
  // A tester holds a phone, a designer a tablet.
  const armR = body.getObjectByName("arm-right"), armL = body.getObjectByName("arm-left");
  if (L.phones === "phone" && armR) {
    const ph = new THREE.Mesh(new THREE.BoxGeometry(sz.x * 0.16, sz.y * 0.3, sz.z * 0.03), [ACC.phone, ACC.phone, ACC.phone, ACC.phone, SCREEN.idle, ACC.phone]);
    ph.position.copy(rig.handR).add(new THREE.Vector3(0, 0, sz.z * 0.12)); add(armR, ph);
  }
  if (L.phones === "tablet" && armL && rig.handL) {
    const tb = new THREE.Mesh(new THREE.BoxGeometry(sz.x * 0.45, sz.y * 0.34, sz.z * 0.03), [ACC.phone, ACC.phone, ACC.phone, ACC.phone, SCREEN.design, ACC.phone]);
    tb.position.copy(rig.handL).add(new THREE.Vector3(0, sz.y * 0.05, sz.z * 0.14)); tb.rotation.x = -0.4; add(armL, tb);
  }
  // A cup in the right hand, shown only at the coffee bar.
  if (armR) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(sz.x * 0.09, sz.x * 0.08, sz.y * 0.2, 10), std(MUGS[L.h % MUGS.length]));
    cup.position.copy(rig.handR).add(new THREE.Vector3(0, sz.y * 0.04, sz.z * 0.1)); cup.visible = false; cup.name = "cup"; add(armR, cup);
  }
}

// ---------- life: idle people take breaks, chat and play (founder 2026-11-17) ----------
// A person whose status is idle sits back at the desk and now and then walks out: to the coffee bar, a sofa, the
// foosball table or the console, or to a colleague's desk for a short chat. Working people type, waiting people stand
// with a "!", blocked ones have a red light, offline desks are empty with the screen off. Only a few people are out
// at once (8 on a big screen, 3 on a phone, none with reduced motion), so the page stays smooth.
const CHAT = [
  ["Kahve içtin mi?", "Az önce, sağ ol!"], ["Build geçti mi?", "Yeşil, sorun yok."], ["Yeni ikona baktın mı?", "Çok iyi olmuş!"],
  ["Testler nasıl?", "Hepsi geçti."], ["Öğlen ne yiyoruz?", "Pizza?"], ["CEO evet dedi mi?", "Bekliyoruz."],
  ["Bir bakar mısın?", "Hemen geliyorum."], ["Mağaza notları hazır mı?", "Yarına hazır."], ["Hata çıktı mı?", "Bir tane, çözdüm."],
  ["Bu hafta video var mı?", "İki tane, pazar."], ["Harika iş!", "Teşekkürler!"], ["Toplantı kaçta?", "Saat üçte."],
];
const SAY = { coffee: ["Kahve molası", "Bir kahve daha"], water: ["Su içiyorum"], sofa: ["Biraz dinleniyorum", "Mola"], foosball: ["Gol!", "Rövanş!", "Bir tane daha"], console: ["Son bölüm", "Bunu geçeceğim"] };
const DOING = { coffee: "Kahve makinesinde", water: "Su sebilinde", sofa: "Kanepede dinleniyor", foosball: "Langırt oynuyor", console: "Oyun köşesinde", chat: "Sohbet ediyor" };
const SPEED = 1.9; // meters per second
const outMax = () => (reduce ? 0 : stage.clientWidth < 600 ? 3 : 8);
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const outCount = () => people.filter((p) => p.life && p.life.state !== "desk" && p.life.state !== "host").length;
function aisleZ(s) { return Math.min(s.z + 1.45, s.room.z + s.room.d - 0.35); }
function deskExit(s) {
  const r = s.room, a = aisleZ(s), dx = doorX(r);
  return [[s.x, s.z + 0.72], [s.x, a], [dx, a], [dx, r.z + r.d + 0.3], [dx, corrZ(r)]];
}
function pathTo(s, target) {
  const pts = deskExit(s);
  const [, cz] = pts.at(-1);
  if (target.slot) {
    // To a colleague's desk: along the corridors, in at the door, to the side of the desk.
    const t = target.slot, back = deskExit(t).reverse(); // corridor ... chair
    const tz = corrZ(t.room);
    if (Math.abs(cz - tz) > 0.01) pts.push([CROSS_X, cz], [CROSS_X, tz]);
    const [ex, ez] = target.end || [t.x + 0.95, t.z + 0.45];
    pts.push(...back.slice(0, 3), [ex, aisleZ(t)], [ex, ez]);
  } else {
    // To the break area: the vertical corridor, then the spot's own lane.
    const first = target.via[0];
    pts.push([CROSS_X, cz], [CROSS_X, first[1]], ...target.via, [target.x, target.z]);
  }
  // Drop points that repeat.
  const out = [];
  for (const p of pts) { const last = out.at(-1); if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > 0.01) out.push(p); }
  return out.map(([x, z]) => new THREE.Vector3(x, 0, z));
}
function lens(path) { const segs = []; let len = 0; for (let i = 1; i < path.length; i++) { const l = path[i].distanceTo(path[i - 1]); segs.push(l); len += l; } return { segs, len }; }
function act(p, name, ts = 1, w = 1) { p.mx.stopAllAction(); return p.play(name, w, ts); }
function cupVisible(p, on) { const c = p.body?.getObjectByName("cup"); if (c) c.visible = on; }
function sitAtDesk(p) {
  const s = p.slot;
  p.actor.position.set(s.x, 0.02, s.z + 0.72);
  p.actor.rotation.y = Math.PI;
  act(p, "sit");
  p.mx.update(0.5);
  p.body.rotation.x = -0.22;
  p.mixer = null;
  cupVisible(p, false);
  p.walking = false;
  p.life.state = "desk";
  p.life.t = 8 + Math.random() * 35;
  p.life.doing = null;
}
function startOuting(p, budget = 1) {
  if (Math.random() < 0.55 && startMeeting(p, budget)) return;
  const options = [];
  const free = (k) => SPOTS.filter((x) => x.kind === k && !x.used);
  for (const k of ["coffee", "coffee", "water", "sofa", "sofa", "foosball", "console"]) if (free(k).length) options.push(k);
  const hosts = people.filter((q) => q !== p && q.life && q.life.state === "desk" && q.actor && !q.walking);
  if (hosts.length) options.push("chat", "chat", "chat");
  if (!options.length) return;
  const kind = pickOne(options);
  let target;
  if (kind === "chat") {
    const near = hosts.filter((q) => q.slot.room === p.slot.room || corrZ(q.slot.room) === corrZ(p.slot.room));
    const host = pickOne(near.length && Math.random() < 0.7 ? near : hosts);
    target = { slot: host.slot, host };
    host.life.state = "host";
  } else {
    // A game wants a partner, so prefer the spot next to someone already playing.
    const list = free(kind);
    target = list.find((x) => x.pair && SPOTS.some((y) => y.pair === x.pair && y.used)) || pickOne(list);
    target.used = p.agent.id;
  }
  goTo(p, target, kind);
}
function goTo(p, target, kind) {
  const path = pathTo(p.slot, target);
  p.life = { ...p.life, state: "go", kind, target, path, ...lens(path), d: 0, t: 0 };
  if (kind === "meeting") p.meeting = target.meeting;
  p.body.rotation.x = 0;
  act(p, "walk", 1.3);
  p.mixer = p.mx;
  p.walking = true;
}
function pointOn(L, d) {
  let rest = d;
  for (let i = 0; i < L.segs.length; i++) {
    if (rest <= L.segs[i] || i === L.segs.length - 1) {
      const k = L.segs[i] ? Math.min(1, rest / L.segs[i]) : 1;
      return { p: L.path[i].clone().lerp(L.path[i + 1], k), dir: L.path[i + 1].clone().sub(L.path[i]) };
    }
    rest -= L.segs[i];
  }
  return { p: L.path.at(-1).clone(), dir: new THREE.Vector3(0, 0, 1) };
}
function arrive(p) {
  const L = p.life;
  L.state = "do"; L.t = 0;
  p.walking = false;
  if (L.kind === "meeting") {
    p.actor.rotation.y = L.target.rot; // face the colleague at the desk
    act(p, "idle");
    L.dur = Infinity; // the meeting ends it
    L.lines = [];
  } else if (L.kind === "chat") {
    p.actor.rotation.y = -Math.PI / 2; // face the colleague
    act(p, "idle");
    L.dur = 7 + Math.random() * 3;
    const lines = pickOne(CHAT);
    L.lines = [[p, lines[0], 0.3], [L.target.host, lines[1], 2.6], [p, pickOne(["Tamam!", "Süper.", "Görüşürüz."]), 5]];
    const host = L.target.host;
    if (host.actor) host.actor.rotation.y = Math.PI - 0.7; // the colleague turns a little
  } else {
    const t = L.target;
    p.actor.position.set(t.x, t.y || 0, t.z);
    p.actor.rotation.y = t.rot;
    if (t.kind === "sofa") { act(p, "sit"); L.dur = 12 + Math.random() * 10; }
    else if (t.kind === "console") { act(p, "sit"); p.play("holding-both", 0.7); L.dur = 12 + Math.random() * 8; }
    else if (t.kind === "foosball") { act(p, "interact-right", 1.6); p.play("interact-left", 0.6, 1.3); L.dur = 10 + Math.random() * 8; }
    else { act(p, "interact-right", 0.9); L.dur = 6 + Math.random() * 3; L.cupAt = 1.8; }
    L.lines = Math.random() < 0.6 ? [[p, pickOne(SAY[t.kind] || ["Mola"]), 1 + Math.random() * 2]] : [];
  }
}
function leave(p) {
  const L = p.life;
  if (L.kind === "meeting") p.meeting = null;
  else if (L.kind === "chat") { const host = L.target.host; if (host.life?.state === "host") { host.life.state = "desk"; host.life.t = 10 + Math.random() * 30; if (host.actor) host.actor.rotation.y = Math.PI; } }
  else L.target.used = null;
  L.path = [...L.path].reverse();
  Object.assign(L, lens(L.path), { state: "back", d: 0, lines: [] });
  p.body.rotation.x = 0;
  act(p, "walk", 1.3);
  if (L.kind === "coffee") { cupVisible(p, true); p.play("holding-right", 0.8); }
  p.walking = true;
}
const sayEls = new Set();
function say(p, text) {
  if (!p.actor || !tagsEl) return;
  const e = el("div", { class: "of-say" }, text);
  tagsEl.append(e);
  const rec = { e, p, until: performance.now() + 2300 };
  sayEls.add(rec);
}
const sayHead = new THREE.Vector3();
function placeSay() {
  const now = performance.now();
  for (const r of sayEls) {
    if (now > r.until || !r.p.actor) { r.e.remove(); sayEls.delete(r); continue; }
    sayHead.set(r.p.actor.position.x, r.p.actor.position.y + 1.75, r.p.actor.position.z);
    place(r.e, sayHead);
  }
}
function stepLife(dt) {
  if (reduce || !peopleGroup) return;
  let out = outCount();
  for (const p of people) {
    const L = p.life;
    if (!L || !p.actor) continue;
    if (L.state === "desk") {
      L.t -= dt;
      if (L.t <= 0) { L.t = 6 + Math.random() * 20; if (out < outMax() && current?.fromRec !== p) { startOuting(p, outMax() - out); out = outCount(); } }
      continue;
    }
    if (L.state === "host") continue;
    if (L.state === "go" || L.state === "back") {
      L.d += SPEED * dt;
      const { p: at, dir } = pointOn(L, Math.min(L.d, L.len));
      p.actor.position.copy(at);
      if (dir.lengthSq() > 1e-6) p.actor.rotation.y = Math.atan2(dir.x, dir.z);
      if (L.d >= L.len) { if (L.state === "go") arrive(p); else sitAtDesk(p); }
      continue;
    }
    // Doing the activity.
    L.t += dt;
    if (L.cupAt && L.t > L.cupAt) { L.cupAt = 0; cupVisible(p, true); act(p, "holding-right"); }
    for (const line of L.lines) if (!line.done && L.t >= line[2]) { line.done = true; say(line[0], line[1]); }
    if (L.t >= L.dur) leave(p);
  }
  stepMeetings(dt);
  if (stage) stage.dataset.out = String(outCount());
}
function doingText(p) {
  const a = p?.agent;
  if (!a) return "-";
  if (a.status === "offline") return "Masası boş, oturum kapalı";
  if (a.status === "working") return "Masasında çalışıyor";
  if (a.status === "waiting_owner") return "Masasının yanında, senden evet bekliyor";
  if (a.status === "blocked") return "Takıldı, yardım bekliyor";
  const L = p.life;
  if (!L || L.state === "desk") return "Masasında, boşta";
  if (p.meeting) return `Toplantıda: ${p.meeting.topic.text}`;
  if (L.state === "host") return "Masasında sohbet ediyor";
  if (L.state === "back") return "Masasına dönüyor";
  return DOING[L.kind] || "Molada";
}


// ---------- personas and work talk (founder 2026-11-17) ----------
// Every session has a lasting persona (public/office/personas.json: name, short bio, way of talking, expertise, likes
// and dislikes). Now and then two to four people gather at one desk and talk about REAL work from the board: a task
// card (title and stage), a session's last action or a mail label. The lines come from rule based templates in the
// browser (no model call, no cost). Only those board titles go into the bubbles; anything that looks like a key, a
// link, an email address or a long number is dropped and the talk says "bu iş" instead.
let PERSONAS = {};
const PERSONA_URL = "/office/personas.json";
const KIND_RE = [
  ["security", /güvenlik|security/i], ["lead", /lider|lead|architect|ceo|mimar/i], ["qa", /\bqa\b|test elemanı|kontrol/i],
  ["tester", /test(çi| oyuncu| kullanıcı)|tester|oyuncu/i], ["design", /tasar|ui\b|design/i], ["store", /mağaza|store|aso|app store|google play|seo/i],
  ["data", /analist|analiz|veri|data/i], ["social", /reklam|sosyal|shorts|içerik|yazar/i], ["pm", /owner|analyst|asistan|panel/i], ["dev", /./],
];
const NAMES_F = ["Aylin", "Beren", "Dilara", "Esra", "Hande", "Jale", "Leyla", "Nil", "Özge", "Tuğçe"];
const NAMES_M = ["Alp", "Cenk", "Doruk", "Erdem", "Fırat", "Halil", "İlker", "Kutay", "Levent", "Sinan"];
function personaOf(a) {
  if (!a) return null;
  if (PERSONAS[a.id]) return PERSONAS[a.id];
  const h = hash("persona:" + a.id), f = h % 2 === 0;
  const kind = KIND_RE.find(([, re]) => re.test(shortName(a.role)))[0];
  return (PERSONAS[a.id] = { name: (f ? NAMES_F : NAMES_M)[(h >>> 3) % 10], body: f ? "f" : "m", kind, style: "", bio: shortName(a.role), expertise: "", likes: "", dislikes: "", made: true });
}
const kindOf = (a) => personaOf(a)?.kind || "dev";
const SECRET_RE = /@|https?:\/\/|\b(key|token|secret|şifre|parola|password|apikey|api[_ -]key)\b|[A-Za-z0-9_-]{28,}|\d{7,}/i;
function cleanTopic(s) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t || SECRET_RE.test(t) || /^hazır, iş gelince/i.test(t)) return "";
  return t.length > 48 ? t.slice(0, 46).trimEnd() + "…" : t;
}
function topicsNow() {
  const out = [];
  for (const t of tasks || []) {
    const text = cleanTopic(t.title);
    if (text && t.status !== "done") out.push({ text, stage: cleanTopic(t.stage), status: t.status, owner: t.assignee_id, src: "task" });
  }
  for (const a of agents) {
    const text = cleanTopic(a.last_action);
    if (text && a.status !== "offline") out.push({ text, status: a.status === "working" ? "doing" : a.status, owner: a.id, src: "action" });
  }
  for (const m of mail) { const text = cleanTopic(m.label); if (text) out.push({ text, owner: m.to_id, from: m.from_id, src: "mail" }); }
  return out;
}
// Lines per kind: the host opens, people answer in their own way (they may disagree), a lead closes with a decision.
const OPEN = {
  lead: (T) => `“${T}”: kısaca durum alalım.`, dev: (T) => `“${T}” üzerindeyim, bugün bitirmek istiyorum.`, qa: (T) => `“${T}” için test listesini çıkardım.`,
  tester: (T) => `“${T}”: oyuncu olarak denedim, konuşalım.`, design: (T) => `“${T}” için ekranlara bakmamız lazım.`, store: (T) => `“${T}” mağaza tarafını da etkiliyor.`,
  data: (T) => `“${T}”: rakamları getirdim.`, security: (T) => `“${T}” öncesi bir güvenlik turu atalım.`, pm: (T) => `“${T}”: sahibi ve tarihi netleştirelim.`,
  social: (T) => `“${T}”: bunu paylaşımlara da taşıyalım mı?`,
};
const SAYK = {
  qa: [(t) => (t.stage ? `${t.stage} tamam ama telefonda bir tur daha deneyelim.` : "Kapatmadan önce bir tur daha test edelim."), () => "Açık hata kaydı var mı? Onu kapatmadan çıkmayalım."],
  dev: [() => "Bence yeterli, yarın çıkarabiliriz.", () => "Kod hazır, sadece derleme kaldı.", (t) => (t.stage ? `Şu an ${t.stage}, akşama biter.` : "Bugün bitiririm.")],
  security: [() => "Bu iş kullanıcı verisine dokunuyor mu?", () => "Anahtarlar kodda değil, değil mi? Bir bakayım."],
  store: [() => "Mağaza metnine de yansıtmalıyız.", () => "Karakter sınırını aşmasın, sayarak yazalım.", () => "İnceleme kurallarına uyuyor mu, kontrol edeyim."],
  design: [() => "Ekranlar değişiyorsa bir taslak çizeyim.", () => "Bunu daha sade gösterebiliriz."],
  data: [() => "Rakamlar bunu destekliyor.", () => "Önce son haftanın verisine bakalım."],
  tester: [() => "Oyuncu gözüyle bu kısım biraz karışık.", () => "Ben denedim, akış güzel."],
  pm: [() => "Sahibi ve tarihi panoya yazıyorum.", () => "Notu alıyorum, yarın hatırlatırım."],
  social: [() => "Bunu kısa bir videoyla anlatabiliriz.", () => "Haftalık postlara ekleyelim."],
  lead: [() => "Riskleri yazalım, sonra karar verelim."],
};
const STATUS_LINE = { blocked: "Takıldık, kim yardım edebilir?", waiting_owner: "Sahibin evetini bekliyoruz, o gelince başlarız." };
function talkLines(topic, host, members) {
  const T = topic.text;
  const head = [[host, (OPEN[kindOf(host.agent)] || OPEN.dev)(T)]];
  if (STATUS_LINE[topic.status]) head.push([members[0], STATUS_LINE[topic.status]]);
  const answers = members.map((m) => [m, pickOne(SAYK[kindOf(m.agent)] || SAYK.dev)(topic)]);
  // A short disagreement between a careful voice and a quick one, when both are in the room.
  const careful = members.find((m) => ["qa", "security"].includes(kindOf(m.agent)));
  const quick = [host, ...members].find((m) => kindOf(m.agent) === "dev" && m !== careful);
  let argue = careful && quick ? [[quick, "Bir gün daha beklersek takvim kayar ama."], [careful, "Kayarsa kaysın, hatalı çıkmasın."]] : [];
  const lead = [host, ...members].find((m) => kindOf(m.agent) === "lead");
  const close = [lead ? [lead, pickOne(["Karar: önce son test, sonra yayın.", "Tamam, karar: yarın sabah son kontrol, sonra devam.", "Anlaştık. Notları panoya yazalım."])]
    : [host, "Tamam, ona göre ilerliyorum. Teşekkürler!"]];
  // At most 6 bubbles; the decision is always the last one.
  if (head.length + 1 + argue.length + close.length > 6) argue = [];
  return [...head, ...answers.slice(0, Math.max(1, 6 - head.length - argue.length - close.length)), ...argue, ...close];
}
let meetings = [];
const SEATS = [[0.95, 0.45, -Math.PI / 2], [-0.95, 0.45, Math.PI / 2], [0.5, 1.4, Math.PI], [-0.5, 1.4, Math.PI]];
function startMeeting(p, budget) {
  const present = (q) => q.actor && !q.walking && !q.meeting && (!q.life || q.life.state === "desk") && q.agent.status !== "waiting_owner";
  const byId = new Map(people.map((q) => [q.agent.id, q]));
  const all = topicsNow().filter((t) => byId.get(t.owner) && byId.get(t.owner) !== p && present(byId.get(t.owner)));
  if (!all.length) return false;
  // Prefer work from the person's own department.
  const mine = all.filter((t) => deptOf(t.owner) === deptOf(p.agent.id));
  const topic = pickOne(mine.length && Math.random() < 0.75 ? mine : all);
  const host = byId.get(topic.owner);
  const free = people.filter((q) => q !== p && q !== host && q.life && present(q));
  const rank = (q) => (deptOf(q.agent.id) === deptOf(host.agent.id) ? 0 : 2) + (["qa", "security", "lead", "store"].includes(kindOf(q.agent)) ? 0 : 1) + Math.random();
  const fromMail = topic.from && byId.get(topic.from) && free.includes(byId.get(topic.from)) ? [byId.get(topic.from)] : [];
  const extra = [...fromMail, ...free.filter((q) => !fromMail.includes(q)).sort((x, y) => rank(x) - rank(y))].slice(0, Math.max(0, Math.min(2, budget - 1, Math.floor(Math.random() * 3))));
  const members = [p, ...extra];
  const mt = { topic, host, members, t: 0, started: false, lines: talkLines(topic, host, members), at: Date.now() };
  members.forEach((m, i) => {
    const [dx, dz, rot] = SEATS[i];
    goTo(m, { slot: host.slot, end: [host.slot.x + dx, host.slot.z + dz], rot, meeting: mt }, "meeting");
  });
  host.meeting = mt;
  if (host.life) host.life.state = "host";
  meetings.push(mt);
  return true;
}
function stepMeetings(dt) {
  for (const mt of [...meetings]) {
    mt.t += dt;
    const here = mt.members.every((m) => m.life?.state === "do");
    if (!mt.started && (here || mt.t > 40)) {
      mt.started = true; mt.t0 = mt.t;
      if (mt.host.actor && mt.host.agent.status !== "working") mt.host.actor.rotation.y = Math.PI - 0.5;
      const names = [mt.host, ...mt.members].map((m) => personaOf(m.agent).name);
      for (const m of [mt.host, ...mt.members]) m.lastTopic = { text: mt.topic.text, with: names.filter((n) => n !== personaOf(m.agent).name), at: new Date().toISOString() };
    }
    if (!mt.started) continue;
    const k = Math.floor((mt.t - mt.t0) / 2.6);
    while ((mt.said || 0) <= k && (mt.said || 0) < mt.lines.length) { const [who, text] = mt.lines[mt.said || 0]; say(who, text); mt.said = (mt.said || 0) + 1; }
    if (mt.t - mt.t0 > mt.lines.length * 2.6 + 1.5) {
      for (const m of mt.members) if (m.life?.state === "do" || m.life?.state === "go") leave(m);
      mt.host.meeting = null;
      if (mt.host.life?.state === "host") { mt.host.life.state = "desk"; mt.host.life.t = 15 + Math.random() * 30; }
      if (mt.host.actor && mt.host.agent.status !== "waiting_owner") mt.host.actor.rotation.y = Math.PI;
      meetings = meetings.filter((x) => x !== mt);
      if (stage) stage.dataset.talks = String((Number(stage.dataset.talks) || 0) + 1);
    }
  }
}

// ---------- people, bubbles and labels ----------
let people = []; // { agent, slot, actor, mixer, body, bubble }
let peopleGroup = null;
let deptTags = [];
function makeActor(name, agent) {
  const src = M[name];
  if (!src) return null;
  const body = cloneSkinned(src.scene);
  body.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
  const L = agent ? look(agent) : null;
  if (L) recolor(body, L);
  const actor = fit(body, { h: 1.35 });
  if (L) { try { accessories(body, name, L, agent); } catch { /* a missing bone only drops the extras */ } }
  const mixer = new THREE.AnimationMixer(body);
  const play = (n, wgt = 1, ts = 1) => { const c = THREE.AnimationClip.findByName(src.animations, n); if (!c) return null; const ac = mixer.clipAction(c); ac.setEffectiveWeight(wgt); ac.timeScale = ts; ac.reset().play(); return ac; };
  return { actor, body, mixer, play };
}
// The model follows the persona (a woman or a man), the rest of the look comes from the id.
const personName = (a) => { const b = personaOf(a)?.body; const list = b ? PEOPLE.filter((n) => n.includes(b === "f" ? "female" : "_male")) : PEOPLE; return list[hash(a.id) % list.length]; };

function buildPeople() {
  if (peopleGroup) { scene.remove(peopleGroup); }
  peopleGroup = new THREE.Group();
  scene.add(peopleGroup);
  for (const p of people) p.bubble.remove();
  for (const r of sayEls) r.e.remove();
  sayEls.clear();
  for (const x of SPOTS) x.used = null;
  meetings = [];
  const lastTopics = new Map(people.filter((p) => p.lastTopic).map((p) => [p.agent.id, p.lastTopic]));
  people = [];
  for (const s of slots) {
    // Empty desks and offline desks: chair pushed in, screen off.
    if (s.chair) s.chair.position.z = s.z + (s.agent && s.agent.status !== "offline" ? 0.75 : 0.55);
    if (s.screen) s.screen.material = SCREEN.off || s.screen.material;
    if (!s.agent) continue;
    const a = s.agent;
    if (s.screen && SCREEN.code) s.screen.material = a.status === "working" ? SCREEN[workKind(a)] : a.status === "idle" ? SCREEN.idle : a.status === "waiting_owner" ? SCREEN.wait : a.status === "blocked" ? SCREEN.err : SCREEN.off;
    // Offline: the desk stays empty (founder 2026-11-17), only the name and the click area remain.
    const made = a.status === "offline" ? null : makeActor(personName(a), a);
    let rec = { agent: a, slot: s, actor: null, mixer: null };
    if (made) {
      const { actor, body, mixer, play } = made;
      if (a.status === "waiting_owner") {
        actor.position.set(s.x + 0.95, 0, s.z + 0.2);
        actor.rotation.y = -0.6;
        play("idle");
      } else {
        actor.position.set(s.x, 0.02, s.z + 0.72);
        actor.rotation.y = Math.PI;
        play("sit");
        if (a.status === "working") play("interact-right", 0.65, 1.7);
        if (a.status === "idle") body.rotation.x = -0.22;
        if (a.status === "blocked") play("interact-left", 0.25, 0.4);
      }
      actor.userData.agentId = a.id;
      body.userData.agentId = a.id;
      peopleGroup.add(actor);
      // Performance with 52 people (founder 2026-11-13): only working, waiting and blocked people keep a running
      // animation; idle people are posed once and cost nothing per frame until they get up.
      const moving = !reduce && (a.status === "working" || a.status === "waiting_owner" || a.status === "blocked");
      mixer.update(0.5);
      rec = { ...rec, actor, body, mx: mixer, play, mixer: moving ? mixer : null };
      if (a.status === "idle") rec.life = { state: "desk", t: 2 + Math.random() * 25 };
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
    const model = agentModel(a);
    const bubble = el("div", { class: "of-name" + (a.status === "offline" ? " off" : "") + (quiet ? " quiet" : ""), style: `--c:${ss.dot}`, title: `${personaOf(a).name}, ${a.role}: ${ss.label}` },
      el("i"), el("span", {}, bubbleName(a.role, s.room.key)),
      model ? el("small", { class: "of-mdl " + model.toLowerCase(), title: model }, model[0]) : null,
      a.status === "blocked" ? el("em", {}, "takıldı") : null,
      a.status === "waiting_owner" ? el("b", {}, "!") : null);
    bubble.addEventListener("click", () => openPanel(a.id));
    tagsEl.append(bubble);
    rec.bubble = bubble;
    rec.lastTopic = lastTopics.get(a.id) || null;
    rec.rank = quiet ? (a.status === "offline" ? 2 : 1) : 0;
    people.push(rec);
  }
  // Department labels: rebuilt with the people, because DİĞER and the empty rooms change names.
  for (const t of deptTags) t.el.remove();
  deptTags = ROOMS.map((r) => {
    const main = deptSkills(r.key).slice(0, 5);
    const e = el("div", { class: "of-dept", style: `--c:${r.color}`, title: main.length ? "Ana beceriler: " + main.join(", ") : "Beceri yazılmamış", role: "button", tabindex: "0" }, el("i"), roomLabel(r));
    e.addEventListener("click", () => openDeptPanel(r));
    e.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openDeptPanel(r); } });
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
  // On a big stage (full screen, the full page) idle and offline people may take any free spot, so names show for
  // everyone when there is room.
  if (kind === "name" && elm.classList.contains("quiet") && !elm.classList.contains("mini") && stage.clientWidth < 1400) tries.splice(4);
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
  const key = [W0, H0, camera.zoom, ...camera.position.toArray().map((v) => v.toFixed(3)), ...people.map((p) => (p.walking ? 1 : 0) + (p.life ? p.life.state + (p.life.kind || "") : "")), selected].join("|");
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
    p.bubble.classList.toggle("walk", !!p.walking);
    if (p.walking) { p.bubble.style.display = "none"; continue; }
    const base = p.actor ? p.actor.position : new THREE.Vector3(p.slot.x, 0, p.slot.z + 0.72);
    head.set(base.x, (p.agent.status === "waiting_owner" || (p.life && p.life.state === "do" && p.life.kind !== "sofa" && p.life.kind !== "console") ? 1.6 : 1.45) + (base.y || 0), base.z);
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
  const made = makeActor(personName(fromRec?.agent || { id: m.from_id }), fromRec?.agent || null);
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
  // The sender gets up for the walk; someone who is out on a break stays where they are.
  const atDesk = fromRec && (!fromRec.life || fromRec.life.state === "desk");
  if (atDesk && fromRec.actor) fromRec.actor.visible = false;
  if (atDesk) fromRec.walking = true;
  current = { id: m.id, path, segs, len, oneWay, t: 0, made, env, fromRec: atDesk ? fromRec : null, to, dropped: false, label: String(m.label || "") };
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
  stepLife(Math.min(0.25, raw)); // real time too, so breaks last as long on a slow device
  if (!reduce && SCREEN.code) {
    // Code and designs scroll up, charts slide on, the game moves, and the server lights blink.
    SCREEN.code.map.offset.y -= dt * 0.05; SCREEN.design.map.offset.y -= dt * 0.02; SCREEN.chart.map.offset.x += dt * 0.04; SCREEN.game.map.offset.x += dt * 0.08;
    const blink = Math.sin(performance.now() / 260) > 0;
    MAT.led.color.setHex(blink ? 0x4ade80 : 0x14532d); MAT.led2.color.setHex(blink ? 0x0c4a6e : 0x38bdf8);
  }
  controls?.update();
  renderer.render(scene, camera);
  placeTags();
  placeSay();
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
  deskKits(office);
  applyDaylight();

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
  hemiLight = new THREE.HemisphereLight(0xffffff, 0xd9c7a8, 1.5);
  scene.add(hemiLight);
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
  try { const r = await fetch(PERSONA_URL, { cache: "no-store" }); if (r.ok) Object.assign(PERSONAS, (await r.json()).personas || {}); } catch { /* the page makes personas from the role */ }
  DESK_Y = new THREE.Box3().setFromObject(fit(M.table.scene.clone(true), { w: 1.5 })).max.y;
  makeScreens();
  clockEl = el("div", { class: "of-clock", "aria-live": "off" });
  stage.append(clockEl);

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
  // Map style (founder 2026-11-13): drag pans, the wheel and a pinch zoom toward the pointer, right drag turns.
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.zoomToCursor = true;
  new ResizeObserver(resize).observe(stage);
  resize();
  renderer.domElement.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8) pick(e);
    down = null;
  });
  stage.dataset.ready = "1";
  setInterval(applyDaylight, 60000);
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

// ---------- big view: full screen button and the full page (founder 2026-11-13) ----------
// "Tam ekran" uses the Fullscreen API on the stage; where that is not allowed (iOS Safari) the stage covers the
// window instead. Esc or "Kapat" leaves both. On /admin/office/full the board is a side panel that opens and closes.
const fullBtn = document.getElementById("of-full-btn");
const fullX = document.getElementById("of-full-x");
const isMax = () => document.fullscreenElement === stage || stage?.classList.contains("of-max");
function syncFull() {
  const on = isMax();
  if (fullX) fullX.hidden = !on;
  if (fullBtn) fullBtn.hidden = on;
  document.documentElement.style.overflow = stage?.classList.contains("of-max") ? "hidden" : "";
}
async function enterFull() {
  if (!stage) return;
  try {
    if (stage.requestFullscreen && document.fullscreenEnabled !== false) await stage.requestFullscreen();
    else throw new Error("no fullscreen");
  } catch { stage.classList.add("of-max"); }
  syncFull();
}
async function exitFull() {
  if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* already out */ } }
  stage?.classList.remove("of-max");
  syncFull();
}
fullBtn?.addEventListener("click", enterFull);
fullX?.addEventListener("click", exitFull);
document.addEventListener("fullscreenchange", syncFull);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && stage?.classList.contains("of-max")) exitFull(); });
const boardToggle = document.getElementById("of-board-toggle");
if (boardToggle && mainEl) {
  if (innerWidth < 1000) { mainEl.classList.add("closed"); boardToggle.setAttribute("aria-expanded", "false"); }
  boardToggle.addEventListener("click", () => {
    const closed = mainEl.classList.toggle("closed");
    boardToggle.setAttribute("aria-expanded", String(!closed));
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
    if (Array.isArray(j.notes)) { notes = j.notes; renderNotes(); }
    if (Array.isArray(j.skill_use)) skillUse = j.skill_use;
    if (skillsEl && !skillsEl.hidden) renderSkills();
    if (Array.isArray(j.tasks) || j.tasks === null) { tasks = j.tasks; renderBoard(); if (openTaskId) openTask(openTaskId, true); }
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
