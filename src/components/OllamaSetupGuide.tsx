import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Terminal, Globe, Shield, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

export const OllamaSetupGuide = () => {
  const [activeTab, setActiveTab] = useState<'problem' | 'solution' | 'alternative'>('problem');

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button 
          variant={activeTab === 'problem' ? 'default' : 'outline'}
          onClick={() => setActiveTab('problem')}
          size="sm"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Problem
        </Button>
        <Button 
          variant={activeTab === 'solution' ? 'default' : 'outline'}
          onClick={() => setActiveTab('solution')}
          size="sm"
        >
          <Shield className="w-4 h-4 mr-2" />
          Lösung
        </Button>
        <Button 
          variant={activeTab === 'alternative' ? 'default' : 'outline'}
          onClick={() => setActiveTab('alternative')}
          size="sm"
        >
          <Globe className="w-4 h-4 mr-2" />
          Alternative
        </Button>
      </div>

      {activeTab === 'problem' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              CORS-Problem erkannt
            </CardTitle>
            <CardDescription>
              Browser blockieren direkte Verbindungen zu Ollama aus Sicherheitsgründen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                <strong>Warum passiert das?</strong><br />
                Browser implementieren Same-Origin-Policy (CORS), die verhindert, dass Web-Apps 
                direkt auf localhost-Services wie Ollama zugreifen. Dies ist ein Sicherheitsfeature.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-semibold">Typische Fehlermeldungen:</h4>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm font-mono">
                TypeError: Failed to fetch<br />
                CORS policy: Cross origin requests are only supported for protocol schemes...
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'solution' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              CORS für Ollama aktivieren
            </CardTitle>
            <CardDescription>
              Konfigurieren Sie Ollama um Web-App-Zugriffe zu erlauben
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Badge variant="outline" className="mb-2">Schritt 1</Badge>
                <h4 className="font-semibold mb-2">Ollama mit CORS starten</h4>
                <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-4 h-4" />
                    Terminal / Kommandozeile
                  </div>
                  <div>export OLLAMA_ORIGINS="*"</div>
                  <div>ollama serve</div>
                </div>
              </div>

              <div>
                <Badge variant="outline" className="mb-2">Schritt 2</Badge>
                <h4 className="font-semibold mb-2">Ollama neustarten</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Stoppen Sie Ollama und starten Sie es mit der neuen Konfiguration:
                </p>
                <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm">
                  <div># Ollama stoppen</div>
                  <div>pkill ollama</div>
                  <div className="mt-2"># Mit CORS starten</div>
                  <div>OLLAMA_ORIGINS="*" ollama serve</div>
                </div>
              </div>

              <div>
                <Badge variant="outline" className="mb-2">Schritt 3</Badge>
                <h4 className="font-semibold mb-2">Permanente Konfiguration</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Für permanente Aktivierung in der Umgebungskonfiguration:
                </p>
                <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm">
                  <div># In ~/.bashrc oder ~/.zshrc hinzufügen:</div>
                  <div>export OLLAMA_ORIGINS="*"</div>
                </div>
              </div>
            </div>

            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Sicherheitshinweis:</strong> OLLAMA_ORIGINS="*" erlaubt allen Websites den Zugriff. 
                In Produktionsumgebungen sollten Sie spezifische Domains angeben.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {activeTab === 'alternative' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              Alternative KI-Services
            </CardTitle>
            <CardDescription>
              Nutzen Sie Cloud-basierte KI-APIs ohne CORS-Probleme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">OpenAI API</h4>
                  <Badge variant="secondary">Empfohlen</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Hochqualitative KI-Modelle über Cloud-API. Erfordert API-Schlüssel.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  OpenAI API konfigurieren
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Anthropic Claude</h4>
                  <Badge variant="secondary">Verfügbar</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Sichere und zuverlässige KI für Sicherheitsanalysen.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Claude API konfigurieren
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Eigene API</h4>
                  <Badge variant="outline">Erweitert</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Verwenden Sie Ihre eigene KI-API oder einen Proxy-Server.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Custom API konfigurieren
                </Button>
              </div>
            </div>

            <Alert>
              <Globe className="w-4 h-4" />
              <AlertDescription>
                <strong>Vorteil:</strong> Cloud-APIs haben keine CORS-Beschränkungen und 
                funktionieren sofort nach der Konfiguration des API-Schlüssels.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};