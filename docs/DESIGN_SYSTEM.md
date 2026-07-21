# Design System — Coach Perso

Direction artistique : **musculation premium, sombre, énergique**. Noirs *teintés*
(jamais `#000`), une seule couleur d'accent, verre et profondeur maîtrisés, motion GPU.
Toutes les valeurs vivent en variables CSS dans `:root` de `style.css` — **ne jamais
coder une valeur en dur**, toujours référencer un token.

## Couleurs (thème sombre par défaut)

| Token | Valeur | Usage |
|---|---|---|
| `--bg` | `#07090C` | Fond global (noir bleuté, pas pur) |
| `--surface` | `#14181E` | Cartes |
| `--surface-2` | `#1D232B` | Surfaces surélevées, pistes de barres |
| `--elevated` | `#0E1116` | Barre d'onglets |
| `--ink` | `#FFFFFF` | Texte principal |
| `--ink-soft` | `#9AA1AC` | Texte secondaire |
| `--line` | `#252C36` | Bordures discrètes |
| `--accent` | `#3B82F6` | **Accent** : CTA, actif, progression |
| `--accent-2` | `#6366F1` | Fin de dégradé d'accent |
| `--accent-ink` | `#7DA9FF` | Texte d'accent (eyebrows, liens) |
| `--accent-soft` | `#152238` | Fond d'accent atténué |
| `--ok` `--amber` `--danger` | `#22C55E` `#F59E0B` `#EF4444` | Succès / attention / danger |

Thème clair : voir `:root[data-theme="light"]`. Anatomie : `--anat-body/-line/-muscle`.

## Typographie

- Police unique : **Inter** (variable 400→900, auto-hébergée, `docs/ASSET_SOURCES.md`).
- Échelle : `h1` 1.95rem/850, `h2` 1.24rem/800, `h3` 1.03rem/750, body 1rem/1.45,
  `.small` .82rem, `.eyebrow` .68rem/800 majuscule +letter-spacing.
- Stats : `.num` (chiffres tabulaires, `letter-spacing:-.01em`). Les grands chiffres
  doivent ressortir (poids 850, `.stat b` 1.5rem/850).

## Rayons, espaces, ombres, motion

- Rayons : `--radius:18px`, `--radius-sm:12px` (cartes, boutons).
- Ombres : `--shadow` (carte), `--shadow-lg` (modale/survol).
- Dégradé d'accent : `--grad:linear-gradient(135deg,var(--accent),var(--accent-2))`.
- Easing : `--ease:cubic-bezier(.22,1,.36,1)`. Durées 120–320 ms. GPU only
  (`transform`/`opacity`). `prefers-reduced-motion` respecté partout.

## Composants (classes)

- `.card` — carte de base (dégradé subtil + liseré `::before`). **Pas de carte dans une
  carte dans une carte.**
- `button` / `.primary` / `.chip` / `.chip.on` — CTA en `--grad`, `:active{scale(.955)}`,
  cibles ≥ 44 px (`--tap:50px`).
- `.stat` — tuile statistique (icône + grand chiffre + label).
- `.anat-ex` — carte d'exercice (vignette + numéro + badge séries×reps + repos + chevron).
- `nav.tabs` — barre d'onglets en pilule de verre, `env(safe-area-inset-bottom)`.
- `.emptystate` — état vide (icône + titre + phrase). **Ne pas confondre** avec
  `.cal-cell.empty` (collision historique corrigée).
- Data-viz : `anneauSVG`, `svgLine`, `svgBars`, `gaugeIMC` — s'animent à l'ouverture.

## Règles anti-« généré par IA »

- Pas de noir pur, pas de gris sur couleur, texte toujours teinté.
- Une seule police, une seule couleur d'accent.
- Pas d'easing élastique/bounce daté ; pas de dégradé violet→bleu criard.
- Cibles tactiles ≥ 44 px, paddings cohérents, hiérarchie de titres claire.

Le respect de ces règles est vérifié par `.claude/skills/design-guard/`.
