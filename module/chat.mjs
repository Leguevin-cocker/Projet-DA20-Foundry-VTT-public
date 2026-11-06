import { NOCTIS } from "./config.mjs";
import { rollPool } from "./dice/roll.mjs";
import { handleSocket, bindClashCard } from "./combat/clash.mjs";
import { handleBeastSocket, bindBeastCard } from "./beast.mjs";
import { rule } from "./variants.mjs";
import { loc } from "./i18n.mjs";

const { DialogV2 } = foundry.applications.api;
const SOCKET = "system.noctis";

/* -------------------------------------------- */
/*  Socket : le MJ applique les dégâts aux       */
/*  personnages que le joueur ne possède pas.    */
/* -------------------------------------------- */

export function registerSocket() {
  game.socket.on(SOCKET, async (data) => {
    await handleSocket(data);
    await handleBeastSocket(data);
    await game.noctis?.time?.handleSocket?.(data);
    if (!game.users.activeGM?.isSelf) return;
    if (data?.action === "receiveDamage") {
      const actor = await fromUuid(data.actorUuid);
      if (actor) await actor.receiveDamage(data.payload);
    }
  });
}

/** Applique des dégâts à un acteur, via le MJ si nécessaire. */
export async function requestDamage(actor, payload) {
  if (actor.isOwner) return actor.receiveDamage(payload);
  if (!game.users.activeGM) return ui.notifications.error(loc("NOCTIS.js.AucunMjConnectePourAppliquerLes"));
  game.socket.emit(SOCKET, { action: "receiveDamage", actorUuid: actor.uuid, payload });
  ui.notifications.info(loc("NOCTIS.js.DegatsEnvoyesAuMjPour", { name: actor.name }));
}

/** Acteurs visés : cibles du joueur, sinon jetons sélectionnés. */
export function damageTargets() {
  let tokens = Array.from(game.user.targets ?? []);
  if (!tokens.length) tokens = canvas?.tokens?.controlled ?? [];
  return tokens.map(t => t.actor).filter(a => a);
}

/* -------------------------------------------- */
/*  Boutons des cartes de chat                   */
/* -------------------------------------------- */

export function onRenderChatMessage(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  if (message.flags?.noctis?.clash) bindClashCard(message, root);
  if (message.flags?.noctis?.beast) bindBeastCard(message, root);
  for (const btn of root.querySelectorAll("[data-noctis-action]")) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      handleChatAction(message, btn.dataset.noctisAction, btn.dataset);
    });
  }
}

async function handleChatAction(message, action, dataset) {
  if (action === "openCalendar") return game.noctis.openCalendar(dataset.year ? { year: Number(dataset.year), month: Number(dataset.month), day: Number(dataset.day) } : null);
  const f = message.flags?.noctis ?? {};
  const actor = f.actorUuid ? await fromUuid(f.actorUuid) : null;

  if (action === "rollDamage") {
    if (actor && !actor.isOwner) return ui.notifications.warn(loc("NOCTIS.js.SeulLeProprietaireDuPersonnagePeut"));
    const atk = f.attack ?? {};
    const extra = Math.max(0, (f.successes ?? 1) - (game.settings.get("noctis", "damageAllSuccesses") ? 0 : 1));
    const content = loc("NOCTIS.js.DegatsDeLArmeDesDe", { p0: atk.damageLabel ?? atk.damageBase, p1: atk.damageTypeLabel ?? "", p2: atk.damageBase ?? 0, extra, p4: Object.entries(NOCTIS.damageTypes).map(([k, v]) => `<option value="${k}" ${k === atk.damageType ? "selected" : ""}>${v.label}</option>`).join("") });
    const data = await DialogV2.prompt({
      window: { title: loc("NOCTIS.js.Degats", { p0: atk.weaponName ?? "" }) },
      content,
      ok: { label: loc("NOCTIS.js.LancerLesDegats"), icon: "fa-solid fa-burst", callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object }
    }).catch(() => null);
    if (!data) return;
    const pool = (Number(data.base) || 0) + (Number(data.extra) || 0) + (Number(data.mod) || 0);
    const res = await rollPool({
      actor, pool, difficulty: 6, kind: "damage", noBotch: true, minOne: rule("minDamage"),
      label: loc("NOCTIS.js.Degats", { p0: atk.weaponName ?? "" }),
      parts: [loc("NOCTIS.js.Arme2", { base: data.base }), loc("NOCTIS.js.ReussitesExcedentaires", { extra: data.extra }), ...(Number(data.mod) ? [loc("NOCTIS.js.Mod", { mod: data.mod })] : []), ...(rule("minDamage") ? [loc("NOCTIS.js.Minimum1ReussiteVariante")] : []), ...(atk.fire ? [loc("NOCTIS.js.FeuOuSoleil")] : [])],
      flags: { damage: { type: data.type, typeLabel: NOCTIS.damageTypes[data.type].label.toLowerCase(), armorPiercing: atk.armorPiercing ?? 0, fire: !!atk.fire } }
    });
    return res;
  }

  if (action === "applyDamage") {
    const dmg = f.damage ?? {};
    const amount = Number(dataset.amount ?? f.successes) || 0;
    const soak = dataset.soak !== "0";
    const targets = damageTargets();
    if (!targets.length) return ui.notifications.warn(loc("NOCTIS.js.CiblezTOuSelectionnezLeJeton"));
    for (const t of targets) {
      await requestDamage(t, { amount, type: dmg.type ?? "lethal", soak, armorPiercing: dmg.armorPiercing ?? 0, fire: !!dmg.fire, source: actor?.name ?? "" });
    }
  }
}

/* -------------------------------------------- */
/*  Dégâts manuels (depuis la fiche ou une macro) */
/* -------------------------------------------- */

export async function manualDamageDialog(actors) {
  const names = actors.map(a => a.name).join(", ");
  const content = loc("NOCTIS.js.CibleNiveauxDeDegatsTypeLancer", { names, p1: Object.entries(NOCTIS.damageTypes).map(([k, v]) => `<option value="${k}" ${k === "lethal" ? "selected" : ""}>${v.label}</option>`).join(""), p2: rule("armorVsFire") ? loc("NOCTIS.js.LArmureNAbsorbePas") : "" });
  const data = await DialogV2.prompt({
    window: { title: loc("NOCTIS.js.AppliquerDesDegats"), icon: "fa-solid fa-heart-crack" },
    content,
    ok: { label: loc("NOCTIS.js.Appliquer"), icon: "fa-solid fa-check", callback: (event, button) => new foundry.applications.ux.FormDataExtended(button.form).object }
  }).catch(() => null);
  if (!data) return;
  for (const a of actors) {
    await requestDamage(a, { amount: Number(data.amount) || 0, type: data.type, soak: !!data.soak, armorPiercing: Number(data.ap) || 0, fire: !!data.fire, source: game.user.name });
  }
}
