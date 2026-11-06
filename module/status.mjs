import { loc, registerLocalizable } from "./i18n.mjs";
/**
 * États des jetons : liste d'icônes propre à NOCTIS et synchronisation automatique avec la fiche.
 * Les états « automatiques » suivent les données (santé, sang, Vélocité) ; les autres sont posés
 * par les manœuvres, la Bête ou à la main (HUD du jeton).
 */

export const STATUSES = [
  { id: "frenzy", name: "NOCTIS.js.Frenesie", img: "icons/svg/explosion.svg", tip: "NOCTIS.js.LaBeteAPrisLeControle" },
  { id: "panic", name: "NOCTIS.js.Panique", img: "icons/svg/terror.svg", tip: "NOCTIS.js.PaniqueFuitLaSourceDeSa" },
  { id: "hungry", name: "NOCTIS.js.Assoiffe", img: "icons/svg/blood.svg", auto: true, tip: "NOCTIS.js.ReserveDeSangBasseLaVue" },
  { id: "starving", name: "NOCTIS.js.ASec", img: "icons/svg/degen.svg", auto: true, tip: "NOCTIS.js.PlusUneGoutteDeSangLa" },
  { id: "celerity", name: "NOCTIS.js.Velocite", img: "icons/svg/wingfoot.svg", auto: true, tip: "NOCTIS.js.VelociteActiveeCeTourActionsSupplementai" },
  { id: "prone", name: "NOCTIS.js.ATerre", img: "icons/svg/falling.svg", tip: "NOCTIS.js.AChuteDexteriteAthletismeDifficulte6" },
  { id: "grappled", name: "NOCTIS.js.Empoigne", img: "icons/svg/net.svg", tip: "NOCTIS.js.PrisDansUneLutteOuMaintenu" },
  { id: "stunned", name: "NOCTIS.js.Etourdi", img: "icons/svg/daze.svg", tip: "NOCTIS.js.UneAttaqueAInfligePlusQue" },
  { id: "blinded", name: "NOCTIS.js.Aveugle", img: "icons/svg/blind.svg", tip: "NOCTIS.js.2ALaDifficulteDeToute" },
  { id: "staked", name: "NOCTIS.js.PieuAuCur", img: "icons/svg/paralysis.svg", tip: "NOCTIS.js.CurTransperceLeVampireEstParalyse" },
  { id: "crippled", name: "NOCTIS.js.Infirme", img: "icons/svg/bones.svg", auto: true, tip: "NOCTIS.js.NiveauDeSanteInfirmite5Des" },
  { id: "incapacitated", name: "NOCTIS.js.Invalide", img: "icons/svg/unconscious.svg", auto: true, tip: "NOCTIS.js.TousLesNiveauxDeSanteSont" },
  { id: "torpor", name: "NOCTIS.js.Torpeur", img: "icons/svg/sleep.svg", auto: true, tip: "NOCTIS.js.SommeilSemblableALaMortDuree" },
  { id: "dead", name: "NOCTIS.js.Mort", img: "icons/svg/skull.svg", auto: true, tip: "NOCTIS.js.MortUltimeVampireOuMortMortel" }
];

export function registerStatuses() {
  CONFIG.statusEffects = STATUSES.map(s => ({ id: s.id, name: s.name, img: s.img, description: s.tip }));
  CONFIG.specialStatusEffects.DEFEATED = "dead";
}

export const hasStatus = (actor, id) => !!actor?.statuses?.has(id);

/** Pose ou retire un état (ne fait rien s'il est déjà dans l'état voulu). */
export async function setStatus(actor, id, active, { overlay = false } = {}) {
  if (!actor || hasStatus(actor, id) === !!active) return;
  try { await actor.toggleStatusEffect(id, { active: !!active, overlay }); }
  catch (err) { console.warn(loc("NOCTIS.js.NoctisEtat", { id }), err); }
}

/** Seuil de la Soif (réglage du monde). */
export function hungerThreshold() {
  try { return game.settings.get("noctis", "hungerThreshold"); } catch (e) { return 4; }
}

/** États automatiques attendus d'après les données de la fiche. */
function expectedStatuses(actor) {
  const s = actor.system;
  const h = s.health ?? {};
  const out = {};
  const vampire = s.isVampire;
  out.starving = !!vampire && s.blood.value <= 0;
  out.hungry = !!vampire && !out.starving && s.blood.value <= hungerThreshold();
  out.celerity = (s.combat?.celerityActive ?? 0) > 0;
  out.dead = !!h.finalDeath || (!vampire && !!h.incapacitated && (h.lethal + h.aggravated) >= h.levels);
  out.torpor = !out.dead && !!h.torpor;
  out.incapacitated = !out.dead && !out.torpor && !!h.incapacitated;
  out.crippled = !out.dead && !out.torpor && !out.incapacitated && h.penalty === -5;
  return out;
}

const pending = new Map();

/** Synchronise (côté MJ) les états automatiques d'un acteur, avec un léger délai pour regrouper les mises à jour. */
export function queueStatusSync(actor) {
  if (!actor || !game.users.activeGM?.isSelf) return;
  const key = actor.uuid;
  clearTimeout(pending.get(key));
  pending.set(key, setTimeout(async () => {
    pending.delete(key);
    const want = expectedStatuses(actor);
    for (const [id, on] of Object.entries(want)) await setStatus(actor, id, on, { overlay: id === "dead" });
    // Entrée en torpeur : on note la date et la durée selon la Voie
    if (want.torpor && !actor.getFlag("noctis", "torpor")) await game.noctis?.time?.markTorpor?.(actor);
    if (!want.torpor && actor.getFlag("noctis", "torpor") && !actor.getFlag("noctis", "torpor")?.voluntary) await actor.unsetFlag("noctis", "torpor");
  }, 150));
}

/** Infobulle d'un état pour la fiche. */
export function statusList(actor) {
  return STATUSES.filter(s => hasStatus(actor, s.id)).map(s => ({ id: s.id, name: s.name, img: s.img, tip: s.tip, auto: !!s.auto }));
}

registerLocalizable(STATUSES);
