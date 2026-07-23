# FIGMA_INTEGRATION.md — Intégrer des designs Figma (MCP) dans Coach Perso

> Doc de règles pour l'agent (à lire **avant** toute implémentation d'un design Figma).
> Complète `CLAUDE.md` et `docs/DESIGN_SYSTEM.md`. La source de vérité des tokens
> reste les variables CSS de `:root` dans `style.css`.

---

## 0. La contrainte qui commande tout : **NO-BUILD, PAS DE REACT**

Coach Perso est une **PWA en modules ES natifs, sans build, sans framework**, servie
telle quelle par GitHub Pages. C'est **non négociable** (cf. `CLAUDE.md` §Architecture).
Conséquence directe pour Figma → code : **on n'importe jamais le code généré par
Figma** (Figma « Dev Mode » / codegen produit du React/JSX/Tailwind/CSS-in-JS). On s'en
sert uniquement comme **spécification visuelle** : lire les tokens, les mesures, les
couleurs, la hiérarchie — puis **traduire à la main** en HTML natif (via le helper `h()`)
+ classes dans `style.css`.

| ❌ Ne jamais faire | ✅ Faire à la place |
|---|---|
| Coller le React/JSX exporté par Figma | Écrire une vue `vXxx()` en HTML natif via `h()` |
| Ajouter Tailwind / styled-components / CSS-in-JS | Ajouter des classes dans `style.css` |
| Introduire un bundler pour « supporter » l'export | Garder les modules ES servis tels quels |
| Coller des hex bruts venus de Figma | Mapper chaque couleur sur un token `var(--…)` |
| Ajouter une police du design | Rester sur **Inter** (seule police auto-hébergée) |
| Multiplier les couleurs d'accent | **Un seul** accent (`--accent`) |

---

## 1. Définition des tokens

**Où** : `style.css`, dans trois blocs `:root` / `:root[data-theme="dark"]` /
`:root[data-theme="light"]`. **Documentés** dans `docs/DESIGN_SYSTEM.md`.
**Format** : variables CSS natives (custom properties). **Aucun** système de tokens JSON,
**aucune** transformation (pas de Style Dictionary, pas de build). Le fichier CSS **est**
le token store.

```css
/* style.css — extrait de :root (thème sombre par défaut) */
:root{
  --bg:#0B0D10; --bg-deep:#05070A; --surface:#12151A; --surface-2:#181C22; --elevated:#0B0D10;
  --ink:#EDEFF2; --ink-soft:#8B94A3; --faint:#5A626E;
  --line:#20252D; --hair:rgba(255,255,255,.06);
  --accent:#3B82F6; --accent-2:#2563EB; --on-accent:#FFFFFF;
  --accent-ink:#7DA9FF; --accent-soft:rgba(59,130,246,.14);
  --ok:#22C55E; --amber:#F59E0B; --danger:#EF4444; --orange:#F97316; --indigo:#818CF8;
  --radius:18px; --radius-sm:12px; --radius-btn:14px;
  --grad:linear-gradient(135deg,var(--accent),var(--accent-2));
  --ease:cubic-bezier(.22,1,.36,1); --tap:50px;
}
```

**Règle Figma → token** : appeler `get_variable_defs` sur le nœud, puis **mapper chaque
variable Figma sur un token existant** (table ci-dessous). Ne créer un **nouveau** token
que si aucun n'existe — et alors l'ajouter aux **trois** blocs (`:root`, `dark`, `light`)
+ le documenter dans `DESIGN_SYSTEM.md`.

| Variable Figma (typique) | Token CSS cible |
|---|---|
| `color/background`, `bg/base` | `--bg` / `--bg-deep` |
| `color/surface`, `card` | `--surface` |
| `color/surface-raised`, `elevated` | `--surface-2` |
| `text/primary` | `--ink` |
| `text/secondary` | `--ink-soft` |
| `text/tertiary`, `disabled` | `--faint` |
| `border`, `divider` | `--line` / `--hair` |
| `brand/primary`, `accent` | `--accent` (+ `--accent-2` pour la fin de dégradé) |
| `success` / `warning` / `danger` | `--ok` / `--amber` / `--danger` |
| `radius/md` / `radius/sm` / `radius/button` | `--radius` / `--radius-sm` / `--radius-btn` |

**Garde-fous** : jamais de `#000` (noirs teintés) ; jamais de valeur en dur (toujours
`var(--…)` ; `color-mix(in srgb, var(--accent) 14%, transparent)` pour les nuances) ;
un seul accent.

---

## 2. Bibliothèque de composants

**Il n'y a pas de framework de composants.** Les « composants » sont :

1. **Un helper de rendu** `h()` qui transforme une chaîne HTML en nœud DOM :

```js
// src/ui/app.js
function h(html){ const t=document.createElement("template"); t.innerHTML=html.trim(); return t.content.firstElementChild; }
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
```

2. **Des classes CSS** dans `style.css` qui jouent le rôle de composants réutilisables.
   C'est la cible d'un composant Figma : on **mappe le composant Figma sur une classe**,
   on ne crée pas un composant JS.

| Composant Figma | Classe(s) CSS | Fichier |
|---|---|---|
| Card / Surface | `.card` (`.card.flat`, `.card.accent`) | `style.css` |
| Stat tile (icône + label + valeur) | `.stat`, `.mstat` (horizontale) | `style.css` |
| Hero « séance du jour » | `.wkcard` + `.wk-stats` | `style.css` |
| Ligne séance / liste | `.wcard`, `.daycard`, `.anat-ex` | `style.css` |
| Bouton primaire / secondaire / chip | `button.primary`, `button.secondary`, `button.chip` | `style.css` |
| Raccourcis Accueil | `.qrow` | `style.css` |
| Tableau de séries (séance live) | `.setrow` | `style.css` |
| Barre d'onglets | `nav.tabs` | `index.html` + `style.css` |
| Anneau de repos / progression | `.ring`, `anneauSVG()` | `style.css` + `src/ui/app.js` |

3. **Des vues** = fonctions qui composent ces classes et branchent les données réelles :
   `vDash`, `vProg`, `vTrain`, `vStats`, `vNutrition`, `vSet`, `vAnatoly`, `vCatalogue`
   (routées dans l'objet `TABS`). Un « écran » Figma devient une (ou un morceau d')une de
   ces fonctions.

**Doc / storybook** : pas de Storybook. La galerie de référence est `docs/DESIGN_SYSTEM.md`
(+ la maquette Claude Design `Coach Perso.dc.html`). Le garde-fou est
`.claude/skills/design-guard/`.

```js
// Patron d'un « composant » monté dans une vue
const card = h(`<div class="card"></div>`);
card.append(h(`<div class="eyebrow">Entraînement du jour</div>`));
const cta = h(`<button class="primary big">Commencer la séance</button>`);
cta.addEventListener("click", () => nav("train"));
card.append(cta);
view.append(card);
```

---

## 3. Frameworks & librairies

- **UI framework** : **aucun**. HTML natif généré par `h()`, DOM impératif.
- **Styling** : **CSS pur**, un seul fichier `style.css`, variables CSS + `color-mix()`.
- **Build / bundler** : **aucun**. Modules ES natifs chargés par le navigateur.
  Point d'entrée `index.html` → `src/ui/app.js` (`<script type="module">`) + `boot.js`.
- **Types** : TypeScript **en JSDoc** (`// @ts-check`), vérifié par `npm run typecheck`
  (`tsc --noEmit -p jsconfig.json`). Pas de `.ts`, pas de transpilation.
- **Tests** : `node --test tests/*.test.js` (**138** tests, moteur pur). Aucune dépendance
  runtime ; `playwright-core` + `typescript` sont en `devDependencies` seulement.
- **Interdit** (casse le no-build/offline/tests) : React, shadcn, Recharts, GSAP, Tailwind,
  tout bundler. Cf. `docs/TECH_STACK.md` pour les alternatives rejetées et pourquoi.

---

## 4. Gestion des assets

**Arborescence** :

```
assets/
  fonts/   inter-latin.woff2, inter-latin-ext.woff2   (Inter auto-hébergé, OFL)
  icons/   icon.svg, icon-192.png, icon-512.png, apple-touch-icon.png, icon-maskable-512.png
```

- **Polices** : Inter auto-hébergé, `@font-face` en tête de `style.css`, `font-display:swap`,
  `unicode-range` splitté latin / latin-ext, préchargé dans `index.html`
  (`<link rel="preload" … as="font" crossorigin>`).
- **Médias d'exercices** (gifs/vidéos) : **référencés par URL distante** (dataset GitHub
  `hasaneyldrm/exercises-dataset`, repli ExerciseDB), **pas stockés dans le repo**. Cache
  **cache-first** dans `sw.js` (`MEDIA_CACHE`). Résolus par `src/integrations/*` +
  `src/data/gifs.js`.
- **CSP** (dans `index.html`) : toute nouvelle source d'image/média/connexion **doit** être
  ajoutée à la balise `Content-Security-Policy`, sinon elle est bloquée.
- **Service worker** : à **chaque** changement d'asset (CSS/JS/image/police), **incrémenter
  `CACHE`** dans `sw.js` (`coachperso-ia-vNN`) — sinon l'ancienne version reste en cache.
- **Optimisation / CDN** : pas de CDN applicatif (offline-first) ; images app en SVG/PNG
  légers ; pas de pipeline d'optim automatisé.
- **Licences** : toute image importée doit avoir une provenance sûre, tracée dans
  `docs/ASSET_SOURCES.md`. **Ne pas** intégrer des photos/stock de licence incertaine
  (y compris celles d'une maquette Figma/Claude Design).

**Figma → assets** : `download_assets` **uniquement** pour des SVG/icônes ou des images
dont tu as les droits → écrire dans `assets/`, référencer en **chemin relatif** (`./assets/…`,
jamais de chemin absolu, GitHub Pages sert en sous-dossier), ajouter à la CSP si besoin,
puis bumper le cache SW.

---

## 5. Système d'icônes

- **Où** : objet `IC` dans `src/ui/app.js` — des **SVG inline** sous forme de chaînes.
- **Convention** : `viewBox="0 0 24 24"`, `stroke-width="2"`, `stroke-linecap/linejoin="round"`,
  principes **Lucide**. `fill="none" stroke="currentColor"` pour les icônes au trait,
  `fill="currentColor"` pour les pleines. Tailles de rendu **16 / 18 / 20 / 24 px**.
  Couleur héritée via `currentColor` (jamais de hex dans le SVG).

```js
// src/ui/app.js
const IC = {
  dumbbell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7v10M18 7v10M4 9v6M20 9v6M6 12h12"/></svg>`,
  flame:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2.5-5 .5 2.5 2.5 2.5 2.5 2.5 0-3.5-2.5-4.5-2-7.5z"/></svg>`,
  // … calendar, search, user, play, apple, droplet, trophy, activity, plus, …
};
// Icône inline teintée par classe :
const mi = (svg, cls) => `<span class="mi ${cls}">${svg}</span>`;   // .mi-blue/.mi-green/.mi-orange/…
```

- **Usage** : injection par template string (`${IC.dumbbell}`), teinte via une classe
  (`.mi-blue`, `.ic-orange`…) qui pose `color`.
- **Nommage** : clés camelCase descriptives (`dumbbell`, `calendar`, `cornerDown`).
- **Figma → icône** : récupérer le path SVG (24×24, stroke 2), l'**ajouter à `IC`** avec une
  clé camelCase ; ne pas créer un fichier `.svg` par icône ni un « icon component ».

---

## 6. Approche de styling

- **Méthodologie** : CSS global unique (`style.css`), classes **plates** façon utilitaires
  + composants (proche BEM léger : `.wkcard`, `.wk-stats`, `.wk-ic`). Pas de CSS Modules,
  pas de CSS-in-JS.
- **Styles globaux** : reset léger, `body` (fond en `radial-gradient` + `--bg-deep`),
  échelle typo (`h1/h2/h3`, `.small`, `.eyebrow`, `.num` pour chiffres tabulaires).
- **Responsive** : **mobile-first**, colonne centrée `.wrap{max-width:480px}`, élargie à
  768px+ ; unités fluides ; `env(safe-area-inset-bottom)` pour la nav ; cible réelle
  **320 → 430 px** (Android type Poco M6).
- **Thèmes** : `:root[data-theme="light|dark"]`, bascule via `data-theme` sur `<html>`
  (`appliquerTheme()`), réglage persistant dans `Etat.data.reglages.theme`.
- **Motion** : GPU only (`transform`/`opacity`), 120–320 ms, easing `var(--ease)` (jamais
  bounce), `@media (prefers-reduced-motion: reduce)` respecté (état final garanti).
- **Accessibilité** : `:focus-visible`, `prefers-contrast`, `prefers-reduced-transparency`,
  cibles ≥ 44 px (`--tap`), `.sr-only`, lien d'évitement.

```css
/* Traduire une « frame » Figma → composant natif : mapper mesures sur tokens */
.card{background:var(--surface);border:1px solid var(--hair);border-radius:var(--radius);padding:17px}
button.primary{background:var(--grad);color:var(--on-accent);border-radius:var(--radius-btn);min-height:var(--tap)}
```

---

## 7. Structure du projet

```
index.html            Entrée : shell (splash, header, <main #view>, nav, overlay repos), CSP
boot.js               Enregistrement du service worker
sw.js                 Offline : réseau-first (app) / cache-first (médias) — bumper CACHE !
style.css             TOUT le CSS : tokens (:root) + composants + thèmes + a11y + motion
manifest.webmanifest  PWA (installable)
src/
  models.js           Constantes de domaine (GOALS, LEVELS, EQUIPMENTS, MUSCLES + libellés)
  ui/
    app.js            UI : helper h(), objet IC, vues vDash/vProg/vTrain/vStats/…, nav(), render()
    anatomy.js        Cartes musculaires SVG
  engine/             Logique métier PURE et testée (generator, progression, records, stats, …)
  store/              db.js (IndexedDB) · state.js (Etat + miroir localStorage) · migrate.js
  data/               Catalogues (exercises, foods, gifs, anatoly, …)
  integrations/       Sources externes (exercisedb, openfoodfacts, wger)
docs/                 ARCHITECTURE, DESIGN_SYSTEM, TECH_STACK, ASSET_SOURCES, INTEGRATIONS, (ce fichier)
tests/                node --test (138) — testent le moteur, pas l'UI
.claude/skills/       design-guard · fitness-ui · visual-audit
```

**Patterns clés** :

- **Séparation stricte moteur / UI** : `src/engine/*` est pur (aucun DOM/stockage), donc
  testable sous Node. L'UI lit/écrit `Etat.data` en mémoire ; `Etat.sauver()` persiste.
- **Une vue = une fonction** montée dans `#view` par `render()` / `nav(tab)`.
- **Navigation** : objet `TABS` (`dash/prog/train/stats/set/food/anatoly/cat`), barre à 5
  onglets (Accueil · Programme · Séance · Progrès · Plus).
- **Données 100 % locales** : IndexedDB + miroir localStorage (`coachperso.ia.v1`),
  migrations versionnées dans `migrate.js`. Aucune donnée envoyée à un serveur.

---

## 8. Workflow Figma → code (MCP) — pas à pas

**Prérequis** : ne jamais copier de code Figma. Toujours traduire en natif.

1. **Lire la structure** — `get_metadata` (arbre léger + tailles) sur le nœud/URL.
2. **Voir** — `get_screenshot` du frame → référence visuelle.
3. **Tokens** — `get_variable_defs` → **mapper** sur les tokens `:root` (table §1). Créer
   un token seulement si absent (dans les 3 blocs + `DESIGN_SYSTEM.md`).
4. **Détail** — `get_design_context` pour les couleurs/typo/mesures exactes d'un composant.
   En **extraire les valeurs**, pas le code.
5. **Assets** — `download_assets` pour les SVG/images **libres de droits** → `assets/` +
   chemin relatif + CSP + bump SW. Icônes → path 24×24 ajouté à `IC`.
6. **Implémenter en natif** — mapper chaque élément Figma sur une **classe existante**
   (table §2) ; écrire/étendre une vue `vXxx()` avec `h()` ; brancher les **vraies données**
   (`Etat.data`), pas les valeurs de maquette ; réutiliser `IC`, `.card`, `.stat`, `button.primary`…
7. **Contrôle qualité** (obligatoire, cf. `design-guard` + `visual-audit`) :
   - `node --check src/ui/app.js`
   - `node --test tests/*.test.js` → **138/138**
   - Audit visuel Playwright + **captures** à **320 / 360 / 390 / 412** px, thèmes sombre
     **et** clair : 0 débordement horizontal, 0 cible < 44 px, 0 erreur JS.
   - Bump `CACHE` dans `sw.js` si un asset a changé.
8. **Publier** — commit sur une **branche** ; **aucun `git push` sur `main` sans autorisation
   explicite** ; chemins relatifs `./` (ne pas casser GitHub Pages).

### Sens inverse (code → Figma)

Pour créer/mettre à jour un design Figma **depuis** cette app : lire d'abord le skill
`/figma-use` (obligatoire avant `use_figma`) et `/figma-generate-design`. Conserver la
cohérence des tokens de `DESIGN_SYSTEM.md` dans le fichier Figma généré.

---

## TL;DR — 10 règles d'or

1. **Jamais de code Figma collé** — Figma = spec, on traduit en natif.
2. **Jamais de build / React / Tailwind / CSS-in-JS.**
3. **Toute couleur = un token `var(--…)`** dans `:root` de `style.css`. Jamais de `#000`.
4. **Un seul accent** (`--accent`). Pas d'arc-en-ciel.
5. **Une seule police** : Inter. Respecter l'échelle `h1/h2/h3/.small/.eyebrow/.num`.
6. **Icônes** = SVG 24×24 stroke-2 ajoutés à l'objet `IC`, `currentColor`.
7. **Composant Figma → classe CSS existante** (table §2), monté par `h()` dans une vue `vXxx`.
8. **Brancher les vraies données** (`Etat.data`), jamais les valeurs de maquette.
9. **QA** : `node --check` + 138 tests + audit visuel 320–412 px, 2 thèmes, + bump SW.
10. **Rien n'est supprimé** (fonctions/données) ; **pas de `git push` sans feu vert**.
