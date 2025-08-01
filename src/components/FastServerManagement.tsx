import React, { useState } from 'react';
import { useServerStore } from '@/stores/serverStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  PlayCircle, 
  Trash2, 
  Edit, 
  Eye,
  Activity,
  HardDrive,
  Network
} from 'lucide-react';
import { AddServerDialog } from './AddServerDialog';
import { EditServerDialog } from './EditServerDialog';
import { SystemInfoDialog } from './SystemInfoDialog';

export function FastServerManagement() {
  const { 
    servers, 
    fastAudits, 
    systemInfoMap, 
    loading, 
    addServer, 
    removeServer, 
    startFastAudit,
    getFastAudit
  } = useServerStore();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<any>(null);
  const [selectedSystemInfo, setSelectedSystemInfo] = useState<any>(null);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'scanning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleStartAudit = (serverId: string) => {
    const audit = startFastAudit(serverId);
    if (audit) {
      toast({
        title: "Audit gestartet",
        description: `Sicherheitsaudit für Server wurde erfolgreich gestartet.`,
      });
      
      // Navigation zum Audit-Bericht
      setTimeout(() => {
        navigate(`/audit-reports/${serverId}`);
      }, 1000);
    }
  };

  const handleViewReport = (serverId: string) => {
    navigate(`/audit-reports/${serverId}`);
  };

  const handleGetSystemInfo = (serverId: string) => {
    const systemInfo = systemInfoMap[serverId];
    if (systemInfo) {
      setSelectedSystemInfo(systemInfo);
      setShowSystemInfo(true);
    }
  };

  const handleDeleteServer = (serverId: string) => {
    removeServer(serverId);
    toast({
      title: "Server entfernt",
      description: "Server wurde erfolgreich entfernt.",
    });
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
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Server und führen Sie Sicherheitsaudits durch
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Server className="mr-2 h-4 w-4" />
          Server hinzufügen
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => {
          const fastAudit = getFastAudit(server.id);
          const systemInfo = systemInfoMap[server.id];
          
          return (
            <Card key={server.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{server.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(server.status)}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant={server.status === 'connected' ? 'default' : 'secondary'}>
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

                {fastAudit && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Security Score:</span>
                      <span className={`font-bold ${getScoreColor(fastAudit.scores.overall)}`}>
                        {fastAudit.scores.overall}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-xs">
                      <span>Kritisch: {fastAudit.vulnerabilities.critical}</span>
                      <span>Hoch: {fastAudit.vulnerabilities.high}</span>
                      <span>Medium: {fastAudit.vulnerabilities.medium}</span>
                    </div>
                  </div>
                )}

                {systemInfo && (
                  <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                    <div className="flex justify-between">
                      <span>OS:</span>
                      <span>{systemInfo.os}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span>{systemInfo.uptime}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStartAudit(server.id)}
                    className="flex-1"
                  >
                    <PlayCircle className="mr-1 h-3 w-3" />
                    Audit
                  </Button>
                  
                  {fastAudit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewReport(server.id)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Report
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGetSystemInfo(server.id)}
                  >
                    <Activity className="mr-1 h-3 w-3" />
                    Info
                  </Button>
                </div>

                <div className="flex justify-between pt-2 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingServer(server)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteServer(server.id)}
                    className="text-red-500 hover:text-red-700"
                  >
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
            <Server className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Keine Server vorhanden</h3>
            <p className="text-muted-foreground mb-4">
              Fügen Sie Ihren ersten Server hinzu, um mit den Sicherheitsaudits zu beginnen.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              Server hinzufügen
            </Button>
          </CardContent>
        </Card>
      )}

      <AddServerDialog
        onAddServer={addServer}
        trigger={null}
      />


    </div>
  );
}