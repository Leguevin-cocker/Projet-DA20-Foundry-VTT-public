/**
 * Aura visible : halo autour des jetons de caïnites, d'après la couleur de leur Voie et leur score.
 * Token Magic FX s'il est actif (liseré « glow » sur la silhouette), sinon lumière animée du jeton.
 * Seul le MJ actif écrit sur les jetons, pour éviter les doublons et les problèmes de droits.
 */
import { loc } from "./i18n.mjs";
const SYS = "noctis";
const FILTER_ID = `${SYS}-aura`;
const DEFAULT_COLOR = "#c9a35a";
const DARK_COLOR = "#3a0006";

const hasTMFX = () => !!game.modules.get("tokenmagic")?.active && !!globalThis.TokenMagic;
const isWriter = () => game.user === game.users.activeGM;
const mode = () => { try { return game.settings.get(SYS, "auraMode"); } catch (e) { return "all"; } };

export function registerAuraSettings() {
  game.settings.register(SYS, "auraMode", {
    name: "NOCTIS.aura.SettingName", hint: "NOCTIS.aura.SettingHint", scope: "world", config: true, type: String, default: "all",
    choices: { all: "NOCTIS.aura.ModeAll", gm: "NOCTIS.aura.ModeGM", off: "NOCTIS.aura.ModeOff" },
    onChange: () => refreshAllAuras()
  });
}

export const AURA_STYLES = () => ({ halo: loc("NOCTIS.aura.StyleHalo"), pulse: loc("NOCTIS.aura.StylePulse"), flicker: loc("NOCTIS.aura.StyleFlicker"), none: loc("NOCTIS.aura.StyleNone") });

/** Palier d'intensité selon le score : 8+ éclatant, 4 à 7 discret, 3 et moins sombre. */
export function auraTier(value) {
  return value >= 8 ? "high" : value >= 4 ? "mid" : "low";
}
export const tierLabel = (t) => ({ high: loc("NOCTIS.aura.TierHigh"), mid: loc("NOCTIS.aura.TierMid"), low: loc("NOCTIS.aura.TierLow") })[t];

function mix(hexA, hexB, t) {
  const a = foundry.utils.Color.from(hexA), b = foundry.utils.Color.from(hexB);
  return foundry.utils.Color.fromRGB([a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t]);
}

/** Paramètres de l'aura d'un acteur, ou null s'il n'en a pas. */
export function auraSpec(actor) {
  const s = actor?.system;
  if (!s?.isVampire || s.road?.showAura === false) return null;
  const road = actor.roadItem;
  const style = road?.system.auraStyle || "pulse";
  if (style === "none") return null;
  const value = s.road?.value ?? 0;
  const tier = auraTier(value);
  const base = road?.system.auraColor || DEFAULT_COLOR;
  const color = tier === "low" ? mix(base, DARK_COLOR, 0.75) : foundry.utils.Color.from(base);
  const strength = { high: 4, mid: 1.6, low: 3 }[tier];
  return { tier, style, color, strength, value };
}

/* -------------------------------------------- */

function tmfxParams(spec) {
  const p = {
    filterType: "glow", filterId: FILTER_ID, outerStrength: spec.strength, innerStrength: 0,
    color: spec.color.valueOf(), quality: 0.5, padding: 10, zOrder: 1
  };
  if (spec.style === "pulse") p.animated = { outerStrength: { active: true, loopDuration: 3000, animType: "syncCosOscillation", val1: spec.strength * 0.45, val2: spec.strength } };
  if (spec.style === "flicker") p.animated = { outerStrength: { active: true, loopDuration: 900, animType: "randomNumberPerLoop", val1: spec.strength * 0.5, val2: spec.strength } };
  if (mode() === "gm") p.users = { include: game.users.filter(u => u.isGM).map(u => u.id) };
  return p;
}

function lightData(spec) {
  const d = canvas.scene?.grid?.distance ?? 1;
  const anim = { halo: { type: "fog", speed: 1, intensity: 2 }, pulse: { type: "pulse", speed: 2, intensity: 4 }, flicker: { type: "flame", speed: 4, intensity: 4 } }[spec.style];
  return {
    dim: d * (spec.tier === "high" ? 0.6 : 0.4), bright: 0, color: spec.color.css, alpha: spec.tier === "mid" ? 0.25 : 0.45,
    luminosity: spec.tier === "low" ? -0.35 : 0.3, attenuation: 0.8, animation: anim
  };
}

async function applyToToken(tokenDoc) {
  if (!tokenDoc || !isWriter()) return;
  const actor = tokenDoc.actor;
  const spec = mode() === "off" ? null : auraSpec(actor);
  const key = JSON.stringify(spec ? [spec.tier, spec.style, spec.color.css, mode()] : null);
  const tmfx = hasTMFX();
  // Token Magic FX
  if (tmfx) {
    const placeable = tokenDoc.object;
    const prev = tokenDoc.getFlag(SYS, "auraKey");
    if (key === prev && (!spec || TokenMagic.hasFilterId(placeable ?? tokenDoc, FILTER_ID))) return;
    if (spec) await TokenMagic.addUpdateFilters(placeable ?? tokenDoc, [tmfxParams(spec)]);
    else if (TokenMagic.hasFilterId(placeable ?? tokenDoc, FILTER_ID)) await TokenMagic.deleteFilters(placeable ?? tokenDoc, FILTER_ID);
    await restoreLight(tokenDoc);
    return tokenDoc.setFlag(SYS, "auraKey", key);
  }
  // Repli : lumière du jeton (seulement si la lumière est libre ou déjà la nôtre)
  const ours = tokenDoc.getFlag(SYS, "auraLight");
  if (!spec || mode() === "gm") return restoreLight(tokenDoc);
  if (!ours && (tokenDoc.light?.dim > 0 || tokenDoc.light?.bright > 0)) return;
  if (ours && tokenDoc.getFlag(SYS, "auraKey") === key) return;
  const upd = { light: lightData(spec), [`flags.${SYS}.auraLight`]: true, [`flags.${SYS}.auraKey`]: key };
  if (!ours) upd[`flags.${SYS}.auraPrevLight`] = tokenDoc.toObject().light;
  return tokenDoc.update(upd, { [`${SYS}Aura`]: true });
}

async function restoreLight(tokenDoc) {
  if (!tokenDoc.getFlag(SYS, "auraLight")) return;
  const prev = tokenDoc.getFlag(SYS, "auraPrevLight") ?? { dim: 0, bright: 0 };
  return tokenDoc.update({ light: prev, [`flags.${SYS}.-=auraLight`]: null, [`flags.${SYS}.-=auraPrevLight`]: null, [`flags.${SYS}.-=auraKey`]: null }, { [`${SYS}Aura`]: true });
}

/** Rafraîchit les jetons d'un acteur sur la scène affichée. */
export function refreshActorAura(actor) {
  if (!canvas?.ready || !isWriter() || !actor) return;
  const docs = actor.isToken ? [actor.token] : actor.getActiveTokens(false, true);
  for (const t of docs) applyToToken(t).catch(e => console.warn(`${SYS} | aura`, e));
}

export function refreshAllAuras() {
  if (!canvas?.ready || !isWriter()) return;
  for (const t of canvas.scene.tokens) applyToToken(t).catch(e => console.warn(`${SYS} | aura`, e));
}

export function registerAuraHooks() {
  const relevant = (c) => foundry.utils.hasProperty(c, "system.road") || foundry.utils.hasProperty(c, "system.npcKind") || "items" in c;
  Hooks.on("updateActor", (actor, changes) => { if (relevant(changes)) refreshActorAura(actor); });
  const itemHook = (item) => { if (item.type === "road" && item.parent) refreshActorAura(item.parent); };
  Hooks.on("createItem", itemHook); Hooks.on("deleteItem", itemHook); Hooks.on("updateItem", itemHook);
  // Voie du monde modifiée : actualise les acteurs qui la suivent
  Hooks.on("updateItem", (item) => {
    if (item.type !== "road" || item.parent || !isWriter()) return;
    for (const a of game.actors) if (a.system.road?.name === item.name) for (const i of a.items) if (i.type === "road") i.update({ "system.auraColor": item.system.auraColor, "system.auraStyle": item.system.auraStyle });
  });
  Hooks.on("createToken", (t) => setTimeout(() => applyToToken(t), 200));
  Hooks.on("canvasReady", () => setTimeout(refreshAllAuras, 500));
}
