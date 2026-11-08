import { NOCTIS, xpCost } from "../config.mjs";
import { rollPool } from "../dice/roll.mjs";
import { rule } from "../variants.mjs";
import { loc } from "../i18n.mjs";

/**
 * Acteur NOCTIS : logique de jeu (dégâts, sang, volonté, expérience).
 */
export class NOCTISActor extends Actor {

  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    const update = {};
    if (!data.img || data.img === "icons/svg/mystery-man.svg") update.img = `${NOCTIS.PATH}/assets/ui/portrait.webp`;
    update["prototypeToken.actorLink"] = data.type !== "npc";
    update["prototypeToken.bar1"] = { attribute: "health" };
    if (["vampire", "ghoul"].includes(data.type)) update["prototypeToken.bar2"] = { attribute: "blood" };
    update["prototypeToken.displayBars"] = CONST.TOKEN_DISPLAY_MODES.OWNER;
    if (data.type === "vampire") {
      update["system.willpower.permanent"] = data.system?.willpower?.permanent ?? 1;
    }
    this.updateSource(update);
  }

  get clanItem() { return this.items.find(i => i.type === "clan") ?? null; }
  get roadItem() { return this.items.find(i => i.type === "road") ?? null; }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    const s = this.system;
    // Faiblesse noAppearance : Apparence à 0.
    const clan = this.clanItem;
    if (clan?.system.appearanceZero && s.attributes?.appearance) {
      s.attributes.appearance.total = 0;
      s.attributes.appearance.locked = true;
    }
    // Disciplines de clan
    const clanDisc = new Set(clan?.system.disciplines ?? []);
    for (const it of this.items) {
      if (it.type !== "discipline") continue;
      it.system.isClan = it.system.inClan || clanDisc.has(it.system.key) || clanDisc.has(it.system.parent);
    }
  }

  /** @override */
  getRollData() {
    const data = super.getRollData();
    data.initiative = this.system.initiative;
    return data;
  }

  /* -------------------------------------------- */
  /*  Valeur d'un trait à partir d'une référence  */
  /* -------------------------------------------- */

  /**
   * @param {string} ref  attr.x | abil.x | item.<id> | virtue.x | willpower | road | bg.x | blood | faith
   * @returns {{value:number,label:string,spec:string,tags:string[]}|null}
   */
  traitValue(ref) {
    if (!ref || ref === "none") return null;
    const s = this.system;
    const [kind, key] = ref.split(/\.(.*)/s);
    switch (kind) {
      case "attr": {
        const a = s.attributes[key];
        if (!a) return null;
        const group = Object.entries(NOCTIS.attributeGroups).find(([, g]) => g.keys.includes(key))?.[0];
        return { value: a.total, label: NOCTIS.attributes[key], spec: a.spec, tags: [ref, group === "social" ? "social" : group, "attribute"], physical: group === "physical", dex: key === "dexterity" };
      }
      case "abil": {
        const a = s.abilities[key];
        if (!a) return null;
        return { value: a.total, label: NOCTIS.abilities[key], spec: a.spec, tags: [ref, "ability"] };
      }
      case "item": {
        const it = this.items.get(key);
        if (!it) return null;
        if (it.type === "discipline") {
          const dk = it.system.key || it.system.parent;
          return { value: it.system.value, label: it.name, spec: "", tags: [ref, `disc.${dk}`, `disc.${it.system.parent}`, "discipline"] };
        }
        return { value: it.system.value ?? 0, label: it.name, spec: it.system.spec ?? "", tags: [ref, `abil.${it.system.key}`, "ability"] };
      }
      case "virtue": {
        const v = s.virtues[key];
        if (!v) return null;
        return { value: v.value, label: v.label, spec: "", tags: [ref, "virtue", key === "selfcontrol" ? "frenzy" : (key === "courage" ? "panic" : "conscience")] };
      }
      case "willpower": return { value: s.willpower.permanent, label: loc("NOCTIS.js.Volonte"), spec: "", tags: ["willpower"] };
      case "road": return { value: s.road.value, label: s.road.name || loc("NOCTIS.js.Voie"), spec: "", tags: ["road"] };
      case "bg": {
        const b = s.backgrounds[key] ?? (key in NOCTIS.backgrounds ? { value: 0 } : null);
        return b ? { value: b.value, label: NOCTIS.backgrounds[key], spec: "", tags: [ref, "background"] } : null;
      }
      case "faith": return { value: s.faith, label: loc("NOCTIS.js.VraieFoi"), spec: "", tags: ["faith"] };
      default: return null;
    }
  }

  /** Liste des traits jetables, pour les menus de la fenêtre de jet. */
  rollableTraits() {
    const s = this.system;
    const groups = [];
    groups.push({ label: loc("NOCTIS.js.Attributs"), options: Object.keys(NOCTIS.attributes).map(k => ({ value: `attr.${k}`, label: `${NOCTIS.attributes[k]} (${s.attributes[k].total})` })) });
    for (const g of Object.values(NOCTIS.abilityGroups)) {
      groups.push({ label: g.label, options: g.keys.map(k => ({ value: `abil.${k}`, label: `${NOCTIS.abilities[k]} (${s.abilities[k].total})` })).sort((a, b) => a.label.localeCompare(b.label, "fr")) });
    }
    const sec = this.items.filter(i => i.type === "ability");
    if (sec.length) groups.push({ label: loc("NOCTIS.js.CapacitesSecondaires"), options: sec.map(i => ({ value: `item.${i.id}`, label: `${i.name} (${i.system.value})` })) });
    const disc = this.items.filter(i => i.type === "discipline");
    if (disc.length) groups.push({ label: loc("NOCTIS.js.Disciplines"), options: disc.map(i => ({ value: `item.${i.id}`, label: `${i.name} (${i.system.value})` })) });
    groups.push({ label: loc("NOCTIS.js.VertusEtAutres"), options: [
      { value: "virtue.conscience", label: `${s.virtues.conscience.label} (${s.virtues.conscience.value})` },
      { value: "virtue.selfcontrol", label: `${s.virtues.selfcontrol.label} (${s.virtues.selfcontrol.value})` },
      { value: "virtue.courage", label: loc("NOCTIS.js.Courage3", { value: s.virtues.courage.value }) },
      { value: "willpower", label: loc("NOCTIS.js.Volonte2", { permanent: s.willpower.permanent }) },
      { value: "road", label: `${s.road.name || loc("NOCTIS.js.Voie")} (${s.road.value})` },
      ...(s.faith ? [{ value: "faith", label: loc("NOCTIS.js.VraieFoi2", { faith: s.faith }) }] : [])
    ] });
    groups.push({ label: loc("NOCTIS.js.Historiques"), options: Object.keys(NOCTIS.backgrounds).map(k => ({ value: `bg.${k}`, label: `${NOCTIS.backgrounds[k]} (${s.backgrounds[k]?.value ?? 0})` })) });
    return groups;
  }

  /* -------------------------------------------- */
  /*  Santé et dégâts                              */
  /* -------------------------------------------- */

  /**
   * Inflige des niveaux de dégâts (après absorption).
   * Gère le débordement : une piste pleine aggrave les blessures existantes.
   */
  async applyHealthDamage(amount, type = "lethal") {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (!amount) return { applied: 0 };
    const s = this.system;
    if (!this.system.isVampire && type === "aggravated" && !["ghoul"].includes(this.type) && this.system.npcKind !== "creature") type = "lethal";
    let b = s.health.bashing, l = s.health.lethal, a = s.health.aggravated;
    const levels = s.health.levels;
    for (let i = 0; i < amount; i++) {
      const total = b + l + a;
      if (total < levels) {
        if (type === "bashing") b++; else if (type === "lethal") l++; else a++;
        continue;
      }
      // Piste pleine : on aggrave une blessure existante
      if (type === "bashing" || type === "lethal") {
        if (b > 0) { b--; l++; }
        else if (l > 0) { l--; a++; }
      } else {
        if (b > 0) { b--; a++; }
        else if (l > 0) { l--; a++; }
      }
    }
    await this.update({ "system.health.bashing": b, "system.health.lethal": l, "system.health.aggravated": a });
    return { applied: amount, type };
  }

  async healDamage(type, n = 1) {
    const cur = this.system.health[type] ?? 0;
    return this.update({ [`system.health.${type}`]: Math.max(0, cur - n) });
  }

  /**
   * Reçoit une attaque : jet d'absorption puis application.
   * @param {object} opts { amount, type, soak, armorPiercing, source }
   */
  async receiveDamage({ amount, type = "lethal", soak = true, armorPiercing = 0, source = "", quiet = false, half = false, fire = false, willpower = false, ignoreArmor = false } = {}) {
    const s = this.system;
    let effType = type;
    if (!s.isVampire && type === "aggravated" && this.type !== "ghoul") effType = "lethal";
    let soakSuccesses = 0;
    let soakResult = null;
    if (soak) {
      const noArmor = (fire && rule("armorVsFire")) || ignoreArmor;
      const ap = noArmor ? (s.armorRating ?? 0) : Math.min(Number(armorPiercing) || 0, s.armorRating ?? 0);
      const pool = Math.max(0, (s.soak[effType] ?? 0) - ap);
      const parts = [];
      const sta = s.attributes.stamina.total;
      const fort = s.mechanics.resilience ?? 0;
      if (effType === "bashing" || (effType === "lethal" && s.isVampire)) parts.push(loc("NOCTIS.js.Vigueur2", { sta }));
      if (fort) parts.push(`${s.mechanicNames?.resilience ?? loc("NOCTIS.js.Resilience")} ${fort}`);
      if (s.armorRating) parts.push(noArmor ? (ignoreArmor ? loc("NOCTIS.js.ArmureIgnoreeDefautDeLaCuirasse") : loc("NOCTIS.js.ArmureIgnoreeFeuOuSoleil")) : loc("NOCTIS.js.Armure3", { armorRating: s.armorRating, p1: ap ? loc("NOCTIS.js.Perforation", { ap }) : "" }));
      const useWp = willpower && rule("willpowerSoak") && (await this.spendWillpower(1));
      if (useWp) parts.push(loc("NOCTIS.js.Volonte1Reussite"));
      // Variante : un PNJ prend le résultat moyen (moitié du groupement, arrondi au supérieur)
      const average = !this.isPC && rule("npcAverage");
      if (average) parts.push(loc("NOCTIS.js.ResultatMoyenPnjPasDeJet"));
      soakResult = average ? { pool, difficulty: 6, faces: [], successes: Math.ceil(pool / 2) + (useWp ? 1 : 0), botch: false, average: true } : await rollPool({
        actor: this, pool, difficulty: 6, kind: "soak", willpower: !!useWp,
        label: loc("NOCTIS.js.AbsorptionNiveau", { amount, p1: amount > 1 ? "x" : "", p2: NOCTIS.damageTypes[effType].label.toLowerCase() }),
        parts: parts.length ? parts : [loc("NOCTIS.js.AucunDeDAbsorption")],
        noBotch: true, toChat: !quiet
      });
      soakResult.parts = parts;
      soakSuccesses = soakResult?.successes ?? 0;
    }
    let remaining = Math.max(0, amount - soakSuccesses);
    let halved = false;
    if (effType === "bashing" && s.isVampire) { remaining = Math.floor(remaining / 2); halved = true; }
    if (half) remaining = Math.ceil(remaining / 2);
    await this.applyHealthDamage(remaining, effType);
    if (quiet) {
      const h = this.system.health;
      return { remaining, soakResult, soakSuccesses, halved, half, effType, typeLabel: NOCTIS.damageTypes[effType].label.toLowerCase(),
        status: h.status, torpor: h.torpor, finalDeath: h.finalDeath, incapacitated: h.incapacitated };
    }
    // Récapitulatif
    const content = await foundry.applications.handlebars.renderTemplate(`${NOCTIS.PATH}/templates/chat/damage-applied.hbs`, {
      actor: this, amount, type: NOCTIS.damageTypes[effType].label.toLowerCase(), soakSuccesses, soaked: soak, remaining, halved,
      status: this.system.health.status, torpor: this.system.health.torpor, finalDeath: this.system.health.finalDeath,
      incapacitated: this.system.health.incapacitated, source
    });
    await ChatMessage.create({ content, speaker: ChatMessage.getSpeaker({ actor: this }), flags: { noctis: { type: "damageApplied" } } });
    return { remaining };
  }

  /* -------------------------------------------- */
  /*  Actions de combat et Vélocité                */
  /* -------------------------------------------- */

  /** Le personnage est-il un PJ (marqué « PJ » ou possédé par un joueur) ? */
  get isPC() { return !!this.getFlag("noctis", "isPC") || this.hasPlayerOwner; }

  /** Nouveau tour : 1 action, 1 attaque. */
  async resetActions() {
    // Étourdi, pieu au cœur, torpeur, invalidité : aucune action ce tour
    const st = this.statuses ?? new Set();
    const blocked = ["stunned", "staked", "torpor", "incapacitated", "dead"].find(id => st.has(id));
    const n = blocked ? 0 : 1;
    await this.update({
      "system.combat.actions": n, "system.combat.actionsMax": 1, "system.combat.attacksLeft": n, "system.combat.celerityActive": 0,
      "system.combat.defensesUsed": 0, "system.combat.defensePenalty": 0, "system.combat.healsUsed": 0, "system.combat.noDefense": false
    });
    if (st.has("stunned")) {
      await this.#notify(loc("NOCTIS.js.EstEtourdiIlNePeutPas", { name: this.name }));
      await this.toggleStatusEffect("stunned", { active: false });
    }
  }

  /** Peut-il encore se défendre ce tour, selon la variante de défense ? */
  get canDefend() {
    const st = this.statuses ?? new Set();
    if (["staked", "torpor", "incapacitated", "dead"].some(id => st.has(id))) return false;
    if (!this.inActiveCombat) return true;
    const c = this.system.combat;
    if (c.noDefense) return false;
    const r = rule("defenseRule");
    if (r === "dicePenalty") return true;
    if (r === "firstFree" && !c.defensesUsed) return true;
    return c.actions > 0;
  }

  /** Coût de la prochaine défense, pour l'affichage. */
  get defenseCostLabel() {
    if (!this.inActiveCombat) return "";
    const c = this.system.combat;
    const r = rule("defenseRule");
    if (r === "dicePenalty") return loc("NOCTIS.js.SansAction1DeALa", { p0: c.defensePenalty ? loc("NOCTIS.js.Deja", { defensePenalty: c.defensePenalty }) : "" });
    if (r === "firstFree" && !c.defensesUsed) return loc("NOCTIS.js.DefenseReflexeGratuite");
    return loc("NOCTIS.js.ActionSRestanteS", { actions: c.actions });
  }

  /** Paie une défense selon la variante. Renvoie { ok, note }. */
  async payDefense() {
    if (!this.inActiveCombat) return { ok: true, note: "" };
    const c = this.system.combat;
    const r = rule("defenseRule");
    if (r === "dicePenalty") {
      await this.update({ "system.combat.defensesUsed": c.defensesUsed + 1, "system.combat.defensePenalty": c.defensePenalty + 1 });
      return { ok: true, note: loc("NOCTIS.js.SansAction1DeALa2", { p0: c.defensePenalty + 1 }) };
    }
    if (r === "firstFree" && !c.defensesUsed) {
      await this.update({ "system.combat.defensesUsed": 1 });
      return { ok: true, note: loc("NOCTIS.js.DefenseReflexeGratuite2") };
    }
    if (!(await this.useAction({ attack: false }))) return { ok: false, note: "" };
    await this.update({ "system.combat.defensesUsed": c.defensesUsed + 1 });
    return { ok: true, note: loc("NOCTIS.js.1ActionUtilisee") };
  }

  /** Points de Vélocité activables ce tour : niveau, sang disponible, sang par tour. */
  get celerityAvailable() {
    const s = this.system;
    const c = s.mechanics?.speed ?? 0;
    if (!c || !s.usesBlood) return 0;
    return Math.max(0, Math.min(c, s.blood.value, s.blood.perTurn ?? c));
  }

  /** Dépense n points de sang : n actions supplémentaires, dont au plus la moitié (arrondi sup.) d'attaques. */
  async activateCelerity(n) {
    n = Math.max(0, Math.min(Number(n) || 0, this.celerityAvailable));
    if (!n) return false;
    if (!(await this.spendBlood(n))) return false;
    const c = this.system.combat;
    await this.update({
      "system.combat.actions": c.actions + n, "system.combat.actionsMax": c.actionsMax + n,
      "system.combat.attacksLeft": c.attacksLeft + Math.ceil(n / 2), "system.combat.celerityActive": n
    });
    await this.#notify(loc("NOCTIS.js.ActivePointDeSangActionSupplementaire", { name: this.name, p1: this.system.mechanicNames?.speed ?? loc("NOCTIS.js.LaVelocite"), n, p3: n > 1 ? "s" : "", p4: n > 1 ? "s" : "", p5: n > 1 ? "s" : "", p6: Math.ceil(n / 2), p7: Math.ceil(n / 2) > 1 ? "s" : "" }));
    return true;
  }

  /** Consomme une action (et une attaque si besoin). Renvoie false s'il n'en reste pas. */
  async useAction({ attack = false } = {}) {
    const c = this.system.combat;
    if (c.actions <= 0 || (attack && c.attacksLeft <= 0)) return false;
    const upd = { "system.combat.actions": c.actions - 1 };
    if (attack) upd["system.combat.attacksLeft"] = c.attacksLeft - 1;
    await this.update(upd);
    return true;
  }

  /** Le personnage participe-t-il au combat en cours ? */
  get inActiveCombat() {
    const cbt = game.combat;
    if (!cbt?.started) return false;
    return cbt.combatants.some(c => c.actor === this || (c.actorId === this.id && !this.isToken));
  }

  /**
   * Manœuvres défensives possibles contre une attaque.
   * @param {string} attackKind  melee | brawl | ranged
   */
  defenseOptions(attackKind = "melee") {
    const s = this.system;
    const dex = s.attributes.dexterity.total;
    const cel = s.celerityBonus ?? 0;
    const mod = (s.health.penalty ?? 0) - (s.armorPenalty ?? 0) + cel;
    const ab = (k) => s.abilities[k]?.total ?? 0;
    const opts = [{ key: "dodge", label: loc("NOCTIS.js.Esquive"), pool: Math.max(0, dex + ab("athletics") + mod), parts: loc("NOCTIS.js.DexteriteAthletisme", { dex, p1: ab("athletics") }) }];
    const hasMelee = this.items.some(i => i.type === "weapon" && i.system.equipped && i.system.ability === "melee");
    if (attackKind !== "ranged" && hasMelee) opts.push({ key: "parry", label: loc("NOCTIS.js.Parade"), pool: Math.max(0, dex + ab("melee") + mod), parts: loc("NOCTIS.js.DexteriteMelee", { dex, p1: ab("melee") }) });
    if (attackKind === "brawl") opts.push({ key: "block", label: loc("NOCTIS.js.Blocage"), pool: Math.max(0, dex + ab("brawl") + mod), parts: loc("NOCTIS.js.DexteriteBagarre", { dex, p1: ab("brawl") }) });
    const extra = [];
    if (cel) extra.push(`${s.mechanicNames?.speed ?? loc("NOCTIS.js.Velocite")} +${cel}`);
    if (s.health.penalty) extra.push(loc("NOCTIS.js.Blessures", { penalty: s.health.penalty }));
    if (s.armorPenalty) extra.push(loc("NOCTIS.js.Armure2", { armorPenalty: s.armorPenalty }));
    for (const o of opts) o.parts = [o.parts, ...extra].join(" · ");
    return opts.sort((a, b) => b.pool - a.pool);
  }

  /* -------------------------------------------- */
  /*  Sang et Volonté                              */
  /* -------------------------------------------- */

  async spendBlood(n = 1, reason = "") {
    const cur = this.system.blood.value;
    if (cur < n) { ui.notifications.warn(loc("NOCTIS.js.NAPasAssezDeSang", { name: this.name, cur })); return false; }
    await this.update({ "system.blood.value": cur - n });
    if (reason) await this.#notify(loc("NOCTIS.js.DepensePointDeSang", { name: this.name, n, p2: n > 1 ? "s" : "", reason }));
    return true;
  }

  async spendWillpower(n = 1, reason = "") {
    const cur = this.system.willpower.temporary;
    if (cur < n) { ui.notifications.warn(loc("NOCTIS.js.NAPlusDeVolonte", { name: this.name })); return false; }
    await this.update({ "system.willpower.temporary": cur - n });
    if (reason) await this.#notify(loc("NOCTIS.js.DepensePointDeVolonte", { name: this.name, n, reason }));
    return true;
  }

  /** Guérison par le sang : 1 point soigne un niveau létal ou contondant. */
  async bloodHeal() {
    const h = this.system.health;
    const type = h.lethal > 0 ? "lethal" : (h.bashing > 0 ? "bashing" : null);
    if (!type) return ui.notifications.info(loc("NOCTIS.js.AucuneBlessureContondanteOuLetaleA"));
    // Variante : 1 guérison gratuite par tour, puis 1 action chacune
    let cost = "";
    const c = this.system.combat;
    const paid = this.inActiveCombat && rule("bloodHealCombat") === "firstFree" && c.healsUsed > 0;
    if (paid && c.actions <= 0) return ui.notifications.warn(loc("NOCTIS.js.ADejaGueriGratuitementCeTour", { name: this.name }));
    if (!(await this.spendBlood(1))) return;
    if (this.inActiveCombat) {
      if (paid) { await this.useAction({ attack: false }); cost = loc("NOCTIS.js.1Action"); }
      else if (rule("bloodHealCombat") === "firstFree") cost = loc("NOCTIS.js.GuerisonGratuiteDuTour");
      await this.update({ "system.combat.healsUsed": c.healsUsed + 1 });
    }
    await this.healDamage(type, 1);
    await this.#notify(loc("NOCTIS.js.Depense1PointDeSangEt", { name: this.name, p1: NOCTIS.damageTypes[type].label.toLowerCase(), cost }));
  }

  /** Guérison d'un niveau aggravé : 5 points de sang et une journée de repos. */
  async bloodHealAggravated() {
    if (!this.system.health.aggravated) return ui.notifications.info(loc("NOCTIS.js.AucuneBlessureAggravee"));
    if (!(await this.spendBlood(5))) return;
    await this.healDamage("aggravated", 1);
    await this.#notify(loc("NOCTIS.js.Depense5PointsDeSangEt", { name: this.name }));
  }

  /** Amplification : +1 à un attribut physique pour la scène. */
  async bloodBoost(attr) {
    if (!NOCTIS.physicalAttributes.includes(attr)) return;
    if (!(await this.spendBlood(1))) return;
    const cur = this.system.boosts[attr] ?? 0;
    await this.update({ [`system.boosts.${attr}`]: cur + 1 });
    await this.#notify(loc("NOCTIS.js.Depense1PointDeSang1", { name: this.name, p1: NOCTIS.attributes[attr] }));
  }

  async endScene() {
    await this.update({ "system.boosts.strength": 0, "system.boosts.dexterity": 0, "system.boosts.stamina": 0 });
    ui.notifications.info(loc("NOCTIS.js.FinDeSceneLesAmplificationsDe", { name: this.name }));
  }

  /** Réveil : −1 sang, +1 Volonté temporaire. */
  async nightfall() {
    const s = this.system;
    const upd = {};
    // En torpeur, le vampire ne perd plus de sang avec le temps
    if (this.system.usesBlood && this.system.isVampire && !this.statuses?.has("torpor")) upd["system.blood.value"] = Math.max(0, s.blood.value - 1);
    upd["system.willpower.temporary"] = Math.min(s.willpower.max, s.willpower.temporary + 1);
    await this.update(upd);
    await this.#notify(loc("NOCTIS.js.SEveille1PointDeSang", { name: this.name }));
  }

  async #notify(html) {
    return ChatMessage.create({ content: `<div class="noctis-note">${html}</div>`, speaker: ChatMessage.getSpeaker({ actor: this }), whisper: [] });
  }

  /* -------------------------------------------- */
  /*  Expérience                                   */
  /* -------------------------------------------- */

  async addXpEntry(entry) {
    const log = foundry.utils.deepClone(this.system.experience.log);
    log.push({ id: foundry.utils.randomID(), date: new Date().toLocaleDateString("fr-FR"), user: game.user.name, ...entry });
    return this.update({ "system.experience.log": log });
  }

  async updateXpEntry(id, changes) {
    const log = foundry.utils.deepClone(this.system.experience.log);
    const e = log.find(x => x.id === id);
    if (!e) return;
    Object.assign(e, changes);
    return this.update({ "system.experience.log": log });
  }

  async deleteXpEntry(id) {
    const log = this.system.experience.log.filter(x => x.id !== id);
    return this.update({ "system.experience.log": log });
  }

  /**
   * Décrit l'achat d'un trait : catégorie, coût, chemin de données.
   * @param {string} path  ex. system.attributes.strength.value | item.<id>
   */
  describePurchase(path, from, to) {
    const s = this.system;
    let category = "other", label = path;
    let multiplier = 1;
    if (path.startsWith("system.attributes.")) { category = "attribute"; label = NOCTIS.attributes[path.split(".")[2]]; }
    else if (path.startsWith("system.abilities.")) { category = from === 0 ? "newAbility" : "ability"; label = NOCTIS.abilities[path.split(".")[2]]; }
    else if (path.startsWith("system.backgrounds.")) { category = "background"; label = NOCTIS.backgrounds[path.split(".")[2]]; }
    else if (path.startsWith("system.virtues.")) {
      category = "virtue"; const k = path.split(".")[2]; label = s.virtues[k].label;
      if (k === "conscience" && this.#hasFlag("doubleConscienceXp")) multiplier = 2;
    }
    else if (path === "system.willpower.permanent") { category = "willpower"; label = loc("NOCTIS.js.Volonte"); }
    else if (path === "system.road.value") { category = "road"; label = s.road.name || loc("NOCTIS.js.Voie"); if (this.#hasFlag("doubleConscienceXp")) multiplier = 2; }
    else if (path.startsWith("item.")) {
      const it = this.items.get(path.split(".")[1]);
      label = it?.name ?? "?";
      if (it?.type === "discipline") {
        if (it.system.isPath) category = it.system.primary ? (it.system.isClan ? "clanDiscipline" : "otherDiscipline") : "secondaryPath";
        else category = it.system.isClan ? "clanDiscipline" : "otherDiscipline";
      } else if (it?.type === "ability") category = from === 0 ? "newAbility" : "ability";
    }
    // Le coût est cumulatif sur chaque point
    let cost = 0;
    for (let v = from; v < to; v++) cost += xpCost(category, v, { multiplier });
    return { category, label, cost };
  }

  #hasFlag(flag) {
    return this.items.some(i => i.type === "clan" && i.getFlag("noctis", flag));
  }

  /**
   * Achète un trait avec de l'XP (ou gratuitement) et l'inscrit au journal.
   */
  async purchaseTrait(path, from, to, { free = false, note = "" } = {}) {
    const p = this.describePurchase(path, from, to);
    if (!free && p.cost > this.system.experience.available) {
      ui.notifications.warn(loc("NOCTIS.js.PasAssezDExperienceRequisDisponible", { cost: p.cost, available: this.system.experience.available }));
      return false;
    }
    if (path.startsWith("item.")) {
      const it = this.items.get(path.split(".")[1]);
      await it.update({ "system.value": to });
    } else {
      await this.update({ [path]: to }, { noctisMoral: { kind: "xp", text: free ? loc("NOCTIS.moral.FreeProgress") : loc("NOCTIS.moral.XpPurchase", { cost: p.cost }), note } });
    }
    await this.addXpEntry({ kind: "spend", amount: p.cost, free, label: `${p.label} ${from} → ${to}`, category: p.category, trait: path, from, to, note });
    return true;
  }
}
