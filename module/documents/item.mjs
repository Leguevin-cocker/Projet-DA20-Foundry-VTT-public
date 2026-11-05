import { NOCTIS } from "../config.mjs";

const DEFAULT_ICONS = Object.fromEntries(
  ["clan", "discipline", "merit", "flaw", "ability", "road", "weapon", "armor", "gear", "ritual", "derangement"]
    .map(t => [t, `systems/noctis/assets/icons/${t}.svg`])
);

export class NOCTISItem extends Item {
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (!data.img || data.img === "icons/svg/item-bag.svg") this.updateSource({ img: DEFAULT_ICONS[data.type] ?? "icons/svg/item-bag.svg" });
  }

  static get defaultIcons() { return DEFAULT_ICONS; }

  /** Libellé lisible des disciplines de clan. */
  get clanDisciplineLabels() {
    return (this.system.disciplines ?? []).map(k => NOCTIS.disciplines[k] ?? k);
  }
}
