# Étude de Hevy 3.2.7 — idées pour Coach Perso

Source : paquet `.apkm` fourni par Mehdi le 9 nov. 2026 (com.hevy 3.2.7).
Méthode : analyse statique seule. Craft Anything (`triage --deep`) identifie le paquet
Android ; le code est un bundle React Native compilé (Hermes v96) que Craft ne décode
pas, donc lecture des libellés et textes d'aide présents dans le bundle. Rien n'a été
exécuté. Aucun code, texte, image ni consigne d'exercice de Hevy n'est repris : seules
les IDÉES de fonctionnement sont notées, puis réalisées avec notre moteur.

| Idée observée dans Hevy | Coach Perso avant | Décision |
|---|---|---|
| Échauffement calculé depuis la charge de travail | moteur présent, visible seulement dans Anatoly | **fait** : menu ⋯ de l'exercice en séance |
| Calcul des disques à charger sur la barre | idem | **fait** : menu ⋯ (exercices à la barre) |
| Séries typées (échauffement, échec, dégressive) | présent (É, D, RP, MAX) | repère É visible aussi hors mode avancé |
| Valeurs de la dernière séance en regard | présent | corrigé : alignement sur les séries de travail |
| Écran allumé pendant la séance | présent | — |
| Note d'exercice rappelée à chaque séance | présent | — |
| Défilement automatique vers l'exercice suivant d'un superset | présent | — |
| Messages de progression (« charge augmentée après objectif atteint ») | présent (conseil de progression) | — |
| Séries par groupe musculaire, principal = 1 / secondaire = ½, comparaison à la période précédente | partiel (équilibre par patron) | à faire (Progrès) |
| Série de semaines consécutives d'entraînement | moteur présent, pas affiché | à faire (Accueil) |
| Dossiers de routines | absent | à faire (Entraînement) |
| Source des « valeurs précédentes » : même routine ou toutes | absent | à évaluer |
| Alerte de record au moment de valider la série | partiel | à faire |
| Widgets d'écran d'accueil, export CSV | absent / JSON | plus tard (APK) |

Non observé : les écrans eux-mêmes (l'application n'a pas été lancée) ; la mise en page
de Hevy n'est donc pas décrite ici.
