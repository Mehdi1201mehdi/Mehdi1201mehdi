# Tech Stack & décisions de dépendances

## Décision d'architecture (équipe produit)

Coach Perso est une **PWA sans build** (modules ES natifs) servie par GitHub Pages,
**100 % hors ligne**. C'est un choix délibéré : zéro tooling, zéro régression de build,
chargement instantané, offline fiable, maintenance triviale.

**Conséquence : on n'ajoute PAS React, ni bundler, ni librairie qui suppose un build.**
Introduire React/shadcn/Recharts/GSAP casserait le no-build, alourdirait le bundle,
briserait l'offline et les 138 tests — pour un rendu qu'on atteint déjà en CSS/JS natif.
Le niveau « premium » est obtenu par le design system natif, pas par des dépendances.

## Tableau des sources évaluées

| Source | Statut | Pourquoi |
|---|---|---|
| **Inter** (police) | ✅ **Déjà intégré** | Auto-hébergée woff2 (OFL). Cf. `ASSET_SOURCES.md`. |
| Icônes (style Lucide) | ✅ **Déjà intégré** | SVG inline, stroke cohérent 24px — mêmes principes que Lucide, sans dépendance. |
| Motion / animations | ✅ **Fait en natif** | Keyframes CSS + `transform/opacity`, GPU, 60fps. Pas besoin de Motion/GSAP. |
| Graphiques | ✅ **Fait en natif** | `svgLine/svgBars/anneauSVG` SVG maison, animés. Recharts = React → exclu. |
| Toasts | ✅ **Fait en natif** | `toast()` + `.toast` (role=status). Sonner = React → inutile. |
| Glass / blur / glow | ✅ **Déjà intégré** | `backdrop-filter` maîtrisé (nav, modales), repli `prefers-reduced-transparency`. |
| Playwright | ⚙️ **Utilisé en dev** | `playwright-core` pour smokes + audit visuel (screenshots). Pas en prod. |
| **React / shadcn/ui / Radix** | ❌ **À éviter** | Imposent un build ; incompatibles no-build ; rearchitecture destructrice. |
| **GSAP / Motion (lib)** | ❌ **À éviter** | Poids + build ; l'effet est déjà obtenu en CSS. |
| **Recharts** | ❌ **À éviter** | React. SVG natif suffit et reste plus léger. |
| **Lenis** | ❌ **À éviter** | Scroll natif prioritaire sur mobile ; smooth-scroll JS = jank + poids. |
| **Swiper / Embla** | ❌ **À éviter** | Carrousels non nécessaires ; scroll-snap CSS suffit si besoin. |
| **Three.js / R3F / WebGL** | ❌ **À éviter** | 3D lourde, non justifiée pour une app d'entraînement. |
| Lighthouse / axe-core | 🔵 **Optionnel (dev)** | Peuvent être lancés ponctuellement en audit ; pas de dépendance runtime. |

## Dépendances runtime réellement embarquées

**Aucune.** Le runtime est du HTML/CSS/JS natif + 2 fichiers de police woff2. Aucun
package npm n'est chargé par le navigateur en production.

## Dépendances de développement

| Nom | Rôle | Licence |
|---|---|---|
| `playwright-core` | Smokes navigateur + captures d'audit visuel | Apache-2.0 |
| `typescript` | `npm run typecheck` : vérification de types via JSDoc, sans compilation | Apache-2.0 |
| `@types/node` | Types de `node:test`, `node:fs`… pour les tests et les scripts d'import | MIT |

Chromium est pré-installé dans l'environnement (pas de téléchargement).

**Aucune dépendance d'exécution.** Ces trois paquets ne sont utilisés qu'en
développement : rien n'est installé, empaqueté ni téléchargé par le navigateur.
`typecheck` lit les annotations JSDoc des fichiers `.js` — il ne produit aucun
artefact, il n'y a donc toujours pas d'étape de build.

Le typecheck doit rester à **zéro erreur** : c'est ainsi qu'on a trouvé
l'appel à `estimerDureeSeance()` jamais importé dans `app.js`, qui faisait
perdre silencieusement toute modification de séries dans une routine perso.
