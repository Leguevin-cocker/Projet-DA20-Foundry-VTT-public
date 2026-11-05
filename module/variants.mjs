/**
 * Variantes de règles : paramètres du monde et description lisible pour l'onglet « Variantes » des fiches.
 * Chaque entrée décrit la règle de base et la variante ; `isVariant(value)` dit si la table s'écarte des règles de base.
 */

const rerender = () => {
  for (const a of game.actors ?? []) a.prepareData();
  for (const app of foundry.applications.instances.values()) if (app.document?.documentName === "Actor") app.render();
};

export const RULES = [
  {
    key: "defenseRule", group: "Combat", icon: "fa-solid fa-shield-halved",
    name: "Variante : coût de la défense",
    hint: "Livre : chaque défense (esquive, parade, blocage) coûte une action du tour. Défense réflexe : la première défense de chaque tour est gratuite, les suivantes coûtent une action. Défense au prix d'un dé : se défendre ne coûte jamais d'action, mais chaque défense retire 1 dé à la prochaine attaque du personnage.",
    type: String, default: "firstFree",
    choices: {
      action: "Livre : chaque défense coûte une action",
      firstFree: "Défense réflexe : 1re défense du tour gratuite",
      dicePenalty: "Défense au prix d'un dé sur l'attaque suivante"
    },
    book: "action",
    texts: {
      action: "Chaque défense coûte une action. Un personnage sans Vélocité qui se défend ne peut plus attaquer ce tour.",
      firstFree: "La première défense de chaque tour est gratuite. Les défenses suivantes coûtent une action chacune ; sans action restante, la défense compte 0 réussite.",
      dicePenalty: "Se défendre ne coûte pas d'action. Chaque défense retire 1 dé à la prochaine attaque du personnage (cumulable, remis à zéro après cette attaque et à chaque nouveau tour)."
    }
  },
  {
    key: "minDamage", group: "Combat", icon: "fa-solid fa-burst",
    name: "Variante : 1 réussite de dégâts minimum",
    hint: "Coché : une attaque qui touche fait toujours au moins 1 niveau de dégâts avant absorption, même si le jet de dégâts ne fait aucune réussite. Décoché (règle de base) : 0 réussite, aucun dégât.",
    type: Boolean, default: true, book: false,
    texts: {
      true: "Une attaque qui touche inflige toujours au moins 1 niveau de dégâts avant absorption, même si le jet de dégâts ne donne aucune réussite.",
      false: "Un jet de dégâts sans réussite n'inflige aucun dégât."
    }
  },
  {
    key: "damageAllSuccesses", group: "Combat", icon: "fa-solid fa-plus",
    name: "Dégâts : toutes les réussites de l'attaque",
    hint: "Décoché (règle de base, chapitre Combat, « Dégâts ») : seules les réussites au-delà de la première s'ajoutent aux dés de dégâts. Coché : toutes les réussites nettes de l'attaque s'ajoutent.",
    type: Boolean, default: false, book: false,
    texts: {
      true: "Toutes les réussites nettes de l'attaque s'ajoutent aux dés de dégâts.",
      false: "Seules les réussites au-delà de la première s'ajoutent aux dés de dégâts."
    }
  },
  {
    key: "npcAverage", group: "Combat", icon: "fa-solid fa-scale-balanced",
    name: "Variante : PNJ au résultat moyen",
    hint: "Coché : les PNJ ne lancent pas leurs dés d'absorption ni de dégâts ; ils obtiennent le résultat moyen, soit la moitié du groupement arrondie au supérieur. Décoché (règle de base) : ils lancent les dés.",
    type: Boolean, default: true, book: false,
    texts: {
      true: "Les PNJ ne lancent pas l'absorption ni les dégâts : ils obtiennent d'office la moitié de leur groupement, arrondie au supérieur (5 dés → 3 réussites, 4 dés → 2). Les PJ lancent toujours leurs dés.",
      false: "Les PNJ lancent leurs dés d'absorption et de dégâts comme les PJ."
    }
  },
  {
    key: "armorVsFire", group: "Combat", icon: "fa-solid fa-fire",
    name: "Variante : l'armure ne protège pas du feu ni du soleil",
    hint: "Coché : contre une arme ou des dégâts marqués « feu ou soleil », l'armure n'ajoute aucun dé d'absorption (Résilience seule pour les vampires). Décoché : l'armure absorbe normalement.",
    type: Boolean, default: true, book: false,
    texts: {
      true: "Contre le feu et le soleil, l'armure n'ajoute aucun dé d'absorption. Cochez « Feu ou soleil » sur l'arme (torche, brandon…) ou dans la fenêtre de dégâts manuels.",
      false: "L'armure absorbe aussi le feu et le soleil."
    }
  },
  {
    key: "willpowerSoak", group: "Combat", icon: "fa-solid fa-shield-heart",
    name: "Variante : Volonté sur l'absorption",
    hint: "Coché : un PJ peut dépenser 1 point de Volonté sur son jet d'absorption pour 1 réussite automatique. Décoché (règle de base) : la Volonté ne s'utilise pas sur l'absorption.",
    type: Boolean, default: true, book: false,
    texts: {
      true: "Un PJ peut dépenser 1 point de Volonté sur un jet d'absorption : 1 réussite automatique, comme sur un jet ordinaire (bouton dans la carte de combat).",
      false: "La Volonté ne s'ajoute pas à l'absorption."
    }
  },
  {
    key: "bloodHealCombat", group: "Combat", icon: "fa-solid fa-droplet",
    name: "Variante : guérison par le sang en combat",
    hint: "Une guérison gratuite par tour : la première guérison de chaque tour ne coûte pas d'action, les suivantes en coûtent une. Libre : jamais d'action (le sang par tour reste la seule limite).",
    type: String, default: "firstFree", book: "free",
    choices: {
      free: "Libre : guérir ne coûte pas d'action",
      firstFree: "1 guérison gratuite par tour, puis 1 action chacune"
    },
    texts: {
      free: "Dépenser du sang pour guérir ne coûte pas d'action ; seul le sang par tour limite les guérisons.",
      firstFree: "La première guérison par le sang de chaque tour est gratuite. Chaque guérison suivante coûte une action ; sans action restante, impossible de guérir avant le tour suivant."
    }
  },
  {
    key: "initiativeOnce", group: "Combat", icon: "fa-solid fa-list-ol",
    name: "Variante : initiative une fois par combat",
    hint: "Coché : l'initiative se lance une seule fois au début du combat. Décoché (règle de base) : elle est relancée pour tous au début de chaque tour.",
    type: Boolean, default: true, book: false,
    texts: {
      true: "L'initiative est lancée une seule fois, au début du combat ; l'ordre reste le même à chaque tour.",
      false: "L'initiative de tous les combattants est relancée au début de chaque tour."
    }
  },
  {
    key: "ignoreArmorPenalty", group: "Combat", icon: "fa-solid fa-person-running",
    name: "Règle optionnelle : ignorer les pénalités d'armure",
    hint: "Coché : les armures protègent toujours, mais ne retirent plus de dés aux jets de Dextérité ni à l'initiative.",
    type: Boolean, default: false, book: false,
    texts: {
      true: "Les armures protègent mais ne retirent plus de dés aux jets de Dextérité ni à l'initiative.",
      false: "Les armures retirent des dés aux jets de Dextérité et à l'initiative."
    }
  },
  {
    key: "tensAlwaysDouble", group: "Dés", icon: "fa-solid fa-dice-d10",
    name: "Règle optionnelle : les 10 comptent toujours double",
    hint: "Coché : chaque 10 vaut deux réussites sur tous les jets (sauf dégâts et absorption), avec ou sans spécialité. Décoché (règle de base) : seulement avec une spécialité.",
    type: Boolean, default: false, book: false,
    texts: {
      true: "Chaque 10 vaut deux réussites sur tous les jets (sauf dégâts et absorption), avec ou sans spécialité.",
      false: "Un 10 ne vaut deux réussites qu'avec une spécialité."
    }
  },
  {
    key: "onesRule", group: "Dés", icon: "fa-solid fa-skull",
    name: "Règle optionnelle : les 1",
    hint: "Livre : chaque 1 annule une réussite ; échec critique si aucune réussite et au moins un 1. Variante : les 1 n'annulent rien ; échec critique seulement si plus de la moitié des dés lancés font 1.",
    type: String, default: "cancel", book: "cancel",
    choices: { cancel: "Livre : les 1 annulent des réussites", halfBotch: "Variante : échec critique si plus de la moitié de 1" },
    texts: {
      cancel: "Chaque 1 annule une réussite ; échec critique s'il ne reste aucune réussite et qu'au moins un 1 est sorti.",
      halfBotch: "Les 1 n'annulent aucune réussite. Échec critique seulement si plus de la moitié des dés lancés font 1."
    }
  }
];

export function registerRuleSettings() {
  for (const r of RULES) {
    game.settings.register("noctis", r.key, {
      name: r.name, hint: r.hint, scope: "world", config: true, type: r.type, default: r.default,
      ...(r.choices ? { choices: r.choices } : {}),
      onChange: rerender
    });
  }
}

/** Valeur d'une règle (avec repli sur la valeur par défaut si le paramètre n'est pas encore prêt). */
export function rule(key) {
  try { return game.settings.get("noctis", key); }
  catch (e) { return RULES.find(r => r.key === key)?.default; }
}

/** Liste lisible pour l'onglet « Variantes » : variantes actives d'abord, puis règles de base en vigueur. */
export function variantList() {
  const list = RULES.map(r => {
    const value = rule(r.key);
    const active = value !== r.book;
    return {
      key: r.key, group: r.group, icon: r.icon,
      title: r.name.replace(/^(Variante|Règle optionnelle)\s*:\s*/, "").replace(/^./, c => c.toUpperCase()),
      choice: r.choices ? r.choices[value] : (value ? "Activée" : "Désactivée"),
      text: r.texts[String(value)],
      book: r.texts[String(r.book)],
      active
    };
  });
  return { active: list.filter(v => v.active), book: list.filter(v => !v.active) };
}
