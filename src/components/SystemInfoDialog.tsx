import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Server, 
  HardDrive, 
  Cpu, 
  MemoryStick, 
  Network, 
  Package, 
  Shield,
  Clock,
  Users,
  Activity
} from "lucide-react";

interface SystemInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  systemInfo: any;
  serverName: string;
}

export const SystemInfoDialog = ({ isOpen, onClose, systemInfo, serverName }: SystemInfoDialogProps) => {
  if (!systemInfo) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const parseMemoryInfo = (meminfo: string) => {
    const lines = meminfo.split('\n');
    const data: any = {};
    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        const numValue = parseInt(value.trim().split(' ')[0]);
        data[key.trim()] = numValue * 1024; // Convert from kB to bytes
      }
    });
    return data;
  };

  const parseDiskUsage = (diskUsage: string) => {
    const lines = diskUsage.split('\n').filter(line => line.trim() && !line.startsWith('Filesystem'));
    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 6) {
        return {
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          available: parts[3],
          usePercent: parseInt(parts[4].replace('%', '')),
          mountPoint: parts[5]
        };
      }
      return null;
    }).filter(Boolean);
  };

  const parseLoadAverage = (uptime: string) => {
    const match = uptime.match(/load average: ([\d.]+), ([\d.]+), ([\d.]+)/);
    return match ? {
      '1min': parseFloat(match[1]),
      '5min': parseFloat(match[2]),
      '15min': parseFloat(match[3])
    } : null;
  };

  const memInfo = systemInfo.data?.memory_info ? parseMemoryInfo(systemInfo.data.memory_info.stdout) : null;
  const diskInfo = systemInfo.data?.disk_usage ? parseDiskUsage(systemInfo.data.disk_usage.stdout) : [];
  const loadAvg = systemInfo.data?.uptime ? parseLoadAverage(systemInfo.data.uptime.stdout) : null;
  const processCount = systemInfo.data?.running_processes ? systemInfo.data.running_processes.stdout.split('\n').length - 1 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Server className="w-5 h-5" />
            <span>Systeminformationen - {serverName}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
            <TabsTrigger value="storage">Speicher</TabsTrigger>
            <TabsTrigger value="network">Netzwerk</TabsTrigger>
            <TabsTrigger value="packages">Pakete</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* System Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Server className="w-4 h-4" />
                    <span>System</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hostname:</span>
                    <span className="font-mono">{systemInfo.data?.hostname?.stdout?.trim() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">OS:</span>
                    <span className="font-mono">{systemInfo.data?.os_info?.stdout?.trim() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kernel:</span>
                    <span className="font-mono">{systemInfo.data?.kernel_version?.stdout?.trim() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uptime:</span>
                    <span className="font-mono">{systemInfo.data?.uptime?.stdout?.split(' load')[0]?.trim() || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Load Average */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-4 h-4" />
                    <span>Systemlast</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadAvg ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">1 Min:</span>
                        <Badge variant={loadAvg['1min'] > 2 ? 'destructive' : loadAvg['1min'] > 1 ? 'secondary' : 'default'}>
                          {loadAvg['1min'].toFixed(2)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">5 Min:</span>
                        <Badge variant={loadAvg['5min'] > 2 ? 'destructive' : loadAvg['5min'] > 1 ? 'secondary' : 'default'}>
                          {loadAvg['5min'].toFixed(2)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">15 Min:</span>
                        <Badge variant={loadAvg['15min'] > 2 ? 'destructive' : loadAvg['15min'] > 1 ? 'secondary' : 'default'}>
                          {loadAvg['15min'].toFixed(2)}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Keine Lastdaten verfügbar</p>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prozesse:</span>
                    <span className="font-semibold">{processCount}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Memory Usage */}
            {memInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MemoryStick className="w-4 h-4" />
                    <span>Arbeitsspeicher</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Belegt: {formatBytes(memInfo.MemTotal - memInfo.MemAvailable)}</span>
                      <span>Verfügbar: {formatBytes(memInfo.MemAvailable)}</span>
                      <span>Gesamt: {formatBytes(memInfo.MemTotal)}</span>
                    </div>
                    <Progress 
                      value={((memInfo.MemTotal - memInfo.MemAvailable) / memInfo.MemTotal) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disk Usage Overview */}
            {diskInfo.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4" />
                    <span>Festplattenbelegung</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {diskInfo.slice(0, 3).map((disk: any, index: number) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{disk.mountPoint}</span>
                          <span>{disk.usePercent}% belegt</span>
                        </div>
                        <Progress 
                          value={disk.usePercent} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="hardware" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hardware-Informationen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Cpu className="w-4 h-4 mr-2" />
                      CPU
                    </h4>
                    <div className="bg-muted p-3 rounded font-mono text-sm">
                      {systemInfo.data?.cpu_info?.stdout || 'Keine CPU-Informationen verfügbar'}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <MemoryStick className="w-4 h-4 mr-2" />
                      Arbeitsspeicher
                    </h4>
                    <div className="bg-muted p-3 rounded font-mono text-sm max-h-32 overflow-y-auto">
                      {systemInfo.data?.memory_info?.stdout || 'Keine Speicher-Informationen verfügbar'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="storage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4" />
                  <span>Festplatten-Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diskInfo.length > 0 ? (
                  <div className="space-y-4">
                    {diskInfo.map((disk: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{disk.filesystem}</h4>
                          <Badge variant={disk.usePercent > 90 ? 'destructive' : disk.usePercent > 75 ? 'secondary' : 'default'}>
                            {disk.usePercent}% belegt
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          Mount Point: {disk.mountPoint}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                          <div>Gesamt: {disk.size}</div>
                          <div>Belegt: {disk.used}</div>
                          <div>Verfügbar: {disk.available}</div>
                        </div>
                        <Progress value={disk.usePercent} className="h-2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Keine Festplatten-Informationen verfügbar</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Network className="w-4 h-4" />
                  <span>Netzwerk-Konfiguration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
                  {systemInfo.data?.network_config?.stdout || 'Keine Netzwerk-Informationen verfügbar'}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-4 h-4" />
                  <span>Installierte Pakete & Updates</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Verfügbare Updates</h4>
                  <div className="bg-muted p-4 rounded font-mono text-sm max-h-32 overflow-y-auto">
                    {systemInfo.data?.package_updates?.stdout || 'Keine Update-Informationen verfügbar'}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Systemdienste</h4>
                  <div className="bg-muted p-4 rounded font-mono text-sm max-h-32 overflow-y-auto">
                    {systemInfo.data?.systemd_services?.stdout || 'Keine Service-Informationen verfügbar'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};