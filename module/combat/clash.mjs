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
    atk.botch = false; atk.successes = 1; atk.autoHit = "Cible paralysée : l'attaque réussit automatiquement.";
  }
  if (atk.botch || atk.successes <= 0) {
    state.stage = "missed";
    state.missReason = atk.botch ? "Échec critique de l'attaque." : "L'attaque échoue.";
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
    if (!attacker || !defender) { state.stage = "done"; state.error = "Participant introuvable."; return; }

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
      if (state.net <= 0) { state.stage = "missed"; state.missReason = "La défense annule toutes les réussites."; return; }
      // Manœuvres sans jet de dégâts (saisie, morsure pour se nourrir)
      if (state.noDamage) { state.stage = "effects"; }
      const allHits = game.settings.get("noctis", "damageAllSuccesses");
      const extra = allHits ? state.net : state.net - 1;
      state.damagePool = Math.max(0, (state.weapon.damageBase ?? 0) + extra);
      state.damageFormula = `${state.weapon.damageBase ?? 0} + ${state.net}${allHits ? "" : " − 1"}`;
      const w = state.weapon;
      state.damageParts = [
        `${w.name} : ${w.damageLabel || w.damageBase} = ${w.damageBase}`,
        `${allHits ? "Réussites de l'attaque" : "Réussites excédentaires"} +${Math.max(0, extra)}`,
        ...(w.armorPiercing ? [`Perforation d'armure ${w.armorPiercing}`] : []),
        ...(w.might ? [`+${w.might} réussite(s) automatique(s) (vigueur surnaturelle)`] : [])
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
    state.defense = { mode: "none", label: "Aucune défense", successes: 0 };
    state.stage = "resolve";
    return;
  }
  const opt = defender.defenseOptions(state.attackKind).find(o => o.key === mode);
  if (!opt) { state.defense = { mode: "none", label: "Défense impossible", successes: 0 }; state.stage = "resolve"; return; }
  const paid = await defender.payDefense();
  if (!paid.ok) { state.defense = { mode: "none", label: "Plus d'action ce tour : 0 réussite", successes: 0 }; state.stage = "resolve"; return; }
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
  state.damage = rollSummary(r, { average: !!r.average, half, halfReason: halfReason || (half ? "coup retenu" : ""), before, minApplied, levels, type: state.weapon.damageType, typeLabel: state.weapon.damageTypeLabel, parts: state.damageParts ?? "" });
  if (levels <= 0) { state.stage = "done"; state.result = { remaining: 0, note: "Aucun dégât." }; return; }
  // Désarmement : si les dégâts dépassent la Force de la cible, elle est désarmée sans blessure
  if (state.maneuver?.effect === "disarm") {
    const defender = await resolveActor(state.defender);
    const str = defender?.system.attributes.strength.total ?? 0;
    if (levels > str) { state.disarm = { meters: levels - str, str }; state.result = { remaining: 0, note: `Désarmé : ${levels} réussites contre Force ${str}.` }; state.stage = "effects"; return; }
  }
  state.stage = "soak";
}

async function doSoak(state, defender, half, { willpower = false, halfReason = "" } = {}) {
  const res = await defender.receiveDamage({ amount: state.damage.levels, type: state.weapon.damageType, soak: true, armorPiercing: state.weapon.armorPiercing ?? 0, fire: !!state.weapon.fire, ignoreArmor: !!state.maneuver?.ignoreArmor, willpower, source: state.attacker.name, quiet: true, half });
  state.soak = res.soakResult ? rollSummary(res.soakResult, { parts: (res.soakResult.parts ?? []).join(" · "), willpower: !!res.soakResult.willpower, average: !!res.soakResult.average }) : null;
  state.result = { remaining: res.remaining, halved: res.halved, half, halfReason: halfReason || (half ? "Moitié des dégâts choisie (arrondi au supérieur)." : ""), typeLabel: res.typeLabel, status: res.status, torpor: res.torpor, finalDeath: res.finalDeath, incapacitated: res.incapacitated };
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
  if (st.has("staked")) return "Paralysé par un pieu : aucune défense";
  if (st.has("torpor") || st.has("incapacitated") || st.has("dead")) return "Hors de combat : aucune défense";
  if (defender.system.combat?.noDefense) return "Coup puissant porté ce tour : aucune défense";
  return "Plus d'action ce tour : 0 réussite";
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
      fx.push(`${state.defender.name} chute : Dextérité + Athlétisme (difficulté 6) pour se relever, −2 à l'initiative au prochain tour.`);
      break;
    case "grapple":
      await setStatus(defender, "grappled", true);
      await setStatus(attacker, "grappled", true);
      fx.push(`Lutte engagée : chacun peut infliger sa Force en dégâts ou tenter de se libérer (Force + Bagarre en opposition).`);
      break;
    case "hold":
      await setStatus(defender, "grappled", true);
      fx.push(`${state.defender.name} est maintenu : pour agir, il doit l'emporter sur un jet de Force + Bagarre en opposition.`);
      break;
    case "tackle": {
      for (const [ref, a] of [[state.attacker, attacker], [state.defender, defender]]) {
        const ath = (a.system.attributes.dexterity.total ?? 0) + (a.system.abilities.athletics?.total ?? 0);
        const r = await rollPool({ actor: a, pool: ath, difficulty: 7, toChat: false });
        const down = r.successes <= 0;
        if (down) await setStatus(a, "prone", true);
        fx.push(`${ref.name} : Dextérité + Athlétisme (${ath} dés, diff. 7) → ${r.successes} réussite(s), ${down ? "chute" : "reste debout (difficulté +1 au prochain tour)"}.`);
      }
      break;
    }
    case "disarm":
      if (state.disarm) {
        const w = defender.items.find(i => i.type === "weapon" && i.system.equipped);
        if (w) await w.update({ "system.equipped": false });
        fx.push(`${state.defender.name} est désarmé${w ? ` : ${w.name}` : ""} vole à ${state.disarm.meters} m.`);
      }
      break;
    case "stake":
      if (remaining >= 3) {
        if (defender.system.isVampire) { await setStatus(defender, "staked", true); fx.push(`Le pieu transperce le cœur de ${state.defender.name} : paralysé jusqu'à ce qu'on le retire.`); }
        else fx.push(`Le trait transperce le cœur de ${state.defender.name} : un mortel en meurt.`);
      } else fx.push(`Le cœur n'est pas atteint (${remaining} niveau(x) après absorption, il en faut 3).`);
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
      fx.push(`Le Baiser : ${state.attacker.name} boit ${n} point(s) de sang (${attacker.system.blood.value}/${ab.max}). ${state.defender.name} sombre dans l'extase et ne résiste plus.${(vb.value - n) <= 0 ? " La victime est vidée : elle meurt." : ` Il lui reste ${vb.value - n} point(s).`}`);
      if (room < 3 && room === n) fx.push("La réserve de sang de l'attaquant est pleine.");
      break;
    }
    case "suppress":
      fx.push(`S'il continue d'avancer, ${state.defender.name} se défend à difficulté +2 face à l'archer, qui tire à −2.`);
      break;
  }
  if (m?.needsHold && !hasStatus(defender, "grappled")) fx.push("Rappel : la morsure suppose une cible déjà agrippée (empoignade, saisie ou placage).");
  // Étourdissement : plus de Vigueur + 2 niveaux en une attaque
  const sta = defender.system.attributes.stamina.total ?? 0;
  if (remaining > sta + 2 && !hasStatus(defender, "dead")) {
    await setStatus(defender, "stunned", true);
    fx.push(`${state.defender.name} est étourdi (${remaining} niveaux > Vigueur ${sta} + 2) : il ne pourra pas agir au prochain tour.`);
  }
  if (state.attack?.autoHit) fx.unshift(state.attack.autoHit);
  if (fx.length) state.effects = fx;
  try { await afterClash(state, attacker, defender); } catch (err) { console.warn("NOCTIS | la Bête après la confrontation", err); }
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
  if (!game.users.activeGM) return ui.notifications.error("Aucun MJ connecté : la confrontation ne peut pas être résolue.");
  game.socket.emit(SOCKET, { action: "clashStart", state, userId: game.user.id });
}

function sendStep(messageId, step, choice) {
  if (isGM()) return gmStep({ messageId, step, choice, userId: game.user.id });
  if (!game.users.activeGM) return ui.notifications.error("Aucun MJ connecté.");
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
    const opts = Array.from({ length: max + 1 }, (_, n) => `<option value="${n}">${n === 0 ? "Pas de Vélocité" : `${n} point${n > 1 ? "s" : ""} de sang → ${n} action${n > 1 ? "s" : ""} en plus`}</option>`).join("");
    return `<div class="cel-row"><img src="${a.img}" alt=""><span><b>${a.name}</b><small>${a.system.mechanicNames?.speed ?? "Vélocité"} ${a.system.mechanics.speed} · sang ${a.system.blood.value} · ${a.system.blood.perTurn}/tour</small></span><select name="cel${i}">${opts}</select></div>`;
  }).join("");
  const data = await DialogV2.prompt({
    window: { title: "Nouveau tour : Vélocité", icon: "fa-solid fa-bolt" },
    classes: ["noctis-celerity-dialog"],
    content: `<p>Chaque point de sang dépensé donne une action supplémentaire ce tour, sans pénalité d'actions multiples ; au plus la moitié (arrondi supérieur) de ces actions peuvent être des attaques.</p><p>Chaque point de Vélocité utilisé ainsi ne s'ajoute plus aux jets de Dextérité et à l'initiative pendant ce tour.</p>${rows}`,
    ok: { label: "Valider", icon: "fa-solid fa-bolt", callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
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
      await combat.rollAll({ messageOptions: { flavor: `Initiative — tour ${changed.round}` } });
      await combat.update({ turn: 0 });
    } catch (err) { console.warn("NOCTIS | relance de l'initiative", err); }
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
