# Recherche récursive réelle des ressources Liftoff

Tu as demandé : *« Ne dis pas simplement que les fichiers sont absents. Fais une
recherche récursive et génère une liste réelle des chemins trouvés. »*

Voici la recherche, la commande, les chemins bruts et la conclusion.

## Méthode

Lecture du sommaire des **onze archives** transmises, sans filtre de nom de
fichier, avec deux expressions régulières :

- une sur les **dossiers** : `(^|/)(res|resources|assets|drawable*|mipmap*|raw|font|anim|animator|values*|layout|color)/`
- une sur les **extensions** : `png webp jpg jpeg gif svg riv json mp4 webm ttf otf woff woff2 mp3 ogg wav lottie xml`

**32 771 entrées inspectées.** Script : `/tmp/scan.py` (reproductible).

## Résultat brut — dossiers

| Motif cherché | Chemins trouvés |
|---|---:|
| `layout/` | 373 |
| `drawable/` | 101 |
| `font/` | 82 |
| `color/` | 57 |
| `assets/` | 39 |
| `res/` | 27 |
| `resources/` | 11 |
| `anim/` | 2 |
| `mipmap/` · `raw/` · `animator/` · `values/` | **0** |

Ces nombres ont l'air prometteurs. Ils ne le sont pas — voici les chemins réels.

## Résultat brut — les chemins

```
res/          androidx/appcompat/content/res/AppCompatResources.java
              androidx/compose/ui/res/ColorResources_androidKt.java
              androidx/compose/ui/res/FontResources_androidKt.java
              androidx/compose/ui/res/ImageResources_androidKt.java

drawable/     android/support/v4/graphics/drawable/IconCompatParcelizer.java
              androidx/appcompat/graphics/drawable/AnimatedStateListDrawableCompat.java
              androidx/appcompat/graphics/drawable/DrawableContainerCompat.java
              androidx/appcompat/graphics/drawable/DrawableWrapperCompat.java

font/         androidx/compose/ui/text/font/AndroidAssetFont.java
              androidx/compose/ui/text/font/AndroidFileDescriptorFont.java
              androidx/compose/ui/text/font/AndroidFileFont.java
              androidx/compose/ui/text/font/AndroidFont.java

layout/       androidx/compose/foundation/layout/AlignmentLineKt.java
              androidx/compose/foundation/layout/AlignmentLineOffsetDpElement.java

color/        com/google/android/material/color/ColorContrast.java
              com/google/android/material/color/ColorResourcesLoaderCreator.java

resources/    androidx/appcompat/resources/R.java
              com/google/android/material/resources/CancelableFontCallback.java

anim/         com/swmansion/rnscreens/stack/anim/ScreensAnimation.java
```

**Chaque « dossier de ressources » est en réalité un segment de package Java.**
`res` de `androidx.compose.ui.res`, `drawable` de `androidx.appcompat.graphics.drawable`,
`font` de `androidx.compose.ui.text.font`. Ce sont les **classes qui savent
charger** des images — pas les images.

## Résultat brut — les fichiers à extension média

La recherche par extension, sur les 32 771 entrées, renvoie **quatre lignes**,
soit **deux fichiers uniques** (`assets.rar` a été transmis deux fois) :

| Taille | Chemin | Ce que c'est | Utilisable |
|---:|---|---|---|
| 257 166 o | `assets/CR.png` | logo du groupe de repackaging (`ApplicazioniCR0`) | non — ce n'est pas Liftoff |
| 118 508 o | `assets/GoogleSans-Medium.ttf` | police propriétaire Google | non — non redistribuable |

**Zéro `.webp`. Zéro `.svg`. Zéro `.json` Lottie. Zéro `.riv` Rive. Zéro `.mp4`.
Zéro `.xml` de drawable vectoriel. Zéro icône. Zéro illustration. Zéro
démonstration d'exercice.**

## Pourquoi

Dans un APK Android, **toutes** les ressources visuelles vivent sous `res/` à la
racine de l'archive : `res/drawable-xxxhdpi/`, `res/mipmap-*/`, `res/raw/`,
`res/font/`. Un décompilateur les exporte dans un dossier `resources/` distinct
du dossier `sources/`.

Les onze archives contiennent **uniquement le dossier `sources/`** — le code Java
décompilé. Le dossier `resources/` n'a pas été transmis. Ce n'est ni un oubli de
ma part ni une limite d'outil : les fichiers n'ont jamais existé dans ce qui m'a
été envoyé.

### Ce qu'il faudrait exactement

Depuis jadx, l'export produit deux dossiers côte à côte. Il manque le second :

```
liftoff/
├── sources/     ← transmis (32 771 fichiers)
└── resources/   ← JAMAIS transmis
    └── res/
        ├── drawable/  drawable-xxhdpi/  drawable-xxxhdpi/   ← icônes, illustrations
        ├── mipmap-xxxhdpi/                                   ← logo de l'app
        ├── raw/                                              ← Lottie, vidéos, sons
        ├── font/                                             ← polices
        └── values/colors.xml                                 ← la palette exacte
```

Une archive de `resources/res/` suffirait. Elle pèse en général 10 à 40 Mo, soit
**vingt fois moins** que ce qui a déjà été envoyé.

## Une précision d'honnêteté

Le bac à sable contient un dossier `apk/` avec un vrai `res/` (1 888 fichiers,
253 PNG). **Ce n'est pas Liftoff.** Le manifeste déclare `INSTALL_PACKAGES`,
`DELETE_PACKAGES`, `ACCESS_SUPERUSER` et gère les extensions `.apkm` / `.apks` /
`.xapk` : c'est un **installeur d'APK** tiers, sans rapport avec ton application,
et ses ressources appartiennent à un éditeur qui n'a rien à voir avec le sujet.
Je ne m'en sers pas. Je le signale pour que la recherche récursive soit complète
et vérifiable de bout en bout.

## Conséquence sur le produit

Aucune. La direction visuelle ne dépend plus de ces fichiers :

| Ce qui manquait | Ce qui est en place | Où |
|---|---|---|
| Démonstrations d'exercices | **281 GIF** (Gym Visual, redistribution autorisée) | `src/data/gifs.js` |
| Icônes | **44 icônes SVG** dessinées, tracé unique 1,75 px | `src/ui/icones.js` |
| Planche musculaire | tracés vectoriels maison | `src/ui/anatomy-paths.js` |
| Illustrations d'états vides | compositions SVG originales | `src/ui/illustrations.js` |
| Médailles / trophées | SVG originaux | `src/ui/medailles.js` |
| Police de marque | **Anton** + **Inter** (OFL 1.1) | `assets/fonts/` |
| Palette | tokens `:root` mesurés au contraste | `style.css`, `docs/DESIGN_SYSTEM.md` |

Voir `docs/ASSET_SOURCES.md` pour la provenance et les licences.
