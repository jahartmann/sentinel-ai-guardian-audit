#!/bin/bash

echo "🔄 SecureAI Appliance - Update System"
echo "=================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git ist nicht installiert. Bitte installieren Sie Git zuerst."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Dies ist kein Git Repository. Bitte verwenden Sie 'git clone' um das Repository zu klonen."
    exit 1
fi

echo "📡 Checking for updates..."

# Fetch latest changes
git fetch origin

# Check if there are updates available
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null || git rev-parse origin/master 2>/dev/null)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Sie verwenden bereits die neueste Version!"
    exit 0
fi

echo "🔄 Updates verfügbar! Lade herunter..."

# Backup current configuration if it exists
if [ -f "src/hooks/useSettings.ts" ]; then
    echo "💾 Sichere aktuelle Konfiguration..."
    cp -r node_modules/.cache/settings-backup.json /tmp/secureai-settings-backup.json 2>/dev/null || true
fi

# Stop the application if it's running
if pgrep -f "npm run dev" > /dev/null; then
    echo "🛑 Stoppe laufende Anwendung..."
    pkill -f "npm run dev"
    sleep 2
fi

# Pull latest changes
git pull origin main || git pull origin master

if [ $? -ne 0 ]; then
    echo "❌ Update fehlgeschlagen. Prüfen Sie manuell auf Konflikte."
    exit 1
fi

echo "📦 Installiere Dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Installation der Dependencies fehlgeschlagen."
    exit 1
fi

# Restore settings backup if it exists
if [ -f "/tmp/secureai-settings-backup.json" ]; then
    echo "🔧 Stelle Konfiguration wieder her..."
    mkdir -p node_modules/.cache
    cp /tmp/secureai-settings-backup.json node_modules/.cache/settings-backup.json 2>/dev/null || true
fi

echo ""
echo "✅ Update erfolgreich abgeschlossen!"
echo "🚀 Starten Sie die Anwendung mit: ./start.sh"
echo ""
echo "📋 Changelog:"
echo "$(git log --oneline -5 HEAD)"
echo ""