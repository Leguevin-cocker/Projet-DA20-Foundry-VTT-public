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
  physical: { label: "Physiques", keys: ["strength", "dexterity", "stamina"] },
  social: { label: "Sociaux", keys: ["charisma", "manipulation", "appearance"] },
  mental: { label: "Mentaux", keys: ["perception", "intelligence", "wits"] }
};

NOCTIS.attributes = {
  strength: "Force",
  dexterity: "Dextérité",
  stamina: "Vigueur",
  charisma: "Charisme",
  manipulation: "Manipulation",
  appearance: "Apparence",
  perception: "Perception",
  intelligence: "Intelligence",
  wits: "Astuce"
};

NOCTIS.physicalAttributes = ["strength", "dexterity", "stamina"];

/* ---------------------------------------- */
/*  Capacités                   */
/* ---------------------------------------- */
NOCTIS.abilityGroups = {
  talents: {
    label: "Talents",
    keys: ["legerdemain", "athletics", "brawl", "leadership", "empathy", "expression", "intimidation", "awareness", "subterfuge", "alertness"]
  },
  skills: {
    label: "Compétences",
    keys: ["animalken", "crafts", "commerce", "ride", "etiquette", "stealth", "melee", "performance", "survival", "archery"]
  },
  knowledges: {
    label: "Connaissances",
    keys: ["law", "enigmas", "academics", "investigation", "medicine", "occult", "politics", "hearthwisdom", "seneschal", "theology"]
  }
};

NOCTIS.abilities = {
  legerdemain: "Adresse",
  athletics: "Athlétisme",
  brawl: "Bagarre",
  leadership: "Commandement",
  empathy: "Empathie",
  expression: "Expression",
  intimidation: "Intimidation",
  awareness: "Intuition",
  subterfuge: "Subterfuge",
  alertness: "Vigilance",
  animalken: "Animaux",
  crafts: "Artisanats",
  commerce: "Commerce",
  ride: "Équitation",
  etiquette: "Étiquette",
  stealth: "Furtivité",
  melee: "Mêlée",
  performance: "Représentation",
  survival: "Survie",
  archery: "Tir à l'arc",
  law: "Droit",
  enigmas: "Énigmes",
  academics: "Érudition",
  investigation: "Investigation",
  medicine: "Médecine",
  occult: "Occultisme",
  politics: "Politique",
  hearthwisdom: "Sagesse populaire",
  seneschal: "Sénéchal",
  theology: "Théologie"
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
  allies: "Alliés",
  contacts: "Contacts",
  domain: "Domaine",
  falseidentity: "Fausse identité",
  generation: "Génération",
  influence: "Influence",
  mentor: "Mentor",
  fame: "Renommée",
  resources: "Ressources",
  retainers: "Servants",
  status: "Statut",
  herd: "Troupeau"
};

/* ---------------------------------------- */
/*  Vertus                      */
/* ---------------------------------------- */
NOCTIS.virtueLabels = {
  conscience: "Conscience",
  conviction: "Conviction",
  selfcontrol: "Maîtrise de soi",
  instinct: "Instinct",
  courage: "Courage"
};

/* ---------------------------------------- */
/*  Santé              */
/* ---------------------------------------- */
NOCTIS.healthLevels = [
  { key: "bruised", label: "Contusion", penalty: 0 },
  { key: "hurt", label: "Blessure légère", penalty: -1 },
  { key: "injured", label: "Blessure moyenne", penalty: -1 },
  { key: "wounded", label: "Blessure grave", penalty: -2 },
  { key: "mauled", label: "Handicap", penalty: -2 },
  { key: "crippled", label: "Infirmité", penalty: -5 },
  { key: "incapacitated", label: "Invalidité", penalty: null }
];

NOCTIS.damageTypes = {
  bashing: { label: "Contondants", short: "C", symbol: "/" },
  lethal: { label: "Létaux", short: "L", symbol: "X" },
  aggravated: { label: "Aggravés", short: "A", symbol: "✱" }
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
  3: "Troisième", 4: "Quatrième", 5: "Cinquième", 6: "Sixième", 7: "Septième", 8: "Huitième",
  9: "Neuvième", 10: "Dixième", 11: "Onzième", 12: "Douzième", 13: "Treizième", 14: "Quatorzième", 15: "Quinzième"
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
  attribute: "Attribut",
  ability: "Capacité",
  newAbility: "Nouvelle capacité",
  specialty: "Domaine d'expertise (spécialité)",
  clanDiscipline: "Discipline de clan",
  otherDiscipline: "Autre discipline",
  newDiscipline: "Nouvelle discipline",
  newPath: "Nouvelle voie de sorcellerie",
  secondaryPath: "Voie secondaire",
  ritual: "Rituel de sorcellerie de sang",
  virtue: "Vertu",
  willpower: "Volonté",
  road: "Voie",
  background: "Historique (avec accord du conteur)",
  other: "Autre"
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
  3: "Routinier", 4: "Facile", 5: "Simple", 6: "Moyen", 7: "Ardu", 8: "Difficile", 9: "Extrêmement difficile", 10: "Quasi impossible"
};

NOCTIS.successDegrees = [
  { min: 1, label: "Réussite marginale" },
  { min: 2, label: "Réussite modérée" },
  { min: 3, label: "Réussite complète" },
  { min: 4, label: "Réussite exceptionnelle" },
  { min: 5, label: "Réussite phénoménale" }
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
  brawl: "Bagarre",
  melee: "Mêlée",
  archery: "Tir à l'arc",
  athletics: "Athlétisme (jet)"
};

NOCTIS.concealment = { P: "Poche", A: "Vêtements amples", L: "Long manteau", N: "Impossible" };

NOCTIS.armorClasses = {
  1: { label: "Classe 1 (vêtements lourds)", rating: 1, penalty: 0 },
  2: { label: "Classe 2 (étoffe/armure textile)", rating: 2, penalty: 1 },
  3: { label: "Classe 3 (armure composite)", rating: 3, penalty: 1 },
  4: { label: "Classe 4 (armure lourde)", rating: 4, penalty: 2 },
  5: { label: "Classe 5 (armure de chevalier)", rating: 5, penalty: 3 }
};

/* ---------------------------------------- */
/*  Atouts et handicaps         */
/* ---------------------------------------- */
NOCTIS.meritCategories = {
  physical: "Physique",
  mental: "Mental",
  social: "Social",
  supernatural: "Surnaturel"
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
  "": "Aucun (pouvoirs à lancer)",
  speed: "Vélocité : actions supplémentaires, bonus de Dextérité et d'initiative",
  resilience: "Résilience : dés d'absorption, y compris contre les aggravés",
  might: "Vigueur surnaturelle : réussites automatiques aux jets de Force"
};
NOCTIS.mechanicNames = { speed: "Vélocité", resilience: "Résilience", might: "Vigueur surnaturelle" };

/* ---------------------------------------- */
/*  Archétypes                  */
/* ---------------------------------------- */
NOCTIS.archetypes = [
  "Ange gardien", "Architecte", "Autocrate", "Battant", "Bête", "Bon vivant", "Bouffon", "Brute", "Caméléon",
  "Casse-cou", "Célébrant", "Conformiste", "Défenseur", "Déviant", "Dilettante", "Dirigiste", "Enfant", "Énigme",
  "Fanatique", "Gourou", "Grand-guignol", "Idéaliste", "Individualiste", "Juge", "Martyr", "Masochiste", "Mercenaire",
  "Monstre", "Œil du cyclone", "Opportuniste", "Pédagogue", "Pénitent", "Perfectionniste", "Philosophe", "Râleur",
  "Rebelle", "Sadique", "Séducteur", "Soldat", "Solitaire", "Survivant", "Traditionaliste", "Visionnaire"
];

/* ---------------------------------------- */
/*  Types d'acteurs                           */
/* ---------------------------------------- */
NOCTIS.actorTypes = {
  vampire: "Vampire",
  ghoul: "Goule",
  mortal: "Mortel",
  npc: "PNJ"
};

/** Cibles possibles pour les bonus de jets portés par les objets. */
export function rollTargetChoices() {
  const out = { all: "Tous les jets", physical: "Jets physiques", social: "Jets sociaux", mental: "Jets mentaux", discipline: "Jets de discipline", conscience: "Conscience / Conviction", attack: "Jets d'attaque", damage: "Jets de dégâts", soak: "Jets d'absorption", initiative: "Initiative", frenzy: "Frénésie", panic: "Panique", willpower: "Volonté", road: "Voie" };
  for (const [k, v] of Object.entries(NOCTIS.attributes)) out[`attr.${k}`] = `Attribut : ${v}`;
  for (const [k, v] of Object.entries(NOCTIS.abilities)) out[`abil.${k}`] = `Capacité : ${v}`;
  for (const [k, v] of Object.entries(NOCTIS.disciplines)) out[`disc.${k}`] = `Discipline : ${v}`;
  return out;
}

/* ---------------------------------------- */
/*  Relations et domaine                     */
/* ---------------------------------------- */
NOCTIS.relationKinds = {
  ally: { label: "Allié", background: "allies", icon: "fa-solid fa-handshake" },
  contact: { label: "Contact majeur", background: "contacts", icon: "fa-solid fa-ear-listen" },
  mentor: { label: "Mentor", background: "mentor", icon: "fa-solid fa-chess-king" },
  retainer: { label: "Servant", background: "retainers", icon: "fa-solid fa-user-shield" },
  herd: { label: "Calice (troupeau)", background: "herd", icon: "fa-solid fa-droplet" },
  sire: { label: "Sire / lignée", background: null, icon: "fa-solid fa-sitemap" },
  rival: { label: "Rival / ennemi", background: null, icon: "fa-solid fa-skull" },
  other: { label: "Autre", background: null, icon: "fa-solid fa-user" }
};
NOCTIS.attitudes = { friendly: "Amical", neutral: "Neutre", wary: "Méfiant", hostile: "Hostile" };
NOCTIS.trustLevels = { "-2": "Ennemi", "-1": "Méfiance", "0": "Neutre", "1": "Confiance", "2": "Fidélité" };
/** Zones de chasse. */
NOCTIS.huntingZones = {
  slums: { label: "Bas-fonds", difficulty: 4 },
  lower: { label: "Quartier des classes inférieures", difficulty: 5 },
  market: { label: "Quartier du marché", difficulty: 6 },
  middle: { label: "Quartier des classes moyennes", difficulty: 7 },
  patrolled: { label: "Zone fréquemment patrouillée", difficulty: 8 }
};
/** Techniques de chasse proposées. */
NOCTIS.huntingMethods = {
  seduce: { label: "Séduction dans les tavernes", attr: "appearance", abil: "subterfuge" },
  stalk: { label: "Traque (chat et souris)", attr: "wits", abil: "stealth" },
  free: { label: "Autre technique (choisir dans la fenêtre)", attr: "perception", abil: "alertness" }
};
