const fields = foundry.data.fields;

const int = (initial = 0, opts = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opts });
const str = (initial = "") => new fields.StringField({ required: true, blank: true, initial });

/** Modificateur permanent appliqué à la fiche (ex. +1 en Vigueur). */
function modifierField() {
  return new fields.SchemaField({
    target: str(""),
    value: int(0)
  });
}

/** Bonus de jet proposé dans la fenêtre de jet (ex. +2 dés aux jets de Perception auditive). */
function bonusField() {
  return new fields.SchemaField({
    id: new fields.StringField({ required: true, blank: false, initial: () => foundry.utils.randomID() }),
    label: str(""),
    target: str("all"),
    dice: int(0),
    difficulty: int(0),
    auto: new fields.BooleanField({ initial: false })
  });
}

class BaseItemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ initial: "" }),
      source: str(""),
      modifiers: new fields.ArrayField(modifierField()),
      bonuses: new fields.ArrayField(bonusField())
    };
  }
}

export class ClanModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      nickname: str(""),
      isBloodline: new fields.BooleanField({ initial: false }),
      parent: str(""),
      disciplines: new fields.ArrayField(new fields.StringField({ blank: false })),
      disciplineNote: str(""),
      weakness: str(""),
      appearanceZero: new fields.BooleanField({ initial: false }),
      roads: str(""),
      emblem: str("")
    };
  }
}

export class DisciplineModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      key: str(""),
      value: int(0, { min: 0, max: 10 }),
      isPath: new fields.BooleanField({ initial: false }),
      parent: str(""),
      primary: new fields.BooleanField({ initial: false }),
      inClan: new fields.BooleanField({ initial: false }),
      mechanic: new fields.StringField({ blank: true, initial: "" }),
      powers: new fields.ArrayField(new fields.SchemaField({
        level: int(1, { min: 1, max: 10 }),
        name: str(""),
        attribute: str(""),
        ability: str(""),
        difficulty: str(""),
        cost: str(""),
        duration: str(""),
        summary: str("")
      }))
    };
  }
}

export class MeritModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      cost: int(1, { min: 0 }),
      costText: str(""),
      category: str("physical"),
      levels: new foundry.data.fields.ArrayField(new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({ integer: true, min: 0, initial: 1 }),
        text: new foundry.data.fields.StringField({ blank: true, initial: "" })
      }))
    };
  }
}

export class FlawModel extends MeritModel {}

export class AbilityModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      key: str(""),
      group: str("knowledges"),
      value: int(0, { min: 0, max: 10 }),
      spec: str("")
    };
  }
}

export class RoadModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      latin: str(""),
      virtue1: new fields.StringField({ choices: ["conscience", "conviction"], initial: "conviction" }),
      virtue2: new fields.StringField({ choices: ["selfcontrol", "instinct"], initial: "selfcontrol" }),
      nickname: str(""),
      aura: str(""),
      sins: new fields.ArrayField(new fields.SchemaField({ level: int(1), sin: str("") }))
    };
  }
}

export class WeaponModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ability: str("melee"),
      attribute: str("dexterity"),
      damageAttribute: str("strength"),
      damageBonus: int(0),
      damageType: new fields.StringField({ choices: ["bashing", "lethal", "aggravated"], initial: "lethal" }),
      difficulty: int(6, { min: 2, max: 10 }),
      range: int(0, { min: 0 }),
      conceal: str("A"),
      strength: int(0, { min: 0 }),
      armorPiercing: int(0, { min: 0 }),
      fire: new fields.BooleanField({ initial: false }),
      twoHanded: new fields.BooleanField({ initial: false }),
      thrown: new fields.BooleanField({ initial: false }),
      equipped: new fields.BooleanField({ initial: true }),
      notes: str("")
    };
  }
}

export class ArmorModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      kind: new fields.StringField({ choices: ["armor", "shield"], initial: "armor" }),
      rating: int(1, { min: 0 }),
      penalty: int(0, { min: 0 }),
      parryDifficulty: int(6, { min: 2, max: 10 }),
      attackDifficulty: int(0),
      equipped: new fields.BooleanField({ initial: true })
    };
  }
}

export class GearModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: int(1, { min: 0 }),
      equipped: new fields.BooleanField({ initial: false })
    };
  }
}

export class RitualModel extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      level: int(1, { min: 1, max: 10 }),
      sorcery: str("other")
    };
  }
}

export class DerangementModel extends BaseItemModel {}
