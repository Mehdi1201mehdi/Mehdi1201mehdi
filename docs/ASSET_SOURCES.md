# Sources & licences des assets

Tout asset intégré est libre et sa provenance est documentée ici. Aucun visuel
d'application concurrente, aucun GIF récupéré depuis Google Images.

## Police

| Asset | Source | Auteur | Licence | Usage |
|---|---|---|---|---|
| `assets/fonts/inter-latin.woff2` | fonts.google.com (Inter) | Rasmus Andersson | OFL 1.1 | Police d'interface (sous-ensemble latin) |
| `assets/fonts/inter-latin-ext.woff2` | fonts.google.com (Inter) | Rasmus Andersson | OFL 1.1 | Latin étendu, chargé à la demande |
| `assets/fonts/anton-latin.woff2` | fonts.google.com (Anton) | Vernon Adams / Cyreal | OFL 1.1 | **Police d'affichage** — titres uniquement, jamais les chiffres (voir ci-dessous) |

## Anatomie musculaire

| Asset | Source | Licence | Usage |
|---|---|---|---|
| `src/data/anatomy-paths.js` | react-muscle-highlighter (tracés SVG) | MIT | Silhouette anatomique avant/arrière, surbrillance des muscles ciblés |

## Icônes

| Asset | Source | Licence | Usage |
|---|---|---|---|
| `assets/icons/icon.svg` + PNG dérivés | Créé pour le projet (haltère + dégradé d'accent) | Projet | Icône d'app, favicon, PNG 192/512/maskable, apple-touch |

## Médias de démonstration d'exercices

Les vignettes/animations d'exercices proviennent de jeux de données **open source**
(dataset communautaire d'exercices, wger.de) chargés à la volée et mis en cache pour
l'usage hors ligne. Aucune récupération automatique depuis des moteurs d'images.
Les identifiants → URL sont mappés dans `src/data/gifs.js`.

## Règle

Pour tout nouvel asset intégré, ajouter une ligne ici : **Nom · Source · Auteur ·
Licence · URL · Usage**. Pas d'asset sans licence claire.

## Anton : pourquoi les titres seulement

Anton (18,6 Ko, sous-ensemble latin, hébergé en local comme Inter) porte les
titres de l'application. Elle est condensée et lourde : « Ischio-jambiers +
Quadriceps » y tient sur une ligne là où Inter en demandait deux.

**Elle ne touche jamais un nombre.** Mesuré : le chiffre « 1 » d'Anton fait 33,1
unités quand tous les autres en font 49,4 — un tiers de moins. Un chrono passant
de « 00:11 » à « 00:42 » changerait de largeur à chaque seconde, et une colonne
de charges danserait d'une ligne à l'autre. Inter, lui, a des chiffres
tabulaires. Anton dit le NOM des choses, Inter dit leurs VALEURS.

Autre contrainte : Anton n'existe qu'en **une seule graisse (400)**. Y appliquer
`font-weight:900` déclencherait un gras synthétique, épaissi par le navigateur et
laid — d'où `font-synthesis:none` partout où elle est employée.

Bebas Neue, l'autre candidate, a été écartée après comparaison à l'écran : elle
n'a pas de minuscules (tout titre français y passe en capitales) et son trait est
trop léger pour l'usage.
