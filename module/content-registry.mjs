/**
 * Contenu de l'atelier : historiques et manœuvres de combat créés par la table (objets « background » et « maneuver »).
 * Ils complètent les listes du jeu au chargement et à chaque modification.
 */
import { NOCTIS } from "./config.mjs";
import { MANEUVERS } from "./combat/maneuvers.mjs";
import { loc } from "./i18n.mjs";

export const slugKey = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const contentKey = (it) => it?.system?.key || slugKey(it?.name);
const plain = (html) => String(html ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

/** Toutes les entrées d'un ou plusieurs types : monde d'abord, puis compendiums d'objets. */
export async function gatherContent(types, fields = []) {
  const out = [], seen = new Set();
  for (const it of game.items ?? []) {
    if (!types.includes(it.type)) continue;
    out.push({ _id: it.id, uuid: it.uuid, name: it.name, img: it.img, type: it.type, system: it.system.toObject?.() ?? foundry.utils.deepClone(it.system), source: loc("NOCTIS.js.Monde"), world: true });
    seen.add(`${it.type}|${it.name}`);
  }
  for (const pack of game.packs ?? []) {
    if (pack.documentName !== "Item") continue;
    let idx;
    try { idx = await pack.getIndex({ fields }); } catch (err) { console.warn(`${pack.collection}`, err); continue; }
    for (const e of idx) {
      if (!types.includes(e.type) || seen.has(`${e.type}|${e.name}`)) continue;
      seen.add(`${e.type}|${e.name}`);
      out.push({ ...e, system: e.system ?? {}, uuid: e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}`, source: pack.metadata.label, world: false });
    }
  }
  return out;
}

const DMG = ["weapon", "weapon+1", "weapon+2", "str", "str+1", "str+2", "none"];
const USES = ["weapon", "unarmed", "ranged"];

/** Résumé court d'une manœuvre de l'atelier. */
function shortOf(s) {
  const bits = [];
  if (s.diff) bits.push(((d) => loc("NOCTIS.content.ShortDiff", d))({ n: (s.diff > 0 ? "+" : "") + s.diff }));
  if (s.dice) bits.push(((d) => loc("NOCTIS.content.ShortDice", d))({ n: (s.dice > 0 ? "+" : "") + s.dice }));
  bits.push(((d) => loc("NOCTIS.content.ShortDmg", d))({ d: DAMAGE_CHOICES()[s.damage] ?? s.damage }));
  return bits.join(" · ");
}

export const DAMAGE_CHOICES = () => ({ weapon: loc("NOCTIS.content.DmgWeapon"), "weapon+1": loc("NOCTIS.content.DmgWeapon1"), "weapon+2": loc("NOCTIS.content.DmgWeapon2"), str: loc("NOCTIS.content.DmgStr"), "str+1": loc("NOCTIS.content.DmgStr1"), "str+2": loc("NOCTIS.content.DmgStr2"), none: loc("NOCTIS.content.DmgNone") });
export const USES_CHOICES = () => ({ weapon: loc("NOCTIS.content.UsesWeapon"), unarmed: loc("NOCTIS.content.UsesUnarmed"), ranged: loc("NOCTIS.content.UsesRanged") });
export const EFFECT_CHOICES = () => ({ "": loc("NOCTIS.content.EffNone"), prone: loc("NOCTIS.content.EffProne"), grapple: loc("NOCTIS.content.EffGrapple"), hold: loc("NOCTIS.content.EffHold"), tackle: loc("NOCTIS.content.EffTackle"), disarm: loc("NOCTIS.content.EffDisarm"), stake: loc("NOCTIS.content.EffStake"), feed: loc("NOCTIS.content.EffFeed"), power: loc("NOCTIS.content.EffPower"), riposte: loc("NOCTIS.content.EffRiposte"), suppress: loc("NOCTIS.content.EffSuppress") });

let CORE_BG = null;
let timer = null;

export async function refreshContentRegistry() {
  CORE_BG ??= { ...NOCTIS.backgrounds };
  const list = await gatherContent(["background", "maneuver"], ["system.key", "system.max", "system.description", "system.uses", "system.attribute", "system.ability", "system.dice", "system.diff", "system.damage", "system.damageType", "system.effect", "system.short"]);
  // Historiques
  const bgs = { ...CORE_BG };
  NOCTIS.backgroundInfo = {};
  for (const e of list.filter(x => x.type === "background")) {
    const k = contentKey(e);
    if (!k) continue;
    bgs[k] = e.name;
    NOCTIS.backgroundInfo[k] = { name: e.name, description: plain(e.system.description), max: e.system.max ?? 5, uuid: e.uuid, custom: !(k in CORE_BG) };
  }
  for (const k of Object.keys(NOCTIS.backgrounds)) delete NOCTIS.backgrounds[k];
  for (const [k, v] of Object.entries(bgs).sort((a, b) => a[1].localeCompare(b[1], game.i18n?.lang ?? "fr"))) NOCTIS.backgrounds[k] = v;
  // Manœuvres
  for (const [k, m] of Object.entries(MANEUVERS)) if (m.custom) delete MANEUVERS[k];
  const groupOf = (uses) => Object.values(MANEUVERS).find(m => m.uses === uses)?.group ?? uses;
  for (const e of list.filter(x => x.type === "maneuver")) {
    const s = e.system;
    const uses = USES.includes(s.uses) ? s.uses : "weapon";
    const key = `ws-${contentKey(e)}`;
    MANEUVERS[key] = {
      custom: true, uses, group: groupOf(uses), label: `${e.name}`, short: s.short || shortOf(s),
      pool: s.attribute && s.ability ? [s.attribute, s.ability] : null,
      dice: s.dice || 0, diff: s.diff || 0, damage: DMG.includes(s.damage) ? s.damage : "weapon",
      type: s.damageType || undefined, effect: s.effect || undefined,
      tip: plain(s.description) || (s.short || shortOf(s))
    };
    if (!MANEUVERS[key].pool) delete MANEUVERS[key].pool;
  }
  return { backgrounds: NOCTIS.backgrounds, maneuvers: MANEUVERS };
}

export function queueContentRefresh(doc) {
  if (doc && !["background", "maneuver"].includes(doc.type) && doc.documentName !== "Compendium") return;
  clearTimeout(timer);
  timer = setTimeout(() => refreshContentRegistry().then(() => { for (const app of foundry.applications.instances?.values?.() ?? []) if (app.document?.documentName === "Actor" && app.rendered) app.render(); }), 300);
}

export function registerContentHooks() {
  Hooks.once("ready", () => refreshContentRegistry().then(() => { for (const a of game.actors) if (a.sheet?.rendered) a.sheet.render(); }));
  for (const h of ["createItem", "updateItem", "deleteItem"]) Hooks.on(h, (doc) => { if (!doc.parent) queueContentRefresh(doc); });
  Hooks.on("updateCompendium", () => queueContentRefresh());
}
