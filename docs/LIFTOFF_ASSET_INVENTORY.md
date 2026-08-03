# Inventaire des ressources Liftoff fournies

Inventaire **exhaustif et mesuré** des onze archives transmises, dossier par
dossier. Aucune extrapolation : chaque ligne vient d'une lecture du sommaire des
archives, reproductible.

Ce document existe parce que la question « pourquoi n'as-tu pas pris les
images ? » revient. La réponse est ici, chiffrée.

## Total reçu

| Archive | Fichiers | Taille décompressée | Contenu dominant |
|---|---:|---:|---|
| `java2.rar` | 17 040 | 379,5 Mo | `com/google` |
| `java.rar` | 8 734 | 282,5 Mo | `androidx/compose` |
| `java3.rar` | 4 197 | 104,5 Mo | `kotlin/reflect` |
| `METAINF.rar` | 140 | 0,9 Mo | `META-INF/services` |
| `org.rar` | 130 | 0,3 Mo | `org/apache` |
| `com.rar` | 22 | 0,0 Mo | `com/superwall` |
| `assets.rar` | 10 | 28,8 Mo | `assets/mlkit_barcode_models` |
| `kotlin.rar` | 8 | 0,0 Mo | `kotlin/annotation` |
| `javazoom.rar` | 4 | 0,0 Mo | `javazoom/jl` |
| `okhttp3.rar` | 2 | 0,0 Mo | `okhttp3/internal` |
| `AndroidManifest.xml` | 1 | 0,04 Mo | déclarations |
| **Total** | **30 297** | **~815 Mo** | |

**Images, vidéos, animations ou sons dans l'ensemble : 2 fichiers.**

## Le dossier `res/` n'a jamais été transmis

Dans un APK Android, **toutes** les images, illustrations, icônes, animations
vectorielles et couleurs vivent dans `res/` (`res/drawable*`, `res/mipmap*`,
`res/raw`, `res/values`). Ce dossier est **absent** des onze archives.

C'est la raison unique et suffisante pour laquelle aucune illustration, aucune
icône et aucune démonstration d'exercice de Liftoff n'a pu être reprise : elles
n'ont pas été fournies.

## Détail de `assets/` — le seul dossier de ressources reçu

| Chemin | Taille | Type | Rôle | État | Destination |
|---|---:|---|---|---|---|
| `assets/index.android.bundIe` | 28,95 Mo | bytecode Hermes | tout le code JS de l'app | **inutilisable** | — |
| `assets/GoogleSans-Medium.ttf` | 118 508 o | police | typographie de marque | **inutilisable** | — |
| `assets/CR.png` | 257 166 o | image | logo du groupe de repackaging | **inutilisable** | — |
| `assets/app.config` | 6 320 o | config Expo | paramètres de build | doublon du manifeste | — |
| `assets/mlkit_barcode_models/*.tflite` (×3) | 880 888 o | modèles ML | scan de codes-barres | **remplacé** | `src/ui/scanner.js` (API native) |
| `assets/dexopt/baseline.prof*` | 17 469 o | profil ART | optimisation Android | sans objet en PWA | — |
| `assets/protected_by_np/ApkDex2CPro_*.txt` | 142 o | marqueur | trace de repackaging | — | — |

### Pourquoi « inutilisable » sur ces trois-là

- **`index.android.bundIe`** — bytecode **Hermes** compilé (confirmé par la
  présence de `com/facebook/hermes`), pas du JavaScript. Le nom porte un `I`
  majuscule au lieu d'un `l` : renommage volontaire contre l'extraction
  automatique. Provient d'un build marqué `protected_by_np` / `ApplicazioniCR0`,
  c'est-à-dire **repackagé**, pas d'origine.
- **`GoogleSans-Medium.ttf`** — police propriétaire Google, non redistribuable.
  Équivalent original en place : **Anton** (OFL 1.1) pour les titres, **Inter**
  (OFL 1.1) pour le texte.
- **`CR.png`** — logo du groupe de repackaging, sans rapport avec Liftoff.

## Ce qui a réellement été exploité

Le manifeste, lui, est riche en information : il déclare les permissions et les
composants, donc les **fonctions** de l'app. C'est de là que vient tout le
travail de fusion.

| Preuve dans `AndroidManifest.xml` | Fonction | État chez nous | Code |
|---|---|---|---|
| `mlkit.vision.codescanner` | scan code-barres nutrition | **intégré** (API native, sans modèle ML) | `src/ui/scanner.js` |
| `CAMERA` + `CropImageActivity` + `READ_MEDIA_IMAGES` | photos de progression | **intégré** | `src/engine/photos.js`, `src/ui/photoCapture.js` |
| `Notifee` + `SCHEDULE_EXACT_ALARM` | alerte hors application | **intégré** (fin de repos) | `src/ui/notifs.js` |
| `WAKE_LOCK` | écran allumé en séance | déjà présent | `src/ui/app.js` |
| `VIBRATE` | retour haptique | déjà présent | `src/ui/app.js` |
| `expo.modules.video.FullscreenPlayerActivity` | démonstrations | **intégré** (281 GIF) | `src/data/gifs.js` |
| `USE_BIOMETRIC` | verrouillage de l'app | écarté | mono-utilisateur, aucun gain |
| Superwall · RevenueCat · Play Billing | paywall, abonnement | écarté | un seul utilisateur |
| Adjust · Firebase · PostHog · Mixpanel · Sentry | pistage publicitaire, analytics | **écarté** | l'app reste 100 % locale |
| `com/apollographql/apollo` (274 fichiers) | classement contre les autres | non transposable | mono-utilisateur ; remplacé par `src/engine/rang.js` |

## Ressources réellement utilisées par l'application

| Ressource | Source | Licence | Usage |
|---|---|---|---|
| **Anton** (18,6 ko) | Google Fonts | OFL 1.1 | titres |
| **Inter** (133 ko) | rsms.me | OFL 1.1 | texte, chiffres |
| **281 démonstrations GIF** | `hasaneyldrm/exercises-dataset` | MIT (code) · médias © Gym Visual, avec permission | fiches d'exercice |
| **Silhouettes musculaires** | tracés maison | — | `src/data/anatomy-paths.js` |
| **Icônes** | tracés maison, principes Lucide | — | `IC` dans `src/ui/app.js` |
| **Illustrations d'état vide** | tracés maison | — | `src/ui/illustrations.js` |
| **Médailles de trophée** | tracés maison | — | `src/ui/medailles.js` |
| **Sons** | synthétisés (WebAudio) | — | `src/ui/son.js`, aucun fichier |

Détail des licences : `docs/ASSET_SOURCES.md`.

## Comment reprendre les images de Liftoff, si tu y tiens

Il faut le dossier **`res/`** du décompilé, celui que jadx écrit à côté de
`sources/`. Concrètement : `resources/res/drawable-xxxhdpi/`,
`resources/res/raw/`, `resources/res/mipmap-*/`.

Sans lui, il n'y a rien à reprendre — et ce document restera l'état des lieux
exact de ce qui a été transmis.
