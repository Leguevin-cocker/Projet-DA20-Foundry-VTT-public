# Noctis — Vampire: The Dark Ages for Foundry VTT

🇫🇷 [Version française](README.fr.md)

A Foundry VTT (v14) system for **Vampire: The Dark Ages** (20th Anniversary Edition), using the game's own vocabulary:
clans, disciplines (Celerity, Fortitude, Potence…), Roads, Virtues, Rötschreck. Full d10 engine (dice pools,
difficulties, 1s cancelling successes, 7 health levels, blood, Willpower).

**Bilingual: English and French.** The interface follows Foundry's language setting, and compendiums are built in that
language (English for any language other than French).

**Included:** the 13 clans (names, clan disciplines, a short summary of each weakness), example Merits and Flaws,
generic weapons and armor, and 63 ready-made NPCs (mortals, ghouls, a typical vampire per clan, Lupines,
animals) with stats and tactics, sorted into folders.

**Not included:** no text from the books, **no discipline sheets** (each table enters the powers in the workshop) and
**no Roads** (Humanity included: each table creates its own with their Hierarchy of Sins). You need the core rulebook
to play.

Celerity, Fortitude and Potence are recognized by the engine out of the box (extra actions, soak, automatic Strength
successes), even on a discipline created by hand.

## Dark Pack

This project is free fan content published under the
[Dark Pack](https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement).

> Portions of the materials are the copyrights and trademarks of Paradox Interactive AB, and are used with permission.
> All rights reserved. For more information please visit worldofdarkness.com.
>
> This material is not official World of Darkness material.

## Features

- **Modern sheets**: clickable dots, context panel, tabs for Biography, Traits, Disciplines, Combat, Advantages, Road, Experience,
  Relations, Domain, Chronicle and Variants.
- **Biography view**: a public profile (portrait, title, player, chronicle, chosen identity facts and a description),
  set up by the player. Users with only Limited access to a character see this view and nothing else.
- **Character creator**, guided (step by step, points counted, steps validated) or free. It reads all the content from
  the world and the compendiums.
- **Rolls**: a full roll window (specialty, Willpower, blood boosts, multiple actions, automatic bonuses and penalties
  from Merits and Flaws).
- **Automated combat**: opposed rolls with targets sorted by range, then defense, damage and soak, ending in a summary
  card.
  - Maneuvers (great blow, sweep, disarm, clinch, hold, tackle, bite, stake, riposte, suppressive fire…), targeting,
    position, cover, aiming.
  - Actions per turn, Celerity (extra actions for blood), token conditions (prone, grappled, stunned, blinded, staked,
    torpor…).
- **The Beast**: frenzy and Rötschreck tests (fire, sunlight) with accumulated successes, plus automatic triggers (blood
  at zero, sight of blood while hungry, fire and burns in combat).
- **Chronicle time**: a Julian calendar with moon phases, sunrise and sunset, and feast days; nights, dawn, vampires
  awakening, time skips, torpor. Two views (players and GM), events revealed as play goes on, and Month, Year, Century
  and Timeline views. Quick-access bar on the left edge of the screen.
- **Road and creed**: a Road tab named after the character's Road (aura and its difficulty table, waking time, dice
  cap, hierarchy of sins split into at-risk and safe levels, creed overrides), a sin button that rolls the virtue at the
  right difficulty and applies the loss, epiphanies at half XP cost, and a moral journal that records every change with
  the chronicle date. Roads, their creeds and sins are written by you in the Road item.
- **Experience**: buy traits from the sheet, a log, and a GM dashboard (group awards, PCs' blood, Roads overview).
- **Rule variants** you can toggle (reflexive defense, minimum damage, NPCs use the average result, initiative, 10s
  always double, 1s variant, armor against fire, Willpower on soak…).

## Creating content: the storyteller's workshop

Open the **Storyteller's workshop** (hammer button in the left bar, the Items tab, or the game settings). It gathers
world and compendium items and lets you:

- create or edit **clans and bloodlines**: clan disciplines, weakness as text and as effects (Appearance 0, doubled
  morality XP, automatic roll bonuses or penalties), emblem;
- create **disciplines**: powers by level (pool, difficulty, cost, duration, description). A discipline can fill a
  **mechanical role**, applied automatically:
  - *Celerity*: Dexterity and initiative bonus, extra actions for blood;
  - *Fortitude*: soak dice, including against aggravated damage;
  - *Potence*: automatic successes on Strength rolls and on Strength-based damage;
- create **sorcery paths** (disciplines ticked as “path”, tied to a parent discipline) and **rituals**;
- create **Roads** with their Hierarchy of Sins;
- create **Merits and Flaws**, with several levels if needed;
- **store** all the world's content in a compendium to reuse it elsewhere.

Clans, disciplines and paths are linked through each discipline's **key**. For the game's disciplines, use the keys
`celerity`, `fortitude`, `potence`, `auspex`, `dominate`, `presence`, `obfuscate`, `animalism`, `protean`, `dementation`,
`chimerstry`, `necromancy`, `obtenebration`, `quietus`, `serpentis`, `thaumaturgy`, `vicissitude`: the provided clans
point to them.

## Installation

In Foundry VTT, *Install System* → paste the manifest URL:

```
https://github.com/Leguevin-cocker/Projet-DA20-Foundry-VTT-public/releases/latest/download/system.json
```

The first time a world loads, the GM builds the compendiums (“Noctis — Clans”, Merits and Flaws, weapons and armor, ready-made NPCs).

## License

Code under the MIT license (see `LICENSE.txt`). Fonts under the SIL Open Font License 1.1.

## Translations

Strings live in `lang/en.json` and `lang/fr.json` (`NOCTIS.ui.*` keys for templates, `NOCTIS.js.*` for code).
Compendium content is in `data/en/` (English) and `data/` (French). To add a language, copy `lang/en.json`, translate
it and declare it in `system.json`.
