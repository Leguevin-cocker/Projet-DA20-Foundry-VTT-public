import { gatherItems, disciplineKey } from "../registry.mjs";
import { NOCTIS, generationStats } from "../config.mjs";
import { traitTooltip } from "../trait-help.mjs";
import { loc, registerLocalizable } from "../i18n.mjs";

const TIP_COST = {
  attribute: "NOCTIS.js.Creation753PointsSelon",
  ability: "NOCTIS.js.Creation1395PointsSelon",
  discipline: "NOCTIS.js.Creation4PointsARepartirBonus",
  background: "NOCTIS.js.Creation5PointsARepartirBonus",
  virtue: "NOCTIS.js.Creation7Points1OffertDans"
};
const tip = (kind, key, label) => traitTooltip(kind, key, label, TIP_COST[kind]);

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/** Descriptions courtes des archétypes. */
export const ARCHETYPES = [
  { name: "NOCTIS.js.ArchAngeGardien", desc: "NOCTIS.js.ProtegeEtReconforteLesAutres" },
  { name: "NOCTIS.js.ArchArchitecte", desc: "NOCTIS.js.VeutBatirQuelqueChoseQuiDure" },
  { name: "NOCTIS.js.ArchAutocrate", desc: "NOCTIS.js.VeutRegnerControler" },
  { name: "NOCTIS.js.ArchBattant", desc: "NOCTIS.js.FaitDeToutUneCompetition" },
  { name: "NOCTIS.js.ArchBete", desc: "NOCTIS.js.MepriseLaCivilisation" },
  { name: "NOCTIS.js.ArchBonVivant", desc: "NOCTIS.js.CroqueLaVieEtLaNon" },
  { name: "NOCTIS.js.ArchBouffon", desc: "NOCTIS.js.ReveleLaVeriteParLaFarce" },
  { name: "NOCTIS.js.ArchBrute", desc: "NOCTIS.js.ObtientCeQuIlVeutPar" },
  { name: "NOCTIS.js.ArchCameleon", desc: "NOCTIS.js.SeFondPartoutAccepteDeTous" },
  { name: "NOCTIS.js.ArchCasseCou", desc: "NOCTIS.js.VitPourLeFrissonDuDanger" },
  { name: "NOCTIS.js.ArchCelebrant", desc: "NOCTIS.js.VitAvecPassionPourSaCause" },
  { name: "NOCTIS.js.ArchConformiste", desc: "NOCTIS.js.SuitLeMouvementEtSoutientLe" },
  { name: "NOCTIS.js.ArchDefenseur", desc: "NOCTIS.js.DefendSesConvictionsCouteQueCoute" },
  { name: "NOCTIS.js.ArchDeviant", desc: "NOCTIS.js.GoutsExcentriquesAssumes" },
  { name: "NOCTIS.js.ArchDilettante", desc: "NOCTIS.js.PapillonneDePassionEnPassion" },
  { name: "NOCTIS.js.ArchDirigiste", desc: "NOCTIS.js.FaitNaitreLOrdreDuChaos" },
  { name: "NOCTIS.js.ArchEnfant", desc: "NOCTIS.js.ImmatureChercheUnGuide" },
  { name: "NOCTIS.js.ArchEnigme", desc: "NOCTIS.js.SesMotifsRestentImpenetrables" },
  { name: "NOCTIS.js.ArchFanatique", desc: "NOCTIS.js.DevoreParSaCause" },
  { name: "NOCTIS.js.ArchGourou", desc: "NOCTIS.js.InspireSpirituellementLesAutres" },
  { name: "NOCTIS.js.ArchGrandGuignol", desc: "NOCTIS.js.AimeChoquerEtDegouter" },
  { name: "NOCTIS.js.ArchIdealiste", desc: "NOCTIS.js.PoursuitUnePerfectionQuIlSait" },
  { name: "NOCTIS.js.ArchIndividualiste", desc: "NOCTIS.js.NePenseQuALuiMeme" },
  { name: "NOCTIS.js.ArchJuge", desc: "NOCTIS.js.PeseLesPreuvesPourTrouverLa" },
  { name: "NOCTIS.js.ArchMartyr", desc: "NOCTIS.js.SaSouffranceSauveraLesAutres" },
  { name: "NOCTIS.js.ArchMasochiste", desc: "NOCTIS.js.RechercheLaDouleur" },
  { name: "NOCTIS.js.ArchMercenaire", desc: "NOCTIS.js.ToutSAcheteLuiCompris" },
  { name: "NOCTIS.js.ArchMonstre", desc: "NOCTIS.js.EmbrasseSaNatureDeCauchemar" },
  { name: "NOCTIS.js.ArchIlDuCyclone", desc: "NOCTIS.js.ResteCalmeAuCurDuChaos" },
  { name: "NOCTIS.js.ArchOpportuniste", desc: "NOCTIS.js.TourneToutASonAvantage" },
  { name: "NOCTIS.js.ArchPedagogue", desc: "NOCTIS.js.TransmetSonSavoir" },
  { name: "NOCTIS.js.ArchPenitent", desc: "NOCTIS.js.DoitExpierJamaisAssezBon" },
  { name: "NOCTIS.js.ArchPerfectionniste", desc: "NOCTIS.js.ExigeLExcellenceDeLuiD" },
  { name: "NOCTIS.js.ArchPhilosophe", desc: "NOCTIS.js.ChercheLeSensDeTouteChose" },
  { name: "NOCTIS.js.ArchRaleur", desc: "NOCTIS.js.TrouveDesDefautsATout" },
  { name: "NOCTIS.js.ArchRebelle", desc: "NOCTIS.js.LeSystemeEstUnePrisonIl" },
  { name: "NOCTIS.js.ArchSadique", desc: "NOCTIS.js.PrendPlaisirAFaireSouffrir" },
  { name: "NOCTIS.js.ArchSeducteur", desc: "NOCTIS.js.VeutEtreLeCentreDeToutes" },
  { name: "NOCTIS.js.ArchSoldat", desc: "NOCTIS.js.SuitUnCodeEtLesOrdres" },
  { name: "NOCTIS.js.ArchSolitaire", desc: "NOCTIS.js.NABesoinDePersonne" },
  { name: "NOCTIS.js.ArchSurvivant", desc: "NOCTIS.js.RienNeLArretera" },
  { name: "NOCTIS.js.ArchTraditionaliste", desc: "NOCTIS.js.CeQuiAFaitSesPreuves" },
  { name: "NOCTIS.js.ArchVisionnaire", desc: "NOCTIS.js.VoitTousLesPossibles" }
];

const CONCEPTS = ["NOCTIS.js.ArtisteTroubadourMusicienActeur", "NOCTIS.js.ClercMoineMonialePretreImam", "NOCTIS.js.CriminelVoleurReceleurBrigand", "NOCTIS.js.EnfantOrphelinEnfantSoldat",
  "NOCTIS.js.IntellectuelPhilosopheLettre", "NOCTIS.js.InvestigateurSherifInquisiteur", "NOCTIS.js.MarginalEtrangerLepreuxHeretique", "NOCTIS.js.PoliticienNobleJugeConseiller",
  "NOCTIS.js.ProfessionnelMaconMedecinForgeron", "NOCTIS.js.SoldatMercenaireCroiseSentinelle", "NOCTIS.js.TravailleurFermierMineurMarin", "NOCTIS.js.VagabondPelerinCaravanier"];

const STEPS = [
  { id: 0, label: "NOCTIS.js.Mode", icon: "fa-solid fa-signs-post" },
  { id: 1, label: "NOCTIS.js.Concept", icon: "fa-solid fa-feather" },
  { id: 2, label: "NOCTIS.js.Attributs", icon: "fa-solid fa-hand-fist" },
  { id: 3, label: "NOCTIS.js.Capacites", icon: "fa-solid fa-book-open" },
  { id: 4, label: "NOCTIS.js.Avantages", icon: "fa-solid fa-droplet" },
  { id: 5, label: "NOCTIS.js.TouchesFinales", icon: "fa-solid fa-scale-balanced" },
  { id: 6, label: "NOCTIS.js.AtoutsEtHandicaps", icon: "fa-solid fa-scale-unbalanced" },
  { id: 7, label: "NOCTIS.js.PointsDeBonus", icon: "fa-solid fa-star" },
  { id: 8, label: "NOCTIS.js.Resume", icon: "fa-solid fa-scroll" }
];

const GROUP_LABEL = { primary: "NOCTIS.js.Primaire", secondary: "NOCTIS.js.Secondaire", tertiary: "NOCTIS.js.Tertiaire" };

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
    if (!this.actor) throw new Error(loc("NOCTIS.js.NoctisLeCreateurDePersonnageA"));
    let saved = null;
    try { saved = this.actor.getFlag("noctis", "creator"); } catch (err) { console.warn(loc("NOCTIS.js.NoctisBrouillonIllisible"), err); }
    this.cs = foundry.utils.mergeObject(emptyState(), saved ?? {}, { inplace: false });
    if (!this.cs.name) this.cs.name = this.actor.name;
    if (!this.cs.player) this.cs.player = this.actor.system.identity?.player ?? "";
    this._cache = null;
  }

  static DEFAULT_OPTIONS = {
    tag: "div",
    classes: ["noctis", "noctis-window", "noctis-creator"],
    window: { title: loc("NOCTIS.js.CreateurDePersonnage"), icon: "fa-solid fa-wand-magic-sparkles", resizable: true },
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

  get title() { return loc("NOCTIS.js.CreateurDePersonnage2", { p0: this.actor?.name ?? "" }); }

  /** Ouvre (ou ramène au premier plan) le créateur d'un acteur, en affichant toute erreur. */
  static async open(actor) {
    try {
      const existing = foundry.applications.instances?.get?.(`noctis-creator-${actor.id}`);
      if (existing) return existing.render({ force: true });
      const app = new this({ actor });
      await app.render({ force: true });
      return app;
    } catch (err) {
      console.error(loc("NOCTIS.js.NoctisImpossibleDOuvrirLeCreateur"), err);
      ui.notifications.error(loc("NOCTIS.js.NoctisLeCreateurNAPas", { message: err.message }));
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
      { key: "courage", label: loc("NOCTIS.js.Courage") }
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
    if (!st.name) e(1, loc("NOCTIS.js.DonnezUnNomAuPersonnage"));
    if (!clan && this.actor.type === "vampire") e(1, loc("NOCTIS.js.ChoisissezUnClan"));
    if (!road) e(1, loc("NOCTIS.js.ChoisissezUneVoie"));
    if (!st.nature || !st.demeanor) e(1, loc("NOCTIS.js.ChoisissezUneNatureEtUneAttitude"));
    const ranksA = Object.values(st.attrRank); if (new Set(ranksA.filter(Boolean)).size !== 3) e(2, loc("NOCTIS.js.ClassezLesTroisCategoriesDAttributs"));
    for (const g of attrGroups) if (g.points != null && g.spent !== g.points) e(2, loc("NOCTIS.js.PointsRepartis", { label: g.label, spent: g.spent, points: g.points }));
    for (const g of attrGroups) for (const t of g.traits) if (t.base + t.alloc > 5) e(2, loc("NOCTIS.js.NePeutPasDepasser5", { label: t.label }));
    const ranksB = Object.values(st.abilRank); if (new Set(ranksB.filter(Boolean)).size !== 3) e(3, loc("NOCTIS.js.ClassezLesTroisCategoriesDeCapacites"));
    for (const g of abilGroups) if (g.points != null && g.spent !== g.points) e(3, loc("NOCTIS.js.PointsRepartis", { label: g.label, spent: g.spent, points: g.points }));
    for (const g of abilGroups) for (const t of g.traits) if (t.alloc > NOCTIS.creation.abilityMax) e(3, loc("NOCTIS.js.3MaximumAvantLesPointsDe", { label: t.label }));
    if (discSpent !== NOCTIS.creation.disciplines) e(4, loc("NOCTIS.js.DisciplinesPoints", { discSpent, disciplines: NOCTIS.creation.disciplines }));
    if (bgSpent !== NOCTIS.creation.backgrounds) e(4, loc("NOCTIS.js.HistoriquesPoints", { bgSpent, backgrounds: NOCTIS.creation.backgrounds }));
    if (virtSpent !== NOCTIS.creation.virtues) e(4, loc("NOCTIS.js.VertusPoints", { virtSpent, virtues: NOCTIS.creation.virtues }));
    for (const v of virtues) if (1 + v.alloc > 5) e(4, loc("NOCTIS.js.NePeutPasDepasser5", { label: v.label }));
    if (bonusLeft < 0) e(7, loc("NOCTIS.js.PointsDeBonusDepassesDe", { p0: -bonusLeft }));
    const flawRaw = flawRawSum;
    if (flawRaw > NOCTIS.creation.maxFlaws) e(6, loc("NOCTIS.js.LesHandicapsNeRapportentQuePoints", { maxFlaws: NOCTIS.creation.maxFlaws, flawRaw }));

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
      { title: loc("NOCTIS.js.Attributs"), rule: loc("NOCTIS.js.753Points1Point"), rows: groups(c.attrGroups) },
      { title: loc("NOCTIS.js.Capacites"), rule: loc("NOCTIS.js.1395Points3Au"), rows: groups(c.abilGroups) },
      { title: loc("NOCTIS.js.Avantages"), rule: loc("NOCTIS.js.4EnDisciplines5EnHistoriques"), rows: [
        { label: loc("NOCTIS.js.Disciplines"), points: `${c.discSpent} / ${NOCTIS.creation.disciplines}`, detail: list(c.disciplines) },
        { label: loc("NOCTIS.js.Historiques"), points: `${c.bgSpent} / ${NOCTIS.creation.backgrounds}`, detail: list(c.backgrounds) },
        { label: loc("NOCTIS.js.Vertus"), points: `${c.virtSpent} / ${NOCTIS.creation.virtues}`, detail: list(c.virtues) }
      ] }
    ];
    const bonus = [];
    const add = (traits, unit, kind) => { for (const t of traits) if (t.bonus > 0) bonus.push({ label: t.label, kind, detail: `+${t.bonus} × ${unit}`, cost: t.bonus * unit }); };
    add(c.attrGroups.flatMap(g => g.traits), C.attribute, loc("NOCTIS.js.Attribut"));
    add(c.abilGroups.flatMap(g => g.traits), C.ability, loc("NOCTIS.js.Capacite"));
    add(c.disciplines, C.discipline, loc("NOCTIS.js.Discipline"));
    add(c.backgrounds, C.background, loc("NOCTIS.js.Historique"));
    add(c.virtues, C.virtue, loc("NOCTIS.js.Vertu"));
    if (st.bonus.road > 0) bonus.push({ label: loc("NOCTIS.js.Voie"), kind: loc("NOCTIS.js.Voie"), detail: `+${st.bonus.road} × ${C.road}`, cost: st.bonus.road * C.road });
    if (st.bonus.willpower > 0) bonus.push({ label: loc("NOCTIS.js.Volonte"), kind: loc("NOCTIS.js.Volonte"), detail: `+${st.bonus.willpower} × ${C.willpower}`, cost: st.bonus.willpower * C.willpower });
    const lv = (m) => Number(st.mf?.[m._id]) || m.system.cost || 0;
    for (const id of st.merits) { const m = cache.merits.find(x => x._id === id); if (m) bonus.push({ label: m.name, kind: loc("NOCTIS.js.Atout"), detail: m.system.levels?.length ? `niveau ${lv(m)}` : "", cost: lv(m) }); }
    for (const id of st.flaws) { const m = cache.flaws.find(x => x._id === id); if (m) bonus.push({ label: m.name, kind: loc("NOCTIS.js.Handicap"), detail: m.system.levels?.length ? `niveau ${lv(m)}` : "", cost: -lv(m) }); }
    return {
      mode: st.mode === "free" ? "libre" : loc("NOCTIS.js.Guide"),
      date: new Date().toLocaleDateString("fr-FR"),
      clan: c.clan?.name ?? "", road: c.road?.name ?? "",
      sections, bonus,
      bonusTotal: c.bonusTotal, bonusSpent: c.bonusSpent + c.meritCost, bonusLeft: c.bonusLeft, flawGain: c.flawGain,
      derived: [
        { label: loc("NOCTIS.js.Generation"), value: NOCTIS.generationNames[c.generation] ?? c.generation },
        { label: loc("NOCTIS.js.Voie"), value: c.roadValue }, { label: loc("NOCTIS.js.Volonte"), value: c.willValue },
        { label: loc("NOCTIS.js.SangDeDepart"), value: c.bloodStart ?? "—" }
      ]
    };
  }

  /* -------------------------------------------- */

  async _prepareContext() {
    const cache = await this.#loadCompendia();
    const st = this.cs;
    const c = this.#compute(cache);
    const steps = STEPS.map(s => ({ ...s, active: s.id === st.step, done: s.id < st.step, error: !!c.errors[s.id]?.length && s.id < st.step }));
    const rankChoices = { "": "—", primary: loc("NOCTIS.js.Primaire"), secondary: loc("NOCTIS.js.Secondaire"), tertiary: loc("NOCTIS.js.Tertiaire") };
    const strip = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const mfRow = (m, list, kind) => {
      const checked = list.includes(m._id);
      const level = Number(st.mf?.[m._id]) || m.system.cost;
      const levels = (m.system.levels ?? []).map(l => ({ value: l.value, text: l.text, active: checked && l.value === level }));
      const desc = strip(m.system.description).replace(/(Coût :|Cost:).*$/, "").trim();
      return { id: m._id, kind, name: m.name, cost: m.system.cost, costText: m.system.costText, checked, level, levels, multi: levels.length > 1,
        levelText: checked ? (levels.find(l => l.value === level)?.text ?? "") : "", desc, short: desc.length > 180 ? desc.slice(0, 180).replace(/\s\S*$/, "") + "…" : desc };
    };
    const MF_CATS = [["physical", "💪", loc("NOCTIS.js.Physiques")], ["mental", "🧠", loc("NOCTIS.js.Mentaux")], ["social", "👄", loc("NOCTIS.js.Sociaux")], ["supernatural", "⛤", loc("NOCTIS.js.Surnaturels")]];
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
      archetypes: ARCHETYPES.map(a => ({ name: a.name, desc: a.desc })),
      natureDesc: ARCHETYPES.find(a => a.name === st.nature)?.desc ?? "", demeanorDesc: ARCHETYPES.find(a => a.name === st.demeanor)?.desc ?? "",
      concepts: CONCEPTS, rankChoices,
      mfSections, chosenMF, hasChosenMF: chosenMF.length > 0,
      stepErrors: c.errors[st.step] ?? [],
      allErrors: Object.entries(c.errors).flatMap(([s, list]) => list.map(m => `${STEPS[s].label} : ${m}`)),
      isFirst: st.step === 0, isLast: st.step === 8,
      bonusCosts: NOCTIS.bonusCosts,
      roadTip: traitTooltip("road", "", loc("NOCTIS.js.Voie"), loc("NOCTIS.js.DepartConscienceConvictionMaitriseDeSoi")),
      willTip: traitTooltip("willpower", "", loc("NOCTIS.js.Volonte"), loc("NOCTIS.js.DepartEgaleAuCourageBonus1")),
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
      for (let i = 1; i < s; i++) if (c.errors[i]?.length) return ui.notifications.warn(loc("NOCTIS.js.EtapeIncomplete", { p0: STEPS[i].label, p1: c.errors[i][0] }));
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
    if (!target.dataset.level && event.target.closest(`details, .mf-levels`)) return;
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
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: loc("NOCTIS.js.ReserveDeSangDeDepart1d10") });
    this.cs.bloodRoll = roll.total;
    await this.#save();
    this.render();
  }

  static async #onReset() {
    const ok = await DialogV2.confirm({ window: { title: loc("NOCTIS.js.Recommencer") }, content: loc("NOCTIS.js.EffacerToutesLesEtapesDuCreateur"), rejectClose: false });
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
    if (this.guided && all.length) return ui.notifications.warn(loc("NOCTIS.js.CreationIncomplete", { p0: all[0] }));
    const st = this.cs;
    const actor = this.actor;
    const ok = await DialogV2.confirm({ window: { title: loc("NOCTIS.js.CreerLePersonnage") }, content: loc("NOCTIS.js.AppliquerLaCreationALesTraits", { name: st.name }), rejectClose: false });
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
        if (t) o.system.description = loc("NOCTIS.js.Niveau", { lv, t }) + o.system.description;
      }
      return o;
    };
    for (const id of st.merits) { const m = cache.merits.find(x => x._id === id); if (m) toCreate.push(withLevel(await fromUuid_(m.uuid), id)); }
    for (const id of st.flaws) { const m = cache.flaws.find(x => x._id === id); if (m) toCreate.push(withLevel(await fromUuid_(m.uuid), id)); }
    await actor.createEmbeddedDocuments("Item", toCreate.filter(Boolean));
    await actor.addXpEntry({ kind: "gain", amount: 0, label: loc("NOCTIS.js.CreationDuPersonnage", { p0: st.mode === "free" ? loc("NOCTIS.js.ModeLibre") : loc("NOCTIS.js.ModeGuide") }), category: "", note: loc("NOCTIS.js.PointsDeBonus2", { p0: c.bonusSpent + c.meritCost, bonusTotal: c.bonusTotal }) });
    ui.notifications.info(loc("NOCTIS.js.EstPretLaFicheEstVerrouillee", { name: st.name }));
    this.close();
    actor.sheet.render({ force: true });
  }
}

registerLocalizable(ARCHETYPES, CONCEPTS, GROUP_LABEL, STEPS, TIP_COST);
