import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { backendApi } from "@/services/backendApiService";
import { socketService } from "@/services/socketService";
import { logger } from "@/services/loggerService";

interface ConnectionStatusProps {
  showDetails?: boolean;
}

export const ConnectionStatus = ({ showDetails = false }: ConnectionStatusProps) => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [socketStatus, setSocketStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkConnections = async () => {
    setLastCheck(new Date());
    
    // Check backend connection
    try {
      const backendHealth = await backendApi.testConnection();
      setBackendStatus(backendHealth ? 'connected' : 'disconnected');
      logger.debug('system', `Backend status: ${backendHealth ? 'connected' : 'disconnected'}`);
    } catch (error) {
      setBackendStatus('disconnected');
      logger.error('system', 'Backend connection check failed', { error });
    }

    // Check Ollama connection
    try {
      const ollamaResponse = await backendApi.getOllamaStatus();
      setOllamaStatus(ollamaResponse.success && ollamaResponse.data?.success ? 'connected' : 'disconnected');
      logger.debug('ollama', `Ollama status: ${ollamaResponse.success ? 'connected' : 'disconnected'}`);
    } catch (error) {
      setOllamaStatus('disconnected');
      logger.error('ollama', 'Ollama connection check failed', { error });
    }

    // Check WebSocket connection
    setSocketStatus(socketService.isConnected() ? 'connected' : 'disconnected');
  };

  useEffect(() => {
    checkConnections();
    
    // Check connections every 30 seconds
    const interval = setInterval(checkConnections, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getOverallStatus = () => {
    if (backendStatus === 'connected' && ollamaStatus === 'connected' && socketStatus === 'connected') {
      return 'connected';
    }
    if (backendStatus === 'disconnected') {
      return 'critical';
    }
    return 'warning';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="text-green-700 border-green-700 bg-green-50">
          <Wifi className="w-3 h-3 mr-1" />
          Verbunden
        </Badge>;
      case 'disconnected':
        return <Badge variant="destructive">
          <WifiOff className="w-3 h-3 mr-1" />
          Getrennt
        </Badge>;
      case 'checking':
        return <Badge variant="outline">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Prüfe...
        </Badge>;
      default:
        return <Badge variant="outline">Unbekannt</Badge>;
    }
  };

  const getOverallBadge = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="text-green-700 border-green-700 bg-green-50">
          <Wifi className="w-3 h-3 mr-1" />
          Alle Systeme online
        </Badge>;
      case 'critical':
        return <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Backend offline
        </Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-700 bg-yellow-50">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Teilweise verbunden
        </Badge>;
      default:
        return <Badge variant="outline">Status unbekannt</Badge>;
    }
  };

  if (!showDetails) {
    return (
      <div className="flex items-center space-x-2">
        {getOverallBadge()}
        <Button
          variant="ghost"
          size="sm"
          onClick={checkConnections}
          className="p-1 h-auto"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Verbindungsstatus</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={checkConnections}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Aktualisieren
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm">Backend:</span>
          {getStatusBadge(backendStatus)}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">Ollama KI:</span>
          {getStatusBadge(ollamaStatus)}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">WebSocket:</span>
          {getStatusBadge(socketStatus)}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground">
        Letzte Prüfung: {lastCheck.toLocaleTimeString()}
      </div>
    </div>
  );
};