import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServerManagementBackend } from "@/hooks/useServerManagementBackend";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { AddServerDialog } from "@/components/AddServerDialog";
import { EditServerDialog } from "@/components/EditServerDialog";
import { 
  Server, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Plus,
  Wifi,
  Info,
  Edit3,
  Trash2,
  Play,
  FileText,
  Loader2
} from "lucide-react";

const ServerManagement = () => {
  const { 
    servers, 
    loading,
    isScanning,
    addServer,
    removeServer,
    testConnection,
    startDataGathering,
    startAudit,
    refreshServers
  } = useServerManagementBackend();
  
  const { settings } = useSettings();
  const { toast } = useToast();
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshServers();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshServers]);

  const getConnectionStatusIcon = (server: any) => {
    if (server.status === 'connected' || server.status === 'online') {
      return <CheckCircle className="w-4 h-4 text-success" />;
    }
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  const handleGetSystemInfo = async (serverId: string) => {
    try {
      const info = await startDataGathering(serverId);
      setSystemInfo(info);
      setShowSystemInfo(true);
      toast({
        title: "Systeminformationen abgerufen",
        description: "Daten erfolgreich vom Server geladen."
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Systeminformationen konnten nicht abgerufen werden.",
        variant: "destructive"
      });
    }
  };

  const handleStartAudit = async (serverId: string) => {
    if (!settings.ollama.model) {
      toast({
        title: "Kein Modell ausgewählt",
        description: "Bitte wählen Sie ein Ollama-Modell in den Einstellungen aus.",
        variant: "destructive"
      });
      return;
    }

    try {
      await startAudit(serverId, settings.ollama.model);
      toast({
        title: "Audit gestartet",
        description: "Der KI-Audit-Bericht wird erstellt..."
      });
    } catch (error) {
      toast({
        title: "Audit fehlgeschlagen",
        description: "Der Audit-Bericht konnte nicht erstellt werden.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    try {
      await removeServer(serverId);
      toast({
        title: "Server entfernt",
        description: "Server wurde erfolgreich entfernt."
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Server konnte nicht entfernt werden.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Lade Server...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">Server Management</h2>
          {servers.some(s => s.status === 'connected' || s.status === 'online') && (
            <Badge variant="default" className="bg-success text-success-foreground">
              <Wifi className="w-3 h-3 mr-1" />
              Verbunden
            </Badge>
          )}
        </div>
        <AddServerDialog 
          onAddServer={addServer}
          trigger={
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Server hinzufügen
            </Button>
          }
        />
      </div>

      <div className="grid gap-6">
        {servers.length === 0 ? (
          <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
              <Server className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Keine Server konfiguriert</h3>
              <p className="text-muted-foreground text-center mb-6">
                Fügen Sie Ihren ersten Server hinzu, um mit dem Monitoring zu beginnen.
              </p>
              <AddServerDialog 
                onAddServer={addServer}
                trigger={
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Ersten Server hinzufügen
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          servers.map((server) => (
            <Card key={server.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getConnectionStatusIcon(server)}
                      <CardTitle className="text-lg">{server.name}</CardTitle>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <EditServerDialog 
                      server={server}
                      onEditServer={(updatedServer) => {
                        // Aktualisierung erfolgt über refreshServers
                        refreshServers();
                        toast({
                          title: "Server aktualisiert",
                          description: "Server-Einstellungen wurden gespeichert."
                        });
                      }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      }
                    />
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteServer(server.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {server.ip}:{server.port} • {server.username}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(server.id)}
                    disabled={isScanning === server.id}
                  >
                    {isScanning === server.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Verbindung testen
                  </Button>
                  
                  {(server.status === 'connected' || server.status === 'online') && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGetSystemInfo(server.id)}
                        disabled={isScanning === server.id}
                      >
                        {isScanning === server.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Info className="w-4 h-4 mr-2" />
                        )}
                        Systeminformationen
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartAudit(server.id)}
                        disabled={isScanning === server.id || !settings.ollama.model}
                      >
                        {isScanning === server.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Shield className="w-4 h-4 mr-2" />
                        )}
                        Audit-Bericht erstellen
                      </Button>
                    </>
                  )}
                </div>
                
                {!settings.ollama.model && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ⚠️ Kein Ollama-Modell ausgewählt. Bitte konfigurieren Sie ein Modell in den Einstellungen für Audit-Berichte.
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
        
        {/* System Info Modal */}
        {showSystemInfo && systemInfo && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Systeminformationen</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSystemInfo(false)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded overflow-auto max-h-64">
                {JSON.stringify(systemInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ServerManagement;