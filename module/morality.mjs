import { NOCTIS } from "./config.mjs";
import { rollPool } from "./dice/roll.mjs";
import { loc } from "./i18n.mjs";

/**
 * Voie, credo, aura et journal moral.
 * Mécanique seule : les Voies, leurs credo et leurs hiérarchies des péchés sont saisis par le conteur
 * dans la fiche de chaque Voie (objet de type « road »).
 */

const { DialogV2 } = foundry.applications.api;
const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const L = (k, d) => loc(`NOCTIS.moral.${k}`, d);
const vLabel = (k) => NOCTIS.virtueLabels?.[k] ?? k;
const roadLabel = (actor) => actor.system.road?.name || L("Road");

/* -------------------------------------------- */
/*  Aura et effets du score                      */
/* -------------------------------------------- */

export const AURA_TABLE = [
  { range: "10", min: 10, max: 10, mod: -2 },
  { range: "9-8", min: 8, max: 9, mod: -1 },
  { range: "7-4", min: 4, max: 7, mod: 0 },
  { range: "3-2", min: 2, max: 3, mod: 1 },
  { range: "1-0", min: 0, max: 1, mod: 2 }
];

export function auraMod(value) {
  return (AURA_TABLE.find(r => value >= r.min && value <= r.max) ?? AURA_TABLE[2]).mod;
}
const signed = (n) => n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0";

function wakeText(v) {
  if (v >= 7) return { short: L("WakeEarly"), text: L("WakeEarlyText") };
  if (v <= 4) return { short: L("WakeLate"), text: L("WakeLateText") };
  return { short: L("WakeDusk"), text: L("WakeDuskText") };
}

/** Difficulté du jet de vertu après un péché : 6, +1 par niveau d'écart entre le score et le péché. */
export function sinDifficulty(score, level) {
  return Math.min(10, 6 + Math.max(0, score - level));
}

/* -------------------------------------------- */
/*  Voie et credo de l'acteur                    */
/* -------------------------------------------- */

/** Nom court de la Voie, pour l'onglet : « Voie de l'Humanité » → « Humanité », « Road of Kings » → « Kings ». */
export function roadShortName(name) {
  const n = String(name ?? "")
    .replace(/^(Voie|Route|Via)\s+(de la|de l'|de l’|des|du|de)\s*/i, "")
    .replace(/^(The\s+)?(Road|Path|Via)\s+of\s+(the\s+)?/i, "")
    .trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : L("Road");
}

export function currentCreed(actor) {
  const road = actor.roadItem;
  const name = actor.system.road?.creed;
  return (road?.system.creeds ?? []).find(c => c.name === name) ?? null;
}

/** Hiérarchie des péchés : celle de la Voie, où le credo remplace les niveaux qu'il redéfinit. */
export function hierarchy(actor) {
  const road = actor.roadItem;
  const creed = currentCreed(actor);
  const map = new Map();
  for (const s of road?.system.sins ?? []) if (s.sin) map.set(s.level, { ...s, creed: false });
  for (const s of creed?.sins ?? []) if (s.sin) map.set(s.level, { ...s, creed: true });
  return [...map.values()].sort((a, b) => b.level - a.level);
}

/** Date de la chronique (calendrier), sinon vide. */
function chronicleDate() {
  try { return game.noctis?.time?.describeNow?.().dateLabel ?? ""; } catch (e) { return ""; }
}

/* -------------------------------------------- */
/*  Journal moral                                */
/* -------------------------------------------- */

const KIND_ICONS = {
  sin: "fa-solid fa-skull", resisted: "fa-solid fa-shield-halved", loss: "fa-solid fa-arrow-trend-down",
  gain: "fa-solid fa-arrow-trend-up", epiphany: "fa-solid fa-sun", xp: "fa-solid fa-scroll",
  change: "fa-solid fa-shuffle", creation: "fa-solid fa-wand-magic-sparkles", note: "fa-solid fa-feather"
};
const kindLabel = (k) => KIND_ICONS[k] ? L(`Kind.${k}`) : k;

function entry(data) {
  return {
    id: foundry.utils.randomID(), kind: "note", date: chronicleDate(), real: new Date().toLocaleDateString(game.i18n.lang),
    from: null, to: null, trait: "road", level: null, text: "", note: "", ...data
  };
}

/** Ajoute une ligne au journal moral (sans déclencher la journalisation automatique). */
export async function addMoralEntry(actor, data, extraUpdate = {}) {
  const log = [...(actor.system.road.log ?? []), entry(data)];
  return actor.update({ "system.road.log": log, ...extraUpdate }, { noctisMoral: false });
}

export async function deleteMoralEntry(actor, id) {
  return actor.update({ "system.road.log": (actor.system.road.log ?? []).filter(e => e.id !== id) }, { noctisMoral: false });
}

/** Journalise les variations du score de Voie et applique les vertus du credo choisi. */
export function registerMoralHooks() {
  Hooks.on("preUpdateActor", (actor, changes, options) => {
    const s = actor.system;
    if (!s?.road) return;
    const newCreed = foundry.utils.getProperty(changes, "system.road.creed");
    if (newCreed !== undefined && newCreed !== s.road.creed) {
      const c = (actor.roadItem?.system.creeds ?? []).find(x => x.name === newCreed);
      if (c) {
        foundry.utils.setProperty(changes, "system.virtues.conscience.type", c.virtue1);
        foundry.utils.setProperty(changes, "system.virtues.selfcontrol.type", c.virtue2);
      }
      if (s.creation?.done && options.noctisMoral !== false) {
        const log = foundry.utils.getProperty(changes, "system.road.log") ?? foundry.utils.deepClone(s.road.log ?? []);
        log.push(entry({ kind: "change", text: L("CreedChange", { from: s.road.creed || L("None"), to: newCreed || L("None") }) }));
        foundry.utils.setProperty(changes, "system.road.log", log);
      }
    }
    const nv = foundry.utils.getProperty(changes, "system.road.value");
    if (nv === undefined || nv === s.road.value || options.noctisMoral === false) return;
    if (!s.creation?.done && !options.noctisMoral) return;
    const info = options.noctisMoral ?? { kind: nv > s.road.value ? "gain" : "loss", text: L("SheetEdit") };
    const log = foundry.utils.getProperty(changes, "system.road.log") ?? foundry.utils.deepClone(s.road.log ?? []);
    log.push(entry({ from: s.road.value, to: nv, ...info }));
    foundry.utils.setProperty(changes, "system.road.log", log);
  });
}

/* -------------------------------------------- */
/*  Contexte d'affichage (fiche, tableau de bord) */
/* -------------------------------------------- */

export function moralRules() {
  return [
    { icon: "fa-solid fa-skull", title: L("RuleSinTitle"), text: L("RuleSin") },
    { icon: "fa-solid fa-sun", title: L("RuleEpiphanyTitle"), text: L("RuleEpiphany") },
    { icon: "fa-solid fa-dice-d20", title: L("RuleCapTitle"), text: L("RuleCap") },
    { icon: "fa-solid fa-shuffle", title: L("RuleCreedTitle"), text: L("RuleCreed") }
  ];
}

export function moralContext(actor) {
  const s = actor.system;
  const road = actor.roadItem;
  const value = s.road?.value ?? 0;
  const creed = currentCreed(actor);
  const mod = auraMod(value);
  const wake = wakeText(value);
  const rows = hierarchy(actor).map(h => ({ ...h, risk: h.level <= value, diff: sinDifficulty(value, h.level) }));
  const v1 = s.virtues.conscience, v2 = s.virtues.selfcontrol;
  const fromTo = (e) => e.from != null && e.to != null;
  const log = [...(s.road.log ?? [])].reverse().map(e => ({
    ...e, kindLabel: kindLabel(e.kind), icon: KIND_ICONS[e.kind] ?? "fa-solid fa-feather",
    deltaLabel: fromTo(e) ? `${e.from} → ${e.to}` : "",
    up: fromTo(e) && e.to > e.from, down: fromTo(e) && e.to < e.from,
    traitLabel: e.trait === "road" || !e.trait ? "" : vLabel(s.virtues[e.trait]?.type ?? e.trait)
  }));
  const roadLog = (s.road.log ?? []).filter(e => fromTo(e) && (e.trait === "road" || !e.trait));
  const auraRolls = road?.system.auraRolls ?? "";
  return {
    hasRoad: !!road || !!s.road?.name,
    roadName: roadLabel(actor),
    shortName: roadShortName(s.road?.name || road?.name),
    latin: road?.system.latin ?? "", nickname: road?.system.nickname ?? "",
    value, dots: Array.from({ length: 10 }, (_, i) => ({ n: i + 1, filled: i < value })),
    creed, creedName: s.road?.creed ?? "",
    hasCreeds: (road?.system.creeds?.length ?? 0) > 0,
    creedMissing: !!road?.system.creedRequired && !creed,
    virtues: [
      { label: vLabel(v1.type), value: v1.value, capped: Math.min(v1.value, value) },
      { label: vLabel(v2.type), value: v2.value, capped: Math.min(v2.value, value) },
      { label: vLabel("courage"), value: s.virtues.courage.value, capped: Math.min(s.virtues.courage.value, value) }
    ],
    aura: {
      name: road?.system.aura || s.road?.aura || "—", text: road?.system.auraText ?? "", rolls: auraRolls,
      mod, modLabel: signed(mod), good: mod < 0, bad: mod > 0,
      table: AURA_TABLE.map(r => ({ ...r, modLabel: signed(r.mod), active: value >= r.min && value <= r.max }))
    },
    effects: [
      { icon: "fa-solid fa-moon", title: L("Wake"), value: wake.short, text: wake.text },
      { icon: "fa-solid fa-masks-theater", title: L("Aura"), value: L("AuraValue", { mod: signed(mod) }),
        text: auraRolls ? L("AuraTextRolls", { rolls: auraRolls.replace(/\.$/, "") }) : L("AuraText") },
      { icon: "fa-solid fa-dice-d20", title: L("Cap"), value: L("CapValue", { n: value }), text: L("CapText") },
      { icon: "fa-solid fa-scale-unbalanced", title: L("AtRisk"), value: value ? L("AtRiskValue", { n: value }) : L("AtRiskNone"),
        text: value ? L("AtRiskText", { n: value }) : L("AtRiskZero") }
    ],
    ethics: road?.system.ethics ?? [], creedEthics: creed?.ethics ?? [], creedSummary: creed?.summary ?? "",
    rows, forbidden: rows.filter(r => r.risk), allowed: rows.filter(r => !r.risk), hasRows: rows.length > 0,
    rules: moralRules(),
    log, hasLog: log.length > 0,
    gains: roadLog.filter(e => e.to > e.from).length, losses: roadLog.filter(e => e.to < e.from).length
  };
}

/* -------------------------------------------- */
/*  Dialogues                                    */
/* -------------------------------------------- */

/** Choix du credo à l'adoption d'une Voie. Renvoie "" (aucun), le nom, ou null si annulé. */
export async function chooseCreed(roadItem, current = "") {
  const creeds = (roadItem?.system?.creeds ?? []).filter(c => c.name);
  if (!creeds.length) return "";
  const opts = creeds.map(c => `<option value="${esc(c.name)}" ${c.name === current ? "selected" : ""}>${esc(c.name)}</option>`).join("");
  const desc = creeds.map(c => `<li><b>${esc(c.name)}</b> (${vLabel(c.virtue1)}, ${vLabel(c.virtue2)})${c.summary ? ` : ${esc(c.summary)}` : ""}</li>`).join("");
  const res = await DialogV2.prompt({
    window: { title: L("CreedTitle", { road: roadItem.name }) }, classes: ["noctis-dialog"],
    content: `<p>${L("CreedIntro")}</p>
      <div class="form-group"><label>${L("Creed")}</label><select name="creed">${roadItem.system.creedRequired ? "" : `<option value="">${L("NoCreedOption")}</option>`}${opts}</select></div>
      <ul class="creed-list">${desc}</ul>`,
    ok: { label: L("Choose"), callback: (e, b) => b.form.elements.creed.value },
    rejectClose: false
  });
  return res ?? null;
}

function moralCard(actor, html) {
  return `<div class="noctis-card moral-card"><div class="card-frame"><h3><i class="fa-solid fa-scale-balanced"></i> ${esc(roadLabel(actor))}</h3>${html}</div></div>`;
}

/** Un péché a été commis : jet de la première vertu, puis éventuelle perte. */
export async function sinDialog(actor, presetLevel = null) {
  const s = actor.system;
  const value = s.road.value;
  const rows = hierarchy(actor);
  const v1 = s.virtues.conscience, v2 = s.virtues.selfcontrol;
  const v1Label = vLabel(v1.type);
  const opts = rows.map(r => `<option value="${r.level}" ${r.level === presetLevel ? "selected" : ""}>${r.level} — ${esc(r.sin)}${r.level > value ? ` (${L("NoRisk")})` : ""}</option>`).join("");
  const res = await DialogV2.prompt({
    window: { title: L("SinTitle", { name: actor.name }), icon: "fa-solid fa-skull" }, classes: ["noctis-dialog"], position: { width: 520 },
    content: `<p>${L("SinIntro", { road: esc(roadLabel(actor)), value, virtue: v1Label })}</p>
      <div class="form-group"><label>${L("Sin")}</label><select name="level">${opts}<option value="custom" ${rows.length ? "" : "selected"}>${L("OtherLevel")}</option></select></div>
      <div class="form-group"><label>${L("LevelIfOther")}</label><input type="number" name="customLevel" min="1" max="10" value="${presetLevel ?? value}"></div>
      <div class="form-group"><label>${L("WhatHappened")}</label><input type="text" name="note"></div>`,
    ok: { label: L("Roll"), icon: "fa-solid fa-dice-d10", callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object },
    rejectClose: false
  });
  if (!res) return;
  const custom = res.level === "custom";
  const level = custom ? Math.max(1, Math.min(10, Number(res.customLevel) || value)) : Number(res.level);
  const row = rows.find(r => r.level === level);
  const sinText = custom ? (res.note || L("SinOfLevel", { level })) : row?.sin ?? L("SinOfLevel", { level });
  const note = res.note && !custom ? res.note : "";
  const speaker = ChatMessage.getSpeaker({ actor });
  if (level > value) {
    await addMoralEntry(actor, { kind: "note", level, text: L("LogAbove", { sin: sinText, level }), note });
    return ChatMessage.create({ speaker, content: moralCard(actor, `<p>${L("ChatAbove", { sin: esc(sinText), level, value, name: esc(actor.name) })}</p>`) });
  }
  const difficulty = sinDifficulty(value, level);
  const pool = Math.min(v1.value, value);
  const r = await rollPool({ actor, pool, difficulty, label: `${v1Label} — ${sinText}`,
    parts: [`${v1Label} ${v1.value}${pool < v1.value ? ` (${L("CappedAt", { n: value })})` : ""}`, L("SinOfLevel", { level })], noBotch: false });
  if (r.successes > 0) {
    await addMoralEntry(actor, { kind: "resisted", level, text: L("LogResisted", { sin: sinText, level }), note });
    const epi = level <= 3 ? `<p class="epi"><i class="fa-solid fa-sun"></i> ${L("ChatEpiphanyPossible")}</p>` : "";
    return ChatMessage.create({ speaker, content: moralCard(actor, `<p>${L("ChatResisted", { name: esc(actor.name) })}</p>${epi}`) });
  }
  const lose = await DialogV2.prompt({
    window: { title: L("LoseTitle") }, classes: ["noctis-dialog"],
    content: `<p>${L("LoseIntro", { name: esc(actor.name) })}</p>
      <div class="form-group"><label>${L("Trait")}</label><select name="trait">
        <option value="road">${esc(roadLabel(actor))} (${value} → ${Math.max(0, value - 1)})</option>
        <option value="conscience">${vLabel(v1.type)} (${v1.value} → ${Math.max(1, v1.value - 1)})</option>
        <option value="selfcontrol">${vLabel(v2.type)} (${v2.value} → ${Math.max(1, v2.value - 1)})</option>
      </select></div>`,
    ok: { label: L("Apply"), callback: (e, b) => b.form.elements.trait.value },
    rejectClose: false
  }) ?? "road";
  const path = lose === "road" ? "system.road.value" : `system.virtues.${lose}.value`;
  const from = lose === "road" ? value : s.virtues[lose].value;
  const to = Math.max(lose === "road" ? 0 : 1, from - 1);
  await addMoralEntry(actor, { kind: "sin", level, from, to, trait: lose, text: `${L("LogSin", { sin: sinText, level })}${r.botch ? ` — ${L("Botch")}` : ""}`, note }, { [path]: to });
  const label = lose === "road" ? roadLabel(actor) : vLabel(s.virtues[lose].type);
  return ChatMessage.create({ speaker, content: moralCard(actor, `<p>${L("ChatLost", { trait: esc(label), from, to })}</p>`) });
}

/** Épiphanie : note au journal, et éventuel achat d'un point de Voie à moitié prix. */
export async function epiphanyDialog(actor) {
  const s = actor.system;
  const value = s.road.value;
  const full = actor.describePurchase("system.road.value", value, value + 1).cost;
  const half = Math.max(1, Math.floor(full / 2));
  const res = await DialogV2.prompt({
    window: { title: L("EpiphanyTitle", { name: actor.name }), icon: "fa-solid fa-sun" }, classes: ["noctis-dialog"],
    content: `<div class="form-group"><label>${L("Revelation")}</label><input type="text" name="text"></div>
      ${value < 10 ? `<div class="form-group"><label><input type="checkbox" name="buy" ${s.experience.available >= half ? "" : "disabled"}> ${L("EpiphanyBuy", { road: esc(roadLabel(actor)), from: value, to: value + 1, half, full })}</label></div>` : ""}
      <p class="hint">${L("XpAvailable", { n: s.experience.available })}</p>`,
    ok: { label: L("Record"), callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object },
    rejectClose: false
  });
  if (!res) return;
  const text = res.text || L("Kind.epiphany");
  if (res.buy && value < 10) {
    if (s.experience.available < half) return ui.notifications.warn(L("NotEnoughXp"));
    await actor.update({ "system.road.value": value + 1 }, { noctisMoral: { kind: "epiphany", text, note: L("HalfPrice", { n: half }) } });
    await actor.addXpEntry({ kind: "spend", amount: half, label: L("XpEpiphanyLabel", { road: roadLabel(actor), from: value, to: value + 1 }), category: "road", trait: "system.road.value", from: value, to: value + 1, note: text });
  } else await addMoralEntry(actor, { kind: "epiphany", text });
}

/** Entrée libre : note, ou ajustement du score par le conteur. */
export async function moralNoteDialog(actor) {
  const v = actor.system.road.value;
  const gm = game.user.isGM;
  const res = await DialogV2.prompt({
    window: { title: L("NoteTitle", { name: actor.name }), icon: "fa-solid fa-feather" }, classes: ["noctis-dialog"],
    content: `<div class="form-group"><label>${L("Event")}</label><input type="text" name="text"></div>
      ${gm ? `<div class="form-group"><label>${L("EffectOnRoad")}</label><select name="delta"><option value="0">${L("NoEffect")}</option><option value="1">+1 (${v} → ${Math.min(10, v + 1)})</option><option value="-1">−1 (${v} → ${Math.max(0, v - 1)})</option></select></div>` : ""}`,
    ok: { label: L("Record"), callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object },
    rejectClose: false
  });
  if (!res?.text) return;
  const d = Number(res.delta) || 0;
  if (!d) return addMoralEntry(actor, { kind: "note", text: res.text });
  const to = Math.max(0, Math.min(10, v + d));
  return actor.update({ "system.road.value": to }, { noctisMoral: { kind: d > 0 ? "gain" : "loss", text: res.text, note: L("StorytellerDecision") } });
}

export async function setCreed(actor, name) {
  return actor.update({ "system.road.creed": name });
}

/** Lignes d'éthique saisies une par ligne. */
export const linesToList = (t) => String(t ?? "").split(/\r?\n/).map(x => x.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
