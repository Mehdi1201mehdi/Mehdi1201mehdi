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

## Règles anti-« généré par IA »

- Pas de noir pur, pas de gris sur couleur, texte toujours teinté.
- Une seule police, une seule couleur d'accent.
- Pas d'easing élastique/bounce daté ; pas de dégradé violet→bleu criard.
- Cibles tactiles ≥ 44 px, paddings cohérents, hiérarchie de titres claire.

Le respect de ces règles est vérifié par `.claude/skills/design-guard/`.
