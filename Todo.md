# Remarques de thomas :

## done

- les options (épaisseurs, style de trait...) ont une UI très peu utilisable (on sait pas quel option fait quoi et comment, on teste au pif)
  l'option de changement de couleur :
  ne s'applique qu'à la validation, c'est pas top pour savoir quelle couleur on veut parce qu'on est obligé de validé, voir que c'est pas beau, rouvrir... et ainsi de suite
- a un petit bug : j'ouvre la modale de sélection, je clique à côté (ça unselect la forme), je change la couleur et valide : il ne se passe rien. Je comprends la logique derrière, mais à l'usage ça n'a pas trop de sens
- pas de possibilité de setter l'opacité des objets, dommage je pense qu'il y a une vraie utilité à ça
- croix qui efface le canvas
  il faut une confirmation ! :D

## remaining

- pas de possibilité de sélectionner plusieurs objets avec un press/trace une zone avec la souris/relache (mécanique assez courante quand il y a de la manipulation d'objets)
- pas de possibilité de zoom/dezoom dans le canvas, et ça c'est super utile amha

### pinceau

- certains outils lisse le trait une fois que tu valides le tracé, et ça donne un rendu plus naturel et propre que ce qu'on trace au pad/souris. Du nice to have loin d'être prioritaire
- avoir plusieurs style de pinceau (mode surligneur par exemple). ca serait utile sur des exo et techniquement c'est peut-être juste des preset de taille/couleur/opacité de l'outil actuel
- je ne sais pas pourquoi, mais il a l'air moins fluide/smooth au tracé que marker.js (peut-être une illusion)

### trait

- j'ai été surpris que ça me trace la "forme" dans un rectangle plutôt que d'avoir juste les 2 points sélectionnés (sans le cadre autour quoi)

### polygone

- démarrer avec un polygone à 2 côté, c'est pas possible ça :sourire:
  quand on change le nombre de côté ça reste un truc plat et ensuite on tire des points :
  c'est pas du tout évident
  ça donne des formes qui ne sont pas des polygones (genre un noeuf papillon)
  idéalement, il faudrait démarrer avec un pentagone parfait -5 côtés de même longueur- (en dessous se sont des polygones trop communs) et quand on change le nombre de côté ça reset la forme sur un polygone parfait de X côtés

### Texte

- options trop limitée, il faudrait à minima pouvoir changer la taille de la police, choisir plus de police, et faire un peu de mise en forme (i, b, u)

## bof

- avoir les options dans un tooltip-like, au dessus de la forme, serait merveilleux (comme sur Miro, ou comme sur nos manuels avec la barre de mise en forme de texte)
- rectangle: pas de carré avec maj, snif
  une option de la forme pour bloqué le ratio en "carré" ?
- cercle/elipse
  redondant, la diff des outils me parait too much et pas clair
  bloqué en ratio cercle avec maj ou une option de forme (cf rectangle/carré) ?

# En prévision / Future MAJ

- fix text

- Migrer sous Vite +

- configurer npm publish

- possibility to have presets
- possibility to provide presets in props
- add presets

- add more settings
- settings ui
- add settings customization

# A prévoir

- ladle (wait for windows support https://github.com/tajo/ladle/issues/67)
- get rid of enum for better typescript
- add shortcuts (for tools) and show it in titles
- Menu contextuel au clic droit (changement de plan, supprimer, duplicate, copy, lock)
- bordure des traits à revoir
- améliorer perfs avec précalculs + usage de path
- lissage de traits
- Move + zoom functionnality
- UI customization
- Tests !
- fix remaining issues
- fullscreen mode ?