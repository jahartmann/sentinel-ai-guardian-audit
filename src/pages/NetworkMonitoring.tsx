import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Network, 
  Activity, 
  AlertTriangle, 
  Globe, 
  Shield, 
  Wifi,
  Server,
  Eye,
  TrendingUp
} from 'lucide-react';
import { useServerManagementBackend } from '@/hooks/useServerManagementBackend';
import { backendApi } from '@/services/backendApiService';
import { logger } from '@/services/loggerService';

interface NetworkAnomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  affectedIPs: string[];
  recommendation: string;
}

interface NetworkConnection {
  protocol: string;
  localAddress: string;
  port: string;
  state: string;
  raw: string;
}

export default function NetworkMonitoring() {
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [anomalies, setAnomalies] = useState<NetworkAnomaly[]>([]);
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { servers } = useServerManagementBackend();

  useEffect(() => {
    if (selectedServer) {
      startMonitoring();
    }
  }, [selectedServer]);

  const startMonitoring = async () => {
    if (!selectedServer) return;
    
    setLoading(true);
    setIsMonitoring(true);
    
    try {
      logger.info('network', `🌐 Starting monitoring for server: ${selectedServer}`);
      
      // Start network monitoring
      const monitoringResponse = await backendApi.request('/api/network/start-monitoring', {
        method: 'POST',
        body: JSON.stringify({ serverId: selectedServer })
      });

      if (monitoringResponse.success) {
        const data = monitoringResponse.data as any;
        setConnections(data?.connections?.connections || []);
        setProcesses(data?.processes?.processes || []);
      }

      // Get anomalies
      await refreshAnomalies();
      
      // Get network connections
      await refreshConnections();
      
    } catch (error) {
      logger.error('network', 'Failed to start monitoring', { error });
    } finally {
      setLoading(false);
    }
  };

  const refreshAnomalies = async () => {
    if (!selectedServer) return;
    
    try {
      const response = await backendApi.request(`/api/network/anomalies/${selectedServer}`);
      if (response.success) {
        setAnomalies((response.data as NetworkAnomaly[]) || []);
      }
    } catch (error) {
      logger.error('network', 'Failed to refresh anomalies', { error });
    }
  };

  const refreshConnections = async () => {
    if (!selectedServer) return;
    
    try {
      const response = await backendApi.request(`/api/network/connections/${selectedServer}`);
      if (response.success) {
        const data = response.data as any;
        setConnections(data?.connections || []);
      }
    } catch (error) {
      logger.error('network', 'Failed to refresh connections', { error });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium': return <Shield className="h-4 w-4 text-secondary" />;
      case 'low': return <Eye className="h-4 w-4 text-muted-foreground" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getPortProtocol = (port: string) => {
    const portNum = parseInt(port);
    const commonPorts: Record<number, string> = {
      22: 'SSH',
      80: 'HTTP',
      443: 'HTTPS',
      21: 'FTP',
      25: 'SMTP',
      53: 'DNS',
      110: 'POP3',
      143: 'IMAP',
      993: 'IMAPS',
      995: 'POP3S',
      3306: 'MySQL',
      5432: 'PostgreSQL',
      6379: 'Redis',
      3389: 'RDP'
    };
    
    return commonPorts[portNum] || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Netzwerk-Monitoring</h1>
            </div>
            <p className="text-muted-foreground">
              Überwachen Sie Netzwerkaktivitäten und erkennen Sie Anomalien in Echtzeit
            </p>
          </div>
          
          <div className="flex gap-2 items-center">
            <select 
              value={selectedServer} 
              onChange={(e) => setSelectedServer(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="">Server auswählen</option>
              {servers.map(server => (
                <option key={server.id} value={server.id}>
                  {server.name} ({server.ip})
                </option>
              ))}
            </select>
            
            <Button 
              onClick={startMonitoring} 
              disabled={!selectedServer || loading}
              variant={isMonitoring ? "secondary" : "default"}
            >
              {loading ? (
                <Activity className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              {isMonitoring ? 'Überwachung aktiv' : 'Monitoring starten'}
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Anomalien</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{anomalies.length}</div>
              <div className="text-xs text-muted-foreground">Erkannte Bedrohungen</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Verbindungen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{connections.length}</div>
              <div className="text-xs text-muted-foreground">Aktive Verbindungen</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Prozesse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{processes.length}</div>
              <div className="text-xs text-muted-foreground">Laufende Prozesse</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">
                  {isMonitoring ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="anomalies" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="anomalies">Anomalien</TabsTrigger>
            <TabsTrigger value="connections">Verbindungen</TabsTrigger>
            <TabsTrigger value="processes">Prozesse</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
          </TabsList>

          <TabsContent value="anomalies" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Erkannte Anomalien
                </CardTitle>
              </CardHeader>
              <CardContent>
                {anomalies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Anomalien erkannt</p>
                    <p className="text-sm">Das Netzwerk scheint sicher zu sein</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {anomalies.map((anomaly, index) => (
                      <div key={index} className="p-4 border border-border/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(anomaly.severity)}
                            <h4 className="font-semibold">{anomaly.type}</h4>
                          </div>
                          <Badge variant={getSeverityColor(anomaly.severity)}>
                            {anomaly.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{anomaly.description}</p>
                        <div className="text-xs text-muted-foreground mb-2">
                          Betroffene IPs: {anomaly.affectedIPs.join(', ')}
                        </div>
                        <div className="border-t border-border/30 pt-2">
                          <p className="text-sm"><strong>Empfehlung:</strong> {anomaly.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Netzwerkverbindungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {connections.map((conn, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{conn.protocol}</Badge>
                        <span className="font-mono text-sm">{conn.localAddress}:{conn.port}</span>
                        <span className="text-sm text-muted-foreground">{getPortProtocol(conn.port)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={conn.state === 'LISTEN' ? 'default' : 'secondary'}>
                          {conn.state}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processes" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Laufende Prozesse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {processes.slice(0, 20).map((process, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono">{process.pid}</span>
                        <span className="text-sm">{process.user}</span>
                        <span className="text-sm text-muted-foreground truncate max-w-md">
                          {process.command}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">CPU: {process.cpu}%</span>
                        <span className="text-xs text-muted-foreground">MEM: {process.mem}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Netzwerk-Traffic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Traffic-Analyse wird implementiert</p>
                  <p className="text-sm">Echtzeit-Verkehrsüberwachung kommt bald</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}