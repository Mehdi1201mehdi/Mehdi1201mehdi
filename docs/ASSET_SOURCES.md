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

**Source · Auteur · Licence · Usage**

| | |
|---|---|
| Dataset | `hasaneyldrm/exercises-dataset` (branche `main`), 1 324 exercices |
| Code du dataset | MIT — © 2026 Hasan Emir Yıldırım |
| Médias (GIF/vignettes) | © **Gym Visual** — https://gymvisual.com/, redistribués avec permission, en 180×180 |
| Usage chez nous | **référencés par URL** (`raw.githubusercontent.com`), jamais copiés dans le dépôt |

**Couverture : 281 exercices sur 343 (82 %).** Les 62 restants sont des
étirements, de la mobilité et du cardio réellement absents du dataset — pas un
défaut de correspondance.

### Ce qui bloquait la moitié du catalogue

L'importeur ne soumettait que `CATALOGUE` (93 exercices) au moteur de
correspondance : les **250 de `exercices-extra` n'étaient jamais présentés**. La
moitié du catalogue ne pouvait donc recevoir aucune démonstration, quel que soit
le contenu du dataset — **le soulevé de terre à la barre n'en avait pas**.

Second frein : le moteur compare des noms, et les nôtres sont en français.
« Développé incliné (barre) » ne rencontre jamais « barbell incline bench press ».
Le dictionnaire `TERMES` (`src/integrations/exercisedb.js`) porte désormais 45
traductions supplémentaires, relevées sur les **noms réels du dataset**, pas
devinées.

### Deux règles nées d'incidents

1. **L'importeur FUSIONNE, il n'écrase jamais.** Une régénération a rendu 190
   associations là où le fichier en portait 224 : publier l'aurait supprimé 34
   démonstrations qui fonctionnaient, sans que rien ne le signale. Une
   association existante prime toujours sur une nouvelle.
2. **Une démonstration fausse est pire que pas de démonstration.** Le repli par
   recouvrement de mots avait associé **six exercices d'abdominaux à une
   animation de course à pied** (dataset `0685 run`, catégorie *cardio*).
   Corrigé, et un test l'interdit désormais nommément.

Garde-fous dans `tests/gifs.test.js` : plancher de couverture, aucune entrée
orpheline, mouvements de base tous couverts, URL toutes en https vers la source
documentée, nombre d'animations partagées plafonné.

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

## Bibliothèque d'exercices : sources et licences (nov. 2026)

| Source | Nombre (catalogue affiché) | Licence | Ce qui est repris |
|---|---|---|---|
| Coach Perso (rédaction maison) | 93 | — | Fiches complètes en français (consignes, erreurs, sécurité, respiration). |
| wger.de | 240 (250 importés, 10 doublons masqués) | CC-BY-SA 4.0 — attribution affichée sur chaque fiche | Nom, muscles, matériel, description d'origine (souvent en anglais). |
| free-exercise-db (github.com/yuhonas/free-exercise-db) | 835 | Unlicense (domaine public) | **Métadonnées seules** : nom anglais, muscles, matériel, niveau, mécanique, catégorie. |
| **Total** | **1 168 exercices distincts** | | |

**Pourquoi pas 3 000 ?** Les autres jeux de données « ouverts » trouvés soit
reprennent ces mêmes mouvements (doublons), soit n'ont pas de provenance claire
pour leurs textes et images (fiches recopiées de sites commerciaux). Gonfler le
compteur en renommant des variantes est exclu : 1 168 est le nombre réel de
mouvements distincts.

**free-exercise-db : ce qui n'est PAS repris.** Le jeu de données dérive de
wrkout/exercises.json, qui ne documente pas l'origine de ses textes
d'instructions ni de ses photos. Tant que cette origine n'est pas établie, ni les
textes ni les images ne sont redistribués : les fiches importées affichent
muscles, matériel et niveau, le schéma anatomique, et le disent.

**Noms français** : construits par règles (scripts/importer-free-exercise-db.mjs) —
mouvement + qualificatifs accordés + matériel. Quand un mot anglais n'est pas
reconnu, le nom anglais est conservé plutôt qu'une traduction approximative
(460 noms traduits, 375 conservés en anglais). Le nom anglais reste toujours
cherchable. Écartés à l'import : 33 doublons du catalogue existant, 8 exercices
de cou (aucun muscle équivalent dans l'app).

**Doublons wger masqués** (`DOUBLONS_MASQUES`, src/data/exercises.js) : 10
entrées wger qui répétaient un exercice maison restent résolubles par leur
identifiant (un historique qui les cite s'affiche toujours) mais ne sont plus
proposées dans le catalogue.

Régénérer : `node scripts/importer-free-exercise-db.mjs <exercises.json>` (outil
de développement ; l'application reste sans étape de build).

## Valeurs MET (calories)

2024 Adult Compendium of Physical Activities — Herrmann SD, Willis EA,
Ainsworth BE et al., *J Sport Health Sci* 2024;13(1):6-12,
https://pacompendium.com/. Codes et valeurs recopiés sans modification dans
src/engine/calories.js (course 12028–12135, marche 17152–17231, natation
18280–18310, rameur 02070–02074, elliptique 02048, vélo d'appartement 01200,
planche 02024). Puissance au rameur : formule publiée par Concept2
(watts = 2,80 / allure³, allure en s/m).
