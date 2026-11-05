import { NOCTIS } from "../config.mjs";
import { RollDialog } from "../dice/roll-dialog.mjs";
import { rollPool } from "../dice/roll.mjs";
import { manualDamageDialog } from "../chat.mjs";
import { playerCharacters, xpBreakdown } from "../apps/xp-ledger.mjs";
import { findDiscipline, disciplineKey } from "../registry.mjs";
import { variantList } from "../variants.mjs";
import { STATUSES, hasStatus, setStatus, hungerThreshold } from "../status.mjs";
import { provocationDialog, lucidTurn, endCrisis } from "../beast.mjs";
import { ATTRIBUTE_HELP, ABILITY_HELP, BACKGROUND_HELP, VIRTUE_HELP } from "../trait-help.mjs";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TABS = [
  { id: "traits", label: "Traits", icon: "fa-solid fa-user" },
  { id: "disciplines", label: "Disciplines", icon: "fa-solid fa-droplet" },
  { id: "combat", label: "Combat", icon: "fa-solid fa-khanda" },
  { id: "advantages", label: "Avantages", icon: "fa-solid fa-crown" },
  { id: "experience", label: "Expérience", icon: "fa-solid fa-scroll" },
  { id: "relations", label: "Relations", icon: "fa-solid fa-people-group" },
  { id: "domain", label: "Domaine", icon: "fa-solid fa-chess-rook" },
  { id: "biography", label: "Chronique", icon: "fa-solid fa-feather" }
];

export class NOCTISActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  constructor(options = {}) {
    super(options);
    this._activeTab = "traits";
    this._unlocked = null;
    this._sel = null;
  }

  static DEFAULT_OPTIONS = {
    classes: ["noctis", "noctis-window", "sheet", "actor", "kcd"],
    position: { width: 1180, height: 900 },
    window: { resizable: true, icon: "fa-solid fa-droplet" },
    form: { submitOnChange: true },
    actions: {
      switchTab: NOCTISActorSheet.#onSwitchTab,
      select: NOCTISActorSheet.#onSelect,
      setDots: NOCTISActorSheet.#onSetDots,
      setSquares: NOCTISActorSheet.#onSetSquares,
      toggleLock: NOCTISActorSheet.#onToggleLock,
      rollTrait: NOCTISActorSheet.#onRollTrait,
      rollPower: NOCTISActorSheet.#onRollPower,
      rollVirtue: NOCTISActorSheet.#onRollVirtue,
      rollAttack: NOCTISActorSheet.#onRollAttack,
      rollSoak: NOCTISActorSheet.#onRollSoak,
      rollInitiative: NOCTISActorSheet.#onRollInitiative,
      rollFree: NOCTISActorSheet.#onRollFree,
      itemEdit: NOCTISActorSheet.#onItemEdit,
      itemDelete: NOCTISActorSheet.#onItemDelete,
      itemCreate: NOCTISActorSheet.#onItemCreate,
      itemToggle: NOCTISActorSheet.#onItemToggle,
      itemChat: NOCTISActorSheet.#onItemChat,
      togglePower: NOCTISActorSheet.#onTogglePower,
      healthClick: NOCTISActorSheet.#onHealthClick,
      healthClear: NOCTISActorSheet.#onHealthClear,
      takeDamage: NOCTISActorSheet.#onTakeDamage,
      bloodHeal: NOCTISActorSheet.#onBloodHeal,
      bloodHealAgg: NOCTISActorSheet.#onBloodHealAgg,
      bloodBoost: NOCTISActorSheet.#onBloodBoost,
      endScene: NOCTISActorSheet.#onEndScene,
      nightfall: NOCTISActorSheet.#onNightfall,
      xpAdd: NOCTISActorSheet.#onXpAdd,
      xpSpend: NOCTISActorSheet.#onXpSpend,
      xpToggleFree: NOCTISActorSheet.#onXpToggleFree,
      xpDelete: NOCTISActorSheet.#onXpDelete,
      finishCreation: NOCTISActorSheet.#onFinishCreation,
      openCreator: NOCTISActorSheet.#onOpenCreator,
      pickImage: NOCTISActorSheet.#onPickImage,
      relAdd: NOCTISActorSheet.#onRelAdd,
      relDelete: NOCTISActorSheet.#onRelDelete,
      relOpen: NOCTISActorSheet.#onRelOpen,
      hunt: NOCTISActorSheet.#onHunt,
      togglePC: NOCTISActorSheet.#onTogglePC,
      celerity: NOCTISActorSheet.#onCelerity,
      resetActions: NOCTISActorSheet.#onResetActions,
      rollUnarmed: NOCTISActorSheet.#onRollUnarmed,
      openRuleSettings: NOCTISActorSheet.#onOpenRuleSettings,
      toggleStatus: NOCTISActorSheet.#onToggleStatus,
      beastTest: NOCTISActorSheet.#onBeastTest,
      beastLucid: NOCTISActorSheet.#onBeastLucid,
      beastEnd: NOCTISActorSheet.#onBeastEnd
    }
  };

  static PARTS = {
    header: { template: "systems/noctis/templates/actor/header.hbs" },
    tabs: { template: "systems/noctis/templates/actor/tabs.hbs" },
    context: { template: "systems/noctis/templates/actor/context.hbs", scrollable: [".ctx-body"] },
    traits: { template: "systems/noctis/templates/actor/tab-traits.hbs", scrollable: [""] },
    disciplines: { template: "systems/noctis/templates/actor/tab-disciplines.hbs", scrollable: [""] },
    advantages: { template: "systems/noctis/templates/actor/tab-advantages.hbs", scrollable: [""] },
    relations: { template: "systems/noctis/templates/actor/tab-relations.hbs", scrollable: [""] },
    domain: { template: "systems/noctis/templates/actor/tab-domain.hbs", scrollable: [""] },
    combat: { template: "systems/noctis/templates/actor/tab-combat.hbs", scrollable: [""] },
    experience: { template: "systems/noctis/templates/actor/tab-experience.hbs", scrollable: [""] },
    biography: { template: "systems/noctis/templates/actor/tab-biography.hbs", scrollable: [""] },
    variants: { template: "systems/noctis/templates/actor/tab-variants.hbs", scrollable: [""] }
  };

  /** Titre de la fenêtre : « Personnage joueur : Nom / Joueur ». */
  get title() {
    const a = this.actor;
    const kinds = { vampire: a.hasPlayerOwner ? "Personnage joueur" : "Vampire", ghoul: "Goule", mortal: "Mortel", npc: "Personnage non joueur" };
    const player = a.system.identity?.player;
    return `${kinds[a.type] ?? a.type} : ${a.name}${player ? ` / ${player}` : ""}`;
  }

  /** Fiche verrouillée = les points se paient en XP. */
  get locked() {
    if (this._unlocked !== null) return !this._unlocked;
    return !!this.actor.system.creation.done;
  }

  /* -------------------------------------------- */
  /*  Contexte                                     */
  /* -------------------------------------------- */

  /** Récapitulatif de création : enregistré à la fin du créateur, ou recalculé depuis le brouillon. */
  async #creationLog() {
    const saved = this.actor.getFlag("noctis", "creationLog");
    if (saved) return saved;
    if (!this.actor.system.creation?.done || !this.actor.getFlag("noctis", "creator")) return null;
    try {
      const cls = game.noctis?.CharacterCreator;
      const log = cls ? await new cls({ actor: this.actor }).creationLog() : null;
      // On l'enregistre une fois pour qu'il ne dépende plus du brouillon ni des compendiums.
      if (log && this.actor.isOwner && log.clan) this.actor.setFlag("noctis", "creationLog", log);
      return log;
    } catch (err) { console.warn("NOCTIS | récapitulatif de création", err); return null; }
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const actor = this.actor;
    const s = actor.system;
    const max = Math.max(5, s.maxTrait ?? 5);
    const type = actor.type;

    const traitRow = (group, key, label, t, extra = {}) => ({
      key, label, value: t.value, total: t.total ?? t.value, mod: t.mod ?? 0, spec: t.spec,
      path: `system.${group}.${key}.value`, specPath: `system.${group}.${key}.spec`, max, ...extra
    });

    const attributeGroups = Object.entries(NOCTIS.attributeGroups).map(([gk, g]) => ({
      key: gk, label: g.label,
      traits: g.keys.map(k => traitRow("attributes", k, NOCTIS.attributes[k], s.attributes[k], { ref: `attr.${k}`, locked: s.attributes[k].locked, boost: s.attributes[k].boost }))
    }));

    const secondary = actor.items.filter(i => i.type === "ability");
    const abilityGroups = Object.entries(NOCTIS.abilityGroups).map(([gk, g]) => ({
      key: gk, label: g.label,
      traits: g.keys.map(k => traitRow("abilities", k, NOCTIS.abilities[k], s.abilities[k], { ref: `abil.${k}` })).sort((a, b) => a.label.localeCompare(b.label, "fr")),
      secondary: secondary.filter(i => (i.system.group || "knowledges") === gk).map(i => ({ id: i.id, label: i.name, value: i.system.value, spec: i.system.spec, path: `item.${i.id}`, ref: `item.${i.id}`, max }))
    }));

    const backgrounds = Object.entries(NOCTIS.backgrounds).map(([k, label]) => ({ key: k, label, value: s.backgrounds[k].value, path: `system.backgrounds.${k}.value`, notesPath: `system.backgrounds.${k}.notes`, notes: s.backgrounds[k].notes, max: 5 }));

    const virtues = [
      { key: "conscience", label: s.virtues.conscience.label, value: s.virtues.conscience.value, path: "system.virtues.conscience.value", typePath: "system.virtues.conscience.type", type: s.virtues.conscience.type, choices: { conscience: "Conscience", conviction: "Conviction" } },
      { key: "selfcontrol", label: s.virtues.selfcontrol.label, value: s.virtues.selfcontrol.value, path: "system.virtues.selfcontrol.value", typePath: "system.virtues.selfcontrol.type", type: s.virtues.selfcontrol.type, choices: { selfcontrol: "Maîtrise de soi", instinct: "Instinct" } },
      { key: "courage", label: "Courage", value: s.virtues.courage.value, path: "system.virtues.courage.value" }
    ];

    // Disciplines et pouvoirs
    const disciplines = actor.items.filter(i => i.type === "discipline").sort((a, b) => (b.system.isClan - a.system.isClan) || a.name.localeCompare(b.name, "fr")).map(i => {
      const v = i.system.value;
      return {
        id: i.id, name: i.name, img: i.img, value: v, max: Math.max(5, v, max), isClan: i.system.isClan, isPath: i.system.isPath,
        parentLabel: i.system.isPath ? (NOCTIS.disciplines[i.system.parent] ?? i.system.parent) : "",
        path: `item.${i.id}`,
        expanded: !this._collapsed?.has(i.id),
        powers: i.system.powers.map((p, idx) => ({
          ...p, idx, unlocked: p.level <= v, advanced: p.level > 5,
          dotsLabel: "•".repeat(Math.min(p.level, 5)) + (p.level > 5 ? " " + "•".repeat(p.level - 5) : ""),
          rollable: !!(p.attribute || p.ability),
          poolLabel: [NOCTIS.attributes[p.attribute], NOCTIS.abilities[p.ability] ?? (p.ability === "willpower" ? "Volonté" : p.ability)].filter(Boolean).join(" + ")
        })).filter(p => p.level <= Math.max(5, v))
      };
    });

    const byType = (t) => actor.items.filter(i => i.type === t).sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name, "fr"));
    const merits = byType("merit"), flaws = byType("flaw");
    const weapons = byType("weapon").map(w => {
      const str = w.system.damageAttribute ? s.attributes[w.system.damageAttribute]?.total ?? 0 : 0;
      const attackPool = (s.attributes[w.system.attribute]?.total ?? 0) + (s.abilities[w.system.ability]?.total ?? 0);
      return { item: w, id: w.id, name: w.name, img: w.img, sys: w.system, attackPool, damagePool: str + w.system.damageBonus,
        abilityLabel: NOCTIS.abilities[w.system.ability] ?? w.system.ability,
        damageLabel: `${w.system.damageAttribute ? "For" : ""}${w.system.damageAttribute && w.system.damageBonus ? " + " : ""}${w.system.damageBonus || (!w.system.damageAttribute ? "0" : "")}`,
        damageType: NOCTIS.damageTypes[w.system.damageType]?.short };
    });

    const xpLog = [...s.experience.log].reverse().map(e => ({ ...e, categoryLabel: NOCTIS.xpCategories[e.category] ?? "", sign: e.kind === "gain" ? "+" : "−" }));

    const enrich = (html) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", { secrets: actor.isOwner, relativeTo: actor });

    const bloodSquares = [];
    for (let i = 1; i <= (s.blood.max ?? 10); i++) bloodSquares.push({ n: i, filled: i <= s.blood.value });
    const wpSquares = [];
    for (let i = 1; i <= 10; i++) wpSquares.push({ n: i, filled: i <= s.willpower.temporary, available: i <= s.willpower.max });

    const clan = actor.clanItem;
    const road = actor.roadItem;

    Object.assign(ctx, {
      actor, system: s, type, config: NOCTIS,
      isVampire: s.isVampire, usesBlood: s.usesBlood, isGhoul: type === "ghoul", isMortal: type === "mortal", isNpc: type === "npc",
      editable: this.isEditable, owner: actor.isOwner, isGM: game.user.isGM,
      locked: this.locked, creationDone: s.creation.done, isPC: !!actor.getFlag("noctis", "isPC"), inCombat: actor.inActiveCombat,
      tabs: TABS.map(t => ({ ...t, active: t.id === this._activeTab, cssClass: t.id === this._activeTab ? "active" : "" })),
      activeTab: this._activeTab,
      variantsTab: { id: "variants", label: "Variantes", icon: "fa-solid fa-gear", cssClass: this._activeTab === "variants" ? "active" : "" },
      variants: variantList(),
      statusChoices: STATUSES.filter(st => st.id !== "dead" || hasStatus(actor, "dead")).map(st => ({ ...st, active: hasStatus(actor, st.id) })),
      beastActive: hasStatus(actor, "frenzy") ? "Frénésie" : (hasStatus(actor, "panic") ? "Panique" : ""),
      hungry: s.isVampire && s.blood.value <= hungerThreshold(),
      attributeGroups, abilityGroups, backgrounds, virtues, disciplines,
      hasDisciplines: disciplines.length > 0,
      merits, flaws,
      meritTotal: merits.reduce((a, i) => a + (i.system.cost || 0), 0),
      flawTotal: flaws.reduce((a, i) => a + (i.system.cost || 0), 0),
      derangements: byType("derangement"),
      rituals: byType("ritual"),
      weapons, armors: byType("armor"), gear: byType("gear"),
      xpLog, xpCategories: NOCTIS.xpCategories,
      xpSegments: xpBreakdown(actor),
      creationLog: await this.#creationLog(),
      bloodSquares, wpSquares,
      clan, road, clanEmblem: clan?.system.emblem || "",
      clanWeakness: clan?.system.weakness ?? "",
      generationOptions: Array.from({ length: 11 }, (_, i) => i + 3),
      archetypes: NOCTIS.archetypes,
      npcKinds: { vampire: "Vampire", ghoul: "Goule", mortal: "Mortel", creature: "Créature" },
      enrichedBio: await enrich(s.biography),
      enrichedNotes: await enrich(s.notes),
      bloodFlags: { perTurn: s.blood.perTurn },
      ...this.#relationsContext(),
      dom: this.#domainContext(),
      boostList: NOCTIS.physicalAttributes.map(k => ({ key: k, label: NOCTIS.attributes[k], boost: s.boosts[k] }))
    });
    return ctx;
  }

  async _preparePartContext(partId, context, options) {
    const ctx = await super._preparePartContext(partId, context, options);
    ctx.tab = { id: partId, active: partId === this._activeTab, cssClass: partId === this._activeTab ? "active" : "" };
    if (partId === "context") ctx.sel = await this.#selectionContext(ctx);
    return ctx;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const el = this.element;
    el.classList.toggle("locked", this.locked);
    el.classList.add(`type-${this.actor.type}`);
    this.#markSelected();
    // Double-clic : lancer directement le trait ou le pouvoir.
    el.querySelectorAll("[data-roll]").forEach(a => {
      if (a.dataset.dblBound) return;
      a.dataset.dblBound = "1";
      a.addEventListener("dblclick", ev => {
        ev.preventDefault();
        if (a.dataset.roll === "trait") NOCTISActorSheet.#onRollTrait.call(this, ev, a);
        else if (a.dataset.roll === "power") NOCTISActorSheet.#onRollPower.call(this, ev, a);
      });
    });
    // Clic droit sur une case de santé : soigne un niveau.
    el.querySelectorAll("[data-health-index]").forEach(box => box.addEventListener("contextmenu", ev => {
      ev.preventDefault();
      NOCTISActorSheet.#healLast(this.actor);
    }));
    // Champs des relations et opinions (tableaux)
    el.querySelectorAll("[data-array]").forEach(input => input.addEventListener("change", ev => {
      ev.stopPropagation();
      const { array, index, key, field } = input.dataset;
      let value = input.value;
      if (["influence", "trust", "bondTo", "bondFrom"].includes(field)) value = Number(value) || 0;
      return this.#updateArray(array, arr => {
        if (array === "opinions") {
          let o = arr.find(x => x.actorId === key);
          if (!o) { o = { actorId: key, trust: 0, text: "", bondTo: 0, bondFrom: 0 }; arr.push(o); }
          o[field] = value;
        } else if (arr[Number(index)]) arr[Number(index)][field] = value;
      });
    }));
    // Champs d'objets intégrés (valeur, spécialité) éditables depuis la fiche
    el.querySelectorAll("[data-item-field]").forEach(input => input.addEventListener("change", async ev => {
      ev.stopPropagation();
      const id = input.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(id);
      if (!item) return;
      let value = input.type === "checkbox" ? input.checked : input.value;
      if (input.type === "number") value = Number(value) || 0;
      await item.update({ [input.dataset.itemField]: value });
    }));
  }

  /* -------------------------------------------- */
  /*  Relations et domaine                         */
  /* -------------------------------------------- */

  #relationsContext() {
    const actor = this.actor, s = actor.system;
    const kinds = NOCTIS.relationKinds;
    const relations = (s.relations ?? []).map((r, index) => ({ ...r, index, img: r.img || `systems/noctis/assets/icons/${r.kind === "herd" ? "gear" : "merit"}.svg` }));
    // Quotas d'après les historiques
    const herdCount = [0, 3, 7, 15, 30, 60];
    const quotas = [
      { kind: "ally", label: "Alliés", bg: "allies", allowed: v => v },
      { kind: "contact", label: "Contacts majeurs", bg: "contacts", allowed: v => v },
      { kind: "mentor", label: "Mentor", bg: "mentor", allowed: v => (v > 0 ? 1 : 0) },
      { kind: "retainer", label: "Servants", bg: "retainers", allowed: v => v },
      { kind: "herd", label: "Calices", bg: "herd", allowed: v => herdCount[Math.min(5, v)] ?? v }
    ];
    const relQuota = quotas.map(q => {
      const v = s.backgrounds[q.bg]?.value ?? 0;
      const count = relations.filter(r => r.kind === q.kind).length;
      const allowed = q.allowed(v);
      return { label: q.label, icon: kinds[q.kind].icon, count, allowed, over: count > allowed, full: allowed > 0 && count === allowed,
        tip: `${NOCTIS.backgrounds[q.bg]} ${v} : ${allowed} ${q.label.toLowerCase()} selon les règles` };
    }).filter(q => q.allowed > 0 || q.count > 0);
    // Autres personnages joueurs
    const others = playerCharacters().list.filter(a => a.id !== actor.id);
    const opMap = new Map((s.opinions ?? []).map(o => [o.actorId, o]));
    const opinions = others.map(a => {
      const o = opMap.get(a.id) ?? { trust: 0, text: "", bondTo: 0, bondFrom: 0 };
      const owner = game.users.find(u => !u.isGM && a.testUserPermission(u, "OWNER"));
      return { actorId: a.id, name: a.name, img: a.img, subtitle: [a.system.identity?.clan, owner?.name].filter(Boolean).join(" · "),
        trust: o.trust, text: o.text, bondTo: o.bondTo ?? 0, bondFrom: o.bondFrom ?? 0, trustClass: ["enemy", "wary", "neutral", "trust", "loyal"][o.trust + 2] };
    });
    return {
      relations, relQuota, opinions,
      relKindChoices: Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, v.label])),
      relKindList: Object.entries(kinds).map(([key, v]) => ({ key, label: v.label })),
      attitudeChoices: NOCTIS.attitudes,
      influenceChoices: { 0: "Influence 0", 1: "Influence 1", 2: "Influence 2", 3: "Influence 3", 4: "Influence 4", 5: "Influence 5" },
      trustChoices: NOCTIS.trustLevels,
      bondChoices: { 0: "Aucun serment", 1: "1re gorgée", 2: "2e gorgée", 3: "3e gorgée : asservi" }
    };
  }

  #domainContext() {
    const s = this.actor.system, d = s.domain;
    const background = s.backgrounds.domain?.value ?? 0;
    const total = d.pooled ? Math.max(d.poolTotal, background) : background;
    const spent = (d.size || 0) + (d.security || 0);
    const help = BACKGROUND_HELP.domain;
    const zone = NOCTIS.huntingZones[d.zone] ?? NOCTIS.huntingZones.market;
    const fame = s.backgrounds.fame?.value ?? 0;
    return {
      background, total, spent, mismatch: spent !== total,
      levels: (help?.levels ?? []).map((l, i) => ({ dots: "●".repeat(i + 1), text: l.replace(/^•+\s*/, ""), current: i + 1 === Math.min(5, d.size || 0) })),
      zoneChoices: Object.fromEntries(Object.entries(NOCTIS.huntingZones).map(([k, z]) => [k, `${z.label} (${z.difficulty})`])),
      methodChoices: Object.fromEntries(Object.entries(NOCTIS.huntingMethods).map(([k, m]) => [k, `${m.label} — ${NOCTIS.attributes[m.attr]} + ${NOCTIS.abilities[m.abil]}`])),
      zoneDiff: zone.difficulty, fame, herd: s.backgrounds.herd?.value ?? 0,
      huntDiff: Math.max(3, zone.difficulty - (d.size || 0) - fame)
    };
  }

  async #updateArray(field, mutate) {
    const arr = foundry.utils.deepClone(this.actor.system[field] ?? []);
    mutate(arr);
    return this.actor.update({ [`system.${field}`]: arr });
  }

  static #onCelerity() {
    if (this.actor.celerityAvailable <= 0) return ui.notifications.warn("Vélocité indisponible (sang ou sang par tour insuffisant).");
    return game.noctis.promptCelerity([this.actor]);
  }

  static #onResetActions() { return this.actor.resetActions(); }

  static #onRollUnarmed() {
    return RollDialog.prompt(this.actor, { label: "Attaque — mains nues", trait1: "attr.dexterity", trait2: "abil.brawl", difficulty: 6, kind: "attack", tags: ["attack"] });
  }

  static #onTogglePC() {
    if (!game.user.isGM) return;
    const on = !this.actor.getFlag("noctis", "isPC");
    return on ? this.actor.setFlag("noctis", "isPC", true) : this.actor.unsetFlag("noctis", "isPC");
  }

  static #onRelAdd(event, target) {
    const kind = target.dataset.kind ?? "contact";
    return this.#updateArray("relations", arr => arr.push({ id: foundry.utils.randomID(), name: "", kind, attitude: kind === "rival" ? "hostile" : "friendly", influence: 1, place: "", notes: "", actorUuid: "", img: "" }));
  }

  static async #onRelDelete(event, target) {
    const i = Number(target.closest("[data-rel-index]").dataset.relIndex);
    const r = this.actor.system.relations[i];
    const ok = await DialogV2.confirm({ window: { title: "Supprimer le lien" }, content: `<p>Supprimer <b>${r?.name || "ce lien"}</b> ?</p>`, rejectClose: false });
    if (ok) return this.#updateArray("relations", arr => arr.splice(i, 1));
  }

  static async #onRelOpen(event, target) {
    const i = Number(target.closest("[data-rel-index]").dataset.relIndex);
    const uuid = this.actor.system.relations[i]?.actorUuid;
    const doc = uuid ? await fromUuid(uuid) : null;
    if (doc?.sheet) doc.sheet.render({ force: true });
    else ui.notifications.warn("La fiche liée est introuvable ou vous n'y avez pas accès.");
  }

  static #onHunt() {
    const s = this.actor.system;
    const dom = this.#domainContext();
    const methodKey = this.element.querySelector(".hunt-method")?.value ?? "seduce";
    const m = NOCTIS.huntingMethods[methodKey] ?? NOCTIS.huntingMethods.seduce;
    return RollDialog.prompt(this.actor, {
      label: `Chasse — ${NOCTIS.huntingZones[s.domain.zone]?.label ?? ""}`,
      trait1: `attr.${m.attr}`, trait2: `abil.${m.abil}`,
      difficulty: dom.huntDiff, bonusDice: dom.herd, tags: ["hunt"]
    });
  }

  /** Déposer un acteur sur la fiche : il devient une relation. */
  async _onDropActor(event, actor) {
    if (!(actor instanceof Actor)) actor = await Actor.implementation.fromDropData(actor);
    if (!this.actor.isOwner || !actor || actor.id === this.actor.id) return null;
    const kind = actor.type === "npc" ? "contact" : "other";
    await this.#updateArray("relations", arr => arr.push({ id: foundry.utils.randomID(), name: actor.name, kind, attitude: "neutral", influence: 1,
      place: actor.system?.identity?.clan ?? "", notes: "", actorUuid: actor.uuid, img: actor.img }));
    this._activeTab = "relations";
    ui.notifications.info(`${actor.name} ajouté à vos relations.`);
    return actor;
  }

  /* -------------------------------------------- */
  /*  Panneau contextuel (à droite)                */
  /* -------------------------------------------- */

  static #selKey(d) { return [d.kind, d.ref ?? "", d.key ?? "", d.itemId ?? "", d.idx ?? ""].join("|"); }

  static #onSelect(event, target) {
    const d = target.dataset;
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    this._sel = { kind: d.kind, ref: d.ref, key: d.key, itemId, idx: d.idx };
    this.render({ parts: ["context"] });
    this.#markSelected();
  }

  #markSelected() {
    const el = this.element;
    if (!el) return;
    el.querySelectorAll(".is-selected").forEach(e => e.classList.remove("is-selected"));
    if (!this._sel) return;
    const want = NOCTISActorSheet.#selKey(this._sel);
    for (const a of el.querySelectorAll('[data-action="select"]')) {
      const d = a.dataset;
      const key = NOCTISActorSheet.#selKey({ kind: d.kind, ref: d.ref, key: d.key, itemId: a.closest("[data-item-id]")?.dataset.itemId, idx: d.idx });
      if (key === want) (a.closest(".trait-row, .item-row, tr, li, .virtue, .discipline-card > header") ?? a).classList.add("is-selected");
    }
  }

  async #selectionContext(ctx) {
    const actor = this.actor, s = actor.system, sel = this._sel;
    const dots = (v, max = 5) => ({ dots: "●".repeat(Math.max(0, v)), dotsEmpty: "○".repeat(Math.max(0, Math.max(max, 5) - v)) });
    const enrich = (html) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", { secrets: actor.isOwner, relativeTo: actor });
    const levels = (help, v) => (help?.levels ?? []).map((l, i) => {
      const m = l.match(/^(•+)\s*([^.]+\.)?\s*(.*)$/) ?? [];
      const name = m[2] && m[2].length <= 28 ? m[2] : "";
      return { dots: "●".repeat(i + 1), name, text: name ? (m[3] ?? "") : `${m[2] ?? ""} ${m[3] ?? ""}`.trim() || l, current: i + 1 === v };
    });
    const raise = (path, v, max = 5) => {
      if (!this.isEditable || v >= Math.max(5, max)) return null;
      const cost = this.locked ? actor.describePurchase(path, v, v + 1).cost : null;
      return { path, value: v, dot: v + 1, cls: "primary", icon: "fa-solid fa-arrow-up", label: cost != null ? `Améliorer (${cost} XP)` : "Ajouter un point" };
    };
    if (!sel) return this.#defaultContext(ctx);

    switch (sel.kind) {
      case "trait": {
        const ref = sel.ref ?? "";
        if (ref.startsWith("attr.") || ref.startsWith("abil.")) {
          const isAttr = ref.startsWith("attr.");
          const k = ref.slice(5);
          const t = isAttr ? s.attributes[k] : s.abilities[k];
          if (!t) break;
          const help = (isAttr ? ATTRIBUTE_HELP : ABILITY_HELP)[k];
          const path = `system.${isAttr ? "attributes" : "abilities"}.${k}.value`;
          const group = Object.values(isAttr ? NOCTIS.attributeGroups : NOCTIS.abilityGroups).find(g => g.keys.includes(k));
          const facts = [];
          if (t.spec) facts.push({ label: "Spécialité", value: t.spec });
          if (help?.spec) facts.push({ label: "Spécialités possibles", value: help.spec });
          if (help?.poss) facts.push({ label: "Possédé par", value: help.poss });
          if (!isAttr) facts.push({ label: "Attribut proposé", value: NOCTIS.attributes[NOCTIS.abilityDefaultAttr[k]] ?? "—" });
          if (t.mod) facts.push({ label: "Modificateur", value: (t.mod > 0 ? "+" : "") + t.mod });
          return {
            title: isAttr ? NOCTIS.attributes[k] : NOCTIS.abilities[k], initial: (isAttr ? NOCTIS.attributes[k] : NOCTIS.abilities[k]).charAt(0),
            subtitle: `${isAttr ? "Attribut" : "Capacité"} · ${group?.label ?? ""}`, ...dots(t.value, s.maxTrait),
            desc: help?.desc ?? "", levels: levels(help, t.value), facts,
            buttons: [{ action: "rollTrait", ref, cls: "", icon: "fa-solid fa-dice-d10", label: "Lancer les dés" }, raise(path, t.value, s.maxTrait)].filter(Boolean)
          };
        }
        if (ref.startsWith("item.")) {
          const it = actor.items.get(ref.slice(5));
          if (!it) break;
          return { itemId: it.id, title: it.name, initial: it.name.charAt(0), subtitle: "Capacité secondaire", ...dots(it.system.value),
            html: await enrich(it.system.description), facts: it.system.spec ? [{ label: "Spécialité", value: it.system.spec }] : [],
            buttons: [{ action: "rollTrait", ref, icon: "fa-solid fa-dice-d10", label: "Lancer les dés" }, { action: "itemEdit", icon: "fa-solid fa-pen", label: "Ouvrir" }] };
        }
        break;
      }
      case "background": {
        const b = s.backgrounds[sel.key];
        if (!b) break;
        const path = `system.backgrounds.${sel.key}.value`;
        return { title: NOCTIS.backgrounds[sel.key], initial: NOCTIS.backgrounds[sel.key].charAt(0), subtitle: "Historique", ...dots(b.value),
          desc: BACKGROUND_HELP[sel.key]?.desc ?? "", levels: levels(BACKGROUND_HELP[sel.key], b.value), facts: b.notes ? [{ label: "Précisions", value: b.notes }] : [],
          buttons: [raise(path, b.value)].filter(Boolean) };
      }
      case "virtue": {
        const v = s.virtues[sel.key];
        if (!v) break;
        const type = v.type ?? sel.key;
        const path = `system.virtues.${sel.key}.value`;
        const kind = sel.key === "courage" ? "panic" : sel.key === "conscience" ? "conscience" : "frenzy";
        return { title: v.label ?? NOCTIS.virtueLabels[type], initial: (v.label ?? "V").charAt(0), subtitle: "Vertu", ...dots(v.value),
          desc: VIRTUE_HELP[type]?.desc ?? "", levels: levels(VIRTUE_HELP[type], v.value),
          buttons: [{ action: "rollVirtue", kind, icon: "fa-solid fa-dice-d10", label: "Lancer" }, raise(path, v.value)].filter(Boolean) };
      }
      case "discipline": {
        const it = actor.items.get(sel.itemId);
        if (!it) break;
        const v = it.system.value;
        const img = it.img;
        return { itemId: it.id, title: it.name, img, subtitle: it.system.isPath ? "Voie" : it.system.isClan ? "Discipline de clan" : "Discipline", ...dots(v, Math.max(5, v)),
          html: await enrich(it.system.description),
          powers: it.system.powers.filter(p => p.level <= Math.max(5, v)).map(p => ({ dots: "●".repeat(Math.min(p.level, 5)), name: p.name, unlocked: p.level <= v })),
          buttons: [{ action: "rollTrait", ref: `item.${it.id}`, icon: "fa-solid fa-dice-d10", label: "Jet libre" }, raise(`item.${it.id}`, v, Math.max(5, s.maxTrait)), { action: "itemEdit", icon: "fa-solid fa-pen", label: "Ouvrir" }].filter(Boolean) };
      }
      case "power": {
        const it = actor.items.get(sel.itemId);
        const idx = Number(sel.idx);
        const p = it?.system.powers[idx];
        if (!p) break;
        const [fluff, system] = (p.summary ?? "").split(/\s+—\s+Système\s*:\s*/);
        const img = it.img;
        const pool = [NOCTIS.attributes[p.attribute], NOCTIS.abilities[p.ability] ?? (p.ability === "willpower" ? "Volonté" : p.ability)].filter(Boolean).join(" + ");
        const unlocked = p.level <= it.system.value;
        const facts = [];
        if (pool) facts.push({ label: "Groupement", value: pool });
        if (p.difficulty) facts.push({ label: "Difficulté", value: p.difficulty });
        if (p.cost) facts.push({ label: "Coût", value: p.cost });
        if (p.duration) facts.push({ label: "Durée", value: p.duration });
        return { itemId: it.id, title: p.name, img, subtitle: `${it.name} · niveau ${p.level}`, desc: fluff ?? "", system: system ?? "", facts,
          hint: unlocked ? "" : `Verrouillé : ${it.name} ${p.level} requis.`,
          buttons: unlocked ? [{ action: "rollPower", idx: String(idx), cls: "primary", icon: "fa-solid fa-hand-sparkles", label: "Utiliser le pouvoir" }] : [] };
      }
      case "item": {
        const it = actor.items.get(sel.itemId);
        if (!it) break;
        const typeLabel = game.i18n.localize(CONFIG.Item.typeLabels?.[it.type] ?? "") || it.type;
        const facts = [];
        const sys = it.system;
        if (it.type === "merit" || it.type === "flaw") facts.push({ label: "Coût", value: `${sys.cost} pt(s)` });
        if (it.type === "weapon") {
          facts.push({ label: "Difficulté", value: sys.difficulty }, { label: "Dégâts", value: `${sys.damageAttribute ? "For + " : ""}${sys.damageBonus} ${NOCTIS.damageTypes[sys.damageType]?.short ?? ""}` });
          if (sys.range) facts.push({ label: "Portée", value: `${sys.range} m` });
        }
        if (it.type === "armor") facts.push({ label: "Protection", value: sys.rating ?? "—" }, { label: "Pénalité", value: `−${sys.penalty ?? 0}` });
        if (it.type === "ritual") facts.push({ label: "Niveau", value: sys.level });
        if (it.type === "clan" && sys.weakness) facts.push({ label: "Faiblesse", value: sys.weakness });
        const buttons = [];
        if (it.type === "weapon") buttons.push({ action: "rollAttack", cls: "primary", icon: "fa-solid fa-khanda", label: "Attaquer" });
        buttons.push({ action: "itemChat", icon: "fa-solid fa-comment", label: "Chat" }, { action: "itemEdit", icon: "fa-solid fa-pen", label: "Ouvrir" });
        return { itemId: it.id, title: it.name, img: it.type === "clan" ? (sys.emblem || it.img) : it.img, subtitle: typeLabel, html: await enrich(sys.description), facts, buttons };
      }
    }
    return this.#defaultContext(ctx);
  }

  #defaultContext(ctx) {
    const s = this.actor.system;
    const clan = ctx.clan;
    const facts = [];
    if (s.identity?.nature) facts.push({ label: "Nature", value: s.identity.nature });
    if (s.identity?.demeanor) facts.push({ label: "Attitude", value: s.identity.demeanor });
    if (s.isVampire) facts.push({ label: "Génération", value: s.generationLabel ?? "" });
    if (s.road?.name) facts.push({ label: "Voie", value: `${s.road.name} (${s.road.value})` });
    if (clan?.system?.weakness) facts.push({ label: "Faiblesse du clan", value: clan.system.weakness });
    return {
      title: clan?.name ?? this.actor.name, img: clan?.system?.emblem || "", initial: this.actor.name.charAt(0),
      subtitle: clan?.system?.nickname ?? "", facts,
      hint: "Cliquez sur un trait, un pouvoir ou un objet pour afficher ici sa description et ses actions. Double-clic sur un trait ou un pouvoir : lancer directement."
    };
  }

  /* -------------------------------------------- */
  /*  Glisser-déposer                              */
  /* -------------------------------------------- */

  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;
    if (!(item instanceof Item)) item = await Item.implementation.fromDropData(item);
    if (!item) return null;
    if (item.parent === this.actor) return super._onDropItem(event, item);
    const data = item.toObject();
    delete data._id;
    const actor = this.actor;

    switch (item.type) {
      case "clan": return this.#dropClan(data, item);
      case "road": {
        const old = actor.items.filter(i => i.type === "road").map(i => i.id);
        if (old.length) await actor.deleteEmbeddedDocuments("Item", old);
        await actor.update({ "system.road.name": item.name, "system.virtues.conscience.type": item.system.virtue1, "system.virtues.selfcontrol.type": item.system.virtue2, "system.road.aura": item.system.aura });
        ui.notifications.info(`${actor.name} suit désormais la ${item.name}.`);
        return actor.createEmbeddedDocuments("Item", [data]);
      }
      case "discipline": {
        const key = item.system.key;
        if (key && actor.items.some(i => i.type === "discipline" && i.system.key === key)) {
          ui.notifications.warn(`${actor.name} possède déjà ${item.name}.`);
          return null;
        }
        data.system.value = 0;
        if (!this.locked) data.system.value = Math.max(1, item.system.value || 1);
        else this.#askPurchaseNew(data);
        if (this.locked) return null;
        return actor.createEmbeddedDocuments("Item", [data]);
      }
      case "ability": {
        if (item.system.key && NOCTIS.abilities[item.system.key]) {
          ui.notifications.info(`${item.name} est une capacité de base : elle figure déjà sur la fiche.`);
          return null;
        }
        if (actor.items.some(i => i.type === "ability" && i.name === item.name)) return ui.notifications.warn(`${item.name} est déjà sur la fiche.`);
        return actor.createEmbeddedDocuments("Item", [data]);
      }
      case "merit":
      case "flaw": {
        if (actor.items.some(i => i.type === item.type && i.name === item.name)) {
          ui.notifications.warn(`${item.name} est déjà sur la fiche.`);
          return null;
        }
        // Plusieurs niveaux : on demande lequel
        if ((data.system.levels?.length ?? 0) > 1) {
          const opts = data.system.levels.map(l => `<label class="mf-pick"><input type="radio" name="lv" value="${l.value}" ${l.value === data.system.levels[0].value ? "checked" : ""}> <b>${l.value} pt${l.value > 1 ? "s" : ""}</b> — ${l.text}</label>`).join("");
          const lv = await DialogV2.prompt({
            window: { title: `${item.name} : niveau` }, classes: ["noctis-mf-dialog"],
            content: `<div class="mf-pick-list">${opts}</div>`,
            ok: { label: "Ajouter", callback: (event, button) => Number(new foundry.applications.ux.FormDataExtended(button.form).object.lv) }, rejectClose: false
          }).catch(() => null);
          if (!lv) return null;
          data.system.cost = lv;
          const t = data.system.levels.find(l => l.value === lv)?.text;
          if (t) data.system.description = `<p><b>Niveau ${lv} :</b> ${t}</p>` + (data.system.description ?? "");
        }
        const created = await actor.createEmbeddedDocuments("Item", [data]);
        ui.notifications.info(`${item.type === "merit" ? "Atout" : "Handicap"} ajouté : ${item.name} (${data.system.cost} pt${data.system.cost > 1 ? "s" : ""}).`);
        return created;
      }
      default:
        return actor.createEmbeddedDocuments("Item", [data]);
    }
  }

  async #dropClan(data, item) {
    const actor = this.actor;
    const old = actor.items.filter(i => i.type === "clan").map(i => i.id);
    if (old.length) await actor.deleteEmbeddedDocuments("Item", old);
    const created = await actor.createEmbeddedDocuments("Item", [data]);
    const upd = { "system.identity.clan": item.name };
    if (item.system.appearanceZero) upd["system.attributes.appearance.value"] = 0;
    await actor.update(upd);
    // Ajoute les disciplines de clan manquantes depuis le compendium
    const toCreate = [];
    for (const key of item.system.disciplines ?? []) {
      if (actor.items.some(i => i.type === "discipline" && (disciplineKey(i) === key || i.system.parent === key))) continue;
      const doc = await findDiscipline(key);
      if (!doc) continue;
      const d = doc.toObject(); delete d._id; d.system.value = 0;
      toCreate.push(d);
    }
    if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);
    ui.notifications.info(`Clan ${item.name} appliqué${toCreate.length ? ` : ${toCreate.length} discipline(s) de clan ajoutée(s)` : ""}.`);
    return created;
  }

  async #askPurchaseNew(data) {
    const actor = this.actor;
    const isClan = (actor.clanItem?.system.disciplines ?? []).includes(data.system.key) || (actor.clanItem?.system.disciplines ?? []).includes(data.system.parent);
    const cost = data.system.isPath ? 7 : 10;
    const choice = await NOCTISActorSheet.#purchaseDialog(`Apprendre ${data.name}`, `Nouvelle ${data.system.isPath ? "voie" : "discipline"}${isClan ? " (de clan)" : ""} : <b>${cost} XP</b> pour le premier point.`, cost, actor.system.experience.available);
    if (!choice) return;
    data.system.value = 1;
    await actor.createEmbeddedDocuments("Item", [data]);
    await actor.addXpEntry({ kind: "spend", amount: cost, free: choice.free, label: `${data.name} 0 → 1`, category: data.system.isPath ? "newPath" : "newDiscipline", trait: data.name, from: 0, to: 1, note: choice.note });
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  static #onSwitchTab(event, target) {
    const tab = target.dataset.tab;
    this._activeTab = tab;
    for (const nav of this.element.querySelectorAll("[data-action=switchTab]")) nav.classList.toggle("active", nav.dataset.tab === tab);
    for (const sec of this.element.querySelectorAll("section.tab[data-tab]")) sec.classList.toggle("active", sec.dataset.tab === tab);
  }

  static #onToggleStatus(event, target) {
    const id = target.dataset.status;
    return setStatus(this.actor, id, !hasStatus(this.actor, id));
  }

  static #onBeastTest(event, target) { return provocationDialog(this.actor, target.dataset.kind); }
  static #onBeastLucid() { return lucidTurn(this.actor); }
  static #onBeastEnd() { return endCrisis(this.actor); }

  static #onOpenRuleSettings() {
    if (!game.user.isGM) return;
    const app = new foundry.applications.settings.SettingsConfig();
    app.render({ force: true });
  }

  static #onToggleLock() {
    this._unlocked = this.locked;
    this.render();
  }

  static async #onFinishCreation() {
    const done = !this.actor.system.creation.done;
    await this.actor.update({ "system.creation.done": done });
    this._unlocked = null;
    ui.notifications.info(done ? "Création terminée : les progressions se paient désormais en expérience." : "Fiche repassée en mode création.");
  }

  static #onOpenCreator() {
    const cls = game.noctis?.CharacterCreator;
    if (!cls) return ui.notifications.info("Le créateur de personnage arrive à l'étape 4 du projet.");
    return cls.open(this.actor);
  }

  static async #onSetDots(event, target) {
    const wrap = target.closest("[data-path]");
    const path = wrap.dataset.path;
    const dot = Number(target.dataset.dot);
    const current = Number(wrap.dataset.value) || 0;
    let value = dot === current ? dot - 1 : dot;
    if (wrap.dataset.min && value < Number(wrap.dataset.min)) value = Number(wrap.dataset.min);
    if (value === current) return;
    const free = wrap.dataset.free === "true";
    const actor = this.actor;

    // Pertes « en jeu » autorisées même fiche verrouillée : Voie, Volonté, vertus (dégénérescence)
    const lossAllowed = path === "system.road.value" || path === "system.willpower.permanent" || path.startsWith("system.virtues.");
    if (this.locked && !free && !(value < current && lossAllowed)) {
      if (value < current) return ui.notifications.warn("Fiche verrouillée : déverrouillez-la (cadenas) pour retirer des points.");
      const p = actor.describePurchase(path, current, value);
      const choice = await NOCTISActorSheet.#purchaseDialog(`Progression : ${p.label}`, `${p.label} : ${current} → ${value}<br>Catégorie : ${NOCTIS.xpCategories[p.category]}<br>Coût : <b>${p.cost} XP</b>`, p.cost, actor.system.experience.available);
      if (!choice) return;
      return actor.purchaseTrait(path, current, value, { free: choice.free, note: choice.note });
    }
    if (path.startsWith("item.")) return actor.items.get(path.split(".")[1])?.update({ "system.value": value });
    return actor.update({ [path]: value });
  }

  static async #purchaseDialog(title, html, cost, available) {
    const enough = cost <= available;
    return DialogV2.wait({
      window: { title, icon: "fa-solid fa-scroll" },
      classes: ["noctis", "noctis-dialog"],
      content: `<div class="noctis-mini-form"><p>${html}</p><p>Expérience disponible : <b>${available}</b>${enough ? "" : ` <span class="warn">(insuffisante)</span>`}</p>
        <label>Motif / note <input type="text" name="note" placeholder="ex. entraînement auprès de son sire"></label></div>`,
      buttons: [
        { action: "pay", label: `Payer ${cost} XP`, icon: "fa-solid fa-coins", default: enough, callback: (e, b) => ({ free: false, note: b.form.elements.note.value }) },
        { action: "free", label: "Gratuit", icon: "fa-solid fa-gift", callback: (e, b) => ({ free: true, note: b.form.elements.note.value }) },
        { action: "cancel", label: "Annuler", icon: "fa-solid fa-xmark", callback: () => null }
      ],
      rejectClose: false
    });
  }

  static async #onPickImage() {
    if (!this.isEditable) return;
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image", current: this.actor.img,
      callback: path => this.actor.update({ img: path })
    });
    return fp.browse();
  }

  static async #onSetSquares(event, target) {
    const wrap = target.closest("[data-path]");
    const path = wrap.dataset.path;
    const n = Number(target.dataset.n);
    const current = Number(wrap.dataset.value) || 0;
    const value = n === current ? n - 1 : n;
    return this.actor.update({ [path]: Math.max(0, value) });
  }

  static async #onHealthClick(event, target) {
    // Clic gauche : ajoute un niveau du type choisi (contondant par défaut, Maj = létal, Ctrl = aggravé)
    const type = event.ctrlKey || event.metaKey ? "aggravated" : (event.shiftKey ? "lethal" : "bashing");
    return this.actor.applyHealthDamage(1, type);
  }

  static async #healLast(actor) {
    const h = actor.system.health;
    const type = h.bashing ? "bashing" : (h.lethal ? "lethal" : (h.aggravated ? "aggravated" : null));
    if (type) await actor.healDamage(type, 1);
  }

  static async #onHealthClear(event, target) {
    const type = target.dataset.type;
    if (type) return this.actor.healDamage(type, 1);
    return NOCTISActorSheet.#healLast(this.actor);
  }

  static #onTakeDamage() { return manualDamageDialog([this.actor]); }
  static #onBloodHeal() { return this.actor.bloodHeal(); }
  static #onBloodHealAgg() { return this.actor.bloodHealAggravated(); }
  static #onBloodBoost(event, target) { return this.actor.bloodBoost(target.dataset.attr); }
  static #onEndScene() { return this.actor.endScene(); }
  static #onNightfall() { return this.actor.nightfall(); }

  /* ---- Jets ---- */

  static #onRollTrait(event, target) {
    const ref = target.dataset.ref;
    const actor = this.actor;
    const preset = {};
    if (ref.startsWith("attr.")) { preset.trait1 = ref; preset.trait2 = "none"; }
    else if (ref.startsWith("abil.")) { preset.trait1 = `attr.${NOCTIS.abilityDefaultAttr[ref.slice(5)] ?? "dexterity"}`; preset.trait2 = ref; }
    else if (ref.startsWith("item.")) {
      const it = actor.items.get(ref.slice(5));
      preset.trait1 = it?.type === "ability" ? "attr.intelligence" : "none";
      preset.trait2 = ref;
    } else { preset.trait1 = ref; }
    return RollDialog.prompt(actor, preset);
  }

  static #onRollFree() { return RollDialog.prompt(this.actor, { trait1: "attr.dexterity", trait2: "none" }); }

  static #onRollPower(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]").dataset.itemId);
    const p = item.system.powers[Number(target.dataset.idx)];
    if (!p) return;
    const diff = parseInt(p.difficulty) || 6;
    const t2 = p.ability === "willpower" ? "willpower" : (p.ability ? `abil.${p.ability}` : (p.attribute ? "none" : `item.${item.id}`));
    return RollDialog.prompt(this.actor, {
      label: `${item.name} — ${p.name}`,
      trait1: p.attribute ? `attr.${p.attribute}` : "none",
      trait2: t2,
      difficulty: diff,
      tags: [`disc.${item.system.key}`, `disc.${item.system.parent}`, "discipline"]
    });
  }

  static #onRollVirtue(event, target) {
    const kind = target.dataset.kind;
    const actor = this.actor;
    switch (kind) {
      case "frenzy": return RollDialog.prompt(actor, { label: "Résister à la frénésie", trait1: "virtue.selfcontrol", trait2: "none", difficulty: 6, capByBlood: true, noWoundPenalty: true, tags: ["frenzy"] });
      case "panic": return RollDialog.prompt(actor, { label: "Panique", trait1: "virtue.courage", trait2: "none", difficulty: 6, noWoundPenalty: true, tags: ["panic"] });
      case "conscience": return RollDialog.prompt(actor, { label: `Jet de ${actor.system.virtues.conscience.label}`, trait1: "virtue.conscience", trait2: "none", difficulty: 6, noWoundPenalty: true });
      case "willpower": return RollDialog.prompt(actor, { label: "Jet de Volonté", trait1: "willpower", trait2: "none", difficulty: 6, noWoundPenalty: true, tags: ["willpower"] });
      case "road": return RollDialog.prompt(actor, { label: `Jet de ${actor.system.road.name || "Voie"}`, trait1: "road", trait2: "none", difficulty: 6, noWoundPenalty: true, tags: ["road"] });
      case "faith": return RollDialog.prompt(actor, { label: "Vraie Foi", trait1: "faith", trait2: "none", difficulty: 6, noWoundPenalty: true });
    }
  }

  static #onRollAttack(event, target) {
    const w = this.actor.items.get(target.closest("[data-item-id]").dataset.itemId);
    if (!w) return;
    const str = this.actor.system.attributes.strength.total;
    const tooWeak = Math.max(0, (w.system.strength || 0) - str);
    return RollDialog.prompt(this.actor, {
      label: `Attaque — ${w.name}`,
      trait1: `attr.${w.system.attribute || "dexterity"}`,
      trait2: `abil.${w.system.ability || "melee"}`,
      difficulty: (w.system.difficulty || 6) + tooWeak,
      kind: "attack",
      weaponId: w.id,
      tags: ["attack"]
    });
  }

  static async #onRollSoak(event, target) {
    const type = target.dataset.type;
    const pool = this.actor.system.soak[type];
    return rollPool({ actor: this.actor, pool, difficulty: 6, kind: "soak", noBotch: true, label: `Absorption (${NOCTIS.damageTypes[type].label.toLowerCase()})`, parts: [`${pool} dés`] });
  }

  static async #onRollInitiative() {
    const actor = this.actor;
    if (game.combat) return actor.rollInitiative({ createCombatants: true });
    const roll = await new Roll("1d10 + @init", { init: actor.system.initiative.value }).evaluate();
    return roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `Initiative (${actor.system.initiative.value} + 1d10)` });
  }

  /* ---- Objets ---- */

  static #onItemEdit(event, target) {
    const id = target.closest("[data-item-id]").dataset.itemId;
    this.actor.items.get(id)?.sheet.render({ force: true });
  }

  static async #onItemDelete(event, target) {
    const id = target.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return;
    const ok = await DialogV2.confirm({ window: { title: "Supprimer" }, content: `<p>Supprimer <b>${item.name}</b> de la fiche ?</p>`, rejectClose: false });
    if (ok) await item.delete();
  }

  static async #onItemCreate(event, target) {
    const type = target.dataset.type;
    const labels = { weapon: "Nouvelle arme", armor: "Nouvelle armure", gear: "Nouvel objet", merit: "Nouvel atout", flaw: "Nouveau handicap", ability: "Nouvelle capacité", discipline: "Nouvelle discipline", ritual: "Nouveau rituel", derangement: "Nouveau dérangement" };
    const data = { name: labels[type] ?? "Nouvel objet", type };
    if (type === "ability") data.system = { group: target.dataset.group ?? "knowledges" };
    const [item] = await this.actor.createEmbeddedDocuments("Item", [data]);
    item?.sheet.render({ force: true });
  }

  static async #onItemToggle(event, target) {
    const id = target.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(id);
    const field = target.dataset.field ?? "system.equipped";
    return item?.update({ [field]: !foundry.utils.getProperty(item, field) });
  }

  static async #onItemChat(event, target) {
    const id = target.closest("[data-item-id]").dataset.itemId;
    const item = this.actor.items.get(id);
    if (!item) return;
    const desc = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description ?? "");
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: `<div class="noctis-card item-card"><header><img src="${item.img}"><h3>${item.name}</h3></header><div class="body">${desc}</div></div>` });
  }

  static #onTogglePower(event, target) {
    this._collapsed ??= new Set();
    const id = target.closest("[data-item-id]").dataset.itemId;
    if (this._collapsed.has(id)) this._collapsed.delete(id); else this._collapsed.add(id);
    target.closest(".discipline-card")?.classList.toggle("collapsed");
  }

  /* ---- Expérience ---- */

  static async #onXpAdd() {
    const data = await DialogV2.prompt({
      window: { title: "Gain d'expérience", icon: "fa-solid fa-plus" },
      classes: ["noctis", "noctis-dialog"],
      content: `<div class="noctis-mini-form">
        <label>Points gagnés <input type="number" name="amount" value="1" min="0" autofocus></label>
        <label>Motif <input type="text" name="label" placeholder="ex. Séance 4, fin du chapitre II"></label>
        <label>Date <input type="text" name="date" value="${new Date().toLocaleDateString("fr-FR")}"></label></div>`,
      ok: { label: "Ajouter", icon: "fa-solid fa-check", callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object },
      rejectClose: false
    });
    if (!data) return;
    return this.actor.addXpEntry({ kind: "gain", amount: Number(data.amount) || 0, label: data.label || "Gain d'expérience", date: data.date, category: "" });
  }

  static async #onXpSpend() {
    const cats = Object.entries(NOCTIS.xpCategories).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    const data = await DialogV2.prompt({
      window: { title: "Dépense ou ajout manuel", icon: "fa-solid fa-minus" },
      classes: ["noctis", "noctis-dialog"],
      content: `<div class="noctis-mini-form">
        <p class="hint">Pour les achats de points, cliquez plutôt directement sur les points de la fiche : le coût est calculé tout seul.</p>
        <label>Libellé <input type="text" name="label" placeholder="ex. Rituel : Défense du refuge sacré"></label>
        <label>Catégorie <select name="category">${cats}</select></label>
        <label>Coût (XP) <input type="number" name="amount" value="0" min="0"></label>
        <label class="check"><input type="checkbox" name="free"> Gratuit (accordé par le conteur)</label>
        <label>Note <input type="text" name="note"></label></div>`,
      ok: { label: "Inscrire", icon: "fa-solid fa-check", callback: (e, b) => new foundry.applications.ux.FormDataExtended(b.form).object },
      rejectClose: false
    });
    if (!data) return;
    return this.actor.addXpEntry({ kind: "spend", amount: Number(data.amount) || 0, free: !!data.free, label: data.label || "Dépense", category: data.category, note: data.note ?? "" });
  }

  static #onXpToggleFree(event, target) {
    const id = target.closest("[data-entry-id]").dataset.entryId;
    const e = this.actor.system.experience.log.find(x => x.id === id);
    if (e) return this.actor.updateXpEntry(id, { free: !e.free });
  }

  static async #onXpDelete(event, target) {
    const id = target.closest("[data-entry-id]").dataset.entryId;
    const ok = await DialogV2.confirm({ window: { title: "Supprimer l'entrée" }, content: "<p>Supprimer cette ligne du journal d'expérience ? Les points de la fiche ne sont pas modifiés.</p>", rejectClose: false });
    if (ok) return this.actor.deleteXpEntry(id);
  }
}
