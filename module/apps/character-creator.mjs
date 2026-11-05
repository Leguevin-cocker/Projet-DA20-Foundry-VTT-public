import { gatherItems, disciplineKey } from "../registry.mjs";
import { NOCTIS, generationStats } from "../config.mjs";
import { traitTooltip } from "../trait-help.mjs";

const TIP_COST = {
  attribute: "Création : 7 / 5 / 3 points selon la catégorie (1 point offert). Bonus : 5 points par point.",
  ability: "Création : 13 / 9 / 5 points selon la catégorie, 3 au maximum. Bonus : 2 points par point.",
  discipline: "Création : 4 points à répartir. Bonus : 7 points par point.",
  background: "Création : 5 points à répartir. Bonus : 1 point par point.",
  virtue: "Création : 7 points (1 offert dans chaque vertu). Bonus : 2 points par point."
};
const tip = (kind, key, label) => traitTooltip(kind, key, label, TIP_COST[kind]);

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/** Descriptions courtes des archétypes. */
export const ARCHETYPES = {
  "Ange gardien": "Protège et réconforte les autres.", "Architecte": "Veut bâtir quelque chose qui dure.", "Autocrate": "Veut régner, contrôler.",
  "Battant": "Fait de tout une compétition.", "Bête": "Méprise la civilisation.", "Bon vivant": "Croque la vie (et la non-vie) à pleines dents.",
  "Bouffon": "Révèle la vérité par la farce.", "Brute": "Obtient ce qu'il veut par la force.", "Caméléon": "Se fond partout, accepté de tous.",
  "Casse-cou": "Vit pour le frisson du danger.", "Célébrant": "Vit avec passion pour sa cause.", "Conformiste": "Suit le mouvement et soutient le meneur.",
  "Défenseur": "Défend ses convictions coûte que coûte.", "Déviant": "Goûts excentriques, assumés.", "Dilettante": "Papillonne de passion en passion.",
  "Dirigiste": "Fait naître l'ordre du chaos.", "Enfant": "Immature, cherche un guide.", "Énigme": "Ses motifs restent impénétrables.",
  "Fanatique": "Dévoré par sa cause.", "Gourou": "Inspire spirituellement les autres.", "Grand-guignol": "Aime choquer et dégoûter.",
  "Idéaliste": "Poursuit une perfection qu'il sait exister.", "Individualiste": "Ne pense qu'à lui-même.", "Juge": "Pèse les preuves pour trouver la vérité.",
  "Martyr": "Sa souffrance sauvera les autres.", "Masochiste": "Recherche la douleur.", "Mercenaire": "Tout s'achète, lui compris.",
  "Monstre": "Embrasse sa nature de cauchemar.", "Œil du cyclone": "Reste calme au cœur du chaos.", "Opportuniste": "Tourne tout à son avantage.",
  "Pédagogue": "Transmet son savoir.", "Pénitent": "Doit expier, jamais assez bon.", "Perfectionniste": "Exige l'excellence, de lui d'abord.",
  "Philosophe": "Cherche le sens de toute chose.", "Râleur": "Trouve des défauts à tout.", "Rebelle": "Le système est une prison : il faut le briser.",
  "Sadique": "Prend plaisir à faire souffrir.", "Séducteur": "Veut être le centre de toutes les attentions.", "Soldat": "Suit un code et les ordres qui le respectent.",
  "Solitaire": "N'a besoin de personne.", "Survivant": "Rien ne l'arrêtera.", "Traditionaliste": "Ce qui a fait ses preuves doit demeurer.",
  "Visionnaire": "Voit tous les possibles."
};

const CONCEPTS = ["Artiste (troubadour, musicien, acteur)", "Clerc (moine, moniale, prêtre, imam)", "Criminel (voleur, receleur, brigand)", "Enfant (orphelin, enfant soldat)",
  "Intellectuel (philosophe, lettré)", "Investigateur (shérif, inquisiteur)", "Marginal (étranger, lépreux, hérétique)", "Politicien (noble, juge, conseiller)",
  "Professionnel (maçon, médecin, forgeron)", "Soldat (mercenaire, croisé, sentinelle)", "Travailleur (fermier, mineur, marin)", "Vagabond (pèlerin, caravanier)"];

const STEPS = [
  { id: 0, label: "Mode", icon: "fa-solid fa-signs-post" },
  { id: 1, label: "Concept", icon: "fa-solid fa-feather" },
  { id: 2, label: "Attributs", icon: "fa-solid fa-hand-fist" },
  { id: 3, label: "Capacités", icon: "fa-solid fa-book-open" },
  { id: 4, label: "Avantages", icon: "fa-solid fa-droplet" },
  { id: 5, label: "Touches finales", icon: "fa-solid fa-scale-balanced" },
  { id: 6, label: "Atouts et handicaps", icon: "fa-solid fa-scale-unbalanced" },
  { id: 7, label: "Points de bonus", icon: "fa-solid fa-star" },
  { id: 8, label: "Résumé", icon: "fa-solid fa-scroll" }
];

const GROUP_LABEL = { primary: "Primaire", secondary: "Secondaire", tertiary: "Tertiaire" };

function emptyState() {
  const z = (keys) => Object.fromEntries(keys.map(k => [k, 0]));
  return {
    mode: null, step: 0,
    name: "", concept: "", nature: "", demeanor: "", sire: "", player: "",
    clanId: "", roadId: "",
    attrRank: { physical: "", social: "", mental: "" },
    abilRank: { talents: "", skills: "", knowledges: "" },
    attributes: z(Object.keys(NOCTIS.attributes)),
    abilities: z(Object.keys(NOCTIS.abilities)),
    disciplines: {},
    backgrounds: z(Object.keys(NOCTIS.backgrounds)),
    virtues: { conscience: 0, selfcontrol: 0, courage: 0 },
    bonus: { attributes: {}, abilities: {}, disciplines: {}, backgrounds: {}, virtues: {}, road: 0, willpower: 0 },
    merits: [], flaws: [], mf: {},
    bloodRoll: null
  };
}

/**
 * Créateur de personnage NOCTIS : mode guidé ou libre.
 */
export class CharacterCreator extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(options = {}) {
    const actor = options.actor;
    delete options.actor;
    if (actor?.id) options.id ??= `noctis-creator-${actor.id}`;
    super(options);
    this.actor = actor;
    if (!this.actor) throw new Error("NOCTIS | Le créateur de personnage a besoin d'un acteur.");
    let saved = null;
    try { saved = this.actor.getFlag("noctis", "creator"); } catch (err) { console.warn("NOCTIS | brouillon illisible", err); }
    this.cs = foundry.utils.mergeObject(emptyState(), saved ?? {}, { inplace: false });
    if (!this.cs.name) this.cs.name = this.actor.name;
    if (!this.cs.player) this.cs.player = this.actor.system.identity?.player ?? "";
    this._cache = null;
  }

  static DEFAULT_OPTIONS = {
    tag: "div",
    classes: ["noctis", "noctis-window", "noctis-creator"],
    window: { title: "Créateur de personnage", icon: "fa-solid fa-wand-magic-sparkles", resizable: true },
    position: { width: 940, height: 820 },
    actions: {
      setMode: CharacterCreator.#onSetMode,
      goto: CharacterCreator.#onGoto,
      next: CharacterCreator.#onNext,
      prev: CharacterCreator.#onPrev,
      setDots: CharacterCreator.#onSetDots,
      bonus: CharacterCreator.#onBonus,
      toggleMF: CharacterCreator.#onToggleMF,
      rollBlood: CharacterCreator.#onRollBlood,
      finish: CharacterCreator.#onFinish,
      reset: CharacterCreator.#onReset
    }
  };

  static PARTS = { body: { template: "systems/noctis/templates/apps/creator.hbs", scrollable: [".creator-main"] } };

  get title() { return `Créateur de personnage : ${this.actor?.name ?? ""}`; }

  /** Ouvre (ou ramène au premier plan) le créateur d'un acteur, en affichant toute erreur. */
  static async open(actor) {
    try {
      const existing = foundry.applications.instances?.get?.(`noctis-creator-${actor.id}`);
      if (existing) return existing.render({ force: true });
      const app = new this({ actor });
      await app.render({ force: true });
      return app;
    } catch (err) {
      console.error("NOCTIS | Impossible d'ouvrir le créateur de personnage", err);
      ui.notifications.error(`Noctis : le créateur n'a pas pu s'ouvrir (${err.message}). Détail dans la console (F12).`);
    }
  }

  get guided() { return this.cs.mode !== "free"; }

  /* -------------------------------------------- */
  /*  Données des compendiums                       */
  /* -------------------------------------------- */

  async #loadCompendia() {
    if (this._cache) return this._cache;
    // Contenu de la table : objets du monde et de tous les compendiums d'objets
    const clans = await gatherItems(["clan"], ["system.disciplines", "system.weakness", "system.nickname", "system.emblem", "system.isBloodline", "system.disciplineNote", "system.appearanceZero"]);
    const roads = await gatherItems(["road"], ["system.virtue1", "system.virtue2", "system.latin"]);
    const discs = (await gatherItems(["discipline"], ["system.key", "system.isPath", "system.parent"])).map(d => ({ ...d, system: { ...d.system, key: disciplineKey(d) } }));
    const mf = await gatherItems(["merit", "flaw"], ["system.cost", "system.costText", "system.category", "system.levels", "system.description"]);
    for (const list of [clans, roads, discs, mf]) for (const e of list) e.system ??= {};
    clans.sort((a, b) => (!!a.system.isBloodline - !!b.system.isBloodline) || a.name.localeCompare(b.name, "fr"));
    this._cache = { clans, roads, discs, merits: mf.filter(m => m.type === "merit"), flaws: mf.filter(m => m.type === "flaw") };
    return this._cache;
  }

  /* -------------------------------------------- */
  /*  Calculs                                       */
  /* -------------------------------------------- */

  #rankPoints(rank, table) {
    const order = ["primary", "secondary", "tertiary"];
    const out = {};
    for (const [g, r] of Object.entries(rank)) out[g] = r ? table[order.indexOf(r)] : null;
    return out;
  }

  #compute(cache) {
    const st = this.cs;
    const clan = cache.clans.find(c => c._id === st.clanId) ?? null;
    const road = cache.roads.find(r => r._id === st.roadId) ?? null;
    const noAppearance = !!clan?.system?.appearanceZero;
    const sum = (o) => Object.values(o ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);

    // Attributs
    const attrPts = this.#rankPoints(st.attrRank, NOCTIS.creation.attributes);
    const attrGroups = Object.entries(NOCTIS.attributeGroups).map(([g, def]) => {
      const spent = def.keys.reduce((a, k) => a + (st.attributes[k] || 0), 0);
      return { key: g, label: def.label, rank: st.attrRank[g], rankLabel: GROUP_LABEL[st.attrRank[g]] ?? "—", points: attrPts[g], spent,
        left: attrPts[g] == null ? null : attrPts[g] - spent, ok: attrPts[g] != null && spent === attrPts[g],
        traits: def.keys.map(k => {
          const base = (k === "appearance" && noAppearance) ? 0 : 1;
          const b = st.bonus.attributes[k] || 0;
          return { key: k, label: NOCTIS.attributes[k], base, alloc: st.attributes[k] || 0, bonus: b, value: base + (st.attributes[k] || 0) + b, locked: k === "appearance" && noAppearance, path: `attributes.${k}`, tip: tip("attribute", k, NOCTIS.attributes[k]) };
        }) };
    });
    // Capacités
    const abilPts = this.#rankPoints(st.abilRank, NOCTIS.creation.abilities);
    const abilGroups = Object.entries(NOCTIS.abilityGroups).map(([g, def]) => {
      const spent = def.keys.reduce((a, k) => a + (st.abilities[k] || 0), 0);
      return { key: g, label: def.label, rank: st.abilRank[g], rankLabel: GROUP_LABEL[st.abilRank[g]] ?? "—", points: abilPts[g], spent,
        left: abilPts[g] == null ? null : abilPts[g] - spent, ok: abilPts[g] != null && spent === abilPts[g],
        traits: def.keys.map(k => ({ key: k, label: NOCTIS.abilities[k], alloc: st.abilities[k] || 0, bonus: st.bonus.abilities[k] || 0, value: (st.abilities[k] || 0) + (st.bonus.abilities[k] || 0), path: `abilities.${k}`, tip: tip("ability", k, NOCTIS.abilities[k]) }))
          .sort((a, b) => a.label.localeCompare(b.label, "fr")) };
    });
    // Disciplines proposées
    const clanDisc = clan?.system?.disciplines ?? [];
    const allKeys = [...new Set(cache.discs.filter(d => !d.system.isPath).map(d => d.system.key))];
    const discKeys = this.guided ? clanDisc : [...new Set([...clanDisc, ...allKeys])];
    for (const k of Object.keys(st.disciplines)) if (!discKeys.includes(k) && st.disciplines[k]) discKeys.push(k);
    const discOf = (k) => cache.discs.find(d => !d.system?.isPath && d.system?.key === k);
    const disciplines = discKeys.map(k => { const d = discOf(k); const label = d?.name ?? NOCTIS.disciplines[k] ?? k; return { key: k, label, alloc: st.disciplines[k] || 0, bonus: st.bonus.disciplines[k] || 0,
      value: (st.disciplines[k] || 0) + (st.bonus.disciplines[k] || 0), inClan: clanDisc.includes(k), img: d?.img || "systems/noctis/assets/icons/discipline.svg", path: `disciplines.${k}`, tip: tip("discipline", k, label) }; });
    const discSpent = sum(st.disciplines);
    // Historiques
    const backgrounds = Object.entries(NOCTIS.backgrounds).map(([k, label]) => ({ key: k, label, alloc: st.backgrounds[k] || 0, bonus: st.bonus.backgrounds[k] || 0,
      value: (st.backgrounds[k] || 0) + (st.bonus.backgrounds[k] || 0), path: `backgrounds.${k}`, tip: tip("background", k, label) }));
    const bgSpent = sum(st.backgrounds);
    // Vertus (1 point offert dans chacune)
    const v1 = road?.system?.virtue1 ?? "conscience", v2 = road?.system?.virtue2 ?? "selfcontrol";
    const virtues = [
      { key: "conscience", label: NOCTIS.virtueLabels[v1] },
      { key: "selfcontrol", label: NOCTIS.virtueLabels[v2] },
      { key: "courage", label: "Courage" }
    ].map(v => ({ ...v, alloc: st.virtues[v.key] || 0, bonus: st.bonus.virtues[v.key] || 0, value: 1 + (st.virtues[v.key] || 0) + (st.bonus.virtues[v.key] || 0), path: `virtues.${v.key}`, tip: tip("virtue", v.key === "conscience" ? v1 : v.key === "selfcontrol" ? v2 : "courage", v.label) }));
    const virtSpent = sum(st.virtues);
    const vv = Object.fromEntries(virtues.map(v => [v.key, v.value]));
    // Génération et sang
    const generation = Math.max(3, 12 - ((st.backgrounds.generation || 0) + (st.bonus.backgrounds.generation || 0)));
    const gs = generationStats(generation);
    const roadBase = vv.conscience + vv.selfcontrol;
    const roadValue = roadBase + (st.bonus.road || 0);
    const willBase = vv.courage;
    const willValue = willBase + (st.bonus.willpower || 0);
    // Points de bonus
    const c = NOCTIS.bonusCosts;
    const bonusSpent = sum(st.bonus.attributes) * c.attribute + sum(st.bonus.abilities) * c.ability + sum(st.bonus.disciplines) * c.discipline
      + sum(st.bonus.backgrounds) * c.background + sum(st.bonus.virtues) * c.virtue + (st.bonus.road || 0) * c.road + (st.bonus.willpower || 0) * c.willpower;
    const lvl = (m) => Number(st.mf?.[m._id]) || m.system?.cost || 0;
    const meritCost = st.merits.reduce((a, id) => { const m = cache.merits.find(x => x._id === id); return a + (m ? lvl(m) : 0); }, 0);
    const flawRawSum = st.flaws.reduce((a, id) => { const m = cache.flaws.find(x => x._id === id); return a + (m ? lvl(m) : 0); }, 0);
    const flawGain = Math.min(NOCTIS.creation.maxFlaws, flawRawSum);
    const bonusTotal = NOCTIS.creation.bonusPoints + flawGain;
    const bonusLeft = bonusTotal - bonusSpent - meritCost;

    // Contrôles du mode guidé
    const errors = {};
    const e = (step, msg) => (errors[step] ??= []).push(msg);
    if (!st.name) e(1, "Donnez un nom au personnage.");
    if (!clan && this.actor.type === "vampire") e(1, "Choisissez un clan.");
    if (!road) e(1, "Choisissez une Voie.");
    if (!st.nature || !st.demeanor) e(1, "Choisissez une nature et une attitude.");
    const ranksA = Object.values(st.attrRank); if (new Set(ranksA.filter(Boolean)).size !== 3) e(2, "Classez les trois catégories d'attributs (une primaire, une secondaire, une tertiaire).");
    for (const g of attrGroups) if (g.points != null && g.spent !== g.points) e(2, `${g.label} : ${g.spent}/${g.points} points répartis.`);
    for (const g of attrGroups) for (const t of g.traits) if (t.base + t.alloc > 5) e(2, `${t.label} ne peut pas dépasser 5.`);
    const ranksB = Object.values(st.abilRank); if (new Set(ranksB.filter(Boolean)).size !== 3) e(3, "Classez les trois catégories de capacités.");
    for (const g of abilGroups) if (g.points != null && g.spent !== g.points) e(3, `${g.label} : ${g.spent}/${g.points} points répartis.`);
    for (const g of abilGroups) for (const t of g.traits) if (t.alloc > NOCTIS.creation.abilityMax) e(3, `${t.label} : 3 maximum avant les points de bonus.`);
    if (discSpent !== NOCTIS.creation.disciplines) e(4, `Disciplines : ${discSpent}/${NOCTIS.creation.disciplines} points.`);
    if (bgSpent !== NOCTIS.creation.backgrounds) e(4, `Historiques : ${bgSpent}/${NOCTIS.creation.backgrounds} points.`);
    if (virtSpent !== NOCTIS.creation.virtues) e(4, `Vertus : ${virtSpent}/${NOCTIS.creation.virtues} points.`);
    for (const v of virtues) if (1 + v.alloc > 5) e(4, `${v.label} ne peut pas dépasser 5.`);
    if (bonusLeft < 0) e(7, `Points de bonus dépassés de ${-bonusLeft}.`);
    const flawRaw = flawRawSum;
    if (flawRaw > NOCTIS.creation.maxFlaws) e(6, `Les handicaps ne rapportent que ${NOCTIS.creation.maxFlaws} points au maximum (${flawRaw} choisis).`);

    const bloodStart = st.bloodRoll != null ? Math.min(gs.blood, st.bloodRoll + (st.backgrounds.domain || 0) + (st.backgrounds.herd || 0) + (st.bonus.backgrounds.domain || 0) + (st.bonus.backgrounds.herd || 0)) : null;

    return { clan, road, attrGroups, abilGroups, disciplines, discSpent, backgrounds, bgSpent, virtues, virtSpent, generation, gs,
      roadBase, roadValue, willBase, willValue, bonusSpent, meritCost, flawGain, flawRaw, bonusTotal, bonusLeft, errors, bloodStart, noAppearance };
  }

  /** Récapitulatif des dépenses de création, affiché dans l'onglet Expérience. */
  async creationLog() {
    const cache = await this.#loadCompendia();
    return this.#creationLog(cache, this.#compute(cache));
  }

  #creationLog(cache, c) {
    const st = this.cs;
    const C = NOCTIS.bonusCosts;
    const list = (traits) => traits.filter(t => t.alloc > 0).map(t => `${t.label} +${t.alloc}`).join(", ") || "—";
    const groups = (gs) => gs.map(g => ({ label: g.rank ? `${g.label} (${g.rankLabel.toLowerCase()})` : g.label, points: `${g.spent} / ${g.points ?? "—"}`, detail: list(g.traits) }));
    const sections = [
      { title: "Attributs", rule: "7 / 5 / 3 points (1 point offert dans chaque attribut)", rows: groups(c.attrGroups) },
      { title: "Capacités", rule: "13 / 9 / 5 points, 3 au maximum", rows: groups(c.abilGroups) },
      { title: "Avantages", rule: "4 en disciplines, 5 en historiques, 7 en vertus", rows: [
        { label: "Disciplines", points: `${c.discSpent} / ${NOCTIS.creation.disciplines}`, detail: list(c.disciplines) },
        { label: "Historiques", points: `${c.bgSpent} / ${NOCTIS.creation.backgrounds}`, detail: list(c.backgrounds) },
        { label: "Vertus", points: `${c.virtSpent} / ${NOCTIS.creation.virtues}`, detail: list(c.virtues) }
      ] }
    ];
    const bonus = [];
    const add = (traits, unit, kind) => { for (const t of traits) if (t.bonus > 0) bonus.push({ label: t.label, kind, detail: `+${t.bonus} × ${unit}`, cost: t.bonus * unit }); };
    add(c.attrGroups.flatMap(g => g.traits), C.attribute, "Attribut");
    add(c.abilGroups.flatMap(g => g.traits), C.ability, "Capacité");
    add(c.disciplines, C.discipline, "Discipline");
    add(c.backgrounds, C.background, "Historique");
    add(c.virtues, C.virtue, "Vertu");
    if (st.bonus.road > 0) bonus.push({ label: "Voie", kind: "Voie", detail: `+${st.bonus.road} × ${C.road}`, cost: st.bonus.road * C.road });
    if (st.bonus.willpower > 0) bonus.push({ label: "Volonté", kind: "Volonté", detail: `+${st.bonus.willpower} × ${C.willpower}`, cost: st.bonus.willpower * C.willpower });
    const lv = (m) => Number(st.mf?.[m._id]) || m.system.cost || 0;
    for (const id of st.merits) { const m = cache.merits.find(x => x._id === id); if (m) bonus.push({ label: m.name, kind: "Atout", detail: m.system.levels?.length ? `niveau ${lv(m)}` : "", cost: lv(m) }); }
    for (const id of st.flaws) { const m = cache.flaws.find(x => x._id === id); if (m) bonus.push({ label: m.name, kind: "Handicap", detail: m.system.levels?.length ? `niveau ${lv(m)}` : "", cost: -lv(m) }); }
    return {
      mode: st.mode === "free" ? "libre" : "guidé",
      date: new Date().toLocaleDateString("fr-FR"),
      clan: c.clan?.name ?? "", road: c.road?.name ?? "",
      sections, bonus,
      bonusTotal: c.bonusTotal, bonusSpent: c.bonusSpent + c.meritCost, bonusLeft: c.bonusLeft, flawGain: c.flawGain,
      derived: [
        { label: "Génération", value: NOCTIS.generationNames[c.generation] ?? c.generation },
        { label: "Voie", value: c.roadValue }, { label: "Volonté", value: c.willValue },
        { label: "Sang de départ", value: c.bloodStart ?? "—" }
      ]
    };
  }

  /* -------------------------------------------- */

  async _prepareContext() {
    const cache = await this.#loadCompendia();
    const st = this.cs;
    const c = this.#compute(cache);
    const steps = STEPS.map(s => ({ ...s, active: s.id === st.step, done: s.id < st.step, error: !!c.errors[s.id]?.length && s.id < st.step }));
    const rankChoices = { "": "—", primary: "Primaire", secondary: "Secondaire", tertiary: "Tertiaire" };
    const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const mfRow = (m, list, kind) => {
      const checked = list.includes(m._id);
      const level = Number(st.mf?.[m._id]) || m.system.cost;
      const levels = (m.system.levels ?? []).map(l => ({ value: l.value, text: l.text, active: checked && l.value === level }));
      const desc = strip(m.system.description).replace(/Coût :.*$/, "").trim();
      return { id: m._id, kind, name: m.name, cost: m.system.cost, costText: m.system.costText, checked, level, levels, multi: levels.length > 1,
        levelText: checked ? (levels.find(l => l.value === level)?.text ?? "") : "", desc, short: desc.length > 180 ? desc.slice(0, 180).replace(/\s\S*$/, "") + "…" : desc };
    };
    const MF_CATS = [["physical", "💪", "Physiques"], ["mental", "🧠", "Mentaux"], ["social", "👄", "Sociaux"], ["supernatural", "⛤", "Surnaturels"]];
    const mfSections = MF_CATS.map(([key, icon, label]) => ({
      key, icon, label,
      merits: cache.merits.filter(m => m.system.category === key).sort((a, b) => a.system.cost - b.system.cost || a.name.localeCompare(b.name, "fr")).map(m => mfRow(m, st.merits, "merit")),
      flaws: cache.flaws.filter(m => m.system.category === key).sort((a, b) => a.system.cost - b.system.cost || a.name.localeCompare(b.name, "fr")).map(m => mfRow(m, st.flaws, "flaw"))
    }));
    const chosenMF = mfSections.flatMap(sec => [...sec.merits, ...sec.flaws].filter(r => r.checked).map(r => ({ ...r, icon: sec.icon })));
    return {
      actor: this.actor, st, steps, step: st.step, guided: this.guided, free: st.mode === "free", modeChosen: !!st.mode,
      ...c,
      noPacks: !cache.clans.length,
      clans: cache.clans.map(cl => ({ id: cl._id, name: cl.name, selected: cl._id === st.clanId, bloodline: cl.system.isBloodline })),
      roads: cache.roads.map(r => ({ id: r._id, name: r.name, selected: r._id === st.roadId })),
      clanDiscLabels: (c.clan?.system?.disciplines ?? []).map(k => NOCTIS.disciplines[k] ?? k).join(", "),
      archetypes: Object.entries(ARCHETYPES).map(([n, d]) => ({ name: n, desc: d })),
      natureDesc: ARCHETYPES[st.nature] ?? "", demeanorDesc: ARCHETYPES[st.demeanor] ?? "",
      concepts: CONCEPTS, rankChoices,
      mfSections, chosenMF, hasChosenMF: chosenMF.length > 0,
      stepErrors: c.errors[st.step] ?? [],
      allErrors: Object.entries(c.errors).flatMap(([s, list]) => list.map(m => `${STEPS[s].label} : ${m}`)),
      isFirst: st.step === 0, isLast: st.step === 8,
      bonusCosts: NOCTIS.bonusCosts,
      roadTip: traitTooltip("road", "", "Voie", "Départ : Conscience/Conviction + Maîtrise de soi/Instinct. Bonus : 2 points par point."),
      willTip: traitTooltip("willpower", "", "Volonté", "Départ : égale au Courage. Bonus : 1 point par point."),
      generationLabel: NOCTIS.generationNames[c.generation] ?? c.generation
    };
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.element.addEventListener("change", ev => this.#onFieldChange(ev));
  }

  async #onFieldChange(ev) {
    const t = ev.target;
    const name = t.name;
    if (!name?.startsWith("st.")) return;
    const path = name.slice(3);
    foundry.utils.setProperty(this.cs, path, t.type === "number" ? Number(t.value) || 0 : t.value);
    if (path === "clanId") { this.cs.disciplines = {}; this.cs.bonus.disciplines = {}; }
    await this.#save();
    this.render();
  }

  async #save() {
    await this.actor.setFlag("noctis", "creator", foundry.utils.deepClone(this.cs));
  }

  /* -------------------------------------------- */
  /*  Actions                                       */
  /* -------------------------------------------- */

  static async #onSetMode(event, target) {
    this.cs.mode = target.dataset.mode;
    this.cs.step = 1;
    await this.#save();
    this.render();
  }

  static async #onGoto(event, target) {
    const s = Number(target.dataset.step);
    if (this.guided && s > this.cs.step) {
      const cache = await this.#loadCompendia();
      const c = this.#compute(cache);
      for (let i = 1; i < s; i++) if (c.errors[i]?.length) return ui.notifications.warn(`Étape « ${STEPS[i].label} » incomplète : ${c.errors[i][0]}`);
    }
    this.cs.step = s;
    await this.#save();
    this.render();
  }

  static async #onNext() {
    if (this.guided && this.cs.step > 0) {
      const cache = await this.#loadCompendia();
      const c = this.#compute(cache);
      const errs = c.errors[this.cs.step];
      if (errs?.length) return ui.notifications.warn(errs[0]);
    }
    this.cs.step = Math.min(8, this.cs.step + 1);
    await this.#save();
    this.render();
  }

  static async #onPrev() {
    this.cs.step = Math.max(0, this.cs.step - 1);
    await this.#save();
    this.render();
  }

  /** Clic sur un point : fixe la part « points de création » du trait. */
  static async #onSetDots(event, target) {
    const wrap = target.closest("[data-path]");
    const [group, key] = wrap.dataset.path.split(".");
    const dot = Number(target.dataset.dot);
    const meta = target.closest("[data-base]");
    const base = Number(meta?.dataset.base) || 0;
    const bonus = Number(meta?.dataset.bonus) || 0;
    const current = Number(wrap.dataset.value) || 0;
    let value = dot === current ? dot - 1 : dot;
    let alloc = Math.max(0, value - base - bonus);
    this.cs[group][key] = alloc;
    await this.#save();
    this.render();
  }

  static async #onBonus(event, target) {
    const { group, key, delta } = target.dataset;
    const d = Number(delta);
    if (group === "road" || group === "willpower") this.cs.bonus[group] = Math.max(0, (this.cs.bonus[group] || 0) + d);
    else {
      this.cs.bonus[group][key] = Math.max(0, (this.cs.bonus[group][key] || 0) + d);
      if (!this.cs.bonus[group][key]) delete this.cs.bonus[group][key];
    }
    await this.#save();
    this.render();
  }

  static async #onToggleMF(event, target) {
    if (!target.dataset.level && event.target.closest("details, .mf-levels")) return;
    const list = target.dataset.kind === "flaw" ? this.cs.flaws : this.cs.merits;
    const id = target.dataset.id;
    this.cs.mf ??= {};
    const lvl = Number(target.dataset.level);
    const i = list.indexOf(id);
    if (lvl) {
      // Choix d'un niveau : sélectionne, ou désélectionne si on reclique le niveau actif
      if (i >= 0 && Number(this.cs.mf[id]) === lvl) { list.splice(i, 1); delete this.cs.mf[id]; }
      else { if (i < 0) list.push(id); this.cs.mf[id] = lvl; }
    } else if (i >= 0) { list.splice(i, 1); delete this.cs.mf[id]; }
    else list.push(id);
    await this.#save();
    this.render();
  }

  static async #onRollBlood() {
    const roll = await new Roll("1d10").evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: "Réserve de sang de départ (1d10 + Domaine + Troupeau)" });
    this.cs.bloodRoll = roll.total;
    await this.#save();
    this.render();
  }

  static async #onReset() {
    const ok = await DialogV2.confirm({ window: { title: "Recommencer" }, content: "<p>Effacer toutes les étapes du créateur ?</p>", rejectClose: false });
    if (!ok) return;
    this.cs = emptyState();
    this.cs.name = this.actor.name;
    await this.#save();
    this.render();
  }

  /** Applique la création à la fiche. */
  static async #onFinish() {
    const cache = await this.#loadCompendia();
    const c = this.#compute(cache);
    const all = Object.values(c.errors).flat();
    if (this.guided && all.length) return ui.notifications.warn(`Création incomplète : ${all[0]}`);
    const st = this.cs;
    const actor = this.actor;
    const ok = await DialogV2.confirm({ window: { title: "Créer le personnage" }, content: `<p>Appliquer la création à <b>${st.name}</b> ? Les traits actuels de la fiche seront remplacés.</p>`, rejectClose: false });
    if (!ok) return;

    const upd = { name: st.name, "system.identity.concept": st.concept, "system.identity.nature": st.nature, "system.identity.demeanor": st.demeanor, "system.identity.sire": st.sire, "system.identity.player": st.player };
    for (const g of c.attrGroups) for (const t of g.traits) upd[`system.attributes.${t.key}.value`] = t.value;
    for (const g of c.abilGroups) for (const t of g.traits) upd[`system.abilities.${t.key}.value`] = t.value;
    for (const b of c.backgrounds) upd[`system.backgrounds.${b.key}.value`] = b.value;
    for (const v of c.virtues) upd[`system.virtues.${v.key}.value`] = v.value;
    if (c.road) { upd["system.virtues.conscience.type"] = c.road.system.virtue1; upd["system.virtues.selfcontrol.type"] = c.road.system.virtue2; upd["system.road.name"] = c.road.name; }
    upd["system.road.value"] = c.roadValue;
    upd["system.willpower.permanent"] = c.willValue;
    upd["system.willpower.temporary"] = c.willValue;
    upd["system.generationBase"] = 12;
    if (c.bloodStart != null) upd["system.blood.value"] = c.bloodStart;
    if (c.clan) upd["system.identity.clan"] = c.clan.name;
    upd["system.creation.done"] = true;
    upd["flags.noctis.creationLog"] = this.#creationLog(cache, c);
    await actor.update(upd);

    // Objets : clan, Voie, disciplines, atouts, handicaps
    const replaceTypes = ["clan", "road", "discipline", "merit", "flaw"];
    const old = actor.items.filter(i => replaceTypes.includes(i.type)).map(i => i.id);
    if (old.length) await actor.deleteEmbeddedDocuments("Item", old);
    const toCreate = [];
    const fromUuid_ = async (uuid) => { const d = await fromUuid(uuid); if (!d) return null; const o = d.toObject(); delete o._id; return o; };
    if (c.clan) toCreate.push(await fromUuid_(c.clan.uuid));
    if (c.road) toCreate.push(await fromUuid_(c.road.uuid));
    for (const d of c.disciplines) {
      if (!d.value) continue;
      const cands = cache.discs.filter(x => x.system.key === d.key && !x.system.isPath);
      let entry = cands[0];
      if (cands.length > 1 && c.clan) {
        const n = c.clan.name.toLowerCase();
        // Plusieurs disciplines de même clé : on préfère celle dont le nom figure dans le nom de la lignée
        entry = cands.find(x => x.name.split(/\s+/).some(w => w.length > 3 && n.includes(w.toLowerCase()))) ?? cands[0];
      }
      if (!entry) continue;
      const o = await fromUuid_(entry.uuid);
      if (o) { o.system.value = d.value; toCreate.push(o); }
    }
    const withLevel = (o, id) => {
      const lv = Number(st.mf?.[id]);
      if (o && lv && o.system.levels?.length) {
        o.system.cost = lv;
        const t = o.system.levels.find(l => l.value === lv)?.text;
        if (t) o.system.description = `<p><b>Niveau ${lv} :</b> ${t}</p>` + o.system.description;
      }
      return o;
    };
    for (const id of st.merits) { const m = cache.merits.find(x => x._id === id); if (m) toCreate.push(withLevel(await fromUuid_(m.uuid), id)); }
    for (const id of st.flaws) { const m = cache.flaws.find(x => x._id === id); if (m) toCreate.push(withLevel(await fromUuid_(m.uuid), id)); }
    await actor.createEmbeddedDocuments("Item", toCreate.filter(Boolean));
    await actor.addXpEntry({ kind: "gain", amount: 0, label: `Création du personnage (${st.mode === "free" ? "mode libre" : "mode guidé"})`, category: "", note: `Points de bonus : ${c.bonusSpent + c.meritCost}/${c.bonusTotal}` });
    ui.notifications.info(`${st.name} est prêt. La fiche est verrouillée : les progressions passent désormais par l'expérience.`);
    this.close();
    actor.sheet.render({ force: true });
  }
}
