# start_demo.ps1 (Version pour Windows)

# --- Début du Script de Lancement de la Démo Orion ---

# Nettoyer l'écran pour une meilleure lisibilité
Clear-Host

Write-Host "🚀 Bienvenue dans le lanceur de la démo Orion PDA Nexus !" -ForegroundColor Green
Write-Host "Ce script va installer les dépendances et démarrer le serveur de développement."
Write-Host ""

# --- Étape 1: Vérifier si pnpm est installé ---
Write-Host "Vérification de l'installation de pnpm..."
$pnpmExists = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmExists) {
    Write-Host "------------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "⚠️  pnpm n'a pas été trouvé." -ForegroundColor Yellow
    Write-Host "Veuillez installer pnpm globalement en utilisant npm (qui vient avec Node.js)." -ForegroundColor White
    Write-Host "Exécutez cette commande dans PowerShell, puis relancez ce script :" -ForegroundColor White
    Write-Host ""
    Write-Host "    npm install -g pnpm" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Assurez-vous que Node.js est installé : https://nodejs.org/" -ForegroundColor White
    Write-Host "------------------------------------------------------------------" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit
}
Write-Host "✅ pnpm est installé." -ForegroundColor Green


# --- Étape 2: Installer les dépendances ---
Write-Host "📦 Installation des dépendances avec 'pnpm install'..." -ForegroundColor White
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ L'installation des dépendances a échoué. Veuillez vérifier les erreurs ci-dessus." -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit
}
Write-Host "✅ Dépendances installées avec succès." -ForegroundColor Green


# --- Étape 3: Lancer le serveur de développement Vite ---
Write-Host "🔥 Démarrage du serveur de développement Vite (pnpm dev)..." -ForegroundColor White
# Démarre 'pnpm dev' dans une nouvelle fenêtre PowerShell.
# L'utilisateur devra fermer cette nouvelle fenêtre pour arrêter le serveur.
Start-Process powershell -ArgumentList "-NoExit", "-Command", "pnpm dev"


# --- Étape 4: Attendre que le serveur soit prêt et ouvrir le navigateur ---
$localUrl = "http://localhost:5173" # URL par défaut de Vite, plus fiable que la détection sur PS
Write-Host "Veuillez patienter 5 à 10 secondes le temps que le serveur démarre dans la nouvelle fenêtre..."
Start-Sleep -Seconds 8 # Attente un peu plus longue pour être sûr

Write-Host "🌍 Tentative d'ouverture de '$localUrl' dans Google Chrome..." -ForegroundColor White

# Méthode pour trouver et lancer Chrome sur Windows
$ChromePath = ""
# Chercher dans les emplacements communs
$PossiblePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

foreach ($path in $PossiblePaths) {
    if (Test-Path $path) {
        $ChromePath = $path
        break
    }
}

if ($ChromePath) {
    # Lancer Chrome avec l'URL
    Write-Host "Chrome trouvé à '$ChromePath'. Lancement..."
    Start-Process -FilePath $ChromePath -ArgumentList $localUrl
} else {
    # Fallback: ouvrir avec le navigateur par défaut si Chrome n'est pas trouvé
    Write-Host "Google Chrome non trouvé dans les emplacements standards. Ouverture avec le navigateur par défaut." -ForegroundColor Yellow
    Start-Process $localUrl
}

Write-Host ""
Write-Host "✨ La démo est lancée !" -ForegroundColor Green
Write-Host "Le serveur tourne dans la nouvelle fenêtre PowerShell. Pour l'arrêter, fermez simplement cette autre fenêtre." -ForegroundColor White
Write-Host ""
Read-Host "Appuyez sur Entrée pour fermer cette fenêtre d'instructions."