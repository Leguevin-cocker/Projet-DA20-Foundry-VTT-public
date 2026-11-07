import { htmlToText, applyPlainText } from "../helpers/plain-text.mjs";
import { slugKey } from "../registry.mjs";
import { NOCTIS, rollTargetChoices } from "../config.mjs";
import { loc } from "../i18n.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class NOCTISItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["noctis", "noctis-window", "sheet", "item"],
    position: { width: 620, height: 680 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      addRow: NOCTISItemSheet.#onAddRow,
      deleteRow: NOCTISItemSheet.#onDeleteRow,
      editImage: NOCTISItemSheet.#onEditImage,
      pickEmblem: NOCTISItemSheet.#onPickEmblem
    }
  };

  static PARTS = {
    body: { template: "systems/noctis/templates/item/item-sheet.hbs", scrollable: [".item-body"] }
  };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const item = this.item;
    const s = item.system;
    Object.assign(ctx, {
      item, system: s, type: item.type, config: NOCTIS,
      editable: this.isEditable,
      typeLabel: game.i18n.localize(CONFIG.Item.typeLabels?.[item.type] ?? item.type),
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(s.description ?? "", { secrets: item.isOwner, relativeTo: item }),
      descriptionText: htmlToText(s.description),
      targets: rollTargetChoices(),
      modifierTargets: {
        "": "—",
        ...Object.fromEntries(Object.entries(NOCTIS.attributes).map(([k, v]) => [`attr.${k}`, loc("NOCTIS.js.Attribut2", { v })])),
        ...Object.fromEntries(Object.entries(NOCTIS.abilities).map(([k, v]) => [`abil.${k}`, loc("NOCTIS.js.Capacite2", { v })])),
        generation: loc("NOCTIS.js.GenerationPlusFaible"), bloodMax: loc("NOCTIS.js.ReserveDeSangMax"), willpowerMax: loc("NOCTIS.js.VolonteMax"),
        health: loc("NOCTIS.js.NiveauxDeSante"), soak: loc("NOCTIS.js.Absorption2"), initiative: loc("NOCTIS.js.Initiative")
      },
      abilityChoices: { ...NOCTIS.abilities, willpower: loc("NOCTIS.js.Volonte"), "": "—" },
      attributeChoices: { "": "—", ...NOCTIS.attributes },
      disciplineChoices: { "": "—", ...NOCTIS.disciplines },
      weaponAbilities: NOCTIS.weaponAbilities,
      damageTypes: Object.fromEntries(Object.entries(NOCTIS.damageTypes).map(([k, v]) => [k, v.label])),
      concealment: NOCTIS.concealment,
      meritCategories: NOCTIS.meritCategories,
      abilityGroups: Object.fromEntries(Object.entries(NOCTIS.abilityGroups).map(([k, v]) => [k, v.label])),
      virtue1: { conscience: loc("NOCTIS.js.Conscience"), conviction: loc("NOCTIS.js.Conviction") },
      virtue2: { selfcontrol: loc("NOCTIS.js.MaitriseDeSoi"), instinct: loc("NOCTIS.js.Instinct") },
      armorKinds: { armor: loc("NOCTIS.js.Armure"), shield: loc("NOCTIS.js.BouclierArmeDeParade") },
      sorceries: { ...Object.fromEntries(Object.entries(NOCTIS.disciplines)), other: loc("NOCTIS.js.Autre") },
      mechanicChoices: NOCTIS.disciplineMechanics,
      discKey: item.type === "discipline" ? (item.system.key || slugKey(item.name)) : "",
      clanDisciplinesText: (s.disciplines ?? []).map(k => NOCTIS.disciplines[k] ?? k).join(", "),
      isWeapon: item.type === "weapon", isArmor: item.type === "armor", isGear: item.type === "gear",
      isClan: item.type === "clan", isDiscipline: item.type === "discipline", isMerit: item.type === "merit" || item.type === "flaw",
      isAbility: item.type === "ability", isRoad: item.type === "road", isRitual: item.type === "ritual",
      hasModifiers: !["clan", "road"].includes(item.type) || true
    });
    return ctx;
  }

  /**
   * Reconstitue les tableaux (pouvoirs, bonus, modificateurs, péchés) et la liste
   * des disciplines de clan avant validation.
   */
  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);
    applyPlainText(data, "descriptionText", "system.description", this.item.system.description);
    for (const field of ["modifiers", "bonuses", "powers", "sins", "levels"]) {
      const v = data.system?.[field];
      if (v && !Array.isArray(v) && typeof v === "object") {
        const current = foundry.utils.deepClone(this.item.system[field] ?? []);
        for (const [idx, row] of Object.entries(v)) {
          const i = Number(idx);
          if (Number.isNaN(i)) continue;
          current[i] = foundry.utils.mergeObject(current[i] ?? {}, row);
        }
        data.system[field] = current;
      }
    }
    if (typeof data.system?.disciplinesText === "string") {
      const rev = Object.fromEntries(Object.entries(NOCTIS.disciplines).map(([k, v]) => [v.toLowerCase(), k]));
      data.system.disciplines = data.system.disciplinesText.split(",").map(x => x.trim()).filter(Boolean).map(x => rev[x.toLowerCase()] ?? slugKey(x));
      delete data.system.disciplinesText;
    }
    return data;
  }

  static async #onAddRow(event, target) {
    const field = target.dataset.field;
    const arr = foundry.utils.deepClone(foundry.utils.getProperty(this.item, field) ?? []);
    const defaults = {
      "system.modifiers": { target: "", value: 1 },
      "system.bonuses": { id: foundry.utils.randomID(), label: "", target: "all", dice: 1, difficulty: 0, auto: false },
      "system.powers": { level: (arr.at(-1)?.level ?? 0) + 1, name: loc("NOCTIS.js.NouveauPouvoir"), attribute: "", ability: "", difficulty: "", cost: "", duration: "", summary: "" },
      "system.sins": { level: (arr.at(-1)?.level ?? 11) - 1, sin: "" },
      "system.levels": { value: (arr.at(-1)?.value ?? 0) + 1, text: "" }
    };
    arr.push(defaults[field] ?? {});
    return this.item.update({ [field]: arr });
  }

  static async #onDeleteRow(event, target) {
    const field = target.dataset.field;
    const idx = Number(target.dataset.idx);
    const arr = foundry.utils.deepClone(foundry.utils.getProperty(this.item, field) ?? []);
    arr.splice(idx, 1);
    return this.item.update({ [field]: arr });
  }

  static async #onPickEmblem() {
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image", current: this.item.system.emblem,
      callback: path => this.item.update({ "system.emblem": path })
    });
    return fp.browse();
  }

  static async #onEditImage(event, target) {
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image", current: this.item.img,
      callback: path => this.item.update({ img: path })
    });
    return fp.browse();
  }
}
