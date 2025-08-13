import React, { useEffect, useMemo, useState } from 'react';
import { useServerManagementBackend } from '@/hooks/useServerManagementBackend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Server as ServerIcon,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Trash2,
  Eye,
  Activity,
  HardDrive,
  Network
} from 'lucide-react';
import { AddServerDialog } from './AddServerDialog';
import { SystemInfoDialog } from './SystemInfoDialog';

export function FastServerManagement() {
  const {
    servers,
    auditResults,
    loading,
    addServer,
    removeServer,
    startAudit,
    getSystemInfo,
  } = useServerManagementBackend();

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoData, setInfoData] = useState<any>(null);
  const [infoServerName, setInfoServerName] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getLatestAuditFor = (serverId: string) =>
    [...auditResults]
      .filter(a => a.serverId === serverId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  const handleStartAudit = async (serverId: string) => {
    try {
      await startAudit(serverId);
      toast({ title: 'Audit gestartet', description: 'Audit wurde erfolgreich gestartet.' });
      navigate(`/server/${serverId}/audit`);
    } catch {
      toast({ title: 'Fehler', description: 'Audit konnte nicht gestartet werden.', variant: 'destructive' });
    }
  };

  const handleViewReport = (serverId: string) => navigate(`/server/${serverId}/audit`);

  const handleGetSystemInfo = async (serverId: string, name: string) => {
    try {
      const data = await getSystemInfo(serverId);
      setInfoData(data);
      setInfoServerName(name);
      setInfoOpen(true);
    } catch {
      toast({ title: 'Fehler', description: 'Systeminformationen konnten nicht geladen werden.', variant: 'destructive' });
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    try {
      await removeServer(serverId);
      toast({ title: 'Server entfernt', description: 'Server wurde erfolgreich entfernt.' });
    } catch {
      toast({ title: 'Fehler', description: 'Server konnte nicht entfernt werden.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Server Management</h2>
          <p className="text-muted-foreground">Verwalten Sie Ihre Server und führen Sie Sicherheitsaudits durch</p>
        </div>
        <AddServerDialog
          onAddServer={addServer}
          trigger={
            <Button>
              <ServerIcon className="mr-2 h-4 w-4" />
              Server hinzufügen
            </Button>
          }
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => {
          const latestAudit = getLatestAuditFor(server.id);

          return (
            <Card key={server.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{server.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(server.status)}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant={server.status === 'online' || server.status === 'connected' ? 'default' : 'secondary'}>
                          {server.status}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Status: {server.status}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-1">
                    <Network className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">IP:</span>
                  </div>
                  <span className="font-mono">{server.ip}</span>

                  <div className="flex items-center space-x-1">
                    <HardDrive className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Host:</span>
                  </div>
                  <span className="font-mono text-xs">{server.hostname}</span>
                </div>

                {latestAudit && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Security Score:</span>
                      <span className={`font-bold ${latestAudit.scores.overall >= 80 ? 'text-green-600' : latestAudit.scores.overall >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {latestAudit.scores.overall}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleStartAudit(server.id)} className="flex-1">
                    <PlayCircle className="mr-1 h-3 w-3" />
                    Audit
                  </Button>

                  {latestAudit && (
                    <Button size="sm" variant="outline" onClick={() => handleViewReport(server.id)}>
                      <Eye className="mr-1 h-3 w-3" />
                      Report
                    </Button>
                  )}

                  <Button size="sm" variant="outline" onClick={() => handleGetSystemInfo(server.id, server.name)}>
                    <Activity className="mr-1 h-3 w-3" />
                    Info
                  </Button>
                </div>

                <div className="flex justify-between pt-2 border-t">
                  <div />
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteServer(server.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {servers.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <ServerIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Keine Server vorhanden</h3>
            <p className="text-muted-foreground mb-4">Fügen Sie Ihren ersten Server hinzu, um mit den Sicherheitsaudits zu beginnen.</p>
            <AddServerDialog
              onAddServer={addServer}
              trigger={<Button>Server hinzufügen</Button>}
            />
          </CardContent>
        </Card>
      )}

      <SystemInfoDialog isOpen={infoOpen} onClose={() => setInfoOpen(false)} systemInfo={infoData} serverName={infoServerName} />
    </div>
  );
}
