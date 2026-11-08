/**
 * Noctis — système Foundry VTT générique pour des chroniques de vampires à l'époque médiévale (moteur à d10)
 * Point d'entrée.
 */
import { NOCTIS, xpCost } from "./module/config.mjs";
import * as actorModels from "./module/data/actor-models.mjs";
import * as itemModels from "./module/data/item-models.mjs";
import { NOCTISActor } from "./module/documents/actor.mjs";
import { NOCTISItem } from "./module/documents/item.mjs";
import { NOCTISActorSheet } from "./module/sheets/actor-sheet.mjs";
import { NOCTISItemSheet } from "./module/sheets/item-sheet.mjs";
import { RollDialog } from "./module/dice/roll-dialog.mjs";
import { rollPool } from "./module/dice/roll.mjs";
import { registerHandlebars } from "./module/helpers/handlebars.mjs";
import { onRenderChatMessage, registerSocket, manualDamageDialog, damageTargets } from "./module/chat.mjs";
import { buildCompendiums, COMPENDIUM_VERSION } from "./module/compendium-builder.mjs";
import { CharacterCreator } from "./module/apps/character-creator.mjs";
import { XpLedger } from "./module/apps/xp-ledger.mjs";
import { onCombatRound, promptCelerity } from "./module/combat/clash.mjs";
import { registerRuleSettings, variantList } from "./module/variants.mjs";
import { refreshDisciplineRegistry, queueRegistryRefresh } from "./module/registry.mjs";
import { registerStatuses, queueStatusSync, setStatus } from "./module/status.mjs";
import { registerBeastSettings, onBloodChange, beastTest, provocationDialog } from "./module/beast.mjs";
import * as Time from "./module/time/time.mjs";
import * as Morality from "./module/morality.mjs";
import { registerAuraSettings, registerAuraHooks, refreshAllAuras, auraDebug } from "./module/aura-fx.mjs";
import { ChronicleCalendar, ChronicleCalendarGM } from "./module/apps/calendar.mjs";
import { Workshop } from "./module/apps/workshop.mjs";
import { loc, localizeRegistered } from "./module/i18n.mjs";

Hooks.once("init", () => {
  console.log("Noctis | init");

  CONFIG.NOCTIS = NOCTIS;
  game.noctis = { NOCTIS, CharacterCreator, XpLedger, openXpLedger: () => XpLedger.open(), openGmDashboard: () => XpLedger.open(), promptCelerity, variantList, RollDialog, rollPool, xpCost, manualDamageDialog, buildCompendiums, damageTargets,
    beastTest, provocationDialog, time: Time, ChronicleCalendar, ChronicleCalendarGM, openCalendar: (date) => ChronicleCalendar.open(date), openCalendarGM: (date) => ChronicleCalendarGM.open(date), Workshop, openWorkshop: () => Workshop.open(), morality: Morality, auraDebug };

  CONFIG.Actor.documentClass = NOCTISActor;
  CONFIG.Item.documentClass = NOCTISItem;

  Object.assign(CONFIG.Actor.dataModels, {
    vampire: actorModels.VampireModel,
    ghoul: actorModels.GhoulModel,
    mortal: actorModels.MortalModel,
    npc: actorModels.NpcModel
  });
  Object.assign(CONFIG.Item.dataModels, {
    clan: itemModels.ClanModel,
    discipline: itemModels.DisciplineModel,
    merit: itemModels.MeritModel,
    flaw: itemModels.FlawModel,
    ability: itemModels.AbilityModel,
    road: itemModels.RoadModel,
    weapon: itemModels.WeaponModel,
    armor: itemModels.ArmorModel,
    gear: itemModels.GearModel,
    ritual: itemModels.RitualModel,
    derangement: itemModels.DerangementModel
  });

  CONFIG.Combat.initiative = { formula: `1d10 + @initiative.value + (@initiative.base / 100)`, decimals: 2 };

  const Actors = foundry.documents.collections.Actors;
  const Items = foundry.documents.collections.Items;
  Actors.registerSheet("noctis", NOCTISActorSheet, { types: ["vampire", "ghoul", "mortal", "npc"], makeDefault: true, label: loc("NOCTIS.js.FicheNoctis") });
  Items.registerSheet("noctis", NOCTISItemSheet, { makeDefault: true, label: loc("NOCTIS.js.FicheDObjetNoctis") });

  game.settings.register("noctis", "compendiumVersion", { scope: "world", config: false, type: String, default: "" });
  registerRuleSettings();
  registerBeastSettings();
  Time.registerTimeSettings();
  registerStatuses();
  Morality.registerMoralHooks();
  registerAuraSettings();
  registerAuraHooks();
  game.settings.register("noctis", "xpBatches", { scope: "world", config: false, type: Array, default: [] });
  game.settings.registerMenu("noctis", "workshopMenu", {
    name: loc("NOCTIS.js.AtelierDuConteur"), label: loc("NOCTIS.js.OuvrirLAtelier"), hint: loc("NOCTIS.js.CreerEtRangerLigneesDisciplinesVoies"),
    icon: "fa-solid fa-hammer", type: Workshop, restricted: true
  });
  game.settings.registerMenu("noctis", "xpLedgerMenu", {
    name: loc("NOCTIS.js.TableauDeBordMj"), label: loc("NOCTIS.js.OuvrirLeTableauDeBord"), hint: loc("NOCTIS.js.ExperienceVueDEnsembleAttributionGroupee"),
    icon: "fa-solid fa-chess-king", type: XpLedger, restricted: true
  });
  game.settings.register("noctis", "packVersions", { scope: "world", config: false, type: Object, default: {} });
  game.settings.register("noctis", "rebuildCompendiums", {
    name: loc("NOCTIS.js.ReconstruireLesCompendiums"),
    hint: loc("NOCTIS.js.CochezPuisRechargezLeMondePour"),
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register("noctis", "frameStyle", {
    name: loc("NOCTIS.js.LisereDesCartesDeJet"),
    hint: loc("NOCTIS.js.AfficheUnLisereDecoratifAutourDes"),
    scope: "client", config: true, type: Boolean, default: true,
    onChange: v => document.body.classList.toggle("noctis-noframe", !v)
  });

  registerHandlebars();
  foundry.applications.handlebars.loadTemplates([
    "systems/noctis/templates/actor/parts/dots.hbs",
    "systems/noctis/templates/actor/parts/trait-row.hbs",
    "systems/noctis/templates/actor/parts/item-row.hbs"
  ]);
});

Hooks.once("ready", async () => {
  registerSocket();
  document.body.classList.toggle("noctis-noframe", !game.settings.get("noctis", "frameStyle"));
  if (game.users.activeGM?.isSelf) {
    const force = game.settings.get("noctis", "rebuildCompendiums");
    const ver = game.settings.get("noctis", "compendiumVersion");
    if (force || ver !== COMPENDIUM_VERSION) {
      try {
        await buildCompendiums(force);
        await game.settings.set("noctis", "compendiumVersion", COMPENDIUM_VERSION);
        if (force) await game.settings.set("noctis", "rebuildCompendiums", false);
      } catch (err) {
        console.error(loc("NOCTIS.js.NoctisEchecDeLaConstructionDes"), err);
        ui.notifications.error(loc("NOCTIS.js.NoctisLaConstructionDesCompendiumsA"));
      }
    }
  }
});

Hooks.on("renderChatMessageHTML", onRenderChatMessage);
Hooks.on("updateCombat", onCombatRound);

/* États automatiques des jetons et déclencheurs de la Bête (côté MJ) */
Hooks.on("updateActor", (actor, changes) => {
  if (foundry.utils.hasProperty(changes, "system")) {
    onBloodChange(actor, changes);
    queueStatusSync(actor);
  }
});
Hooks.on("updateToken", (token, changes) => { if (changes.delta && token.actor) queueStatusSync(token.actor); });
Hooks.on("createToken", (token) => { if (token.actor) queueStatusSync(token.actor); });
/* Fin du combat : on retire les états passagers (chute, lutte, étourdissement) */
Hooks.on("deleteCombat", async (combat) => {
  if (!game.users.activeGM?.isSelf) return;
  for (const c of combat.combatants) {
    const a = c.actor;
    if (!a) continue;
    for (const id of ["prone", "grappled", "stunned"]) await setStatus(a, id, false);
    if (a.system.combat?.noDefense || a.system.combat?.celerityActive) await a.update({ "system.combat.noDefense": false, "system.combat.celerityActive": 0 });
  }
});
Hooks.once("ready", () => Time.renderClock());
/* Registre des disciplines : objets du monde et compendiums */
Hooks.once("ready", () => refreshDisciplineRegistry());
for (const h of ["createItem", "updateItem", "deleteItem", "updateCompendium"]) Hooks.on(h, () => queueRegistryRefresh());

/** Entrée « Créateur de personnage » dans le menu clic droit du répertoire des acteurs. */
function addCreatorContext(_app, options) {
  const actorOf = li => game.actors.get((li?.dataset ?? li?.[0]?.dataset)?.entryId);
  options.push({
    name: loc("NOCTIS.js.CreateurDePersonnage"),
    icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>',
    condition: li => actorOf(li)?.isOwner,
    callback: li => CharacterCreator.open(actorOf(li))
  });
}
Hooks.on("getActorContextOptions", addCreatorContext);

/** Libellés des types dans la boîte « Créer un acteur / un objet ». */
Hooks.once("i18nInit", () => {
  // Tables construites au chargement (config, manœuvres, aides, variantes…) : clés -> textes de la langue choisie
  localizeRegistered();
});

/** Répertoire des acteurs : bouton « Tableau de bord MJ » (MJ) et pastille « PJ ». */
Hooks.on("renderActorDirectory", (app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  try {
    if (game.user.isGM && !root.querySelector(".noctis-ledger-btn")) {
      const host = root.querySelector(".header-actions") ?? root.querySelector(".directory-header") ?? root;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "noctis-ledger-btn";
      btn.innerHTML = loc("NOCTIS.js.TableauDeBordMj2");
      btn.addEventListener("click", () => XpLedger.open());
      host.append(btn);
    }
    for (const li of root.querySelectorAll("[data-entry-id]")) {
      const a = game.actors.get(li.dataset.entryId);
      if (!a?.getFlag("noctis", "isPC") || li.querySelector(".noctis-pc-badge")) continue;
      const badge = document.createElement("span");
      badge.className = "noctis-pc-badge";
      badge.textContent = "PJ";
      (li.querySelector(`.entry-name, .document-name, h4`) ?? li).append(badge);
    }
  } catch (err) { console.warn(loc("NOCTIS.js.NoctisRepertoireDesActeurs"), err); }
});
Hooks.on("updateActor", (actor, changes) => {
  if (foundry.utils.hasProperty(changes, "flags.noctis.isPC")) ui.actors?.render();
  const led = foundry.applications.instances?.get?.("noctis-xp-ledger");
  if (led && (foundry.utils.hasProperty(changes, "system.experience") || foundry.utils.hasProperty(changes, "system.blood"))) led.render();
});



/** Répertoire des objets : accès à l'atelier du conteur (MJ). */
Hooks.on("renderItemDirectory", (app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || !game.user.isGM || root.querySelector(".noctis-workshop-btn")) return;
  const host = root.querySelector(".header-actions") ?? root.querySelector(".directory-header") ?? root;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "noctis-workshop-btn";
  btn.innerHTML = loc("NOCTIS.js.AtelierDuConteur2");
  btn.addEventListener("click", () => Workshop.open());
  host.append(btn);
});
