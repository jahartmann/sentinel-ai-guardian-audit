import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ExternalLink,
  Zap,
  Code,
  Database,
  Globe,
  Activity
} from "lucide-react";

interface OllamaModel {
  name: string;
  model: string;
  size?: number;
  modified_at?: string;
  details?: any;
}

interface OllamaStatus {
  success: boolean;
  status: string;
  url: string;
  models: OllamaModel[];
}

interface OllamaVersion {
  success: boolean;
  version: string;
}

export const OllamaConnection = () => {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [version, setVersion] = useState<OllamaVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [chatTesting, setChatTesting] = useState(false);
  const [generateTesting, setGenerateTesting] = useState(false);
  const [embeddingTesting, setEmbeddingTesting] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [testMessage, setTestMessage] = useState('Erkläre in einem Satz, was ein Sicherheitsaudit ist.');
  const [generatePrompt, setGeneratePrompt] = useState('Schreibe einen kurzen Text über IT-Sicherheit.');
  const [embeddingText, setEmbeddingText] = useState('Beispieltext für Embeddings');
  const [testResponse, setTestResponse] = useState<string>('');
  const [generateResponse, setGenerateResponse] = useState<string>('');
  const [embeddingResult, setEmbeddingResult] = useState<number[]>([]);
  const [ollamaUrl, setOllamaUrl] = useState('http://192.168.0.48/api');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
    checkVersion();
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

  const checkVersion = async () => {
    try {
      const response = await backendApi.getOllamaVersion();
      if (response.success && response.data) {
        setVersion(response.data);
      }
    } catch (error) {
      console.error('Version check failed:', error);
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
          description: `Antwort in ${response.data.eval_count || 0} Tokens generiert.`,
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

  const testGenerate = async () => {
    if (!selectedModel || !generatePrompt.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie ein Modell und geben Sie einen Prompt ein.",
        variant: "destructive"
      });
      return;
    }

    setGenerateTesting(true);
    setGenerateResponse('');
    
    try {
      const response = await backendApi.generateResponse(selectedModel, generatePrompt);

      if (response.success && response.data) {
        setGenerateResponse(response.data.response);
        toast({
          title: "Text-Generierung erfolgreich",
          description: `Antwort in ${response.data.eval_count || 0} Tokens generiert.`,
        });
      } else {
        throw new Error(response.error || 'Text-Generierung fehlgeschlagen');
      }
    } catch (error) {
      toast({
        title: "Text-Generierung fehlgeschlagen",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    } finally {
      setGenerateTesting(false);
    }
  };

  const testEmbeddings = async () => {
    if (!selectedModel || !embeddingText.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie ein Modell und geben Sie Text ein.",
        variant: "destructive"
      });
      return;
    }

    setEmbeddingTesting(true);
    setEmbeddingResult([]);
    
    try {
      const response = await backendApi.generateEmbeddings(selectedModel, embeddingText);

      if (response.success && response.data) {
        setEmbeddingResult(response.data.embedding);
        toast({
          title: "Embeddings erfolgreich generiert",
          description: `${response.data.embedding.length} Dimensionen erstellt.`,
        });
      } else {
        throw new Error(response.error || 'Embedding-Generierung fehlgeschlagen');
      }
    } catch (error) {
      toast({
        title: "Embedding-Generierung fehlgeschlagen",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    } finally {
      setEmbeddingTesting(false);
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
                    placeholder="http://192.168.0.48/api"
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
            {version && <span className="ml-4">Version: {version.version}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.success ? (
            <div className="space-y-4">
              <p className="text-success">✅ Ollama-Server ist erreichbar und funktionsfähig</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
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
                {version && (
                  <div>
                    <span className="font-medium">Version:</span>
                    <span className="ml-2">{version.version}</span>
                  </div>
                )}
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

      {status?.success && (
        <Tabs defaultValue="testing" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="testing">API-Tests</TabsTrigger>
          </TabsList>
          
          <TabsContent value="testing" className="space-y-6">
            {/* Model Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Modell-Auswahl</CardTitle>
                <CardDescription>
                  Wählen Sie ein Modell für die API-Tests aus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="model-select">Aktives Modell</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Modell auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {status.models.map((model) => (
                          <SelectItem key={model.name} value={model.name}>
                            <div className="flex items-center justify-between w-full">
                              <span>{model.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatModelSize(model.size)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedModel && (
                    <Alert>
                      <Brain className="h-4 w-4" />
                      <AlertDescription>
                        Ausgewähltes Modell: <strong>{selectedModel}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* API Tests */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chat API Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Chat API
                  </CardTitle>
                  <CardDescription>
                    Test der /api/chat Schnittstelle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="chat-message">Nachricht</Label>
                      <Textarea
                        id="chat-message"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="Geben Sie eine Testnachricht ein..."
                        rows={3}
                      />
                    </div>
                    
                    <Button 
                      onClick={testChat} 
                      disabled={chatTesting || !testMessage.trim() || !selectedModel}
                      className="w-full"
                    >
                      {chatTesting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Teste...
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
                          <strong>Antwort:</strong> {testResponse}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Generate API Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Generate API
                  </CardTitle>
                  <CardDescription>
                    Test der /api/generate Schnittstelle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="generate-prompt">Prompt</Label>
                      <Textarea
                        id="generate-prompt"
                        value={generatePrompt}
                        onChange={(e) => setGeneratePrompt(e.target.value)}
                        placeholder="Geben Sie einen Prompt ein..."
                        rows={3}
                      />
                    </div>
                    
                    <Button 
                      onClick={testGenerate} 
                      disabled={generateTesting || !generatePrompt.trim() || !selectedModel}
                      className="w-full"
                    >
                      {generateTesting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generiere...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Generieren
                        </>
                      )}
                    </Button>

                    {generateResponse && (
                      <Alert>
                        <Brain className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Generiert:</strong> {generateResponse}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Embeddings API Test */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="w-5 h-5 mr-2" />
                    Embeddings API
                  </CardTitle>
                  <CardDescription>
                    Test der /api/embeddings Schnittstelle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="embedding-text">Text</Label>
                      <Textarea
                        id="embedding-text"
                        value={embeddingText}
                        onChange={(e) => setEmbeddingText(e.target.value)}
                        placeholder="Text für Embeddings..."
                        rows={3}
                      />
                    </div>
                    
                    <Button 
                      onClick={testEmbeddings} 
                      disabled={embeddingTesting || !embeddingText.trim() || !selectedModel}
                      className="w-full"
                    >
                      {embeddingTesting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Erstelle...
                        </>
                      ) : (
                        <>
                          <Code className="w-4 h-4 mr-2" />
                          Embeddings
                        </>
                      )}
                    </Button>

                    {embeddingResult.length > 0 && (
                      <Alert>
                        <Code className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Embeddings:</strong> {embeddingResult.length} Dimensionen
                          <br />
                          <span className="text-xs font-mono">
                            [{embeddingResult.slice(0, 5).map(n => n.toFixed(3)).join(', ')}...]
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
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
                <h4 className="font-medium">2. Modelle herunterladen</h4>
                <div className="space-y-2">
                  <div className="bg-muted p-3 rounded font-mono text-sm">
                    ollama pull llama3.1:8b
                  </div>
                  <div className="bg-muted p-3 rounded font-mono text-sm">
                    ollama pull gemma2:9b
                  </div>
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