# Design System — Coach Perso

Direction artistique : **musculation premium, sombre, énergique**. Noirs *teintés*
(jamais `#000`), une seule couleur d'accent, verre et profondeur maîtrisés, motion GPU.
Toutes les valeurs vivent en variables CSS dans `:root` de `style.css` — **ne jamais
coder une valeur en dur**, toujours référencer un token.

## Couleurs (thème sombre par défaut)

Direction alignée sur la maquette Claude Design **Coach Perso.dc** (juillet 2026) :
noirs bleutés plus profonds, cartes **plates** (surface pleine + filet `--hair`),
dégradé d'accent bleu→bleu, barre d'onglets pleine largeur.

| Token | Valeur | Usage |
|---|---|---|
| `--bg` | `#0B0D10` | Fond des surfaces d'app |
| `--bg-deep` | `#05070A` | Fond global le plus profond (page) |
| `--surface` | `#12151A` | Cartes (plates) |
| `--surface-2` | `#181C22` | Surfaces surélevées, boutons secondaires, pistes d'icônes |
| `--elevated` | `#0B0D10` | Barre d'onglets |
| `--ink` | `#EDEFF2` | Texte principal (blanc teinté, jamais `#fff` pur) |
| `--ink-soft` | `#8B94A3` | Texte secondaire |
| `--faint` | `#5A626E` | Texte tertiaire / inactif (nav) |
| `--line` | `#20252D` | Filets, séparateurs, pistes de barres |
| `--hair` | `rgba(255,255,255,.06)` | Bordure hairline des cartes |
| `--accent` | `#3B82F6` | **Accent** : CTA, actif, progression |
| `--accent-2` | `#2563EB` | Fin de dégradé d'accent (bleu profond) |
| `--accent-ink` | `#7DA9FF` | Texte d'accent (liens) |
| `--accent-soft` | `rgba(59,130,246,.14)` | Fond d'accent atténué (pastilles d'icônes) |
| `--ok` `--amber` `--danger` | `#22C55E` `#F59E0B` `#EF4444` | Succès / attention / danger |
| `--orange` `--indigo` `--pink` | `#F97316` `#818CF8` `#EC4899` | Accents secondaires d'icônes (jours, macros) |

Thème clair : voir `:root[data-theme="light"]`. Anatomie : `--anat-body/-line/-muscle`.

## Typographie

- Police unique : **Inter** (variable 400→900, auto-hébergée, `docs/ASSET_SOURCES.md`).
- Échelle : `h1` 1.95rem/850, `h2` 1.24rem/800, `h3` 1.03rem/750, body 1rem/1.45,
  `.small` .82rem, `.eyebrow` .68rem/800 majuscule +letter-spacing.
- Stats : `.num` (chiffres tabulaires, `letter-spacing:-.01em`). Les grands chiffres
  doivent ressortir (poids 850, `.stat b` 1.5rem/850).

## Rayons, espaces, ombres, motion

- Rayons : `--radius:18px` (cartes), `--radius-sm:12px`, `--radius-btn:14px` (boutons/CTA).
- Ombres : `--shadow` (carte), `--shadow-lg` (modale/survol).
- Dégradé d'accent : `--grad:linear-gradient(135deg,var(--accent),var(--accent-2))`.
- Easing : `--ease:cubic-bezier(.22,1,.36,1)`. Durées 120–320 ms. GPU only
  (`transform`/`opacity`). `prefers-reduced-motion` respecté partout.

## Composants (classes)

- `.card` — carte de base **plate** : `--surface` plein + filet `--hair` (1px), sans
  dégradé ni ombre portée (direction Coach Perso.dc). **Pas de carte dans une carte
  dans une carte.**
- `.mstat` — tuile stat horizontale (icône teintée + libellé/valeur), duo Accueil.
- `.qrow` — rangée de raccourcis Accueil (Exercices · Nutrition · Calendrier).
- `button` / `.primary` / `.chip` / `.chip.on` — CTA en `--grad`, `:active{scale(.955)}`,
  cibles ≥ 44 px (`--tap:50px`).
- `.stat` — tuile statistique (icône + grand chiffre + label).
- `.anat-ex` — carte d'exercice (vignette + numéro + badge séries×reps + repos + chevron).
- `nav.tabs` — barre d'onglets **pleine largeur** (verre flouté, filet supérieur
  `--hair`), 5 onglets (Accueil · Programme · Séance · Progrès · Profil), onglet actif
  en `--accent`, `env(safe-area-inset-bottom)`.
- `.emptystate` — état vide (icône + titre + phrase). **Ne pas confondre** avec
  `.cal-cell.empty` (collision historique corrigée).
- Data-viz : `anneauSVG`, `svgLine`, `svgBars`, `gaugeIMC` — s'animent à l'ouverture.

### Ajoutés lors de la refonte de densité

- `.sect` / `.sect-head` / `.sect-body` — **section repliable** (Progrès,
  Profil). En-tête cliquable ≥ 52 px, chevron pivotant, résumé optionnel à
  droite du titre. C'est l'outil principal pour raccourcir un écran sans rien
  retirer : l'essentiel reste ouvert, le reste est à un tap.
- `.exocard` / `.exometa` / `.exomenu` — carte d'exercice **en séance**.
  `.exometa` est une ligne unique (muscle · repos · charge conseillée)
  dépliable d'un tap ; `.exomenu` (« ⋯ ») ouvre les actions secondaires
  (démo, RIR, douleur, remplacer, retirer). Pendant l'effort, une seule
  rangée d'actions reste visible.
- `.dash-hi` / `.streak-chip` — en-tête d'écran compact sur une ligne, avec la
  série en cours en pastille.
- `.histo-mini` / `.histo-row` — liste dense (séances récentes). Préférer une
  liste à une pile de cartes quand les éléments se ressemblent.
- `.daytabs` / `.daytab` — onglets de jour (Anatoly), même logique que le
  ruban de jours du Programme : **un jour à la fois**.
- `.objweek` — ligne d'objectif hebdomadaire avec barre de progression.
- `.exline` — ligne de catalogue **entièrement cliquable** (≥ 56 px) plutôt
  qu'un petit bouton en bout de ligne.
- `.guide` / `.guide-*` — lecteur de séance guidé et séquences de mobilité
  (plein écran, minuteur en anneau).
- `.out-field` / `.out-big` / `.zone-row` / `.velo-row` — calculatrices.
- `.coach-fil` / `.coach-bulle` / `.coach-barre` — fil de discussion du Coach.
- `.pgm-card` / `.filtres-pgm` — bibliothèque de programmes et ses filtres.

### Composants de séance (refonte produit)

- `.exo-tete` / `.exo-vign` / `.exo-matos` — vignette d'exercice **52 px** :
  silhouette du muscle principal + pastille de matériel. Générée localement
  (instantanée, hors ligne) plutôt qu'une grande image distante qui occuperait
  la moitié de l'écran. Un tap ouvre la fiche complète.
- `.mbadges` / `.mbadge` — muscles en badges, principal en accent. Un appui
  indique le rôle. Remplace une phrase à lire.
- `.alt-row` — alternative d'exercice (« machine occupée ») : vignette + nom +
  étiquette + score de compatibilité.
- `.restcap` — capsule de repos persistante, en bas à droite au-dessus de la
  barre de navigation. Réduire le minuteur ne l'arrête pas.
- `.sil-inter` — silhouette interactive : chaque groupe SVG porte `data-m`,
  un tap ouvre la fiche du muscle.

## Règles de densité (refonte UX)

Mesurées à 390 px, hauteur de page. Une page qui dépasse **~2,5 écrans** doit
être réorganisée, pas seulement stylée.

1. **Un seul CTA dominant par écran.** Les autres actions sont discrètes.
2. **Une carte doit avoir une raison d'exister.** Si plusieurs éléments se
   ressemblent, en faire une liste dense, pas une pile de cartes.
3. **Jamais deux fois la même information** sur deux écrans (la carte
   musculaire était rendue sur l'Accueil *et* sur Progrès : corrigé).
4. **Jamais deux navigations concurrentes** pour la même chose (Anatoly avait
   un bandeau de semaines *et* des flèches : corrigé).
5. **Listes longues : affichage progressif.** Le catalogue rendait
   343 exercices d'un coup (8 écrans) ; il en rend 20, avec « Voir plus ».
6. **Pendant une séance, la fonction prime sur la décoration** : pas de pavé
   de texte, pas de bloc décoratif, cibles larges.

## Règles anti-« généré par IA »

- Pas de noir pur, pas de gris sur couleur, texte toujours teinté.
- Une seule police, une seule couleur d'accent.
- Pas d'easing élastique/bounce daté ; pas de dégradé violet→bleu criard.
- Cibles tactiles ≥ 44 px, paddings cohérents, hiérarchie de titres claire.

Le respect de ces règles est vérifié par `.claude/skills/design-guard/`.

## Couche « signature »

Le socle ci-dessus définit un produit propre. Cette couche est ce qui le rend
reconnaissable. Elle est entièrement native (aucune dépendance) et **chaque
effet a été mesuré, pas estimé à l'œil** — les scripts de mesure vivent dans le
scratchpad de session et sont cités dans les commentaires de `style.css`.

### Trois catégories de mouvement, à ne pas confondre

| Catégorie | Durée | Exemples |
|---|---|---|
| Retour d'interaction | 120–320 ms | onde au toucher, halo, pilule d'onglet |
| Entrée d'écran | 300–520 ms | cascade `revealSig`, transitions de vue |
| Ambiance de fond | très lente | `#aurore` (34–52 s), décorative |

La règle « jamais > 500 ms » du design-guard vise les **deux premières**. Une
ambiance de fond n'est pas un retour d'interaction : elle n'accompagne aucune
action et n'apprend rien à l'utilisateur. Elle est coupée sous
`prefers-reduced-motion`.

### Composants

- **`#aurore`** — trois masses de couleur qui dérivent derrière l'app. Calibrée
  par mesure : elle doit ajouter **1 à 8 sur 255** au fond vide par rapport à
  `--bg`. En dessous elle ne se voit pas ; au-dessus le noir vire à l'olive.
  **Aucun `filter:blur()`** : il coûtait 31 images/seconde sur processeur bridé
  ×4 (60 → 29 i/s pendant un défilement). Un dégradé radial est déjà flou.
- **`.ringwrap` / `.ringx`** — l'anneau de pourcentage de l'app. Dégradé conique
  masqué en couronne, animé par la propriété enregistrée `--p`. Son centre
  affiche une **valeur réelle** (« 2 sur 4 »), pas un pourcentage : personne ne
  s'entraîne en pourcentage. Le halo reste `inset:0` — en débordant il élargit la
  zone de défilement et casse la page à 360 px.
- **`.card::before` / `.card::after`** — halo qui suit le doigt, et filet
  spéculaire de 1 px sur l'arête haute (absent en thème clair, où il n'aurait
  aucun sens physique).
- **`.tab-pill`** — indicateur d'onglet déplacé en `transform`. Purement
  décoratif : l'état réel reste porté par `aria-current` et la couleur.
- **`.onde`** — onde émise depuis le point touché sur les actions primaires.
- **`.poste` / `.piste`** — poste de commande de la séance active : chrono
  traité comme un titre, et une barre **par exercice** plutôt qu'un pourcentage.
- **`.setrow.encours`** — la série en cours porte un rail d'accent. Sans ce
  repère, quatre lignes identiques obligent à compter pour retrouver sa place.
- **`.chiffre-hero`** — dans une app de musculation, le chiffre est le contenu :
  il reçoit le traitement d'un titre.

### Pièges rencontrés (à ne pas réintroduire)

- Une `scale()` dans une animation d'entrée fait passer une cible de 44 px à
  43,4 px pendant 520 ms — et rien n'empêche d'appuyer pendant l'animation.
- Un pseudo-élément en `inset:-x%` élargit la zone de défilement de la page.
- Des dimensions fixes sur le héros (silhouette + trois chiffres) débordent à
  360 px. Utiliser `clamp()`, pas un point de rupture : corriger 360 avec un
  point de rupture casse 375.

## Signature sonore

À la salle, on a de la musique dans les oreilles, les mains occupées et le
téléphone posé par terre. Le seul canal disponible entre deux séries est
l'oreille. `src/ui/son.js` synthétise tout par oscillateurs — **aucun fichier
audio**, donc rien à télécharger et un fonctionnement hors ligne dès la première
ouverture.

### Trois règles

1. **Un son = une information qu'on ne peut pas voir.** Rien ne sonne pour un
   changement d'onglet ou l'ouverture d'un écran.
2. **Court et sec** : 40 à 380 ms. Un son long devient une nuisance dès la
   troisième série.
3. **Dans la bande qui perce** : 380–2 600 Hz, au-dessus des basses de la
   musique et en dessous du strident.

### La palette

| Son | Quand | Intention |
|---|---|---|
| `valider` | série validée | le plus répété (≈ 20 fois/séance) → le plus discret |
| `compte` | 3 dernières secondes du repos | même note à chaque seconde : c'est la répétition qui informe |
| `reprise` | repos terminé | le seul qui doit passer par-dessus la musique |
| `record` | record personnel battu | célébration sobre, quatre notes |
| `termine` | séance enregistrée | conclusion |
| `annuler` | série dévalidée | descendant, le plus faible de tous |

Toutes les fréquences viennent d'une **gamme pentatonique mineure en La**. Sans
demi-tons voisins, deux sons qui se chevauchent (valider pendant un décompte)
restent consonants — impossible de faire sonner l'app faux.

### Contraintes vérifiées par `tests/son.test.js`

La palette est de la **donnée**, donc elle se teste. Neuf tests verrouillent des
décisions de design, pas du code : bande passante, durée maximale, `valider` plus
court et plus doux que `reprise`, `reprise` le plus fort de tous, toutes les
notes dans la gamme, jamais plus de deux voix simultanées.

### Pièges

- Le contexte audio ne peut naître **que dans un geste utilisateur** : il est
  amorcé au premier `pointerdown` (`amorcerSon`, `{ once: true }`). Sans cela le
  premier son d'une séance est avalé par la politique de lecture automatique.
- La boucle du repos tourne à 4 Hz : le décompte doit se souvenir de la dernière
  seconde sonnée, sinon chaque seconde bipe quatre fois.
- Un son raté ne doit **jamais** interrompre une séance : tout est en `try`.
- Mesuré : la couche sonore coûte **2 ms** sur la validation d'une série.

## Éléments partagés (FLIP)

Le nom de la séance affiché sur la carte d'accueil et celui qui coiffe l'écran de
séance sont **le même objet**. Le faire disparaître d'un côté pour le refaire
apparaître de l'autre casse le lien ; le faire voler d'une position à l'autre le
dit sans un mot.

`src/ui/flip.js` — quatre temps : mesurer avant (**F**irst), mesurer après
(**L**ast), replacer visuellement à l'ancienne position (**I**nvert), laisser
rejoindre (**P**lay).

### Pourquoi pas les View Transitions natives

Elles photographient **toute la page** avant et après : mesuré à **136 ms par
navigation** sur processeur bridé ×4, elles ont été retirées. FLIP ne touche
qu'aux éléments marqués `data-flip`, n'anime qu'une `transform`, et ne fait
jamais recalculer la mise en page. Coût mesuré : **au plus 13 ms**, sur une
action qui arrive une fois par séance.

### Usage

```html
<h2 class="hero-titre" data-flip="titre-seance">…</h2>   <!-- départ -->
<h1 class="poste-nom"  data-flip="titre-seance">…</h1>   <!-- arrivée -->
```

`memoriserFlip()` avant le changement de DOM, `rejouerFlip(view)` après le rendu
(déjà appelé dans `render()`). Une clé absente d'un côté ne fait rien.

### Règles

- **Le seuil compte.** Un déplacement de moins de 4 px ou un grossissement de
  moins de 2 % ne se voient pas : `calculerFlip` les déclare inutiles plutôt que
  de consommer une image pour rien.
- **Échelle séparée en X et en Y.** Un titre qui rétrécit ne change pas dans les
  mêmes proportions en largeur et en hauteur ; une échelle unique le déformerait.
- **Rien sans mouvement autorisé.** Sous `prefers-reduced-motion`, on n'appelle
  même pas `memoriserFlip` — l'écran reste juste, il n'y a que le vol en moins.
- **Le calcul est pur, donc testé** (`tests/flip.test.js`, 7 tests) : signes,
  échelles, seuils, aller-retour symétrique, entrées dégénérées (un élément
  masqué mesure 0 — diviser par sa taille donnerait l'infini).

### Seuils de coût selon la fréquence du geste

Un même surcoût n'a pas le même prix selon ce qu'il alourdit :

| Geste | Fréquence | Surcoût acceptable |
|---|---|---|
| valider une série | ~20 ×/séance | ≤ 5 ms |
| démarrer une séance | 1 ×/séance | ≤ 20 ms |
| changer d'onglet | quelques × | ≤ 10 ms |

## Corps en lumière (canevas)

Sur l'écran « État musculaire », la fatigue ne s'affiche plus comme un aplat plus
opaque : elle **rayonne**. `src/ui/anatomieCanvas.js` peint le corps sur un
canevas glissé **derrière** le SVG existant.

### Répartition des rôles

| Couche | Rôle |
|---|---|
| canevas (dessous) | la lumière — halos, dégradés, chaleur. `aria-hidden`, aucun événement |
| SVG (dessus) | l'interaction (`data-m`) et l'accessibilité (`role="img"`, `aria-label`) |

Le SVG conserve sa structure exacte ; seuls ses remplissages passent en
transparent. Retirer le canevas ne casserait rien — l'app retomberait sur le SVG
seul. **Aucun nouvel asset** : `Path2D` accepte directement la syntaxe `d` de
SVG, donc les tracés sont les mêmes des deux côtés.

### Trois passes, dans cet ordre

1. **le halo** — muscles chauds, floutés, en `globalCompositeOperation:"lighter"`
   pour que deux muscles voisins fatigués forment une zone plus chaude ;
2. **le corps** — silhouette et parts neutres, nettes, par-dessus la lumière ;
3. **la chair** — remplissage de chaque muscle, opacité selon l'intensité.

### Règles

- **Un muscle frais n'émet AUCUNE lumière** (`rayonHalo` rend 0 sous 2 %). Sans
  ce zéro net, tout le corps baignerait dans une brume permanente et
  l'information disparaîtrait.
- **Le halo est borné à 26 px** : au-delà, les halos voisins se confondent.
- **Le cadrage est du calcul pur**, donc testé (`tests/anatomieCanvas.test.js`,
  9 tests). Une erreur d'échelle décalerait le canevas par rapport au SVG posé
  dessus : le halo éclairerait à côté du muscle.
- **`.anview` porte un fond opaque** : il faut le neutraliser dans ce contexte,
  sinon le corps est peint… et invisible. (Piège rencontré.)

## Tuiles de statistiques : la taille suit la tuile

Le chiffre d'une tuile est dimensionné en **unités de conteneur** (`cqw`), pas en
`vw` ni en valeur fixe. À 320 px, « 112 832 » et « 28h20 » débordaient de leur
case ; des `vw` auraient aussi rétréci les tuiles qui tenaient très bien.

Les valeurs **textuelles** (« aujourd'hui ») reçoivent en plus un palier selon
leur longueur : à 2,1 rem, le mot se faisait couper en « aujo… ».

## Illustrations d'état vide

Un écran vide est un moment de conception, pas un accident : c'est souvent le
**premier** écran qu'on voit, puisqu'avant la première séance il n'y a rien à
afficher. Une icône grise dans un carré dit « il manque quelque chose ». Une
petite scène dessinée dit « voilà ce qui va apparaître ici ».

`src/ui/illustrations.js` — cinq scènes dessinées pour cette application, qui
remplacent notamment les emojis 📈 et 📊 qui servaient d'images à deux écrans. Un
emoji n'est pas une iconographie : il change de dessin selon le téléphone et
n'obéit ni au thème ni à la couleur d'accent.

### Langage graphique

- cadre **120 × 96**, aucune illustration ne dépasse ;
- **tracé uniquement**, jamais d'aplat — cohérent avec l'iconographie de l'app ;
- **deux épaisseurs** : 3 pour le sujet, 2 pour le décor ;
- **une seule couleur d'accent** pour le sujet, `--ink-soft` atténué pour le
  décor : l'œil sait immédiatement où regarder ;
- **une ligne de sol** sous chaque scène — sans elle, le dessin flotte ;
- extrémités et jointures arrondies partout.

### Ce que les tests vérifient (`tests/illustrations.test.js`, 10 tests)

La cohérence d'une famille ne se maintient pas toute seule : une illustration
ajoutée plus tard avec une autre épaisseur, un aplat ou une autre taille
casserait l'ensemble sans rien casser du code. Les tests attrapent le cadre
commun, les dépassements, les aplats interdits, les épaisseurs hors système, les
couleurs en dur, la ligne de sol et les jointures.

### Pièges

- `.empty-state .es-ic svg{width:22px}` s'applique aussi aux illustrations et
  les écrasait à la taille d'une icône : il faut battre cette règle
  explicitement, pas espérer l'ordre de déclaration.
- Une scène doit être **lisible sans légende**. L'assiette vide, réduite à deux
  ovales, se lisait comme une cible : elle a reçu des couverts.

## Densité mesurée (et non supposée)

La règle « au-delà de ~2,5 écrans, une page doit être réorganisée » est
maintenant **mesurée**, pas estimée à l'œil. Relevé à 390 px, profil complet,
45 séances d'historique :

| Écran | Hauteur | Écrans | Cartes | CTA dominants |
|---|---|---|---|---|
| Accueil | 1 762 px | 2,1 | 5 | 1 |
| Programme | 606 px | 0,7 | 1 | 1 |
| Séance | 405 px | 0,5 | 2 | 0 |
| Progrès | 2 124 px | 2,5 | 4 | 0 |
| Profil | 1 852 px | 2,2 | 3 | 1 |

Tous les écrans sont sous la limite, chacun porte **au plus un CTA dominant**, et
**aucun titre n'est répété d'un écran à l'autre** — la règle « jamais deux fois
la même information » tient.

Conclusion honnête : il n'y avait rien à couper. Le travail de réorganisation
(carte musculaire dédoublée, catalogue de 343 exercices rendu d'un coup, double
navigation dans Anatoly) avait déjà été fait ; la mesure le confirme au lieu de
le supposer. Le script `scratchpad/densite.mjs` échoue si un écran repasse
au-dessus, ce qui transforme une règle écrite en garde-fou.

## Typographie d'affichage : Anton sur les titres

**Anton** (18,6 Ko, hébergé en local, OFL 1.1) porte les titres. Condensée et
lourde, elle donne au produit un caractère que la seule graisse 900 d'Inter ne
pouvait pas fournir — et « Ischio-jambiers + Quadriceps » y tient sur une ligne
au lieu de deux.

### La règle, en une phrase

**Anton ne touche jamais un nombre.**

Mesuré : le chiffre « 1 » d'Anton fait 33,1 unités quand tous les autres en font
49,4 — un tiers de moins. Un chrono passant de « 00:11 » à « 00:42 » changerait
de largeur à chaque seconde ; une colonne de charges danserait d'une ligne à
l'autre. Inter, lui, a des chiffres tabulaires.

> **Anton dit le NOM des choses. Inter dit leurs VALEURS.**

### Où elle s'applique

`h1` · `.hero-titre` · `.poste-nom` · `.pa-nom` · `.sp-name` · `.sheet-top h2`

Nulle part ailleurs. Une police d'affichage employée partout cesse d'être un
accent et devient le corps de texte — c'est ainsi qu'on obtient une app qui crie.

### Contraintes

- **Une seule graisse (400).** Un `font-weight:900` produirait un gras
  *synthétique*, épaissi par le navigateur et laid. D'où `font-synthesis:none`.
- **Interlettrage quasi nul** (`-.005em`) : elle est déjà condensée, le
  resserrement d'Inter la rendrait illisible.
- **Interlignes revus** : ses jambages hauts serrent davantage à valeur égale.
- **Préchargée** : sans cela les titres s'affichent en Inter puis basculent, ce
  qui fait sauter la mise en page.

Coût mesuré au démarrage sur processeur bridé ×4 : **nul** (l'écart avec et sans
tombe dans le bruit de mesure).

### Pourquoi pas Bebas Neue

Comparée à l'écran sur du vrai texte de l'app : elle n'a **pas de minuscules**
(tout titre français y passe en capitales) et son trait est trop léger pour
l'usage.

## Trophées et médailles

L'application mesurait la semaine et le mois (`defis.js`) mais **rien ne
récompensait la durée**. Or ce qui fait progresser en musculation, ce n'est pas
la semaine réussie, c'est la centième séance. `src/engine/trophees.js` ajoute
cinq familles de cinq paliers : assiduité, régularité, volume, records,
endurance.

### Règles du moteur

1. **Un trophée se calcule, il ne se stocke pas.** Tout dérive de l'historique
   réel : rien à sauvegarder, rien à corrompre, et un import de sauvegarde
   retrouve exactement les mêmes trophées.
2. **Le prochain palier est toujours visible**, avec sa progression chiffrée. Un
   trophée verrouillé sans chemin ne motive pas, il décourage.
3. **Aucun palier inatteignable** — un test vérifie que trois ans d'assiduité
   débloquent bien les 25.

Piège trouvé par les tests : comparer les **seuils** entre familles n'a aucun
sens (« 12 semaines » et « 10 séances » ne sont pas la même grandeur). Le trophée
mis en avant est celui du plus haut **rang**, seule échelle commune.

### Les médailles (`src/ui/medailles.js`)

Les planches de référence distinguent les rangs par la couleur — bronze, argent,
or, violet, diamant. Cinq teintes dans une application qui n'en a qu'une : le
design system l'interdit, et à raison (dès qu'il y a un arc-en-ciel, plus rien ne
ressort).

Ici **le rang se lit à la richesse du dessin** :

| Rang | Dessin |
|---|---|
| 1 | hexagone + étoile |
| 2 | + anneau intérieur |
| 3 | + double contour |
| 4 | + halo |
| 5 | + couronne extérieure, étoile pleine |

**Chaque rang ajoute un élément réel, jamais seulement une opacité.** Une
première version séparait les rangs 1 et 2 par un fond à 10 % — invisible, et
c'est un test de « richesse croissante » qui l'a attrapé.

Un trophée non obtenu emploie **exactement le même dessin**, en graphite : on
voit ce qu'on vise, pas un cadenas générique.

### Ce que le garde-fou de densité a imposé

Ajouter les trophées a fait passer l'écran Progrès de 2,5 à **3,7 écrans** — le
script `densite.mjs` l'a signalé immédiatement. Deux corrections, sans rien
retirer : les cinq médailles tiennent désormais **d'un coup** dans une grille à
cinq colonnes (c'est une échelle, on doit voir où on en est sans faire défiler),
et les blocs « Défis » et « Trophées » deviennent des sections repliables, avec
leur chiffre motivant dans l'en-tête. Résultat : **2,1 écrans**, soit plus léger
qu'avant l'ajout.

## Rang de force — répondre à « je suis où ? » sans personne à qui se comparer

Une application à classement répond à cette question avec les autres
utilisateurs. Coach Perso est **mono-utilisateur** : il n'y en a pas. La réponse
vient donc des **standards de force établis**, exprimés en multiples du poids de
corps — les repères que tout pratiquant finit par connaître (« un squat à deux
fois son poids »).

`src/engine/rang.js` — cinq niveaux (Débutant → Élite), quatre mouvements de base
(squat, développé couché, soulevé de terre, rowing), grilles distinctes hommes et
femmes.

### Quatre décisions, toutes destinées à ce que ça n'écrase pas

1. **Le niveau suivant est toujours chiffré en kilos.** Jamais « tu es débutant »
   tout court : toujours « Avancé à 200 kg · encore 5 kg ». Un verdict sans
   chemin ne sert à rien.
2. **On ne juge que ce qu'on a mesuré.** Un mouvement jamais chargé n'apparaît
   pas — aucun zéro, aucune case vide accusatrice.
3. **Le rang global est une MOYENNE, pas le pire mouvement.** Être faible au
   développé ne doit pas effacer un bon squat. (Testé : squat rang 4 + développé
   rang 1 donne 3, pas 1.)
4. **L'app se tait quand elle ne peut pas se prononcer**, et dit pourquoi : sans
   poids de corps renseigné, pas de verdict.

### Deux pièges attrapés par les tests

- **Grilles séparées hommes/femmes.** Une grille unique classerait mécaniquement
  toutes les femmes en débutant. Un test vérifie que chaque seuil féminin est
  strictement inférieur.
- **Identifiants d'exercices vérifiés au catalogue.** Un identifiant erroné ne
  lèverait aucune erreur : le mouvement disparaîtrait simplement du rang, sans
  que personne ne le remarque.

Les standards sont présentés comme des **repères, pas une mesure** — même
honnêteté que pour l'estimation de 1RM, qui affiche sa fourchette et son écart.

### Calibrage : les repères publiés ne sont qu'un point de départ

Les standards de force varient de **10 à 15 %** d'une source à l'autre, et selon
la fédération, la profondeur de squat, l'équipement. Imposer une table serait
prétendre à une précision qui n'existe pas. `Progrès → Calculateurs de force →
Ajuster les seuils` laisse donc **écrire la sienne** : quatre nombres par
mouvement, en multiples du poids de corps.

Trois précautions, sans lesquelles ça produit des rangs absurdes en silence :

- **Les seuils doivent monter** (`validerSeuils`). Sans ça, un niveau devient
  inatteignable : on franchirait le suivant avant lui.
- **Bornes 0,1 → 6 × PC** (`LIMITES`). La faute de frappe « 20 » au lieu de
  « 2,0 » bloquerait le rang à « débutant » à vie, sans explication — l'utilisateur
  ne verrait qu'une app cassée.
- **Une saisie refusée ne casse rien** : le mouvement reste sur son repère publié,
  le message dit pourquoi, et le rang continue de s'afficher.

La migration (`normaliserStandardsForce`) ne fait que du **typage** — elle
n'ordonne pas les seuils. Réordonner reviendrait à réécrire silencieusement une
saisie ; le refus, lui, est visible donc corrigeable.

#### Composants (`.calib-*`)

| Classe | Rôle |
|---|---|
| `.calib-mvt` | un mouvement, séparé par `--hair` |
| `.calib-grille` | 2 colonnes, 4 au-delà de 520 px |
| `.calib-t` | libellé du niveau + équivalent en kilos, **sur la même ligne** |
| `.calib-kg` | « ≈ 192,5 kg », arrondi au pas de 2,5 kg |
| `input.err` | bordure `--danger` + halo, mesurée à 5,07 (sombre) / 5,10 (clair) |

**Deux colonnes, jamais quatre à 320 px** : quatre champs côte à côte laissent
62 px chacun, l'équivalent en kilos n'y tient plus — et c'est justement lui qu'on
vient lire. **Le kilo sur la ligne du libellé** : en trois lignes par champ, les
quatre mouvements faisaient 1 800 px pour seize nombres. Ramené à 195 px par
mouvement.

L'interface signale « **tes seuils** » sur les mouvements calibrés à la main : un
rang calculé sur ses propres chiffres n'a pas la même valeur qu'un rang calculé
sur la littérature, et l'app ne doit pas laisser croire le contraire.

## Scanner de code-barres — le chaînon manquant de la nutrition

L'application interrogeait déjà Open Food Facts par code-barres. Ce qu'elle
demandait, c'était de **taper treize chiffres à la main**, debout dans une
cuisine, en tenant un paquet de pâtes. Personne ne le fait deux fois.

`src/ui/scanner.js` s'appuie sur **`BarcodeDetector`**, une API *native* du
navigateur (Chrome/Android). Aucune bibliothèque, aucun build, rien à
télécharger — cohérent avec le reste de l'app. La lecture du code est **locale** ;
seule la fiche produit demande le réseau.

### Trois défenses contre le pire défaut d'un scanner

Le pire défaut n'est pas de ne rien lire : c'est d'**annoncer un produit qui n'est
pas celui qu'on tient**.

1. **Chiffre de contrôle vérifié** (norme GS1). Un code-barres porte sa propre
   clé ; une lecture partielle produit presque toujours une clé fausse. On la
   rejette au lieu d'aller chercher un produit au hasard.
2. **Trois lectures identiques ET consécutives.** Une seule image peut mentir. Un
   code différent remet le compteur à zéro — sinon deux paquets côte à côte
   finissent par « voter » l'un pour l'autre. *(Vérifié en bout en bout : sur 16
   images dont deux illisibles et une lecture d'un autre produit, seul le code
   confirmé trois fois est retenu.)*
3. **Normalisation UPC-A → EAN-13.** Un code à 12 chiffres est le même produit
   préfixé d'un zéro. Sans ça, tout produit importé ressort « introuvable » alors
   qu'il est en base. Appliquée aussi à la saisie **manuelle**.

### Dégradation honnête, jamais de bouton inerte

| Situation | Message | Repli |
|---|---|---|
| Pas de `BarcodeDetector` | « Ce navigateur ne sait pas lire les codes-barres (Chrome sur Android le fait) » | saisie manuelle, focus placé |
| Permission refusée | « Autorise-le dans les réglages du navigateur » | idem |
| Aucune caméra | « Aucune caméra détectée sur cet appareil » | idem |
| Caméra occupée / https absent | message dédié | idem |

### Le viseur n'est pas décoratif

Un cadre carré fait cadrer l'étiquette entière ; un code-barres se lit **de près**.
Le bandeau large et bas (`82 % × 26 %`) force la bonne distance — c'est ce qui
sépare « ça scanne » de « ça marche pas ». Le masque vient **uniquement** du
`box-shadow` porté : un fond sur le parent assombrirait aussi l'intérieur de la
fenêtre, c'est-à-dire précisément ce qu'on veut voir net.

### Coût et batterie

- **Analyse à 10 Hz** (`PERIODE_MS = 100`), pas à 60. Un code-barres ne bouge pas
  si vite ; à 60 Hz le téléphone chauffe pour rien. Coût divisé par six.
- **La caméra est coupée à chaque rendu** (`arreterScan()` en tête de `render()`),
  sur `pagehide` et sur `visibilitychange`. Supprimer l'élément vidéo du DOM
  **n'arrête pas** la caméra : sans ça, changer d'onglet laisse la diode allumée
  et vide la batterie.
- Le panneau se referme **dès la lecture** : garder la caméra ouverte pendant
  qu'on lit la fiche produit n'apporte rien.
- **Lampe torche** proposée seulement si la piste vidéo l'expose (`getCapabilities`) —
  les salles et les cuisines sont sombres.

## Photos de progression — ce que la balance ne dit pas

Le poids stagne pendant des semaines alors que le corps change. C'est le moment
exact où l'on arrête. Deux photos à trois mois d'écart règlent la question mieux
qu'une courbe — c'est la seule mesure qui montre la **recomposition corporelle**.

`Progrès → Photos de progression`. Trois angles (face, dos, profil) ; au-delà,
on ne les refait pas.

### Séparation stricte : fiches ↔ images

| | Où | Pourquoi |
|---|---|---|
| **Fiches** (date, angle, poids, dimensions) | état applicatif, ~200 o | triables, comparables, sauvegardables |
| **Images** (Blob JPEG) | magasin IndexedDB `photos` (base v2) | du binaire n'a rien à faire dans un état mirroré en JSON — base64 = +33 % et quota localStorage explosé dès la première photo |

`engine/photos.js` est **pur** et ne touche jamais un pixel : c'est ce qui permet
de tout tester sous Node (24 tests).

### Trois promesses tenues à l'écran

1. **Les images ne quittent jamais l'appareil.** Aucune fonction du moteur ni du
   stockage n'ouvre de connexion. Une photo de son corps est la donnée la plus
   intime qu'une app de musculation puisse détenir.
2. **Elles ne sont pas dans la sauvegarde JSON, et c'est écrit.** Les croire à
   l'abri et les perdre est pire que de ne pas en prendre. Les **fiches**, elles,
   sont exportées : sur le même appareil la restauration est complète ; ailleurs
   elles reviennent sans image, et l'interface l'affiche (`Image absente du
   stockage`) au lieu d'une vignette cassée.
3. **La comparaison est la plus parlante possible** : la plus ancienne contre la
   plus récente, **même angle uniquement**. Deux photos de la même semaine ne
   montreraient rien et feraient conclure que la fonction ne sert à rien ; une
   photo de face contre une de dos ne prouve rien.

### Pièges attrapés

- **Orientation EXIF.** Les photos prises en portrait arrivent couchées : le
  capteur enregistre en paysage et note « tourne de 90° » en métadonnée.
  `createImageBitmap` ne l'applique **pas** par défaut — il faut
  `imageOrientation: "from-image"`. Sans ça, toutes les photos sont à
  l'horizontale.
- **Le poids.** 4000 × 3000 ≈ 5 Mo ; dix photos saturent le quota. Ramenées à
  1280 px de côté long en JPEG 0,72 → ~200 ko, sans perte utile pour comparer
  deux silhouettes. Une image **déjà** plus petite n'est jamais agrandie.
- **Import « remplacer ».** Une sauvegarde antérieure à cette fonctionnalité ne
  porte pas la clé `photos` : l'appliquer telle quelle effaçait les fiches en
  laissant les images orphelines dans IndexedDB. Les fiches existantes sont
  désormais préservées (3 tests).
- **Fuite mémoire.** Chaque `URL.createObjectURL` non révoquée retient le blob
  entier ; sur trente photos, plusieurs dizaines de Mo. Toutes sont libérées à
  chaque rendu (`libererPhotos()`).
- **Poids rattaché à la photo, mais pas à n'importe quel prix.** On reprend la
  pesée la plus proche **dans les 7 jours**. Au-delà, on n'affiche rien : un poids
  vieux d'un mois fausserait le « −4,4 kg » de la comparaison.

### Composants (`.ph-*`)

`.ph-vig` (aspect-ratio 3/4, `object-fit: cover`) · `.ph-duo` (2 colonnes
strictement égales) · `.ph-grille` (auto-fill 96 px) · `button.ph-sup` (disque
28 px, cible tactile portée à 44 px par un `::after{inset:-8px}` — la zone
cliquable déborde du disque visible au lieu d'être réduite avec lui).

**Le rapport de forme n'est jamais déformé** : une silhouette étirée ne prouve
rien. Vérifié à 7 largeurs — ratio constant 0,75, colonnes égales de 121 px
(320) à 241 px (desktop).

## Fin de repos : dire DEPUIS QUAND, et prévenir écran verrouillé

Pendant le repos, le téléphone est posé et l'écran s'éteint. Le navigateur
**gèle alors la page** : son et vibration exigent que la page tourne, ils ne
partent pas. Le signal n'arrive qu'au déverrouillage.

### Le défaut corrigé

L'app annonçait « Repos terminé » à ce moment-là — comme s'il venait de
s'écouler, alors qu'il pouvait dater de trois minutes. **Entre une série reprise
à l'heure et une série reprise trois minutes trop tard, ce n'est plus le même
entraînement.**

`retardSec()` mesure l'écart depuis `finAt`, `formatRetard()` l'écrit :
`« Repos terminé il y a 3 min 05 »`. Sous 5 secondes (`RETARD_SIGNIFICATIF_SEC`)
on garde la formulation au présent — deux secondes de décalage ne changent
aucune série. Au-delà de dix minutes, plus de secondes : l'utilisateur a fait
autre chose, la précision devient du bruit.

**Deux chemins mènent à cette annonce**, et les deux la portent désormais :
`finDuRepos()` (la page a tenu) et `reprendreRepos()` (la page a été rechargée,
le cas réel du déverrouillage). Le second était le plus visible et le plus faux.

### La notification, seul canal qui traverse le verrouillage

`src/ui/notifs.js` — notifications **locales** : pas de serveur, pas de push, pas
d'abonnement. Un test lit le fichier source et échoue s'il contient `fetch(`,
`pushManager`, `WebSocket` ou une URL — l'app doit rester entièrement hors ligne.

Postée par le **service worker** quand il est là : sur Android, une notification
émise par la page seule disparaît si la page est déchargée, celle du service
worker survit — précisément le cas qui nous intéresse.

Quatre règles pour ne pas être une app qui harcèle :

1. **Jamais de demande au chargement.** Réclamer les notifications avant d'avoir
   rien montré se fait refuser, et **un refus est définitif** — Chrome ne
   redemande plus. On attend le premier repos, où la demande a un sens évident.
2. **Une seule notification à la fois** (`tag` fixe). Après huit séries, on ne
   veut pas huit lignes.
3. **Elle se ferme au retour.** Une notification « repos terminé » encore
   affichée alors qu'on pousse déjà est du bruit, et rend les suivantes moins
   crédibles.
4. **Rien n'est posté si l'écran est déjà sous les yeux.**

### L'interrupteur explique quand il ne peut pas marcher

`Profil → Séance` propose « Prévenir écran verrouillé ». Si la permission est
bloquée, un bandeau dit **où** la débloquer (réglages du navigateur, pas de
l'app) : un interrupteur mort sans explication passe pour un bug de l'app alors
que le blocage vient du navigateur.

Vérifié : retard de 185 s annoncé « 3 min 05 » sur le chemin réel du
déverrouillage ; notification captée avec son corps, son tag et sa vibration ;
permission refusée → rien n'est envoyé, aucune erreur, message d'explication.
