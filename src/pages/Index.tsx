import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FastServerManagement } from '@/components/FastServerManagement';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { AIConnectionStatus } from '@/components/AIConnectionStatus';
import { useServerStore } from '@/stores/serverStore';
import { Link } from 'react-router-dom';

export default function Index() {
  const { 
    servers, auditResults, fastAudits, systemInfoMap, loading, error,
    setServers, setAuditResults, setLoading, setError, addServer, removeServer,
    loadFastData, startFastAudit
  } = useServerStore();

  useEffect(() => {
    loadFastData();
  }, []);

  const recentAudits = fastAudits.slice(0, 5);
  const totalVulnerabilities = fastAudits.reduce((sum, audit) => 
    sum + audit.vulnerabilities.critical + audit.vulnerabilities.high, 0);
  const avgSecurityScore = fastAudits.length > 0 ? 
    Math.round(fastAudits.reduce((sum, audit) => sum + audit.scores.overall, 0) / fastAudits.length) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-muted/20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative container mx-auto px-6 py-24">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              Security <span className="text-primary">Guardian</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Automatisierte Sicherheitsaudits für Ihre Infrastruktur mit KI-gestützter Analyse
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="px-8 py-3">
                Server hinzufügen
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-3">
                Audit starten
              </Button>
              <Link to="/settings">
                <Button size="lg" variant="ghost" className="px-8 py-3">
                  Einstellungen
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Server</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{servers.length}</div>
              <p className="text-xs text-muted-foreground">
                {servers.filter(s => s.status === 'connected').length} aktiv
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sicherheits-Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSecurityScore}%</div>
              <Progress value={avgSecurityScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kritische Findings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalVulnerabilities}</div>
              <p className="text-xs text-muted-foreground">
                Erfordern Aufmerksamkeit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Letzte Audits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fastAudits.length}</div>
              <p className="text-xs text-muted-foreground">
                Heute durchgeführt
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <ConnectionStatus />
          <AIConnectionStatus />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Letzte Audits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAudits.map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium">{audit.serverName}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(audit.timestamp).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <Badge variant={audit.scores.overall >= 80 ? 'default' : 'destructive'}>
                      {audit.scores.overall}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Backend Verbindung</span>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>KI-Analyse Service</span>
                  <Badge variant="default">Bereit</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Audit Engine</span>
                  <Badge variant="default">Aktiv</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Server Management */}
        <div className="bg-muted/30 rounded-lg p-6">
          <FastServerManagement />
        </div>
      </div>
    </div>
  );
}