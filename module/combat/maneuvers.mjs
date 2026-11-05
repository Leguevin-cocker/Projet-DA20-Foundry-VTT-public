/**
 * Manœuvres de combat et situations (ciblage, position, couvert, adversaires multiples).
 * Chaque manœuvre décrit son groupement, ses modificateurs, ses dégâts et ses effets automatisés.
 *
 * Champs :
 *  - uses : "weapon" (l'arme en main), "unarmed" (mains nues), "ranged" (arme à distance)
 *  - pool : [attribut, capacité] imposés (null = ceux de l'arme)
 *  - dice / diff : modificateurs du groupement et de la difficulté
 *  - damage : "weapon" | "str" | "str+1" | "weapon+1" | "weapon+2" | "none"
 *  - type : type de dégâts imposé (sinon celui de l'arme)
 *  - effect : effet traité après la confrontation (prone, grapple, hold, tackle, disarm, stake, feed, power, riposte, suppress)
 */
export const MANEUVERS = {
  // ---- Avec l'arme en main (mêlée)
  strike: {
    uses: "weapon", group: "Arme de mêlée", label: "Attaque à main armée", short: "Normale · dégâts de l'arme",
    damage: "weapon",
    tip: "Coup standard avec l'arme. Dextérité + Mêlée, difficulté normale, dégâts de l'arme."
  },
  powerWeapon: {
    uses: "weapon", group: "Arme de mêlée", label: "Coup puissant", short: "+1 diff. · dégâts +2 · pas de défense ce tour",
    diff: 1, damage: "weapon+2", effect: "power",
    tip: "Toute la force dans le coup : difficulté +1, dégâts normaux +2. L'attaquant ne peut plus faire d'action défensive pendant ce tour."
  },
  sweepWeapon: {
    uses: "weapon", group: "Arme de mêlée", label: "Balayage", short: "+1 diff. · dégâts de l'arme · chute",
    diff: 1, damage: "weapon", effect: "prone",
    tip: "Faire trébucher l'adversaire avec l'arme (bâton, fouet…) : difficulté +1, dégâts de l'arme, et la cible chute si l'attaque touche. Un bâton donne +2 dés pour un balayage."
  },
  disarm: {
    uses: "weapon", group: "Arme de mêlée", label: "Désarmement", short: "+1 diff. · arme arrachée si dégâts > Force",
    diff: 1, damage: "weapon", effect: "disarm",
    tip: "Viser l'arme adverse : difficulté +1. On lance les dégâts : si les réussites dépassent la Force de la cible, elle ne subit aucun dégât mais son arme vole à autant de mètres que la différence. Sinon, elle subit les dégâts normalement."
  },
  stake: {
    uses: "weapon", group: "Arme de mêlée", label: "Pieu dans le cœur", short: "+3 diff. · 3 niveaux après absorption = immobilisé",
    diff: 3, damage: "weapon", effect: "stake",
    tip: "Enfoncer un pieu dans la poitrine d'un vampire : difficulté +3, dégâts de l'arme. S'il reste au moins 3 niveaux après absorption, le cœur est transpercé : le vampire est immobilisé (un humain meurt)."
  },
  riposteWeapon: {
    uses: "weapon", group: "Arme de mêlée", label: "Riposte", short: "+1 diff. · dégâts +1 · défense adverse +2",
    diff: 1, damage: "weapon+1", effect: "riposte",
    tip: "Contre-attaque après une défense réussie ce tour, en profitant de l'élan adverse : difficulté +1 (en plus des pénalités d'actions multiples), dégâts normaux +1. La défense de la cible se fait à difficulté +2."
  },

  // ---- À mains nues
  punch: {
    uses: "unarmed", group: "À mains nues", label: "Coup de poing", short: "Normale · Force (C)",
    pool: ["dexterity", "brawl"], damage: "str", type: "bashing",
    tip: "Attaque de base à mains nues : Dextérité + Bagarre, difficulté normale, dégâts Force (contondants)."
  },
  kick: {
    uses: "unarmed", group: "À mains nues", label: "Coup de pied", short: "+1 diff. · Force + 1 (C)",
    pool: ["dexterity", "brawl"], diff: 1, damage: "str+1", type: "bashing",
    tip: "Plus de dégâts qu'un coup de poing mais plus difficile : Dextérité + Bagarre, difficulté +1, dégâts Force + 1 (contondants)."
  },
  powerUnarmed: {
    uses: "unarmed", group: "À mains nues", label: "Coup puissant", short: "+1 diff. · Force + 2 · pas de défense ce tour",
    pool: ["dexterity", "brawl"], diff: 1, damage: "str+2", type: "bashing", effect: "power",
    tip: "Toute la force dans le coup : difficulté +1, dégâts Force + 2. L'attaquant ne peut plus faire d'action défensive pendant ce tour."
  },
  sweep: {
    uses: "unarmed", group: "À mains nues", label: "Balayage", short: "+1 diff. · Force (C) · chute",
    pool: ["dexterity", "brawl"], diff: 1, damage: "str", type: "bashing", effect: "prone",
    tip: "Faucher les jambes de l'adversaire : Dextérité + Bagarre, difficulté +1, dégâts Force (contondants), et la cible chute si l'attaque touche."
  },
  claw: {
    uses: "unarmed", group: "À mains nues", label: "Griffure", short: "Normale · Force + 1 (A)",
    pool: ["dexterity", "brawl"], damage: "str+1", type: "aggravated",
    tip: "Pour des griffes surnaturelles ou celles d'une bête : Dextérité + Bagarre, dégâts Force + 1, aggravés (griffes surnaturelles). Pour des griffes ordinaires, créez plutôt une arme de Bagarre à dégâts létaux."
  },
  grapple: {
    uses: "unarmed", group: "À mains nues", label: "Empoignade", short: "Force + Bagarre · Force (C) · prise",
    pool: ["strength", "brawl"], damage: "str", type: "bashing", effect: "grapple",
    tip: "Agripper la cible : Force + Bagarre, dégâts Force. Les deux combattants sont ensuite pris dans la lutte : ils peuvent infliger leur Force en dégâts ou tenter de se libérer (Force + Bagarre en opposition) ; aucune autre action physique."
  },
  hold: {
    uses: "unarmed", group: "À mains nues", label: "Saisie", short: "Force + Bagarre · +1 diff. · cible maintenue",
    pool: ["strength", "brawl"], diff: 1, damage: "none", effect: "hold",
    tip: "Retenir la cible jusqu'à sa prochaine action : Force + Bagarre, difficulté +1, aucun dégât. Pour agir, la victime doit l'emporter sur un jet de Force + Bagarre en opposition."
  },
  tackle: {
    uses: "unarmed", group: "À mains nues", label: "Placage", short: "Force + Bagarre · +1 diff. · Force + 1 (C) · chute",
    pool: ["strength", "brawl"], diff: 1, damage: "str+1", type: "bashing", effect: "tackle",
    tip: "Se jeter sur l'adversaire : Force + Bagarre, difficulté +1, dégâts Force + 1. Les deux combattants font un jet de Dextérité + Athlétisme (difficulté 7) : en cas d'échec, ils chutent. Même réussi, ils ont +1 en difficulté au tour suivant."
  },
  bite: {
    uses: "unarmed", group: "À mains nues", label: "Morsure (blesser)", short: "+1 dé · Force + 1 (A) · cible déjà agrippée",
    pool: ["dexterity", "brawl"], dice: 1, damage: "str+1", type: "aggravated", needsHold: true,
    tip: "Après une empoignade, une saisie ou un placage réussis, mordre au tour suivant : Dextérité + Bagarre + 1, dégâts Force + 1 aggravés, sans l'extase du Baiser."
  },
  feed: {
    uses: "unarmed", group: "À mains nues", label: "Morsure (se nourrir)", short: "+1 dé · aucun dégât · 3 points de sang par tour",
    pool: ["dexterity", "brawl"], dice: 1, damage: "none", effect: "feed", needsHold: true,
    tip: "Après une empoignade, une saisie ou un placage réussis : la morsure n'inflige aucun dégât mais le Baiser plonge la victime dans l'extase, et le vampire boit 3 points de sang par tour (dans la limite de sa réserve)."
  },
  riposte: {
    uses: "unarmed", group: "À mains nues", label: "Riposte", short: "+1 diff. · Force + 1 · défense adverse +2",
    pool: ["dexterity", "brawl"], diff: 1, damage: "str+1", type: "bashing", effect: "riposte",
    tip: "Contre-attaque après une défense réussie ce tour : difficulté +1 (en plus des pénalités d'actions multiples), dégâts Force + 1. La défense de la cible se fait à difficulté +2."
  },

  // ---- Distance
  shoot: {
    uses: "ranged", group: "Distance", label: "Tir", short: "Normale · dégâts de l'arme",
    damage: "weapon",
    tip: "Tir ou lancer standard : Dextérité + Tir à l'arc (Athlétisme pour les armes de jet). Au-delà de la portée de l'arme : difficulté +1 jusqu'au double, +2 jusqu'au triple."
  },
  impale: {
    uses: "ranged", group: "Distance", label: "Empalement", short: "+3 diff. · 3 niveaux après absorption = immobilisé",
    diff: 3, damage: "weapon", effect: "stake",
    tip: "Comme le pieu : un long trait de bois dans le cœur. Difficulté +3, dégâts de l'arme ; s'il reste au moins 3 niveaux après absorption, le vampire est immobilisé."
  },
  suppress: {
    uses: "ranged", group: "Distance", label: "Tir de suppression", short: "−2 diff. · défense adverse +2 · Tir à l'arc 3+",
    diff: -2, damage: "weapon", effect: "suppress", minArchery: 3,
    tip: "Une salve aux pieds d'un ennemi qui avance (Tir à l'arc 3 minimum, portée moyenne ou longue, jamais en action multiple). S'il continue d'avancer : difficulté de l'archer −2, et sa défense se fait à difficulté +2."
  },
  volley: {
    uses: "ranged", group: "Distance", label: "Grêle de flèches", short: "Normale · une flèche par point de Tir à l'arc",
    damage: "weapon",
    tip: "L'archer entraîné tire autant de flèches qu'il a de points en Tir à l'arc, avec les règles d'actions multiples (choisissez le n° d'action plus bas). La visée ne compte que pour le premier tir."
  }
};

export const TARGETING = {
  none: { label: "Aucun", diff: 0, dmg: 0, tip: "Attaque sans viser de partie précise." },
  medium: { label: "Moyenne (membre, bouclier, épée)", diff: 1, dmg: 0, tip: "Difficulté +1. Peut paralyser un membre (+2 en difficulté aux actions qui l'utilisent tant que la blessure n'est pas soignée)." },
  small: { label: "Petite (tête, main, couteau)", diff: 2, dmg: 1, tip: "Difficulté +2, dégâts +1." },
  tiny: { label: "Minuscule (œil, cœur, anneau)", diff: 3, dmg: 2, tip: "Difficulté +3, dégâts +2." },
  armor: { label: "Défaut de la cuirasse", diff: 2, dmg: 0, ignoreArmor: true, tip: "Difficulté +2 : en cas de succès, l'armure de la cible n'ajoute aucun dé d'absorption contre cette attaque." }
};

export const POSITIONS = {
  front: { label: "De face", dice: 0, tip: "Aucun modificateur." },
  flank: { label: "De flanc", dice: 1, tip: "+1 dé à l'attaque." },
  back: { label: "De dos", dice: 2, tip: "+2 dés à l'attaque." }
};

export const COVERS = {
  none: { label: "Aucun", diff: 0, tip: "La cible est à découvert." },
  light: { label: "Faible (étendu à terre)", diff: 1, tip: "Difficulté +1 pour toucher la cible à distance." },
  good: { label: "Bon (derrière un mur)", diff: 2, tip: "Difficulté +2 pour toucher la cible à distance." },
  full: { label: "Excellent (seule la tête dépasse)", diff: 3, tip: "Difficulté +3 pour toucher la cible à distance." }
};

/** Manœuvres disponibles selon l'arme utilisée. */
export function maneuversFor(weapon) {
  const ranged = weapon && (weapon.system.ability === "archery" || weapon.system.thrown || (weapon.system.range ?? 0) > 0);
  const kinds = !weapon ? ["unarmed"] : (ranged ? ["ranged"] : (weapon.system.ability === "brawl" ? ["unarmed"] : ["weapon", "unarmed"]));
  const groups = [];
  for (const k of kinds) {
    const list = Object.entries(MANEUVERS).filter(([, m]) => m.uses === k).map(([key, m]) => ({ key, ...m }));
    if (list.length) groups.push({ label: list[0].group, options: list });
  }
  return { groups, ranged: !!ranged, default: groups[0]?.options[0]?.key ?? "punch" };
}

/** Texte d'infobulle complet d'une manœuvre. */
export function maneuverTooltip(key) {
  const m = MANEUVERS[key];
  if (!m) return "";
  const pool = m.pool ? `${{ dexterity: "Dextérité", strength: "Force" }[m.pool[0]]} + ${{ brawl: "Bagarre", melee: "Mêlée", archery: "Tir à l'arc" }[m.pool[1]]}${m.dice ? ` + ${m.dice}` : ""}` : "Groupement de l'arme";
  return `<strong>${m.label}</strong><br>${m.tip}<br><em>${pool} · ${m.short}</em>`;
}

/**
 * Base de dégâts d'une manœuvre.
 * @returns {{ base:number, label:string, type:string, none:boolean }}
 */
export function maneuverDamage(key, { str, weaponBase, weaponLabel, weaponType, targeting = "none" }) {
  const m = MANEUVERS[key] ?? MANEUVERS.strike;
  const t = TARGETING[targeting] ?? TARGETING.none;
  let base, label;
  switch (m.damage) {
    case "none": return { base: 0, label: "aucun", type: m.type ?? weaponType, none: true };
    case "str": base = str; label = `Force (${str})`; break;
    case "str+1": base = str + 1; label = `Force (${str}) + 1`; break;
    case "str+2": base = str + 2; label = `Force (${str}) + 2`; break;
    case "weapon+1": base = weaponBase + 1; label = `${weaponLabel} + 1`; break;
    case "weapon+2": base = weaponBase + 2; label = `${weaponLabel} + 2`; break;
    default: base = weaponBase; label = weaponLabel;
  }
  if (t.dmg) { base += t.dmg; label += ` + ${t.dmg} (ciblage)`; }
  return { base, label, type: m.type ?? weaponType, none: false };
}
