/**
 * Temps de la chronique : date et heure du monde, nuits qui passent (réveil), aube, ellipses,
 * torpeur, événements du calendrier (révélés au fil de la chronique).
 */
import * as C from "./calendar-math.mjs";
import { playerCharacters } from "../apps/xp-ledger.mjs";
import { hasStatus } from "../status.mjs";
import { loc, registerLocalizable } from "../i18n.mjs";

const SOCKET = "system.noctis";
const isGM = () => game.users.activeGM?.isSelf;

export const CATEGORIES = {
  politics: { label: "NOCTIS.js.Politique", icon: "fa-solid fa-crown", color: "#9a7a2a" },
  combat: { label: "Combat", icon: "fa-solid fa-khanda", color: "#8a1c1c" },
  meeting: { label: "NOCTIS.js.Rencontre", icon: "fa-solid fa-handshake", color: "#2f4a6a" },
  death: { label: "NOCTIS.js.Mort", icon: "fa-solid fa-cross", color: "#2b2118" },
  travel: { label: "NOCTIS.js.Voyage", icon: "fa-solid fa-compass", color: "#2f5a3a" },
  mystery: { label: "NOCTIS.js.Mystere", icon: "fa-solid fa-eye", color: "#4a2a6a" },
  blood: { label: "NOCTIS.js.SangEtSerments", icon: "fa-solid fa-droplet", color: "#6e0f14" },
  memory: { label: "NOCTIS.js.Souvenir", icon: "fa-solid fa-feather", color: "#5a3a22" },
  other: { label: "NOCTIS.js.Autre", icon: "fa-solid fa-circle", color: "#6b6358" }
};

/** Durée de la torpeur selon la Voie, en jours. */
const TORPOR_DAYS = { 10: 1, 9: 3, 8: 7, 7: 14, 6: 30, 5: 365, 4: 3652, 3: 18262, 2: 36525, 1: 182625, 0: 365250 };
const TORPOR_LABEL = { 10: "NOCTIS.js.UnJour", 9: "NOCTIS.js.TroisJours", 8: "NOCTIS.js.UneSemaine", 7: "NOCTIS.js.DeuxSemaines", 6: "NOCTIS.js.UnMois", 5: "NOCTIS.js.UnAn", 4: "NOCTIS.js.DixAns", 3: "NOCTIS.js.CinquanteAns", 2: "NOCTIS.js.UnSiecle", 1: "NOCTIS.js.CinqSiecles", 0: "NOCTIS.js.UnMillenaireOuPlus" };

export function registerTimeSettings() {
  const refresh = () => {
    for (const id of ["noctis-calendar", "noctis-calendar-gm"]) foundry.applications.instances?.get?.(id)?.refresh?.();
    renderClock();
  };
  game.settings.register("noctis", "chronicleTime", { scope: "world", config: false, type: Object, default: { year: 1197, month: 11, day: 1, hour: 19, minute: 0 }, onChange: refresh });
  game.settings.register("noctis", "calendarEvents", { scope: "world", config: false, type: Array, default: [], onChange: refresh });
  game.settings.register("noctis", "latitude", {
    name: loc("NOCTIS.js.LatitudeDeLaChronique"), hint: loc("NOCTIS.js.SertAuCalculDuLeverEt"),
    scope: "world", config: true, type: Number, default: 46, range: { min: 30, max: 65, step: 1 }, onChange: refresh
  });
  game.settings.register("noctis", "showClock", {
    name: loc("NOCTIS.js.AfficherLaBarreDeLaChronique"), hint: loc("NOCTIS.js.BarreSurLeBordGaucheDe"),
    scope: "client", config: true, type: Boolean, default: true, onChange: () => renderClock()
  });
}

/* -------------------------------------------- */
/*  Lecture                                      */
/* -------------------------------------------- */

export const getTime = () => foundry.utils.deepClone(game.settings.get("noctis", "chronicleTime"));
export const nowAbs = () => C.toAbs(getTime());
const lat = () => { try { return game.settings.get("noctis", "latitude"); } catch (e) { return 46; } };

/** Lever et coucher du soleil d'un jour, en minutes absolues. */
export function sunAbs(jdn) {
  const s = C.sunTimes(jdn, lat());
  return { rise: jdn * C.MIN_PER_DAY + Math.round(s.rise * 60), set: jdn * C.MIN_PER_DAY + Math.round(s.set * 60), times: s };
}

/** Description complète de l'instant présent. */
export function describeNow(abs = nowAbs()) {
  const t = C.fromAbs(abs);
  const sun = sunAbs(t.jdn);
  const night = abs < sun.rise || abs >= sun.set;
  // Prochaine aube et prochain crépuscule
  const nextRise = abs < sun.rise ? sun.rise : sunAbs(t.jdn + 1).rise;
  const nextSet = abs < sun.set ? sun.set : sunAbs(t.jdn + 1).set;
  const moon = C.moonPhase(t.jdn);
  return {
    ...t, abs, night, moon,
    dateLabel: C.longDate(t.year, t.month, t.day),
    timeLabel: `${t.hour} h ${String(t.minute).padStart(2, "0")}`,
    sunrise: C.fmtHour(sun.times.rise), sunset: C.fmtHour(sun.times.set),
    toDawn: night ? nextRise - abs : null, toDusk: night ? null : nextSet - abs,
    toDawnLabel: night ? C.fmtDuration(nextRise - abs) : "", toDuskLabel: night ? "" : C.fmtDuration(nextSet - abs),
    dawnSoon: night && nextRise - abs <= 60,
    feasts: C.feasts(t.jdn)
  };
}

/* -------------------------------------------- */
/*  Avancer le temps (MJ)                        */
/* -------------------------------------------- */

async function card(html, cls = "") {
  return ChatMessage.create({ speaker: { alias: loc("NOCTIS.js.LaChronique") }, content: `<div class="noctis-card time-card ${cls}"><div class="card-frame">${html}</div></div>` });
}

/** Réveil de tous les PJ vampires (et Volonté de tous les PJ) au coucher du soleil. */
async function awaken() {
  const lines = [];
  for (const a of playerCharacters().list) {
    const s = a.system;
    const upd = {};
    let txt = [];
    if (s.isVampire && s.usesBlood && !hasStatus(a, "torpor")) { upd["system.blood.value"] = Math.max(0, s.blood.value - 1); txt.push(loc("NOCTIS.js.Sang2", { value: s.blood.value, p1: upd["system.blood.value"] })); }
    if (s.willpower.temporary < s.willpower.max && !hasStatus(a, "torpor")) { upd["system.willpower.temporary"] = s.willpower.temporary + 1; txt.push(loc("NOCTIS.js.1Volonte")); }
    if (Object.keys(upd).length) await a.update(upd);
    if (hasStatus(a, "torpor")) txt = [loc("NOCTIS.js.EnTorpeurNePerdPasDe")];
    if (txt.length) lines.push(`<li><b>${a.name}</b> : ${txt.join(", ")}</li>`);
  }
  return lines;
}

/**
 * Avance le temps de `minutes`, en déclenchant aube, lever du soleil, crépuscule (réveil) et réveils de torpeur.
 */
export async function advance(minutes, { silent = false } = {}) {
  if (!game.user.isGM) return;
  const from = nowAbs(), to = from + Math.max(0, Math.round(minutes));
  const msgs = [];
  let awakenings = 0;
  for (let j = Math.floor(from / C.MIN_PER_DAY); j <= Math.floor(to / C.MIN_PER_DAY); j++) {
    const s = sunAbs(j);
    if (from < s.rise - 60 && s.rise - 60 <= to && to < s.rise) msgs.push({ html: loc("NOCTIS.js.LAubeApprocheLeSoleilSe", { p0: C.fmtHour(s.times.rise) }), cls: "dawn" });
    if (from < s.rise && s.rise <= to) msgs.push({ html: loc("NOCTIS.js.LeSoleilSeLeveToutVampire", { p0: C.fmtHour(s.times.rise) }), cls: "sunrise" });
    if (from < s.set && s.set <= to) { awakenings++; msgs.push({ set: true, html: loc("NOCTIS.js.LaNuitTombe", { p0: C.fmtHour(s.times.set) }), cls: "dusk" }); }
  }
  await game.settings.set("noctis", "chronicleTime", C.fromAbs(to));
  await announceHistory(await revealPast(to));
  if (!silent) {
    // On ne garde que les derniers messages si plusieurs jours passent
    const last = msgs.slice(-3);
    for (const m of last) {
      let html = m.html;
      if (m.set) {
        const lines = await awaken();
        html += loc("NOCTIS.js.LesVampiresSEveillentChacunPerd", { p0: awakenings > 1 ? loc("NOCTIS.js.NuitsSontPasseesSeulLeDernier", { awakenings }) : "", p1: lines.length ? `<ul>${lines.join("")}</ul>` : "" });
      }
      await card(html, m.cls);
    }
  }
  await checkTorpor(from, to);
}

/** Jusqu'au prochain coucher du soleil (une journée de sommeil si l'on est déjà la nuit). */
export async function nextNight() {
  const now = describeNow();
  const t = C.fromAbs(now.abs);
  let target = sunAbs(t.jdn).set;
  if (target <= now.abs) target = sunAbs(t.jdn + 1).set;
  return advance(target - now.abs);
}

/** Règle la date et l'heure sans déclencher d'effets. */
export async function setDate({ year, month, day, hour = 19, minute = 0 }) {
  if (!game.user.isGM) return;
  await game.settings.set("noctis", "chronicleTime", { year, month, day, hour, minute });
  await revealPast(C.toAbs({ year, month, day, hour, minute }));
}

/* -------------------------------------------- */
/*  Ellipse                                      */
/* -------------------------------------------- */

export async function ellipse({ years = 0, months = 0, days = 0, feed = true, restoreWP = true, xp = 0, xpLabel = "", ghoulsFed = {}, note = "" }) {
  if (!game.user.isGM) return;
  const start = getTime();
  const fromAbs = C.toAbs(start);
  const target = C.addDate(start, { years, months, days });
  const tJdn = C.toJdn(target.year, target.month, target.day);
  const toAbs = sunAbs(tJdn).set;
  const nights = Math.max(1, Math.round((toAbs - fromAbs) / C.MIN_PER_DAY));
  await game.settings.set("noctis", "chronicleTime", C.fromAbs(toAbs));
  const history = await revealPast(toAbs);
  const lines = [];
  const pcs = playerCharacters().list;
  for (const a of pcs) {
    const s = a.system;
    const upd = {};
    const txt = [];
    const torpid = hasStatus(a, "torpor");
    if (s.isVampire && s.usesBlood && !torpid) {
      const v = feed ? s.blood.max : Math.max(0, s.blood.value - nights);
      upd["system.blood.value"] = v; txt.push(feed ? loc("NOCTIS.js.ReserveDeSangPleine") : loc("NOCTIS.js.Sang3", { value: s.blood.value, v }));
    }
    if (restoreWP && !torpid) { upd["system.willpower.temporary"] = s.willpower.max; txt.push(loc("NOCTIS.js.VolonteRestauree")); }
    if (a.type === "ghoul") {
      if (ghoulsFed[a.id] === false) txt.push(loc("NOCTIS.js.NAPasBuDeVitae", { p0: C.fmtDuration(toAbs - fromAbs) })), upd["system.blood.value"] = 0;
      else txt.push(loc("NOCTIS.js.ABuDeLaVitaeChaque2"));
    }
    if (torpid) txt.push(loc("NOCTIS.js.DortToujoursEnTorpeur"));
    if (Object.keys(upd).length) await a.update(upd);
    if (txt.length) lines.push(`<li><b>${a.name}</b> : ${txt.join(" ; ")}</li>`);
  }
  if (xp > 0) await game.noctis.XpLedger.award(pcs.map(a => ({ actor: a, amount: xp })), xpLabel || loc("NOCTIS.js.EllipseJusquEn", { year: target.year }), true);
  const span = C.fmtDuration(toAbs - fromAbs);
  await addEvent({ year: start.year, month: start.month, day: start.day, title: loc("NOCTIS.js.Ellipse2", { span }), text: note || loc("NOCTIS.js.LaChroniqueReprendLe", { p0: C.longDate(target.year, target.month, target.day) }), category: "other", revealed: true });
  await card(loc("NOCTIS.js.EllipseDuAuALaTombee", { span, p1: C.longDate(start.year, start.month, start.day), p2: C.longDate(target.year, target.month, target.day), p3: note ? `<p><em>${foundry.utils.escapeHTML(note)}</em></p>` : "", p4: lines.length ? `<ul>${lines.join("")}</ul>` : "", p5: xp ? loc("NOCTIS.js.ExperienceDeLaPeriodeXpPar", { xp }) : "" }), "ellipse");
  await announceHistory(history);
  await checkTorpor(fromAbs, toAbs);
}

/* -------------------------------------------- */
/*  Torpeur                                      */
/* -------------------------------------------- */

/** Note l'entrée en torpeur : date et durée minimale selon la Voie. */
export async function markTorpor(actor, { voluntary = false } = {}) {
  const road = Math.max(0, Math.min(10, actor.system.road?.value ?? 5));
  let days = TORPOR_DAYS[road];
  if (voluntary) days = Math.ceil(days / 2);
  const since = nowAbs();
  await actor.setFlag("noctis", "torpor", { since, until: since + days * C.MIN_PER_DAY, road, voluntary, label: TORPOR_LABEL[road] });
}

export function torporInfo(actor) {
  const f = actor.getFlag("noctis", "torpor");
  if (!f) return null;
  const u = C.fromAbs(f.until);
  const left = f.until - nowAbs();
  return { ...f, untilLabel: C.longDate(u.year, u.month, u.day), ready: left <= 0, leftLabel: left > 0 ? C.fmtDuration(left) : "" };
}

async function checkTorpor(from, to) {
  for (const a of game.actors) {
    const f = a.getFlag("noctis", "torpor");
    if (!f || !(from < f.until && f.until <= to)) continue;
    await card(loc("NOCTIS.js.PeutSEveillerLaTorpeurVoie", { name: a.name, label: f.label, road: f.road }), "torpor");
  }
}

/* -------------------------------------------- */
/*  Événements                                   */
/* -------------------------------------------- */

export const getEvents = () => foundry.utils.deepClone(game.settings.get("noctis", "calendarEvents") ?? []);

const SEASONS = { spring: "NOCTIS.js.SeasonSpring", summer: "NOCTIS.js.SeasonSummer", autumn: "NOCTIS.js.SeasonAutumn", winter: "NOCTIS.js.SeasonWinter" };
const SEASON_MONTH = { spring: 3, summer: 6, autumn: 9, winter: 12 };

/** Libellé de date selon la précision connue (jour, mois, saison, année, décennie). */
export function eventDateLabel(e) {
  if (e.dateLabel) return e.dateLabel;
  const range = e.endYear && e.endYear !== e.year ? `${e.year}-${e.endYear}` : `${e.year}`;
  switch (e.precision ?? "day") {
    case "month": return `${C.MONTHS[(e.month ?? 1) - 1]} ${e.year}`;
    case "season": return `${SEASONS[e.season] ?? ""} ${e.year}`.trim();
    case "year": return range;
    case "decade": return loc("NOCTIS.js.Annees", { year: e.year });
    default: return C.longDate(e.year, e.month ?? 1, e.day ?? 1);
  }
}

/** Date de tri et de comparaison (jour julien) d'un événement, même approximatif. */
export function eventJdn(e) {
  const p = e.precision ?? "day";
  const m = p === "season" ? SEASON_MONTH[e.season] ?? 1 : (e.month || 1);
  const d = p === "day" ? (e.day || 1) : (p === "season" ? 21 : 1);
  return C.toJdn(e.year, m, Math.min(d, C.monthLength(e.year, m)));
}

/**
 * Importe des événements fournis par un module de campagne (identifiants stables).
 * Les événements déjà présents gardent leur état (révélé, notes modifiées) ; les nouveaux sont ajoutés.
 * Les événements « publics » (histoire des mortels) déjà passés sont révélés d'office.
 */
export async function importEvents(list, { replace = false } = {}) {
  if (!game.user.isGM) return 0;
  const cur = getEvents();
  const byId = new Map(cur.map(e => [e.id, e]));
  const now = nowAbs();
  let added = 0;
  for (const raw of list) {
    const ev = { category: "other", revealed: false, text: "", gmNote: "", author: "", precision: "day", ...raw };
    if (byId.has(ev.id)) {
      if (!replace) continue;
      const old = byId.get(ev.id);
      Object.assign(old, { ...ev, revealed: old.revealed });
      continue;
    }
    if (ev.public && eventJdn(ev) * C.MIN_PER_DAY <= now) ev.revealed = true;
    cur.push(ev); byId.set(ev.id, ev); added++;
  }
  await game.settings.set("noctis", "calendarEvents", cur);
  return added;
}

/** Révèle les événements publics (histoire des mortels) dont la date est passée ; renvoie ceux révélés. */
async function revealPast(to) {
  const list = getEvents();
  const hit = list.filter(e => e.public && !e.revealed && eventJdn(e) * C.MIN_PER_DAY <= to);
  if (!hit.length) return [];
  for (const e of hit) e.revealed = true;
  await game.settings.set("noctis", "calendarEvents", list);
  return hit;
}

async function announceHistory(hit) {
  if (!hit.length) return;
  const items = hit.sort((a, b) => eventJdn(a) - eventJdn(b));
  const shown = items.slice(-8).map(e => `<li><b>${eventDateLabel(e)}</b> — ${foundry.utils.escapeHTML(e.title)}</li>`).join("");
  await card(loc("NOCTIS.js.LHistoireSuitSonCoursEvenement", { length: items.length, p1: items.length > 1 ? "s" : "", p2: items.length > 1 ? "nt" : "", shown, p4: items.length > 8 ? loc("NOCTIS.js.EtAutreSDansLeCalendrier", { p0: items.length - 8 }) : "" }), "reveal");
}

/** Événements visibles par l'utilisateur courant. */
export function visibleEvents() {
  const all = getEvents();
  return game.user.isGM ? all : all.filter(e => e.revealed);
}

export async function addEvent(ev) {
  const entry = { id: foundry.utils.randomID(), category: "other", revealed: false, text: "", gmNote: "", author: game.user.name, ...ev };
  if (!isGM()) {
    if (!game.users.activeGM) return ui.notifications.error(loc("NOCTIS.js.AucunMjConnectePourEnregistrerCe"));
    return game.socket.emit(SOCKET, { action: "calAdd", event: { ...entry, category: "memory", revealed: true } });
  }
  const list = getEvents();
  list.push(entry);
  await game.settings.set("noctis", "calendarEvents", list);
  if (entry.revealed && entry.category === "memory" && entry.author !== game.user.name) await announce(entry, true);
  return entry;
}

export async function updateEvent(id, changes) {
  if (!game.user.isGM) return;
  const list = getEvents();
  const e = list.find(x => x.id === id);
  if (!e) return;
  const wasHidden = !e.revealed;
  Object.assign(e, changes);
  await game.settings.set("noctis", "calendarEvents", list);
  if (wasHidden && e.revealed) await announce(e);
}

export async function deleteEvent(id) {
  if (!game.user.isGM) return;
  await game.settings.set("noctis", "calendarEvents", getEvents().filter(e => e.id !== id));
}

/** Message de chat quand un événement est révélé aux joueurs. */
async function announce(e, memory = false) {
  const cat = CATEGORIES[e.category] ?? CATEGORIES.other;
  return ChatMessage.create({
    speaker: { alias: loc("NOCTIS.js.LaChronique") },
    content: loc("NOCTIS.js.OuvrirLeCalendrier", { icon: cat.icon, p1: memory ? loc("NOCTIS.js.NouveauSouvenir") : loc("NOCTIS.js.LaChroniqueSeSouvient"), p2: eventDateLabel(e), p3: foundry.utils.escapeHTML(e.title), p4: e.text ? `<p>${foundry.utils.escapeHTML(e.text)}</p>` : "", p5: memory ? `<p class="who">— ${foundry.utils.escapeHTML(e.author ?? "")}</p>` : "", year: e.year, month: e.month, day: e.day })
  });
}

export async function handleSocket(data) {
  if (data?.action === "calAdd" && isGM()) {
    const list = getEvents();
    list.push(data.event);
    await game.settings.set("noctis", "calendarEvents", list);
    await announce(data.event, true);
  }
}

/* -------------------------------------------- */
/*  Horloge en haut de l'écran                   */
/* -------------------------------------------- */

export function renderClock() {
  document.getElementById("noctis-clock")?.remove();
  let el = document.getElementById("noctis-dock");
  let show = true;
  try { show = game.settings.get("noctis", "showClock"); } catch (e) { /* pas prêt */ }
  if (!show || !game.ready) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("aside");
    el.id = "noctis-dock";
    document.body.append(el);
    let top = 60;
    try { top = Number(localStorage.getItem("noctis-dock-top")) || 60; } catch (e) { /* stockage indisponible */ }
    el.style.top = `${top}%`;
    el.addEventListener("click", ev => {
      const a = ev.target.closest("[data-dock]")?.dataset.dock;
      if (!a) return;
      ev.stopPropagation();
      if (a === "players") return game.noctis.openCalendar();
      if (a === "gm") return game.noctis.openCalendarGM();
      if (a === "ledger") return game.noctis.openGmDashboard();
      if (a === "workshop") return game.noctis.openWorkshop();
      if (!game.user.isGM) return;
      if (a === "hour") return advance(60);
      if (a === "night") return nextNight();
    });
    // Poignée : déplacer la barre le long du bord
    el.addEventListener("pointerdown", ev => {
      if (!ev.target.closest(".dock-grip")) return;
      ev.preventDefault();
      const move = e => {
        const pct = Math.max(5, Math.min(90, e.clientY / window.innerHeight * 100));
        el.style.top = `${pct}%`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        try { localStorage.setItem("noctis-dock-top", parseFloat(el.style.top)); } catch (e) { /* stockage indisponible */ }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  }
  const n = describeNow();
  const gm = game.user.isGM;
  el.className = `${n.night ? "night" : "day"} ${n.dawnSoon ? "dawn-soon" : ""}`;
  const short = loc("NOCTIS.js.DayMonthYear", { day: C.dayLabel(n.day), month: C.MONTHS_SHORT[n.month - 1], year: n.year });
  const tip = loc("NOCTIS.js.Text7", { dateLabel: n.dateLabel, timeLabel: n.timeLabel, label: n.moon.label, p3: n.night ? loc("NOCTIS.js.AubeDans", { toDawnLabel: n.toDawnLabel, sunrise: n.sunrise }) : loc("NOCTIS.js.NuitDans", { toDuskLabel: n.toDuskLabel, sunset: n.sunset }) });
  el.innerHTML = loc("NOCTIS.js.H", { p0: loc("NOCTIS.js.DockMove"), p1: tip.replace(/"/g, "&quot;"), icon: n.moon.icon, hour: n.hour, p4: String(n.minute).padStart(2, "0"), short, p6: n.night ? "fa-sun" : "fa-moon", p7: n.night ? n.toDawnLabel : n.toDuskLabel, p8: loc("NOCTIS.js.DockPlayers"), p9: gm ? `<a class="dock-btn gm" data-dock="gm" data-tooltip="${loc("NOCTIS.js.DockGm")}" data-tooltip-direction="RIGHT"><i class="fa-solid fa-user-secret"></i></a>
    <a class="dock-btn gm" data-dock="hour" data-tooltip="${loc("NOCTIS.js.DockHour")}" data-tooltip-direction="RIGHT"><span>+1 h</span></a>
    <a class="dock-btn gm" data-dock="night" data-tooltip="${loc("NOCTIS.js.DockNight")}" data-tooltip-direction="RIGHT"><i class="fa-solid fa-moon"></i></a>
    <a class="dock-btn gm" data-dock="ledger" data-tooltip="${loc("NOCTIS.js.DockLedger")}" data-tooltip-direction="RIGHT"><i class="fa-solid fa-chess-king"></i></a>
    <a class="dock-btn gm" data-dock="workshop" data-tooltip="${loc("NOCTIS.js.DockWorkshop")}" data-tooltip-direction="RIGHT"><i class="fa-solid fa-hammer"></i></a>` : "" });
}

registerLocalizable(CATEGORIES, SEASONS, TORPOR_LABEL);
