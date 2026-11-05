import { NOCTIS } from "../config.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/** Familles de dépenses pour le graphique (clés de NOCTIS.xpCategories). */
const FAMILIES = [
  { key: "attr", label: "Attributs", cats: ["attribute"] },
  { key: "abil", label: "Capacités", cats: ["ability", "newAbility", "specialty"] },
  { key: "disc", label: "Disciplines et rituels", cats: ["clanDiscipline", "otherDiscipline", "newDiscipline", "newPath", "secondaryPath", "ritual"] },
  { key: "moral", label: "Vertus, Volonté, Voie", cats: ["virtue", "willpower", "road"] },
  { key: "bg", label: "Historiques", cats: ["background"] },
  { key: "other", label: "Autre", cats: [] }
];
const familyOf = (cat) => (FAMILIES.find(f => f.cats.includes(cat)) ?? FAMILIES.at(-1)).key;
export const XP_FAMILIES = FAMILIES.map(f => ({ key: f.key, label: f.label }));

/**
 * Répartition des dépenses d'XP d'un personnage par famille, pour la barre en ligne.
 * @param {Actor} actor
 * @param {number} [scale]  total de référence (100 %) ; par défaut l'XP gagnée du personnage
 */
export function xpBreakdown(actor, scale) {
  const x = actor.system.experience;
  const byFam = Object.fromEntries(FAMILIES.map(f => [f.key, 0]));
  for (const e of x.log) if (e.kind === "spend" && !e.free) byFam[familyOf(e.category)] += e.amount;
  const ref = Math.max(1, scale ?? Math.max(x.total, x.spent));
  const segments = FAMILIES.filter(f => byFam[f.key] > 0).map(f => ({ cls: f.key, amount: byFam[f.key], label: f.label, pct: (byFam[f.key] / ref * 100).toFixed(2), tip: `${f.label} : ${byFam[f.key]} XP` }));
  if (x.available > 0) segments.push({ cls: "avail", amount: x.available, label: "Disponible", pct: (x.available / ref * 100).toFixed(2), tip: `Disponible : ${x.available} XP` });
  return segments;
}

/** Personnages joueurs : ceux marqués « PJ », sinon ceux qui ont un joueur propriétaire. */
export function playerCharacters() {
  const flagged = game.actors.filter(a => a.getFlag("noctis", "isPC"));
  if (flagged.length) return { list: flagged, flagged: true };
  return { list: game.actors.filter(a => a.hasPlayerOwner && ["vampire", "ghoul", "mortal"].includes(a.type)), flagged: false };
}

/**
 * Tableau de bord MJ.
 * Onglet XP : vue d'ensemble des PJ, attribution groupée, historique des distributions avec annulation, alertes.
 * Onglet Sang : réserves de sang des PJ, ajustements individuels et groupés, réveil.
 */
export class XpLedger extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "noctis-xp-ledger",
    tag: "div",
    classes: ["noctis", "noctis-window", "noctis-xp-ledger"],
    window: { title: "Tableau de bord MJ", icon: "fa-solid fa-chess-king", resizable: true },
    position: { width: 1000, height: 760 },
    actions: {
      setTab: XpLedger.#onSetTab,
      bloodStep: XpLedger.#onBloodStep,
      bloodFill: XpLedger.#onBloodFill,
      bloodGive: XpLedger.#onBloodGive,
      bloodNightfall: XpLedger.#onBloodNightfall,
      award: XpLedger.#onAward,
      undoBatch: XpLedger.#onUndoBatch,
      openSheet: XpLedger.#onOpenSheet,
      toggleAll: XpLedger.#onToggleAll
    }
  };

  static PARTS = { body: { template: "systems/noctis/templates/apps/xp-ledger.hbs", scrollable: [".ledger-table-wrap", ".ledger-history"] } };

  _tab = "xp";

  static open() {
    if (!game.user.isGM) return ui.notifications.warn("Le tableau de bord est réservé au MJ.");
    const existing = foundry.applications.instances?.get?.("noctis-xp-ledger");
    return (existing ?? new XpLedger()).render({ force: true });
  }

  async _prepareContext() {
    const { list, flagged } = playerCharacters();
    const maxGained = Math.max(1, ...list.map(a => a.system.experience.total));
    const today = new Date().toLocaleDateString("fr-FR");
    const pcs = list.sort((a, b) => a.name.localeCompare(b.name, "fr")).map(a => {
      const x = a.system.experience;
      const spends = x.log.filter(e => e.kind === "spend");
      const segments = xpBreakdown(a, maxGained);
      // Alertes
      const alerts = [];
      if (x.available < 0) alerts.push(`Solde négatif (${x.available})`);
      const freeCount = spends.filter(e => e.free).length;
      if (freeCount >= 3) alerts.push(`${freeCount} dépenses gratuites`);
      const seen = new Map();
      for (const e of spends) {
        if (!e.trait) continue;
        const k = `${e.trait}|${e.date}`;
        seen.set(k, (seen.get(k) ?? 0) + 1);
        if (seen.get(k) === 2) alerts.push(`« ${e.label.split(" ")[0]} » a pris deux points le ${e.date} (1 point par scénario)`);
      }
      const owner = game.users.find(u => !u.isGM && a.testUserPermission(u, "OWNER"));
      const lastGain = [...x.log].reverse().find(e => e.kind === "gain");
      return {
        id: a.id, name: a.name, img: a.img, player: owner?.name ?? a.system.identity?.player ?? "—", online: !!owner?.active,
        gained: x.total, spent: x.spent, available: x.available, segments, alerts,
        lastGain: lastGain ? `${lastGain.amount} XP · ${lastGain.label || "—"} (${lastGain.date})` : "—"
      };
    });
    const totals = pcs.reduce((t, p) => ({ gained: t.gained + p.gained, spent: t.spent + p.spent, available: t.available + p.available }), { gained: 0, spent: 0, available: 0 });
    const history = (game.settings.get("noctis", "xpBatches") ?? []).slice().reverse().map(b => ({
      ...b, count: b.entries.length, summary: b.entries.map(e => `${e.name} ${e.amount}`).join(" · ")
    }));
    // Onglet Sang
    const bloodPcs = list.filter(a => a.system.usesBlood).map(a => {
      const b = a.system.blood;
      const owner = game.users.find(u => !u.isGM && a.testUserPermission(u, "OWNER"));
      const pct = b.max ? Math.round(Math.min(1, b.value / b.max) * 100) : 0;
      return {
        id: a.id, name: a.name, img: a.img, player: owner?.name ?? a.system.identity?.player ?? "—", online: !!owner?.active,
        value: b.value, max: b.max, perTurn: b.perTurn, pct, missing: Math.max(0, b.max - b.value),
        level: pct <= 25 ? "low" : (pct <= 50 ? "mid" : "ok"),
        hunger: b.value <= 0 ? "À sec : frénésie de faim imminente" : (pct <= 25 ? "Affamé" : ""),
        kind: a.type === "ghoul" ? "Goule" : (a.system.generationLabel ? `${a.system.generationLabel} génération` : "Vampire")
      };
    });
    return {
      tab: this._tab, isXp: this._tab === "xp", isBlood: this._tab === "blood",
      pcs, flagged, totals, history, today, families: FAMILIES.map(f => ({ key: f.key, label: f.label })), hasPcs: pcs.length > 0,
      bloodPcs, hasBlood: bloodPcs.length > 0
    };
  }

  static #onSetTab(event, target) {
    this._tab = target.dataset.tab;
    this.render();
  }

  /** Lignes cochées de l'onglet Sang. */
  #bloodRows() {
    return [...this.element.querySelectorAll(".blood-table [data-actor-id]")].filter(r => r.querySelector("input.pc-check")?.checked)
      .map(r => game.actors.get(r.dataset.actorId)).filter(Boolean);
  }

  /** Change la réserve d'un personnage (bornée entre 0 et le maximum) ; renvoie le changement réel. */
  static async #setBlood(actor, delta) {
    const b = actor.system.blood;
    const next = Math.max(0, Math.min(b.max, b.value + delta));
    if (next !== b.value) await actor.update({ "system.blood.value": next });
    return next - b.value;
  }

  static async #notifyBlood(actor, delta, reason, whisper) {
    if (!whisper || !delta) return;
    const ids = game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id);
    const verb = delta > 0 ? `récupère <b>${delta}</b> point${delta > 1 ? "s" : ""} de sang` : `perd <b>${-delta}</b> point${delta < -1 ? "s" : ""} de sang`;
    await ChatMessage.create({ speaker: { alias: "Conteur" }, whisper: ids, content: `<div class="noctis-xp-msg noctis-blood-msg"><i class="fa-solid fa-droplet"></i> <b>${actor.name}</b> ${verb}${reason ? ` — ${foundry.utils.escapeHTML(reason)}` : ""} (${actor.system.blood.value}/${actor.system.blood.max})</div>` });
  }

  static async #onBloodStep(event, target) {
    const actor = game.actors.get(target.closest("[data-actor-id]").dataset.actorId);
    if (!actor) return;
    await XpLedger.#setBlood(actor, Number(target.dataset.delta) || 0);
    this.render();
  }

  static async #onBloodFill(event, target) {
    const actor = game.actors.get(target.closest("[data-actor-id]").dataset.actorId);
    if (!actor) return;
    const whisper = this.element.querySelector("[name='blood.whisper']")?.checked;
    const d = await XpLedger.#setBlood(actor, actor.system.blood.max);
    await XpLedger.#notifyBlood(actor, d, "réserve pleine", whisper);
    this.render();
  }

  static async #onBloodGive(event, target) {
    const el = this.element;
    const mode = target.dataset.mode; // add | remove | fill
    const amount = Math.max(0, Number(el.querySelector("[name='blood.amount']").value) || 0);
    const reason = el.querySelector("[name='blood.reason']").value.trim();
    const whisper = el.querySelector("[name='blood.whisper']").checked;
    const actors = this.#bloodRows();
    if (!actors.length) return ui.notifications.warn("Cochez au moins un personnage.");
    if (mode !== "fill" && !amount) return ui.notifications.warn("Indiquez un nombre de points de sang.");
    const lines = [];
    for (const a of actors) {
      const delta = mode === "fill" ? a.system.blood.max : (mode === "remove" ? -amount : amount);
      const d = await XpLedger.#setBlood(a, delta);
      await XpLedger.#notifyBlood(a, d, reason || (mode === "fill" ? "réserve pleine" : ""), whisper);
      if (d) lines.push(`${a.name} ${d > 0 ? "+" : ""}${d}`);
    }
    ui.notifications.info(lines.length ? `Sang : ${lines.join(", ")}.` : "Aucun changement (réserves déjà pleines ou vides).");
    this.render();
  }

  static async #onBloodNightfall() {
    const actors = this.#bloodRows();
    if (!actors.length) return ui.notifications.warn("Cochez au moins un personnage.");
    const ok = await DialogV2.confirm({
      window: { title: "Tombée de la nuit" },
      content: `<p>Réveil de ${actors.map(a => `<b>${a.name}</b>`).join(", ")} : les vampires perdent 1 point de sang, et chacun regagne 1 point de Volonté.</p>`,
      rejectClose: false
    });
    if (!ok) return;
    for (const a of actors) await a.nightfall();
    this.render();
  }

  static #onToggleAll(event, target) {
    const boxes = this.element.querySelectorAll("input.pc-check");
    const on = [...boxes].some(b => !b.checked);
    boxes.forEach(b => { b.checked = on; });
  }

  static #onOpenSheet(event, target) {
    game.actors.get(target.closest("[data-actor-id]").dataset.actorId)?.sheet.render({ force: true });
  }

  static async #onAward() {
    const el = this.element;
    const base = Number(el.querySelector("[name='award.amount']").value) || 0;
    const label = el.querySelector("[name='award.label']").value.trim() || "Fin de séance";
    const whisper = el.querySelector("[name='award.whisper']").checked;
    const rows = [...el.querySelectorAll("[data-actor-id]")].filter(r => r.querySelector("input.pc-check")?.checked);
    const plan = rows.map(r => {
      const bonus = Number(r.querySelector("input.pc-bonus")?.value) || 0;
      return { actor: game.actors.get(r.dataset.actorId), bonus, amount: base + bonus };
    }).filter(p => p.actor && p.amount > 0);
    if (!plan.length) return ui.notifications.warn("Rien à attribuer : cochez des personnages et indiquez un montant.");
    const ok = await DialogV2.confirm({
      window: { title: "Attribuer l'expérience" },
      content: `<p><b>${label}</b></p><ul>${plan.map(p => `<li>${p.actor.name} : <b>${p.amount} XP</b>${p.bonus ? ` (dont ${p.bonus > 0 ? "+" : ""}${p.bonus} individuel)` : ""}</li>`).join("")}</ul>`,
      rejectClose: false
    });
    if (!ok) return;
    await XpLedger.award(plan, label, whisper);
    this.render();
  }

  /**
   * Attribue de l'XP à plusieurs personnages et l'inscrit dans l'historique des distributions.
   * @param {{actor:Actor, amount:number, bonus?:number}[]} plan
   */
  static async award(plan, label, whisper = false) {
    plan = plan.filter(p => p.actor && p.amount > 0);
    if (!plan.length) return;
    const batch = foundry.utils.randomID();
    for (const p of plan) {
      await p.actor.addXpEntry({ kind: "gain", amount: p.amount, label, note: p.bonus ? `dont ${p.bonus > 0 ? "+" : ""}${p.bonus} individuel` : "", batch });
      if (whisper) {
        const ids = game.users.filter(u => p.actor.testUserPermission(u, "OWNER")).map(u => u.id);
        await ChatMessage.create({ speaker: { alias: "Conteur" }, whisper: ids, content: `<div class="noctis-xp-msg"><b>${p.actor.name}</b> reçoit <b>${p.amount} XP</b> — ${foundry.utils.escapeHTML(label)}</div>` });
      }
    }
    const batches = foundry.utils.deepClone(game.settings.get("noctis", "xpBatches") ?? []);
    batches.push({ id: batch, date: new Date().toLocaleDateString("fr-FR"), label, entries: plan.map(p => ({ actorId: p.actor.id, name: p.actor.name, amount: p.amount })) });
    await game.settings.set("noctis", "xpBatches", batches.slice(-40));
    ui.notifications.info(`${plan.length} personnage(s) ont reçu de l'expérience.`);
  }

  static async #onUndoBatch(event, target) {
    const id = target.dataset.batch;
    const batches = foundry.utils.deepClone(game.settings.get("noctis", "xpBatches") ?? []);
    const b = batches.find(x => x.id === id);
    if (!b) return;
    const ok = await DialogV2.confirm({ window: { title: "Annuler la distribution" }, content: `<p>Retirer « ${b.label} » (${b.date}) des fiches concernées ?</p>`, rejectClose: false });
    if (!ok) return;
    for (const e of b.entries) {
      const a = game.actors.get(e.actorId);
      if (!a) continue;
      const log = a.system.experience.log.filter(x => x.batch !== id);
      await a.update({ "system.experience.log": log });
    }
    await game.settings.set("noctis", "xpBatches", batches.filter(x => x.id !== id));
    ui.notifications.info("Distribution annulée.");
    this.render();
  }
}
