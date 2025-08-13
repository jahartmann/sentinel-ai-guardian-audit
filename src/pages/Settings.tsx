import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, CheckCircle, XCircle, Loader2, Brain, Wifi } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ConnectionStatus } from '@/components/ConnectionStatus';

export default function Settings() {
  const { settings, updateSettings, testBackendConnection } = useSettings();
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    document.title = 'Einstellungen | Backend & KI Modell';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Einstellungen für Backend-URL und KI-Modell-Auswahl mit Live-Status.');
  }, []);

  const handleTest = async () => {
    setStatus('testing');
    const ok = await testBackendConnection();
    setStatus(ok ? 'success' : 'error');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Einstellungen
          </h1>
          <Link to="/">
            <Button variant="outline">Zur Übersicht</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Backend Verbindung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backend-url">Backend URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="backend-url"
                    value={settings.backendUrl}
                    onChange={(e) => updateSettings({ backendUrl: e.target.value })}
                    placeholder="http://localhost:3000"
                  />
                  <Button onClick={handleTest} variant="outline" disabled={status === 'testing'}>
                    {status === 'testing' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : status === 'success' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : status === 'error' ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      'Testen'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Standard: http://localhost:3000 (lokaler Server). Diese URL wird für alle API-Aufrufe verwendet.
                </p>
              </div>

              {status === 'success' && (
                <div className="p-3 border rounded bg-green-50 text-green-800">
                  ✅ Backend erreichbar.
                </div>
              )}
              {status === 'error' && (
                <div className="p-3 border rounded bg-red-50 text-red-800">
                  ❌ Keine Verbindung möglich. Prüfen Sie URL, Port und Firewall.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-4 h-4" /> Live-Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConnectionStatus showDetails />
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-4 h-4" /> KI-Modelle und weitere Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Öffnen Sie die erweiterten Einstellungen, um Ollama und weitere KI-APIs zu konfigurieren.
              </p>
              <SettingsDialog trigger={<Button>KI-Einstellungen öffnen</Button>} />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
