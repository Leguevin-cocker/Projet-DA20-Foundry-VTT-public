import { loc, registerLocalizable } from "../i18n.mjs";
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
    uses: "weapon", group: "NOCTIS.js.ArmeDeMelee", label: "NOCTIS.js.AttaqueAMainArmee", short: "NOCTIS.js.NormaleDegatsDeLArme",
    damage: "weapon",
    tip: "NOCTIS.js.CoupStandardAvecLArmeDexterite"
  },
  powerWeapon: {
    uses: "weapon", group: "NOCTIS.js.ArmeDeMelee", label: "NOCTIS.js.CoupPuissant", short: "NOCTIS.js.1DiffDegats2PasDe",
    diff: 1, damage: "weapon+2", effect: "power",
    tip: "NOCTIS.js.TouteLaForceDansLeCoup"
  },
  sweepWeapon: {
    uses: "weapon", group: "NOCTIS.js.ArmeDeMelee", label: "NOCTIS.js.Balayage", short: "NOCTIS.js.1DiffDegatsDeLArme",
    diff: 1, damage: "weapon", effect: "prone",
    tip: "NOCTIS.js.FaireTrebucherLAdversaireAvecL"
  },
  disarm: {
    uses: "weapon", group: "NOCTIS.js.ArmeDeMelee", label: "NOCTIS.js.Desarmement", short: "NOCTIS.js.1DiffArmeArracheeSiDegats",
    diff: 1, damage: "weapon", effect: "disarm",
    tip: "NOCTIS.js.ViserLArmeAdverseDifficulte1"
  },
  stake: {
    uses: "weapon", group: "NOCTIS.js.ArmeDeMelee", label: "NOCTIS.js.PieuDansLeCur", short: "NOCTIS.js.3Diff3NiveauxApresAbsorption",
    diff: 3, damage: "weapon", effect: "stake",
    tip: "NOCTIS.js.EnfoncerUnPieuDansLaPoitrine"
  },
  riposteWeapon: {
    uses: "weapon", group: "NOCTIS.js.ArmeDeMelee", label: "NOCTIS.js.Riposte", short: "NOCTIS.js.1DiffDegats1DefenseAdverse",
    diff: 1, damage: "weapon+1", effect: "riposte",
    tip: "NOCTIS.js.ContreAttaqueApresUneDefenseReussie"
  },

  // ---- À mains nues
  punch: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.CoupDePoing", short: "NOCTIS.js.NormaleForceC",
    pool: ["dexterity", "brawl"], damage: "str", type: "bashing",
    tip: "NOCTIS.js.AttaqueDeBaseAMainsNues"
  },
  kick: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.CoupDePied", short: "NOCTIS.js.1DiffForce1C",
    pool: ["dexterity", "brawl"], diff: 1, damage: "str+1", type: "bashing",
    tip: "NOCTIS.js.PlusDeDegatsQuUnCoup"
  },
  powerUnarmed: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.CoupPuissant", short: "NOCTIS.js.1DiffForce2PasDe",
    pool: ["dexterity", "brawl"], diff: 1, damage: "str+2", type: "bashing", effect: "power",
    tip: "NOCTIS.js.TouteLaForceDansLeCoup2"
  },
  sweep: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.Balayage", short: "NOCTIS.js.1DiffForceCChute",
    pool: ["dexterity", "brawl"], diff: 1, damage: "str", type: "bashing", effect: "prone",
    tip: "NOCTIS.js.FaucherLesJambesDeLAdversaire"
  },
  claw: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.Griffure", short: "NOCTIS.js.NormaleForce1A",
    pool: ["dexterity", "brawl"], damage: "str+1", type: "aggravated",
    tip: "NOCTIS.js.PourDesGriffesSurnaturellesOuCelles"
  },
  grapple: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.Empoignade", short: "NOCTIS.js.ForceBagarreForceCPrise",
    pool: ["strength", "brawl"], damage: "str", type: "bashing", effect: "grapple",
    tip: "NOCTIS.js.AgripperLaCibleForceBagarreDegats"
  },
  hold: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.Saisie", short: "NOCTIS.js.ForceBagarre1DiffCibleMaintenue",
    pool: ["strength", "brawl"], diff: 1, damage: "none", effect: "hold",
    tip: "NOCTIS.js.RetenirLaCibleJusquASa"
  },
  tackle: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.Placage", short: "NOCTIS.js.ForceBagarre1DiffForce1",
    pool: ["strength", "brawl"], diff: 1, damage: "str+1", type: "bashing", effect: "tackle",
    tip: "NOCTIS.js.SeJeterSurLAdversaireForce"
  },
  bite: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.MorsureBlesser", short: "NOCTIS.js.1DeForce1ACible",
    pool: ["dexterity", "brawl"], dice: 1, damage: "str+1", type: "aggravated", needsHold: true,
    tip: "NOCTIS.js.ApresUneEmpoignadeUneSaisieOu"
  },
  feed: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.MorsureSeNourrir", short: "NOCTIS.js.1DeAucunDegat3Points",
    pool: ["dexterity", "brawl"], dice: 1, damage: "none", effect: "feed", needsHold: true,
    tip: "NOCTIS.js.ApresUneEmpoignadeUneSaisieOu2"
  },
  riposte: {
    uses: "unarmed", group: "NOCTIS.js.AMainsNues", label: "NOCTIS.js.Riposte", short: "NOCTIS.js.1DiffForce1DefenseAdverse",
    pool: ["dexterity", "brawl"], diff: 1, damage: "str+1", type: "bashing", effect: "riposte",
    tip: "NOCTIS.js.ContreAttaqueApresUneDefenseReussie2"
  },

  // ---- Distance
  shoot: {
    uses: "ranged", group: "NOCTIS.js.Distance", label: "NOCTIS.js.Tir", short: "NOCTIS.js.NormaleDegatsDeLArme",
    damage: "weapon",
    tip: "NOCTIS.js.TirOuLancerStandardDexteriteTir"
  },
  impale: {
    uses: "ranged", group: "NOCTIS.js.Distance", label: "NOCTIS.js.Empalement", short: "NOCTIS.js.3Diff3NiveauxApresAbsorption",
    diff: 3, damage: "weapon", effect: "stake",
    tip: "NOCTIS.js.CommeLePieuUnLongTrait"
  },
  suppress: {
    uses: "ranged", group: "NOCTIS.js.Distance", label: "NOCTIS.js.TirDeSuppression", short: "NOCTIS.js.2DiffDefenseAdverse2Tir",
    diff: -2, damage: "weapon", effect: "suppress", minArchery: 3,
    tip: "NOCTIS.js.UneSalveAuxPiedsDUn"
  },
  volley: {
    uses: "ranged", group: "NOCTIS.js.Distance", label: "NOCTIS.js.GreleDeFleches", short: "NOCTIS.js.NormaleUneFlecheParPointDe",
    damage: "weapon",
    tip: "NOCTIS.js.LArcherEntraineTireAutantDe"
  }
};

export const TARGETING = {
  none: { label: "NOCTIS.js.Aucun", diff: 0, dmg: 0, tip: "NOCTIS.js.AttaqueSansViserDePartiePrecise" },
  medium: { label: "NOCTIS.js.MoyenneMembreBouclierEpee", diff: 1, dmg: 0, tip: "NOCTIS.js.Difficulte1PeutParalyserUnMembre" },
  small: { label: "NOCTIS.js.PetiteTeteMainCouteau", diff: 2, dmg: 1, tip: "NOCTIS.js.Difficulte2Degats1" },
  tiny: { label: "NOCTIS.js.MinusculeIlCurAnneau", diff: 3, dmg: 2, tip: "NOCTIS.js.Difficulte3Degats2" },
  armor: { label: "NOCTIS.js.DefautDeLaCuirasse", diff: 2, dmg: 0, ignoreArmor: true, tip: "NOCTIS.js.Difficulte2EnCasDeSucces" }
};

export const POSITIONS = {
  front: { label: "NOCTIS.js.DeFace", dice: 0, tip: "NOCTIS.js.AucunModificateur" },
  flank: { label: "NOCTIS.js.DeFlanc", dice: 1, tip: "NOCTIS.js.1DeALAttaque" },
  back: { label: "NOCTIS.js.DeDos", dice: 2, tip: "NOCTIS.js.2DesALAttaque" }
};

export const COVERS = {
  none: { label: "NOCTIS.js.Aucun", diff: 0, tip: "NOCTIS.js.LaCibleEstADecouvert" },
  light: { label: "NOCTIS.js.FaibleEtenduATerre", diff: 1, tip: "NOCTIS.js.Difficulte1PourToucherLaCible" },
  good: { label: "NOCTIS.js.BonDerriereUnMur", diff: 2, tip: "NOCTIS.js.Difficulte2PourToucherLaCible" },
  full: { label: "NOCTIS.js.ExcellentSeuleLaTeteDepasse", diff: 3, tip: "NOCTIS.js.Difficulte3PourToucherLaCible" }
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
  const pool = m.pool ? `${{ dexterity: loc("NOCTIS.js.Dexterite"), strength: loc("NOCTIS.js.Force") }[m.pool[0]]} + ${{ brawl: loc("NOCTIS.js.Bagarre"), melee: loc("NOCTIS.js.Melee"), archery: loc("NOCTIS.js.TirALArc") }[m.pool[1]]}${m.dice ? ` + ${m.dice}` : ""}` : loc("NOCTIS.js.GroupementDeLArme");
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
    case "str": base = str; label = loc("NOCTIS.js.Force2", { str }); break;
    case "str+1": base = str + 1; label = loc("NOCTIS.js.Force1", { str }); break;
    case "str+2": base = str + 2; label = loc("NOCTIS.js.Force22", { str }); break;
    case "weapon+1": base = weaponBase + 1; label = `${weaponLabel} + 1`; break;
    case "weapon+2": base = weaponBase + 2; label = `${weaponLabel} + 2`; break;
    default: base = weaponBase; label = weaponLabel;
  }
  if (t.dmg) { base += t.dmg; label += loc("NOCTIS.js.Ciblage", { dmg: t.dmg }); }
  return { base, label, type: m.type ?? weaponType, none: false };
}

registerLocalizable(COVERS, MANEUVERS, POSITIONS, TARGETING);
