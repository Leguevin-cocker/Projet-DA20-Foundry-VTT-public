import { loc, registerLocalizable } from "./i18n.mjs";
/**
 * Construit les compendiums du système dans le monde à partir des fichiers
 * systems/noctis/data/*.json. Lancé automatiquement par le MJ au premier
 * chargement et à chaque mise à jour des données.
 */
export const COMPENDIUM_VERSION = "1.0.0";

/** Contenu d'exemple, écrit pour ce système : à compléter ou remplacer par celui de votre table. */
export const PACKS = [
  { name: "noctis-clans", label: "NOCTIS.js.NoctisExemplesLignees", type: "Item", file: "clans.json", v: 1 },
  { name: "noctis-disciplines", label: "NOCTIS.js.NoctisExemplesDisciplines", type: "Item", file: "disciplines.json", v: 1 },
  { name: "noctis-merits", label: "NOCTIS.js.NoctisExemplesAtoutsEtHandicaps", type: "Item", file: "merits.json", v: 1 },
  { name: "noctis-roads", label: "NOCTIS.js.NoctisExemplesVoies", type: "Item", file: "roads.json", v: 1 },
  { name: "noctis-equipment", label: "NOCTIS.js.NoctisArmesEtArmures", type: "Item", file: "equipment.json", v: 1 }
];

/** Identifiant stable (16 caractères) tiré du pack et du nom : les liens vers les objets survivent aux reconstructions. */
function stableId(pack, name, type) {
  const str = `${pack}|${type}|${name}`;
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 ^ c, 2246822519) >>> 0; }
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "", x = h1, y = h2;
  for (let i = 0; i < 16; i++) { const v = i < 8 ? x : y; out += chars[(v >>> ((i % 8) * 4)) % 62]; if (i % 8 === 7) { x = Math.imul(x, 31) >>> 0; y = Math.imul(y, 37) >>> 0; } }
  return out;
}

const FOLDER_NAME = "Noctis";

export async function buildCompendiums(replace = false) {
  const CC = foundry.documents.collections.CompendiumCollection;
  ui.notifications.info(loc("NOCTIS.js.NoctisPreparationDesCompendiums"));
  let folder = game.folders.find(f => f.type === "Compendium" && f.name === FOLDER_NAME);
  if (!folder) {
    try { folder = await Folder.create({ name: FOLDER_NAME, type: "Compendium", color: "#5c0a0a" }); }
    catch (e) { console.warn(loc("NOCTIS.js.NoctisDossierDeCompendiumsNonCree"), e); }
  }

  const done = foundry.utils.deepClone(game.settings.get("noctis", "packVersions") ?? {});
  // Exemples en français pour une partie en français, en anglais sinon
  const lang = game.i18n.lang === "fr" ? "fr" : "en";
  const dir = lang === "fr" ? "data" : "data/en";
  for (const def of PACKS) {
    let existing = game.packs.get(`world.${def.name}`);
    // Packs déjà construits avant le suivi par pack : version 1.
    const have = done[def.name] ?? (existing ? 1 : 0);
    const sameLang = (done[`${def.name}:lang`] ?? "fr") === lang;
    if (!replace && existing && have >= def.v && sameLang) { done[def.name] = have; continue; }
    // Changement de langue : on recrée le compendium (nom et libellé)
    if (existing && !sameLang) { try { await existing.deleteCompendium(); existing = null; } catch (e) { console.warn("NOCTIS |", e); } }
    const res = await fetch(foundry.utils.getRoute(`systems/noctis/${dir}/${def.file}`));
    if (!res.ok) { console.warn(loc("NOCTIS.js.NoctisIntrouvable", { file: def.file })); continue; }
    const docs = await res.json();
    let pack = game.packs.get(`world.${def.name}`);
    if (!pack) {
      pack = await CC.createCompendium({ type: def.type, label: def.label, name: def.name, package: "world" });
    } else if (replace) {
      await pack.configure({ locked: false });
      const ids = (await pack.getIndex()).map(e => e._id);
      if (ids.length) await Item.deleteDocuments(ids, { pack: pack.collection });
    } else {
      await pack.configure({ locked: false });
      const ids = (await pack.getIndex()).map(e => e._id);
      if (ids.length) await Item.deleteDocuments(ids, { pack: pack.collection });
    }
    const oldFolders = pack.folders?.map(f => f.id) ?? [];
    if (oldFolders.length) { try { await Folder.deleteDocuments(oldFolders, { pack: pack.collection }); } catch (e) { console.warn(loc("NOCTIS.js.NoctisDossiers"), e); } }
    // Dossiers internes (par catégorie)
    const folderIds = {};
    const folderNames = [...new Set(docs.map(d => d.folder).filter(Boolean))];
    for (const fname of folderNames) {
      const f = await Folder.create({ name: fname, type: def.type }, { pack: pack.collection });
      folderIds[fname] = f?.id;
    }
    const seen = new Set();
    const clean = docs.map(d => {
      const c = foundry.utils.deepClone(d);
      if (c.folder) c.folder = folderIds[c.folder] ?? null;
      c._id = stableId(def.name, c.name, c.type);
      while (seen.has(c._id)) c._id = stableId(def.name, c.name + "+", c.type + seen.size);
      seen.add(c._id);
      return c;
    });
    for (let i = 0; i < clean.length; i += 100) {
      await Item.createDocuments(clean.slice(i, i + 100), { pack: pack.collection, keepId: true });
    }
    if (folder) { try { await pack.configure({ folder: folder.id }); } catch (e) { console.warn(loc("NOCTIS.js.NoctisDossier"), e); } }
    await pack.configure({ locked: true });
    done[def.name] = def.v;
    done[`${def.name}:lang`] = lang;
  }
  await game.settings.set("noctis", "packVersions", done);
  ui.notifications.info(loc("NOCTIS.js.NoctisCompendiumsDExemplePretsOnglet"));
}

registerLocalizable(PACKS);
