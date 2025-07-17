import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useServerManagement } from "@/hooks/useServerManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Download,
  Server,
  Clock,
  Users,
  Lock,
  HardDrive,
  Network,
  Cpu,
  Database
} from "lucide-react";
import { PDFExport } from "@/components/PDFExport";

// Mock data - in real app would come from API
const mockAuditData = {
  serverId: "srv-001",
  serverName: "Production Web Server",
  hostname: "web-prod-01.company.com",
  ip: "192.168.1.100",
  os: "Ubuntu 22.04 LTS",
  lastScan: "2024-01-15T10:30:00Z",
  overallScore: 76,
  securityScore: 68,
  performanceScore: 84,
  complianceScore: 71,
  vulnerabilities: {
    critical: 2,
    high: 5,
    medium: 12,
    low: 8,
    info: 3
  },
  findings: [
    {
      id: 1,
      title: "SSH Root Login Enabled",
      severity: "critical",
      category: "Security",
      description: "SSH root login is enabled, which poses a significant security risk.",
      recommendation: "Disable SSH root login and use sudo for administrative tasks.",
      status: "open",
      cve: "N/A"
    },
    {
      id: 2,
      title: "Outdated OpenSSL Version",
      severity: "high",
      category: "Security",
      description: "OpenSSL version 1.1.1f is outdated and contains known vulnerabilities.",
      recommendation: "Update OpenSSL to the latest stable version 3.0.x.",
      status: "open",
      cve: "CVE-2023-0464"
    },
    {
      id: 3,
      title: "High Memory Usage",
      severity: "medium",
      category: "Performance",
      description: "Memory usage consistently above 85% may cause performance issues.",
      recommendation: "Consider adding more RAM or optimizing memory-intensive processes.",
      status: "acknowledged"
    }
  ],
  systemInfo: {
    uptime: "45 days, 12 hours",
    loadAverage: "2.34, 2.12, 1.98",
    memoryUsage: "12.8GB / 16GB (80%)",
    diskUsage: "180GB / 500GB (36%)",
    networkConnections: 127,
    runningProcesses: 312
  },
  compliance: {
    cis: 78,
    nist: 72,
    iso27001: 69,
    pci: 81
  }
};

export default function ServerAuditReport() {
  const { serverId } = useParams();
  const [selectedTab, setSelectedTab] = useState("overview");
  const { servers, auditResults } = useServerManagement();
  
  // Get the actual server data
  const server = servers.find(s => s.id === serverId);
  const latestAudit = auditResults.filter(r => r.serverId === serverId).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  // Use actual server data or fallback to mock data
  const auditData = server ? {
    serverId: server.id,
    serverName: server.name,
    hostname: server.hostname,
    ip: server.ip,
    os: server.os || "Unknown OS",
    lastScan: server.lastScan || new Date().toISOString(),
    overallScore: latestAudit?.overallScore || mockAuditData.overallScore,
    securityScore: latestAudit?.securityScore || mockAuditData.securityScore,
    performanceScore: latestAudit?.performanceScore || mockAuditData.performanceScore,
    complianceScore: latestAudit?.complianceScore || mockAuditData.complianceScore,
    vulnerabilities: mockAuditData.vulnerabilities, // Keep mock data for now
    findings: latestAudit?.findings.map(f => ({
      ...f,
      id: parseInt(f.id) || Math.random(),
      status: 'open',
      cve: 'N/A'
    })) || mockAuditData.findings,
    systemInfo: mockAuditData.systemInfo, // Keep mock data for now
    compliance: mockAuditData.compliance // Keep mock data for now
  } : mockAuditData;
  
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
    <div className="min-h-screen bg-gradient-to-br from-background to-background/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Server Audit Report</h1>
            </div>
            <p className="text-muted-foreground">
              {auditData.serverName} • {auditData.hostname}
            </p>
          </div>
          
          <div className="flex gap-2">
            <PDFExport auditData={auditData} />
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Schedule Rescan
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overall Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{auditData.overallScore}/100</div>
              <Progress value={auditData.overallScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Security Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{auditData.securityScore}/100</div>
              <Progress value={auditData.securityScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{auditData.performanceScore}/100</div>
              <Progress value={auditData.performanceScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{auditData.complianceScore}/100</div>
              <Progress value={auditData.complianceScore} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Vulnerability Summary */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Vulnerability Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{auditData.vulnerabilities.critical}</Badge>
                <span className="text-sm text-muted-foreground">Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{auditData.vulnerabilities.high}</Badge>
                <span className="text-sm text-muted-foreground">High</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{auditData.vulnerabilities.medium}</Badge>
                <span className="text-sm text-muted-foreground">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{auditData.vulnerabilities.low}</Badge>
                <span className="text-sm text-muted-foreground">Low</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{auditData.vulnerabilities.info}</Badge>
                <span className="text-sm text-muted-foreground">Info</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Operating System:</span>
                    <span className="font-medium">{auditData.os}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uptime:</span>
                    <span className="font-medium">{auditData.systemInfo.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Load Average:</span>
                    <span className="font-medium">{auditData.systemInfo.loadAverage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Memory Usage:</span>
                    <span className="font-medium">{auditData.systemInfo.memoryUsage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disk Usage:</span>
                    <span className="font-medium">{auditData.systemInfo.diskUsage}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Network & Processes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Connections:</span>
                    <span className="font-medium">{auditData.systemInfo.networkConnections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Running Processes:</span>
                    <span className="font-medium">{auditData.systemInfo.runningProcesses}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Security Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditData.findings.filter(f => f.category === "Security").map((finding) => (
                    <div key={finding.id} className="p-4 border border-border/50 rounded-lg space-y-2">
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
                      <div className="pt-2 border-t border-border/30">
                        <p className="text-sm"><strong>Recommendation:</strong> {finding.recommendation}</p>
                      </div>
                      {finding.cve && finding.cve !== "N/A" && (
                        <div className="text-xs text-muted-foreground">
                          CVE: {finding.cve}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditData.findings.filter(f => f.category === "Performance").map((finding) => (
                    <div key={finding.id} className="p-4 border border-border/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          <h4 className="font-semibold">{finding.title}</h4>
                        </div>
                        <Badge variant={getSeverityColor(finding.severity)}>
                          {finding.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{finding.description}</p>
                      <div className="pt-2 border-t border-border/30">
                        <p className="text-sm"><strong>Recommendation:</strong> {finding.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>CIS Controls</span>
                      <span className="font-semibold">{auditData.compliance.cis}%</span>
                    </div>
                    <Progress value={auditData.compliance.cis} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>NIST Framework</span>
                      <span className="font-semibold">{auditData.compliance.nist}%</span>
                    </div>
                    <Progress value={auditData.compliance.nist} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>ISO 27001</span>
                      <span className="font-semibold">{auditData.compliance.iso27001}%</span>
                    </div>
                    <Progress value={auditData.compliance.iso27001} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>PCI DSS</span>
                      <span className="font-semibold">{auditData.compliance.pci}%</span>
                    </div>
                    <Progress value={auditData.compliance.pci} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Priority Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditData.findings.map((finding) => (
                    <div key={finding.id} className="p-4 border border-border/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{finding.title}</h4>
                        <Badge variant={getSeverityColor(finding.severity)}>
                          {finding.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{finding.recommendation}</p>
                      <div className="text-xs text-muted-foreground">
                        Status: <span className="capitalize">{finding.status || 'open'}</span>
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
}