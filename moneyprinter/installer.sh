#!/usr/bin/env bash
# Installe Studio Vidéo dans MoneyPrinterTurbo.
#
# Le moteur monte déjà `resource/public/` à la racine de son serveur HTTP
# (voir app/asgi.py). En y déposant l'app, elle est servie par le moteur
# lui-même : même origine, donc aucun réglage, aucun CORS, et aucun blocage
# de contenu mixte sur le téléphone.
#
# Usage : bash installer.sh /chemin/vers/MoneyPrinterTurbo

set -euo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIBLE="${1:-}"

if [ -z "$CIBLE" ]; then
  echo "Usage : bash installer.sh /chemin/vers/MoneyPrinterTurbo" >&2
  exit 1
fi

if [ ! -f "$CIBLE/app/asgi.py" ]; then
  echo "Erreur : $CIBLE ne ressemble pas à une installation MoneyPrinterTurbo" >&2
  echo "        (app/asgi.py introuvable)." >&2
  exit 1
fi

PUBLIC="$CIBLE/resource/public"
mkdir -p "$PUBLIC"

# Sauvegarde de ce qui existait déjà : on n'écrase rien en silence.
if [ -f "$PUBLIC/index.html" ] && [ ! -f "$PUBLIC/.studio-video" ]; then
  HORODATAGE="$(date +%Y%m%d-%H%M%S)"
  echo "→ resource/public contient déjà un site : sauvegarde dans public.avant-$HORODATAGE"
  cp -r "$PUBLIC" "$CIBLE/resource/public.avant-$HORODATAGE"
fi

echo "→ Copie de l'application vers $PUBLIC"
for element in index.html app.css sw.js manifest.webmanifest src assets; do
  rm -rf "${PUBLIC:?}/$element"
  cp -r "$SOURCE/$element" "$PUBLIC/$element"
done
touch "$PUBLIC/.studio-video"

PORT="8080"
if [ -f "$CIBLE/config.toml" ]; then
  PORT_LU="$(grep -E '^\s*listen_port\s*=' "$CIBLE/config.toml" | head -1 | tr -dc '0-9' || true)"
  [ -n "$PORT_LU" ] && PORT="$PORT_LU"
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[ -z "$IP" ] && IP="$(ipconfig getifaddr en0 2>/dev/null || echo "IP-DE-CET-ORDINATEUR")"

cat <<FIN

Installé.

  1. Démarre le moteur :        cd "$CIBLE" && python main.py
  2. Sur cet ordinateur :       http://127.0.0.1:$PORT/
  3. Sur le téléphone (même Wi-Fi) : http://$IP:$PORT/

Si le téléphone n'arrive pas à ouvrir la page, c'est le pare-feu de
l'ordinateur : autorise le port $PORT en entrée, et vérifie que
listen_host = "0.0.0.0" dans config.toml.

FIN
