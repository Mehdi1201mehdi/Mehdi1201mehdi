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
