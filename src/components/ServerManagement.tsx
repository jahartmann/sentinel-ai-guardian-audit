import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useServerManagementBackend, ServerWithKeyStatus } from "@/hooks/useServerManagementBackend";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  Plus, 
  Trash2, 
  TestTube, 
  Key, 
  Copy,
  CheckCircle,
  AlertTriangle,
  Play,
  Download,
  Loader2
} from "lucide-react";

export const ServerManagement = () => {
  const {
    servers,
    isScanning,
    publicKey,
    loading,
    error,
    addServer,
    removeServer,
    testConnection,
    markKeyDeployed,
    startDataGathering
  } = useServerManagementBackend();
  
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerWithKeyStatus | null>(null);
  const [newServer, setNewServer] = useState({
    name: '',
    hostname: '',
    ip: '',
    port: 22,
    username: 'root',
    connectionType: 'key' as 'password' | 'key',
    password: ''
  });

  const handleAddServer = async () => {
    try {
      await addServer(newServer);
      setIsAddDialogOpen(false);
      setNewServer({
        name: '',
        hostname: '',
        ip: '',
        port: 22,
        username: 'root',
        connectionType: 'key',
        password: ''
      });
      toast({
        title: "Server hinzugefügt",
        description: "Server wurde erfolgreich hinzugefügt. Bitte verteilen Sie den SSH-Schlüssel.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Server konnte nicht hinzugefügt werden.",
        variant: "destructive"
      });
    }
  };

  const handleTestConnection = async (serverId: string) => {
    const success = await testConnection(serverId);
    toast({
      title: success ? "Verbindung erfolgreich" : "Verbindung fehlgeschlagen",
      description: success 
        ? "Server ist erreichbar und antwortet." 
        : "Server ist nicht erreichbar. Überprüfen Sie SSH-Schlüssel und Netzwerk.",
      variant: success ? "default" : "destructive"
    });
  };

  const handleDataGathering = async (serverId: string) => {
    try {
      await startDataGathering(serverId);
      toast({
        title: "Datensammlung abgeschlossen",
        description: "System-Daten wurden erfolgreich gesammelt.",
      });
    } catch (error) {
      toast({
        title: "Datensammlung fehlgeschlagen",
        description: "System-Daten konnten nicht gesammelt werden.",
        variant: "destructive"
      });
    }
  };

  const copyPublicKey = () => {
    navigator.clipboard.writeText(publicKey);
    toast({
      title: "SSH-Schlüssel kopiert",
      description: "Der öffentliche SSH-Schlüssel wurde in die Zwischenablage kopiert.",
    });
  };

  const generateSSHCommand = (server: ServerWithKeyStatus) => {
    return `echo "${publicKey}" | ssh ${server.username}@${server.ip} "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-success text-success-foreground";
      case "warning": return "bg-warning text-warning-foreground";
      case "critical": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Lade Server...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Backend-Verbindung fehlgeschlagen: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Server-Verbindungen</h2>
        <div className="flex space-x-2">
          <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Key className="w-4 h-4 mr-2" />
                SSH-Schlüssel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Öffentlicher SSH-Schlüssel</DialogTitle>
                <DialogDescription>
                  Kopieren Sie diesen Schlüssel und fügen Sie ihn zu Ihren Servern hinzu.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Textarea 
                    value={publicKey} 
                    readOnly 
                    className="font-mono text-sm min-h-32"
                    placeholder="SSH-Schlüssel wird geladen..."
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyPublicKey}
                    className="absolute top-2 right-2"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    Verwenden Sie den "Schlüssel verteilen" Button bei jedem Server oder führen Sie manuell den SSH-Befehl aus.
                  </AlertDescription>
                </Alert>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Server hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Server hinzufügen</DialogTitle>
                <DialogDescription>
                  Fügen Sie einen neuen Linux-Server für Sicherheitsaudits hinzu.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Anzeigename</Label>
                    <Input
                      id="name"
                      value={newServer.name}
                      onChange={(e) => setNewServer({...newServer, name: e.target.value})}
                      placeholder="z.B. Proxmox-Server-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hostname">Hostname</Label>
                    <Input
                      id="hostname"
                      value={newServer.hostname}
                      onChange={(e) => setNewServer({...newServer, hostname: e.target.value})}
                      placeholder="z.B. srv01.domain.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ip">IP-Adresse</Label>
                    <Input
                      id="ip"
                      value={newServer.ip}
                      onChange={(e) => setNewServer({...newServer, ip: e.target.value})}
                      placeholder="z.B. 192.168.1.10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">SSH-Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={newServer.port}
                      onChange={(e) => setNewServer({...newServer, port: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Benutzername</Label>
                    <Input
                      id="username"
                      value={newServer.username}
                      onChange={(e) => setNewServer({...newServer, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="connectionType">Authentifizierung</Label>
                    <Select value={newServer.connectionType} onValueChange={(value: 'password' | 'key') => setNewServer({...newServer, connectionType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="key">SSH-Schlüssel (empfohlen)</SelectItem>
                        <SelectItem value="password">Passwort</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {newServer.connectionType === 'password' && (
                  <div>
                    <Label htmlFor="password">Passwort</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newServer.password}
                      onChange={(e) => setNewServer({...newServer, password: e.target.value})}
                    />
                  </div>
                )}
                <Button onClick={handleAddServer} className="w-full">
                  Server hinzufügen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Server List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map((server) => (
          <Card key={server.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {server.name}
                <Badge className={getStatusColor(server.status)}>
                  {server.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {server.username}@{server.ip}:{server.port}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* SSH Key Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">SSH-Schlüssel</span>
                  <Badge variant={server.keyDeployed ? "default" : "outline"}>
                    {server.keyDeployed ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verteilt
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Erforderlich
                      </>
                    )}
                  </Badge>
                </div>

                {/* Security Score */}
                {server.securityScore && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sicherheitsscore</span>
                      <span className="font-medium">{server.securityScore}%</span>
                    </div>
                    <Progress value={server.securityScore} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTestConnection(server.id)}
                    disabled={isScanning === server.id}
                  >
                    {isScanning === server.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                  </Button>

                  {!server.keyDeployed && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Key className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>SSH-Schlüssel für {server.name} verteilen</DialogTitle>
                          <DialogDescription>
                            Führen Sie den folgenden Befehl in Ihrem Terminal aus:
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="relative">
                            <Textarea 
                              value={generateSSHCommand(server)}
                              readOnly 
                              className="font-mono text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigator.clipboard.writeText(generateSSHCommand(server))}
                              className="absolute top-2 right-2"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <Alert>
                            <Key className="h-4 w-4" />
                            <AlertDescription>
                              Nach erfolgreicher Ausführung markieren Sie den Schlüssel als verteilt.
                            </AlertDescription>
                          </Alert>
                          <Button 
                            onClick={() => markKeyDeployed(server.id)}
                            className="w-full"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Schlüssel ist verteilt
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDataGathering(server.id)}
                    disabled={isScanning === server.id || !server.keyDeployed || server.status === 'offline'}
                  >
                    {isScanning === server.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>

                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => removeServer(server.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {servers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Keine Server konfiguriert</h3>
            <p className="text-muted-foreground mb-4">
              Fügen Sie Ihren ersten Server hinzu, um mit Sicherheitsaudits zu beginnen.
            </p>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Ersten Server hinzufügen
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
};