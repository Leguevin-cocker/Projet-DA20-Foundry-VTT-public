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
import { ChronicleCalendar, ChronicleCalendarGM } from "./module/apps/calendar.mjs";
import { Workshop } from "./module/apps/workshop.mjs";

Hooks.once("init", () => {
  console.log("NOCTIS | Initialisation du système Noctis");

  CONFIG.NOCTIS = NOCTIS;
  game.noctis = { NOCTIS, CharacterCreator, XpLedger, openXpLedger: () => XpLedger.open(), openGmDashboard: () => XpLedger.open(), promptCelerity, variantList, RollDialog, rollPool, xpCost, manualDamageDialog, buildCompendiums, damageTargets,
    beastTest, provocationDialog, time: Time, ChronicleCalendar, ChronicleCalendarGM, openCalendar: (date) => ChronicleCalendar.open(date), openCalendarGM: (date) => ChronicleCalendarGM.open(date), Workshop, openWorkshop: () => Workshop.open() };

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

  CONFIG.Combat.initiative = { formula: "1d10 + @initiative.value + (@initiative.base / 100)", decimals: 2 };

  const Actors = foundry.documents.collections.Actors;
  const Items = foundry.documents.collections.Items;
  Actors.registerSheet("noctis", NOCTISActorSheet, { types: ["vampire", "ghoul", "mortal", "npc"], makeDefault: true, label: "Fiche NOCTIS" });
  Items.registerSheet("noctis", NOCTISItemSheet, { makeDefault: true, label: "Fiche d'objet NOCTIS" });

  game.settings.register("noctis", "compendiumVersion", { scope: "world", config: false, type: String, default: "" });
  registerRuleSettings();
  registerBeastSettings();
  Time.registerTimeSettings();
  registerStatuses();
  game.settings.register("noctis", "xpBatches", { scope: "world", config: false, type: Array, default: [] });
  game.settings.registerMenu("noctis", "workshopMenu", {
    name: "Atelier du conteur", label: "Ouvrir l'atelier", hint: "Créer et ranger lignées, disciplines, Voies, atouts, rituels et équipement de votre table.",
    icon: "fa-solid fa-hammer", type: Workshop, restricted: true
  });
  game.settings.registerMenu("noctis", "xpLedgerMenu", {
    name: "Tableau de bord MJ", label: "Ouvrir le tableau de bord", hint: "Expérience (vue d'ensemble, attribution groupée) et sang des personnages joueurs. Réservé au MJ.",
    icon: "fa-solid fa-chess-king", type: XpLedger, restricted: true
  });
  game.settings.register("noctis", "packVersions", { scope: "world", config: false, type: Object, default: {} });
  game.settings.register("noctis", "rebuildCompendiums", {
    name: "Reconstruire les compendiums",
    hint: "Cochez puis rechargez le monde pour recréer les compendiums NOCTIS à partir des données du système (vos modifications dans ces compendiums seront perdues).",
    scope: "world", config: true, type: Boolean, default: false
  });
  game.settings.register("noctis", "frameStyle", {
    name: "Liseré des cartes de jet",
    hint: "Affiche un liseré décoratif autour des cartes de jet.",
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
        console.error("NOCTIS | Échec de la construction des compendiums", err);
        ui.notifications.error("Noctis : la construction des compendiums a échoué (voir la console F12).");
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
    name: "Créateur de personnage",
    icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>',
    condition: li => actorOf(li)?.isOwner,
    callback: li => CharacterCreator.open(actorOf(li))
  });
}
Hooks.on("getActorContextOptions", addCreatorContext);

/** Libellés des types dans la boîte « Créer un acteur / un objet ». */
Hooks.once("i18nInit", () => {
  const t = { vampire: "Vampire", ghoul: "Goule", mortal: "Mortel", npc: "PNJ" };
  const it = { clan: "Clan / lignée", discipline: "Discipline / voie", merit: "Atout", flaw: "Handicap", ability: "Capacité", road: "Voie (morale)", weapon: "Arme", armor: "Armure", gear: "Objet", ritual: "Rituel", derangement: "Dérangement" };
  for (const [k, v] of Object.entries(t)) if (game.i18n.translations.TYPES?.Actor) game.i18n.translations.TYPES.Actor[k] ??= v;
  for (const [k, v] of Object.entries(it)) if (game.i18n.translations.TYPES?.Item) game.i18n.translations.TYPES.Item[k] ??= v;
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
      btn.innerHTML = '<i class="fa-solid fa-chess-king"></i> Tableau de bord MJ';
      btn.addEventListener("click", () => XpLedger.open());
      host.append(btn);
    }
    for (const li of root.querySelectorAll("[data-entry-id]")) {
      const a = game.actors.get(li.dataset.entryId);
      if (!a?.getFlag("noctis", "isPC") || li.querySelector(".noctis-pc-badge")) continue;
      const badge = document.createElement("span");
      badge.className = "noctis-pc-badge";
      badge.textContent = "PJ";
      (li.querySelector(".entry-name, .document-name, h4") ?? li).append(badge);
    }
  } catch (err) { console.warn("NOCTIS | répertoire des acteurs", err); }
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
  btn.innerHTML = '<i class="fa-solid fa-hammer"></i> Atelier du conteur';
  btn.addEventListener("click", () => Workshop.open());
  host.append(btn);
});
