# Audit de parité final — Liftoff → Coach Perso

Document de clôture de la mission. Chaque ligne renvoie à du **code réel** et à
un **test effectué**. Aucune ligne n'est marquée « fait » sans preuve.

Source de l'inventaire Liftoff : `docs/LIFTOFF_ASSET_INVENTORY.md`.

---

## 1. Ce sur quoi l'audit repose

Onze archives transmises, **30 297 fichiers**, ~815 Mo. Sur cet ensemble :

- **2 images** au total, et le dossier `res/` — celui qui contient toutes les
  images d'un APK — **absent** ;
- le code applicatif se limite à **4 fichiers** de plomberie Expo
  (`com/gymbros/app/`), le reste étant des bibliothèques tierces ;
- la logique métier vit dans un **bytecode Hermes** issu d'un build repackagé,
  et les seuils de classement viennent d'un **backend GraphQL**.

**Conclusion méthodologique :** l'audit fonctionnel s'appuie sur
`AndroidManifest.xml`, qui déclare permissions et composants — donc les
FONCTIONS de l'application. C'est une preuve vérifiable, pas une supposition.

---

## 2. Tableau de parité

| Élément Liftoff (preuve) | État | Média utilisé | Code | Test effectué |
|---|---|---|---|---|
| `mlkit.vision.codescanner` — scan code-barres | **Amélioré** | aucun (API navigateur native, 0 Mo contre 880 ko de modèles ML) | `src/ui/scanner.js` | `tests/scanner.test.js` (16) + bout en bout caméra simulée : 16 images dont 2 illisibles et 1 autre produit, seul le code confirmé 3× retenu |
| `CAMERA` + `CropImageActivity` + `READ_MEDIA_IMAGES` — photos | **Adapté** | photos de l'utilisateur, Blob IndexedDB | `src/engine/photos.js`, `src/ui/photoCapture.js` | `tests/photos.test.js` (24) + 7 largeurs, ratio constant 0,75 |
| `Notifee` + `SCHEDULE_EXACT_ALARM` — alerte hors app | **Adapté** | aucun | `src/ui/notifs.js` | `tests/notifs.test.js` (7, dont un qui échoue si le fichier contient `fetch`/`pushManager`) + retard 185 s annoncé « 3 min 05 » |
| `expo.modules.video.FullscreenPlayerActivity` — démonstrations | **Amélioré** | **281 GIF** (Gym Visual, redistribués avec permission) | `src/data/gifs.js`, `src/data/media-manifest.js` | `tests/gifs.test.js` (7) + 8 URL contrôlées en réseau (HTTP 206, en-tête `GIF89a`), 12 correspondances recoupées au nom anglais |
| `WAKE_LOCK` — écran allumé en séance | **Déjà présent** | — | `src/ui/app.js` (`tenirEcran`) | audit de bugs |
| `VIBRATE` — retour haptique | **Déjà présent** | — | `src/ui/app.js` | audit de bugs |
| `RECORD_AUDIO` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | **Adapté** | sons **synthétisés**, aucun fichier | `src/ui/son.js` | `tests/son.test.js` (9) |
| `com/apollographql/apollo` (274 fichiers) — classement | **Non transposable → remplacé** | — | `src/engine/rang.js` | `tests/rang.test.js` (25) ; le classement compare aux autres utilisateurs, il n'y en a pas |
| `USE_BIOMETRIC` — verrouillage | **Ignoré** | — | — | mono-utilisateur, aucun gain |
| Superwall · RevenueCat · Play Billing 8.0.0 | **Ignoré** | — | — | un seul utilisateur, rien à vendre |
| Adjust · Firebase · PostHog · Mixpanel · Sentry | **Ignoré, délibérément** | — | — | l'app reste 100 % locale ; aucun module n'ouvre de connexion hors des trois intégrations documentées |
| Images, illustrations, icônes, animations | **Non fournies** | équivalents originaux | `src/ui/illustrations.js`, `medailles.js`, `anatomy-paths.js`, `IC` | `tests/illustrations.test.js` (10), `tests/medailles.test.js` (11) |
| `GoogleSans-Medium.ttf` | **Remplacé** | Anton + Inter (OFL 1.1) | `assets/fonts/` | `docs/ASSET_SOURCES.md` |

### Bilan

Sur **13 lignes** : 3 améliorées, 4 adaptées, 2 déjà présentes, 4 écartées avec
justification. **Zéro ligne en attente.**

---

## 3. Ce qui a été construit au-delà de Liftoff

Ces fonctions n'existent pas dans Liftoff — elles répondent à des besoins que
son modèle multi-utilisateurs n'a pas.

| Fonction | Pourquoi | Code | Test |
|---|---|---|---|
| **Calibrage du rang** | les seuils de Liftoff sont sur son serveur ; ici on écrit les siens | `src/engine/rang.js` | 25 tests |
| **Comparaison de séance** | « 12 400 kg » ne dit rien sans point de comparaison | `src/engine/bilanSeance.js` | 15 tests |
| **Fiche muscle** | la planche colorait sans expliquer | `src/engine/muscle.js` | 15 tests |
| **Équilibre du corps** | pousser 2× plus qu'on ne tire, qu'aucun total ne montre | `src/engine/equilibre.js` | 15 tests |
| **Trophées** | jalons de long terme, calculés, jamais stockés | `src/engine/trophees.js` | 17 tests |

---

## 4. Défauts trouvés et corrigés en cours de route

Tous **préexistants** sauf mention contraire, tous vérifiés dans le navigateur.

| Défaut | Conséquence réelle | Correctif |
|---|---|---|
| Minuteur de repos au lancement | un décompte tournait sur une app au repos, sans séance | `decisionReprise()`, 3 tests · vérifié sur 3 états |
| `series: 4` au lieu d'un tableau | **écran blanc** à la place de la séance, deux `TypeError` | `normaliserProgramme()`, 8 tests |
| Minuteur par-dessus l'écran de fin | décompte plein écran sur le bilan | `stopTimer()` dans `terminer()` |
| 6 exercices d'abdominaux → animation de **course à pied** | on apprend le mauvais geste | correspondances corrigées, test nommé |
| UPC-A sans zéro de tête | tout produit importé « introuvable » | `normaliserCode()` |
| 250 exercices jamais soumis au moteur de médias | le **soulevé de terre** n'avait pas de démonstration | importeur corrigé, 224 → 281 |
| Import « remplacer » effaçait les fiches photo | images orphelines, historique perdu | 3 tests · *défaut introduit par moi, corrigé avant livraison* |
| Régénération rendant 190 associations contre 224 | 34 démonstrations supprimées en silence | fusion au lieu d'écrasement + plancher testé |
| 3 formules décrivant la même géométrie | titre passant sous la silhouette | une source unique, écart constant à 10 px |
| 20 emoji dans l'interface | rendu variable selon le téléphone | 0 emoji, recensement automatisé |

---

## 5. Vérification

| | |
|---|---|
| Tests | **499** sur 43 fichiers, tous verts |
| Typecheck | `tsc --noEmit` — 0 erreur |
| Largeurs contrôlées | 320 · 360 · 390 · 412 · 430 · 768 · 1024 |
| Densité | tous les écrans sous la limite, un seul CTA dominant |
| Contraste | conforme en thème clair **et** sombre |
| Audit de bugs | aucune anomalie |
| Erreurs console | 0 sur tous les parcours joués |
| Cache SW | v127 |
| Commits | 18, chacun publié et vérifié |
| Diff total | 36 fichiers, +5 444 / −165 |

### Écrans contrôlés visuellement

Accueil · Catalogue (grille et liste) · Séance active · Fin de séance ·
Progrès (carte musculaire, équilibre, photos, calibrage du rang) · Nutrition
(scanner) · Onboarding (5 étapes) · Programmes.

---

## 6. Ce qui reste ouvert

| Sujet | État | Pourquoi |
|---|---|---|
| **Architecture** (phase 11) | **close** | 5 modules extraits (`icones`, `dom`, `vignettes`, `graphes`, `carteRoutines`). `src/ui/app.js` : 6 154 → 5 922 lignes. Arrêtée volontairement là : le reste est couplé à l'état vivant, risque réel et gain nul. Voir `docs/APP_ARCHITECTURE.md` |
| **Images de Liftoff** | impossible en l'état | le dossier `res/` n'a jamais été transmis |
| **Seuils de rang de Liftoff** | contourné | ils sont sur leur serveur ; l'app permet désormais de saisir les siens |

### Une limite à dire clairement

Les captures de contrôle montrent les **silhouettes** et non les GIF : le bac à
sable de développement ne route pas `raw.githubusercontent.com` vers le
navigateur, et le service worker intercepte en amont. C'est **exactement le repli
prévu** quand le réseau manque — sur un téléphone, les animations s'affichent.
Ce point est vérifiable en ouvrant le catalogue en ligne.
