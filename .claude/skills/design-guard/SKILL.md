---
name: design-guard
description: Enforce the Coach Perso design system on every UI change. Use this whenever editing style.css, src/ui/app.js, or any visual/CSS/component code, or whenever adding colors, spacing, radius, shadows, buttons, cards, typography, icons, or animations. It prevents design drift and "AI-generated" tells.
---

# Design Guard

Objectif : empêcher toute modification de casser le design system de Coach Perso.
À consulter **avant** de committer un changement visuel.

## Référence

Le système est documenté dans `docs/DESIGN_SYSTEM.md` et implémenté via les variables
CSS de `:root` dans `style.css`. La source de vérité, ce sont ces tokens.

## Checklist obligatoire

**Couleurs**
- [ ] Aucune couleur en dur : utiliser `var(--...)`. Pas de nouveau hex sans token.
- [ ] Jamais `#000` : les noirs sont teintés (`--bg:#07090C`).
- [ ] Une seule couleur d'accent (`--accent`). Pas d'arc-en-ciel.
- [ ] Pas de texte gris sur fond coloré (contraste WCAG AA mini).

**Espacement / rayons / ombres**
- [ ] Rayons via `--radius` / `--radius-sm`. Padding cohérent avec les cartes existantes.
- [ ] Ombres via `--shadow` / `--shadow-lg`. Pas d'ombre criarde.
- [ ] Pas de carte imbriquée dans une carte dans une carte.

**Typographie**
- [ ] Police unique (Inter). Pas de nouvelle famille.
- [ ] Respecter l'échelle h1/h2/h3/body/small/eyebrow. Stats en `.num`.

**Boutons / cibles**
- [ ] Cible tactile ≥ 44 px (hauteur). Pas de bouton 28 px.
- [ ] Hiérarchie : primary (`--grad`) / secondary / chip / danger.

**Icônes**
- [ ] SVG inline, stroke 24px cohérent (principes Lucide). Tailles 16/18/20/24.

**Animations**
- [ ] GPU uniquement (`transform`/`opacity`). Durée 120–320 ms, jamais > 500 ms.
- [ ] Pas d'easing bounce/élastique. Utiliser `var(--ease)`.
- [ ] `prefers-reduced-motion` respecté (état final garanti).

## Après tout changement

1. `node --check src/ui/app.js`
2. `node --test tests/*.test.js` (138 doivent passer)
3. Lancer les smokes + **une capture d'écran** (cf. skill `visual-audit`).
4. Incrémenter `CACHE` dans `sw.js` si un asset change.

Si un changement viole un point ci-dessus, le corriger **avant** de committer.
