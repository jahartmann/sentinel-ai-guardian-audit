# Security Audit Server - Linux Headless

Ein vollständiger lokaler Web-Server für Sicherheitsaudits im Rechenzentrum.

## 🚀 Quick Start

```bash
# Repository klonen
git clone <your-repo>
cd security-audit

# Installation (als root)
sudo chmod +x install.sh
sudo ./install.sh

# Service starten
sudo systemctl start security-audit

# Status prüfen
sudo systemctl status security-audit

# Zugriff über Browser
http://YOUR_SERVER_IP:3000
```

## 📋 Funktionen

### ✅ Vollständige Lokale Lösung
- Keine Cloud-Abhängigkeiten
- Alle Daten bleiben auf Ihrem Server
- Zugriff über IP-Adresse von anderen Systemen

### ✅ Echte SSH-Verbindungen
- Native Node.js SSH-Implementation
- Passwort- und Key-basierte Authentifizierung
- WebSocket-Console für Echtzeit-Befehle
- Automatische Datensammlung wie Ihre Python-App

### ✅ Ollama-Integration
- Lokaler Proxy ohne CORS-Probleme
- Direkte API-Kommunikation
- Unterstützung für alle Ollama-Modelle

### ✅ Produktionsreif
- Systemd-Service
- Automatische Logs
- Firewall-Konfiguration
- Benutzer-Isolation

## 🛠️ Installation

### Voraussetzungen
- Linux Server (Ubuntu, CentOS, RHEL, Fedora)
- Root-Zugriff
- Internetverbindung für Installation

### Automatische Installation
```bash
sudo ./install.sh
```

### Manuelle Installation
```bash
# Node.js installieren (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Benutzer erstellen
sudo useradd --system --create-home audit

# Verzeichnisse erstellen
sudo mkdir -p /opt/security-audit
sudo chown audit:audit /opt/security-audit

# Anwendung kopieren
sudo cp -r * /opt/security-audit/
cd /opt/security-audit

# Dependencies installieren
sudo -u audit npm install

# Service installieren
sudo cp security-audit.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable security-audit
sudo systemctl start security-audit
```

## 🔧 Konfiguration

### Umgebungsvariablen
```bash
# In /etc/systemd/system/security-audit.service
Environment=PORT=3000
Environment=WS_PORT=3001
Environment=DATA_DIR=/opt/security-audit/data
Environment=OLLAMA_URL=http://127.0.0.1:11434
```

### SSH-Schlüssel Setup
```bash
# Öffentlicher Schlüssel anzeigen
sudo cat /opt/security-audit/.ssh/id_rsa.pub

# Auf Zielservern hinzufügen
ssh-copy-id -i /opt/security-audit/.ssh/id_rsa.pub user@target-server
```

### Firewall
```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

## 📊 Datenstrukturen

### Lokale Verzeichnisse
```
/opt/security-audit/
├── data/
│   ├── servers.json           # Server-Konfigurationen
│   ├── audit-results/         # Audit-Berichte
│   └── logs/                  # Anwendungs-Logs
├── .ssh/
│   ├── id_rsa                 # Privater SSH-Schlüssel
│   └── id_rsa.pub             # Öffentlicher SSH-Schlüssel
└── config/
    └── default.json           # Anwendungs-Konfiguration
```

### API-Endpunkte
```
GET  /api/servers              # Server auflisten
POST /api/servers              # Server hinzufügen
POST /api/ssh/connect          # SSH-Verbindung
POST /api/ssh/execute          # Befehl ausführen
POST /api/ssh/gather-data      # Daten sammeln
GET  /api/ollama/status        # Ollama-Status
POST /api/ollama/chat          # AI-Chat
```

### WebSocket-Nachrichten
```javascript
// Verbindung herstellen
{
  "type": "ssh_connect",
  "server": { "id": "...", "ip": "...", ... }
}

// Befehl ausführen
{
  "type": "ssh_command",
  "connectionId": "...",
  "command": "ls -la"
}
```

## 🔍 Betrieb & Wartung

### Service-Management
```bash
# Status prüfen
sudo systemctl status security-audit

# Logs anzeigen
sudo journalctl -u security-audit -f

# Service neu starten
sudo systemctl restart security-audit

# Service stoppen
sudo systemctl stop security-audit
```

### Log-Dateien
```bash
# Anwendungs-Logs
tail -f /opt/security-audit/data/logs/app-$(date +%Y-%m-%d).log

# System-Logs
sudo journalctl -u security-audit --since "1 hour ago"
```

### Updates
```bash
# Code aktualisieren
cd /opt/security-audit
sudo -u audit git pull
sudo -u audit npm install

# Service neu starten
sudo systemctl restart security-audit
```

## 🛡️ Sicherheit

### Benutzer-Isolation
- Läuft unter dedicated `audit` Benutzer
- Keine Root-Rechte zur Laufzeit
- Eingeschränkte Dateisystem-Zugriffe

### Netzwerk-Sicherheit
- Bind nur auf spezifische IPs
- Firewall-Regeln konfiguriert
- SSH-Key-basierte Authentifizierung

### Daten-Schutz
- Alle Daten bleiben lokal
- Verschlüsselte SSH-Verbindungen
- Sichere Speicherung von Credentials

## 🔧 Troubleshooting

### Service startet nicht
```bash
# Logs prüfen
sudo journalctl -u security-audit -n 50

# Konfiguration prüfen
sudo systemctl cat security-audit

# Manuell starten für Debug
cd /opt/security-audit
sudo -u audit node server.js
```

### SSH-Verbindungen fehlschlagen
```bash
# SSH-Schlüssel prüfen
ls -la /opt/security-audit/.ssh/

# Verbindung testen
sudo -u audit ssh -i /opt/security-audit/.ssh/id_rsa user@target-server

# Host-Key akzeptieren
sudo -u audit ssh-keyscan target-server >> /opt/security-audit/.ssh/known_hosts
```

### Ollama-Verbindung fehlschlägt
```bash
# Ollama-Status prüfen
curl http://127.0.0.1:11434/api/tags

# Ollama starten
ollama serve

# URL in Konfiguration prüfen
grep -r OLLAMA_URL /etc/systemd/system/security-audit.service
```

## 📈 Performance-Tuning

### Systemd-Limits anpassen
```ini
# In security-audit.service
[Service]
LimitNOFILE=65536
LimitNPROC=4096
```

### Node.js-Optimierung
```bash
# Mehr Memory für Node.js
Environment=NODE_OPTIONS="--max-old-space-size=4096"
```

## 📞 Support

### Log-Level erhöhen
```javascript
// In server.js
const logger = new Logger('debug'); // statt 'info'
```

### Debug-Modus
```bash
# Mit Debug-Output starten
cd /opt/security-audit
sudo -u audit NODE_ENV=development DEBUG=* node server.js
```

---

**🛡️ Sicher. Lokal. Professionell.**

Alle Daten bleiben in Ihrem Rechenzentrum. Keine externen Dependencies zur Laufzeit.