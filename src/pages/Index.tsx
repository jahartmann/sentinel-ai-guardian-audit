import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AddServerDialog } from "@/components/AddServerDialog";
import { EditServerDialog } from "@/components/EditServerDialog";
import { ConsoleDialog } from "@/components/ConsoleDialog";
import { LogViewerTrigger } from "@/components/LogViewer";
import { SystemLogViewer } from "@/components/SystemLogViewer";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AIConnectionStatus } from "@/components/AIConnectionStatus";
import ServerManagement from "@/components/ServerManagement";
import { OllamaConnection } from "@/components/OllamaConnection";

import { useServerManagementBackend } from "@/hooks/useServerManagementBackend";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Server, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Network, 
  FileText, 
  Cpu, 
  HardDrive,
  Eye,
  Zap,
  Settings,
  Brain,
  Trash2,
  Play,
  Loader2,
  Edit,
  Terminal,
  Database
} from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isNetworkScanning, setIsNetworkScanning] = useState(false);
  const { settings } = useSettings();
  const { 
    servers, 
    auditResults, 
    isScanning,
    addServer,
    removeServer, 
    testConnection, 
    startAudit, 
    startNetworkScan 
  } = useServerManagementBackend();
  const { toast } = useToast();

  const handleNetworkScan = async () => {
    setIsNetworkScanning(true);
    try {
      const result = await startNetworkScan();
      toast({
        title: "Netzwerk-Scan abgeschlossen",
        description: `${result.hosts.length} Hosts gefunden in ${result.scanTime}ms. ${result.hosts.filter(h => h.services.some(s => s.service === 'SSH')).length} SSH-Server entdeckt.`
      });
    } catch (error) {
      toast({
        title: "Scan-Fehler",
        description: error instanceof Error ? error.message : "Netzwerk-Scan konnte nicht abgeschlossen werden.",
        variant: "destructive"
      });
    } finally {
      setIsNetworkScanning(false);
    }
  };

  const handleStartAudit = async (serverId: string) => {
    try {
      await startAudit(serverId);
      toast({
        title: "Audit abgeschlossen",
        description: "Sicherheitsanalyse wurde erfolgreich durchgeführt."
      });
    } catch (error) {
      toast({
        title: "Audit-Fehler",
        description: "Sicherheitsanalyse konnte nicht abgeschlossen werden.",
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
        : "Server ist nicht erreichbar oder Zugangsdaten sind falsch.",
      variant: success ? "default" : "destructive"
    });
  };

  const [networkEvents, setNetworkEvents] = useState<Array<{
    timestamp: string;
    event: string;
    source: string;
    severity: string;
    type: string;
  }>>([]);

  const startNetworkMonitoring = async () => {
    try {
      const networkService = new (await import('@/services/networkService')).NetworkService();
      const traffic = await networkService.monitorRealNetworkTraffic();
      const anomalies = await networkService.detectRealAnomalies(traffic);
      
      const newEvents = anomalies.map(anomaly => ({
        timestamp: new Date(anomaly.timestamp).toLocaleString('de-DE'),
        event: anomaly.description,
        source: 'System Analysis',
        severity: anomaly.severity,
        type: anomaly.type
      }));
      
      setNetworkEvents(prev => [...newEvents, ...prev.slice(0, 10)]);
      
      if (anomalies.length > 0) {
        toast({
          title: "Netzwerk-Anomalien erkannt",
          description: `${anomalies.length} verdächtige Aktivitäten gefunden.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Network monitoring failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-success text-success-foreground";
      case "warning": return "bg-warning text-warning-foreground";
      case "critical": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-warning text-warning-foreground";
      case "medium": return "bg-accent text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">SecureAI Appliance</h1>
              </div>
              <Badge variant="outline" className="text-primary border-primary">
                <Brain className="w-3 h-3 mr-1" />
                KI-gesteuert
              </Badge>
              {/* SSH Connection Status Indicator */}
              {servers.some(s => s.status === 'connected' || s.status === 'online') && (
                <Badge variant="default" className="bg-success text-success-foreground animate-pulse">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  SSH Verbunden
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <LogViewerTrigger />
              <AIConnectionStatus />
              <SettingsDialog />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="servers" className="flex items-center space-x-2">
              <Server className="w-4 h-4" />
              <span>Server</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Audit</span>
            </TabsTrigger>
            <TabsTrigger value="network" className="flex items-center space-x-2">
              <Network className="w-4 h-4" />
              <span>Netzwerk</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>System Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Server Online</CardTitle>
                  <Server className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {servers.filter(s => s.status === 'online').length}/{servers.length}
                  </div>
                  <p className="text-xs text-muted-foreground">Server online</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sicherheitsscore</CardTitle>
                  <Shield className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">
                    {Math.round(servers.reduce((sum, s) => sum + (s.securityScore || 0), 0) / servers.length || 0)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Durchschnittlicher Sicherheitsscore</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktive Threats</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {servers.filter(s => s.status === 'critical').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Kritische Server</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">KI-Analysen</CardTitle>
                  <Brain className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{auditResults.length}</div>
                  <p className="text-xs text-muted-foreground">Audit-Berichte verfügbar</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span>Schnelle Aktionen</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="security" 
                    className="h-16 flex flex-col items-center justify-center space-y-2"
                    onClick={handleNetworkScan}
                    disabled={isNetworkScanning}
                  >
                    {isNetworkScanning ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Eye className="w-6 h-6" />
                    )}
                    <span>{isNetworkScanning ? "Scannt..." : "Netzwerk Scan"}</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-16 flex flex-col items-center justify-center space-y-2"
                    asChild
                  >
                    <Link to="/reports">
                      <FileText className="w-6 h-6" />
                      <span>Audit Berichte</span>
                    </Link>
                  </Button>
                  <AddServerDialog 
                    onAddServer={addServer}
                    onTestConnection={testConnection}
                    trigger={
                      <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
                        <Server className="w-6 h-6" />
                        <span>Server hinzufügen</span>
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Letzte Sicherheitswarnungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {auditResults.slice(0, 3).map((result, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>Audit für {servers.find(s => s.id === result.serverId)?.name} abgeschlossen</span>
                        <Badge className={result.status === 'completed' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}>
                          {result.status === 'completed' ? 'Abgeschlossen' : 'Läuft'}
                        </Badge>
                      </AlertDescription>
                    </Alert>
                  ))}
                  {auditResults.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      Noch keine Audits durchgeführt
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Server Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {servers.map((server) => (
                    <div key={server.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(server.status)}`} />
                        <span className="font-medium">{server.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{server.securityScore || 0}%</span>
                        <Progress value={server.securityScore || 0} className="w-16" />
                      </div>
                    </div>
                  ))}
                  {servers.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      Keine Server konfiguriert
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="servers" className="space-y-6">
            <ServerManagement />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Sicherheits-Audits</h2>
              <Badge variant="outline">
                <Database className="w-4 h-4 mr-1" />
                Backend-Integration
              </Badge>
            </div>

            {/* Ollama Integration */}
            <OllamaConnection />

            {/* Audit Results */}
            <Card>
              <CardHeader>
                <CardTitle>Audit-Berichte</CardTitle>
                <CardDescription>
                  Alle durchgeführten Sicherheitsanalysen im Überblick
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditResults.length > 0 ? (
                  <div className="space-y-4">
                    {auditResults.map((result) => (
                      <div key={result.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{result.serverName}</h4>
                          <Badge variant={result.status === 'completed' ? "default" : "outline"}>
                            {result.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Gesamt:</span>
                            <span className="ml-2 font-medium">{result.scores.overall}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sicherheit:</span>
                            <span className="ml-2 font-medium">{result.scores.security}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Performance:</span>
                            <span className="ml-2 font-medium">{result.scores.performance}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Compliance:</span>
                            <span className="ml-2 font-medium">{result.scores.compliance}%</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {new Date(result.timestamp).toLocaleString('de-DE')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Keine Audits verfügbar</h3>
                    <p className="text-muted-foreground">
                      Führen Sie Ihr erstes Sicherheitsaudit durch, um Berichte zu generieren.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Netzwerk-Überwachung</h2>
              <Button 
                onClick={handleNetworkScan}
                disabled={isNetworkScanning}
              >
                {isNetworkScanning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Network className="w-4 h-4 mr-2" />
                )}
                {isNetworkScanning ? "Scannt..." : "Scan starten"}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Ungewöhnliche Netzwerk-Ereignisse</CardTitle>
                <CardDescription>
                  KI-gesteuerte Anomalie-Erkennung aktiv
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Letztes Update: {new Date().toLocaleString('de-DE')}</span>
                    <Button size="sm" variant="outline" onClick={startNetworkMonitoring}>
                      <Activity className="w-4 h-4 mr-1" />
                      Aktualisieren
                    </Button>
                  </div>
                   {networkEvents.length === 0 ? (
                     <p className="text-muted-foreground text-center py-4">
                       Keine Netzwerk-Ereignisse erfasst. Klicken Sie auf "Aktualisieren" für eine Live-Analyse.
                     </p>
                   ) : (
                     networkEvents.map((event, index) => (
                       <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                         <div className="flex-1">
                           <div className="flex items-center space-x-2">
                             <Badge className={getSeverityColor(event.severity)}>
                               {event.severity}
                             </Badge>
                             <Badge variant="outline" className="text-xs">
                               {event.type}
                             </Badge>
                             <span className="font-medium">{event.event}</span>
                           </div>
                           <div className="text-sm text-muted-foreground mt-1">
                             {event.timestamp} • Quelle: {event.source}
                           </div>
                         </div>
                         <Button size="sm" variant="outline">
                           <Eye className="w-4 h-4 mr-1" />
                           Details
                         </Button>
                       </div>
                     ))
                   )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <SystemLogViewer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
