# Sources & licences des assets

Tout asset intégré est libre et sa provenance est documentée ici. Aucun visuel
d'application concurrente, aucun GIF récupéré depuis Google Images.

## Police

| Asset | Source | Auteur | Licence | Usage |
|---|---|---|---|---|
| `assets/fonts/inter-latin.woff2` | fonts.google.com (Inter) | Rasmus Andersson | OFL 1.1 | Police d'interface (sous-ensemble latin) |
| `assets/fonts/inter-latin-ext.woff2` | fonts.google.com (Inter) | Rasmus Andersson | OFL 1.1 | Latin étendu, chargé à la demande |

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
