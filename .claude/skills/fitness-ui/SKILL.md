---
name: fitness-ui
description: Design principles for building/adjusting workout interfaces used during training in the gym. Use this when working on the active-session screen, exercise cards, set logging, rest timer, program/session views, or any flow a user touches mid-workout with sweaty hands. Prioritizes legibility, speed, big touch targets, and few taps.
---

# Fitness UI

Concevoir des interfaces utilisables **pendant** l'entraînement, à la salle, une main,
en sueur, entre deux séries. Le contexte dicte le design.

## Priorités (dans l'ordre)

1. **Lisibilité** — gros chiffres, fort contraste, l'info clé visible sans zoomer.
2. **Vitesse** — le moins de clics possible pour valider une série ou voir l'exercice.
3. **Grosses cibles tactiles** — ≥ 44 px, idéalement plus pour les actions fréquentes
   (valider une série, +/− charge). Pas de petit contrôle difficile à toucher.
4. **Progression claire** — où j'en suis dans la séance / la série, toujours visible.
5. **CTA évident** — l'action principale (Commencer, Valider, Suivant) saute aux yeux.

## Règles concrètes

- **Écran séance active** : chrono héro visible, cartes de séries larges, bouton ✓ de
  validation généreux avec feedback (pop + teinte + haptique). Minuteur de repos plein
  écran, passage en alerte visuelle dans les 10 dernières secondes.
- **Voir ses exercices** = 0 clic si possible. Préférer des cartes visuelles (vignette
  + badge séries×reps + repos) affichées d'emblée plutôt qu'une liste repliée à déplier.
- **Saisie** : pré-remplir (dernière fois / conseil) pour éviter de tout retaper.
  `inputmode` numérique/décimal sur les champs charge/reps.
- **Feedback** : chaque action confirme (toast/haptique) ; jamais d'action silencieuse
  ambiguë.
- **Peu de texte** en séance ; le détail (instructions, erreurs) va dans la fiche
  exercice, ouverte à la demande.

## Anti-patterns à bannir

- Listes de texte denses à lire en soulevant.
- Boutons/inputs minuscules côte à côte.
- Modales bloquantes en plein effort.
- Info importante planquée derrière plusieurs taps.

## Vérifier

Tester l'écran aux largeurs 360/390/412 px, cibles ≥ 44 px, et se demander : « puis-je
valider ma série en 1 geste, sans réfléchir, entre deux répétitions ? »
