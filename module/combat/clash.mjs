/**
 * Confrontations automatisées (jet opposé) : attaque → défense → dégâts → absorption.
 * Toute la logique s'exécute chez le MJ actif ; les joueurs envoient leurs choix par le réseau.
 * L'état complet vit dans les drapeaux du message de chat (flags.noctis.clash).
 */
import { NOCTIS } from "../config.mjs";
import { rollPool } from "../dice/roll.mjs";
import { rule } from "../variants.mjs";
import { hasStatus, setStatus } from "../status.mjs";
import { afterClash } from "../beast.mjs";
import { loc } from "../i18n.mjs";

const SOCKET = "system.noctis";
const TEMPLATE = "systems/noctis/templates/chat/clash-card.hbs";

/* -------------------------------------------- */
/*  Utilitaires                                  */
/* -------------------------------------------- */

const isGM = () => game.users.activeGM?.isSelf;

/** Résout un participant (jeton de scène de préférence, sinon acteur). */
async function resolveActor(ref) {
  if (!ref) return null;
  if (ref.tokenUuid) {
    const t = await fromUuid(ref.tokenUuid);
    if (t?.actor) return t.actor;
  }
  return ref.actorUuid ? fromUuid(ref.actorUuid) : null;
}

/** Description d'un participant pour la carte. */
export function participant(actor, token) {
  const tokDoc = token?.document ?? token ?? actor?.token ?? null;
  return {
    name: tokDoc?.name ?? actor.name,
    img: tokDoc?.texture?.src ?? actor.prototypeToken?.texture?.src ?? actor.img,
    actorUuid: actor.uuid,
    tokenUuid: tokDoc?.uuid ?? null,
    isPC: !!actor.isPC
  };
}

/** Résumé d'un jet pour la carte (sans message de chat). */
function rollSummary(r, extra = {}) {
  return { pool: r.pool, difficulty: r.difficulty, faces: r.faces, successes: r.successes, botch: r.botch, ...extra };
}

/** Jeton de l'acteur sur la scène courante. */
export function tokenFor(actor) {
  if (!canvas?.ready) return null;
  if (actor.token?.object) return actor.token.object;
  const controlled = canvas.tokens.controlled.find(t => t.actor === actor);
  return controlled ?? actor.getActiveTokens(true, false)[0] ?? null;
}

/** Distance en cases entre deux jetons. */
export function cellsBetween(a, b) {
  try {
    const m = canvas.grid.measurePath([a.center, b.center]);
    if (Number.isFinite(m.spaces)) return m.spaces;
    return Math.round(m.distance / (canvas.scene.grid.distance || 1));
  } catch (e) {
    const size = canvas.grid.size || 100;
    return Math.max(Math.abs(a.center.x - b.center.x), Math.abs(a.center.y - b.center.y)) / size;
  }
}

/** Jetons visibles de la scène, classés par portée depuis le jeton de l'attaquant. */
export function targetsByRange(actor) {
  const me = tokenFor(actor);
  const out = { melee: [], close: [], far: [], hasToken: !!me };
  if (!me) return out;
  for (const t of canvas.tokens.placeables) {
    if (t === me || !t.actor || t.document.hidden && !game.user.isGM) continue;
    const d = cellsBetween(me, t);
    const entry = { tokenUuid: t.document.uuid, name: t.document.name, cells: d };
    if (d <= 1) out.melee.push(entry);
    else if (d <= 5) out.close.push(entry);
    else out.far.push(entry);
  }
  for (const k of ["melee", "close", "far"]) out[k].sort((x, y) => x.cells - y.cells || x.name.localeCompare(y.name, "fr"));
  return out;
}

/* -------------------------------------------- */
/*  Rendu de la carte                            */
/* -------------------------------------------- */

async function renderCard(state) {
  const st = foundry.utils.deepClone(state);
  st.waitingDefense = st.stage === "defense";
  st.waitingDamage = st.stage === "damage";
  st.waitingSoak = st.stage === "soak";
  st.finished = ["done", "missed"].includes(st.stage);
  st.hit = st.stage !== "missed" && (st.net ?? 0) > 0;
  return foundry.applications.handlebars.renderTemplate(TEMPLATE, st);
}

async function saveState(message, state) {
  const content = await renderCard(state);
  if (message) return message.update({ content, "flags.noctis.clash": state });
  return ChatMessage.create({ content, speaker: { alias: `${state.attacker.name} contre ${state.defender.name}` }, flags: { noctis: { type: "clash", clash: state } }, sound: CONFIG.sounds.dice });
}

/* -------------------------------------------- */
/*  Moteur (côté MJ)                             */
/* -------------------------------------------- */

/** Démarre une confrontation à partir d'un jet d'attaque déjà lancé. */
async function gmStart(payload) {
  const state = payload.state;
  state.stage = "defense";
  state.log = [];
  const atk = state.attack;
  // Cible paralysée (pieu au cœur) : l'attaque réussit automatiquement
  const target = await resolveActor(state.defender);
  if (hasStatus(target, "staked") && (atk.botch || atk.successes <= 0)) {
    atk.botch = false; atk.successes = 1; atk.autoHit = loc("NOCTIS.js.CibleParalyseeLAttaqueReussitAutomatique");
  }
  if (atk.botch || atk.successes <= 0) {
    state.stage = "missed";
    state.missReason = atk.botch ? loc("NOCTIS.js.EchecCritiqueDeLAttaque") : loc("NOCTIS.js.LAttaqueEchoue");
    state.defense = null;
    return saveState(null, state);
  }
  await advance(state);
  return saveState(null, state);
}

/** Fait avancer automatiquement tout ce qui ne dépend pas d'un joueur. */
async function advance(state) {
  for (let guard = 0; guard < 10; guard++) {
    const attacker = await resolveActor(state.attacker);
    const defender = await resolveActor(state.defender);
    if (!attacker || !defender) { state.stage = "done"; state.error = loc("NOCTIS.js.ParticipantIntrouvable"); return; }

    if (state.stage === "defense") {
      state.defenseDifficulty = defenseDifficulty(state, defender);
      if (!defender.canDefend) {
        state.defense = { mode: "none", label: noDefenseReason(defender), successes: 0 };
        state.stage = "resolve";
      } else if (!state.defender.isPC) {
        const best = defender.defenseOptions(state.attackKind)[0];
        await doDefense(state, defender, best?.key);
      } else {
        state.defenseChoices = defender.defenseOptions(state.attackKind).map(o => ({ key: o.key, label: o.label, pool: o.pool, parts: o.parts }));
        state.defenseCost = defender.defenseCostLabel;
        return; // le joueur choisit
      }
    }

    if (state.stage === "resolve") {
      state.net = Math.max(0, (state.attack.successes ?? 0) - (state.defense?.successes ?? 0));
      if (state.net <= 0) { state.stage = "missed"; state.missReason = loc("NOCTIS.js.LaDefenseAnnuleToutesLesReussites"); return; }
      // Manœuvres sans jet de dégâts (saisie, morsure pour se nourrir)
      if (state.noDamage) { state.stage = "effects"; }
      const allHits = game.settings.get("noctis", "damageAllSuccesses");
      const extra = allHits ? state.net : state.net - 1;
      state.damagePool = Math.max(0, (state.weapon.damageBase ?? 0) + extra);
      state.damageFormula = `${state.weapon.damageBase ?? 0} + ${state.net}${allHits ? "" : " − 1"}`;
      const w = state.weapon;
      state.damageParts = [
        `${w.name} : ${w.damageLabel || w.damageBase} = ${w.damageBase}`,
        `${allHits ? loc("NOCTIS.js.ReussitesDeLAttaque") : loc("NOCTIS.js.ReussitesExcedentaires2")} +${Math.max(0, extra)}`,
        ...(w.armorPiercing ? [loc("NOCTIS.js.PerforationDArmure", { armorPiercing: w.armorPiercing })] : []),
        ...(w.might ? [loc("NOCTIS.js.ReussiteSAutomatiqueSVigueurSurnaturelle", { might: w.might })] : [])
      ].join(" · ");
      if (!state.noDamage) state.stage = "damage";
    }

    // Variante : les PNJ prennent le résultat moyen au lieu de lancer les dés
    if (state.stage === "damage") {
      if (state.attacker.isPC) return; // le joueur lance ses dégâts
      await doDamage(state, attacker, false, "", rule("npcAverage"));
    }

    if (state.stage === "soak") {
      if (state.defender.isPC) {
        state.wpSoak = rule("willpowerSoak") && (defender.system.willpower?.temporary ?? 0) > 0;
        return; // le joueur absorbe
      }
      await doSoak(state, defender, false);
    }

    if (state.stage === "effects" || (state.stage === "done" && !state.effectsApplied)) {
      await applyEffects(state, attacker, defender);
      state.stage = "done";
    }

    if (["done", "missed"].includes(state.stage)) return;
  }
}

async function doDefense(state, defender, mode) {
  if (!mode || mode === "none") {
    state.defense = { mode: "none", label: loc("NOCTIS.js.AucuneDefense"), successes: 0 };
    state.stage = "resolve";
    return;
  }
  const opt = defender.defenseOptions(state.attackKind).find(o => o.key === mode);
  if (!opt) { state.defense = { mode: "none", label: loc("NOCTIS.js.DefenseImpossible"), successes: 0 }; state.stage = "resolve"; return; }
  const paid = await defender.payDefense();
  if (!paid.ok) { state.defense = { mode: "none", label: loc("NOCTIS.js.PlusDActionCeTour0"), successes: 0 }; state.stage = "resolve"; return; }
  const r = await rollPool({ actor: defender, pool: opt.pool, difficulty: state.defenseDifficulty ?? 6, toChat: false });
  state.defense = rollSummary(r, { mode, label: opt.label, parts: [opt.parts, paid.note].filter(Boolean).join(" · ") });
  state.stage = "resolve";
}

async function doDamage(state, attacker, half, halfReason = "", average = false) {
  const r = average
    ? { pool: state.damagePool, difficulty: 6, faces: [], successes: Math.ceil(state.damagePool / 2) + (state.weapon.might ?? 0), botch: false, average: true }
    : await rollPool({ actor: attacker, pool: state.damagePool, difficulty: 6, noBotch: true, toChat: false, bonusSuccesses: state.weapon.might ?? 0 });
  let levels = r.successes;
  const minApplied = rule("minDamage") && levels < 1;
  if (minApplied) levels = 1;
  const before = levels;
  if (half) levels = Math.ceil(levels / 2);
  state.damage = rollSummary(r, { average: !!r.average, half, halfReason: halfReason || (half ? loc("NOCTIS.js.CoupRetenu") : ""), before, minApplied, levels, type: state.weapon.damageType, typeLabel: state.weapon.damageTypeLabel, parts: state.damageParts ?? "" });
  if (levels <= 0) { state.stage = "done"; state.result = { remaining: 0, note: loc("NOCTIS.js.AucunDegat") }; return; }
  // Désarmement : si les dégâts dépassent la Force de la cible, elle est désarmée sans blessure
  if (state.maneuver?.effect === "disarm") {
    const defender = await resolveActor(state.defender);
    const str = defender?.system.attributes.strength.total ?? 0;
    if (levels > str) { state.disarm = { meters: levels - str, str }; state.result = { remaining: 0, note: loc("NOCTIS.js.DesarmeReussitesContreForce", { levels, str }) }; state.stage = "effects"; return; }
  }
  state.stage = "soak";
}

async function doSoak(state, defender, half, { willpower = false, halfReason = "" } = {}) {
  const res = await defender.receiveDamage({ amount: state.damage.levels, type: state.weapon.damageType, soak: true, armorPiercing: state.weapon.armorPiercing ?? 0, fire: !!state.weapon.fire, ignoreArmor: !!state.maneuver?.ignoreArmor, willpower, source: state.attacker.name, quiet: true, half });
  state.soak = res.soakResult ? rollSummary(res.soakResult, { parts: (res.soakResult.parts ?? []).join(" · "), willpower: !!res.soakResult.willpower, average: !!res.soakResult.average }) : null;
  state.result = { remaining: res.remaining, halved: res.halved, half, halfReason: halfReason || (half ? loc("NOCTIS.js.MoitieDesDegatsChoisieArrondiAu") : ""), typeLabel: res.typeLabel, status: res.status, torpor: res.torpor, finalDeath: res.finalDeath, incapacitated: res.incapacitated };
  state.stage = "done";
}

/** Difficulté de la défense : manœuvre adverse (riposte, suppression) et cécité. */
function defenseDifficulty(state, defender) {
  let d = 6 + (state.maneuver?.defenseDiff ?? 0);
  if (hasStatus(defender, "blinded")) d += 2;
  return Math.min(10, d);
}

function noDefenseReason(defender) {
  const st = defender.statuses ?? new Set();
  if (st.has("staked")) return loc("NOCTIS.js.ParalyseParUnPieuAucuneDefense");
  if (st.has("torpor") || st.has("incapacitated") || st.has("dead")) return loc("NOCTIS.js.HorsDeCombatAucuneDefense");
  if (defender.system.combat?.noDefense) return loc("NOCTIS.js.CoupPuissantPorteCeTourAucune");
  return loc("NOCTIS.js.PlusDActionCeTour0");
}

/** Effets des manœuvres et complications, une fois l'attaque résolue (touchée). */
async function applyEffects(state, attacker, defender) {
  state.effectsApplied = true;
  const fx = [];
  const m = state.maneuver;
  const remaining = state.result?.remaining ?? 0;
  switch (m?.effect) {
    case "prone":
      await setStatus(defender, "prone", true);
      fx.push(loc("NOCTIS.js.ChuteDexteriteAthletismeDifficulte6Pour", { name: state.defender.name }));
      break;
    case "grapple":
      await setStatus(defender, "grappled", true);
      await setStatus(attacker, "grappled", true);
      fx.push(loc("NOCTIS.js.LutteEngageeChacunPeutInfligerSa"));
      break;
    case "hold":
      await setStatus(defender, "grappled", true);
      fx.push(loc("NOCTIS.js.EstMaintenuPourAgirIlDoit", { name: state.defender.name }));
      break;
    case "tackle": {
      for (const [ref, a] of [[state.attacker, attacker], [state.defender, defender]]) {
        const ath = (a.system.attributes.dexterity.total ?? 0) + (a.system.abilities.athletics?.total ?? 0);
        const r = await rollPool({ actor: a, pool: ath, difficulty: 7, toChat: false });
        const down = r.successes <= 0;
        if (down) await setStatus(a, "prone", true);
        fx.push(loc("NOCTIS.js.DexteriteAthletismeDesDiff7Reussite", { name: ref.name, ath, successes: r.successes, p3: down ? "chute" : loc("NOCTIS.js.ResteDeboutDifficulte1AuProchain") }));
      }
      break;
    }
    case "disarm":
      if (state.disarm) {
        const w = defender.items.find(i => i.type === "weapon" && i.system.equipped);
        if (w) await w.update({ "system.equipped": false });
        fx.push(loc("NOCTIS.js.EstDesarmeVoleAM", { name: state.defender.name, p1: w ? ` : ${w.name}` : "", meters: state.disarm.meters }));
      }
      break;
    case "stake":
      if (remaining >= 3) {
        if (defender.system.isVampire) { await setStatus(defender, "staked", true); fx.push(loc("NOCTIS.js.LePieuTransperceLeCurDe", { name: state.defender.name })); }
        else fx.push(loc("NOCTIS.js.LeTraitTransperceLeCurDe", { name: state.defender.name }));
      } else fx.push(loc("NOCTIS.js.LeCurNEstPasAtteint", { remaining }));
      break;
    case "feed": {
      const vb = defender.system.blood;
      const ab = attacker.system.blood;
      const room = Math.max(0, (ab.max ?? 0) - (ab.value ?? 0));
      const n = Math.max(0, Math.min(3, vb.value ?? 0, room));
      if (n) {
        await defender.update({ "system.blood.value": vb.value - n });
        await attacker.update({ "system.blood.value": ab.value + n });
      }
      fx.push(loc("NOCTIS.js.LeBaiserBoitPointSDe", { name: state.attacker.name, n, value: attacker.system.blood.value, max: ab.max, name2: state.defender.name, p5: (vb.value - n) <= 0 ? loc("NOCTIS.js.LaVictimeEstVideeElleMeurt") : loc("NOCTIS.js.IlLuiRestePointS", { p0: vb.value - n }) }));
      if (room < 3 && room === n) fx.push(loc("NOCTIS.js.LaReserveDeSangDeL"));
      break;
    }
    case "suppress":
      fx.push(loc("NOCTIS.js.SIlContinueDAvancerSe", { name: state.defender.name }));
      break;
  }
  if (m?.needsHold && !hasStatus(defender, "grappled")) fx.push(loc("NOCTIS.js.RappelLaMorsureSupposeUneCible"));
  // Étourdissement : plus de Vigueur + 2 niveaux en une attaque
  const sta = defender.system.attributes.stamina.total ?? 0;
  if (remaining > sta + 2 && !hasStatus(defender, "dead")) {
    await setStatus(defender, "stunned", true);
    fx.push(loc("NOCTIS.js.EstEtourdiNiveauxVigueur2Il", { name: state.defender.name, remaining, sta }));
  }
  if (state.attack?.autoHit) fx.unshift(state.attack.autoHit);
  if (fx.length) state.effects = fx;
  try { await afterClash(state, attacker, defender); } catch (err) { console.warn(loc("NOCTIS.js.NoctisLaBeteApresLaConfrontation"), err); }
}

/** Choix d'un joueur (ou du MJ) sur une carte. */
async function gmStep({ messageId, step, choice, userId }) {
  const message = game.messages.get(messageId);
  const state = foundry.utils.deepClone(message?.flags?.noctis?.clash);
  if (!state) return;
  const user = game.users.get(userId) ?? game.user;
  const attacker = await resolveActor(state.attacker);
  const defender = await resolveActor(state.defender);
  const owns = (a) => user.isGM || a?.testUserPermission(user, "OWNER");

  if (step === "defend" && state.stage === "defense") {
    if (!owns(defender)) return;
    await doDefense(state, defender, choice);
  } else if (step === "damage" && state.stage === "damage") {
    if (!owns(attacker)) return;
    await doDamage(state, attacker, choice === "half");
  } else if (step === "soak" && state.stage === "soak") {
    if (!owns(defender)) return;
    const half = choice === "half" || choice === "wpHalf";
    await doSoak(state, defender, half, { willpower: choice === "wp" || choice === "wpHalf" });
  } else return;
  await advance(state);
  return saveState(message, state);
}

/* -------------------------------------------- */
/*  Côté client                                  */
/* -------------------------------------------- */

/** Envoie la confrontation au MJ (ou l'exécute si l'on est MJ). */
export async function startClash(state) {
  if (isGM()) return gmStart({ state });
  if (!game.users.activeGM) return ui.notifications.error(loc("NOCTIS.js.AucunMjConnecteLaConfrontationNe"));
  game.socket.emit(SOCKET, { action: "clashStart", state, userId: game.user.id });
}

function sendStep(messageId, step, choice) {
  if (isGM()) return gmStep({ messageId, step, choice, userId: game.user.id });
  if (!game.users.activeGM) return ui.notifications.error(loc("NOCTIS.js.AucunMjConnecte"));
  game.socket.emit(SOCKET, { action: "clashStep", messageId, step, choice, userId: game.user.id });
}

/** Boutons de la carte : n'affiche que ceux du joueur concerné. */
export async function bindClashCard(message, root) {
  const state = message.flags?.noctis?.clash;
  if (!state) return;
  for (const el of root.querySelectorAll("[data-clash-owner]")) {
    const who = el.dataset.clashOwner === "attacker" ? state.attacker : state.defender;
    const actor = await resolveActor(who);
    if (!(game.user.isGM || actor?.isOwner)) el.remove();
  }
  for (const el of root.querySelectorAll("[data-clash-pending]")) {
    const who = el.dataset.clashPending === "attacker" ? state.attacker : state.defender;
    const actor = await resolveActor(who);
    if (game.user.isGM || actor?.isOwner) el.remove();
  }
  for (const btn of root.querySelectorAll("[data-clash-step]")) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      root.querySelectorAll("[data-clash-step]").forEach(b => b.disabled = true);
      sendStep(message.id, btn.dataset.clashStep, btn.dataset.choice);
    });
  }
}

/** Messages réseau propres aux confrontations et à la Vélocité. */
export async function handleSocket(data) {
  if (data?.action === "clashStart" && isGM()) return gmStart(data);
  if (data?.action === "clashStep" && isGM()) return gmStep(data);
  if (data?.action === "celerityPrompt" && data.userId === game.user.id) {
    const actor = await fromUuid(data.actorUuid);
    if (actor) return promptCelerity([actor]);
  }
}

/* -------------------------------------------- */
/*  Tours de combat : actions et Vélocité        */
/* -------------------------------------------- */

/** Demande à un utilisateur combien de points de Vélocité activer pour chaque acteur. */
export async function promptCelerity(actors) {
  actors = actors.filter(a => a.celerityAvailable > 0);
  if (!actors.length) return;
  const { DialogV2 } = foundry.applications.api;
  const rows = actors.map((a, i) => {
    const max = a.celerityAvailable;
    const opts = Array.from({ length: max + 1 }, (_, n) => `<option value="${n}">${n === 0 ? loc("NOCTIS.js.PasDeVelocite") : loc("NOCTIS.js.PointDeSangActionEnPlus", { n, p1: n > 1 ? "s" : "", p2: n > 1 ? "s" : "" })}</option>`).join("");
    return loc("NOCTIS.js.SangTour", { img: a.img, name: a.name, p2: a.system.mechanicNames?.speed ?? loc("NOCTIS.js.Velocite"), speed: a.system.mechanics.speed, value: a.system.blood.value, perTurn: a.system.blood.perTurn, i, opts });
  }).join("");
  const data = await DialogV2.prompt({
    window: { title: loc("NOCTIS.js.NouveauTourVelocite"), icon: "fa-solid fa-bolt" },
    classes: ["noctis-celerity-dialog"],
    content: loc("NOCTIS.js.ChaquePointDeSangDepenseDonne", { rows }),
    ok: { label: loc("NOCTIS.js.Valider"), icon: "fa-solid fa-bolt", callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
    rejectClose: false
  }).catch(() => null);
  if (!data) return;
  for (const [i, a] of actors.entries()) {
    const n = Number(data[`cel${i}`]) || 0;
    if (n > 0) await a.activateCelerity(n);
  }
}

/** Début de chaque tour : remise à 1 action, puis proposition de Vélocité. */
export async function onCombatRound(combat, changed) {
  if (!isGM() || !("round" in changed) || !combat.started) return;
  const actors = [...new Set(combat.combatants.map(c => c.actor).filter(Boolean))];
  for (const a of actors) await a.resetActions();
  // Règle de base : initiative relancée à chaque tour (sauf au premier)
  if (!rule("initiativeOnce") && changed.round > 1) {
    try {
      await combat.resetAll();
      await combat.rollAll({ messageOptions: { flavor: loc("NOCTIS.js.InitiativeTour", { round: changed.round }) } });
      await combat.update({ turn: 0 });
    } catch (err) { console.warn(loc("NOCTIS.js.NoctisRelanceDeLInitiative"), err); }
  }
  const gmPrompt = [];
  for (const a of actors) {
    if (a.celerityAvailable <= 0) continue;
    const player = game.users.find(u => !u.isGM && u.active && a.testUserPermission(u, "OWNER"));
    if (player) game.socket.emit(SOCKET, { action: "celerityPrompt", actorUuid: a.uuid, userId: player.id });
    else gmPrompt.push(a);
  }
  if (gmPrompt.length) await promptCelerity(gmPrompt);
}
