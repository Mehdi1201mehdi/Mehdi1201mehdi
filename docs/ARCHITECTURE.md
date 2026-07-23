# Coach Perso IA — Architecture & plan

Application **personnelle** (mono-utilisateur) de coaching sportif intelligent.
PWA **local-first** : installable sur le téléphone, utilisable **avec ou sans
connexion**, données stockées **sur l'appareil**. Aucune donnée envoyée à un
serveur ; le futur coach IA passera par un proxy serveur (aucune clé dans l'app).

## Décisions clés (adaptées « juste pour moi »)

| Conservé (cœur sérieux) | Retiré (inutile en mono-utilisateur) |
|---|---|
| Moteur de programmation **déterministe** | Comptes multiples, RBAC, admin d'autres users |
| Moteur de **progression** (double progression) + audit | Paiements RevenueCat, free/premium |
| **Remplacement** par contraintes | Webhooks abonnement, quotas commerciaux |
| **Hors ligne** + PWA installable | Backend NestJS/Postgres/Redis, S3 |
| Base d'exercices **originale**, structurée | Traductions multi-langues (FR au départ) |
| Coach IA **à outils contrôlés** (le LLM n'invente aucun exercice) | RGPD-pour-des-tiers |

> Règle non négociable conservée : **le modèle de langage ne choisit jamais un
> exercice librement**. Il ne fait que proposer des ajustements structurés qui
> repassent par le moteur déterministe et par ta confirmation.

## Modules logiques → fichiers

1. Profil utilisateur → `src/models.js`, `src/store/state.js`
2. Catalogue d'exercices → `src/data/exercises.js`
3. Moteur de contraintes → `src/engine/constraints.js`
4. Moteur de programmation → `src/engine/generator.js`
5. Moteur de progression → `src/engine/progression.js`
6. Moteur de remplacement → `src/engine/replacement.js`
7. Historique des performances → `src/store/state.js` (`logs`)
8. Coach conversationnel → *(Phase 2 — proxy serveur + function calling)*
9. Synchronisation santé → *(Phase 3 — HealthKit / Health Connect via wrapper natif optionnel)*
10. Interface / PWA → `src/ui/app.js`, `index.html`, `style.css`, `sw.js`, `manifest.webmanifest`

## Arborescence

```
index.html               Coquille de l'app (PWA)
style.css                Design system (thèmes clair/sombre, accessibilité)
manifest.webmanifest     Manifeste PWA (installation)
sw.js                    Service worker (cache hors ligne)
assets/icons/icon.svg    Icône de l'app
package.json             Scripts de test / typecheck
src/
  models.js              Types, énumérations, validation de profil
  data/exercises.js      Base d'exercices originale (référentiel)
  engine/
    constraints.js       Filtrage matériel / limitations / niveau
    generator.js         Génération déterministe de programme
    progression.js       Double progression + journal d'audit
    replacement.js       Remplacement par contraintes (3 alternatives)
    index.js             Agrégat du moteur
  store/state.js         État + persistance locale + planning
  ui/app.js              Écrans : onboarding, dashboard, programme, séance, progrès, réglages
tests/                   Tests du moteur (node --test) — cas sportifs du cahier des charges
docs/ARCHITECTURE.md     Ce document
```

## Modèle de données local (`localStorage`, clé `coachperso.ia.v1`)

- `profil` : identité, objectif, niveau, jours, durée, lieu, équipements,
  muscles prioritaires, exercices aimés/refusés, limitations, récupération…
- `programme` : split + séances → exercices → séries (charge/reps/durée/RIR/tempo/repos)
- `logs[]` : séances réalisées `{ id (uuid idempotent), date, seanceId, exercices[] }`
- `metrics[]` : poids / mensurations `{ id, date, poidsKg, … }`
- `reglages` : thème, unités, sons, vibrations

Chaque log porte un **UUID idempotent** : base prête pour une synchro
optionnelle ultérieure sans doublons.

## Plan par phases

- **Phase 1 (en cours)** ✅ : moteur déterministe (génération, progression,
  remplacement) + tests, base d'exercices, onboarding, dashboard, programme,
  **mode séance** (saisie + minuteur + suggestions), progrès de base, PWA
  hors ligne installable.
- **Phase 2** : coach IA (proxy serveur + outils contrôlés + propositions
  validées), statistiques avancées & graphiques, exercice-détail enrichi,
  extension de la base vers 150+ exercices.
- **Phase 3** : synchronisation santé (Apple Health / Health Connect via
  wrapper natif optionnel), notifications locales, export/import avancé.
- **Phase 4** : durcissement, sauvegarde chiffrée optionnelle, finitions,
  éventuel empaquetage natif (Capacitor) si tu veux une vraie app store.

## Ce qui fonctionne réellement vs simulé (honnêteté)

- **Fonctionne** : génération de programme déterministe et testée, filtrage par
  matériel/limitations, progression (double progression) avec audit,
  remplacement d'exercice, mode séance avec minuteur, persistance locale, PWA
  hors ligne, onboarding complet, catalogue d'exercices (~287, dont ~37 curés
  en français utilisés par le moteur + 250 importés de wger.de, noms traduits
  en français), icônes PNG haute résolution (192/512/maskable) déjà générées.
- **Pas encore là** : coach IA conversationnel (Phase 2), synchro santé
  (Phase 3), graphiques avancés, descriptions détaillées des 250 exercices
  wger (encore en anglais, seuls les noms sont traduits).

## Reste à configurer manuellement

1. **Activer GitHub Pages** (Settings → Pages → Deploy from a branch) pour
   obtenir le lien permanent et installer l'app sur le téléphone.
2. (Phase 2) Déployer un petit **proxy IA** et y mettre la clé API côté serveur.
3. (Optionnel) Générer des **icônes PNG** 192/512 px à partir de `icon.svg`.
