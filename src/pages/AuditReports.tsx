import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  Download,
  Eye,
  Calendar,
  Server,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useHybridServerManagement } from "@/hooks/useHybridServerManagement";

export default function AuditReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("lastScan");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const { auditResults, servers, refreshAuditResults } = useHybridServerManagement();

  useEffect(() => {
    refreshAuditResults();
    const interval = setInterval(refreshAuditResults, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [refreshAuditResults]);

  const filteredReports = auditResults.filter(report => {
    const server = servers.find(s => s.id === report.serverId);
    if (!server) return false;
    
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (server.hostname || server.ip).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || report.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const criticalIssues = auditResults.reduce((sum, report) => 
    sum + report.findings.filter(f => f.severity === 'critical').length, 0
  );

  const avgSecurityScore = auditResults.length > 0 
    ? Math.round(auditResults.reduce((sum, report) => sum + (report.scores?.security || 0), 0) / auditResults.length)
    : 0;

  const compliantServers = auditResults.filter(report => (report.scores?.overall || 0) >= 80).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Audit Reports</h1>
            <p className="text-muted-foreground">
              Übersicht aller Server-Audit-Berichte und Sicherheitsanalysen
            </p>
          </div>
          
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export All Reports
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Server className="h-4 w-4" />
                Total Servers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{auditResults.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Critical Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {criticalIssues}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Avg Security Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {avgSecurityScore}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Compliant Servers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {compliantServers}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Server suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sortieren nach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastScan">Letzter Scan</SelectItem>
                  <SelectItem value="overallScore">Gesamtscore</SelectItem>
                  <SelectItem value="securityScore">Sicherheitsscore</SelectItem>
                  <SelectItem value="serverName">Servername</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                  <SelectItem value="running">Läuft</SelectItem>
                  <SelectItem value="failed">Fehlgeschlagen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Server Audit Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Keine Audit-Berichte verfügbar. Führen Sie einen Server-Audit durch, um Berichte zu sehen.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Server</TableHead>
                    <TableHead>Letzter Scan</TableHead>
                    <TableHead>Gesamtscore</TableHead>
                    <TableHead>Sicherheitsscore</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => {
                    const server = servers.find(s => s.id === report.serverId);
                    const criticalCount = report.findings.filter(f => f.severity === 'critical').length;
                    const highCount = report.findings.filter(f => f.severity === 'high').length;
                    
                    return (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{server?.name || 'Unknown Server'}</div>
                            <div className="text-sm text-muted-foreground">{server?.hostname || server?.ip}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(report.timestamp)}
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className={`font-semibold ${getScoreColor(report.scores?.overall || 0)}`}>
                             {report.scores?.overall || 0}/100
                           </div>
                         </TableCell>
                         <TableCell>
                           <Badge variant={getScoreBadge(report.scores?.security || 0)}>
                             {report.scores?.security || 0}/100
                           </Badge>
                         </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {criticalCount > 0 && (
                              <div className="text-xs text-red-600">
                                {criticalCount} Critical
                              </div>
                            )}
                            {highCount > 0 && (
                              <div className="text-xs text-orange-600">
                                {highCount} High
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {report.findings.length} Total
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {report.status === 'completed' ? 'Abgeschlossen' : 
                             report.status === 'running' ? 'Läuft' : 
                             report.status === 'failed' ? 'Fehlgeschlagen' : report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/server/${report.serverId}/audit`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}