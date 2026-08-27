# Studio Vidéo — MoneyPrinterTurbo depuis le téléphone

Application web française qui pilote **MoneyPrinterTurbo** depuis un téléphone :
écrire un script, choisir la voix et les sous-titres, lancer la production, suivre
l'avancement en direct, puis lire, télécharger ou partager la vidéo.

Sans build, sans framework, sans dépendance. Des modules ES natifs, une feuille de
style, un service worker. Les fichiers sont servis tels quels.

---

## Comment c'est fait

Deux morceaux, et il faut les distinguer :

| | Où | Rôle |
|---|---|---|
| **Le moteur** | Un ordinateur (le tien, un NAS, un VPS) | MoneyPrinterTurbo : écrit le script, télécharge les rushes, synthétise la voix, cale les sous-titres, monte la vidéo. C'est lui qui fait tout le travail lourd (ffmpeg, Whisper, MoviePy). |
| **Studio Vidéo** | Le navigateur du téléphone | La télécommande. Elle ne fabrique rien : elle appelle l'API du moteur et affiche le résultat. |

Le téléphone n'a donc **pas** besoin d'être puissant. Il a besoin de **joindre**
l'ordinateur qui héberge le moteur.

---

## 1. Installer le moteur

```bash
git clone https://github.com/harry0703/MoneyPrinterTurbo
cd MoneyPrinterTurbo
cp config.example.toml config.toml
```

Ouvre `config.toml` et renseigne au minimum :

- **un modèle de langage** — section `[app]`, `llm_provider` et la clé associée
  (OpenAI, DeepSeek, Moonshot, Gemini, Ollama en local…) ;
- **une clé de banque vidéo** — `pexels_api_keys` (gratuite, sur pexels.com/api)
  ou `pixabay_api_keys`.

Vérifie aussi ces deux lignes, elles décident si le téléphone pourra se connecter :

```toml
listen_host = "0.0.0.0"   # 127.0.0.1 = accessible seulement depuis l'ordinateur
listen_port = 8080
```

Puis, au choix :

```bash
# Python
pip install -r requirements.txt
python main.py

# ou Docker
docker compose up -d
```

Le moteur écoute alors sur le port 8080. `http://127.0.0.1:8080/docs` affiche sa
documentation d'API : si cette page s'ouvre, le moteur tourne.

> **ffmpeg** doit être installé sur la machine du moteur — c'est lui qui monte.

---

## 2. Installer l'application

Le moteur sert déjà le dossier `resource/public/` à la racine de son serveur HTTP.
On y dépose l'app : elle est alors servie **par le moteur lui-même**, sur la même
origine. Pas de CORS à configurer, pas d'adresse à saisir, pas de blocage de
contenu mixte.

```bash
bash installer.sh /chemin/vers/MoneyPrinterTurbo
```

Le script vérifie la cible, sauvegarde ce qui existait, copie les fichiers et
affiche l'adresse à ouvrir sur le téléphone.

Relance le moteur, et c'est en place.

---

## 3. Ouvrir depuis le téléphone

### Option A — même Wi-Fi (le plus simple)

Sur le téléphone, ouvre `http://ADRESSE-IP-DE-L-ORDINATEUR:8080/`
(par exemple `http://192.168.1.20:8080/`).

Tout fonctionne : écriture, production, suivi, lecture, téléchargement.

**Ce qui ne fonctionne pas en `http://` sur une IP locale** — et c'est le
navigateur qui l'impose, pas l'app : Android considère cette adresse comme non
sécurisée, donc pas d'installation sur l'écran d'accueil, pas de mode hors ligne,
pas de partage natif vers TikTok ou Instagram. Le téléchargement, lui, marche.

### Option B — une vraie adresse HTTPS (recommandé à l'usage)

Avec un tunnel, l'app devient une vraie PWA : installable, et le bouton
**Partager** envoie la vidéo directement dans TikTok, Instagram ou WhatsApp.

```bash
# Cloudflare Tunnel — une URL https publique, temporaire
cloudflared tunnel --url http://localhost:8080

# ou Tailscale — un réseau privé entre tes appareils, avec HTTPS
tailscale serve --bg 8080
```

Ouvre l'adresse `https://…` obtenue sur le téléphone, puis **Menu ▸ Ajouter à
l'écran d'accueil**.

> Une URL Cloudflare publique expose ton moteur à qui a le lien. Si tu l'utilises,
> renseigne `api_key` dans `config.toml` et la même valeur dans **Réglages ▸ Clé
> d'API**.

### Option C — GitHub Pages

Cette app est aussi publiée sur
`https://mehdi1201mehdi.github.io/Mehdi1201mehdi/moneyprinter/`.

Elle y est en HTTPS, donc **elle ne peut appeler qu'un moteur lui aussi en
HTTPS** (option B). Un moteur en `http://192.168.…` sera bloqué par le navigateur
— c'est la règle du contenu mixte. Renseigne l'adresse du tunnel dans
**Réglages ▸ Adresse du serveur**.

---

## 4. S'en servir

**Créer**

1. Écris un sujet en une phrase. *Écrire le script* le fait rédiger par le modèle.
2. Relis, corrige, réécris — le script est modifiable librement.
3. *Trouver les images* déduit les mots-clés qui pilotent la recherche de rushes.
   Ils sont en anglais : les banques vidéo y trouvent beaucoup plus.
4. Les quatre sections *Image*, *Voix*, *Sous-titres*, *Musique* sont repliées et
   mémorisées. Réglées une fois, elles resservent.
5. *Lancer la production*.

**Vidéos**

L'avancement se met à jour tout seul, toutes les trois secondes. Une production
dure de deux à dix minutes selon la longueur et la machine. Elle continue même si
tu fermes l'app : c'est le serveur qui travaille.

**Réglages**

L'adresse du moteur, la clé d'API, la langue, la longueur du script et la consigne
de style. *Tester la connexion* dit immédiatement si le moteur répond.

---

## Détails qui comptent

**La police des sous-titres.** MoneyPrinterTurbo utilise par défaut une police
chinoise (`STHeitiMedium.ttc`) qui rend mal les accents français. L'app propose à
la place Be Vietnam Pro, livrée avec le moteur et correcte en français. C'est le
réglage par défaut.

**Les voix.** Neuf voix francophones Edge TTS : France, Québec, Belgique, Suisse.
Gratuites, aucune clé nécessaire.

**Les clés d'API** se renseignent dans `config.toml`, côté serveur, jamais dans
l'app. Rien de secret n'est stocké sur le téléphone en dehors de la clé d'accès à
ton propre moteur, si tu en configures une.

**Le stockage local** ne contient que tes préférences et le sujet des vidéos
lancées, pour que la liste soit lisible avant que le serveur ait écrit le script.

---

## En cas de pépin

| Symptôme | Cause presque toujours |
|---|---|
| « Serveur injoignable » sur le téléphone, mais l'ordinateur y accède | `listen_host = "127.0.0.1"` dans `config.toml`, ou le pare-feu bloque le port 8080. |
| « Serveur injoignable » depuis GitHub Pages | Contenu mixte : une page HTTPS ne peut pas appeler un moteur HTTP. Passe par un tunnel (option B). |
| Échec pendant *le téléchargement des rushes* | Clé Pexels/Pixabay absente ou invalide dans `config.toml`, ou mots-clés trop exotiques pour la banque d'images. |
| Échec pendant *l'écriture du script* | Le fournisseur de modèle de langage refuse la requête : clé, quota, ou modèle inexistant. |
| Échec pendant *le montage* | ffmpeg absent de la machine du moteur. |
| Pas de bouton **Partager** | Adresse en `http://` : le navigateur réserve le partage natif aux pages sécurisées. Option B. |
| Sous-titres en carrés | Police sans les accents. Choisis Be Vietnam Pro dans *Sous-titres ▸ Police*. |

---

## Pour le développement

```
moneyprinter/
├── index.html              coquille + points d'ancrage
├── app.css                 tokens dans :root, puis composants
├── sw.js                   coquille en cache ; l'API n'est jamais mise en cache
├── manifest.webmanifest
├── installer.sh            copie vers resource/public du moteur
└── src/
    ├── app.js              routage par ancre, onglets
    ├── api.js              le seul endroit qui connaît l'API du moteur
    ├── reglages.js         préférences + catalogues + conversion vers l'API
    ├── journal.js          sujet des tâches, côté téléphone
    ├── dom.js              h(), icônes SVG, composants partagés
    └── vues/               creer.js · videos.js · reglages.js
```

Aucune étape de build : ouvrir `index.html` derrière n'importe quel serveur
statique suffit. Pour travailler sans lancer le vrai moteur, n'importe quel
serveur répondant aux routes `/ping`, `/api/v1/scripts`, `/api/v1/terms`,
`/api/v1/videos`, `/api/v1/tasks` et `/api/v1/musics` fait l'affaire.

**Après un changement d'assets, incrémenter `CACHE` dans `sw.js`** — sinon les
appareils déjà installés gardent l'ancienne version.

### Routes utilisées

| Méthode | Route | Usage |
|---|---|---|
| `GET` | `/ping` | Test de connexion |
| `POST` | `/api/v1/scripts` | Rédaction du script |
| `POST` | `/api/v1/terms` | Mots-clés de recherche de rushes |
| `POST` | `/api/v1/videos` | Lancement d'une production |
| `GET` | `/api/v1/tasks` | Liste et avancement |
| `GET` | `/api/v1/tasks/{id}` | Détail + URL des fichiers produits |
| `DELETE` | `/api/v1/tasks/{id}` | Suppression |
| `GET` | `/api/v1/musics` | Musiques de fond disponibles |

Authentification facultative par en-tête `x-api-key`, si `api_key` est renseigné
côté serveur.
