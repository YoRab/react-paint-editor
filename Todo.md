# TODO

## build

- ladle + Vite
- Build sous rollup ou Esbuild

## structure

- Clean and harmonize props
- Utils + Tests !

## core

- améliorer perfs avec précalculs + usage de path
- pré-rendre les images dans des canvas séparés
- arrondir les positions pour optimiser le rendu

## features

- **true grid**
- add more settings
- internationalization
- add shortcuts (for tools) and show it in titles
- Menu contextuel au clic droit (changement de plan, supprimer, duplicate, copy, lock)
- lissage de traits
- Move + zoom functionnality
- fullscreen mode ?
- **export as svg**

## fixes

- make selection padding works
- Clear with custom callback breaks history stack
- TextEdit cursor overflow MINOR (quick fix : edit on modale ?)
- dnd layout on mobile not working (fix : use dnd lib, or add touch listener to fake dnd, or provide alt UI)
- circle resizing only goes one direction

## improvements

- improve settings ui
- better ui customization (with classname too)
- better UI for curves and polygons
- text tool : create automatically text shape when clicking on tool
- text tool : add font size
- Revoir la collision avec souris et la bordure affichée pour les lignes
- améliorer la sélection en mobile
- revoir la brosse : lacher la souris doit créer une autre forme

# Remarques de thomas :

## done

- les options (épaisseurs, style de trait...) ont une UI très peu utilisable (on sait pas quel option fait quoi et comment, on teste au pif)
  l'option de changement de couleur :
  ne s'applique qu'à la validation, c'est pas top pour savoir quelle couleur on veut parce qu'on est obligé de validé, voir que c'est pas beau, rouvrir... et ainsi de suite
- a un petit bug : j'ouvre la modale de sélection, je clique à côté (ça unselect la forme), je change la couleur et valide : il ne se passe rien. Je comprends la logique derrière, mais à l'usage ça n'a pas trop de sens
- pas de possibilité de setter l'opacité des objets, dommage je pense qu'il y a une vraie utilité à ça
- croix qui efface le canvas
  il faut une confirmation ! :D
- texte: options trop limitée, il faudrait à minima pouvoir changer la taille de la police, choisir plus de police, et faire un peu de mise en forme (i, b, u)
- avoir plusieurs style de pinceau (mode surligneur par exemple). ca serait utile sur des exo et techniquement c'est peut-être juste des preset de taille/couleur/opacité de l'outil actuel

## remaining

- pas de possibilité de sélectionner plusieurs objets avec un press/trace une zone avec la souris/relache (mécanique assez courante quand il y a de la manipulation d'objets)
- pas de possibilité de zoom/dezoom dans le canvas, et ça c'est super utile amha

### pinceau

- certains outils lisse le trait une fois que tu valides le tracé, et ça donne un rendu plus naturel et propre que ce qu'on trace au pad/souris. Du nice to have loin d'être prioritaire
- je ne sais pas pourquoi, mais il a l'air moins fluide/smooth au tracé que marker.js (peut-être une illusion)

### trait

- j'ai été surpris que ça me trace la "forme" dans un rectangle plutôt que d'avoir juste les 2 points sélectionnés (sans le cadre autour quoi)

### polygone

- démarrer avec un polygone à 2 côté, c'est pas possible ça :sourire:
  quand on change le nombre de côté ça reste un truc plat et ensuite on tire des points :
  c'est pas du tout évident
  ça donne des formes qui ne sont pas des polygones (genre un noeuf papillon)
  idéalement, il faudrait démarrer avec un pentagone parfait -5 côtés de même longueur- (en dessous se sont des polygones trop communs) et quand on change le nombre de côté ça reset la forme sur un polygone parfait de X côtés

## bof

- avoir les options dans un tooltip-like, au dessus de la forme, serait merveilleux (comme sur Miro, ou comme sur nos manuels avec la barre de mise en forme de texte)
- rectangle: pas de carré avec maj, snif
  une option de la forme pour bloqué le ratio en "carré" ?
- cercle/elipse
  redondant, la diff des outils me parait too much et pas clair
  bloqué en ratio cercle avec maj ou une option de forme (cf rectangle/carré) ?
