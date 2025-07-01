#!/bin/bash

# --- Début du Script de Lancement de la Démo Orion ---

echo "🚀 Bienvenue dans le lanceur de la démo Orion PDA Nexus !"
echo "Ce script va installer les dépendances et démarrer le serveur de développement."

# Étape 1: Vérifier si pnpm est installé
if ! command -v pnpm &> /dev/null
then
    echo "------------------------------------------------------------------"
    echo "⚠️  pnpm n'a pas été trouvé."
    echo "Veuillez installer pnpm globalement en utilisant npm (qui vient avec Node.js)."
    echo "Exécutez cette commande dans votre terminal, puis relancez ce script :"
    echo ""
    echo "    npm install -g pnpm"
    echo ""
    echo "Assurez-vous que Node.js est installé : https://nodejs.org/"
    echo "------------------------------------------------------------------"
    exit 1
fi

echo "✅ pnpm est installé."

# Étape 2: Installer les dépendances
echo "📦 Installation des dépendances avec 'pnpm install'..."
pnpm install
if [ $? -ne 0 ]; then
    echo "❌ L'installation des dépendances a échoué. Veuillez vérifier les erreurs ci-dessus."
    exit 1
fi
echo "✅ Dépendances installées avec succès."


# Étape 3: Lancer le serveur de développement Vite et capturer l'URL
echo "🔥 Démarrage du serveur de développement Vite (pnpm dev)..."
echo "Veuillez patienter pendant que le serveur démarre."

TEMP_LOG_FILE=$(mktemp)
# Lancer pnpm dev, rediriger stdout et stderr vers le fichier de log, et le mettre en arrière-plan
pnpm dev > "$TEMP_LOG_FILE" 2>&1 &
SERVER_PID=$!

LOCAL_URL=""
echo "Attente de l'URL du serveur..."
# Boucle pour vérifier la présence de l'URL dans le fichier de log
for i in {1..30}; do
    # Vite peut afficher "Local:" ou "Network:". On cherche la ligne commençant par "  > Local:"
    if grep -q "Local:" "$TEMP_LOG_FILE"; then
        # Extraire l'URL avec des outils plus robustes
        LOCAL_URL=$(grep "Local:" "$TEMP_LOG_FILE" | head -n 1 | sed -e 's/.*Local:[^h]*//')
        break
    fi
    sleep 1
done

rm "$TEMP_LOG_FILE"

# Étape 4: Ouvrir l'URL dans Google Chrome
if [ -z "$LOCAL_URL" ]; then
    echo "⚠️ Impossible de détecter l'URL du serveur de développement après 30 secondes."
    # On utilise l'URL par défaut de Vite comme fallback
    LOCAL_URL="http://localhost:5173/"
    echo "Utilisation de l'URL par défaut : $LOCAL_URL"
fi

echo "✅ Serveur prêt. URL : $LOCAL_URL"
echo "🌍 Tentative d'ouverture dans Google Chrome..."

# ---- CORRECTION POUR FORCER L'OUVERTURE DE L'URL ----
# La commande 'open -a "Application"' peut ne pas passer l'argument URL si l'app est déjà ouverte.
# La commande 'open <URL>' utilise le navigateur par défaut.
# La méthode la plus robuste est de spécifier l'exécutable si possible.

OS="`uname`"
case $OS in
  'Linux')
    # Sur Linux, essayer chrome puis xdg-open
    google-chrome "$LOCAL_URL" || xdg-open "$LOCAL_URL"
    ;;
  'Darwin') 
    # Sur macOS, cette commande est plus fiable pour ouvrir une URL dans une app spécifique
    open -na "Google Chrome" --args --new-window "$LOCAL_URL" || open "$LOCAL_URL"
    # -n: Ouvre une nouvelle instance même si l'app est déjà ouverte
    # -a: Spécifie l'application
    # --args: Passe les arguments suivants à l'application
    # --new-window: Argument pour Chrome pour ouvrir dans une nouvelle fenêtre (plus fiable)
    ;;
  *) 
    echo "Système d'exploitation non supporté pour l'ouverture automatique. Veuillez ouvrir manuellement : $LOCAL_URL"
    ;;
esac

echo ""
echo "✨ La démo est lancée ! Le serveur tourne en arrière-plan."
echo "Pour arrêter le serveur, fermez cette fenêtre de terminal ou exécutez :"
echo "    kill $SERVER_PID"
echo ""

# Garder le script en attente
wait $SERVER_PID
