# Application Android (APK)

## Choix technique

| Option | Verdict | Pourquoi |
|---|---|---|
| PWA installée (« Ajouter à l'écran d'accueil ») | Déjà disponible | Chrome crée une WebAPK quasi native, mais ce n'est pas un fichier APK qu'on garde ou qu'on partage. |
| TWA (Bubblewrap) | Écartée | Exige un fichier `/.well-known/assetlinks.json` à la racine de `mehdi1201mehdi.github.io`, qui appartient à un autre dépôt ; sans lui, une barre d'adresse reste visible. L'app dépendrait aussi du réseau au premier lancement. |
| **Capacitor** | **Retenue** | L'application web est **embarquée dans l'APK** : hors ligne dès l'installation, aucune vérification de domaine. Le site GitHub Pages reste **sans build** : Capacitor ne fait que copier les fichiers. |

## Ce que contient le dépôt

- `capacitor.config.json` — identifiant `fr.coachperso.app`, nom « Coach Perso ».
- `android/` — projet Android natif (Gradle), personnalisé : icône adaptative
  (haltère blanc sur le dégradé de l'app), écran de démarrage sombre, barres
  système à la couleur du fond, permissions vibration / caméra (scanner) /
  notifications, signature de production lue dans l'environnement.
- `scripts/preparer-android.mjs` — copie l'app web dans `www/` (ignoré par Git).
- `src/ui/natif.js` — comble deux manques de la WebView, **uniquement dans l'APK** :
  - **sauvegarde et exports CSV** : une WebView ne sait pas télécharger ; le
    fichier est écrit puis la feuille de partage Android s'ouvre (Drive, Gmail,
    Fichiers…) ;
  - **fin de repos écran verrouillé** : l'API Notification du web n'existe pas
    dans une WebView ; quand l'app passe en arrière-plan pendant un repos, la fin
    est programmée comme **notification Android à l'heure exacte**, annulée au
    retour dans l'app.
- `src/integrations/santeConnect.js` — **Santé Connect (Health Connect), lecture
  seule**, via le plugin `@capgo/capacitor-health` (MPL-2.0). Voir plus bas.
- `privacypolicy.html` — règles de confidentialité, copiées dans l'APK
  (`assets/public/`) : Santé Connect les affiche depuis sa feuille d'autorisation.
- `.github/workflows/android-apk.yml` — compile l'APK sur les serveurs GitHub.

## Santé Connect (lecture seule)

Compte → **Santé Connect**. Rien ne se passe sans geste de l'utilisateur :

| Étape | Ce que fait l'app |
|---|---|
| « Autoriser la lecture » | Ouvre la feuille d'autorisation de Santé Connect pour **6 lectures** : poids, taille, masse grasse, distance, calories actives, séances d'exercice. **Aucune écriture demandée.** |
| « Mes mesures » | Lit la dernière valeur de chaque mesure sur un an (Santé Connect limite à 30 jours avant l'autorisation sans permission d'historique), l'affiche avec sa **date et sa source**. Une valeur aberrante est écartée. |
| « Ajouter » / « Au profil » | **Seul ce bouton enregistre** : un relevé de mensurations (poids ou masse grasse) ou la taille du profil. Une valeur déjà présente le même jour est signalée « déjà enregistré ». |
| « Activités 7 j » | Liste les séances lues (type, durée, distance, calories annoncées par la source). Affichage seulement : rien n'est importé dans l'historique d'entraînement. |
| « Gérer les autorisations » | Ouvre les réglages de Santé Connect pour retirer l'accès. |

Choix techniques :

- **Permissions minimales** : le plugin déclare une quarantaine de permissions de
  santé ; le manifeste de l'app les retire toutes (`tools:node="remove"`) sauf
  `READ_WEIGHT`, `READ_HEIGHT`, `READ_BODY_FAT`, `READ_DISTANCE`,
  `READ_ACTIVE_CALORIES_BURNED`, `READ_EXERCISE`.
- **Pas d'écriture des séances** : le plugin ne sait pas écrire une séance
  d'exercice, et écrire des calories *estimées* (MET) dans Santé Connect
  polluerait les données de santé de l'utilisateur avec des approximations.
- `minSdkVersion` passe de 24 à **26** (Android 8), minimum exigé par la
  bibliothèque Health Connect. Le Poco M6 (Android 13/14) n'est pas concerné.
- Sur le web (GitHub Pages), la carte explique la fonction et ne tente rien.

## Obtenir l'APK

L'environnement où le projet a été préparé n'a pas accès au SDK Android ni à
Gradle (réseau filtré) : **aucun APK n'y a été compilé**. La compilation se fait
sur GitHub, qui dispose de tout le nécessaire :

1. Pousse la branche sur GitHub.
2. Onglet **Actions** → **APK Android** → **Run workflow** (choisis la branche).
3. À la fin du run (≈ 5 à 8 minutes), télécharge l'artefact
   `coach-perso-apk-N` : il contient `coach-perso-debug.apk` et `SHA256SUMS.txt`.

Le workflow relance d'abord les tests unitaires : pas d'APK si un test échoue.

## Installer sur le téléphone

1. Copie `coach-perso-debug.apk` sur le téléphone (ou ouvre-le depuis Drive).
2. Autorise l'installation depuis cette source quand Android le demande.
3. Ouvre Coach Perso.

> L'APK de debug est signé avec une clé de développement : parfait pour un usage
> personnel. Pour le Play Store ou une distribution, utilise l'APK de production.

**Tes données** : l'app Android et le site web ont chacun leur stockage. Pour
passer de l'un à l'autre : Compte → Mes données → *Sauvegarde complète* sur
l'ancien, puis *Restaurer* sur le nouveau.

## APK de production signé (facultatif)

Crée une clé une seule fois (garde-la précieusement, elle signe toutes les mises
à jour) :

```bash
keytool -genkey -v -keystore coach-perso.jks -keyalg RSA -keysize 2048 -validity 10000 -alias coachperso
base64 -w0 coach-perso.jks > coach-perso.jks.b64
```

Puis dans GitHub → Settings → Secrets and variables → Actions, ajoute :
`ANDROID_KEYSTORE_BASE64` (contenu du `.b64`), `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` (`coachperso`), `ANDROID_KEY_PASSWORD`.
Le prochain run produira aussi `coach-perso-release.apk`.

## Développer en local (Android Studio)

```bash
npm install
npm run android:preparer   # copie l'app web + synchronise le projet Android
npm run android:ouvrir     # ouvre Android Studio
```

## Limites connues

- Les démonstrations animées des exercices viennent d'Internet : elles
  s'affichent hors ligne une fois consultées (cache), pas avant.
- Notification exacte de fin de repos : sur Android 14+, l'autorisation
  « Alarmes et rappels » peut être désactivée par défaut ; sans elle, Android
  peut la décaler de quelques minutes. Réglages → Applis → Coach Perso.
- Santé Connect : sur Android 13 et moins, l'application « Santé Connect » doit
  être installée depuis le Play Store ; à partir d'Android 14 elle est intégrée
  au système. Testé sur maquette du plugin dans un navigateur, **pas encore sur
  un téléphone réel**.
- Le coach IA connecté fonctionne dans l'APK comme sur le web (clé personnelle
  ou relais) ; un relais doit autoriser l'origine `https://localhost`
  (déjà prévu dans `server/coach-relais/wrangler.toml`).
