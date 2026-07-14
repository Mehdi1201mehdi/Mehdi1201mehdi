# Coach Perso IA

Application **personnelle** de coaching sportif intelligent — PWA **local-first**,
utilisable sur téléphone **avec ou sans connexion**, données **stockées sur l'appareil**.

- 🧠 Moteur de programmation **déterministe** (pas d'« IA aléatoire »)
- 📈 **Double progression** avec journal d'audit lisible
- 🔄 **Remplacement** d'exercice par contraintes (matériel, limitations, niveau)
- 🏋️ **Mode séance** : saisie charge/reps/RIR + minuteur de repos
- 📴 **Hors ligne** complet (service worker) + installable sur l'écran d'accueil
- 🔒 100 % local, aucune donnée envoyée à un serveur

## Utiliser l'app

Ouvre le lien **GitHub Pages** du dépôt sur ton téléphone, puis « Ajouter à
l'écran d'accueil ». L'app fonctionne ensuite hors ligne.

## Développement

```bash
npm test        # tests du moteur (Node --test), aucun paquet à installer
```

Aucune étape de build : ce sont des fichiers statiques (ES modules) servis
directement par GitHub Pages.

Voir `docs/ARCHITECTURE.md` pour l'architecture, le modèle de données et le plan
par phases.

> ⚕️ Cette application ne pose aucun diagnostic médical. En cas de douleur,
> blessure ou maladie, demande l'avis d'un professionnel de santé.
