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

export const AURA_STYLES = () => ({ halo: loc("NOCTIS.aura.StyleHalo"), pulse: loc("NOCTIS.aura.StylePulse"), flicker: loc("NOCTIS.aura.StyleFlicker"), tentacles: loc("NOCTIS.aura.StyleTentacles"), waves: loc("NOCTIS.aura.StyleWaves"), radiant: loc("NOCTIS.aura.StyleRadiant"), none: loc("NOCTIS.aura.StyleNone") });

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
  const strength = { high: 10, mid: 4, low: 8 }[tier];
  // Score bas : quel que soit le style, la Bête affleure en tentacules sombres
  const shown = tier === "low" ? "tentacles" : style;
  return { tier, style: shown, color, strength, value, size: { high: 1, mid: 0.6, low: 1.2 }[tier] };
}

/* -------------------------------------------- */

const FILTER_IDS = [FILTER_ID, `${FILTER_ID}-2`];

/** Filtres Token Magic FX selon le style : halo, pulsation, vacillement, tentacules, ondulations, rayonnement. */
function tmfxParams(spec) {
  const c = spec.color.valueOf(), k = spec.size;
  const glow = {
    filterType: "glow", filterId: FILTER_ID, outerStrength: spec.strength, innerStrength: 0,
    color: c, quality: 0.5, padding: 80, distance: 40, zOrder: 1
  };
  let list;
  switch (spec.style) {
    case "pulse":
      glow.animated = { outerStrength: { active: true, loopDuration: 3000, animType: "syncCosOscillation", val1: spec.strength * 0.45, val2: spec.strength } };
      list = [glow]; break;
    case "flicker":
      glow.animated = { outerStrength: { active: true, loopDuration: 900, animType: "randomNumberPerLoop", val1: spec.strength * 0.5, val2: spec.strength } };
      list = [glow]; break;
    case "tentacles":
      // Volutes qui se tordent hors de la silhouette (xglow « brûlant »)
      list = [{
        filterType: "xglow", filterId: FILTER_ID, auraType: 2, color: c, thickness: 14 * k, scale: 2.5, time: 0,
        auraIntensity: 2.5, subAuraIntensity: 1.6, threshold: 0.3, discard: false, zOrder: 1,
        animated: {
          time: { active: true, speed: 0.0022, animType: "move" },
          thickness: { active: true, loopDuration: 4000, animType: "cosOscillation", val1: 9 * k, val2: 18 * k }
        }
      }]; break;
    case "waves":
      // Halo lisse qui ondule (xglow « glacial »)
      list = [{
        filterType: "xglow", filterId: FILTER_ID, auraType: 1, color: c, thickness: 10 * k, scale: 3, time: 0,
        auraIntensity: 1.6, subAuraIntensity: 0.6, threshold: 0.5, discard: false, zOrder: 1,
        animated: {
          time: { active: true, speed: 0.0012, animType: "move" },
          thickness: { active: true, loopDuration: 5000, animType: "cosOscillation", val1: 6 * k, val2: 13 * k },
          subAuraIntensity: { active: true, loopDuration: 7000, animType: "cosOscillation", val1: 0.4, val2: 0.9 }
        }
      }]; break;
    case "radiant":
      // Halo + rayons tournants
      glow.animated = { outerStrength: { active: true, loopDuration: 4000, animType: "syncCosOscillation", val1: spec.strength * 0.6, val2: spec.strength } };
      list = [glow, {
        filterType: "xray", filterId: `${FILTER_ID}-2`, time: 0, color: c, blend: 9, dimX: 1, dimY: 1,
        anchorX: 0.5, anchorY: 0.5, divisor: 24, intensity: 2.5 * k, zOrder: 2,
        animated: { time: { active: true, speed: 0.0008, animType: "move" } }
      }]; break;
    default:
      list = [glow];
  }
  if (mode() === "gm") for (const p of list) p.users = { include: game.users.filter(u => u.isGM).map(u => u.id) };
  return list;
}

function lightData(spec) {
  const d = canvas.scene?.grid?.distance ?? 1;
  const anim = {
    halo: { type: "fog", speed: 1, intensity: 2 }, pulse: { type: "pulse", speed: 2, intensity: 4 }, flicker: { type: "flame", speed: 4, intensity: 4 },
    tentacles: { type: spec.tier === "low" ? "roiling" : "vortex", speed: 3, intensity: 6 }, waves: { type: "witchwave", speed: 2, intensity: 4 },
    radiant: { type: "sunburst", speed: 2, intensity: 5 }
  }[spec.style] ?? { type: "pulse", speed: 2, intensity: 4 };
  return {
    dim: d * (spec.tier === "high" ? 2.4 : 1.6), bright: d * 0.6, color: spec.color.css, alpha: spec.tier === "mid" ? 0.45 : 0.7,
    luminosity: spec.tier === "low" ? -0.4 : 0.5, attenuation: 0.5, coloration: 1, animation: anim
  };
}

async function applyToToken(tokenDoc) {
  if (!tokenDoc || !isWriter()) return;
  const actor = tokenDoc.actor;
  const spec = mode() === "off" ? null : auraSpec(actor);
  const key = JSON.stringify(spec ? [3, spec.tier, spec.style, spec.color.css, mode()] : null);
  const tmfx = hasTMFX();
  // Token Magic FX
  if (tmfx) {
    const placeable = tokenDoc.object;
    const prev = tokenDoc.getFlag(SYS, "auraKey");
    const target = placeable ?? tokenDoc;
    if (key === prev && (!spec || TokenMagic.hasFilterId(target, FILTER_ID))) return;
    for (const id of FILTER_IDS) if (TokenMagic.hasFilterId(target, id)) await TokenMagic.deleteFilters(target, id);
    if (spec) await TokenMagic.addUpdateFilters(target, tmfxParams(spec));
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
  for (const t of docs) applyToToken(t).catch(reportError);
}

let reported = false;
function reportError(e) {
  console.error(`${SYS} | aura`, e);
  if (!reported && game.user.isGM) { reported = true; ui.notifications.error(`Aura : ${e.message}`); }
}

/** Diagnostic (console F12) : état de l'aura de chaque jeton de la scène, puis nouvelle application. */
export async function auraDebug() {
  const rows = [];
  for (const t of canvas.scene?.tokens ?? []) {
    let spec = null, err = "";
    try { spec = auraSpec(t.actor); } catch (e) { err = e.message; }
    rows.push({ token: t.name, type: t.actor?.type, vampire: !!t.actor?.system?.isVampire, showAura: t.actor?.system?.road?.showAura,
      road: t.actor?.roadItem?.name ?? "—", score: t.actor?.system?.road?.value, tier: spec?.tier ?? "—", style: spec?.style ?? "—",
      color: spec?.color?.css ?? "—", key: t.getFlag(SYS, "auraKey") ?? "—", light: t.getFlag(SYS, "auraLight") ? "aura" : (t.light?.dim ? "autre" : "aucune"), err });
  }
  console.table(rows);
  console.log(`${SYS} | aura : mode=${mode()}, Token Magic FX=${hasTMFX() ? "actif" : "inactif"}, MJ actif=${game.users.activeGM?.name}, moi=${game.user.name}, écrit=${isWriter()}`);
  for (const t of canvas.scene?.tokens ?? []) { await t.unsetFlag(SYS, "auraKey"); await applyToToken(t).catch(reportError); }
  return rows;
}

export function refreshAllAuras() {
  if (!canvas?.ready || !isWriter()) return;
  for (const t of canvas.scene.tokens) applyToToken(t).catch(reportError);
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
  Hooks.on("createToken", (t) => setTimeout(() => applyToToken(t).catch(reportError), 200));
  Hooks.on("canvasReady", () => setTimeout(refreshAllAuras, 500));
}
