/**
 * Registre des disciplines du monde : rien n'est figé dans le code, chaque table crée ses disciplines.
 * Les clés servent à relier clans, voies de sorcellerie et fiches ; par défaut, la clé vient du nom.
 */
import { NOCTIS } from "./config.mjs";

/** Clé technique tirée d'un nom : « Ombre Vive » → « ombre-vive ». */
export const slugKey = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Clé d'une discipline (objet ou entrée d'index). */
export const disciplineKey = (it) => it?.system?.key || slugKey(it?.name);

let timer = null;

/** Relit les disciplines des objets du monde et des compendiums d'objets. */
export async function refreshDisciplineRegistry() {
  const out = {};
  for (const it of game.items ?? []) if (it.type === "discipline" && !it.system.isPath) out[disciplineKey(it)] = it.name;
  for (const pack of game.packs ?? []) {
    if (pack.documentName !== "Item") continue;
    try {
      const idx = await pack.getIndex({ fields: ["system.key", "system.isPath"] });
      for (const e of idx) if (e.type === "discipline" && !e.system?.isPath) out[disciplineKey(e)] ??= e.name;
    } catch (err) { console.warn(`NOCTIS | index de ${pack.collection}`, err); }
  }
  for (const k of Object.keys(NOCTIS.disciplines)) delete NOCTIS.disciplines[k];
  for (const [k, v] of Object.entries(out).sort((a, b) => a[1].localeCompare(b[1], "fr"))) NOCTIS.disciplines[k] = v;
  return NOCTIS.disciplines;
}

/** Relecture différée après une création, modification ou suppression. */
export function queueRegistryRefresh() {
  clearTimeout(timer);
  timer = setTimeout(() => refreshDisciplineRegistry(), 300);
}

/**
 * Toutes les entrées d'un ou plusieurs types d'objets : objets du monde d'abord, puis compendiums d'objets.
 * Chaque entrée a _id, uuid, name, img, type et system (champs demandés).
 */
export async function gatherItems(types, fields = []) {
  const out = [];
  const seen = new Set();
  for (const it of game.items ?? []) {
    if (!types.includes(it.type)) continue;
    out.push({ _id: it.id, uuid: it.uuid, name: it.name, img: it.img, type: it.type, system: it.system.toObject?.() ?? foundry.utils.deepClone(it.system), source: "Monde" });
    seen.add(`${it.type}|${it.name}`);
  }
  for (const pack of game.packs ?? []) {
    if (pack.documentName !== "Item") continue;
    let idx;
    try { idx = await pack.getIndex({ fields }); } catch (err) { console.warn(`NOCTIS | index de ${pack.collection}`, err); continue; }
    for (const e of idx) {
      if (!types.includes(e.type) || seen.has(`${e.type}|${e.name}`)) continue;
      seen.add(`${e.type}|${e.name}`);
      out.push({ ...e, system: e.system ?? {}, uuid: e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}`, source: pack.metadata.label });
    }
  }
  return out;
}

/** Document d'une discipline (pas une voie) d'après sa clé, cherché dans le monde puis les compendiums. */
export async function findDiscipline(key) {
  const list = await gatherItems(["discipline"], ["system.key", "system.isPath"]);
  const e = list.find(x => !x.system?.isPath && disciplineKey(x) === key);
  return e ? fromUuid(e.uuid) : null;
}
