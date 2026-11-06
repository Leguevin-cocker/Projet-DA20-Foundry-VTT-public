import { loc, registerLocalizable } from "./i18n.mjs";
/**
 * Constantes du système : traits, tables et coûts du moteur à d10.
 * Aucun contenu d'univers : clans, disciplines, Voies et atouts sont créés par chaque table (objets du monde ou compendiums).
 */
export const NOCTIS = {};

NOCTIS.ID = "noctis";
NOCTIS.PATH = "systems/noctis";

/* ---------------------------------------- */
/*  Attributs                   */
/* ---------------------------------------- */
NOCTIS.attributeGroups = {
  physical: { label: "NOCTIS.js.Physiques", keys: ["strength", "dexterity", "stamina"] },
  social: { label: "NOCTIS.js.Sociaux", keys: ["charisma", "manipulation", "appearance"] },
  mental: { label: "NOCTIS.js.Mentaux", keys: ["perception", "intelligence", "wits"] }
};

NOCTIS.attributes = {
  strength: "NOCTIS.js.Force",
  dexterity: "NOCTIS.js.Dexterite",
  stamina: "NOCTIS.js.Vigueur",
  charisma: "NOCTIS.js.Charisme",
  manipulation: "NOCTIS.js.Manipulation",
  appearance: "NOCTIS.js.Apparence",
  perception: "NOCTIS.js.Perception",
  intelligence: "NOCTIS.js.Intelligence",
  wits: "NOCTIS.js.Astuce"
};

NOCTIS.physicalAttributes = ["strength", "dexterity", "stamina"];

/* ---------------------------------------- */
/*  Capacités                   */
/* ---------------------------------------- */
NOCTIS.abilityGroups = {
  talents: {
    label: "NOCTIS.js.Talents",
    keys: ["legerdemain", "athletics", "brawl", "leadership", "empathy", "expression", "intimidation", "awareness", "subterfuge", "alertness"]
  },
  skills: {
    label: "NOCTIS.js.Competences",
    keys: ["animalken", "crafts", "commerce", "ride", "etiquette", "stealth", "melee", "performance", "survival", "archery"]
  },
  knowledges: {
    label: "NOCTIS.js.Connaissances",
    keys: ["law", "enigmas", "academics", "investigation", "medicine", "occult", "politics", "hearthwisdom", "seneschal", "theology"]
  }
};

NOCTIS.abilities = {
  legerdemain: "NOCTIS.js.Adresse",
  athletics: "NOCTIS.js.Athletisme",
  brawl: "NOCTIS.js.Bagarre",
  leadership: "NOCTIS.js.Commandement",
  empathy: "NOCTIS.js.Empathie",
  expression: "NOCTIS.js.Expression",
  intimidation: "NOCTIS.js.Intimidation",
  awareness: "NOCTIS.js.Intuition",
  subterfuge: "NOCTIS.js.Subterfuge",
  alertness: "NOCTIS.js.Vigilance",
  animalken: "NOCTIS.js.Animaux",
  crafts: "NOCTIS.js.Artisanats",
  commerce: "NOCTIS.js.Commerce",
  ride: "NOCTIS.js.Equitation",
  etiquette: "NOCTIS.js.Etiquette",
  stealth: "NOCTIS.js.Furtivite",
  melee: "NOCTIS.js.Melee",
  performance: "NOCTIS.js.Representation",
  survival: "NOCTIS.js.Survie",
  archery: "NOCTIS.js.TirALArc",
  law: "NOCTIS.js.Droit",
  enigmas: "NOCTIS.js.Enigmes",
  academics: "NOCTIS.js.Erudition",
  investigation: "NOCTIS.js.Investigation",
  medicine: "NOCTIS.js.Medecine",
  occult: "NOCTIS.js.Occultisme",
  politics: "NOCTIS.js.Politique",
  hearthwisdom: "NOCTIS.js.SagessePopulaire",
  seneschal: "NOCTIS.js.Senechal",
  theology: "NOCTIS.js.Theologie"
};

/** Attribut proposé par défaut quand on clique sur une capacité. */
NOCTIS.abilityDefaultAttr = {
  legerdemain: "dexterity", athletics: "dexterity", brawl: "dexterity", leadership: "charisma", empathy: "perception",
  expression: "charisma", intimidation: "manipulation", awareness: "perception", subterfuge: "manipulation", alertness: "perception",
  animalken: "manipulation", crafts: "dexterity", commerce: "manipulation", ride: "dexterity", etiquette: "charisma",
  stealth: "dexterity", melee: "dexterity", performance: "charisma", survival: "perception", archery: "dexterity",
  law: "intelligence", enigmas: "intelligence", academics: "intelligence", investigation: "perception", medicine: "intelligence",
  occult: "intelligence", politics: "intelligence", hearthwisdom: "wits", seneschal: "intelligence", theology: "intelligence"
};

/* ---------------------------------------- */
/*  Historiques                 */
/* ---------------------------------------- */
NOCTIS.backgrounds = {
  allies: "NOCTIS.js.Allies",
  contacts: "NOCTIS.js.Contacts",
  domain: "NOCTIS.js.Domaine",
  falseidentity: "NOCTIS.js.FausseIdentite",
  generation: "NOCTIS.js.Generation",
  influence: "NOCTIS.js.Influence",
  mentor: "NOCTIS.js.Mentor",
  fame: "NOCTIS.js.Renommee",
  resources: "NOCTIS.js.Ressources",
  retainers: "NOCTIS.js.Servants",
  status: "NOCTIS.js.Statut",
  herd: "NOCTIS.js.Troupeau"
};

/* ---------------------------------------- */
/*  Vertus                      */
/* ---------------------------------------- */
NOCTIS.virtueLabels = {
  conscience: "NOCTIS.js.Conscience",
  conviction: "NOCTIS.js.Conviction",
  selfcontrol: "NOCTIS.js.MaitriseDeSoi",
  instinct: "NOCTIS.js.Instinct",
  courage: "NOCTIS.js.Courage"
};

/* ---------------------------------------- */
/*  Santé              */
/* ---------------------------------------- */
NOCTIS.healthLevels = [
  { key: "bruised", label: "NOCTIS.js.Contusion", penalty: 0 },
  { key: "hurt", label: "NOCTIS.js.BlessureLegere", penalty: -1 },
  { key: "injured", label: "NOCTIS.js.BlessureMoyenne", penalty: -1 },
  { key: "wounded", label: "NOCTIS.js.BlessureGrave", penalty: -2 },
  { key: "mauled", label: "NOCTIS.js.Handicap", penalty: -2 },
  { key: "crippled", label: "NOCTIS.js.Infirmite", penalty: -5 },
  { key: "incapacitated", label: "NOCTIS.js.Invalidite", penalty: null }
];

NOCTIS.damageTypes = {
  bashing: { label: "NOCTIS.js.Contondants", short: "C", symbol: "/" },
  lethal: { label: "NOCTIS.js.Letaux", short: "L", symbol: "X" },
  aggravated: { label: "NOCTIS.js.Aggraves", short: "A", symbol: "✱" }
};

/* ---------------------------------------- */
/*  Générations                     */
/* ---------------------------------------- */
NOCTIS.generationTable = {
  3: { maxTrait: 10, blood: 100, perTurn: 20 },
  4: { maxTrait: 9, blood: 50, perTurn: 10 },
  5: { maxTrait: 8, blood: 40, perTurn: 8 },
  6: { maxTrait: 7, blood: 30, perTurn: 6 },
  7: { maxTrait: 6, blood: 20, perTurn: 4 },
  8: { maxTrait: 5, blood: 15, perTurn: 3 },
  9: { maxTrait: 5, blood: 14, perTurn: 2 },
  10: { maxTrait: 5, blood: 13, perTurn: 1 },
  11: { maxTrait: 5, blood: 12, perTurn: 1 },
  12: { maxTrait: 5, blood: 11, perTurn: 1 },
  13: { maxTrait: 5, blood: 10, perTurn: 1 }
};

NOCTIS.generationNames = {
  3: "NOCTIS.js.Troisieme", 4: "NOCTIS.js.Quatrieme", 5: "NOCTIS.js.Cinquieme", 6: "NOCTIS.js.Sixieme", 7: "NOCTIS.js.Septieme", 8: "NOCTIS.js.Huitieme",
  9: "NOCTIS.js.Neuvieme", 10: "NOCTIS.js.Dixieme", 11: "NOCTIS.js.Onzieme", 12: "NOCTIS.js.Douzieme", 13: "NOCTIS.js.Treizieme", 14: "NOCTIS.js.Quatorzieme", 15: "NOCTIS.js.Quinzieme"
};

export function generationStats(gen) {
  const g = Math.max(3, Math.min(13, Number(gen) || 12));
  return NOCTIS.generationTable[g];
}

/* ---------------------------------------- */
/*  Création                    */
/* ---------------------------------------- */
NOCTIS.creation = {
  attributes: [7, 5, 3],
  abilities: [13, 9, 5],
  abilityMax: 3,
  disciplines: 4,
  backgrounds: 5,
  virtues: 7,
  bonusPoints: 15,
  maxFlaws: 7
};

/** Coût des points de bonus. */
NOCTIS.bonusCosts = {
  attribute: 5,
  ability: 2,
  discipline: 7,
  sorceryPath: 4,
  ritual: "level",
  background: 1,
  virtue: 2,
  road: 2,
  willpower: 1
};

/* ---------------------------------------- */
/*  Expérience                      */
/* ---------------------------------------- */
NOCTIS.xpCategories = {
  attribute: "NOCTIS.js.Attribut",
  ability: "NOCTIS.js.Capacite",
  newAbility: "NOCTIS.js.NouvelleCapacite",
  specialty: "NOCTIS.js.DomaineDExpertiseSpecialite",
  clanDiscipline: "NOCTIS.js.DisciplineDeClan",
  otherDiscipline: "NOCTIS.js.AutreDiscipline",
  newDiscipline: "NOCTIS.js.NouvelleDiscipline",
  newPath: "NOCTIS.js.NouvelleVoieDeSorcellerie",
  secondaryPath: "NOCTIS.js.VoieSecondaire",
  ritual: "NOCTIS.js.RituelDeSorcellerieDeSang",
  virtue: "NOCTIS.js.Vertu",
  willpower: "NOCTIS.js.Volonte",
  road: "NOCTIS.js.Voie",
  background: "NOCTIS.js.HistoriqueAvecAccordDuConteur",
  other: "NOCTIS.js.Autre"
};

/**
 * Coût en XP pour passer un trait de `current` à `current + 1`.
 * @param {string} category  clé de NOCTIS.xpCategories
 * @param {number} current   niveau actuel
 * @param {object} [opts]    { ritualLevel, multiplier }
 */
export function xpCost(category, current = 0, opts = {}) {
  const c = Number(current) || 0;
  const mult = opts.multiplier ?? 1;
  let cost;
  switch (category) {
    case "attribute": cost = c * 4; break;
    case "ability": cost = c === 0 ? 3 : c * 2; break;
    case "newAbility": cost = 3; break;
    case "specialty": cost = 1; break;
    case "clanDiscipline": cost = c === 0 ? 10 : c * 5; break;
    case "otherDiscipline": cost = c === 0 ? 10 : c * 7; break;
    case "newDiscipline": cost = 10; break;
    case "newPath": cost = 7; break;
    case "secondaryPath": cost = c === 0 ? 7 : c * 4; break;
    case "ritual": cost = (Number(opts.ritualLevel) || 1) * 2; break;
    case "virtue": cost = c * 2; break;
    case "willpower": cost = c; break;
    case "road": cost = c * 2; break;
    case "background": cost = c === 0 ? 2 : c * 2; break;
    default: cost = Number(opts.custom) || 0;
  }
  return Math.max(0, cost) * mult;
}

/* ---------------------------------------- */
/*  Difficultés et réussites    */
/* ---------------------------------------- */
NOCTIS.difficulties = {
  3: "NOCTIS.js.Routinier", 4: "NOCTIS.js.Facile", 5: "NOCTIS.js.Simple", 6: "NOCTIS.js.Moyen", 7: "NOCTIS.js.Ardu", 8: "NOCTIS.js.Difficile", 9: "NOCTIS.js.ExtremementDifficile", 10: "NOCTIS.js.QuasiImpossible"
};

NOCTIS.successDegrees = [
  { min: 1, label: "NOCTIS.js.ReussiteMarginale" },
  { min: 2, label: "NOCTIS.js.ReussiteModeree" },
  { min: 3, label: "NOCTIS.js.ReussiteComplete" },
  { min: 4, label: "NOCTIS.js.ReussiteExceptionnelle" },
  { min: 5, label: "NOCTIS.js.ReussitePhenomenale" }
];

export function successLabel(n) {
  let label = "";
  for (const d of NOCTIS.successDegrees) if (n >= d.min) label = d.label;
  return label;
}

/* ---------------------------------------- */
/*  Armes et armures            */
/* ---------------------------------------- */
NOCTIS.weaponAbilities = {
  brawl: "NOCTIS.js.Bagarre",
  melee: "NOCTIS.js.Melee",
  archery: "NOCTIS.js.TirALArc",
  athletics: "NOCTIS.js.AthletismeJet"
};

NOCTIS.concealment = { P: "NOCTIS.js.Poche", A: "NOCTIS.js.VetementsAmples", L: "NOCTIS.js.LongManteau", N: "NOCTIS.js.Impossible" };

NOCTIS.armorClasses = {
  1: { label: "NOCTIS.js.Classe1VetementsLourds", rating: 1, penalty: 0 },
  2: { label: "NOCTIS.js.Classe2EtoffeArmureTextile", rating: 2, penalty: 1 },
  3: { label: "NOCTIS.js.Classe3ArmureComposite", rating: 3, penalty: 1 },
  4: { label: "NOCTIS.js.Classe4ArmureLourde", rating: 4, penalty: 2 },
  5: { label: "NOCTIS.js.Classe5ArmureDeChevalier", rating: 5, penalty: 3 }
};

/* ---------------------------------------- */
/*  Atouts et handicaps         */
/* ---------------------------------------- */
NOCTIS.meritCategories = {
  physical: "NOCTIS.js.Physique",
  mental: "NOCTIS.js.Mental",
  social: "NOCTIS.js.Social",
  supernatural: "NOCTIS.js.Surnaturel"
};

/* ---------------------------------------- */
/*  Disciplines                              */
/* ---------------------------------------- */
/**
 * Registre des disciplines connues du monde : clé → nom. Rempli au chargement à partir des objets
 * « discipline » du monde et des compendiums (voir module/registry.mjs). Vide par défaut.
 */
NOCTIS.disciplines = {};

/**
 * Rôles mécaniques qu'une discipline peut tenir : ses points sont alors pris en compte automatiquement.
 *  - speed : bonus aux groupements de Dextérité et à l'initiative, actions supplémentaires contre du sang
 *  - resilience : dés d'absorption (y compris contre les dégâts aggravés)
 *  - might : réussites automatiques sur les jets de Force (dégâts et prouesses)
 */
NOCTIS.disciplineMechanics = {
  "": "NOCTIS.js.AucunPouvoirsALancer",
  speed: "NOCTIS.js.VelociteActionsSupplementairesBonusDeDex",
  resilience: "NOCTIS.js.ResilienceDesDAbsorptionYCompris",
  might: "NOCTIS.js.VigueurSurnaturelleReussitesAutomatiques"
};
NOCTIS.mechanicNames = { speed: "NOCTIS.js.Velocite", resilience: "NOCTIS.js.Resilience", might: "NOCTIS.js.VigueurSurnaturelle" };

/* ---------------------------------------- */
/*  Archétypes                  */
/* ---------------------------------------- */
NOCTIS.archetypes = [
  "NOCTIS.js.AngeGardien", "NOCTIS.js.Architecte", "NOCTIS.js.Autocrate", "NOCTIS.js.Battant", "NOCTIS.js.Bete", "NOCTIS.js.BonVivant", "NOCTIS.js.Bouffon", "NOCTIS.js.Brute", "NOCTIS.js.Cameleon",
  "NOCTIS.js.CasseCou", "NOCTIS.js.Celebrant", "NOCTIS.js.Conformiste", "NOCTIS.js.Defenseur", "NOCTIS.js.Deviant", "NOCTIS.js.Dilettante", "NOCTIS.js.Dirigiste", "NOCTIS.js.Enfant", "NOCTIS.js.Enigme",
  "NOCTIS.js.Fanatique", "NOCTIS.js.Gourou", "NOCTIS.js.GrandGuignol", "NOCTIS.js.Idealiste", "NOCTIS.js.Individualiste", "NOCTIS.js.Juge", "NOCTIS.js.Martyr", "NOCTIS.js.Masochiste", "NOCTIS.js.Mercenaire",
  "NOCTIS.js.Monstre", "NOCTIS.js.IlDuCyclone", "NOCTIS.js.Opportuniste", "NOCTIS.js.Pedagogue", "NOCTIS.js.Penitent", "NOCTIS.js.Perfectionniste", "NOCTIS.js.Philosophe", "NOCTIS.js.Raleur",
  "NOCTIS.js.Rebelle", "NOCTIS.js.Sadique", "NOCTIS.js.Seducteur", "NOCTIS.js.Soldat", "NOCTIS.js.Solitaire", "NOCTIS.js.Survivant", "NOCTIS.js.Traditionaliste", "NOCTIS.js.Visionnaire"
];

/* ---------------------------------------- */
/*  Types d'acteurs                           */
/* ---------------------------------------- */
NOCTIS.actorTypes = {
  vampire: "NOCTIS.js.Vampire",
  ghoul: "NOCTIS.js.Goule",
  mortal: "NOCTIS.js.Mortel",
  npc: "PNJ"
};

/** Cibles possibles pour les bonus de jets portés par les objets. */
export function rollTargetChoices() {
  const out = { all: loc("NOCTIS.js.TousLesJets"), physical: loc("NOCTIS.js.JetsPhysiques"), social: loc("NOCTIS.js.JetsSociaux"), mental: loc("NOCTIS.js.JetsMentaux"), discipline: loc("NOCTIS.js.JetsDeDiscipline"), conscience: loc("NOCTIS.js.ConscienceConviction"), attack: loc("NOCTIS.js.JetsDAttaque"), damage: loc("NOCTIS.js.JetsDeDegats"), soak: loc("NOCTIS.js.JetsDAbsorption"), initiative: loc("NOCTIS.js.Initiative"), frenzy: loc("NOCTIS.js.Frenesie"), panic: loc("NOCTIS.js.Panique"), willpower: loc("NOCTIS.js.Volonte"), road: loc("NOCTIS.js.Voie") };
  for (const [k, v] of Object.entries(NOCTIS.attributes)) out[`attr.${k}`] = loc("NOCTIS.js.Attribut2", { v });
  for (const [k, v] of Object.entries(NOCTIS.abilities)) out[`abil.${k}`] = loc("NOCTIS.js.Capacite2", { v });
  for (const [k, v] of Object.entries(NOCTIS.disciplines)) out[`disc.${k}`] = loc("NOCTIS.js.Discipline2", { v });
  return out;
}

/* ---------------------------------------- */
/*  Relations et domaine                     */
/* ---------------------------------------- */
NOCTIS.relationKinds = {
  ally: { label: "NOCTIS.js.Allie", background: "allies", icon: "fa-solid fa-handshake" },
  contact: { label: "NOCTIS.js.ContactMajeur", background: "contacts", icon: "fa-solid fa-ear-listen" },
  mentor: { label: "NOCTIS.js.Mentor", background: "mentor", icon: "fa-solid fa-chess-king" },
  retainer: { label: "NOCTIS.js.Servant", background: "retainers", icon: "fa-solid fa-user-shield" },
  herd: { label: "NOCTIS.js.CaliceTroupeau", background: "herd", icon: "fa-solid fa-droplet" },
  sire: { label: "NOCTIS.js.SireLignee", background: null, icon: "fa-solid fa-sitemap" },
  rival: { label: "NOCTIS.js.RivalEnnemi", background: null, icon: "fa-solid fa-skull" },
  other: { label: "NOCTIS.js.Autre", background: null, icon: "fa-solid fa-user" }
};
NOCTIS.attitudes = { friendly: "NOCTIS.js.Amical", neutral: "NOCTIS.js.Neutre", wary: "NOCTIS.js.Mefiant", hostile: "NOCTIS.js.Hostile" };
NOCTIS.trustLevels = { "-2": "NOCTIS.js.Ennemi", "-1": "NOCTIS.js.Mefiance", "0": "NOCTIS.js.Neutre", "1": "NOCTIS.js.Confiance", "2": "NOCTIS.js.Fidelite" };
/** Zones de chasse. */
NOCTIS.huntingZones = {
  slums: { label: "NOCTIS.js.BasFonds", difficulty: 4 },
  lower: { label: "NOCTIS.js.QuartierDesClassesInferieures", difficulty: 5 },
  market: { label: "NOCTIS.js.QuartierDuMarche", difficulty: 6 },
  middle: { label: "NOCTIS.js.QuartierDesClassesMoyennes", difficulty: 7 },
  patrolled: { label: "NOCTIS.js.ZoneFrequemmentPatrouillee", difficulty: 8 }
};
/** Techniques de chasse proposées. */
NOCTIS.huntingMethods = {
  seduce: { label: "NOCTIS.js.SeductionDansLesTavernes", attr: "appearance", abil: "subterfuge" },
  stalk: { label: "NOCTIS.js.TraqueChatEtSouris", attr: "wits", abil: "stealth" },
  free: { label: "NOCTIS.js.AutreTechniqueChoisirDansLaFenetre", attr: "perception", abil: "alertness" }
};

registerLocalizable(NOCTIS);
