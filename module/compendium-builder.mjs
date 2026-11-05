/**
 * Construit les compendiums du système dans le monde à partir des fichiers
 * systems/noctis/data/*.json. Lancé automatiquement par le MJ au premier
 * chargement et à chaque mise à jour des données.
 */
export const COMPENDIUM_VERSION = "1.0.0";

/** Contenu d'exemple, écrit pour ce système : à compléter ou remplacer par celui de votre table. */
export const PACKS = [
  { name: "noctis-clans", label: "Noctis — Exemples : lignées", type: "Item", file: "clans.json", v: 1 },
  { name: "noctis-disciplines", label: "Noctis — Exemples : disciplines", type: "Item", file: "disciplines.json", v: 1 },
  { name: "noctis-merits", label: "Noctis — Exemples : atouts et handicaps", type: "Item", file: "merits.json", v: 1 },
  { name: "noctis-roads", label: "Noctis — Exemples : Voies", type: "Item", file: "roads.json", v: 1 },
  { name: "noctis-equipment", label: "Noctis — Armes et armures", type: "Item", file: "equipment.json", v: 1 }
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
  ui.notifications.info("Noctis : préparation des compendiums…");
  let folder = game.folders.find(f => f.type === "Compendium" && f.name === FOLDER_NAME);
  if (!folder) {
    try { folder = await Folder.create({ name: FOLDER_NAME, type: "Compendium", color: "#5c0a0a" }); }
    catch (e) { console.warn("NOCTIS | dossier de compendiums non créé", e); }
  }

  const done = foundry.utils.deepClone(game.settings.get("noctis", "packVersions") ?? {});
  for (const def of PACKS) {
    const existing = game.packs.get(`world.${def.name}`);
    // Packs déjà construits avant le suivi par pack : version 1.
    const have = done[def.name] ?? (existing ? 1 : 0);
    if (!replace && existing && have >= def.v) { done[def.name] = have; continue; }
    const res = await fetch(foundry.utils.getRoute(`systems/noctis/data/${def.file}`));
    if (!res.ok) { console.warn(`NOCTIS | ${def.file} introuvable`); continue; }
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
    if (oldFolders.length) { try { await Folder.deleteDocuments(oldFolders, { pack: pack.collection }); } catch (e) { console.warn("NOCTIS | dossiers", e); } }
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
    if (folder) { try { await pack.configure({ folder: folder.id }); } catch (e) { console.warn("NOCTIS | dossier", e); } }
    await pack.configure({ locked: true });
    done[def.name] = def.v;
  }
  await game.settings.set("noctis", "packVersions", done);
  ui.notifications.info("Noctis : compendiums d'exemple prêts (onglet Compendiums).");
}
