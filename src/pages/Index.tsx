import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Brain
} from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const mockServers = [
    { name: "prod-web-01", status: "online", security: 85, ip: "192.168.1.10" },
    { name: "db-server-01", status: "warning", security: 72, ip: "192.168.1.20" },
    { name: "backup-vm-01", status: "online", security: 91, ip: "192.168.1.30" },
    { name: "proxy-server", status: "critical", security: 45, ip: "192.168.1.40" },
  ];

  const mockAuditResults = [
    { type: "security", message: "Outdated SSL certificates detected", severity: "high", server: "prod-web-01" },
    { type: "performance", message: "High memory usage detected", severity: "medium", server: "db-server-01" },
    { type: "security", message: "Weak password policies", severity: "critical", server: "proxy-server" },
  ];

  const mockNetworkEvents = [
    { timestamp: "2024-01-15 14:30:25", event: "Unusual port scan detected", source: "192.168.1.100", severity: "medium" },
    { timestamp: "2024-01-15 14:28:12", event: "Failed login attempts", source: "192.168.1.200", severity: "high" },
    { timestamp: "2024-01-15 14:25:45", event: "Suspicious DNS queries", source: "192.168.1.150", severity: "medium" },
  ];

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
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-success border-success">
                <Activity className="w-3 h-3 mr-1" />
                Ollama Connected
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
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
                  <div className="text-2xl font-bold text-success">3/4</div>
                  <p className="text-xs text-muted-foreground">+1 seit letzter Stunde</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sicherheitsscore</CardTitle>
                  <Shield className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">73%</div>
                  <p className="text-xs text-muted-foreground">-5% seit gestern</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktive Threats</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">2</div>
                  <p className="text-xs text-muted-foreground">Kritische Aufmerksamkeit</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">KI-Analysen</CardTitle>
                  <Brain className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">127</div>
                  <p className="text-xs text-muted-foreground">Heute abgeschlossen</p>
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
                  <Button variant="security" className="h-16 flex flex-col items-center justify-center space-y-2">
                    <Eye className="w-6 h-6" />
                    <span>Netzwerk Scan</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
                    <FileText className="w-6 h-6" />
                    <span>Audit Bericht</span>
                  </Button>
                  <Button variant="outline" className="h-16 flex flex-col items-center justify-center space-y-2">
                    <Server className="w-6 h-6" />
                    <span>Server hinzufügen</span>
                  </Button>
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
                  {mockAuditResults.slice(0, 3).map((result, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>{result.message}</span>
                        <Badge className={getSeverityColor(result.severity)}>
                          {result.severity}
                        </Badge>
                      </AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Server Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockServers.map((server, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(server.status)}`} />
                        <span className="font-medium">{server.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{server.security}%</span>
                        <Progress value={server.security} className="w-16" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="servers" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Server-Verbindungen</h2>
              <Button>
                <Server className="w-4 h-4 mr-2" />
                Neuen Server hinzufügen
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockServers.map((server, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {server.name}
                      <Badge className={getStatusColor(server.status)}>
                        {server.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>IP: {server.ip}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Sicherheitsscore</span>
                        <span className="font-medium">{server.security}%</span>
                      </div>
                      <Progress value={server.security} />
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          Logs
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4 mr-1" />
                          Config
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">KI-Audit Berichte</h2>
              <Button>
                <Brain className="w-4 h-4 mr-2" />
                Neue Analyse starten
              </Button>
            </div>

            <div className="space-y-4">
              {mockAuditResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span>{result.message}</span>
                      </span>
                      <Badge className={getSeverityColor(result.severity)}>
                        {result.severity}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Betroffen: {result.server} • Typ: {result.type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2">
                      <Button size="sm">Details anzeigen</Button>
                      <Button size="sm" variant="outline">KI-Empfehlungen</Button>
                      <Button size="sm" variant="outline">Beheben</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Netzwerk-Überwachung</h2>
              <Button>
                <Network className="w-4 h-4 mr-2" />
                Scan starten
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
                  {mockNetworkEvents.map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                          <span className="font-medium">{event.event}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {event.timestamp} • Quelle: {event.source}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Untersuchen
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;