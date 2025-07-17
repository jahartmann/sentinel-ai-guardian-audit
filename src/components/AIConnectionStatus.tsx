import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { NewOllamaService } from "@/services/newOllamaService";

export const AIConnectionStatus = () => {
  const { settings } = useSettings();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [connectedModel, setConnectedModel] = useState<string>('');

  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('checking');
      
      // Check Ollama connection
      if (settings.ollama.enabled && settings.ollama.serverUrl) {
        try {
          const ollamaService = new NewOllamaService(settings.ollama.serverUrl, settings.ollama.model);
          const isConnected = await ollamaService.testConnection();
          
          if (isConnected) {
            setConnectionStatus('connected');
            setConnectedModel(`Ollama: ${settings.ollama.model}`);
            return;
          }
        } catch (error) {
          console.error('Ollama connection failed:', error);
        }
      }

      // For now, only check Ollama - other AI models will be added later

      setConnectionStatus('disconnected');
      setConnectedModel('');
    };

    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [settings]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return "text-success border-success";
      case 'disconnected':
        return "text-muted-foreground border-muted-foreground";
      case 'checking':
        return "text-warning border-warning";
      default:
        return "text-muted-foreground border-muted-foreground";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return connectedModel;
      case 'disconnected':
        return "Keine KI verbunden";
      case 'checking':
        return "Verbindung prüfen...";
      default:
        return "Unbekannt";
    }
  };

  return (
    <Badge variant="outline" className={getStatusColor()}>
      <Brain className="w-3 h-3 mr-1" />
      {getStatusText()}
    </Badge>
  );
};