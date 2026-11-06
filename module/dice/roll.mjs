import { NOCTIS, successLabel } from "../config.mjs";
import { loc } from "../i18n.mjs";

/**
 * Lance un groupement de d10 selon les règles du Conteur.
 *
 * @param {object} o
 * @param {Actor}  o.actor
 * @param {number} o.pool          nombre de dés
 * @param {number} o.difficulty    difficulté (2-10)
 * @param {boolean} [o.specialty]  les 10 comptent double
 * @param {boolean} [o.willpower]  +1 réussite automatique, non annulable
 * @param {string}  [o.label]
 * @param {string[]} [o.parts]     détail du groupement, affiché sur la carte
 * @param {string}  [o.kind]       standard | attack | damage | soak | initiative
 * @param {boolean} [o.noBotch]    les jets de dégâts et d'absorption ne font pas d'échec critique
 * @param {object}  [o.flags]      données supplémentaires stockées sur le message
 * @param {string}  [o.rollMode]
 * @param {boolean} [o.toChat=true]
 */
export async function rollPool(o) {
  const pool = Math.max(0, Math.floor(o.pool ?? 0));
  const difficulty = Math.min(10, Math.max(2, Math.floor(o.difficulty ?? 6)));
  const kind = o.kind ?? "standard";

  let roll = null;
  let dice = [];
  if (pool > 0) {
    roll = new Roll(`${pool}d10`);
    await roll.evaluate();
    dice = roll.dice[0].results.map(r => r.result);
  }

  const rule = (k, def) => { try { return game.settings.get("noctis", k); } catch (e) { return def; } };
  const tenDouble = !!o.specialty || (rule("tensAlwaysDouble", false) && !o.noBotch);
  const onesRule = rule("onesRule", "cancel");
  let hits = 0, ones = 0, tens = 0;
  const faces = dice.map(d => {
    let cls = "fail";
    if (d >= difficulty) {
      hits += (d === 10 && tenDouble) ? 2 : 1;
      cls = (d === 10 && tenDouble) ? "double" : "hit";
      if (d === 10) tens++;
    } else if (d === 1 && !o.noBotch) { ones++; cls = "one"; }
    else if (d === 1) cls = "one-soft";
    return { value: d, cls };
  });
  faces.sort((a, b) => b.value - a.value);

  const rawHits = dice.filter(d => d >= difficulty).length;
  const halfRule = onesRule === "halfBotch";
  let net = Math.max(0, hits - (o.noBotch || halfRule ? 0 : ones));
  const wp = (o.willpower ? 1 : 0) + Math.max(0, Number(o.bonusSuccesses) || 0);
  // Règle maison : les 1 n'annulent rien, échec critique si plus de la moitié des dés font 1
  const botch = !o.noBotch && (halfRule ? (pool > 0 && ones > pool / 2) : (!wp && rawHits === 0 && ones > 0));
  let successes = halfRule && botch ? 0 : net + wp;
  // Variante : un coup qui touche fait au moins 1 niveau de dégâts
  const minApplied = !!o.minOne && successes < 1;
  if (minApplied) successes = 1;

  let outcome, outcomeClass;
  if (botch) { outcome = loc("NOCTIS.js.EchecCritique"); outcomeClass = "botch"; }
  else if (successes <= 0) { outcome = loc("NOCTIS.js.Echec"); outcomeClass = "failure"; }
  else { outcome = kind === "damage" ? loc("NOCTIS.js.NiveauDeDegats", { successes, p1: successes > 1 ? "x" : "" }) : (kind === "soak" ? loc("NOCTIS.js.NiveauAbsorbe", { successes, p1: successes > 1 ? "x" : "", p2: successes > 1 ? "s" : "" }) : successLabel(successes)); outcomeClass = "success"; }

  const result = { pool, difficulty, dice, faces, hits, ones, successes, botch, outcome, outcomeClass, specialty: !!o.specialty, willpower: !!o.willpower, kind, minApplied };

  if (o.toChat === false) return result;

  const actor = o.actor;
  const template = `${NOCTIS.PATH}/templates/chat/roll-card.hbs`;
  const ctx = {
    ...result,
    label: o.label ?? loc("NOCTIS.js.Jet2"),
    parts: o.parts ?? [],
    actorName: actor?.name ?? "",
    actorImg: actor?.img ?? "",
    clanEmblem: actor?.clanItem?.system.emblem || "",
    difficultyLabel: NOCTIS.difficulties[difficulty] ?? "",
    noDice: pool <= 0,
    flags: o.flags ?? {},
    attack: o.flags?.attack ?? null,
    damage: o.flags?.damage ?? null,
    extraLines: o.extraLines ?? []
  };
  const content = await foundry.applications.handlebars.renderTemplate(template, ctx);
  const msgData = {
    content,
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: roll ? [roll] : [],
    sound: roll ? CONFIG.sounds.dice : undefined,
    flags: { noctis: { kind, actorUuid: actor?.uuid ?? null, successes, botch, difficulty, pool, ...(o.flags ?? {}) } }
  };
  ChatMessage.applyRollMode(msgData, o.rollMode ?? game.settings.get("core", "rollMode"));
  const msg = await ChatMessage.create(msgData);
  result.message = msg;
  return result;
}
