# Référence — FitAI (site officiel `fitaiapp.com`)

> Document d'analyse. Aucune image, aucun asset et aucun texte long du site ne sont
> repris ici : uniquement des descriptions, des valeurs mesurées et de courtes citations
> attribuées. Les contenus de `fitaiapp.com` appartiennent à son éditeur.

---

## 0. Méthode, périmètre et fiabilité

**Cible unique.** `https://fitaiapp.com` et rien d'autre. Aucune autre application
portant le nom « FitAI » n'a été consultée. L'identité de la cible est confirmée par le
code du site lui-même : le bouton *Start Free* redirige, selon la plateforme détectée,
vers `apps.apple.com/app/apple-store/id1665617526` ou vers
`play.google.com/store/apps/details?id=homeworkout.fitness.app`
(lu dans le chunk JS `ceaacaf7cbb67379.js`, fonction de redirection `StoreRedirectView`).
Éditeur déclaré dans les CGU : **Social Tech**. Contact : `fitnessappteam@gmail.com`.

**Date de consultation :** 5 novembre 2026.

**Réseau.** L'environnement n'autorisait pas `fitaiapp.com`. Ouverture demandée et
accordée pour `fitaiapp.com` et `www.fitaiapp.com`. Aucun CDN supplémentaire n'a eu
besoin d'être demandé : les médias d'exercices sont servis par
`firebasestorage.googleapis.com`, déjà joignable. Le proxy n'a jamais été contourné.

**Pages réellement ouvertes et lues :**

| URL | Statut | Ce qui en a été tiré |
|---|---|---|
| `/en` (= `/`) | 200 | page d'accueil, 4 sections, 3 captures d'app, FAQ, témoignages, CTA final |
| `/fr` | 200 | même structure, mêmes captures (en anglais), copie traduite |
| `/en/exercises` | 200 | bibliothèque, filtres, compteur exact |
| `/en/dictionary` | 200 | 126 termes, dont 25 décrivant explicitement des fonctions de l'app |
| `/en/exercise/barbell-bench-press` | 200 | structure complète d'une fiche exercice |
| `/en/get` | 200 | page de redirection vers les stores (aucun contenu visible) |
| `/en/terms-of-service` | 200 | éditeur, EULA, abonnement, plateformes |
| `/en/privacy-policy` | 200 | données collectées à l'inscription, services tiers |
| `/sitemap.xml`, `/robots.txt` | 200 | 154 URL au total, arborescence |
| `/en/blog`, `/en/pricing`, `/en/about`, `/en/contact` | **404** | ces pages n'existent pas |

**Comment les couleurs ont été obtenues.** Trois sources distinctes, toujours indiquée
pour chaque valeur :
1. **CSS** — feuilles `/_next/static/chunks/{4dbca2b8d2c498bc,96858b8d925d7a8f,a0d6971da6d19d44}.css`
   téléchargées et lues (variables `:root`, `box-shadow`, `font-face`…).
2. **Style calculé** — page rendue dans Chromium (Playwright, viewports 320 / 390 / 1440 px)
   puis `getComputedStyle` sur les éléments réels.
3. **Pixel** — captures PNG du site téléchargées dans un répertoire isolé, ouvertes avec
   l'outil de lecture d'images, et échantillonnées par histogramme / mode sur une zone
   (jamais « à l'œil »).

**Limite de résolution — importante.** Les captures d'écran de l'application sont
publiées par le site en **très basse définition** : `section_1.png` fait 191 × 399 px et
`section_3.png` 193 × 401 px pour un écran de téléphone entier. Sur `section_3`, la zone
d'écran utile mesure **183 px de large**. Les aplats (fonds, boutons pleins, lignes de
tableau) sont donc mesurables au pixel de façon fiable ; **les petits textes, les rayons
de bord et les épaisseurs de trait ne le sont pas**. Chaque fois qu'une valeur est
extrapolée à un écran de 390 pt, le facteur utilisé est 390/183 ≈ 2,13 et c'est signalé.

**Note sur `robots.txt`.** Le fichier autorise `User-Agent: *` mais interdit explicitement
les robots d'entraînement d'IA (`GPTBot`, `ClaudeBot`, `anthropic-ai`, `CCBot`, etc.).
Cette analyse est une lecture ponctuelle de quelques pages publiques à ta demande, sans
copie de contenu ni collecte de masse — mais la position de l'éditeur est signalée ici
pour que tu la connaisses.

---

## 0 bis. Captures de l'application réelle — ce qui corrige ce qui précède

**Ajouté le 6 novembre 2026.** Tout ce qui est écrit avant cette section vient du
**site** `fitaiapp.com`. Mehdi a ensuite fourni **neuf captures d'écran de
l'application elle-même**, en français, sur Android, en **1080 × 2460**. Elles
corrigent et complètent l'analyse. En cas de contradiction, **ces mesures-ci font
foi** : elles portent sur l'application, à pleine résolution, là où le site ne
publiait que des vignettes de 191 px compressées.

Écrans fournis : onglet Routines · détail de routine (×2) · onglet Exercices ·
onglet Récupération · onglet Séance · onglet Compte (×3, en défilant).

### Corrections apportées aux mesures du site

| Rôle | Mesuré sur le SITE (faux pour l'app) | Mesuré sur l'APPLICATION |
|---|---|---|
| Fond de page | `#040017` | **`#050217`** (99,8 % de la zone) |
| Carte | `#011431` — **n'existe pas dans l'app**, artefact de compression | **`#1E1F34`** (100 %) |
| Surface secondaire | `#1D1E33` | **`#27274B`** |
| Accent | `#2477FF` | **`#2478FF`** (à un point près : le site était juste) |
| Magenta de récupération | `#FD0075` — **faux** | **`#F500FE`**, puis `#FA8CFF`, puis blanc |
| Texte secondaire | `#8B95A8` (valeur du site) | **`#9CA1B4`** |

Le bleu, le fond et la carte du site étaient donc de bonnes approximations ; le
magenta, non. La leçon vaut pour la suite : **une capture marketing réduite à
191 px ne permet pas de relever une couleur portée par quelques pixels.**

### Barre d'onglets — enfin observée

Cinq onglets, de gauche à droite : **Routines · Exercices · Séance ·
Récupération · Compte**. « Séance » est bien l'onglet central, ce que le
dictionnaire annonçait sans le montrer.

- Fond : identique à la page (`#050217`), barre **plate** collée au bas, sans
  capsule flottante ni flou.
- Onglet actif : pastille `#27274B` arrondie **derrière la seule icône**, icône
  et libellé en `#2478FF`. Inactif : `#969BAF`.
- Icônes **au trait** (et non pleines comme sur le site) : liste dans un carré
  arrondi, silhouette qui s'étire, haltère, cercle de rotation avec un « + »,
  buste dans un cercle.

### Autres relevés

- **Bouton flottant de l'assistant** : cercle en dégradé **bleu → violet**,
  `#2478FF` → `#795DFF`, bulle de dialogue blanche avec étincelles. Présent sur
  tous les onglets.
- **Double pourcentage** : au-dessus de chaque muscle d'une routine, FitAI
  affiche « **100 % à 46 %** » — fraîcheur actuelle, puis celle qui restera
  après la séance — avec une barre magenta. Le second nombre est en magenta.
- **Modèle économique, enfin visible** : bouton **vert `#148614`** « Essayer
  gratuitement » dans l'en-tête de chaque écran, bandeau promotionnel flottant
  (« 75 % de réduction ! » avec compte à rebours), **contenu verrouillé et
  flouté** au-delà de trois exercices dans le catalogue, et « Voir les 12
  muscles avec PRO » sur l'onglet Récupération. Le vert est donc la couleur de
  l'abonnement, pas du système de design.
- **Onglet Compte** : carte profil (avatar, prénom, « 40 ans · 180 cm »), trois
  colonnes **Objectif · Poids · Fréquence**, calendrier des séances avec série
  hebdomadaire, succès et médailles (« 1 sur 54 »), mensurations avec chips de
  métrique et courbe, stats en barres, lexique.
- **Onglet Récupération** : grand corps anatomique 3D à gauche, liste
  muscle/pourcentage à droite, légende à trois paliers, bouton « Séance sur
  muscles reposés ».

---

## A. Analyse visuelle

### A.1 — Le site vitrine (valeurs mesurées)

#### Jetons de design déclarés dans le CSS

Lus tels quels dans `:root` (source : CSS) :

| Jeton | Valeur |
|---|---|
| `--background-color` | `#030014` (bleu-noir violacé) |
| `--card-color` | `#78b4ff08` (bleu clair à ~3 % d'opacité) |
| `--card-color-solid` | `#060a24` |
| `--card-border-color` | `#78b4ff14` (~8 %) |
| `--primary-color` | `#0091ff` |
| `--primary-color-light` | `#45b8ff` |
| `--primary-color-glow` | `#0091ff33` |
| `--text-color` | `white` |
| `--text-secondary-color` | `#8b95a8` |
| `--gradient-primary` | `linear-gradient(135deg,#0078d4,#009bff,#00c2e0)` |
| `--gradient-text` | `linear-gradient(135deg,#fff 0%,#7dd3ff 100%)` |
| `--gradient-surface` | `linear-gradient(180deg,#78b4ff0f 0%,#78b4ff03 100%)` |
| `--border-radius-sm / md / lg / xl` | `.5rem / 1rem / 1.5rem / 2rem` |
| `--transition-default` | `.3s cubic-bezier(.4,0,.2,1)` |
| `--transition-slow` | `.5s cubic-bezier(.4,0,.2,1)` |
| `--font-inter` | `"Inter","Inter Fallback"` |

Couleur hors jetons trouvée dans le CSS : **`#ffb800`**, uniquement pour le remplissage
des étoiles de notation (`.ReviewView…stars>svg`, `.RatingView…ratingStars>svg`).
Aucune couleur de succès ni d'alerte n'est déclarée dans le CSS du site.

Ombres déclarées — trois seulement, toutes teintées de la couleur primaire :
`0 2px 8px #0091ff4d`, `0 4px 20px #0091ff4d`, `0 8px 30px #0091ff59`.
Aucune ombre noire : la profondeur passe par la lueur bleue, pas par l'obscurcissement.

#### Vérifications au pixel / au style calculé

| Élément | Mesure | Source |
|---|---|---|
| Fond de page rendu | `rgb(3, 0, 20)` = `#030014` | style calculé, 320/390/1440 px |
| Fond de carte composité | `#06061C` → `#090A20` | pixel, page exercice |
| Barre de niveau, segment plein | `#0091FF` | pixel |
| Barre de niveau, segment vide | `#06244B` | pixel |
| Donut d'activation musculaire | `#FF8A00` (primaire) / `#E53935` / `#1E63FF` | pixel |
| Étoiles de note | `#ffb800` | CSS |

Le **donut d'activation musculaire** est le seul endroit du site où la palette sort du
bleu : orange vif pour le muscle primaire, rouge et bleu pour les secondaires.

#### Typographie

- **Famille unique : Inter**, chargée en `@font-face` variable (`font-weight:100 900`),
  format `woff2`, `font-display:swap`, découpée en sous-ensembles Unicode
  (latin, cyrillique, grec, vietnamien…). Pile de repli :
  `var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, sans-serif`.
- **H1** : 72 px / 700 / interlettrage `-2,16 px` (= `-0.03em`) / interligne 82,8 px en
  desktop ; **48 px** / 700 / `-1,44 px` / 55,2 px dès 390 px et jusqu'à 320 px (pas de
  réduction supplémentaire en dessous de 390 px). Rempli par
  `linear-gradient(135deg,#fff,#7dd3ff)` détouré sur le texte.
- **H2** : 44 px desktop / 36 px mobile, 700, `-0.02em`, même dégradé de texte.
- **Sur-titre (« eyebrow »)** : 13 px, 700, `text-transform: uppercase`,
  interlettrage `1,95 px` (= `0.15em`) — c'est le seul endroit où les capitales et un
  interlettrage large sont utilisés.
- **Corps** : 16 px / 400 / interligne 25,6 px (1,6).
- **Texte secondaire** : 15 px / 500 / `#8b95a8`.
- **Chiffre de statistique** : 32 px / 700 / `-0.02em`.
- Échelle de tailles présente dans le CSS : `.75 / .8125 / .875 / .9375 / 1 / 1.0625 /
  1.125 / 1.25 / 1.75 / 2 / 2.25 / 2.5 / 2.75 / 3 / 4 / 4.5 rem`.

#### Composants

- **Bouton principal (« Start Free »)** : rayon `32px` (pilule), remplissage
  `linear-gradient(135deg,#0078d4,#009bff,#00c2e0)`, texte blanc 15 px / 600,
  `padding: 12px 24px`, hauteur **48 px** (12 px en version compacte dans l'en-tête,
  hauteur 42 px environ).
- **Bouton secondaire (« Exercises », « FitAI Dictionary »)** : même forme en pilule,
  fond transparent, bordure fine `1px solid` bleu très dilué, texte bleu clair.
- **Puces de mot-clé** (bloc dictionnaire) : rayon `9999px`, fond
  `rgba(120,180,255,0.03)`, bordure `1px solid rgba(120,180,255,0.08)`,
  `padding: 8px 16px`, hauteur 40 px.
- **Cartes** : rayon issu de `--border-radius-lg/xl` (24 à 32 px sur les grands blocs),
  fond translucide bleuté sur fond `#030014`, bordure 1 px à 8 % — contraste très faible,
  la carte se lit surtout par sa bordure.
- **Accordéon FAQ** : pas de carte, de simples lignes séparées par un filet 1 px, avec un
  chevron à droite ; animation d'ouverture sur `grid-template-rows .35s`.
- **Champ de recherche** (pages exercices et dictionnaire) : pilule pleine largeur,
  icône loupe à gauche, placeholder gris.
- **Barre de niveau d'exercice** : **5 segments** rectangulaires, remplis en `#0091FF`,
  vides en `#06244B`. Elle sert partout : en-tête de fiche exercice, filtre « By
  Difficulty Level », vignettes de variantes, et elle est aussi visible sur les captures
  de l'app.
- **Bloc « Why Level N? »** : 6 critères (`TECHNIQUE`, `STABILITY`, `STRENGTH`,
  `MOBILITY`, `IMPACT`, `LEARNING`) notés chacun sur la même barre à 5 segments. Libellés
  en capitales, petite taille, gris secondaire.
- **Sélecteur de genre** : présent dans l'en-tête des pages exercices uniquement, deux
  pastilles ♂ / ♀ dans un conteneur pilule, l'active en bleu plein.

#### Espacements et grille

- Conteneur maximal : `max-width: 1200px`.
- Gouttière latérale mesurée : **16 px à 320 px**, **20 px à 390 px**, **120 px à 1440 px**.
- Écart vertical entre sections : `gap: 96px` (mesuré sur le conteneur principal).
- Pas de défilement horizontal à 320 px (`scrollWidth === 320`) — vérifié.
- Rythme interne des blocs : `padding` récurrents `3rem 2rem`, `2.5rem 2rem`, `4rem 2rem`,
  `5rem 3rem` ; `gap` récurrents `.5 / 1 / 1.5 / 2 / 2.5 / 3 / 4 rem`.

#### Icônes

SVG en ligne, **style plein (solide)**, pas de trait : sur les 24 `<svg>` de la page
d'accueil, **aucun ne porte de `stroke-width`** — ce sont des formes remplies.
Pictogrammes compacts (silhouettes de personnes, haltère, étoiles, chevrons, loupe,
guillemets, couronne de lauriers). Les icônes
« matériel » et « muscle » des pages exercices ne sont pas des SVG mais des **PNG**
servis depuis `/equipments/*.png` et `/muscles/male/*.png` — dessins au trait blanc pour
le matériel, figures anatomiques en niveaux de gris avec muscle cible en rouge pour les
muscles. Aucun emoji.

#### Animations

Cinq `@keyframes` seulement, toutes d'entrée : `fadeIn`, `fadeUp`, `slideUp`,
`slideInLeft`, `slideInRight`. Le héros enchaîne quatre `fadeUp` décalés
(`.8s` avec délais `.1s / .25s / .45s / .65s`) puis un `fadeIn 1s .3s` et un
`slideUp 1s .4s`. Les sections alternées entrent en `slideInLeft` / `slideInRight`
sur `.8s`. Transitions d'interaction : `.3s cubic-bezier(.4,0,.2,1)` par défaut
(couleur, fond, bordure, transform, box-shadow, opacité, fill), `.35s` pour
`transform` et l'accordéon, `.15s` pour le focus des champs.
Un `animation: none` est prévu — mais **aucune occurrence de `prefers-reduced-motion`**
dans les trois feuilles CSS téléchargées (0 correspondance sur 27 995 octets de CSS).

---

### A.2 — Les écrans d'application visibles

**Seules trois images d'application existent sur tout le site**, plus une image composite
qui n'est que leur assemblage. Il n'y a **aucune** capture d'onboarding, de tableau de
bord, de statistiques, de graphique, de chat, de profil ou de barre d'onglets.

| Fichier | Dimensions | Écran | Section d'accueil qui l'accompagne |
|---|---|---|---|
| `section_0.png` | 500 × 454 | composite des trois | héros « Your Smart Workout Planner » |
| `section_1.png` | 191 × 399 | **détail d'une routine** | « AI That Builds Your Perfect Workout Routine » |
| `section_2.png` | 351 × 351 | **montre connectée** | « Phone, Watch, and Health App in Sync » |
| `section_3.png` | 193 × 401 | **séance en cours** | « Ask Your AI Coach Anything About Fitness » |

La 4ᵉ section (« 3,000+ Exercises with Video Guides and Form Tips ») **n'a pas de
capture** : c'est un bloc de texte avec un bouton vers `/en/exercises`.
Les pages `/fr` réutilisent exactement les mêmes images, **en anglais**.

---

#### Écran 1 — Détail d'une routine (`section_1.png`)

*Observé pixel par pixel après agrandissement ×6 à ×14.*

**Structure, de haut en bas :**

1. **Barre d'état système** — `7:35` à gauche, signal + `5G` + batterie à droite. Fond
   identique au fond d'application (pas de barre distincte).
2. **En-tête de navigation** — chevron « ‹ » retour à gauche ; titre centré
   *« Triceps and Shoulders »* ; à droite trois icônes : une icône de partage/impression,
   un « ? » d'aide, et un menu « ⋮ » à trois points verticaux (signature Android/Material).
3. **Section « Working Muscles »** — intitulé précédé d'une petite icône de biceps.
4. **Carte « muscles travaillés »** — bande horizontale défilante. Chaque colonne porte :
   - le nom du muscle (`Triceps`, `Shoulder`, `Chest`, `Lats`, `Traps`, `Ab…` tronqué) ;
   - une **figure anatomique** (torse en niveaux de gris, muscle ciblé en rouge-orangé) ;
   - le libellé `recovered` puis un pourcentage (`55%`, `72%`, `100%`, `72%`, `100%`, `100…`) ;
   - un second libellé court de deux caractères lisibles, `Vo…` (vraisemblablement
     « Vol » pour volume — **non lisible avec certitude** à cette résolution), puis un
     second pourcentage (`9%`, `42%`, `21%`, `55%`, `21%`, `24%`).
   Certaines valeurs sont posées dans une **pastille magenta pleine** dont l'intensité
   varie, d'autres sont en texte blanc nu. La règle qui décide de l'un ou l'autre n'est
   **pas déterminable** depuis cette capture.
5. **Section « Routine Note »** — intitulé avec icône crayon, puis un champ de saisie
   pleine largeur, fond de carte, placeholder *« Write your personal notes and tips »*.
6. **Section « Exercises »** — intitulé à gauche, et à droite un **bouton pilule bleu
   plein « + Add exercises »**.
7. **Liste d'exercices** — chaque ligne contient, de gauche à droite :
   - une **vignette carrée blanche** à coins arrondis, avec le dessin au trait de
     l'exercice ;
   - une **barre de niveau à 5 segments** bleus (4 vifs + 1 atténué sur les lignes vues) ;
   - le **nom de l'exercice** en blanc gras, tronqué par une ellipse
     (`Cable Overhead Triceps…`, `Lever Seated Shoulder P…`, `Dumbbell Incline Bench…`) ;
   - une ligne de méta en gris : `3 sets x 10 reps, 90 secs rests`, suivie d'une petite
     icône de lien/sortie ;
   - une **icône bleue à double flèche** (remplacement / échange d'exercice) ;
   - à droite : le nom du muscle (`Triceps`, `Shoulder`, `Chest`), une **mini-figure
     anatomique** avec le muscle en orange, une petite flèche descendante et une
     **pastille magenta** avec un pourcentage ;
   - un menu `⋮` en bout de ligne.
8. **Bouton flottant d'action** en bas à droite : **bulle de dialogue bleue avec des
   étincelles blanches** — l'entrée vers l'assistant IA.
9. **Bouton principal « Start »** — rectangle bleu plein flottant au-dessus de la liste,
   icône de coureur + libellé.

**Aucune barre d'onglets n'est visible** sur cet écran.

**Couleurs mesurées (mode sur zone, PNG natif) :**

| Rôle | Valeur | Zone échantillonnée |
|---|---|---|
| Fond d'application | **`#040114`** | 43,1 % de l'image entière ; en-tête et fond de liste |
| Fond de carte / champ | **`#011431`** | carte muscles et champ de note (66 % de la zone) |
| Accent principal | **`#1F7EFF`** | bouton « Start » (79,6 % de la zone), « + Add exercises », icônes d'échange |
| Texte principal | `#FFFFFF` | 2,9 % de l'image |
| Magenta de pastille, le plus vif | **`#FD0075`** / `#F3005F` | pastille « 9% » |
| Magenta de pastille, variantes sombres | `#A6075E`, `#81003A`, `#7E0953` | autres pastilles |
| Surlignage musculaire (rendu 3D ombré) | plage `#A44931` → `#C35B3D` | figures anatomiques |

Pas de vert, pas de jaune : **aucune couleur de succès ni d'alerte** n'apparaît sur cet
écran (recherche automatisée des pixels saturés : 0 pixel vert, 0 pixel jaune).

---

#### Écran 2 — Séance en cours (`section_3.png`)

*L'écran le plus riche et le plus lisible des trois.*

**Structure, de haut en bas :**

1. **Barre supérieure sombre** — `✕` de fermeture, `Time: 01:42` ; à droite : icône
   haut-parleur, icône `?` dans un cercle, et **`Finish` en texte bleu** (pas de bouton).
2. **Grand panneau blanc** occupant environ 40 % de la hauteur :
   - au centre, l'**illustration anatomique** de l'exercice (homme écorché en niveaux de
     gris, muscles sollicités en rouge, haltères noirs) ;
   - en haut à gauche, deux icônes bleues empilées : une **ampoule** (conseils) et une
     **liste à puces cochée** (instructions) ;
   - en bas à gauche, `⏱ Timer` en bleu ;
   - sur **tout le bord droit, un rail vertical de vignettes blanches** à coins arrondis :
     quatre visibles, les trois premières portent un **badge bleu avec une coche blanche**
     (exercices terminés), la quatrième est **entourée d'un liseré bleu** (exercice
     courant) ; une cinquième dépasse en bas.
3. **Zone sombre de saisie :**
   - un **indicateur de progression segmenté** (≈ 5 petits traits, le premier bleu vif,
     les suivants atténués) ;
   - le **nom de l'exercice en bleu** : *« Dumbbell Standing Lateral Raise »* ;
   - à sa droite, une **pilule « Edit »** gris-bleu foncé avec icône crayon ;
   - en dessous, `⏱ 60 rest` en petit gris ;
   - une **ligne d'en-tête de tableau** à 4 colonnes, chacune avec une icône : `Sets`,
     `Last`, `Reps`, `Kg` ;
   - **trois lignes de séries** : la 1ʳᵉ **pleine en bleu** avec une grosse coche blanche
     et les valeurs `-` / `12` / `20` ; les lignes 2 et 3 alternent fond très sombre et
     fond gris-bleu. Les valeurs modifiables (`12`, `20`) sont **soulignées d'un petit
     trait** — signal d'éditabilité ;
   - une **pilule « Add a set »** centrée, fond sombre, icône `+` dans un rond blanc ;
   - le **bouton principal « ✓ Log set »**, bleu plein, quasi pleine largeur ;
   - un **bouton flottant rond bleu** avec icône d'étincelles blanche, superposé au coin
     supérieur droit du bouton principal (assistant IA, identique à l'écran 1).

**Couleurs mesurées :**

| Rôle | Valeur | Zone |
|---|---|---|
| Fond d'application / barre supérieure | **`#040017`** | 67,7 % de la barre haute, 87,3 % des lignes paires |
| Surface secondaire (ligne alternée, pilules `Edit` / `Add a set`) | **`#1D1E33`** | 89,7 % de la ligne impaire, 43–45 % des pilules |
| Accent principal | **`#2477FF`** | 85,1 % du bouton « Log set », 100 % de la ligne active |
| Panneau de démonstration | `#FFFFFF` | 21,9 % de l'image |

**Géométrie mesurée** (écran utile = 183 px de large ; ×2,13 pour un écran de 390 pt) :

| Élément | Mesure brute | Équivalent ~390 pt |
|---|---|---|
| Hauteur d'une ligne de série | 26 px | ≈ **55 pt** |
| Hauteur du bouton « Log set » | 27 px | ≈ **58 pt** |
| Largeur du bouton « Log set » | 143 px (échancré par le bouton flottant) | ≈ 78 % de la largeur d'écran |
| Marge latérale du bouton principal | ≈ 17 px | ≈ 8–9 % de la largeur d'écran |
| Lignes du tableau de séries | de bord à bord | pleine largeur |
| Rayon du bouton principal | 1–2 px | ≈ **2 à 4 pt** — quasi rectangulaire |

Contraste de forme à noter : le **bouton principal est presque rectangulaire**, alors que
les actions secondaires (`Edit`, `Add a set`) sont des **pilules pleinement arrondies**.
Le bouton flottant de l'assistant est un **cercle parfait**.

---

#### Écran 3 — Montre connectée (`section_2.png`)

Montre à boîtier noir, couronne visible, présentée dans un rendu de produit.
L'écran affiche :
- un **minuteur `25:43`** en haut, centré, texte blanc ;
- **trois cartes empilées**, fond `#1E1E34`, coins arrondis, chacune composée d'une
  **vignette blanche carrée** de l'exercice à gauche et de deux lignes de texte :
  - `Dumbbell Press` + `☑ 4/4 sets` (avec une case cochée bleue),
  - `Barbell Squat` + `1/4 sets`,
  - `Roll Abs` + `0/4 sets`.

Couleurs mesurées : fond `#000000` (57,9 % — noir pur, pas le bleu-noir du téléphone),
carte `#1E1E34` (9,7 %), texte `#FEFEFE`. Aucun autre accent visible.

Le **nom de la marque de la montre n'est pas indiqué** sur le site ; la silhouette
correspond à une montre carrée à bracelet sport, mais je ne l'affirme pas.

---

### A.3 — Les médias d'exercices (observés directement)

Téléchargés depuis `firebasestorage.googleapis.com` (projet `fitness-prod-50d0e`) et
ouverts :

- **Vignettes** : PNG **400 × 400**, fond blanc cassé `#FDFDFD` (73,6 % de l'image),
  dessin au trait.
- **Vidéos de démonstration** : MP4 **H.264, 1048 × 1048 px, 30 i/s, ~6 s, en boucle**
  (`autoplay muted loop playsinline`), ~380 Ko. Fond blanc pur (63,6 % des pixels).
  Contenu : **rendu 3D d'un écorché** — corps en niveaux de gris avec musculature
  détaillée, **muscles sollicités teintés en rouge** (plage mesurée `#7D0608` → `#E87F6C`,
  c'est un matériau ombré, pas un aplat), matériel en gris métallique et noir.
  **Filigrane « FitAI » répété en diagonale**, bleu très clair.
  Balisage `schema.org/VideoObject` avec `uploadDate` au 19/10/2026 sur la fiche consultée.
- **Figures de muscles** : PNG 200 × 200, buste anatomique gris, muscle cible en rouge
  (plage `#A44931` → `#C35B3D`).
- **Icônes de matériel** : PNG, petits (ex. `barbell.png` 120 × 41), dessin au trait blanc.

C'est une **bibliothèque 3D sous licence** de facture classique dans ce secteur, pas une
illustration propriétaire — tous les exercices partagent le même modèle et le même
éclairage.

---

### A.4 — Palette consolidée (toutes valeurs mesurées, aucune devinée)

| Rôle | Site vitrine | App — écran routine | App — écran séance | App — montre |
|---|---|---|---|---|
| Fond | `#030014` (CSS + calculé) | `#040114` (pixel) | `#040017` (pixel) | `#000000` (pixel) |
| Surface / carte | `#78b4ff08` sur fond → `#06061C`–`#090A20` (pixel) | `#011431` (pixel) | `#1D1E33` (pixel) | `#1E1E34` (pixel) |
| Accent principal | `#0091ff` (CSS), dégradé `#0078d4→#009bff→#00c2e0` | `#1F7EFF` (pixel) | `#2477FF` (pixel) | non observé |
| Accent clair | `#45b8ff`, `#7dd3ff` (CSS) | — | — | — |
| Texte principal | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FEFEFE` |
| Texte secondaire | `#8b95a8` (CSS + calculé) | non mesurable (trop petit) | non mesurable | — |
| 2ᵉ accent | aucun, sauf donut `#FF8A00` / `#E53935` / `#1E63FF` (pixel) | **magenta `#FD0075`** (pixel) | aucun | aucun |
| Succès | **aucun déclaré ni observé** | aucun | aucun | aucun |
| Alerte | **aucun déclaré ni observé** | aucun | aucun | aucun |
| Note / étoiles | `#ffb800` (CSS) | — | — | — |
| Surlignage musculaire | `#A44931`–`#C35B3D` (pixel, rendu ombré) | idem | idem | — |

**Écart à signaler :** le bleu n'est pas le même entre le site (`#0091ff`, cyan) et
l'application (`#1F7EFF` / `#2477FF`, bleu franc plus violacé). Les deux captures d'app
ne donnent d'ailleurs pas exactement la même valeur l'une que l'autre, ni le même fond
(`#040114` vs `#040017`) ni la même surface (`#011431` vs `#1D1E33`) : elles viennent
très probablement de **deux versions ou de deux plateformes différentes**. L'écran
routine porte un menu `⋮` typiquement Android, l'écran séance une mise en page plus iOS.

---

## B. Cartographie fonctionnelle

Convention : **[OBSERVÉ]** = vu sur une capture d'écran. **[ANNONCÉ]** = écrit dans le
texte du site (page indiquée). **[NON TROUVÉ]** = rien sur le site.
Le **dictionnaire** `/en/dictionary` est la source la plus précise : chaque terme peut
porter un encadré « IN FITAI » qui décrit où la fonction se trouve dans l'application.

### 1. Tableau de bord et accueil
**[ANNONCÉ, dictionnaire]** Il n'y a pas de « tableau de bord » : l'accueil est l'onglet
central *Workout*. Terme *Workout* : « The center tab. It always shows your next workout,
one tap and you are in. » Terme *Next workout* : « Front and center on the Workout tab.
One tap to start. »
**[NON OBSERVÉ]** Aucune capture de cet écran n'existe sur le site.

### 2. Inscription et questionnaire initial
**[ANNONCÉ, accueil]** « Tell FitAI your goals, your equipment, and your fitness level. »
**[ANNONCÉ, FAQ]** « When you first sign up, FitAI asks about your fitness level, what
equipment you have, and what you want to achieve. »
**[ANNONCÉ, politique de confidentialité]** — c'est la liste la plus fiable des champs
réellement demandés : **Age, Gender, Weight, Height, Name, Email address, User IDs,
Fitness experience, Fitness equipment availability, Fitness goal.**
**[ANNONCÉ, dictionnaire]** Le BMI est affiché au moment où l'on saisit son poids pendant
l'onboarding. Le compte est optionnel : « We use Google Oauth through Firebase
Authentication […] optional service for users who want to safely store and sync ».
**[NON OBSERVÉ]** Aucune capture du questionnaire.

### 3. Générateur de programmes par IA
**[ANNONCÉ, dictionnaire]** Fonction nommée **« AI Creator »** : « The AI that builds your
whole plan from your onboarding answers: goal, experience, equipment, time and focus
muscles. » Déclenchement : « Runs right after onboarding, and you can rerun it anytime
from the plans page. »
**[ANNONCÉ, FAQ]** Le site revendique l'usage de « progressive overload and periodization ».
**[ANNONCÉ, dictionnaire]** Un **« Forecast »** (masse musculaire / perte de poids
prévues) est « Shown when the AI Creator finishes building your plan ».
**[NON OBSERVÉ]** Aucune capture du générateur ni du résultat.

### 4. Objectifs, niveaux, équipements
**[ANNONCÉ, dictionnaire]** — valeurs explicitement nommées :
- **Objectifs** : `Build Muscle`, `Keep Fit`, `Lose Weight` (trois, nommés dans les
  « also called » du terme *Goal*).
- **Niveaux d'expérience** : `Totally newbie`, `Beginner`, `Intermediate`, `Advanced`.
- **Équipement** : `No Equipment`, `Dumbbells`, `Full Gym`, `Custom equipment`, plus un
  préréglage **`Garage Gym`** (« One of the equipment choices in onboarding »).
- Les trois sont « Set in onboarding, edit anytime in Settings ». Changer l'équipement
  déclenche un réajustement : « Change it and AI Replace refits your routines. »
**[OBSERVÉ, page exercices]** Niveaux de **difficulté d'exercice** (distincts du niveau
d'expérience), 5 paliers : `Beginner`, `Easy`, `Intermediate`, `Advanced`, `Expert`.

### 5. Programmes et routines
**[ANNONCÉ, dictionnaire]** Onglet **Routine** : « Build your own in the Routine tab, or
grab a ready one from Explore and make it yours. » **Explore** est « Second tab inside
Routine » et permet d'enregistrer une routine prête à l'emploi pour l'éditer.
**[OBSERVÉ, `section_1`]** L'écran de détail d'une routine, nommée librement
(« Triceps and Shoulders »), avec note personnelle, liste d'exercices réordonnables,
ajout d'exercices et bouton de démarrage.
**[ANNONCÉ, dictionnaire]** **Supersets** : « Link exercises with Superset when editing a
routine. During the workout FitAI rotates you through the paired exercises automatically. »

### 6. Bibliothèque d'exercices — combien exactement ?
**[OBSERVÉ, `/en/exercises`]** Le compteur de la page affiche **« 3,001 exercises found »**.
**[ANNONCÉ]** Le marketing dit partout « 3,000+ ». Le dictionnaire, lui, dit
**« Browse all 3100 of them in the Exercise tab »** — soit un **troisième chiffre,
incohérent avec les deux autres**.
Chiffre retenu, parce que c'est le seul comptage réel affiché par un écran du site :
**3 001**.
**[OBSERVÉ]** Taxonomie complète de la bibliothèque :
- **12 groupes musculaires** : Abs, Biceps, Calves, Chest, Forearms, Glutes, Hamstrings,
  Lats, Quads, Shoulders, Traps, Triceps.
- **31 types de matériel** : Body Weight, Dumbbell, Cable, Barbell, Leverage Machine,
  Kettlebell, Band, Special Bench, Weighted, Suspension, Special Bar, Smith Machine,
  Foam Roller, Stability Ball, Resistance Band, EZ Barbell, Special Machine, Landmine,
  Stick, Medicine Ball, Sled Machine, Trap Bar, Head Harness, Special Equipment, Rope,
  Rollball, Bosu Ball, Power Sled, Treadmill, Ab Wheel Roller, Vibrate Plate.
- **3 types d'exercice** : Strength, Cardio, Stretching.
- **5 niveaux de difficulté**.
- Recherche texte + 4 filtres déroulants combinables.
**[ANNONCÉ, dictionnaire]** **Exercices personnalisés** : « Add it from the Exercise tab.
It gets full stats and history like any built in move. »
Le `sitemap.xml` n'expose que **100 fiches** et **51 pages de catégorie** : la version web
publique n'est qu'une vitrine d'une fraction du catalogue.

### 7. Vidéos et instructions d'exécution
**[OBSERVÉ, fiche `barbell-bench-press`]** Structure complète d'une fiche :
`Expert Advice` (1 paragraphe) · `How-to-do Steps` (6 étapes numérotées) ·
`Common Mistakes` (erreur + ligne « Fix: ») · `Coach Cues` (3 rappels courts en pilules) ·
`Muscles Worked` avec **pourcentages d'activation** (Chest 65 %, Triceps 20 %,
Shoulders 15 %) et donut · `Equipment` · `Exercise Type` · `Why Level 3?` (6 critères
notés sur 5) · `Sets & Reps Guidance` (Beginner 3 × 10-12, Intermediate 4 × 8-10,
Advanced 4 × 6-8) · `Variations` (plus facile / plus difficile / même mouvement, autre
matériel) · FAQ · exercices similaires. Également : tags `Bilateral`, `Needs: Flat bench`,
et une ligne « Also known as ».
**[OBSERVÉ]** La vidéo est une boucle 3D muette de ~6 s (cf. A.3).
**[ANNONCÉ, dictionnaire]** « Every exercise page has a video, How to do steps and Expert
Advice. »

### 8. Remplacement intelligent d'exercices
**[ANNONCÉ, dictionnaire]** Fonction nommée **« AI Replace »** (alias « Suggest another »,
« Replace exercise ») : « Do not like an exercise, or missing the equipment for it? AI
Replace swaps it for a similar move that hits the same muscles with the gear you have. »
Emplacement : « On any exercise in a routine: Replace with AI, or ask for another
suggestion until one clicks. »
**[ANNONCÉ, FAQ]** « You can swap any exercise manually or let the AI pick a replacement
for you. »
**[OBSERVÉ, `section_1`]** L'**icône bleue à double flèche** présente sur chaque ligne
d'exercice correspond à cette action — l'icône est visible, le libellé ne l'est pas.

### 9. Suivi séries / répétitions / charges
**[OBSERVÉ, `section_3`]** C'est la fonction la mieux documentée visuellement : tableau à
4 colonnes `Sets` / `Last` / `Reps` / `Kg`, une ligne par série, ligne courante en bleu
plein avec coche, valeurs soulignées donc éditables, `Add a set`, bouton `Log set`.
**[ANNONCÉ, dictionnaire]**
- *Set* : « Each row in the workout table is one set. FitAI starts new exercises at
  **3 sets of 10 reps**. »
- *LAST column* : « Tap a LAST cell to copy those values into today's set, then beat them
  if you can. »
- *Rest* : « The rest timer starts counting the moment you log a set and beeps when it is
  time to go again. Change the default in Settings, or per exercise. »
- *Set metrics* : les colonnes s'adaptent automatiquement au type d'exercice ; le cardio
  enregistre temps ou distance, l'étirement une durée (« usually 20 to 60 seconds per
  hold »), le tapis temps + distance.
- *Dumbbell* : convention de saisie — « log the combined weight of both dumbbells.
  Two 10s count as 20 kg ».
- *Same sets* : « In the set editor when you tap Modify Sets. »

### 10. Coach IA pendant la séance
**[ANNONCÉ, dictionnaire]** Fonction nommée **« AI Coach »**, alias **« Coach chip »** :
« Your in-workout guide. It reads your own history and suggests what to lift, how many
reps or how long, set by set. It suggests and prefills, you always stay in charge of what
gets logged. » Emplacement : « The Coach chip on an exercise during your workout. It
learns from your first couple of sessions, then starts recommending. »
**[NON OBSERVÉ]** La « Coach chip » n'est pas identifiable sur la capture de séance.
**[ANNONCÉ, dictionnaire]** **Notation RPE après série** : « After you log a set, a small
strip asks how hard it was. One tap. Rate your working sets, skip the warm ups. Every
rating makes your coach sharper. » Le sens en « reps en réserve » est affiché sous chaque
valeur de RPE.

### 11. Chat assistant
**[ANNONCÉ, accueil]** Section entière : « Ask Your AI Coach Anything About Fitness ».
**[ANNONCÉ, dictionnaire]** Fonction nommée **« FitAI Assistant »** (alias « AI chat ») :
« The chat bubble in the bottom corner. It knows your profile, so answers fit you. »
Exemples d'usage cités ailleurs dans le dictionnaire : demander un plan HIIT, un split
PPL ou upper/lower (« it builds the whole week »), une routine de posture, ou du
« low impact » (« it will skip the jumps »).
**[OBSERVÉ]** Le **bouton flottant est bien visible sur les deux captures d'app** : bulle
de dialogue bleue avec étincelles sur l'écran routine, cercle bleu avec étincelles sur
l'écran séance. **La conversation elle-même n'est jamais montrée.**
**[ANNONCÉ, accueil]** Disponibilité revendiquée : « 24/7 — AI coaching availability ».

### 12. Statistiques et records
**[ANNONCÉ, dictionnaire]**
- *Exercise stats* : « Open any exercise and swipe the **stat chips** above the chart:
  Volume, Power 1RM, Max Weight and friends. » Alias listés : Max weight, Max reps,
  Max time, Max distance, Total reps, Average speed.
- *Personal record* : « Break one mid workout and you get **confetti, a chime and a trophy
  on the set row**. Your first session on an exercise sets the baseline quietly. »
- *Streak* : « On your Account tab, right next to your **workout calendar**. »
- *Workout result* : « Pops up when you finish a workout. Add a note while it is fresh. »
- *Calories burned* : « Shown live during the workout and on every result page. Tap
  Calorie Calculation in the app for the full formula. »
- *Body measurements* : « The Measurements card on your Account tab. Each site comes with
  a short how to measure guide. »
**[NON OBSERVÉ]** Aucune capture de statistiques.

### 13. Graphiques de progression
**[ANNONCÉ, accueil]** « Track your strength gains, workout volume, and consistency over
time with easy-to-read charts. »
**[ANNONCÉ, dictionnaire]** Graphiques nommés : **Power (1RM)** (« The Power (1RM) chart on
every exercise page tracks it from your logged sets ») et **Volume** (« per exercise in
the Volume chart »). Les « stat chips » se balaient horizontalement au-dessus du
graphique.
**[NON OBSERVÉ]** Aucun graphique n'est montré nulle part. Type de graphique, échelles,
couleurs : **inconnus**.

### 14. Suivi de récupération musculaire
C'est la fonction la plus souvent citée du dictionnaire (7 mentions de l'onglet *Recover*).
**[ANNONCÉ, dictionnaire]**
- *Body recovery map* (alias « Muscle map », « Body map ») : « Front and center on the
  Recover tab. Tap any muscle for its exercises and history. »
- *Recovery* (alias « Muscle energy ») : « The Recover tab paints it on a body map. Train
  what is fresh, let the rest recharge. »
- *DOMS* : « The Recover tab shows which muscles are still rebuilding, sore or not. »
- *Fresh Muscle Workout* : « Offered on the Recover tab whenever enough muscles are above
  half energy. » — une séance générée à la volée depuis les muscles disponibles.
- *Overtraining* : « Pick 6 or 7 workout days a week and FitAI will gently warn you. »
**[OBSERVÉ, `section_1`]** La carte « Working Muscles » d'une routine affiche pour chaque
muscle une figure anatomique et un pourcentage `recovered` — c'est la même donnée de
récupération, vue depuis la routine.
**[NON OBSERVÉ]** La carte corporelle de l'onglet Recover elle-même.

### 15. Recommandations et surcharge progressive
**[ANNONCÉ, FAQ]** « It then builds a structured workout plan using proven training
principles like progressive overload and periodization. As you log workouts, the AI
adjusts your plan based on how you actually perform. »
**[ANNONCÉ, dictionnaire]** Mise en œuvre concrète décrite : « The **LAST column** shows
your previous workout. Beat it by a little. That is overload in action. » — la surcharge
est donc **opérée par la comparaison à la séance précédente**, pas par un algorithme
affiché.
**[ANNONCÉ]** L'AI Coach « suggests and prefills » les valeurs, après « your first couple
of sessions ».

### 16. Profil, préférences, réglages
**[ANNONCÉ, dictionnaire]** Un onglet **Account** contient : le **calendrier
d'entraînement**, la **série (streak)**, la **carte Measurements** (tour de bras, etc.,
avec guide de mesure et courbe de tendance), et le **pourcentage de masse grasse**.
Un écran **Settings** permet de changer : objectif, niveau d'expérience, équipement,
unités (**métrique / impérial**, « all your history converts instantly »), durée de repos
par défaut et par exercice.
**[NON OBSERVÉ]** Aucune capture.

### 17. Synchronisation santé et appareils
**[ANNONCÉ, accueil]** Section « Phone, Watch, and Health App in Sync » : « FitAI syncs
instantly between your phone and smartwatch, so you can start a workout on one device and
pick it up on another ». Et : « FitAI also connects with your Health app, so your
workouts, calories, and activity data all stay in one place. »
**[ANNONCÉ, dictionnaire]** Nom précis de l'intégration : **Health Connect** —
« Settings, then Integrations. Works with **Samsung Health, Google Fit** and friends. »
**[OBSERVÉ, `section_2`]** L'application de montre existe bien : minuteur de séance +
liste d'exercices avec compteur `n/4 sets`.
**[ANNONCÉ, confidentialité]** Comptes et synchronisation cloud via **Google OAuth /
Firebase Authentication**, service déclaré optionnel.
**[NON TROUVÉ]** Aucune mention d'Apple Health, de Strava, de Garmin, de Fitbit ni de
capteur de fréquence cardiaque.

---

## C. Structure de navigation

**Aucune barre d'onglets n'apparaît sur aucune capture.** Ce qui suit vient
**exclusivement du texte du dictionnaire**, qui situe chaque fonction dans un onglet.

**Cinq onglets sont nommés** : `Routine`, `Exercise`, `Workout`, `Recover`, `Account`.
Le dictionnaire précise que *Workout* est **« The center tab »** — ce qui est cohérent
avec une barre à 5 onglets dont *Workout* occuperait la 3ᵉ position.
**L'ordre de gauche à droite n'est pas observable** et n'est affirmé nulle part : je ne le
déduis pas.

Écrans atteignables depuis chaque onglet, d'après le dictionnaire :

| Onglet | Contenu / écrans cités |
|---|---|
| **Workout** (central) | prochaine séance du plan actif, démarrage en un geste → écran de séance en cours → écran de résultat de séance (avec note) |
| **Routine** | mes routines, création et édition (sets, supersets, remplacement IA, note de routine) ; **sous-onglet « Explore »** = routines prêtes à enregistrer et personnaliser |
| **Exercise** | bibliothèque filtrable (12 muscles, type, matériel, niveau), fiche d'exercice (vidéo, étapes, Expert Advice, Alternatives), **stat chips** + graphiques, création d'exercice personnalisé |
| **Recover** | carte corporelle de récupération ; appui sur un muscle → ses exercices et son historique ; proposition « Fresh Muscle Workout » |
| **Account** | calendrier d'entraînement, série (streak), carte Measurements, et accès aux Settings (objectif, niveau, équipement, unités, repos, Intégrations) |

Éléments de navigation **observés** sur les captures : en-tête avec retour + titre + aide
+ menu `⋮` (écran routine) ; barre de séance avec `✕` / minuteur / son / aide / `Finish`
(écran séance) ; **rail vertical d'exercices** sur le bord droit pendant la séance ;
**bouton flottant d'assistant IA** présent sur les deux écrans.

---

## D. Modèle économique

**Aucun prix n'est affiché nulle part sur `fitaiapp.com`.** Vérifié : pas de page
`/pricing` (404), aucune occurrence de montant, de « per month », de « /mo » ou de
« free trial » dans le HTML des pages consultées.

Ce que le site dit réellement :

- **Appel à l'action unique : « Start Free »** (en français : « Essai gratuit »), répété
  5 fois sur l'accueil. Il ne mène pas à un formulaire mais à `/en/get`, une page vide qui
  **redirige vers l'App Store ou le Play Store** selon la plateforme.
- **CGU, section EULA** : « By purchasing or subscribing to the **premium version** of the
  app, you are granted a limited, non-exclusive, non-transferable license to use the
  **premium features** […] The license is granted only for the duration of your **active
  subscription period**. » → modèle **freemium avec abonnement**, mais **ni le périmètre
  du gratuit, ni les paliers, ni les tarifs ne sont publiés**.
- **CGU** : « we reserve the right to make changes to the app or to charge for its
  services, at any time ».
- **Politique de confidentialité** : « We **do not show any advertisements** inside this
  app » → pas de monétisation publicitaire in-app ; en revanche l'ATT est demandée pour
  la personnalisation publicitaire **sur d'autres plateformes** (remarketing).
- Traduction française du CTA : « Essai gratuit » — formulation qui suggère une période
  d'essai, alors que l'anglais « Start Free » suggère un palier gratuit. **Le site ne
  tranche pas.**

Chiffres de traction revendiqués sur l'accueil (compteurs animés ; les valeurs cibles ont
été lues dans les chaînes i18n du HTML, les compteurs affichant `0` tant qu'on ne défile
pas) :

| Affirmation | Valeur |
|---|---|
| Utilisateurs actifs | **7,5 millions+** (« Join 7.5 million people… ») |
| Séries enregistrées | **150 millions+** |
| Note et volume d'avis | **4,9** sur **315 K+** avis |
| Exercices | 3 000+ (voir B.6 : trois chiffres contradictoires) |
| Points de données analysés | 100 M+ |
| Disponibilité du coach IA | 24/7 |

Aucune de ces valeurs n'est sourcée ni horodatée sur le site. Les trois témoignages
(Ryan Walker, Jessica Miller « kinesiologist », David Anderson) ne portent ni date,
ni photo, ni lien vérifiable.

Éditeur et contact : **Social Tech**, `fitnessappteam@gmail.com`.
CGU en vigueur depuis le **2025-10-08**. Services tiers déclarés : Google Play Services,
Google Analytics for Firebase, Firebase Crashlytics, Firebase Authentication.

Le site est traduit en **29 langues** (comptées dans le sélecteur de pied de page : ar,
cs, da, de, el, en, es, fi, fr, he, hi, hr, hu, id, it, ja, ko, ms, nb, nl, pl, pt, ro,
ru, sv, th, uk, vi, zh). Le `sitemap.xml` ne liste toutefois que les URL `/en`, avec des
`hreflang` alternatifs : les autres langues existent mais ne sont pas indexées en propre.

---

## E. Ce que je n'ai pas pu observer

> **Mise à jour du 6 novembre 2026.** Cette section a été écrite à partir du
> site seul. Les captures de l'application (section 0 bis) ont depuis levé une
> grande partie de ces angles morts : la **barre d'onglets**, l'onglet
> **Workout**, l'onglet **Recover** et sa carte corporelle, l'onglet
> **Account** avec son calendrier, ses succès, ses mensurations et ses stats,
> l'onglet **Exercise**, ainsi que les **tarifs et le modèle d'abonnement**
> (bandeau vert, contenu verrouillé, mention PRO) sont désormais observés.
>
> **Restent non observés** : l'onboarding, la conversation avec l'assistant, la
> « Coach chip » pendant une série, la bande de notation RPE, l'écran de fin de
> séance, l'éditeur de routine, et les animations de l'interface.

Liste explicite d'origine. **Rien ici n'est comblé par une hypothèse.**

**Écrans d'application jamais montrés par le site** (donc aucune information sur leur
mise en page, leurs couleurs, leur typographie ou leurs composants) :
1. l'**onboarding** et le questionnaire initial, écran par écran ;
2. l'**onglet Workout** (l'accueil réel de l'application) ;
3. l'**onglet Recover** et sa **carte corporelle de récupération** — pourtant la fonction
   la plus mise en avant dans le dictionnaire ;
4. l'**onglet Account**, le calendrier, la série, la carte Measurements ;
5. les **Settings** et l'écran Intégrations ;
6. l'**onglet Exercise** côté application (seule la version web de la bibliothèque a été vue) ;
7. la **fiche d'exercice in-app** (seule la fiche web a été vue — elle est probablement
   différente) ;
8. **tous les graphiques** : Power (1RM), Volume, courbes de mesures, « stat chips » ;
9. la **conversation avec le FitAI Assistant** (seul le bouton flottant est visible) ;
10. la **« Coach chip »** pendant la séance ;
11. la **bande de notation RPE** affichée après une série ;
12. l'**écran de résultat de séance** et le **Forecast** post-génération ;
13. la **célébration de record** (confettis, carillon, trophée) ;
14. l'**éditeur de routine**, l'écran « Modify Sets », la liaison en superset ;
15. l'écran **Explore** ;
16. la **barre d'onglets elle-même** — son ordre, ses icônes, son style actif/inactif,
    sa hauteur.

**Valeurs non mesurables** :
17. **Toutes les tailles et graisses de police de l'application** : à 183 px de large
    d'écran utile, aucun texte n'est mesurable. Les tailles données en A.1 sont celles du
    **site**, pas de l'app.
18. **Les couleurs de texte secondaire de l'application** (trop peu de pixels purs).
19. **Les rayons exacts** des cartes et vignettes de l'app (seul le rayon quasi nul du
    bouton principal est exploitable).
20. **Les épaisseurs de trait des icônes** de l'app — elles semblent fines et pleines à la
    fois selon les icônes, mais la résolution ne permet pas de trancher.
21. **La gouttière latérale exacte** de l'application : seules des proportions sont
    données, extrapolées.
22. Le **second libellé** de la carte « Working Muscles » (`Vo…`) et la **règle** qui
    décide si une valeur est posée dans une pastille magenta ou non.
23. **Les animations et micro-interactions de l'application** : aucune vidéo de
    l'interface, aucun GIF, aucune description écrite. Les seules animations documentées
    (A.1) sont celles du **site vitrine**.
24. La **marque et le système d'exploitation de la montre** présentée.

**Informations absentes du site** :
25. **Tous les tarifs**, les paliers, la durée de l'essai, le périmètre exact du gratuit.
26. Le **nombre réel d'exercices** : trois chiffres contradictoires (3 000+ / 3 001 / 3 100).
27. Toute **notice de version**, journal de modifications, feuille de route.
28. Les pages `/blog`, `/pricing`, `/about`, `/contact` — **elles n'existent pas** (404).
    Le seul contact est une adresse Gmail.
29. Aucune mention d'**Apple Health**, Strava, Garmin, Fitbit, cardiofréquencemètre.
30. Aucune mention de **nutrition**, de suivi alimentaire ou de calories ingérées (seules
    les calories *brûlées* sont citées).
31. Aucune mention de **fonctionnement hors ligne**.
32. Aucune **source scientifique** derrière la revendication « Built on Science » :
    ni étude, ni auteur, ni référence.

**Contradictions relevées sur le site lui-même** (faits, pas interprétations) :
- Les **CGU affirment** « The app is currently available on **Android** », alors que la
  même page vitrine montre des **maquettes iPhone et montre Apple** et que le code
  redirige bien vers l'**App Store** avec un identifiant valide (`id1665617526`).
- **Trois comptages d'exercices** différents cohabitent (B.6).
- Le **bleu de marque diffère entre le site et l'application**, et **entre les deux
  captures d'application** (A.4).
- La **traduction française mélange tutoiement et vouvoiement** à l'intérieur d'une même
  section (« Demande à ton coach IA… » puis « Une question sur **votre** entraînement ? »).
- Les **captures restent en anglais sur la version française** du site.
