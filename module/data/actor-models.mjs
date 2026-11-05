import { NOCTIS, generationStats } from "../config.mjs";
import { slugKey } from "../registry.mjs";

const fields = foundry.data.fields;

const dots = (initial = 0, max = 10) => new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, max, initial });

function traitField(initial = 0) {
  return new fields.SchemaField({
    value: dots(initial),
    spec: new fields.StringField({ required: true, blank: true, initial: "" })
  });
}

function groupSchema(keys, initial) {
  const out = {};
  for (const k of keys) out[k] = traitField(initial);
  return new fields.SchemaField(out);
}

/** Entrée du journal d'expérience. */
function xpEntryField() {
  return new fields.SchemaField({
    id: new fields.StringField({ required: true, blank: false, initial: () => foundry.utils.randomID() }),
    date: new fields.StringField({ required: true, blank: true, initial: "" }),
    kind: new fields.StringField({ required: true, choices: ["gain", "spend"], initial: "gain" }),
    amount: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
    free: new fields.BooleanField({ initial: false }),
    label: new fields.StringField({ required: true, blank: true, initial: "" }),
    category: new fields.StringField({ required: true, blank: true, initial: "" }),
    trait: new fields.StringField({ required: true, blank: true, initial: "" }),
    from: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null }),
    to: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null }),
    note: new fields.StringField({ required: true, blank: true, initial: "" }),
    user: new fields.StringField({ required: true, blank: true, initial: "" }),
    batch: new fields.StringField({ required: false, blank: true, initial: "" })
  });
}

export class BaseActorModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const attrKeys = Object.keys(NOCTIS.attributes);
    const abilKeys = Object.keys(NOCTIS.abilities);
    const bgKeys = Object.keys(NOCTIS.backgrounds);
    const bg = {};
    for (const k of bgKeys) bg[k] = new fields.SchemaField({ value: dots(0), notes: new fields.StringField({ blank: true, initial: "" }) });

    return {
      biography: new fields.HTMLField({ initial: "" }),
      notes: new fields.HTMLField({ initial: "" }),
      identity: new fields.SchemaField({
        player: new fields.StringField({ blank: true, initial: "" }),
        chronicle: new fields.StringField({ blank: true, initial: "" }),
        concept: new fields.StringField({ blank: true, initial: "" }),
        nature: new fields.StringField({ blank: true, initial: "" }),
        demeanor: new fields.StringField({ blank: true, initial: "" }),
        clan: new fields.StringField({ blank: true, initial: "" }),
        sire: new fields.StringField({ blank: true, initial: "" }),
        haven: new fields.StringField({ blank: true, initial: "" }),
        age: new fields.StringField({ blank: true, initial: "" }),
        apparentAge: new fields.StringField({ blank: true, initial: "" }),
        domitor: new fields.StringField({ blank: true, initial: "" })
      }),
      attributes: groupSchema(attrKeys, 1),
      abilities: groupSchema(abilKeys, 0),
      backgrounds: new fields.SchemaField(bg),
      virtues: new fields.SchemaField({
        conscience: new fields.SchemaField({ value: dots(1, 10), type: new fields.StringField({ choices: ["conscience", "conviction"], initial: "conscience" }) }),
        selfcontrol: new fields.SchemaField({ value: dots(1, 10), type: new fields.StringField({ choices: ["selfcontrol", "instinct"], initial: "selfcontrol" }) }),
        courage: new fields.SchemaField({ value: dots(1, 10) })
      }),
      road: new fields.SchemaField({
        name: new fields.StringField({ blank: true, initial: "Voie de l'Humanité" }),
        value: dots(5, 10),
        aura: new fields.StringField({ blank: true, initial: "" })
      }),
      willpower: new fields.SchemaField({
        permanent: dots(1, 10),
        temporary: dots(1, 10)
      }),
      blood: new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 10 }),
        maxOverride: new fields.NumberField({ required: false, nullable: true, integer: true, min: 0, initial: null })
      }),
      health: new fields.SchemaField({
        bashing: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        lethal: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 }),
        aggravated: new fields.NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0 })
      }),
      generationBase: new fields.NumberField({ required: true, nullable: false, integer: true, min: 3, max: 15, initial: 12 }),
      boosts: new fields.SchemaField({
        strength: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        dexterity: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        stamina: new fields.NumberField({ integer: true, min: 0, initial: 0 })
      }),
      faith: dots(0, 10),
      relations: new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({ blank: true, initial: "" }),
        name: new fields.StringField({ blank: true, initial: "" }),
        kind: new fields.StringField({ blank: false, initial: "contact" }),
        actorUuid: new fields.StringField({ blank: true, initial: "" }),
        img: new fields.StringField({ blank: true, initial: "" }),
        influence: new fields.NumberField({ integer: true, min: 0, max: 5, initial: 1 }),
        attitude: new fields.StringField({ blank: false, initial: "neutral" }),
        place: new fields.StringField({ blank: true, initial: "" }),
        notes: new fields.StringField({ blank: true, initial: "" }),
        bondTo: new fields.NumberField({ integer: true, min: 0, max: 3, initial: 0 }),
        bondFrom: new fields.NumberField({ integer: true, min: 0, max: 3, initial: 0 })
      })),
      opinions: new fields.ArrayField(new fields.SchemaField({
        actorId: new fields.StringField({ blank: true, initial: "" }),
        trust: new fields.NumberField({ integer: true, min: -2, max: 2, initial: 0 }),
        text: new fields.StringField({ blank: true, initial: "" }),
        bondTo: new fields.NumberField({ integer: true, min: 0, max: 3, initial: 0 }),
        bondFrom: new fields.NumberField({ integer: true, min: 0, max: 3, initial: 0 })
      })),
      domain: new fields.SchemaField({
        name: new fields.StringField({ blank: true, initial: "" }),
        location: new fields.StringField({ blank: true, initial: "" }),
        size: new fields.NumberField({ integer: true, min: 0, max: 10, initial: 0 }),
        security: new fields.NumberField({ integer: true, min: 0, max: 10, initial: 0 }),
        pooled: new fields.BooleanField({ initial: false }),
        poolTotal: new fields.NumberField({ integer: true, min: 0, max: 20, initial: 0 }),
        anchor: new fields.StringField({ blank: true, initial: "" }),
        grantedBy: new fields.StringField({ blank: true, initial: "" }),
        zone: new fields.StringField({ blank: false, initial: "market" }),
        haven: new fields.StringField({ blank: true, initial: "" }),
        residents: new fields.StringField({ blank: true, initial: "" }),
        defenses: new fields.StringField({ blank: true, initial: "" }),
        threats: new fields.StringField({ blank: true, initial: "" }),
        notes: new fields.StringField({ blank: true, initial: "" })
      }),
      combat: new fields.SchemaField({
        initiativeBonus: new fields.NumberField({ integer: true, initial: 0 }),
        soakBonus: new fields.NumberField({ integer: true, initial: 0 }),
        actions: new fields.NumberField({ integer: true, min: 0, initial: 1 }),
        actionsMax: new fields.NumberField({ integer: true, min: 1, initial: 1 }),
        attacksLeft: new fields.NumberField({ integer: true, min: 0, initial: 1 }),
        celerityActive: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        defensesUsed: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        defensePenalty: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        healsUsed: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        noDefense: new fields.BooleanField({ initial: false }),
        soakLethal: new fields.BooleanField({ initial: false }),
        soakAggravated: new fields.BooleanField({ initial: false })
      }),
      experience: new fields.SchemaField({
        log: new fields.ArrayField(xpEntryField())
      }),
      creation: new fields.SchemaField({
        done: new fields.BooleanField({ initial: false }),
        step: new fields.NumberField({ integer: true, min: 0, initial: 0 }),
        data: new fields.ObjectField({ initial: {} })
      }),
      possessions: new fields.SchemaField({
        carried: new fields.StringField({ blank: true, initial: "" }),
        owned: new fields.StringField({ blank: true, initial: "" }),
        feeding: new fields.StringField({ blank: true, initial: "" }),
        transport: new fields.StringField({ blank: true, initial: "" })
      })
    };
  }

  /** Indique si ce type de personnage est un vampire. */
  get isVampire() { return this.parent?.type === "vampire" || (this.parent?.type === "npc" && this.npcKind === "vampire"); }
  get usesBlood() { return ["vampire", "ghoul"].includes(this.parent?.type) || (this.parent?.type === "npc" && this.npcKind !== "mortal"); }

  /* ---------------------------------------- */

  prepareDerivedData() {
    const actor = this.parent;
    const items = actor?.items ?? [];

    // --- Modificateurs des objets (atouts, handicaps, objets équipés)
    const mods = { attributes: {}, abilities: {}, generation: 0, bloodMax: 0, willpowerMax: 0, health: 0, soak: 0, initiative: 0, rollBonuses: [] };
    for (const it of items) {
      const s = it.system;
      if (it.type === "weapon" || it.type === "armor" || it.type === "gear") { if (!s.equipped) continue; }
      for (const m of (s.modifiers ?? [])) {
        if (!m.target) continue;
        const v = Number(m.value) || 0;
        if (m.target.startsWith("attr.")) mods.attributes[m.target.slice(5)] = (mods.attributes[m.target.slice(5)] ?? 0) + v;
        else if (m.target.startsWith("abil.")) mods.abilities[m.target.slice(5)] = (mods.abilities[m.target.slice(5)] ?? 0) + v;
        else if (m.target in mods && typeof mods[m.target] === "number") mods[m.target] += v;
      }
      for (const b of (s.bonuses ?? [])) mods.rollBonuses.push({ ...b, source: it.name, itemId: it.id });
    }
    this.mods = mods;

    // --- Génération
    const genBg = this.backgrounds.generation.value;
    this.generation = Math.max(3, this.generationBase - genBg + mods.generation);
    const gs = generationStats(this.generation);
    this.maxTrait = this.isVampire ? gs.maxTrait : 5;
    this.generationLabel = NOCTIS.generationNames[this.generation] ?? `${this.generation}e`;

    // --- Attributs totaux
    let ignoreArmor = false;
    try { ignoreArmor = game.settings.get("noctis", "ignoreArmorPenalty"); } catch (e) { /* réglages pas encore chargés */ }
    const armorPenalty = ignoreArmor ? 0 : this.#armorPenalty(items);
    this.armorPenalty = armorPenalty;
    for (const [k, a] of Object.entries(this.attributes)) {
      const boost = this.boosts?.[k] ?? 0;
      a.mod = (mods.attributes[k] ?? 0) + boost;
      a.boost = boost;
      a.total = Math.max(0, a.value + a.mod);
      a.label = NOCTIS.attributes[k];
    }
    for (const [k, a] of Object.entries(this.abilities)) {
      a.mod = mods.abilities[k] ?? 0;
      a.total = Math.max(0, a.value + a.mod);
      a.label = NOCTIS.abilities[k];
    }

    // --- Disciplines
    const disc = {};
    const mech = { speed: 0, resilience: 0, might: 0 };
    const mechNames = { ...NOCTIS.mechanicNames };
    for (const it of items) if (it.type === "discipline") {
      const key = it.system.key || slugKey(it.name);
      disc[key] = Math.max(disc[key] ?? 0, it.system.value);
      const m = it.system.mechanic;
      if (m && m in mech && it.system.value >= mech[m]) { mech[m] = it.system.value; mechNames[m] = it.name; }
    }
    this.disciplineRatings = disc;
    // Rôles mécaniques : vitesse (actions, Dextérité, initiative), résilience (absorption), vigueur (Force)
    this.mechanics = mech;
    this.mechanicNames = mechNames;
    const fortitude = mech.resilience;
    const celerity = mech.speed;
    // Les points de Vélocité convertis en actions ce tour ne donnent plus leur bonus
    const celerityBonus = Math.max(0, celerity - (this.combat?.celerityActive ?? 0));
    this.celerityBonus = celerityBonus;

    // --- Vertus
    const v = this.virtues;
    v.conscience.label = NOCTIS.virtueLabels[v.conscience.type];
    v.selfcontrol.label = NOCTIS.virtueLabels[v.selfcontrol.type];
    v.courage.label = NOCTIS.virtueLabels.courage;

    // --- Sang
    if (this.usesBlood) {
      const base = actor.type === "ghoul" ? 10 : gs.blood;
      this.blood.max = (this.blood.maxOverride ?? base) + mods.bloodMax;
      this.blood.perTurn = actor.type === "ghoul" ? 1 : gs.perTurn;
    } else {
      this.blood.max = this.blood.maxOverride ?? 10;
      this.blood.perTurn = 1;
    }

    // --- Volonté
    this.willpower.max = this.willpower.permanent + mods.willpowerMax;

    // --- Santé
    const levels = NOCTIS.healthLevels.length + mods.health;
    const h = this.health;
    const agg = Math.min(h.aggravated, levels);
    const let_ = Math.min(h.lethal, levels - agg);
    const bash = Math.min(h.bashing, levels - agg - let_);
    const track = [];
    for (let i = 0; i < levels; i++) {
      const base = NOCTIS.healthLevels[Math.min(i, NOCTIS.healthLevels.length - 1)];
      let state = "";
      if (i < agg) state = "aggravated";
      else if (i < agg + let_) state = "lethal";
      else if (i < agg + let_ + bash) state = "bashing";
      track.push({ index: i, label: base.label, penalty: base.penalty, state });
    }
    h.track = track;
    h.levels = levels;
    h.damage = agg + let_ + bash;
    h.max = levels;
    h.value = levels - h.damage;
    const current = h.damage > 0 ? track[h.damage - 1] : null;
    h.status = current ? current.label : "Indemne";
    h.incapacitated = h.damage >= levels;
    h.penalty = h.incapacitated ? 0 : (current?.penalty ?? 0);
    // Frénésie : les pénalités de blessures sont ignorées
    const statuses = actor.statuses ?? new Set();
    h.frenzyIgnores = statuses.has("frenzy") && h.penalty < 0;
    if (h.frenzyIgnores) h.penalty = 0;
    h.torpor = this.isVampire && (h.incapacitated && (let_ + agg >= levels || this.blood.value <= 0));
    h.finalDeath = this.isVampire && agg >= levels;

    // --- Combat
    this.initiative = {
      base: this.attributes.dexterity.total + this.attributes.wits.total + celerityBonus,
      value: Math.max(0, this.attributes.dexterity.total + this.attributes.wits.total + celerityBonus + (this.combat.initiativeBonus ?? 0) + mods.initiative - armorPenalty + (h.penalty ?? 0) - (statuses.has("prone") ? 2 : 0))
    };
    // Vitesse : marche 7, trot 12 + Dex, course 20 + 3 × Dex, + Vélocité en mètres
    const dexT = this.attributes.dexterity.total;
    this.speed = { walk: 7 + celerity, trot: 12 + dexT + celerity, run: 20 + 3 * dexT + celerity, celerity, burst: 1 + celerity };
    const armorRating = this.#armorRating(items);
    this.armorRating = armorRating;
    const sta = this.attributes.stamina.total;
    const bonus = (this.combat.soakBonus ?? 0) + mods.soak;
    this.soak = {
      bashing: sta + fortitude + armorRating + bonus,
      lethal: (this.isVampire || this.combat.soakLethal ? sta + fortitude : (actor.type === "ghoul" ? fortitude : 0)) + armorRating + bonus,
      aggravated: fortitude + (this.combat.soakAggravated ? sta : 0) + armorRating + bonus
    };

    // --- Expérience
    let gained = 0, spent = 0;
    for (const e of this.experience.log) {
      if (e.kind === "gain") gained += e.amount;
      else if (!e.free) spent += e.amount;
    }
    this.experience.total = gained;
    this.experience.spent = spent;
    this.experience.available = gained - spent;
  }

  #armorRating(items) {
    let r = 0;
    for (const it of items) if (it.type === "armor" && it.system.equipped && it.system.kind !== "shield") r = Math.max(r, it.system.rating);
    return r;
  }

  #armorPenalty(items) {
    let p = 0;
    for (const it of items) if (it.type === "armor" && it.system.equipped) p += it.system.penalty;
    return p;
  }
}

export class VampireModel extends BaseActorModel {}

export class GhoulModel extends BaseActorModel {
  static defineSchema() {
    const s = super.defineSchema();
    s.blood.fields.value.initial = 2;
    return s;
  }
}

export class MortalModel extends BaseActorModel {
  static defineSchema() {
    const s = super.defineSchema();
    s.blood.fields.value.initial = 10;
    s.road.fields.name.initial = "Voie de l'Humanité";
    s.road.fields.value.initial = 7;
    return s;
  }
}

export class NpcModel extends BaseActorModel {
  static defineSchema() {
    const s = super.defineSchema();
    s.npcKind = new fields.StringField({ choices: ["vampire", "ghoul", "mortal", "creature"], initial: "vampire" });
    return s;
  }
}
