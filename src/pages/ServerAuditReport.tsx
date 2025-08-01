import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useServerStore } from "@/stores/serverStore";
import { dataService } from "@/services/dataService";
import { MockSystemInfo } from "@/services/mockDataService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  Download,
  RefreshCw,
  Server,
  Shield,
  Activity,
  FileText,
  ArrowLeft
} from "lucide-react";
import { PDFExport } from "@/components/PDFExport";
import { Link } from "react-router-dom";

const ServerAuditReport = () => {
  const { serverId } = useParams<{ serverId: string }>();
  const { servers, auditResults, systemInfoMap } = useServerStore();
  const [systemInfo, setSystemInfo] = useState<MockSystemInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!serverId) return;
      
      setLoading(true);
      try {
        const info = await dataService.getSystemInfo(serverId);
        setSystemInfo(info);
      } catch (error) {
        toast.error("Fehler beim Laden der Systeminformationen");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [serverId]);

  const handleRescan = async () => {
    if (!serverId) return;
    
    setLoading(true);
    try {
      await dataService.startAudit(serverId);
      toast.success("Audit erfolgreich gestartet");
    } catch (error) {
      toast.error("Fehler beim Starten des Audits");
    } finally {
      setLoading(false);
    }
  };

  if (!serverId) {
    return <div>Server ID not found</div>;
  }

  const server = servers.find(s => s.id === serverId);
  const latestAudit = auditResults.find(audit => audit.serverId === serverId);
  const serverSystemInfo = systemInfoMap[serverId] || systemInfo;

  if (!server) {
    return <div>Server not found</div>;
  }

  if (!latestAudit) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6">
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück zum Dashboard
              </Link>
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Keine Audit-Daten verfügbar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Für diesen Server wurden noch keine Audits durchgeführt.
              </p>
              <Button onClick={handleRescan} disabled={loading}>
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                Erstes Audit starten
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const auditData = {
    serverId: server.id,
    serverName: server.name,
    hostname: server.hostname,
    ip: server.ip,
    os: serverSystemInfo?.os || 'Unknown',
    lastScan: latestAudit.timestamp || new Date().toISOString(),
    overallScore: latestAudit.scores?.overall || 0,
    securityScore: latestAudit.scores?.security || 0,
    performanceScore: latestAudit.scores?.performance || 0,
    complianceScore: latestAudit.scores?.compliance || 0,
    vulnerabilities: {
      critical: latestAudit.findings.filter(f => f.severity === 'critical').length,
      high: latestAudit.findings.filter(f => f.severity === 'high').length,
      medium: latestAudit.findings.filter(f => f.severity === 'medium').length,
      low: latestAudit.findings.filter(f => f.severity === 'low').length,
      info: latestAudit.findings.filter(f => f.severity === 'info').length
    },
    findings: latestAudit.findings.map(f => ({
      id: parseInt(f.id) || Math.random(),
      title: f.title,
      severity: f.severity,
      category: f.category,
      description: f.description,
      recommendation: f.recommendation,
      status: 'open',
      cve: f.evidence || 'N/A'
    })),
    systemInfo: {
      uptime: serverSystemInfo?.uptime || 'N/A',
      loadAverage: serverSystemInfo?.loadAverage || 'N/A',
      memoryUsage: `${serverSystemInfo?.memory?.used || 'N/A'} / ${serverSystemInfo?.memory?.total || 'N/A'}`,
      diskUsage: `${serverSystemInfo?.disk?.usage_percent || 0}% (${serverSystemInfo?.disk?.used || 'N/A'} / ${serverSystemInfo?.disk?.total || 'N/A'})`,
      networkConnections: serverSystemInfo?.network?.connections?.length || 0,
      runningProcesses: serverSystemInfo?.processes?.length || 0
    },
    compliance: {
      cis: 75,
      nist: 82,
      iso27001: 68,
      pci: 85
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="h-4 w-4" />;
      case "high": return <AlertTriangle className="h-4 w-4" />;
      case "medium": return <AlertTriangle className="h-4 w-4" />;
      case "low": return <CheckCircle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zum Dashboard
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{server.name}</h1>
              <p className="text-muted-foreground">{server.hostname} ({server.ip})</p>
            </div>
            <div className="flex items-center space-x-4">
              <PDFExport auditData={auditData} />
              <Button variant="outline" onClick={handleRescan} disabled={loading}>
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Rescan
              </Button>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditData.overallScore}/100</div>
              <Progress value={auditData.overallScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditData.securityScore}/100</div>
              <Progress value={auditData.securityScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditData.performanceScore}/100</div>
              <Progress value={auditData.performanceScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditData.complianceScore}/100</div>
              <Progress value={auditData.complianceScore} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* System Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {serverSystemInfo ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">OS:</span>
                        <span className="ml-2 font-medium">{serverSystemInfo.os}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kernel:</span>
                        <span className="ml-2 font-medium">{serverSystemInfo.kernel}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CPU:</span>
                        <span className="ml-2 font-medium">{serverSystemInfo.cpu.model}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Memory:</span>
                        <span className="ml-2 font-medium">{serverSystemInfo.memory.total}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Uptime:</span>
                        <span className="ml-2 font-medium">{serverSystemInfo.uptime}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Load:</span>
                        <span className="ml-2 font-medium">{serverSystemInfo.loadAverage}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      {loading ? "Lädt Systeminformationen..." : "Keine Systeminformationen verfügbar"}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Network & Processes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Network & Processes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {serverSystemInfo ? (
                    <>
                      <div className="space-y-2">
                        <h4 className="font-medium">Active Connections</h4>
                        <div className="text-sm space-y-1">
                          {serverSystemInfo.network.connections.slice(0, 3).map((conn, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{conn.process || 'Unknown'} ({conn.local_address.split(':')[1]})</span>
                              <Badge variant="outline">{conn.state}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Top Processes</h4>
                        <div className="text-sm space-y-1">
                          {serverSystemInfo.processes.slice(0, 3).map((proc, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{proc.name}</span>
                              <span>{proc.cpu}% CPU</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      {loading ? "Lädt Netzwerk-Informationen..." : "Keine Netzwerk-Informationen verfügbar"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditData.findings.filter(f => f.category === "Security").map((finding) => (
                    <div key={finding.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(finding.severity)}
                          <h4 className="font-semibold">{finding.title}</h4>
                        </div>
                        <Badge variant={getSeverityColor(finding.severity)}>
                          {finding.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{finding.description}</p>
                      <div className="pt-2 border-t">
                        <p className="text-sm"><strong>Recommendation:</strong> {finding.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditData.findings.filter(f => f.category === "Performance").map((finding) => (
                    <div key={finding.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          <h4 className="font-semibold">{finding.title}</h4>
                        </div>
                        <Badge variant={getSeverityColor(finding.severity)}>
                          {finding.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{finding.description}</p>
                      <div className="pt-2 border-t">
                        <p className="text-sm"><strong>Recommendation:</strong> {finding.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Priority Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditData.findings.map((finding) => (
                    <div key={finding.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{finding.title}</h4>
                        <Badge variant={getSeverityColor(finding.severity)}>
                          {finding.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{finding.description}</p>
                      <div className="pt-2 border-t">
                        <p className="text-sm"><strong>Recommendation:</strong> {finding.recommendation}</p>
                      </div>
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

export default ServerAuditReport;