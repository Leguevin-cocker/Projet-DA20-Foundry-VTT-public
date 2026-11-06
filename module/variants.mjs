import { loc, registerLocalizable } from "./i18n.mjs";
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
    name: "NOCTIS.js.VarianteCoutDeLaDefense",
    hint: "NOCTIS.js.LivreChaqueDefenseEsquiveParadeBlocage",
    type: String, default: "firstFree",
    choices: {
      action: "NOCTIS.js.LivreChaqueDefenseCouteUneAction",
      firstFree: "NOCTIS.js.DefenseReflexe1reDefenseDuTour",
      dicePenalty: "NOCTIS.js.DefenseAuPrixDUnDe"
    },
    book: "action",
    texts: {
      action: "NOCTIS.js.ChaqueDefenseCouteUneActionUn",
      firstFree: "NOCTIS.js.LaPremiereDefenseDeChaqueTour",
      dicePenalty: "NOCTIS.js.SeDefendreNeCoutePasD"
    }
  },
  {
    key: "minDamage", group: "Combat", icon: "fa-solid fa-burst",
    name: "NOCTIS.js.Variante1ReussiteDeDegatsMinimum",
    hint: "NOCTIS.js.CocheUneAttaqueQuiToucheFait",
    type: Boolean, default: true, book: false,
    texts: {
      true: "NOCTIS.js.UneAttaqueQuiToucheInfligeToujours",
      false: "NOCTIS.js.UnJetDeDegatsSansReussite"
    }
  },
  {
    key: "damageAllSuccesses", group: "Combat", icon: "fa-solid fa-plus",
    name: "NOCTIS.js.DegatsToutesLesReussitesDeL",
    hint: "NOCTIS.js.DecocheRegleDeBaseChapitreCombat",
    type: Boolean, default: false, book: false,
    texts: {
      true: "NOCTIS.js.ToutesLesReussitesNettesDeL",
      false: "NOCTIS.js.SeulesLesReussitesAuDelaDe"
    }
  },
  {
    key: "npcAverage", group: "Combat", icon: "fa-solid fa-scale-balanced",
    name: "NOCTIS.js.VariantePnjAuResultatMoyen",
    hint: "NOCTIS.js.CocheLesPnjNeLancentPas",
    type: Boolean, default: true, book: false,
    texts: {
      true: "NOCTIS.js.LesPnjNeLancentPasL",
      false: "NOCTIS.js.LesPnjLancentLeursDesD"
    }
  },
  {
    key: "armorVsFire", group: "Combat", icon: "fa-solid fa-fire",
    name: "NOCTIS.js.VarianteLArmureNeProtegePas",
    hint: "NOCTIS.js.CocheContreUneArmeOuDes",
    type: Boolean, default: true, book: false,
    texts: {
      true: "NOCTIS.js.ContreLeFeuEtLeSoleil",
      false: "NOCTIS.js.LArmureAbsorbeAussiLeFeu"
    }
  },
  {
    key: "willpowerSoak", group: "Combat", icon: "fa-solid fa-shield-heart",
    name: "NOCTIS.js.VarianteVolonteSurLAbsorption",
    hint: "NOCTIS.js.CocheUnPjPeutDepenser1",
    type: Boolean, default: true, book: false,
    texts: {
      true: "NOCTIS.js.UnPjPeutDepenser1Point",
      false: "NOCTIS.js.LaVolonteNeSAjoutePas"
    }
  },
  {
    key: "bloodHealCombat", group: "Combat", icon: "fa-solid fa-droplet",
    name: "NOCTIS.js.VarianteGuerisonParLeSangEn",
    hint: "NOCTIS.js.UneGuerisonGratuiteParTourLa",
    type: String, default: "firstFree", book: "free",
    choices: {
      free: "NOCTIS.js.LibreGuerirNeCoutePasD",
      firstFree: "NOCTIS.js.1GuerisonGratuiteParTourPuis"
    },
    texts: {
      free: "NOCTIS.js.DepenserDuSangPourGuerirNe",
      firstFree: "NOCTIS.js.LaPremiereGuerisonParLeSang"
    }
  },
  {
    key: "initiativeOnce", group: "Combat", icon: "fa-solid fa-list-ol",
    name: "NOCTIS.js.VarianteInitiativeUneFoisParCombat",
    hint: "NOCTIS.js.CocheLInitiativeSeLanceUne",
    type: Boolean, default: true, book: false,
    texts: {
      true: "NOCTIS.js.LInitiativeEstLanceeUneSeule",
      false: "NOCTIS.js.LInitiativeDeTousLesCombattants"
    }
  },
  {
    key: "ignoreArmorPenalty", group: "Combat", icon: "fa-solid fa-person-running",
    name: "NOCTIS.js.RegleOptionnelleIgnorerLesPenalitesD",
    hint: "NOCTIS.js.CocheLesArmuresProtegentToujoursMais",
    type: Boolean, default: false, book: false,
    texts: {
      true: "NOCTIS.js.LesArmuresProtegentMaisNeRetirent",
      false: "NOCTIS.js.LesArmuresRetirentDesDesAux"
    }
  },
  {
    key: "tensAlwaysDouble", group: "NOCTIS.js.Des2", icon: "fa-solid fa-dice-d10",
    name: "NOCTIS.js.RegleOptionnelleLes10ComptentToujours",
    hint: "NOCTIS.js.CocheChaque10VautDeuxReussites",
    type: Boolean, default: false, book: false,
    texts: {
      true: "NOCTIS.js.Chaque10VautDeuxReussitesSur",
      false: "NOCTIS.js.Un10NeVautDeuxReussites"
    }
  },
  {
    key: "onesRule", group: "NOCTIS.js.Des2", icon: "fa-solid fa-skull",
    name: "NOCTIS.js.RegleOptionnelleLes1",
    hint: "NOCTIS.js.LivreChaque1AnnuleUneReussite",
    type: String, default: "cancel", book: "cancel",
    choices: { cancel: "NOCTIS.js.LivreLes1AnnulentDesReussites", halfBotch: "NOCTIS.js.VarianteEchecCritiqueSiPlusDe" },
    texts: {
      cancel: "NOCTIS.js.Chaque1AnnuleUneReussiteEchec",
      halfBotch: "NOCTIS.js.Les1NAnnulentAucuneReussite"
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
      title: r.name.replace(/^(Variante|Règle optionnelle|Variant|Optional rule)\s*:\s*/, "").replace(/^./, c => c.toUpperCase()),
      choice: r.choices ? r.choices[value] : (value ? loc("NOCTIS.js.Activee") : loc("NOCTIS.js.Desactivee")),
      text: r.texts[String(value)],
      book: r.texts[String(r.book)],
      active
    };
  });
  return { active: list.filter(v => v.active), book: list.filter(v => !v.active) };
}

registerLocalizable(RULES);
