/**
 * Atelier du conteur : crée et range le contenu de la table (lignées, disciplines, Voies, atouts…).
 * Rassemble les objets du monde et ceux des compendiums ; un clic ouvre l'éditeur de l'objet.
 */
import { gatherItems, disciplineKey, refreshDisciplineRegistry } from "../registry.mjs";
import { NOCTIS } from "../config.mjs";
import { loc, registerLocalizable } from "../i18n.mjs";
import { USES_CHOICES, DAMAGE_CHOICES, EFFECT_CHOICES, refreshContentRegistry } from "../content-registry.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const KINDS = {
  clan: { label: "NOCTIS.js.Lignees", one: "NOCTIS.js.Lignee", icon: "fa-solid fa-sitemap", types: ["clan"], help: "NOCTIS.js.DisciplinesDeLigneeFaiblesseTexteEt" },
  discipline: { label: "NOCTIS.js.DisciplinesEtVoies", one: "NOCTIS.js.KindOneDiscipline", icon: "fa-solid fa-droplet", types: ["discipline"], help: "NOCTIS.js.PouvoirsParNiveauGroupementDifficulteCou" },
  road: { label: "NOCTIS.js.VoiesMorale", one: "NOCTIS.js.Voie", icon: "fa-solid fa-scale-balanced", types: ["road"], help: "NOCTIS.js.VertusUtiliseesEtHierarchieDesPeches" },
  merit: { label: "NOCTIS.js.AtoutsEtHandicaps", one: "NOCTIS.js.KindOneAtout", icon: "fa-solid fa-star-half-stroke", types: ["merit", "flaw"], help: "NOCTIS.js.CoutCategorieNiveauxEventuelsAvecLe" },
  ritual: { label: "NOCTIS.js.Rituels", one: "NOCTIS.js.KindOneRituel", icon: "fa-solid fa-book-skull", types: ["ritual"], help: "NOCTIS.js.RituelsDeSorcellerieNiveauVoieGroupement" },
  gear: { label: "NOCTIS.js.ArmesArmuresObjets", one: "NOCTIS.js.KindOneObjet", icon: "fa-solid fa-khanda", types: ["weapon", "armor", "gear"], help: "NOCTIS.js.DegatsPorteePerforationFeuProtectionEt" },
  background: { label: "NOCTIS.content.Backgrounds", one: "NOCTIS.content.Background", icon: "fa-solid fa-landmark", types: ["background"], help: "NOCTIS.content.BgHelp" },
  maneuver: { label: "NOCTIS.content.Maneuvers", one: "NOCTIS.content.Maneuver", icon: "fa-solid fa-hand-fist", types: ["maneuver"], help: "NOCTIS.content.ManHelp" },
  derangement: { label: "NOCTIS.js.Derangements", one: "NOCTIS.js.Derangement", icon: "fa-solid fa-brain", types: ["derangement"], help: "NOCTIS.js.TroublesDeLEspritAGlisser" }
};

const TYPE_LABELS = { clan: "NOCTIS.js.Lignee2", discipline: "NOCTIS.js.Discipline", road: "NOCTIS.js.Voie", merit: "NOCTIS.js.Atout", flaw: "NOCTIS.js.Handicap", ritual: "NOCTIS.js.Rituel", weapon: "NOCTIS.js.Arme", armor: "NOCTIS.js.Armure", gear: "NOCTIS.js.Objet", derangement: "NOCTIS.js.Derangement2", background: "NOCTIS.content.Background", maneuver: "NOCTIS.content.Maneuver" };
const MY_PACK = "noctis-mon-contenu";

export class Workshop extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "noctis-workshop",
    tag: "div",
    classes: ["noctis", "noctis-window", "noctis-workshop"],
    window: { title: loc("NOCTIS.js.AtelierDuConteur"), icon: "fa-solid fa-hammer", resizable: true },
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
    if (!game.user.isGM) return ui.notifications.warn(loc("NOCTIS.js.LAtelierEstReserveAuConteur"));
    const app = foundry.applications.instances?.get?.("noctis-workshop") ?? new Workshop();
    return app.render({ force: true });
  }

  async _prepareContext() {
    const k = KINDS[this.kind];
    const all = await gatherItems(Object.values(KINDS).flatMap(x => x.types), ["system.key", "system.isPath", "system.parent", "system.mechanic", "system.cost", "system.category", "system.disciplines", "system.powers", "system.max", "system.uses", "system.short", "system.diff", "system.damage", "system.effect"]);
    const counts = Object.fromEntries(Object.keys(KINDS).map(key => [key, all.filter(e => KINDS[key].types.includes(e.type)).length]));
    const list = all.filter(e => k.types.includes(e.type)).map(e => {
      const sys = e.system ?? {};
      const bits = [];
      if (e.type === "discipline") {
        if (sys.isPath) bits.push(loc("NOCTIS.js.VoieDe", { p0: NOCTIS.disciplines[sys.parent] ?? sys.parent ?? "?" }));
        if (sys.mechanic) bits.push(NOCTIS.mechanicNames[sys.mechanic]);
        if (sys.powers?.length) bits.push(`${sys.powers.length} pouvoir(s)`);
        bits.push(loc("NOCTIS.js.Cle", { p0: disciplineKey(e) }));
      }
      if (e.type === "clan") bits.push((sys.disciplines ?? []).map(x => NOCTIS.disciplines[x] ?? x).join(", ") || loc("NOCTIS.js.AucuneDiscipline"));
      if (e.type === "background") bits.push(`max ${sys.max ?? 5}`);
      if (e.type === "maneuver") bits.push([USES_CHOICES()[sys.uses], sys.short || DAMAGE_CHOICES()[sys.damage], EFFECT_CHOICES()[sys.effect ?? ""]].filter(x => x && x !== EFFECT_CHOICES()[""]).join(" · "));
      if (["merit", "flaw"].includes(e.type)) bits.push(`${sys.cost ?? 0} pt · ${NOCTIS.meritCategories[sys.category] ?? ""}`);
      return { ...e, typeLabel: TYPE_LABELS[e.type], world: e.source === loc("NOCTIS.js.Monde"), info: bits.filter(Boolean).join(" · ") };
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
    const doc = await Item.create({ name: loc("NOCTIS.js.SansNom", { p0: TYPE_LABELS[type] }), type, img: `systems/noctis/assets/icons/${({ clan: "clan", discipline: "discipline", road: "road", merit: "merit", flaw: "flaw", ritual: "ritual", weapon: "weapon", armor: "armor", gear: "gear", derangement: "derangement", background: "background", maneuver: "maneuver" })[type]}.svg` });
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
    ui.notifications.info(loc("NOCTIS.js.CopieDansLeMondeVousPouvez", { name: doc.name }));
    this.render();
  }

  static async #onRemove(event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    if (!doc || doc.pack) return;
    const ok = await DialogV2.confirm({ window: { title: loc("NOCTIS.js.Supprimer") }, content: loc("NOCTIS.js.SupprimerDuMonde", { name: doc.name }), rejectClose: false });
    if (!ok) return;
    await doc.delete();
    this.render();
  }

  /** Range le contenu du monde dans un compendium « Noctis — Mon contenu » (remplace les objets de même nom). */
  static async #onExport() {
    const types = Object.values(KINDS).flatMap(x => x.types);
    const items = game.items.filter(i => types.includes(i.type));
    if (!items.length) return ui.notifications.warn(loc("NOCTIS.js.AucunContenuDansLeMondeA"));
    let pack = game.packs.get(`world.${MY_PACK}`);
    if (!pack) pack = await foundry.documents.collections.CompendiumCollection.createCompendium({ type: "Item", label: loc("NOCTIS.js.NoctisMonContenu"), name: MY_PACK, package: "world" });
    await pack.configure({ locked: false });
    const idx = await pack.getIndex();
    const replace = idx.filter(e => items.some(i => i.name === e.name && i.type === e.type)).map(e => e._id);
    if (replace.length) await Item.deleteDocuments(replace, { pack: pack.collection });
    await Item.createDocuments(items.map(i => { const d = i.toObject(); delete d._id; delete d.folder; return d; }), { pack: pack.collection });
    await refreshDisciplineRegistry();
    await refreshContentRegistry();
    ui.notifications.info(loc("NOCTIS.js.ObjetSRangeSDansLe", { length: items.length }));
    this.render();
  }
}

registerLocalizable(KINDS, TYPE_LABELS);
