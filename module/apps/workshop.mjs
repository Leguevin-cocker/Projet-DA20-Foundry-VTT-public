/**
 * Atelier du conteur : crée et range le contenu de la table (lignées, disciplines, Voies, atouts…).
 * Rassemble les objets du monde et ceux des compendiums ; un clic ouvre l'éditeur de l'objet.
 */
import { gatherItems, disciplineKey, refreshDisciplineRegistry } from "../registry.mjs";
import { NOCTIS } from "../config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const KINDS = {
  clan: { label: "Lignées", one: "lignée", icon: "fa-solid fa-sitemap", types: ["clan"], help: "Disciplines de lignée, faiblesse (texte et effets : Apparence à 0, XP de morale doublée, bonus ou malus de jet), blason." },
  discipline: { label: "Disciplines et voies", one: "discipline", icon: "fa-solid fa-droplet", types: ["discipline"], help: "Pouvoirs par niveau (groupement, difficulté, coût, durée), rôle mécanique éventuel (Vélocité, Résilience, Vigueur surnaturelle). Une voie de sorcellerie est une discipline cochée « voie » qui désigne sa discipline mère." },
  road: { label: "Voies (morale)", one: "Voie", icon: "fa-solid fa-scale-balanced", types: ["road"], help: "Vertus utilisées et hiérarchie des péchés, du plus léger (10) au plus grave (1)." },
  merit: { label: "Atouts et handicaps", one: "atout", icon: "fa-solid fa-star-half-stroke", types: ["merit", "flaw"], help: "Coût, catégorie, niveaux éventuels avec le texte de chacun, bonus de jet automatiques." },
  ritual: { label: "Rituels", one: "rituel", icon: "fa-solid fa-book-skull", types: ["ritual"], help: "Rituels de sorcellerie : niveau, voie, groupement." },
  gear: { label: "Armes, armures, objets", one: "objet", icon: "fa-solid fa-khanda", types: ["weapon", "armor", "gear"], help: "Dégâts, portée, perforation, feu ; protection et pénalité des armures." },
  derangement: { label: "Dérangements", one: "dérangement", icon: "fa-solid fa-brain", types: ["derangement"], help: "Troubles de l'esprit à glisser sur les fiches." }
};

const TYPE_LABELS = { clan: "Lignée", discipline: "Discipline", road: "Voie", merit: "Atout", flaw: "Handicap", ritual: "Rituel", weapon: "Arme", armor: "Armure", gear: "Objet", derangement: "Dérangement" };
const MY_PACK = "noctis-mon-contenu";

export class Workshop extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "noctis-workshop",
    tag: "div",
    classes: ["noctis", "noctis-window", "noctis-workshop"],
    window: { title: "Atelier du conteur", icon: "fa-solid fa-hammer", resizable: true },
    position: { width: 900, height: 700 },
    actions: {
      kind: Workshop.#onKind,
      create: Workshop.#onCreate,
      open: Workshop.#onOpen,
      copy: Workshop.#onCopy,
      remove: Workshop.#onRemove,
      exportAll: Workshop.#onExport
    }
  };

  static PARTS = { body: { template: "systems/noctis/templates/apps/workshop.hbs", scrollable: [".ws-list"] } };

  kind = "clan";

  static open() {
    if (!game.user.isGM) return ui.notifications.warn("L'atelier est réservé au conteur.");
    const app = foundry.applications.instances?.get?.("noctis-workshop") ?? new Workshop();
    return app.render({ force: true });
  }

  async _prepareContext() {
    const k = KINDS[this.kind];
    const all = await gatherItems(Object.values(KINDS).flatMap(x => x.types), ["system.key", "system.isPath", "system.parent", "system.mechanic", "system.cost", "system.category", "system.disciplines", "system.powers"]);
    const counts = Object.fromEntries(Object.keys(KINDS).map(key => [key, all.filter(e => KINDS[key].types.includes(e.type)).length]));
    const list = all.filter(e => k.types.includes(e.type)).map(e => {
      const sys = e.system ?? {};
      const bits = [];
      if (e.type === "discipline") {
        if (sys.isPath) bits.push(`voie de ${NOCTIS.disciplines[sys.parent] ?? sys.parent ?? "?"}`);
        if (sys.mechanic) bits.push(NOCTIS.mechanicNames[sys.mechanic]);
        if (sys.powers?.length) bits.push(`${sys.powers.length} pouvoir(s)`);
        bits.push(`clé « ${disciplineKey(e)} »`);
      }
      if (e.type === "clan") bits.push((sys.disciplines ?? []).map(x => NOCTIS.disciplines[x] ?? x).join(", ") || "aucune discipline");
      if (["merit", "flaw"].includes(e.type)) bits.push(`${sys.cost ?? 0} pt · ${NOCTIS.meritCategories[sys.category] ?? ""}`);
      return { ...e, typeLabel: TYPE_LABELS[e.type], world: e.source === "Monde", info: bits.filter(Boolean).join(" · ") };
    }).sort((a, b) => (b.world - a.world) || a.name.localeCompare(b.name, "fr"));
    return {
      kinds: Object.entries(KINDS).map(([key, v]) => ({ key, ...v, count: counts[key], active: key === this.kind })),
      current: { key: this.kind, ...k }, list, hasList: list.length > 0,
      createTypes: k.types.map(t => ({ type: t, label: TYPE_LABELS[t] })),
      worldCount: game.items.filter(i => Object.values(KINDS).flatMap(x => x.types).includes(i.type)).length
    };
  }

  static #onKind(event, target) { this.kind = target.dataset.kind; this.render(); }

  static async #onCreate(event, target) {
    const type = target.dataset.type;
    const doc = await Item.create({ name: `${TYPE_LABELS[type]} sans nom`, type, img: `systems/noctis/assets/icons/${({ clan: "clan", discipline: "discipline", road: "road", merit: "merit", flaw: "flaw", ritual: "ritual", weapon: "weapon", armor: "armor", gear: "gear", derangement: "derangement" })[type]}.svg` });
    doc?.sheet.render({ force: true });
    this.render();
  }

  static async #onOpen(event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    doc?.sheet.render({ force: true });
  }

  /** Copie un objet de compendium dans le monde pour le modifier. */
  static async #onCopy(event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    if (!doc) return;
    const data = doc.toObject(); delete data._id; delete data.folder;
    const created = await Item.create(data);
    created?.sheet.render({ force: true });
    ui.notifications.info(`« ${doc.name} » copié dans le monde : vous pouvez le modifier.`);
    this.render();
  }

  static async #onRemove(event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    if (!doc || doc.pack) return;
    const ok = await DialogV2.confirm({ window: { title: "Supprimer" }, content: `<p>Supprimer « ${doc.name} » du monde ?</p>`, rejectClose: false });
    if (!ok) return;
    await doc.delete();
    this.render();
  }

  /** Range le contenu du monde dans un compendium « Noctis — Mon contenu » (remplace les objets de même nom). */
  static async #onExport() {
    const types = Object.values(KINDS).flatMap(x => x.types);
    const items = game.items.filter(i => types.includes(i.type));
    if (!items.length) return ui.notifications.warn("Aucun contenu dans le monde à ranger.");
    let pack = game.packs.get(`world.${MY_PACK}`);
    if (!pack) pack = await foundry.documents.collections.CompendiumCollection.createCompendium({ type: "Item", label: "Noctis — Mon contenu", name: MY_PACK, package: "world" });
    await pack.configure({ locked: false });
    const idx = await pack.getIndex();
    const replace = idx.filter(e => items.some(i => i.name === e.name && i.type === e.type)).map(e => e._id);
    if (replace.length) await Item.deleteDocuments(replace, { pack: pack.collection });
    await Item.createDocuments(items.map(i => { const d = i.toObject(); delete d._id; delete d.folder; return d; }), { pack: pack.collection });
    await refreshDisciplineRegistry();
    ui.notifications.info(`${items.length} objet(s) rangé(s) dans le compendium « Noctis — Mon contenu ». Vous pouvez l'exporter vers d'autres mondes.`);
    this.render();
  }
}
