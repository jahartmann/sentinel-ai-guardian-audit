# SecureAI Appliance

Eine KI-gesteuerte Sicherheits-Appliance für Linux-Server mit Ollama-Integration.

## Features

- **Server-Management**: Hinzufügen und Verwalten von Linux-Servern, VMs und Hypervisoren
- **KI-gesteuerte Analyse**: Integration mit lokaler Ollama-Installation für intelligente Sicherheitsanalysen
- **Audit-Berichte**: Detaillierte Sicherheits- und Optimierungsberichte mit PDF-Export
- **Netzwerk-Scanning**: Automatische Erkennung ungewöhnlicher Netzwerk-Ereignisse
- **Dashboard**: Übersichtliche Darstellung aller Sicherheitsmetriken

## Lokale Installation

### Voraussetzungen

- Node.js 18+ 
- npm oder yarn
- Ollama (optional, für KI-Features)

### Schnelle Installation (Empfohlen)

1. Repository klonen:
```bash
git clone <repository-url>
cd secureai-appliance
```

2. Setup-Script ausführen:
```bash
# Linux/Mac
chmod +x setup.sh
./setup.sh

# Windows
setup.bat
```

3. Anwendung starten:
```bash
# Linux/Mac
./start.sh

# Windows
start.bat
```

### Manuelle Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd secureai-appliance
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Entwicklungsserver starten:
```bash
npm run dev
```

4. Build für Produktion:
```bash
npm run build
npm run start
```

### Ollama Setup (Optional)

Für KI-gesteuerte Analysen installieren Sie Ollama:

1. Ollama herunterladen und installieren: https://ollama.ai
2. Modell herunterladen:
```bash
ollama pull llama2
```
3. Ollama starten:
```bash
ollama serve
```
4. In der Anwendung unter Einstellungen → KI die Ollama-Integration konfigurieren

### Konfiguration

Die Anwendung speichert alle Einstellungen lokal im Browser (localStorage):

- **Ollama-Konfiguration**: Server-URL und Modell-Auswahl
- **Server-Verbindungen**: SSH/WinRM-Zugangsdaten
- **Audit-Verlauf**: Scan-Ergebnisse und Berichte

## Verwendung

### Server hinzufügen

1. Auf "Server hinzufügen" klicken
2. Server-Details eingeben (Name, IP, Zugangsdaten)
3. Verbindung testen
4. Server speichern

### Sicherheits-Audit starten

1. Server auswählen
2. "Audit" Button klicken
3. Warten auf Analyse-Ergebnisse
4. Detailbericht anzeigen oder PDF exportieren

### Netzwerk-Scanning

1. "Netzwerk Scan" Button verwenden
2. Ungewöhnliche Ereignisse werden automatisch erkannt
3. Ergebnisse in der Netzwerk-Übersicht einsehen

## Technologie-Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Routing**: React Router
- **UI-Komponenten**: Shadcn/ui, Radix UI
- **Charts**: Recharts
- **PDF-Export**: jsPDF
- **Build-Tool**: Vite

## Entwicklung

### Projektstruktur

```
src/
├── components/         # UI-Komponenten
├── hooks/             # React Hooks
├── pages/             # Seiten-Komponenten  
├── services/          # API-Services
└── lib/               # Utilities
```

### Neue Features hinzufügen

1. Branch erstellen
2. Feature entwickeln
3. Tests hinzufügen
4. Pull Request erstellen

## Deployment

### Statisches Hosting

```bash
npm run build
# dist/ Ordner auf Webserver hochladen
```

### Docker

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
```

### Lokaler Server

```bash
npm run preview
```

## Sicherheit

- Alle Server-Verbindungen werden lokal gespeichert
- Keine Daten werden an externe Services gesendet
- Ollama läuft lokal (keine Cloud-Abhängigkeit)
- HTTPS wird für Produktions-Deployments empfohlen

## API-Endpunkte

Die Anwendung ist vollständig frontend-basiert. Für echte Server-Verbindungen in Produktionsumgebungen sollten entsprechende Backend-APIs implementiert werden.

## Support

Bei Fragen oder Problemen:

1. Issues im GitHub Repository erstellen
2. Dokumentation prüfen
3. Community-Forum nutzen

## Original Lovable Project

Dieses Projekt wurde mit Lovable erstellt:
- **URL**: https://lovable.dev/projects/dedc10ef-45c7-49de-bfa7-9eec4b558c2a

## Lizenz

MIT License - siehe LICENSE Datei für Details.