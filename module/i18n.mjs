/**
 * Traduction : t() pour le code, localizeDeep() pour les tables construites au chargement des modules.
 * Les tables portent des clés « NOCTIS.… » qui sont traduites au hook i18nInit.
 */

const MARKER = /NOCTIS\.(?:js|ui|data|moral|profile|aura|content)\.[A-Za-z0-9]+/g;
const ready = () => !!globalThis.game?.i18n?.translations && Object.keys(game.i18n.translations).length > 0;

/** Traduit une clé, avec remplacement des {variables}. */
export function loc(key, data) {
  if (!ready()) return key;
  return data ? game.i18n.format(key, data) : game.i18n.localize(key);
}

/** Remplace les clés présentes dans une chaîne. */
export function localizeString(s) {
  if (typeof s !== "string" || !s.includes("NOCTIS.")) return s;
  return s.replace(MARKER, k => game.i18n.has(k) ? game.i18n.localize(k) : k);
}

/** Parcourt un objet ou un tableau et traduit toutes les chaînes-clés qu'il contient (sur place). */
export function localizeDeep(obj, seen = new Set()) {
  if (!obj || typeof obj !== "object" || seen.has(obj)) return obj;
  seen.add(obj);
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === "string") obj[k] = localizeString(v);
    else if (v && typeof v === "object") localizeDeep(v, seen);
  }
  return obj;
}

const REGISTRY = [];
/** Inscrit des tables à traduire au chargement des langues. */
export function registerLocalizable(...objs) { REGISTRY.push(...objs); }
export function localizeRegistered() { const seen = new Set(); for (const o of REGISTRY) localizeDeep(o, seen); }
export const t = loc;
