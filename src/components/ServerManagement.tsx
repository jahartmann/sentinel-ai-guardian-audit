import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServerManagementBackend } from "@/hooks/useServerManagementBackend";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Plus,
  Wifi
} from "lucide-react";

const ServerManagement = () => {
  const { 
    servers, 
    loading,
    addServer,
    removeServer,
    testConnection,
    refreshServers
  } = useServerManagementBackend();
  
  const { settings } = useSettings();
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      refreshServers();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshServers]);

  const getConnectionStatusIcon = (server: any) => {
    if (server.status === 'connected' || server.status === 'online') {
      return <CheckCircle className="w-4 h-4 text-success" />;
    }
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  if (loading) {
    return <div className="text-center py-8">Lade Server...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">Server Management</h2>
          {servers.some(s => s.status === 'connected' || s.status === 'online') && (
            <Badge variant="default" className="bg-success text-success-foreground">
              <Wifi className="w-3 h-3 mr-1" />
              Verbunden
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {servers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Server className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Keine Server konfiguriert</h3>
              <p className="text-muted-foreground text-center mb-6">
                Fügen Sie Ihren ersten Server hinzu, um mit dem Monitoring zu beginnen.
              </p>
            </CardContent>
          </Card>
        ) : (
          servers.map((server) => (
            <Card key={server.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getConnectionStatusIcon(server)}
                      <CardTitle className="text-lg">{server.name}</CardTitle>
                    </div>
                  </div>
                </div>
                <CardDescription>
                  {server.ip}:{server.port} • {server.username}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ServerManagement;