# Noctis — chroniques de vampires médiévales pour Foundry VTT

Système **générique** pour Foundry VTT (v14) : jouer des vampires dans un Moyen Âge sombre, sur un moteur à d10 classique
(groupements de dés, difficultés, réussites annulées par les 1, santé à 7 niveaux, sang, Volonté, vertus, Voies morales).

**Aucun contenu d'univers n'est inclus.** Pas de clans, de disciplines, de sectes ni de textes tirés d'un livre :
chaque table crée son propre contenu avec les éditeurs intégrés. Quelques exemples originaux, écrits pour ce système,
montrent comment faire.

> Ce projet n'est affilié à aucun éditeur. Il ne contient que du code et des textes originaux. Si vous l'utilisez avec
> le contenu d'un jeu commercial que vous possédez, gardez ce contenu pour votre table.

## Ce que fait le système

- **Fiches** modernes : traits à points cliquables, panneau contextuel, onglets Traits, Disciplines, Combat, Avantages,
  Expérience, Relations, Domaine, Chronique, Variantes.
- **Créateur de personnage** guidé (pas à pas, points comptés, étapes validées) ou libre. Il lit tout le contenu du monde
  et des compendiums.
- **Jets** : fenêtre de jet complète (spécialité, Volonté, amplification par le sang, actions multiples, bonus et malus
  automatiques des atouts et handicaps).
- **Combat automatisé** : jet opposé avec cibles triées par portée, défense, dégâts, absorption, carte récapitulative.
  - Manœuvres (coup puissant, balayage, désarmement, empoignade, saisie, placage, morsure, pieu, riposte, tir de
    suppression…), ciblage, position, couvert, visée.
  - Actions par tour, vitesse surnaturelle (actions supplémentaires contre du sang), états des jetons (à terre, empoigné,
    étourdi, aveuglé, pieu au cœur, torpeur…).
- **La Bête** : tests de frénésie et de panique (feu, soleil) avec cumul de réussites, déclencheurs automatiques (sang à
  zéro, vue du sang quand on est assoiffé, feu et brûlures en combat).
- **Temps de la chronique** : calendrier julien avec lune, lever et coucher du soleil, fêtes ; nuits, aube, réveil des
  vampires, ellipses, torpeur. Deux vues (joueurs et MJ), événements révélés au fil du jeu, vues Mois, Année, Siècle,
  Chronologie. Barre d'accès sur le bord gauche de l'écran.
- **Expérience** : achat de traits sur la fiche, journal, tableau de bord MJ (attribution groupée, sang des PJ).
- **Variantes de règles** réglables (défense réflexe, dégâts minimum, PNJ au résultat moyen, initiative, 10 doubles,
  variante des 1, armure contre le feu, Volonté sur l'absorption…).

## Créer son contenu : l'atelier du conteur

Ouvrez l'**Atelier du conteur** (bouton marteau dans la barre de gauche, ou onglet Objets, ou Paramètres du jeu). Il
rassemble les objets du monde et des compendiums et permet de :

- créer des **lignées** : disciplines de lignée, faiblesse en texte et en effets (Apparence à 0, XP de morale doublée,
  bonus ou malus de jet automatiques), blason ;
- créer des **disciplines** : pouvoirs par niveau (groupement, difficulté, coût, durée, description). Une discipline peut
  tenir un **rôle mécanique**, appliqué automatiquement :
  - *Vélocité* : bonus de Dextérité et d'initiative, actions supplémentaires contre du sang ;
  - *Résilience* : dés d'absorption, y compris contre les dégâts aggravés ;
  - *Vigueur surnaturelle* : réussites automatiques aux jets de Force et aux dégâts fondés sur la Force ;
- créer des **voies de sorcellerie** (disciplines cochées « voie », rattachées à une discipline mère) et des **rituels** ;
- créer des **Voies morales** avec leur hiérarchie des péchés ;
- créer des **atouts et handicaps**, à plusieurs niveaux si besoin ;
- **ranger** tout le contenu du monde dans un compendium pour le réutiliser ailleurs.

Les lignées, disciplines et voies se relient par la **clé** de chaque discipline, tirée de son nom si vous ne la changez pas.

## Installation

Dans Foundry VTT, *Installer un système* → coller l'adresse du manifeste :

```
https://raw.githubusercontent.com/Leguevin-cocker/Projet-DA20-Foundry-VTT-public/main/system.json
```

Au premier chargement d'un monde, le MJ construit les compendiums d'exemple (« Noctis — Exemples : … »).

## Licence

Code sous licence MIT (voir `LICENSE.txt`). Polices sous SIL Open Font License 1.1.
