# Craft Anything — installation, diagnostic et usage réel

## Où et pourquoi

Installé le 7 novembre 2026 dans l'**environnement de travail isolé** (Linux
x86-64) où se trouvent le dépôt Coach Perso et le XAPK FitAI, et non sur le PC
Windows de Mehdi :

- l'accès disponible au PC passe par une machine virtuelle Linux de l'app Claude
  qui ne voit ni les applications ni le Claude Code de Windows ;
- l'environnement isolé remplit toutes les exigences (Rust ≥ 1.97, Claude Code) ;
- la consigne était de ne pas analyser l'APK FitAI sur l'ordinateur principal.

Pour une installation sur Windows : installeur officiel, page *Releases* du dépôt.

## Installation (procédure officielle du README)

| Étape | Résultat |
|---|---|
| `git clone https://github.com/storytold/craft-anything` | commit `1f8508a` |
| Rust requis | **1.97** (`rust-version` du `Cargo.toml`) — présent : rustc 1.97.0 |
| `cargo install --locked --path apps/craft-anything-cli` | compilé en 10 min 05 → `craft-anything-cli 0.4.0` |
| `craft-anything-cli doctor` | **healthy: true** |
| `craft-anything-cli setup --client claude_code --yes` | `[configured] claude_code` + skill installé |
| `claude mcp list` | `craft-anything … ✓ Connected` |
| `doctor` (2ᵉ passage) | `registration:claude_code` : **connecté** ; skill : à jour |

## Diagnostic (`doctor`)

| Élément | État |
|---|---|
| Binaire, serveur MCP (protocole 2025-06-18, 30 outils listés) | ok |
| Claude Code 2.1.319 | installé et connecté à Craft Anything ; **non connecté à un compte** (`claude auth status` : `loggedIn: false`) |
| JADX 1.5.3, Java 21, Chromium, GDB, LLDB, objdump | ok |
| Ghidra, Apktool, adb, Frida, mitmproxy, Vineflower, Rizin, tshark | absents (facultatifs) |
| Backend IA de Craft Anything | aucun (facultatif) |

**Conséquence** : l'étape *Build* de Craft Anything (`rebuild`, qui lance
`claude -p` avec le compte de la personne) ne peut pas tourner ici sans
`claude auth login`, connexion interactive à faire par Mehdi lui-même. La
construction est donc faite directement dans le dépôt Coach Perso par l'agent de
cette session ; Craft Anything sert à **étudier** et **vérifier**.

## Outils réellement utilisés (mode Deep, fichier fourni, usage privé)

| Outil | Sur quoi | Résultat |
|---|---|---|
| `core_target_triage` | XAPK | reconnu comme application Android ; outils recommandés |
| `android_package_show` | APK de base | 2.0.6, SDK 29–37, 34 permissions, 50 composants (13 exportés), 3 DEX, signature v2/v3 **vérifiée** ; classe d'application = enveloppe PairIP |
| `android_classes_find` (`room.tables`) | APK de base | **18 entités** de base de données (sur 14 386 classes) |
| `android_class_show` / `android_method_show` | classe `t01`, méthode `a` | bytecode : `rep / 30,0 + 1,0`, puis `× charge` → **Epley confirmé** |
| `report` | projet `fitai.cany` | rapport et registre de preuves (5 éléments « vus ») |

## Ce qui n'a pas pu servir, et pourquoi

| Besoin | Statut | Raison |
|---|---|---|
| Étude du site fitaiapp.com (captures 3 largeurs) | **impossible ici** | le proxy de l'environnement refuse `fitaiapp.com` |
| Lancer l'app FitAI, voir ses écrans | **impossible** | aucun appareil ni émulateur Android (`adb` absent) |
| Build par Craft Anything | **bloqué** | Claude Code non connecté à un compte |
| Comparaison visuelle FitAI ↔ Coach Perso | **impossible** | pas de captures de FitAI disponibles |
| Outils Android d'exécution (adb, Frida) | non utilisés | pas d'appareil ; exécuter du code inconnu exclu |

Méthodes de remplacement utilisées : androguard et jadx pour le schéma complet et
les formules (`docs/ANALYSE_FITAI_APK_2.0.6.md`) ; tests automatisés et captures
Playwright pour vérifier Coach Perso.

**Rappel** : Clean room n'est pas une isolation de sécurité. Aucun code de
FitAI n'a été exécuté ; la protection PairIP n'a pas été contournée ; les
données chiffrées n'ont pas été déchiffrées.
