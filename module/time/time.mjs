/**
 * Temps de la chronique : date et heure du monde, nuits qui passent (réveil), aube, ellipses,
 * torpeur, événements du calendrier (révélés au fil de la chronique).
 */
import * as C from "./calendar-math.mjs";
import { playerCharacters } from "../apps/xp-ledger.mjs";
import { hasStatus } from "../status.mjs";

const SOCKET = "system.noctis";
const isGM = () => game.users.activeGM?.isSelf;

export const CATEGORIES = {
  politics: { label: "Politique", icon: "fa-solid fa-crown", color: "#9a7a2a" },
  combat: { label: "Combat", icon: "fa-solid fa-khanda", color: "#8a1c1c" },
  meeting: { label: "Rencontre", icon: "fa-solid fa-handshake", color: "#2f4a6a" },
  death: { label: "Mort", icon: "fa-solid fa-cross", color: "#2b2118" },
  travel: { label: "Voyage", icon: "fa-solid fa-compass", color: "#2f5a3a" },
  mystery: { label: "Mystère", icon: "fa-solid fa-eye", color: "#4a2a6a" },
  blood: { label: "Sang et serments", icon: "fa-solid fa-droplet", color: "#6e0f14" },
  memory: { label: "Souvenir", icon: "fa-solid fa-feather", color: "#5a3a22" },
  other: { label: "Autre", icon: "fa-solid fa-circle", color: "#6b6358" }
};

/** Durée de la torpeur selon la Voie, en jours. */
const TORPOR_DAYS = { 10: 1, 9: 3, 8: 7, 7: 14, 6: 30, 5: 365, 4: 3652, 3: 18262, 2: 36525, 1: 182625, 0: 365250 };
const TORPOR_LABEL = { 10: "un jour", 9: "trois jours", 8: "une semaine", 7: "deux semaines", 6: "un mois", 5: "un an", 4: "dix ans", 3: "cinquante ans", 2: "un siècle", 1: "cinq siècles", 0: "un millénaire ou plus" };

export function registerTimeSettings() {
  const refresh = () => {
    for (const id of ["noctis-calendar", "noctis-calendar-gm"]) foundry.applications.instances?.get?.(id)?.refresh?.();
    renderClock();
  };
  game.settings.register("noctis", "chronicleTime", { scope: "world", config: false, type: Object, default: { year: 1197, month: 11, day: 1, hour: 19, minute: 0 }, onChange: refresh });
  game.settings.register("noctis", "calendarEvents", { scope: "world", config: false, type: Array, default: [], onChange: refresh });
  game.settings.register("noctis", "latitude", {
    name: "Latitude de la chronique", hint: "Sert au calcul du lever et du coucher du soleil (46° par défaut, Europe centrale). Les heures sont solaires.",
    scope: "world", config: true, type: Number, default: 46, range: { min: 30, max: 65, step: 1 }, onChange: refresh
  });
  game.settings.register("noctis", "showClock", {
    name: "Afficher la barre de la chronique", hint: "Barre sur le bord gauche de l'écran : heure, lune, aube, accès au calendrier (et outils du MJ).",
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
  return ChatMessage.create({ speaker: { alias: "La chronique" }, content: `<div class="noctis-card time-card ${cls}"><div class="card-frame">${html}</div></div>` });
}

/** Réveil de tous les PJ vampires (et Volonté de tous les PJ) au coucher du soleil. */
async function awaken() {
  const lines = [];
  for (const a of playerCharacters().list) {
    const s = a.system;
    const upd = {};
    let txt = [];
    if (s.isVampire && s.usesBlood && !hasStatus(a, "torpor")) { upd["system.blood.value"] = Math.max(0, s.blood.value - 1); txt.push(`sang ${s.blood.value} → ${upd["system.blood.value"]}`); }
    if (s.willpower.temporary < s.willpower.max && !hasStatus(a, "torpor")) { upd["system.willpower.temporary"] = s.willpower.temporary + 1; txt.push("+1 Volonté"); }
    if (Object.keys(upd).length) await a.update(upd);
    if (hasStatus(a, "torpor")) txt = ["en torpeur, ne perd pas de sang"];
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
    if (from < s.rise - 60 && s.rise - 60 <= to && to < s.rise) msgs.push({ html: `<h3><i class="fa-solid fa-sun"></i> L'aube approche</h3><p>Le soleil se lèvera à <b>${C.fmtHour(s.times.rise)}</b>, dans moins d'une heure. Il est temps de regagner son refuge.</p>`, cls: "dawn" });
    if (from < s.rise && s.rise <= to) msgs.push({ html: `<h3><i class="fa-solid fa-sun"></i> Le soleil se lève — ${C.fmtHour(s.times.rise)}</h3><p>Tout vampire à découvert subit la lumière directe : dégâts aggravés et Panique (difficulté 8). Ceux qui sont à l'abri sombrent dans le sommeil du jour.</p>`, cls: "sunrise" });
    if (from < s.set && s.set <= to) { awakenings++; msgs.push({ set: true, html: `<h3><i class="fa-solid fa-moon"></i> La nuit tombe — ${C.fmtHour(s.times.set)}</h3>`, cls: "dusk" }); }
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
        html += `<p>Les vampires s'éveillent : chacun perd 1 point de sang et regagne 1 point de Volonté.${awakenings > 1 ? ` (${awakenings} nuits sont passées ; seul le dernier réveil est appliqué.)` : ""}</p>${lines.length ? `<ul>${lines.join("")}</ul>` : ""}`;
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
      upd["system.blood.value"] = v; txt.push(feed ? "réserve de sang pleine" : `sang ${s.blood.value} → ${v}`);
    }
    if (restoreWP && !torpid) { upd["system.willpower.temporary"] = s.willpower.max; txt.push("Volonté restaurée"); }
    if (a.type === "ghoul") {
      if (ghoulsFed[a.id] === false) txt.push(`<b>n'a pas bu de vitae</b> : le temps la rattrape (${C.fmtDuration(toAbs - fromAbs)} de vieillissement), et la vitae de sa réserve s'est tarie`), upd["system.blood.value"] = 0;
      else txt.push("a bu de la vitae chaque mois : ne vieillit pas");
    }
    if (torpid) txt.push("dort toujours en torpeur");
    if (Object.keys(upd).length) await a.update(upd);
    if (txt.length) lines.push(`<li><b>${a.name}</b> : ${txt.join(" ; ")}</li>`);
  }
  if (xp > 0) await game.noctis.XpLedger.award(pcs.map(a => ({ actor: a, amount: xp })), xpLabel || `Ellipse jusqu'en ${target.year}`, true);
  const span = C.fmtDuration(toAbs - fromAbs);
  await addEvent({ year: start.year, month: start.month, day: start.day, title: `Ellipse : ${span}`, text: note || `La chronique reprend le ${C.longDate(target.year, target.month, target.day)}.`, category: "other", revealed: true });
  await card(`<h3><i class="fa-solid fa-hourglass-half"></i> Ellipse — ${span}</h3><p>Du ${C.longDate(start.year, start.month, start.day)} au <b>${C.longDate(target.year, target.month, target.day)}</b>, à la tombée de la nuit.</p>${note ? `<p><em>${foundry.utils.escapeHTML(note)}</em></p>` : ""}${lines.length ? `<ul>${lines.join("")}</ul>` : ""}${xp ? `<p>Expérience de la période : <b>${xp} XP</b> par personnage.</p>` : ""}`, "ellipse");
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
    await card(`<h3><i class="fa-solid fa-bed"></i> ${a.name} peut s'éveiller</h3><p>La torpeur (${f.label}, Voie ${f.road}) touche à sa fin. Pour se relever : 1 point de sang et un jet ; en cas d'échec, nouvel essai la nuit suivante. Sans sang dans sa réserve, il faut d'abord qu'on le nourrisse. Au réveil, il est Infirme.</p>`, "torpor");
  }
}

/* -------------------------------------------- */
/*  Événements                                   */
/* -------------------------------------------- */

export const getEvents = () => foundry.utils.deepClone(game.settings.get("noctis", "calendarEvents") ?? []);

const SEASONS = { spring: "printemps", summer: "été", autumn: "automne", winter: "hiver" };
const SEASON_MONTH = { spring: 3, summer: 6, autumn: 9, winter: 12 };

/** Libellé de date selon la précision connue (jour, mois, saison, année, décennie). */
export function eventDateLabel(e) {
  if (e.dateLabel) return e.dateLabel;
  const range = e.endYear && e.endYear !== e.year ? `${e.year}-${e.endYear}` : `${e.year}`;
  switch (e.precision ?? "day") {
    case "month": return `${C.MONTHS[(e.month ?? 1) - 1]} ${e.year}`;
    case "season": return `${SEASONS[e.season] ?? ""} ${e.year}`.trim();
    case "year": return range;
    case "decade": return `années ${e.year}`;
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
  await card(`<h3><i class="fa-solid fa-scroll"></i> L'histoire suit son cours</h3><p>${items.length} événement${items.length > 1 ? "s" : ""} du monde des mortels rejoigne${items.length > 1 ? "nt" : ""} la chronologie.</p><ul>${shown}</ul>${items.length > 8 ? `<p><em>… et ${items.length - 8} autre(s), dans le calendrier.</em></p>` : ""}<p><a data-noctis-action="openCalendar"><i class="fa-solid fa-timeline"></i> Ouvrir la chronologie</a></p>`, "reveal");
}

/** Événements visibles par l'utilisateur courant. */
export function visibleEvents() {
  const all = getEvents();
  return game.user.isGM ? all : all.filter(e => e.revealed);
}

export async function addEvent(ev) {
  const entry = { id: foundry.utils.randomID(), category: "other", revealed: false, text: "", gmNote: "", author: game.user.name, ...ev };
  if (!isGM()) {
    if (!game.users.activeGM) return ui.notifications.error("Aucun MJ connecté pour enregistrer ce souvenir.");
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
    speaker: { alias: "La chronique" },
    content: `<div class="noctis-card time-card reveal"><div class="card-frame"><h3><i class="${cat.icon}"></i> ${memory ? "Nouveau souvenir" : "La chronique se souvient"}</h3><p class="when">${eventDateLabel(e)}</p><p><b>${foundry.utils.escapeHTML(e.title)}</b></p>${e.text ? `<p>${foundry.utils.escapeHTML(e.text)}</p>` : ""}${memory ? `<p class="who">— ${foundry.utils.escapeHTML(e.author ?? "")}</p>` : ""}<p><a data-noctis-action="openCalendar" data-year="${e.year}" data-month="${e.month}" data-day="${e.day}"><i class="fa-solid fa-calendar-days"></i> Ouvrir le calendrier</a></p></div></div>`
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
  const ABBR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const short = `${n.day === 1 ? "1er" : n.day} ${ABBR[n.month - 1]} ${n.year}`;
  const tip = `${n.dateLabel} · ${n.timeLabel}<br>${n.moon.label}<br>${n.night ? `Aube dans ${n.toDawnLabel} (${n.sunrise})` : `Nuit dans ${n.toDuskLabel} (${n.sunset})`}`;
  el.innerHTML = `
    <span class="dock-grip" data-tooltip="Déplacer la barre" data-tooltip-direction="RIGHT"><i class="fa-solid fa-grip-lines"></i></span>
    <a class="dock-clock" data-dock="players" data-tooltip-html="${tip.replace(/"/g, "&quot;")}" data-tooltip-direction="RIGHT">
      <span class="dock-moon">${n.moon.icon}</span>
      <b>${n.hour} h ${String(n.minute).padStart(2, "0")}</b>
      <small>${short}</small>
      <small class="dock-dawn"><i class="fa-solid ${n.night ? "fa-sun" : "fa-moon"}"></i> ${n.night ? n.toDawnLabel : n.toDuskLabel}</small>
    </a>
    <a class="dock-btn" data-dock="players" data-tooltip="Chronique — vue des joueurs" data-tooltip-direction="RIGHT"><i class="fa-solid fa-calendar-days"></i></a>
    ${gm ? `<a class="dock-btn gm" data-dock="gm" data-tooltip="Chronique — vue du MJ" data-tooltip-direction="RIGHT"><i class="fa-solid fa-user-secret"></i></a>
    <a class="dock-btn gm" data-dock="hour" data-tooltip="Avancer d'une heure" data-tooltip-direction="RIGHT"><span>+1 h</span></a>
    <a class="dock-btn gm" data-dock="night" data-tooltip="Jusqu'à la nuit suivante (aube, jour, réveil des vampires)" data-tooltip-direction="RIGHT"><i class="fa-solid fa-moon"></i></a>
    <a class="dock-btn gm" data-dock="ledger" data-tooltip="Tableau de bord MJ" data-tooltip-direction="RIGHT"><i class="fa-solid fa-chess-king"></i></a>
    <a class="dock-btn gm" data-dock="workshop" data-tooltip="Atelier du conteur : lignées, disciplines, Voies, atouts" data-tooltip-direction="RIGHT"><i class="fa-solid fa-hammer"></i></a>` : ""}`;
}
