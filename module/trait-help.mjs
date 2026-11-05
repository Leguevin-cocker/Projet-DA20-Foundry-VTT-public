/**
 * Infobulles des traits : descriptions courtes, écrites pour ce système (aucun texte repris d'un livre).
 * Chaque entrée : { desc, levels: ["• Nom. texte", …], spec, poss }.
 */

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const SCALE_ATTR = ["Faible", "Moyen", "Bon", "Exceptionnel", "Hors du commun"];
const SCALE_ABIL = ["Novice", "Praticien", "Confirmé", "Expert", "Maître"];
const mk = (desc, texts, scale, spec = "") => ({ desc, levels: texts.map((t, i) => `${"•".repeat(i + 1)} ${scale[i]}. ${t}`), spec, poss: "" });

export const ATTRIBUTE_HELP = {
  strength: mk("Puissance musculaire : soulever, porter, briser, frapper. Sert aux dégâts à mains nues et à la plupart des armes de mêlée.",
    ["Un fardeau ordinaire vous épuise.", "La force d'un adulte en bonne santé.", "Vous portez sans peine ce que d'autres traînent.", "Vous soulevez un homme à bout de bras.", "Une force dont on parle dans les veillées."], SCALE_ATTR, "Poigne, prise, soulever, coups puissants"),
  dexterity: mk("Agilité, rapidité des gestes et précision. Base des attaques, des esquives et de la plupart des actions physiques fines.",
    ["Maladroit, vous trébuchez souvent.", "Des gestes sûrs, sans éclat.", "Vif et précis.", "D'une grâce de félin.", "Vos gestes semblent défier le regard."], SCALE_ATTR, "Réflexes, équilibre, mains agiles"),
  stamina: mk("Endurance et résistance du corps. Ajoute des dés pour absorber les blessures et tenir sur la durée.",
    ["Fragile, vite à bout de souffle.", "Une constitution ordinaire.", "Vous encaissez mieux que la moyenne.", "Dur au mal, infatigable.", "Presque impossible à abattre."], SCALE_ATTR, "Résistance à la douleur, ténacité"),
  charisma: mk("Capacité à attirer, entraîner et convaincre par sa seule présence.",
    ["On vous oublie dès que vous quittez la pièce.", "Vous plaisez à ceux qui vous connaissent.", "On aime vous écouter.", "Les foules se tournent vers vous.", "Une aura que peu savent ignorer."], SCALE_ATTR, "Éloquence, autorité naturelle, chaleur"),
  manipulation: mk("Art d'amener les autres à agir comme vous le souhaitez, par la ruse, le mensonge ou la persuasion.",
    ["Vos intentions se lisent sur votre visage.", "Vous obtenez de petites faveurs.", "Vous savez quel levier actionner.", "Vous retournez un adversaire en une conversation.", "Les gens vous servent en croyant agir pour eux-mêmes."], SCALE_ATTR, "Persuasion, mensonge, flatterie"),
  appearance: mk("Beauté, allure et impression produite au premier regard.",
    ["Repoussant ou terne.", "Banal.", "Agréable à regarder.", "Remarquable.", "D'une beauté qui trouble."], SCALE_ATTR, "Prestance, regard, élégance"),
  perception: mk("Acuité des sens et attention aux détails : remarquer, repérer, flairer le piège.",
    ["Distrait, perdu dans vos pensées.", "Vous voyez ce qui est évident.", "Rien de notable ne vous échappe.", "Vous lisez les détails comme un livre.", "Vos sens frôlent le surnaturel."], SCALE_ATTR, "Vue perçante, ouïe fine, intuition"),
  intelligence: mk("Mémoire, raisonnement et savoir. Sert à comprendre, déduire et apprendre.",
    ["Lent à comprendre.", "Un esprit ordinaire.", "Vif et curieux.", "Brillant.", "Un génie de son temps."], SCALE_ATTR, "Logique, mémoire, érudition"),
  wits: mk("Présence d'esprit et rapidité de réaction. Entre dans l'initiative.",
    ["Toujours un temps de retard.", "Vous réagissez à peu près à temps.", "Vous avez la répartie facile.", "Rarement pris au dépourvu.", "Vous semblez avoir prévu chaque surprise."], SCALE_ATTR, "Réflexes, répartie, sang-froid")
};

const ab = (desc, spec) => mk(desc, ["Quelques notions.", "Une pratique régulière.", "Un savoir-faire solide, reconnu.", "Parmi les meilleurs de la région.", "Une référence que l'on vient consulter de loin."], SCALE_ABIL, spec);

export const ABILITY_HELP = {
  legerdemain: ab("Vol à la tire, tours de passe-passe, crochetage et dissimulation d'objets.", "Bourses, serrures, escamotage"),
  athletics: ab("Courir, sauter, grimper, nager, lancer. Sert aussi à l'esquive et aux armes de jet.", "Course, escalade, esquive"),
  brawl: ab("Combat sans arme : coups, prises, lutte et morsures.", "Lutte, coups de poing, morsure"),
  leadership: ab("Donner des ordres, inspirer, tenir une troupe dans l'adversité.", "Harangue, commandement militaire"),
  empathy: ab("Comprendre les émotions d'autrui et deviner ses intentions.", "Mensonges, humeurs, chagrins"),
  expression: ab("S'exprimer avec force et justesse, à l'écrit comme à l'oral.", "Poésie, sermons, lettres"),
  intimidation: ab("Faire plier par la menace, la présence ou la peur.", "Menace voilée, violence physique"),
  awareness: ab("Pressentir le danger et sentir l'étrange, le surnaturel.", "Pièges, présences, embuscades"),
  subterfuge: ab("Mentir, tromper, cacher ses buts et percer ceux des autres.", "Fausses pistes, flatterie, séduction"),
  alertness: ab("Rester sur ses gardes, remarquer ce qui cloche.", "Embuscades, bruits, mouvements"),
  animalken: ab("Comprendre, dresser et apaiser les animaux.", "Chevaux, chiens, faucons"),
  crafts: ab("Fabriquer et réparer : forge, menuiserie, couture, maçonnerie…", "Forge, ébénisterie, orfèvrerie"),
  commerce: ab("Acheter, vendre, marchander et évaluer.", "Marchandage, change, évaluation"),
  ride: ab("Monter, diriger et combattre à cheval.", "Charge, longs trajets, terrains difficiles"),
  etiquette: ab("Connaître les usages des cours et des milieux, s'y conduire sans faute.", "Cour, clergé, guildes"),
  stealth: ab("Se déplacer sans être vu ni entendu.", "Ombres, filature, silence"),
  melee: ab("Combat avec armes blanches : épées, haches, lances, bâtons.", "Épée, hache, parade"),
  performance: ab("Chanter, jouer, danser, conter devant un public.", "Chant, luth, conte"),
  survival: ab("Vivre et se diriger en pleine nature, pister, chasser.", "Pistage, abris, forêts"),
  archery: ab("Tirer à l'arc et à l'arbalète.", "Arc long, arbalète, tir rapide"),
  law: ab("Connaître lois, coutumes et procédures, et s'en servir.", "Droit canon, coutume, procès"),
  enigmas: ab("Résoudre énigmes, chiffres et casse-tête.", "Codes, énigmes, jeux"),
  academics: ab("Savoir des lettres : histoire, philosophie, langues savantes.", "Histoire, rhétorique, latin"),
  investigation: ab("Chercher des indices, interroger, reconstituer les faits.", "Fouille, interrogatoire, déduction"),
  medicine: ab("Soigner les blessures et les maladies, connaître le corps.", "Chirurgie, herbes, diagnostic"),
  occult: ab("Savoir ce qu'on raconte du surnaturel, distinguer la légende du vrai.", "Rituels, démons, superstitions"),
  politics: ab("Comprendre les jeux de pouvoir et y prendre part.", "Intrigues, alliances, factions"),
  hearthwisdom: ab("Le savoir des gens simples : remèdes, présages, coutumes et superstitions.", "Remèdes, présages, protections"),
  seneschal: ab("Gérer un domaine, une maison, des gens et des revenus.", "Intendance, comptes, personnel"),
  theology: ab("Connaître les dogmes, les textes et les hommes de la foi.", "Écritures, hérésies, clergé")
};

const bg = (desc, texts) => ({ desc, levels: texts.map((t, i) => `${"•".repeat(i + 1)} ${t}`), spec: "", poss: "" });

export const BACKGROUND_HELP = {
  allies: bg("Des mortels qui vous aident de leur plein gré. Ils ont leur propre vie et attendent parfois un retour.",
    ["Un allié d'influence modeste.", "Deux alliés.", "Trois alliés, dont un influent.", "Quatre alliés, dont un très influent.", "Cinq alliés, dont un puissant personnage."]),
  contacts: bg("Des sources d'information dans divers milieux. Chaque point donne un contact majeur, fiable et bien placé.",
    ["Un contact majeur.", "Deux contacts majeurs.", "Trois contacts majeurs.", "Quatre contacts majeurs.", "Cinq contacts majeurs."]),
  domain: bg("Un territoire reconnu où vous chassez et régnez. Ses points se répartissent entre taille et sécurité.",
    ["Quelques ruelles ou un hameau.", "Un quartier ou un village.", "Plusieurs quartiers, un bourg.", "Une bonne part d'une ville.", "Une ville entière ou une contrée."]),
  falseidentity: bg("Une identité d'emprunt, avec papiers, témoins et histoire crédible.",
    ["Une couverture fragile.", "Une identité qui tient une enquête rapide.", "Une identité solide, connue dans la région.", "Une vie entière inventée et attestée.", "Plusieurs identités irréprochables."]),
  generation: bg("La distance qui vous sépare des premiers de votre espèce. Chaque point abaisse votre génération d'un cran : réserve de sang plus grande, traits pouvant aller plus haut.",
    ["Onzième génération.", "Dixième génération.", "Neuvième génération.", "Huitième génération.", "Septième génération."]),
  influence: bg("Votre poids sur les affaires des mortels : conseils, autorités, guildes, clergé.",
    ["Une voix qu'on écoute parfois.", "Un notable d'une petite ville.", "Une influence réelle dans une cité.", "Un pouvoir qui compte dans la région.", "On ne décide rien d'important sans vous."]),
  mentor: bg("Un aîné qui vous guide, vous conseille et parfois vous protège.",
    ["Un mentor de peu de poids.", "Un mentor respecté.", "Un mentor influent.", "Un mentor puissant.", "Un mentor d'une puissance rare."]),
  fame: bg("Votre réputation parmi les mortels.",
    ["Connu dans votre quartier.", "Connu dans la ville.", "Un nom qu'on cite dans la région.", "Célèbre dans le royaume.", "Une légende de votre vivant."]),
  resources: bg("Richesses, biens et revenus.",
    ["De quoi vivre modestement.", "L'aisance d'un artisan prospère.", "La fortune d'un marchand.", "La richesse d'un seigneur.", "Une fortune princière."]),
  retainers: bg("Des serviteurs fidèles, souvent liés par le sang : gardes, valets, espions.",
    ["Un serviteur.", "Deux serviteurs.", "Trois serviteurs.", "Quatre serviteurs.", "Cinq serviteurs."]),
  status: bg("Votre rang dans la société des vampires de votre domaine.",
    ["Connu de quelques-uns.", "Respecté.", "Influent.", "Puissant.", "Parmi les plus éminents."]),
  herd: bg("Des mortels dont vous pouvez boire le sang sans chasser. Ajoute des dés pour se nourrir.",
    ["Trois calices.", "Sept calices.", "Quinze calices.", "Trente calices.", "Soixante calices."])
};

const vt = (desc, texts) => ({ desc, levels: texts.map((t, i) => `${"•".repeat(i + 1)} ${t}`), spec: "", poss: "" });

export const VIRTUE_HELP = {
  conscience: vt("Le sens moral : distinguer le bien du mal et en éprouver du remords. Sert à résister à la dégénérescence.",
    ["Un vague malaise après les pires actes.", "Une morale ordinaire.", "Des principes solides.", "Une conscience exigeante.", "Une droiture presque sainte."]),
  conviction: vt("La fermeté d'une philosophie qui ne passe pas par la compassion : on agit selon ses principes, quoi qu'il en coûte.",
    ["Des principes flottants.", "Des convictions ordinaires.", "Une ligne de conduite claire.", "Une volonté de fer.", "Une foi absolue en sa Voie."]),
  selfcontrol: vt("La maîtrise de la Bête : résister à la faim, à la rage et à la frénésie.",
    ["La moindre provocation vous emporte.", "Vous tenez la plupart du temps.", "Vous gardez votre calme.", "Il en faut beaucoup pour vous faire perdre pied.", "Une maîtrise presque parfaite."]),
  instinct: vt("Accepter la Bête et chevaucher la frénésie plutôt que la combattre.",
    ["La Bête vous mène.", "Vous l'écoutez sans la comprendre.", "Vous la guidez parfois.", "Vous chevauchez sa rage.", "Bête et esprit ne font plus qu'un."]),
  courage: vt("Faire face à la peur, au feu, au soleil et à l'inconnu. Donne la Volonté de départ.",
    ["Prompt à fuir.", "Ordinaire.", "Brave.", "Intrépide.", "Rien ne vous fait reculer."])
};

/** Pouvoirs listés dans les infobulles de disciplines : vide (chaque table crée ses disciplines). */
export const DISCIPLINE_POWERS = {};

export const LEVELS = {
  road: ["Au bord de l'abîme.", "Très compromis.", "Fragile.", "Vacillant.", "Ordinaire.", "Ferme.", "Solide.", "Exemplaire.", "Rare.", "Proche de l'idéal."],
  willpower: ["Sans ressort.", "Faible.", "Hésitant.", "Ordinaire.", "Déterminé.", "Résolu.", "Tenace.", "Inébranlable.", "Indomptable.", "Absolue."]
};

export function traitTooltip(kind, key, label, cost) {
  const EXTRA = {
    road: "Votre morale (Humanité ou autre Voie). Plus elle est haute, mieux vous résistez à la Bête ; elle baisse quand vous péchez contre sa hiérarchie.",
    willpower: "Force de caractère. Dépenser 1 point de Volonté donne une réussite automatique ou permet d'ignorer un instant les blessures.",
    discipline: "Pouvoir surnaturel de votre sang. Ouvrez la fiche de la discipline pour lire ses pouvoirs."
  };
  const desc = { attribute: ATTRIBUTE_HELP, ability: ABILITY_HELP, background: BACKGROUND_HELP, virtue: VIRTUE_HELP }[kind]?.[key] ?? EXTRA[kind];
  let h = `<div class="noctis-tip"><h4>${esc(label)}</h4>`;
  if (desc && typeof desc === "object") {
    h += `<p>${esc(desc.desc)}</p>`;
    h += `<ul class="levels">${desc.levels.map(l => { const m = l.match(/^(•+)\s*([^.]+\.)?\s*(.*)$/); const nm = m[2] && m[2].length <= 28 ? m[2] : ""; const tx = nm ? m[3] : (m[2] ?? "") + " " + m[3]; return `<li><b>${m[1].replace(/•/g, "●")}</b> ${nm ? `<strong>${esc(nm)}</strong> ` : ""}${esc(tx.trim())}</li>`; }).join("")}</ul>`;
    if (desc.spec) h += `<p class="meta"><strong>Spécialités :</strong> ${esc(desc.spec)}</p>`;
    if (cost) h += `<p class="cost">${esc(cost)}</p>`;
    return h + "</div>";
  }
  if (desc) h += `<p>${esc(desc)}</p>`;
  if (LEVELS[kind]?.length) h += `<ul class="levels">${LEVELS[kind].map((l, i) => `<li><b>${"●".repeat(i + 1)}</b> ${l}</li>`).join("")}</ul>`;
  if (cost) h += `<p class="cost">${esc(cost)}</p>`;
  return h + "</div>";
}
