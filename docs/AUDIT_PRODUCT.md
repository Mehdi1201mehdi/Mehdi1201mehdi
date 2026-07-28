# Audit produit — Coach Perso

Audit **mesuré**, pas déclaratif : hauteurs de page relevées à 390 px avec
Playwright, cibles tactiles et débordements vérifiés de 360 à 1280 px.
Chaque problème est daté de l'état où il a été constaté, avec la correction
appliquée. Les problèmes résolus sont conservés : ils documentent pourquoi
l'interface est ce qu'elle est.

Priorités : **P0** bloquant · **P1** impact UX majeur · **P2** amélioration
importante · **P3** polish.

---

## P0 — Bloquant

| Écran | Problème | Impact utilisateur | Solution |
|---|---|---|---|
| Séance | Reprendre une séance interrompue plantait si le gabarit avait changé entre-temps (exercice ajouté au programme pendant la séance) | Écran mort, séance en cours inaccessible | `reconcilier(live, seance)` dans le moteur + garde-fou dans la carte d'exercice. Résolu |
| Accueil | La séance générée par le moteur ne démarrait pas : `demarrer()` re-rendait la vue courante | Le bouton principal ne faisait rien | Bascule explicite via `nav("train")`. Résolu |

## P1 — Impact UX majeur

| Écran | Problème | Impact utilisateur | Solution |
|---|---|---|---|
| Séance | 4 rangées de boutons secondaires par exercice (Démo, RIR, Douleur, Remplacer, Retirer) | Écran de 3041 px, illisible mains moites | Menu « ⋯ ». Une seule rangée utile reste visible. Résolu |
| Séance | Conseil affiché en pavé de 3 lignes | On ne lit pas un paragraphe entre deux séries | Ligne unique dépliable d'un tap. Résolu |
| Séance | « Dernière fois » répétait la colonne Précédent | Bruit | Supprimé. Résolu |
| Séance | Aucun repère de progression pour la série à venir | L'utilisateur ne sait pas quoi viser | Ligne « objectif : 60 kg × 8–12 ». Résolu |
| Séance | Machine prise = blocage total | Cas le plus fréquent en salle, aucune réponse de l'app | Bouton « Machine occupée » → alternatives classées par compatibilité. Résolu |
| Séance | Fermer le minuteur l'arrêtait | Impossible de saisir la série suivante sans perdre le décompte | Capsule persistante : réduire ≠ arrêter. Résolu |
| Catalogue | 343 exercices rendus d'un coup | Page de 8,3 écrans, DOM lourd | Affichage progressif par 20. Résolu |
| Programme | 23 cartes de programmes empilées | Page de 5,2 écrans | Bibliothèque en feuille avec filtres. Résolu |
| Accueil | Carte musculaire rendue **deux fois** (Accueil + Progrès) | Duplication pure, ~500 px perdus | Retirée de l'Accueil. Résolu |
| Anatoly | Double navigation de semaine (bandeau S1–S8 **et** flèches) | Deux commandes pour la même chose | Flèches supprimées, un jour à la fois. Résolu |
| Progrès | 4906 px, mur de statistiques | Impossible de trouver l'information | Sections repliables, un seul graphique visible. Résolu |
| Accueil | 5 gros boutons de même poids visuel | Aucune action principale identifiable | Un seul CTA dominant. Résolu |

## P2 — Amélioration importante

| Écran | Problème | Impact utilisateur | Solution |
|---|---|---|---|
| Séance | Pas de repère visuel par exercice | Identification lente | Vignette 52 px : silhouette du muscle + icône de matériel, générée localement (hors ligne, instantanée) |
| Séance | Muscles écrits en phrase | Lecture lente | Badges musculaires, principal en accent, un appui explique le rôle |
| État musculaire | Silhouette décorative | On ne pouvait pas interroger un muscle | Silhouette interactive : toucher un muscle ouvre sa fiche |
| Onboarding | 7 étapes avant la première séance | Abandon possible avant même de s'entraîner | Ramené à **5 étapes**. « Priorités & limitations » et « Récupération » gardent des valeurs par défaut prudentes et se règlent dans Profil → « Affiner mon entraînement ». Aucune donnée perdue, demandée au bon moment |
| Catalogue | Filtre par pastilles uniquement | Difficile de chercher « le muscle là » sans connaître son nom | Recherche par silhouette : toucher un muscle filtre la liste (343 → 67 pour les biceps) |
| Catalogue | Bouton « ℹ️ » en bout de ligne | Cible tactile étroite, emoji dans l'iconographie | Ligne entière cliquable (≥ 56 px) |
| Accueil | En-tête de 3 lignes sans information | ~90 px perdus au-dessus du contenu utile | Une ligne + série en pastille |
| Progrès | Carte héro répétant la grille de stats | Redondance | Ligne d'objectif hebdomadaire compacte |

## P3 — Polish

| Écran | Problème | Solution |
|---|---|---|
| Global | Emojis utilisés comme iconographie (🏋️, ℹ️, 🗑️) | Remplacés progressivement par le jeu d'icônes SVG cohérent |
| Séance | Espacements du tableau de séries un peu larges | Resserrés sans réduire les cibles (champs à 48 px) |
| Global | `.empty` générique entrait en collision avec `.cal-cell.empty` | Renommé `.emptystate` |

---

## Résultats mesurés (390 px, hauteur de page)

| Écran | Avant | Après | Gain |
|---|---:|---:|---:|
| Catalogue | 6974 px | 1860 px | −73 % |
| Programme | 4359 px | 1188 px | −73 % |
| Anatoly | 2595 px | 1059 px | −59 % |
| Progrès | 4906 px | 2330 px | −52 % |
| Accueil | 2163 px | 1156 px | −47 % |
| Séance active | 3041 px | ~2000 px | −34 % |
| Profil | 2441 px | 1716 px | −30 % |

## Reste à faire

- **Coach IA** (facultatif, désactivé par défaut) : jamais vérifié en conditions
  réelles, le téléchargement du modèle est bloqué en environnement de
  développement.
- **Apprentissage local** du moteur : ajuster les seuils de récupération selon
  les performances réelles observées. Le paramètre `ressenti` existe déjà mais
  aucun écran ne le renseigne.

---

## Audit d'usage — outil personnel

Grille appliquée : *personal-tool-builder* (dogfooding, « start ugly »,
anti-patterns). Coach Perso est un outil **mono-utilisateur**. Le test n'est
donc pas « est-ce une bonne fonctionnalité » mais « Mehdi s'en sert-il, à quelle
fréquence, et que faisait-il avant à la main ».

**Surface mesurée** : 11 vues, 9 écrans secondaires, 22 modules moteur,
4 443 lignes d'interface, 3 311 lignes de moteur, 12 réglages, 6 calculateurs.

### La boucle quotidienne

Ouvrir → commencer la séance → saisir charge/reps → valider → terminer.
C'est le seul chemin emprunté **chaque jour d'entraînement**. Tout ce qui
l'allonge coûte cher ; tout le reste ne se paie qu'une fois de temps en temps.
Les corrections qui comptent le plus dans cet audit portent toutes sur cette
boucle : menu « ⋯ », capsule de repos, « Machine occupée », pré-remplissage,
démonstration dans la vignette.

### Ce qui gagne sa place

| Fonction | Fréquence réelle | Ce qu'elle remplace |
|---|---|---|
| Saisie de séance | chaque séance | carnet papier / notes |
| Minuteur de repos | chaque série | chronomètre du téléphone |
| Historique et records | chaque séance | rien — impossible à tenir de tête |
| Séance automatique | chaque séance | décider quoi faire en arrivant |
| Machine occupée | souvent, en salle | improviser |
| Démonstration d'exercice | à l'apprentissage | chercher sur YouTube |

### Surface spéculative

À conserver — la règle du projet interdit de retirer une fonction qui marche —
mais à ne pas enrichir davantage sans besoin constaté :

- **Mode débutant / avancé.** Un seul utilisateur, un seul niveau : il choisira
  un mode et ne rouvrira jamais l'autre. Le coût est déjà payé, mais toute
  future option « selon le mode » double le travail pour un seul lecteur.
- **Coach IA local.** Plus gros téléchargement de l'app de deux ordres de
  grandeur, connexion obligatoire au premier usage, **jamais vérifié sur le
  Poco M6**, et il double un assistant déterministe qui, lui, marche hors ligne.
  C'est l'exemple type de la sur-ingénierie d'un outil personnel.
- **6 calculateurs.** Le 1RM sert régulièrement. FC cible, macros par
  morphotype, composition US Navy, durée estimée et test vélo relèvent de la
  curiosité ponctuelle, pas de l'usage hebdomadaire.
- **Filtre « Niveau » de la bibliothèque.** Se règle une fois pour toutes.

### Ce que cet audit NE peut pas mesurer

Le critère central de la grille — « t'en sers-tu vraiment ? » — est le seul
qu'on ne puisse pas évaluer depuis le dépôt. Tous les états de test de ce
projet utilisent un historique **synthétique**. Les priorités ci-dessus restent
donc des hypothèses.

L'app sait déjà produire la réponse : *Profil → Sauvegarde complète (JSON)*
contient l'historique réel. Séances effectivement réalisées, exercices
réellement joués, écrans réellement atteints : c'est ce fichier, et lui seul,
qui doit arbitrer la suite. Tant qu'il n'a pas été relu, toute nouvelle
fonctionnalité est construite pour un utilisateur imaginaire.
