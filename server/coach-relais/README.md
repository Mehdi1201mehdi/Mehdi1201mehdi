# Relais sécurisé du coach IA

Coach Perso est un site statique (GitHub Pages) : tout ce qui est dans le dépôt
est public. **Une clé d'API ne doit donc jamais être dans le code de l'app.**
Ce relais est un petit serveur (Cloudflare Worker, offre gratuite suffisante pour
un usage personnel) qui garde la clé Claude dans une variable d'environnement
chiffrée et transmet la conversation.

```
Téléphone ──(conversation + jeton)──▶ Relais Cloudflare ──(+ clé secrète)──▶ API Claude
```

Ce qu'il fait : contrôle de l'origine (seuls ton site et ton app Android sont
acceptés), jeton d'accès, bornes sur la taille des requêtes et la longueur des
réponses, choix du modèle côté serveur. Ce qu'il ne fait pas : il ne stocke
rien (aucune base, aucun journal de conversation).

## Déployer (≈ 10 minutes)

Prérequis : un compte Cloudflare gratuit et Node.js installé.

```bash
cd server/coach-relais
npx wrangler login                      # ouvre le navigateur, une seule fois
npx wrangler secret put ANTHROPIC_API_KEY   # colle ta clé sk-ant-…
npx wrangler secret put JETON_ACCES         # invente un long mot de passe
npx wrangler deploy
```

`wrangler deploy` affiche l'adresse du relais, du type
`https://coach-perso-relais.<ton-compte>.workers.dev`.

Dans l'application : **Compte → Coach → Relais sécurisé**, colle l'adresse et
le jeton d'accès, enregistre. Le coach passe alors par ton serveur.

## Réglages

Dans `wrangler.toml` :

| Variable | Rôle |
|---|---|
| `ORIGINES` | Origines autorisées, séparées par des virgules. Ajoute ton domaine si tu changes d'hébergement. |
| `MODELE` | Modèle Claude utilisé. `claude-haiku-5-5` est rapide et économique ; `claude-sonnet-5-5` répond mieux aux demandes de programmes complets. |
| `MAX_TOKENS` | Longueur maximale d'une réponse (défaut 1 600). |

## Sécurité — à faire absolument

1. **Fixe une limite de dépense mensuelle** dans la console Anthropic
   (Settings → Limits). C'est la seule protection absolue.
2. Garde `JETON_ACCES` défini : sans lui, quiconque trouve l'adresse du relais
   peut l'utiliser.
3. En cas de doute, change le jeton (`wrangler secret put JETON_ACCES`) puis
   ressaisis-le dans l'app.

## Tester en local

```bash
npx wrangler dev        # relais sur http://localhost:8787
```

Dans l'app, l'adresse `http://localhost:8787` est acceptée (HTTP n'est autorisé
qu'en local).

Les tests automatiques du relais sont dans `tests/coachRelais.test.js`
(`npm test` à la racine du projet).
