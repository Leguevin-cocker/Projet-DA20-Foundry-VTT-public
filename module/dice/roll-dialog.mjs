import { NOCTIS } from "../config.mjs";
import { rollPool } from "./roll.mjs";
import { rule } from "../variants.mjs";
import { targetsByRange, tokenFor, participant, startClash } from "../combat/clash.mjs";
import { MANEUVERS, TARGETING, POSITIONS, COVERS, maneuversFor, maneuverTooltip, maneuverDamage } from "../combat/maneuvers.mjs";
import { hasStatus } from "../status.mjs";
import { loc } from "../i18n.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Fenêtre de jet intermédiaire : choix des traits, difficulté, spécialité,
 * Volonté, pénalités et bonus disponibles sur la fiche.
 */
export class RollDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.preset = foundry.utils.mergeObject({
      label: "",
      trait1: "none",
      trait2: "none",
      bonusDice: 0,
      difficulty: 6,
      kind: "standard",
      weaponId: null,
      tags: [],
      capByBlood: false,
      noWoundPenalty: false,
      flags: {}
    }, options.preset ?? {});
    this._resolve = null;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["noctis", "noctis-window", "noctis-roll-dialog"],
    window: { title: loc("NOCTIS.js.JetDeDes"), icon: "fa-solid fa-dice-d10", resizable: false },
    position: { width: 460, height: "auto" },
    form: { handler: RollDialog.#onSubmit, submitOnChange: false, closeOnSubmit: false },
    actions: {
      diffDown: RollDialog.#diffDown,
      diffUp: RollDialog.#diffUp,
      step: RollDialog.#step,
      setMode: RollDialog.#setMode,
      cancel: function () { this.close(); }
    }
  };

  static PARTS = {
    form: { template: "systems/noctis/templates/dialog/roll-dialog.hbs" }
  };

  get title() { return this.preset.label ? loc("NOCTIS.js.Jet", { label: this.preset.label }) : loc("NOCTIS.js.JetDeDes"); }

  /** Ouvre la fenêtre et renvoie une promesse résolue après le jet (ou null). */
  static async prompt(actor, preset = {}) {
    return new Promise(resolve => {
      const app = new RollDialog({ actor, preset });
      app._resolve = resolve;
      app.render({ force: true });
    });
  }

  async close(options) {
    if (this._resolve) { this._resolve(null); this._resolve = null; }
    return super.close(options);
  }

  async _prepareContext(options) {
    const actor = this.actor;
    const s = actor.system;
    const p = this.preset;
    const groups = actor.rollableTraits();
    const markSel = (val) => groups.map(g => ({ label: g.label, options: g.options.map(o => ({ ...o, selected: o.value === val })) }));
    const weapon = p.weaponId ? actor.items.get(p.weaponId) : null;
    const bonuses = (s.mods?.rollBonuses ?? []).map(b => ({ ...b, key: `${b.itemId}.${b.id}` }));
    // Jet opposé : cibles par portée, cible (T) présélectionnée
    const targets = canvas?.ready ? targetsByRange(actor) : { melee: [], close: [], far: [], hasToken: false };
    const preTarget = [...(game.user.targets ?? [])][0]?.document?.uuid;
    let preDone = false;
    for (const k of ["melee", "close", "far"]) for (const t of targets[k]) if (!preDone && t.tokenUuid === preTarget) { t.selected = true; preDone = true; }
    const isAttack = p.kind === "attack";
    const perception = s.attributes.perception.total;
    return {
      opposed: isAttack,
      maneuvers: isAttack ? maneuversFor(weapon) : null,
      targeting: Object.entries(TARGETING).map(([key, v]) => ({ key, ...v })),
      positions: Object.entries(POSITIONS).map(([key, v]) => ({ key, ...v })),
      covers: Object.entries(COVERS).map(([key, v]) => ({ key, ...v })),
      perception, aimChoices: Array.from({ length: perception + 1 }, (_, i) => i),
      targets,
      inCombat: actor.inActiveCombat,
      combat: s.combat,
      actor,
      preset: p,
      traits1: markSel(p.trait1),
      traits2: markSel(p.trait2),
      bonuses,
      hasBonuses: bonuses.length > 0,
      weapon,
      weaponDamageType: weapon ? NOCTIS.damageTypes[weapon.system.damageType]?.label.toLowerCase() : "",
      woundPenalty: s.health.penalty,
      armorPenalty: s.armorPenalty,
      willpowerTemp: s.willpower.temporary,
      boostMax: Math.max(0, Math.min(s.blood?.value ?? 0, s.blood?.perTurn ?? 1, 5)),
      blood: s.blood?.value ?? 0,
      usesBlood: s.usesBlood,
      boosts: NOCTIS.physicalAttributes.map(k => ({ key: k, label: NOCTIS.attributes[k] })),
      rollModes: Object.entries(CONFIG.Dice.rollModes).map(([k, v]) => ({ value: k, label: game.i18n.localize(v.label ?? v), selected: k === game.settings.get("core", "rollMode") })),
      difficultyLabel: NOCTIS.difficulties[p.difficulty] ?? ""
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const form = this.element;
    form.addEventListener("change", ev => {
      if (ev.target?.type === "checkbox") ev.target.dataset.touched = "1";
      this.#refresh();
    });
    form.addEventListener("input", () => this.#refresh());
    // Une seule cible à la fois parmi les trois listes
    form.querySelectorAll(".target-select").forEach(sel => sel.addEventListener("change", () => {
      if (!sel.value) return;
      form.querySelectorAll(".target-select").forEach(o => { if (o !== sel) o.value = ""; });
      this.#refresh();
    }));
    // Manœuvre : impose ses traits et met à jour l'infobulle
    const man = form.querySelector("select[name=maneuver]");
    if (man) {
      man.addEventListener("change", () => { this.#applyManeuverTraits(); this.#refresh(); });
      this.#applyManeuverTraits();
    }
    this.#refresh();
  }

  /** Choisit les traits imposés par la manœuvre (sinon ceux de l'arme). */
  #applyManeuverTraits() {
    const form = this.element;
    const key = form.querySelector("select[name=maneuver]")?.value;
    const m = MANEUVERS[key];
    if (!m) return;
    const t1 = form.querySelector("select[name=trait1]"), t2 = form.querySelector("select[name=trait2]");
    const [a, b] = m.pool ? [`attr.${m.pool[0]}`, `abil.${m.pool[1]}`] : [this.preset.trait1, this.preset.trait2];
    if (t1 && [...t1.options].some(o => o.value === a)) t1.value = a;
    if (t2 && [...t2.options].some(o => o.value === b)) t2.value = b;
    const info = form.querySelector("[data-maneuver-info]");
    if (info) info.dataset.tooltipHtml = maneuverTooltip(key);
    const short = form.querySelector("[data-maneuver-short]");
    if (short) short.textContent = m.short;
  }

  /** Acteur de la cible choisie dans les listes du jet opposé. */
  #targetActor(fd) {
    const uuid = fd["target.melee"] || fd["target.close"] || fd["target.far"];
    if (!uuid) return null;
    try { return fromUuidSync(uuid)?.actor ?? null; } catch (e) { return null; }
  }

  /** Lit le formulaire et calcule le groupement. */
  #compute() {
    const form = this.element;
    const fd = new foundry.applications.ux.FormDataExtended(form).object;
    const actor = this.actor;
    const s = actor.system;
    const p = this.preset;
    const t1 = actor.traitValue(fd.trait1);
    const t2 = actor.traitValue(fd.trait2);
    const tags = new Set(["all", ...(p.tags ?? [])]);
    for (const t of [t1, t2]) for (const tag of (t?.tags ?? [])) tags.add(tag);

    const parts = [];
    let pool = 0;
    if (t1) { pool += t1.value; parts.push(`${t1.label} ${t1.value}`); }
    if (t2) { pool += t2.value; parts.push(`${t2.label} ${t2.value}`); }
    const bonusDice = Number(fd.bonusDice) || 0;
    if (bonusDice) { pool += bonusDice; parts.push(loc("NOCTIS.js.Modificateur", { p0: bonusDice > 0 ? "+" : "", bonusDice })); }

    let difficulty = Number(fd.difficulty) || 6;

    // Bonus des atouts, handicaps, objets
    for (const b of (s.mods?.rollBonuses ?? [])) {
      const key = `${b.itemId}.${b.id}`;
      if (!fd[`bonus.${key}`]) continue;
      if (b.dice) { pool += b.dice; parts.push(loc("NOCTIS.js.De", { p0: b.label || b.source, p1: b.dice > 0 ? "+" : "", dice: b.dice, p3: Math.abs(b.dice) > 1 ? "s" : "" })); }
      if (b.difficulty) { difficulty += b.difficulty; parts.push(loc("NOCTIS.js.Difficulte2", { p0: b.label || b.source, p1: b.difficulty > 0 ? "+" : "", difficulty: b.difficulty })); }
    }

    // Amplification par le sang (ajoutée avant le jet)
    let bloodBoost = 0;
    for (const k of NOCTIS.physicalAttributes) bloodBoost += Number(fd[`boost.${k}`]) || 0;

    // Pénalité de blessures
    const ignoreWounds = !!fd.ignoreWounds;
    if (!p.noWoundPenalty && s.health.penalty && !ignoreWounds) { pool += s.health.penalty; parts.push(loc("NOCTIS.js.Blessures", { penalty: s.health.penalty })); }

    // Vélocité : son score s'ajoute aux groupements basés sur la Dextérité
    const cel = s.celerityBonus ?? 0;
    const celUsed = s.combat?.celerityActive ?? 0;
    if (t1?.dex && cel) { pool += cel; parts.push(`${s.mechanicNames?.speed ?? loc("NOCTIS.js.Velocite")} +${cel}${celUsed ? loc("NOCTIS.js.PointUtiliseEnActions", { celUsed, p1: celUsed > 1 ? "s" : "", p2: celUsed > 1 ? "s" : "" }) : ""}`); }

    // Pénalité d'armure (jets basés sur la Dextérité)
    if (t1?.dex && s.armorPenalty) { pool -= s.armorPenalty; parts.push(loc("NOCTIS.js.Armure2", { armorPenalty: s.armorPenalty })); }

    // Variante « défense au prix d'un dé » : chaque défense du tour retire 1 dé à l'attaque suivante
    let defPenalty = 0;
    if (p.kind === "attack" && actor.inActiveCombat && rule("defenseRule") === "dicePenalty") defPenalty = s.combat?.defensePenalty ?? 0;
    if (defPenalty) { pool -= defPenalty; parts.push(loc("NOCTIS.js.DefensesPrecedentes", { defPenalty })); }

    // Manœuvre et situation (jet opposé uniquement)
    let maneuver = null;
    if (p.kind === "attack" && fd.mode === "opposed" && fd.maneuver) {
      const m = MANEUVERS[fd.maneuver];
      if (m) {
        maneuver = { key: fd.maneuver, ...m };
        if (m.dice) { pool += m.dice; parts.push(loc("NOCTIS.js.De2", { label: m.label, dice: m.dice })); }
        if (m.diff) { difficulty += m.diff; parts.push(loc("NOCTIS.js.Difficulte3", { label: m.label, p1: m.diff > 0 ? "+" : "", diff: m.diff })); }
        if (m.minArchery && (s.abilities.archery?.total ?? 0) < m.minArchery) parts.push(loc("NOCTIS.js.DemandeTirALArc", { label: m.label, minArchery: m.minArchery }));
      }
      const tg = TARGETING[fd.targeting];
      if (tg?.diff) { difficulty += tg.diff; parts.push(loc("NOCTIS.js.CiblageDiff", { p0: tg.label.split(" (")[0].toLowerCase(), diff: tg.diff, p2: tg.dmg ? loc("NOCTIS.js.Degats2", { dmg: tg.dmg }) : "" })); }
      const pos = POSITIONS[fd.position];
      if (pos?.dice) { pool += pos.dice; parts.push(loc("NOCTIS.js.De3", { label: pos.label, dice: pos.dice, p2: pos.dice > 1 ? "s" : "" })); }
      const cov = COVERS[fd.cover];
      if (cov?.diff) { difficulty += cov.diff; parts.push(loc("NOCTIS.js.CouvertDiff", { p0: cov.label.split(" (")[0].toLowerCase(), diff: cov.diff })); }
      const aim = Math.min(Number(fd.aim) || 0, s.attributes.perception.total);
      if (aim) { pool += aim; parts.push(loc("NOCTIS.js.Visee", { aim })); }
      const opp = Math.min(4, Math.max(0, (Number(fd.opponents) || 1) - 1));
      if (opp) { difficulty += opp; parts.push(loc("NOCTIS.js.AdversairesMultiplesDiff", { opp })); }
      // États de la cible
      const ta = this.#targetActor(fd);
      if (hasStatus(ta, "blinded")) { pool += 2; parts.push(loc("NOCTIS.js.CibleAveuglee2Des")); }
      if (hasStatus(ta, "grappled")) { pool += 2; parts.push(loc("NOCTIS.js.CibleImmobilisee2Des")); }
      if (maneuver?.needsHold && ta && !hasStatus(ta, "grappled")) parts.push(loc("NOCTIS.js.LaCibleNEstPasAgrippee"));
    }
    // États de l'attaquant
    if (hasStatus(actor, "blinded")) { difficulty += 2; parts.push(loc("NOCTIS.js.AveugleDifficulte2")); }

    // Vigueur surnaturelle : réussites automatiques aux jets de Force
    let bonusSuccesses = 0;
    const might = s.mechanics?.might ?? 0;
    if (might && (fd.trait1 === "attr.strength" || fd.trait2 === "attr.strength")) {
      bonusSuccesses = might;
      parts.push(loc("NOCTIS.js.ReussiteAutomatique", { p0: s.mechanicNames?.might ?? loc("NOCTIS.js.VigueurSurnaturelle"), might, p2: might > 1 ? "s" : "", p3: might > 1 ? "s" : "" }));
    }

    // Actions multiples
    const multi = Number(fd.multi) || 0;
    if (multi > 0) { pool -= multi; difficulty += multi; parts.push(loc("NOCTIS.js.ActionMultipleDeDiff", { multi, p1: multi > 1 ? "s" : "" })); }

    // Plafond par la réserve de sang (Maîtrise de soi/Instinct)
    if (p.capByBlood && s.usesBlood && pool > s.blood.value) { parts.push(loc("NOCTIS.js.PlafonneParLaReserveDeSang", { value: s.blood.value })); pool = s.blood.value; }

    if (difficulty > 10) { pool -= (difficulty - 10); difficulty = 10; }
    pool = Math.max(0, pool);
    const specs = [t1, t2].filter(t => t?.spec).map(t => `${t.label} : ${t.spec}`);
    return { fd, pool, difficulty, parts, tags, t1, t2, specs, ignoreWounds, bloodBoost, willpower: (Number(fd.willpower) || 0) > 0, multi, defPenalty, maneuver, bonusSuccesses };
  }

  #refresh() {
    const c = this.#compute();
    const el = this.element;
    const sum = el.querySelector("[data-summary]");
    if (sum) sum.innerHTML = loc("NOCTIS.js.DeMiddotDifficulte", { pool: c.pool, p1: c.pool > 1 ? "s" : "", difficulty: c.difficulty, p3: NOCTIS.difficulties[c.difficulty] ?? "" });
    const det = el.querySelector("[data-parts]");
    if (det) det.textContent = c.parts.join(" · ");
    const spec = el.querySelector("[data-specs]");
    if (spec) {
      spec.textContent = c.specs.length ? `(${c.specs.join(" ; ")})` : loc("NOCTIS.js.AucuneSpecialiteSurCesTraits");
      const box = el.querySelector("input[name=specialty]");
      if (box && !box.dataset.touched) box.checked = false;
    }
    // Pré-cochage des bonus automatiques et filtrage par cible
    for (const row of el.querySelectorAll("[data-bonus-target]")) {
      const target = row.dataset.bonusTarget;
      const applies = target === "all" || c.tags.has(target);
      row.classList.toggle("inapplicable", !applies);
      const box = row.querySelector("input[type=checkbox]");
      if (box && !box.dataset.touched && row.dataset.auto === "true") box.checked = applies;
    }
  }

  static #setMode(event, target) {
    const mode = target.dataset.mode;
    const el = this.element;
    el.querySelector("input[name=mode]").value = mode;
    el.querySelectorAll(`.roll-tabs a`).forEach(a => a.classList.toggle("active", a.dataset.mode === mode));
    el.querySelector(".opposed-box")?.classList.toggle("hidden", mode !== "opposed");
    this.setPosition({ height: "auto" });
  }

  static #diffDown(event, target) {
    const input = this.element.querySelector("input[name=difficulty]");
    input.value = Math.max(2, (Number(input.value) || 6) - 1);
    this.#refresh();
  }

  /** Boutons − / + génériques : bornés par min / max du champ. */
  static #step(event, target) {
    const input = this.element.querySelector(`input[name="${target.dataset.field}"]`);
    if (!input) return;
    const min = input.min === "" ? -Infinity : Number(input.min);
    const max = input.max === "" ? Infinity : Number(input.max);
    input.value = Math.max(min, Math.min(max, (Number(input.value) || 0) + (Number(target.dataset.delta) || 0)));
    this.#refresh();
  }

  static #diffUp(event, target) {
    const input = this.element.querySelector("input[name=difficulty]");
    input.value = Math.min(10, (Number(input.value) || 6) + 1);
    this.#refresh();
  }

  static async #onSubmit(event, form, formData) {
    const c = this.#compute();
    const actor = this.actor;
    const p = this.preset;

    // Jet opposé : cible et action
    const opposed = c.fd.mode === "opposed";
    let targetToken = null;
    if (opposed) {
      const uuid = c.fd["target.melee"] || c.fd["target.close"] || c.fd["target.far"];
      if (!uuid) { return ui.notifications.warn(loc("NOCTIS.js.ChoisissezUneCibleDansLUne")); }
      targetToken = await fromUuid(uuid);
      if (!targetToken?.actor) { return ui.notifications.warn(loc("NOCTIS.js.CibleIntrouvable")); }
      if (actor.inActiveCombat && !(await actor.useAction({ attack: true }))) {
        return ui.notifications.warn(loc("NOCTIS.js.NAPlusDActionOu", { name: actor.name }));
      }
    }

    // Dépenses préalables
    if (c.willpower && !(await actor.spendWillpower(1))) return;
    if (c.ignoreWounds && !(await actor.spendWillpower(1, loc("NOCTIS.js.IgnorerLesPenalitesDeBlessures")))) return;
    for (const k of NOCTIS.physicalAttributes) {
      const n = Number(c.fd[`boost.${k}`]) || 0;
      for (let i = 0; i < n; i++) await actor.bloodBoost(k);
    }
    // Recalcul si l'amplification a changé un attribut utilisé
    let pool = c.pool;
    if (c.bloodBoost) {
      for (const k of NOCTIS.physicalAttributes) {
        const n = Number(c.fd[`boost.${k}`]) || 0;
        if (n && (c.fd.trait1 === `attr.${k}` || c.fd.trait2 === `attr.${k}`)) { pool += n; c.parts.push(loc("NOCTIS.js.Amplification", { p0: NOCTIS.attributes[k], n })); }
      }
    }

    if (c.defPenalty) await actor.update({ "system.combat.defensePenalty": 0 });
    const label = p.label || [c.t1?.label, c.t2?.label].filter(Boolean).join(" + ") || loc("NOCTIS.js.Jet2");
    const flags = foundry.utils.deepClone(p.flags ?? {});
    if (p.kind === "attack" && p.weaponId) {
      const w = actor.items.get(p.weaponId);
      if (w) {
        const str = w.system.damageAttribute ? (actor.system.attributes[w.system.damageAttribute]?.total ?? 0) : 0;
        const dl = [];
        if (w.system.damageAttribute) dl.push(`${NOCTIS.attributes[w.system.damageAttribute]} (${str})`);
        if (w.system.damageBonus || !dl.length) dl.push(`${w.system.damageBonus}`);
        flags.attack = {
          weaponName: w.name,
          damageBase: str + w.system.damageBonus + (Number(flags.attack?.damageMod) || 0),
          damageType: w.system.damageType,
          damageTypeLabel: NOCTIS.damageTypes[w.system.damageType].label.toLowerCase(),
          armorPiercing: w.system.armorPiercing,
          fire: !!w.system.fire,
          damageLabel: dl.join(" + ")
        };
      }
    }
    if (opposed) {
      const w = p.weaponId ? actor.items.get(p.weaponId) : null;
      const str = actor.system.attributes.strength.total;
      const m = c.maneuver;
      const unarmed = !w || m?.uses === "unarmed";
      const weapon = !unarmed ? {
        name: w.name, damageType: w.system.damageType, armorPiercing: w.system.armorPiercing ?? 0, fire: !!w.system.fire,
        damageBase: (w.system.damageAttribute ? (actor.system.attributes[w.system.damageAttribute]?.total ?? 0) : 0) + (w.system.damageBonus ?? 0),
        damageLabel: flags.attack?.damageLabel ?? ""
      } : { name: loc("NOCTIS.js.MainsNues"), damageType: "bashing", armorPiercing: 0, damageBase: str, damageLabel: loc("NOCTIS.js.Force2", { str }) };
      // La manœuvre fixe la base et le type de dégâts
      let noDamage = false;
      if (m) {
        const d = maneuverDamage(m.key, { str, weaponBase: weapon.damageBase, weaponLabel: weapon.damageLabel || String(weapon.damageBase), weaponType: weapon.damageType, targeting: c.fd.targeting });
        weapon.damageBase = d.base; weapon.damageLabel = d.label; weapon.damageType = d.type; noDamage = d.none;
        if (unarmed && m.key !== "punch") weapon.name = m.label;
      }
      weapon.damageTypeLabel = NOCTIS.damageTypes[weapon.damageType]?.label.toLowerCase() ?? "";
      // Vigueur surnaturelle : réussites automatiques sur les dégâts fondés sur la Force
      if (unarmed || w?.system.damageAttribute === "strength") weapon.might = actor.system.mechanics?.might ?? 0;
      const ability = unarmed ? "brawl" : (w?.system.ability ?? "brawl");
      const attackKind = ability === "brawl" ? "brawl" : (ability === "archery" || w?.system.thrown || (w?.system.range ?? 0) > 0 ? "ranged" : "melee");
      // Coup puissant : plus de défense ce tour
      if (m?.effect === "power" && actor.inActiveCombat) await actor.update({ "system.combat.noDefense": true });
      const r = await rollPool({ actor, pool, difficulty: c.difficulty, specialty: !!c.fd.specialty, willpower: c.willpower, bonusSuccesses: c.bonusSuccesses, toChat: false });
      const state = {
        attacker: participant(actor, tokenFor(actor)),
        defender: participant(targetToken.actor, targetToken),
        attackKind, attackKindLabel: { brawl: loc("NOCTIS.js.CorpsACorpsBagarre"), melee: loc("NOCTIS.js.CorpsACorpsMelee"), ranged: loc("NOCTIS.js.ADistance") }[attackKind],
        weapon, noDamage,
        maneuver: m ? { key: m.key, label: m.label, short: m.short, effect: m.effect ?? "", needsHold: !!m.needsHold,
          ignoreArmor: !!TARGETING[c.fd.targeting]?.ignoreArmor, targeting: c.fd.targeting !== "none" ? TARGETING[c.fd.targeting]?.label : "",
          defenseDiff: ["riposte", "suppress"].includes(m.effect) ? 2 : 0 } : null,
        attack: { pool: r.pool, difficulty: r.difficulty, faces: r.faces, successes: r.successes, botch: r.botch, label, parts: c.parts.join(" · "), specialty: r.specialty, willpower: r.willpower }
      };
      if (this._resolve) { this._resolve(r); this._resolve = null; }
      this.close();
      return startClash(state);
    }

    const result = await rollPool({
      actor, pool, difficulty: c.difficulty, specialty: !!c.fd.specialty, willpower: c.willpower, bonusSuccesses: c.bonusSuccesses,
      label, parts: c.parts, kind: p.kind, flags, rollMode: c.fd.rollMode
    });
    if (this._resolve) { this._resolve(result); this._resolve = null; }
    this.close();
  }
}
