import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { backendApi } from "@/services/backendApiService";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  MessageSquare,
  Loader2,
  ExternalLink
} from "lucide-react";

interface OllamaModel {
  name: string;
  size?: number;
  modified?: string;
}

interface OllamaStatus {
  success: boolean;
  status: string;
  url: string;
  models: OllamaModel[];
}

export const OllamaConnection = () => {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [chatTesting, setChatTesting] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [testMessage, setTestMessage] = useState('Erkläre in einem Satz, was ein Sicherheitsaudit ist.');
  const [testResponse, setTestResponse] = useState<string>('');
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await backendApi.getOllamaStatus();
      if (response.success && response.data) {
        setStatus(response.data);
        if (response.data.models.length > 0 && !selectedModel) {
          setSelectedModel(response.data.models[0].name);
        }
      } else {
        setStatus({
          success: false,
          status: response.error || 'Verbindung fehlgeschlagen',
          url: ollamaUrl,
          models: []
        });
      }
    } catch (error) {
      setStatus({
        success: false,
        status: 'Backend-Verbindung fehlgeschlagen',
        url: ollamaUrl,
        models: []
      });
    } finally {
      setLoading(false);
    }
  };

  const testChat = async () => {
    if (!selectedModel || !testMessage.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie ein Modell und geben Sie eine Nachricht ein.",
        variant: "destructive"
      });
      return;
    }

    setChatTesting(true);
    setTestResponse('');
    
    try {
      const response = await backendApi.sendOllamaChat(selectedModel, [
        { role: 'user', content: testMessage }
      ]);

      if (response.success && response.data) {
        setTestResponse(response.data.message.content);
        toast({
          title: "Chat-Test erfolgreich",
          description: "Das KI-Modell antwortet korrekt.",
        });
      } else {
        throw new Error(response.error || 'Chat-Test fehlgeschlagen');
      }
    } catch (error) {
      toast({
        title: "Chat-Test fehlgeschlagen",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    } finally {
      setChatTesting(false);
    }
  };

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="w-5 h-5 animate-spin" />;
    if (status?.success) return <CheckCircle className="w-5 h-5 text-success" />;
    return <AlertTriangle className="w-5 h-5 text-destructive" />;
  };

  const getStatusBadge = () => {
    if (loading) return <Badge variant="outline">Prüfe...</Badge>;
    if (status?.success) return <Badge variant="default">Verbunden</Badge>;
    return <Badge variant="destructive">Getrennt</Badge>;
  };

  const formatModelSize = (size?: number) => {
    if (!size) return '';
    if (size > 1024 * 1024 * 1024) {
      return `${(size / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    }
    if (size > 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    }
    return `${Math.round(size / 1024)}KB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Brain className="w-6 h-6 mr-2 text-primary" />
          Ollama KI-Integration
        </h2>
        <div className="flex space-x-2">
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Konfiguration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ollama-Konfiguration</DialogTitle>
                <DialogDescription>
                  Konfigurieren Sie die Verbindung zu Ihrem Ollama-Server.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ollama-url">Ollama-Server URL</Label>
                  <Input
                    id="ollama-url"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://127.0.0.1:11434"
                  />
                </div>
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    Die Verbindung läuft über das Backend, um CORS-Probleme zu vermeiden.
                  </AlertDescription>
                </Alert>
                <Button onClick={checkStatus} className="w-full">
                  Verbindung testen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={checkStatus} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Status prüfen
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span>Verbindungsstatus</span>
            </div>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            Server: {status?.url || ollamaUrl}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.success ? (
            <div className="space-y-4">
              <p className="text-success">✅ Ollama-Server ist erreichbar und funktionsfähig</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Verfügbare Modelle:</span>
                  <span className="ml-2">{status.models.length}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-2 text-success">{status.status}</span>
                </div>
                <div>
                  <span className="font-medium">Proxy:</span>
                  <span className="ml-2 text-success">Backend</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-destructive">❌ Ollama-Server nicht erreichbar</p>
              <p className="text-sm text-muted-foreground">
                Fehler: {status?.status || 'Unbekannter Fehler'}
              </p>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Stellen Sie sicher, dass Ollama läuft und die URL korrekt ist. 
                  Das Backend fungiert als Proxy, um CORS-Probleme zu vermeiden.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Models Card */}
      {status?.success && status.models.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verfügbare KI-Modelle</CardTitle>
            <CardDescription>
              Wählen Sie ein Modell für Sicherheitsanalysen aus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {status.models.map((model) => (
                  <Card key={model.name} className={`cursor-pointer transition-colors ${
                    selectedModel === model.name ? 'ring-2 ring-primary' : ''
                  }`} onClick={() => setSelectedModel(model.name)}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{model.name.split(':')[0]}</span>
                          <Badge variant="outline">
                            {model.name.split(':')[1] || 'latest'}
                          </Badge>
                        </div>
                        {model.size && (
                          <p className="text-sm text-muted-foreground">
                            Größe: {formatModelSize(model.size)}
                          </p>
                        )}
                        {model.modified && (
                          <p className="text-xs text-muted-foreground">
                            Geändert: {new Date(model.modified).toLocaleDateString('de-DE')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Test Card */}
      {status?.success && selectedModel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              KI-Chat Test
            </CardTitle>
            <CardDescription>
              Testen Sie die Kommunikation mit dem ausgewählten Modell: {selectedModel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-message">Test-Nachricht</Label>
                <Input
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Geben Sie eine Testnachricht ein..."
                />
              </div>
              
              <Button 
                onClick={testChat} 
                disabled={chatTesting || !testMessage.trim()}
                className="w-full"
              >
                {chatTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    KI antwortet...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat testen
                  </>
                )}
              </Button>

              {testResponse && (
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    <strong>KI-Antwort:</strong> {testResponse}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      {!status?.success && (
        <Card>
          <CardHeader>
            <CardTitle>Ollama Setup-Anleitung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">1. Ollama installieren</h4>
                <p className="text-sm text-muted-foreground">
                  Besuchen Sie <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center">
                    ollama.ai <ExternalLink className="w-3 h-3 ml-1" />
                  </a> und installieren Sie Ollama auf Ihrem System.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">2. Modell herunterladen</h4>
                <div className="bg-muted p-3 rounded font-mono text-sm">
                  ollama pull llama3.1:8b
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">3. Ollama starten</h4>
                <div className="bg-muted p-3 rounded font-mono text-sm">
                  ollama serve
                </div>
              </div>

              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  Das Backend fungiert als Proxy für Ollama, um CORS-Probleme zu vermeiden. 
                  Stellen Sie sicher, dass Ollama auf dem Standard-Port 11434 läuft.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};