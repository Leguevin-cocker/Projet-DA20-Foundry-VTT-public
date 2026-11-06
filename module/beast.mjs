/**
 * La Bête : tests de frénésie et de panique.
 * Une carte de chat « La Bête s'éveille » porte l'état du test ; le MJ actif la résout,
 * les joueurs cliquent sur ses boutons (relayés par le réseau).
 */
import { rollPool } from "./dice/roll.mjs";
import { hasStatus, setStatus, hungerThreshold } from "./status.mjs";
import { loc, registerLocalizable } from "./i18n.mjs";

const SOCKET = "system.noctis";
const TEMPLATE = "systems/noctis/templates/chat/beast-card.hbs";
const isGM = () => game.users.activeGM?.isSelf;

export const PROVOCATIONS = {
  frenzy: [
    { key: "smell", label: "NOCTIS.js.OdeurDuSangEnEtantAssoiffe", diff: 3 },
    { key: "sight", label: "NOCTIS.js.VueDuSangEnEtantAssoiffe", diff: 4 },
    { key: "harass", label: "NOCTIS.js.Harcelement", diff: 4 },
    { key: "danger", label: "NOCTIS.js.VieEnDanger", diff: 4 },
    { key: "words", label: "NOCTIS.js.ParolesBlessantes", diff: 4 },
    { key: "physical", label: "NOCTIS.js.ProvocationsPhysiques", diff: 6 },
    { key: "taste", label: "NOCTIS.js.GoutDuSangEnEtantAssoiffe", diff: 6 },
    { key: "loved", label: "NOCTIS.js.EtreAimeEnDanger", diff: 7 },
    { key: "humiliation", label: "NOCTIS.js.HumiliationPubliqueDeliberee", diff: 8 },
    { key: "starving", label: "NOCTIS.js.SoifDevorantePlusUneGoutteDe", diff: 8 }
  ],
  panic: [
    { key: "lamp", label: "NOCTIS.js.AllumerUneLampe", diff: 3 },
    { key: "torch", label: "NOCTIS.js.VueDUneTorche", diff: 5 },
    { key: "bonfire", label: "NOCTIS.js.FeuDeJoie", diff: 6 },
    { key: "veiled", label: "NOCTIS.js.LumiereDuSoleilOccultee", diff: 7 },
    { key: "burned", label: "NOCTIS.js.Brule", diff: 7 },
    { key: "sun", label: "NOCTIS.js.LumiereDuSoleilDirecte", diff: 8 },
    { key: "trapped", label: "NOCTIS.js.PiegeDansUnBatimentEnFlammes", diff: 9 }
  ]
};

export function registerBeastSettings() {
  game.settings.register("noctis", "beastAuto", {
    name: loc("NOCTIS.js.LaBeteTestsAutomatiques"),
    hint: loc("NOCTIS.js.ProposeDOfficeLesTestsDe"),
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register("noctis", "hungerThreshold", {
    name: loc("NOCTIS.js.SeuilDeLaSoif"),
    hint: loc("NOCTIS.js.UnVampireEstAssoiffeEtatDu"),
    scope: "world", config: true, type: Number, default: 4, range: { min: 0, max: 10, step: 1 }
  });
}

const auto = () => { try { return game.settings.get("noctis", "beastAuto"); } catch (e) { return true; } };

/* -------------------------------------------- */
/*  Démarrage d'un test                          */
/* -------------------------------------------- */

/**
 * Propose un test de la Bête.
 * @param {Actor} actor
 * @param {object} o { kind: "frenzy"|"panic", difficulty, reason }
 */
export async function beastTest(actor, { kind = "frenzy", difficulty = 6, reason = "" } = {}) {
  if (!actor?.system?.isVampire) return;
  if (!isGM()) {
    if (!game.users.activeGM) return ui.notifications.error(loc("NOCTIS.js.AucunMjConnectePourResoudreLe"));
    return game.socket.emit(SOCKET, { action: "beastStart", actorUuid: actor.uuid, kind, difficulty, reason });
  }
  return gmStart(actor, { kind, difficulty, reason });
}

async function gmStart(actor, { kind, difficulty, reason }) {
  if (["torpor", "dead", "incapacitated"].some(id => hasStatus(actor, id))) return;
  if (hasStatus(actor, kind)) return; // déjà sous l'emprise de la Bête
  const s = actor.system;
  const state = {
    actorUuid: actor.uuid, name: actor.token?.name ?? actor.name, img: actor.token?.texture?.src ?? actor.img,
    kind, kindLabel: kind === "frenzy" ? loc("NOCTIS.js.Frenesie") : loc("NOCTIS.js.Panique"),
    difficulty: Math.max(2, Math.min(10, Number(difficulty) || 6)), reason,
    accumulated: 0, rolls: [], stage: "pending", isPC: !!actor.isPC
  };
  // En frénésie, on est insensible à la panique
  if (kind === "panic" && hasStatus(actor, "frenzy")) {
    state.stage = "immune"; state.outcome = loc("NOCTIS.js.EnFrenesieInsensibleALaPanique");
    return saveState(null, state);
  }
  if (kind === "frenzy" && s.virtues.selfcontrol.type === "instinct") {
    state.instinct = true;
  }
  const conscience = s.virtues.conscience?.value ?? 0;
  if (kind === "frenzy" && conscience) state.evilDifficulty = Math.max(2, 9 - conscience);
  describePool(actor, state);
  // PNJ : le MJ n'a rien à cliquer, le jet part tout seul
  if (!state.isPC) await doStep(state, actor, state.instinct ? "succumb" : "roll");
  return saveState(null, state);
}

function describePool(actor, state) {
  const s = actor.system;
  if (state.kind === "frenzy") {
    const v = s.virtues.selfcontrol.value;
    const cap = s.usesBlood ? Math.min(v, s.blood.value) : v;
    state.pool = cap;
    state.poolLabel = `${s.virtues.selfcontrol.label} ${v}${cap < v ? loc("NOCTIS.js.LimiteAParLaReserveDe", { cap }) : ""}`;
  } else {
    state.pool = s.virtues.courage.value;
    state.poolLabel = loc("NOCTIS.js.Courage2", { pool: state.pool });
  }
}

/* -------------------------------------------- */
/*  Résolution (MJ)                              */
/* -------------------------------------------- */

async function doStep(state, actor, choice) {
  if (choice === "diffUp" || choice === "diffDown") {
    state.difficulty = Math.max(2, Math.min(10, state.difficulty + (choice === "diffUp" ? 1 : -1)));
    return;
  }
  if (choice === "succumb") return succumb(state, actor, false);
  if (choice === "roll" || choice === "evil") {
    describePool(actor, state);
    const diff = choice === "evil" && state.evilDifficulty ? state.evilDifficulty : state.difficulty;
    const r = await rollPool({ actor, pool: state.pool, difficulty: diff, toChat: false, noWoundPenalty: true });
    state.rolls.push({ faces: r.faces, successes: r.successes, botch: r.botch, difficulty: diff, pool: r.pool, evil: choice === "evil" });
    if (r.botch) return succumb(state, actor, true);
    if (r.successes <= 0) return succumb(state, actor, false);
    state.accumulated += r.successes;
    if (state.accumulated >= 5) {
      state.stage = "resisted";
      state.outcome = loc("NOCTIS.js.DompteSaBeteReussitesSur5", { name: state.name, accumulated: state.accumulated });
    } else {
      state.stage = "delayed";
      state.outcome = loc("NOCTIS.js.LaBeteEstRepousseeDeTour", { successes: r.successes, p1: r.successes > 1 ? "s" : "", accumulated: state.accumulated });
    }
  }
}

async function succumb(state, actor, botch) {
  state.stage = "succumbed";
  state.botch = botch;
  if (state.kind === "panic" && botch) {
    await setStatus(actor, "frenzy", true);
    state.outcome = loc("NOCTIS.js.EchecCritiqueSombreDansLaFrenesie", { name: state.name });
    return;
  }
  await setStatus(actor, state.kind, true);
  if (state.kind === "frenzy") {
    state.outcome = botch
      ? loc("NOCTIS.js.EchecCritiqueResteEnFrenesieJusqu", { name: state.name })
      : loc("NOCTIS.js.CedeALaFrenesieIlIgnore", { name: state.name });
  } else {
    state.outcome = loc("NOCTIS.js.CedeALaPaniqueIlFuit", { name: state.name });
  }
  state.outcome += loc("NOCTIS.js.1PointDeVolontePermetDe");
}

async function renderCard(state) {
  const st = foundry.utils.deepClone(state);
  st.open = ["pending", "delayed"].includes(st.stage);
  st.isFrenzy = st.kind === "frenzy";
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, st);
}

async function saveState(message, state) {
  const content = await renderCard(state);
  if (message) return message.update({ content, "flags.noctis.beast": state });
  return ChatMessage.create({ content, speaker: { alias: loc("NOCTIS.js.LaBete") }, flags: { noctis: { type: "beast", beast: state } } });
}

async function gmStep({ messageId, choice, userId }) {
  const message = game.messages.get(messageId);
  const state = foundry.utils.deepClone(message?.flags?.noctis?.beast);
  if (!state || !["pending", "delayed"].includes(state.stage)) return;
  const user = game.users.get(userId) ?? game.user;
  const actor = await fromUuid(state.actorUuid);
  if (!actor) return;
  if (["diffUp", "diffDown"].includes(choice) && !user.isGM) return;
  if (!user.isGM && !actor.testUserPermission(user, "OWNER")) return;
  await doStep(state, actor, choice);
  return saveState(message, state);
}

/* -------------------------------------------- */
/*  Client : boutons et réseau                   */
/* -------------------------------------------- */

export async function bindBeastCard(message, root) {
  const state = message.flags?.noctis?.beast;
  if (!state) return;
  const actor = await fromUuid(state.actorUuid);
  const owner = game.user.isGM || actor?.isOwner;
  root.querySelectorAll("[data-beast-owner]").forEach(el => { if (!owner) el.remove(); });
  root.querySelectorAll("[data-beast-gm]").forEach(el => { if (!game.user.isGM) el.remove(); });
  root.querySelectorAll("[data-beast-pending]").forEach(el => { if (owner) el.remove(); });
  for (const btn of root.querySelectorAll("[data-beast-step]")) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      root.querySelectorAll("[data-beast-step]").forEach(b => b.disabled = true);
      const choice = btn.dataset.beastStep;
      if (isGM()) return gmStep({ messageId: message.id, choice, userId: game.user.id });
      game.socket.emit(SOCKET, { action: "beastStep", messageId: message.id, choice, userId: game.user.id });
    });
  }
}

export async function handleBeastSocket(data) {
  if (!isGM()) return;
  if (data?.action === "beastStart") {
    const actor = await fromUuid(data.actorUuid);
    if (actor) return gmStart(actor, data);
  }
  if (data?.action === "beastStep") return gmStep(data);
}

/* -------------------------------------------- */
/*  Fiche : reprendre le contrôle, fin de crise   */
/* -------------------------------------------- */

export async function lucidTurn(actor) {
  if (!["frenzy", "panic"].some(id => hasStatus(actor, id))) return;
  if (!(await actor.spendWillpower(1))) return;
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: loc("NOCTIS.js.Depense1PointDeVolonteEt", { name: actor.name }) });
}

export async function endCrisis(actor) {
  const was = ["frenzy", "panic"].filter(id => hasStatus(actor, id));
  if (!was.length) return;
  for (const id of was) await actor.toggleStatusEffect(id, { active: false });
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: loc("NOCTIS.js.ReprendSesEspritsFinDeLa", { name: actor.name, p1: was.includes("frenzy") ? loc("NOCTIS.js.Frenesie2") : loc("NOCTIS.js.Panique"), p2: was.includes("frenzy") ? loc("NOCTIS.js.LaDouleurDesBlessuresRevient") : "" }) });
}

/** Fenêtre « Provocation » : choisir la cause et la difficulté. */
export async function provocationDialog(actor, kind = "frenzy") {
  const { DialogV2 } = foundry.applications.api;
  const list = PROVOCATIONS[kind];
  const conscience = actor.system.virtues.conscience?.value ?? 0;
  const opts = list.map((p, i) => loc("NOCTIS.js.Difficulte", { i, label: p.label, diff: p.diff })).join("")
    + (kind === "frenzy" && conscience ? loc("NOCTIS.js.RisqueDeCommettreUneAtrociteDifficulte", { p0: Math.max(2, 9 - conscience), label: actor.system.virtues.conscience.label }) : "")
    + loc("NOCTIS.js.AutreDifficulteLibre");
  const data = await DialogV2.prompt({
    window: { title: kind === "frenzy" ? loc("NOCTIS.js.TestDeFrenesie") : loc("NOCTIS.js.TestDePanique"), icon: kind === "frenzy" ? "fa-solid fa-face-angry" : "fa-solid fa-fire" },
    content: loc("NOCTIS.js.ProvocationDifficulteLibrePrecision", { p0: kind === "frenzy" ? loc("NOCTIS.js.MaitriseDeSoiLimiteeParLa") : loc("NOCTIS.js.Courage5ReussitesCumuleesRepoussentLa"), opts }),
    ok: { label: loc("NOCTIS.js.LancerLeTest"), icon: "fa-solid fa-dice-d10", callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
    rejectClose: false
  }).catch(() => null);
  if (!data) return;
  let difficulty = Number(data.diff) || 6, reason = data.reason || "";
  if (data.prov === "evil") { difficulty = Math.max(2, 9 - conscience); reason = reason || loc("NOCTIS.js.RisqueDeCommettreUneAtrocite"); }
  else if (data.prov !== "custom") { const p = list[Number(data.prov)]; difficulty = p.diff; reason = [p.label, data.reason].filter(Boolean).join(" — "); }
  return beastTest(actor, { kind, difficulty, reason });
}

/* -------------------------------------------- */
/*  Déclencheurs automatiques                    */
/* -------------------------------------------- */

/** Une seule fois par tour de combat et par cause pour un même acteur. */
async function once(actor, key) {
  const cbt = game.combat;
  const stamp = cbt?.started ? `${cbt.id}.${cbt.round}.${key}` : `${Math.floor(Date.now() / 60000)}.${key}`;
  const seen = actor.getFlag("noctis", "beastSeen") ?? [];
  if (seen.includes(stamp)) return false;
  await actor.setFlag("noctis", "beastSeen", [...seen.slice(-20), stamp]);
  return true;
}

const hungry = (a) => a?.system?.isVampire && a.system.blood.value <= hungerThreshold();

/** Après une confrontation : feu, brûlure, sang versé, goût du sang. */
export async function afterClash(state, attacker, defender) {
  if (!auto() || !isGM()) return;
  const remaining = state.result?.remaining ?? 0;
  // Feu et soleil contre un vampire
  if (state.weapon?.fire && defender.system.isVampire) {
    if (remaining > 0 && await once(defender, "burned")) await gmStart(defender, { kind: "panic", difficulty: 7, reason: loc("NOCTIS.js.Brule") });
    else if (await once(defender, "torch")) await gmStart(defender, { kind: "panic", difficulty: 5, reason: loc("NOCTIS.js.VueDUneTorche") });
  }
  // Goût du sang en se nourrissant (assoiffé)
  if (state.maneuver?.effect === "feed" && hungry(attacker) && await once(attacker, "taste")) {
    await gmStart(attacker, { kind: "frenzy", difficulty: 6, reason: loc("NOCTIS.js.GoutDuSangEnEtantAssoiffe") });
  }
  // Vue du sang : dégâts létaux ou aggravés subis, pour les vampires assoiffés présents au combat
  const bled = remaining > 0 && ["lethal", "aggravated"].includes(state.weapon?.damageType);
  if (bled) {
    const present = new Set([attacker, defender]);
    for (const c of game.combat?.combatants ?? []) if (c.actor) present.add(c.actor);
    for (const a of present) {
      if (!hungry(a) || hasStatus(a, "frenzy")) continue;
      if (await once(a, "sight")) await gmStart(a, { kind: "frenzy", difficulty: 4, reason: loc("NOCTIS.js.VueDuSangEnEtantAssoiffe2", { name: state.defender.name }) });
    }
  }
}

/** Réserve tombée à zéro : la Soif pousse à la frénésie. */
export async function onBloodChange(actor, changes) {
  if (!auto() || !isGM() || !actor.system.isVampire) return;
  const v = foundry.utils.getProperty(changes, "system.blood.value");
  if (v !== 0 || hasStatus(actor, "starving") || hasStatus(actor, "torpor")) return;
  if (await once(actor, "starving")) await gmStart(actor, { kind: "frenzy", difficulty: 8, reason: loc("NOCTIS.js.SoifDevorantePlusUneGoutteDe2") });
}

registerLocalizable(PROVOCATIONS);
