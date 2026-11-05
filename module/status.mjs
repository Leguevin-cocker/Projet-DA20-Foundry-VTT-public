/**
 * États des jetons : liste d'icônes propre à NOCTIS et synchronisation automatique avec la fiche.
 * Les états « automatiques » suivent les données (santé, sang, Vélocité) ; les autres sont posés
 * par les manœuvres, la Bête ou à la main (HUD du jeton).
 */

export const STATUSES = [
  { id: "frenzy", name: "Frénésie", img: "icons/svg/explosion.svg", tip: "La Bête a pris le contrôle : ignore les pénalités de blessures, insensible à la panique, +2 à la difficulté des pouvoirs mentaux qui le visent. 1 Volonté = un tour de lucidité." },
  { id: "panic", name: "Panique", img: "icons/svg/terror.svg", tip: "Panique : fuit la source de sa peur et attaque quiconque le retient. 1 Volonté = un tour de contrôle." },
  { id: "hungry", name: "Assoiffé", img: "icons/svg/blood.svg", auto: true, tip: "Réserve de sang basse : la vue, l'odeur ou le goût du sang peuvent déclencher la frénésie." },
  { id: "starving", name: "À sec", img: "icons/svg/degen.svg", auto: true, tip: "Plus une goutte de sang : la Soif pousse à la frénésie." },
  { id: "celerity", name: "Vélocité", img: "icons/svg/wingfoot.svg", auto: true, tip: "Vélocité activée ce tour : actions supplémentaires." },
  { id: "prone", name: "À terre", img: "icons/svg/falling.svg", tip: "A chuté : Dextérité + Athlétisme (difficulté 6) pour se relever, −2 à l'initiative au prochain tour." },
  { id: "grappled", name: "Empoigné", img: "icons/svg/net.svg", tip: "Pris dans une lutte ou maintenu : aucune autre action physique que frapper (Force) ou se libérer (Force + Bagarre en opposition). +2 dés pour l'attaquer." },
  { id: "stunned", name: "Étourdi", img: "icons/svg/daze.svg", tip: "Une attaque a infligé plus que Vigueur + 2 niveaux : ne peut pas agir au prochain tour." },
  { id: "blinded", name: "Aveuglé", img: "icons/svg/blind.svg", tip: "+2 à la difficulté de toute action qui demande la vue (défenses comprises) ; +2 dés pour l'attaquer." },
  { id: "staked", name: "Pieu au cœur", img: "icons/svg/paralysis.svg", tip: "Cœur transpercé : le vampire est paralysé jusqu'à ce qu'on retire le pieu. Toute attaque contre lui réussit." },
  { id: "crippled", name: "Infirme", img: "icons/svg/bones.svg", auto: true, tip: "Niveau de santé Infirmité : −5 dés." },
  { id: "incapacitated", name: "Invalide", img: "icons/svg/unconscious.svg", auto: true, tip: "Tous les niveaux de santé sont perdus." },
  { id: "torpor", name: "Torpeur", img: "icons/svg/sleep.svg", auto: true, tip: "Sommeil semblable à la mort ; durée selon la Voie." },
  { id: "dead", name: "Mort", img: "icons/svg/skull.svg", auto: true, tip: "Mort ultime (vampire) ou mort (mortel)." }
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
  catch (err) { console.warn(`NOCTIS | état ${id}`, err); }
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

