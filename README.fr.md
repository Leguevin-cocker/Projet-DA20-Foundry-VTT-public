# Noctis — Vampire : l'Âge des Ténèbres pour Foundry VTT

🇬🇧 [English version](README.md)

Système pour Foundry VTT (v14) pour **Vampire : l'Âge des Ténèbres** (édition 20e anniversaire), avec le vocabulaire du
jeu : clans, disciplines (Célérité, Force d'âme, Puissance…), Voies, vertus, Rötschreck. Moteur à d10 complet
(groupements, difficultés, réussites annulées par les 1, santé à 7 niveaux, sang, Volonté).

**Bilingue : français et anglais / French and English.** L'interface suit la langue choisie dans Foundry, et les
compendiums sont construits dans cette langue. *The interface follows Foundry's language setting; compendiums are built
in that language (English for any language other than French).*

**Ce qui est fourni :** les 13 clans (noms, disciplines de clan, faiblesse résumée), des atouts et handicaps d'exemple,
des armes et armures génériques, et 63 PNJ prêts à l'emploi (mortels, goules, un vampire type par clan, Lupins,
animaux) avec caractéristiques et tactique, rangés par dossiers.

**Ce qui n'est pas fourni :** aucun texte des livres, **aucune fiche de discipline** (les pouvoirs sont à saisir par chaque
table dans l'atelier) et **aucune Voie** (Humanité comprise : chaque table crée les siennes avec leur hiérarchie des
péchés). Il vous faut le livre de base pour jouer.

Célérité, Force d'âme et Puissance sont reconnues d'office par le moteur (actions supplémentaires, absorption, réussites
automatiques de Force), même sur une discipline créée à la main.

## Dark Pack

Ce projet est un contenu de fan gratuit, publié dans le cadre du [Dark Pack](https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement).

> Portions of the materials are the copyrights and trademarks of Paradox Interactive AB, and are used with permission.
> All rights reserved. For more information please visit worldofdarkness.com.
>
> Ce contenu n'est pas un produit officiel du World of Darkness. *This material is not official World of Darkness material.*

## Ce que fait le système

- **Fiches** modernes : traits à points cliquables, panneau contextuel, onglets Biographie, Traits, Disciplines, Combat, Avantages,
  Voie, Expérience, Relations, Domaine, Chronique, Variantes.
- **Vue Biographie** : un profil public (portrait, titre, joueur, chronique, éléments d'identité choisis et description),
  réglé par le joueur. Un utilisateur qui n'a qu'un accès limité à un personnage ne voit que cette vue.
- **Créateur de personnage** guidé (pas à pas, points comptés, étapes validées) ou libre. Il lit tout le contenu du monde
  et des compendiums.
- **Jets** : fenêtre de jet complète (spécialité, Volonté, amplification par le sang, actions multiples, bonus et malus
  automatiques des atouts et handicaps).
- **Combat automatisé** : jet opposé avec cibles triées par portée, défense, dégâts, absorption, carte récapitulative.
  - Manœuvres (coup puissant, balayage, désarmement, empoignade, saisie, placage, morsure, pieu, riposte, tir de
    suppression…), ciblage, position, couvert, visée.
  - Actions par tour, Célérité (actions supplémentaires contre du sang), états des jetons (à terre, empoigné,
    étourdi, aveuglé, pieu au cœur, torpeur…).
- **La Bête** : tests de frénésie et de Rötschreck (feu, soleil) avec cumul de réussites, déclencheurs automatiques (sang à
  zéro, vue du sang quand on est assoiffé, feu et brûlures en combat).
- **Temps de la chronique** : calendrier julien avec lune, lever et coucher du soleil, fêtes ; nuits, aube, réveil des
  vampires, ellipses, torpeur. Deux vues (joueurs et MJ), événements révélés au fil du jeu, vues Mois, Année, Siècle,
  Chronologie. Barre d'accès sur le bord gauche de l'écran.
- **Voie et credo** : un onglet au nom de la Voie du personnage (aura et sa table de difficulté, heure du réveil, plafond
  de dés, hiérarchie des péchés séparée en niveaux à risque et sans risque, péchés propres au credo), un bouton de péché
  qui lance la vertu à la bonne difficulté et applique la perte, l'épiphanie à moitié prix en XP, et un journal moral
  qui note chaque changement avec la date de la chronique. Les Voies, leurs credo et leurs péchés se saisissent dans
  l'objet Voie.
- **Expérience** : achat de traits sur la fiche, journal, tableau de bord MJ (attribution groupée, sang des PJ, vue des Voies).
- **Variantes de règles** réglables (défense réflexe, dégâts minimum, PNJ au résultat moyen, initiative, 10 doubles,
  variante des 1, armure contre le feu, Volonté sur l'absorption…).

## Créer son contenu : l'atelier du conteur

Ouvrez l'**Atelier du conteur** (bouton marteau dans la barre de gauche, ou onglet Objets, ou Paramètres du jeu). Il
rassemble les objets du monde et des compendiums et permet de :

- créer ou modifier des **clans et lignées** : disciplines de clan, faiblesse en texte et en effets (Apparence à 0, XP de morale doublée,
  bonus ou malus de jet automatiques), blason ;
- créer des **disciplines** : pouvoirs par niveau (groupement, difficulté, coût, durée, description). Une discipline peut
  tenir un **rôle mécanique**, appliqué automatiquement :
  - *Célérité* : bonus de Dextérité et d'initiative, actions supplémentaires contre du sang ;
  - *Force d'âme* : dés d'absorption, y compris contre les dégâts aggravés ;
  - *Puissance* : réussites automatiques aux jets de Force et aux dégâts fondés sur la Force ;
- créer des **voies de sorcellerie** (disciplines cochées « voie », rattachées à une discipline mère) et des **rituels** ;
- créer des **Voies morales** avec leur hiérarchie des péchés ;
- créer des **atouts et handicaps**, à plusieurs niveaux si besoin ;
- **ranger** tout le contenu du monde dans un compendium pour le réutiliser ailleurs.

Les clans, disciplines et voies se relient par la **clé** de chaque discipline. Pour les disciplines du jeu, utilisez les clés
`celerity`, `fortitude`, `potence`, `auspex`, `dominate`, `presence`, `obfuscate`, `animalism`, `protean`, `dementation`,
`chimerstry`, `necromancy`, `obtenebration`, `quietus`, `serpentis`, `thaumaturgy`, `vicissitude` : les clans fournis y renvoient.

## Installation

Dans Foundry VTT, *Installer un système* → coller l'adresse du manifeste :

```
https://github.com/Leguevin-cocker/Projet-DA20-Foundry-VTT-public/releases/latest/download/system.json
```

Au premier chargement d'un monde, le MJ construit les compendiums (« Noctis — Clans », atouts et handicaps, armes et armures, PNJ prêts à l'emploi).

## Licence

Code sous licence MIT (voir `LICENSE.txt`). Polices sous SIL Open Font License 1.1.

## Traductions

Les textes sont dans `lang/fr.json` et `lang/en.json` (clés `NOCTIS.ui.*` pour les gabarits, `NOCTIS.js.*` pour le
code). Le contenu des compendiums est dans `data/` (français) et `data/en/` (anglais). Pour ajouter une langue :
copier `lang/en.json`, le traduire et le déclarer dans `system.json`.
