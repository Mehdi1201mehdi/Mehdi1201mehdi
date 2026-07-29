# Matrice des fonctionnalités

Légende : ✅ opérationnel · ⚠️ partiel · ❌ absent · 🔒 volontairement exclu

## Entraînement

| Fonction | État | Où |
|---|---|---|
| Génération automatique de la prochaine séance | ✅ | Accueil |
| État musculaire (18 groupes) | ✅ | Accueil → État musculaire |
| Silhouette interactive (toucher un muscle) | ✅ | État musculaire |
| Justification de la décision du moteur | ✅ | « Pourquoi cette séance ? » |
| Séance active : saisie charge/reps/RIR | ✅ | Séance |
| Objectif de la série à venir | ✅ | Ligne de contexte de l'exercice |
| Performance précédente par série | ✅ | Colonne « Précédent » |
| Minuteur de repos automatique | ✅ | Après validation d'une série |
| Minuteur persistant (capsule) | ✅ | Réduire ≠ arrêter |
| Machine occupée → alternatives | ✅ | Séance |
| Remplacement d'exercice | ✅ | Menu « ⋯ » |
| Mode guidé pas à pas | ✅ | Séance → Mode guidé |
| Échauffement / étirements guidés | ✅ | Aperçu de séance / fin de séance |
| Reprise après fermeture | ✅ | Automatique |
| Signalement de douleur | ✅ | Menu « ⋯ » |
| Supersets, drop sets, rest-pause | ❌ | — |
| Tempo | ⚠️ | Stocké, non éditable |

## Exercices

| Fonction | État | Où |
|---|---|---|
| Catalogue (343 exercices) | ✅ | Profil → Catalogue |
| Recherche et filtres (muscle, matériel) | ✅ | Catalogue |
| Vignette d'identification | ✅ | Séance, alternatives |
| Badges musculaires | ✅ | Séance |
| Fiche : technique, erreurs, sécurité | ✅ | Toucher un exercice |
| Démonstration animée maison | ✅ | Fiche, mode guidé |
| Historique par exercice | ✅ | Fiche → Historique |
| Favoris | ❌ | — |
| Recherche par silhouette | ✅ | Catalogue → « Chercher sur le corps » |

## Programmes

| Fonction | État | Où |
|---|---|---|
| Programme généré depuis le profil | ✅ | Programme |
| 18 programmes prêts à installer | ✅ | Bibliothèque |
| Filtres (objectif, niveau) | ✅ | Bibliothèque |
| Routines personnelles illimitées | ✅ | Programme → Mes routines |
| Programme Anatoly 8 semaines | ✅ | Profil → Anatoly |

## Progression

| Fonction | État | Où |
|---|---|---|
| Volume, séances, durée par période | ✅ | Progrès |
| Graphique par exercice et métrique | ✅ | Progrès |
| Records et 1RM estimé | ✅ | Progrès → Records |
| Détection de record en fin de séance | ✅ | Écran de fin |
| Calendrier d'assiduité | ✅ | Progrès → Régularité |
| Défis et série de jours | ✅ | Progrès |
| Poids et mensurations | ✅ | Progrès |
| Bilan d'ajustement 2 semaines | ✅ | Progrès |

## Nutrition et outils

| Fonction | État | Où |
|---|---|---|
| Besoins caloriques et macros | ✅ | Nutrition |
| Journal alimentaire (OpenFoodFacts) | ✅ | Nutrition |
| Hydratation | ✅ | Nutrition |
| FC cible et zones (Karvonen) | ✅ | Profil → Outils |
| Macros par morphotype | ✅ | Outils |
| Durée de séance estimée | ✅ | Outils |
| Calculateurs de force (7 formules, zones, RPE, barre) | ✅ | Progrès → Calculateurs de force |
| Composition corporelle (US Navy) | ✅ | Outils |
| Test cardio vélo avec historique | ✅ | Outils |

## Options avancées de séance

| Fonction | État | Où |
|---|---|---|
| Mode d'interface débutant / avancé | ✅ | Profil → Mode d'interface |
| Colonne d'effort RIR ou RPE | ✅ | Séance (mode avancé) |
| Drop set / rest-pause (tap sur le n° de série) | ✅ | Séance (mode avancé) |
| Supersets et tri-sets (jusqu'à 4 groupes) | ✅ | Séance → menu de l'exercice |
| Tempo affiché | ✅ | Séance (mode avancé) |
| Calibration apprise de la récupération | ✅ | État musculaire |
| Filtres bibliothèque (objectif, niveau, durée, matériel, fréquence) | ✅ | Programme → Bibliothèque |

## Assistance

| Fonction | État | Où |
|---|---|---|
| Assistant déterministe (questions) | ✅ | Accueil → Coach |
| Coach IA local (Transformers.js) | ⚠️ | Profil, désactivé par défaut, non vérifié sur appareil réel |
| Coach IA distant / abonnement | 🔒 | Hors périmètre du projet |

## Plateforme

| Fonction | État |
|---|---|
| Fonctionnement hors ligne complet | ✅ |
| Installation PWA | ✅ |
| Stockage local (IndexedDB + miroir) | ✅ |
| Sauvegarde / restauration JSON | ✅ |
| Export CSV | ✅ |
| Thèmes clair / sombre / auto | ✅ |
| Aucun serveur, aucun compte | ✅ |
| Synchronisation multi-appareils | 🔒 | 
| Notifications / rappels | ❌ |
