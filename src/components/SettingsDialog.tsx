import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Brain, Palette, Globe, Shield, CheckCircle, XCircle, Loader2, Edit3, ChevronDown, Cpu, Plus } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  trigger?: React.ReactNode;
}

export const SettingsDialog = ({ trigger }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [customModelMode, setCustomModelMode] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const { settings, updateSettings, updateOllamaConfig, testOllamaConnection, getAvailableModels } = useSettings();
  const { toast } = useToast();

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    
    try {
      const isConnected = await testOllamaConnection();
      
      if (isConnected) {
        setConnectionStatus('success');
        const models = await getAvailableModels();
        setAvailableModels(models);
        
        toast({
          title: 'Verbindung erfolgreich',
          description: `Ollama Server erreichbar. ${models.length} Modelle verfügbar.`
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: 'Verbindung fehlgeschlagen',
          description: 'Ollama Server ist nicht erreichbar. Prüfen Sie die URL und stellen Sie sicher, dass Ollama läuft.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: 'Verbindungsfehler',
        description: 'Ein Fehler ist beim Testen der Verbindung aufgetreten.',
        variant: 'destructive'
      });
    }
  };

  const handleOllamaUrlChange = (url: string) => {
    updateOllamaConfig({ serverUrl: url });
    setConnectionStatus('idle');
    setAvailableModels([]);
  };

  useEffect(() => {
    if (settings.ollama.enabled && settings.ollama.serverUrl && open) {
      handleTestConnection();
    }
  }, [open, settings.ollama.enabled]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Einstellungen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Einstellungen
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="ollama" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ollama" className="flex items-center gap-1">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Ollama</span>
            </TabsTrigger>
            <TabsTrigger value="ai-models" className="flex items-center gap-1">
              <Cpu className="w-4 h-4" />
              <span className="hidden sm:inline">AI APIs</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-1">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Design</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Sicherheit</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Allgemein</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ollama" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Ollama KI-Integration
                  {settings.ollama.enabled && (
                    <Badge variant={connectionStatus === 'success' ? 'default' : 'secondary'}>
                      {connectionStatus === 'success' ? 'Verbunden' : 'Konfiguriert'}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ollama aktivieren</Label>
                    <p className="text-sm text-muted-foreground">
                      KI-gesteuerte Analyse und Empfehlungen aktivieren
                    </p>
                  </div>
                  <Switch
                    checked={settings.ollama.enabled}
                    onCheckedChange={(enabled) => updateOllamaConfig({ enabled })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="ollama-url">Server URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ollama-url"
                      value={settings.ollama.serverUrl}
                      onChange={(e) => handleOllamaUrlChange(e.target.value)}
                      placeholder="http://localhost:11434"
                      disabled={!settings.ollama.enabled}
                    />
                    <Button
                      onClick={handleTestConnection}
                      disabled={!settings.ollama.enabled || connectionStatus === 'testing'}
                      variant="outline"
                    >
                      {connectionStatus === 'testing' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : connectionStatus === 'success' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : connectionStatus === 'error' ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Standard: http://localhost:11434 (lokale Ollama Installation)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ollama-model">Modell</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomModelMode(!customModelMode)}
                      disabled={!settings.ollama.enabled}
                      className="h-6 px-2 text-xs"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      {customModelMode ? 'Auswahl' : 'Manuell'}
                    </Button>
                  </div>
                  
                  {customModelMode ? (
                    <div className="space-y-2">
                      <Input
                        value={customModel || settings.ollama.model}
                        onChange={(e) => {
                          setCustomModel(e.target.value);
                          updateOllamaConfig({ model: e.target.value });
                        }}
                        placeholder="Modellname eingeben (z.B. llama2, custom-model)"
                        disabled={!settings.ollama.enabled}
                      />
                      <p className="text-xs text-muted-foreground">
                        Geben Sie den exakten Modellnamen ein. Ideal für Load Balancer Setup.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Select
                        value={settings.ollama.model}
                        onValueChange={(model) => updateOllamaConfig({ model })}
                        disabled={!settings.ollama.enabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Modell auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.length > 0 ? (
                            availableModels.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))
                           ) : (
                             <div className="p-2 text-sm text-muted-foreground text-center">
                               Testen Sie die Verbindung, um Modelle zu laden
                             </div>
                           )}
                        </SelectContent>
                      </Select>
                      {availableModels.length === 0 && settings.ollama.enabled && (
                        <p className="text-xs text-muted-foreground">
                          Testen Sie die Verbindung, um verfügbare Modelle zu laden
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {connectionStatus === 'success' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Ollama ist erreichbar und bereit für KI-Analysen
                    </p>
                  </div>
                )}

                {connectionStatus === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      ❌ Verbindung fehlgeschlagen. Stellen Sie sicher, dass:
                    </p>
                    <ul className="text-xs text-red-700 mt-1 ml-4 list-disc">
                      <li>Ollama installiert und gestartet ist</li>
                      <li>Die Server-URL korrekt ist</li>
                      <li>Keine Firewall die Verbindung blockiert</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  KI-Modell Konfiguration
                </CardTitle>
                <CardDescription>
                  Fügen Sie verschiedene KI-APIs hinzu (OpenAI, Anthropic, Custom APIs)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">OpenAI API</span>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Hinzufügen
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Anthropic API</span>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Hinzufügen
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Custom API</span>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Hinzufügen
                    </Button>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 Mit mehreren KI-APIs können Sie verschiedene Modelle für unterschiedliche Analysen nutzen
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Design & Darstellung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(theme: 'light' | 'dark' | 'system') => updateSettings({ theme })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Hell</SelectItem>
                      <SelectItem value="dark">Dunkel</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sprache</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(language: 'de' | 'en') => updateSettings({ language })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sicherheitseinstellungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatische Scans</Label>
                    <p className="text-sm text-muted-foreground">
                      Regelmäßige Sicherheitsscans aktivieren
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoScan}
                    onCheckedChange={(autoScan) => updateSettings({ autoScan })}
                  />
                </div>

                {settings.autoScan && (
                  <div className="space-y-2">
                    <Label>Scan-Intervall (Minuten)</Label>
                    <Input
                      type="number"
                      value={settings.scanInterval}
                      onChange={(e) => updateSettings({ scanInterval: parseInt(e.target.value) || 60 })}
                      min="15"
                      max="1440"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Allgemeine Einstellungen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Weitere allgemeine Einstellungen können hier hinzugefügt werden.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};