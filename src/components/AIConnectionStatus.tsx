import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertCircle } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { NewOllamaService } from "@/services/newOllamaService";
import { logger } from "@/services/loggerService";

export const AIConnectionStatus = () => {
  const { settings } = useSettings();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [connectedModel, setConnectedModel] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('checking');
      setErrorDetails('');
      
      // Check Ollama connection (mit verbesserter Fehlerbehandlung)
      if (settings.ollama.enabled && settings.ollama.serverUrl) {
        try {
          logger.info('ollama', `🔄 Checking Ollama connection status`, {
            serverUrl: settings.ollama.serverUrl,
            model: settings.ollama.model
          });

          const ollamaService = new NewOllamaService(settings.ollama.serverUrl, settings.ollama.model);
          const result = await ollamaService.testConnection();
          
          if (result.success) {
            setConnectionStatus('connected');
            setConnectedModel(`Ollama: ${settings.ollama.model} (${result.models?.length || 0} models)`);
            logger.info('ollama', `✅ Ollama connection status: connected`);
            return;
          } else {
            setConnectionStatus('error');
            setErrorDetails(result.error || 'Verbindung fehlgeschlagen');
            logger.warn('ollama', `⚠️ Ollama connection failed: ${result.error}`);
          }
        } catch (error) {
          setConnectionStatus('error');
          setErrorDetails(error instanceof Error ? error.message : 'Unbekannter Fehler');
          logger.error('ollama', `❌ Ollama connection error`, {}, error as Error);
        }
      } else {
        setConnectionStatus('disconnected');
        setConnectedModel('');
        logger.debug('ollama', `ℹ️ Ollama not configured or disabled`);
      }
    };

    checkConnection();
    
    // Check connection every 45 seconds (weniger aggressiv)
    const interval = setInterval(checkConnection, 45000);
    
    return () => clearInterval(interval);
  }, [settings]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return "text-green-700 border-green-700 bg-green-50 dark:text-green-300 dark:border-green-600 dark:bg-green-950/30";
      case 'error':
        return "text-red-700 border-red-700 bg-red-50 dark:text-red-300 dark:border-red-600 dark:bg-red-950/30";
      case 'disconnected':
        return "text-gray-500 border-gray-300 bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:bg-gray-800/30";
      case 'checking':
        return "text-yellow-700 border-yellow-700 bg-yellow-50 dark:text-yellow-300 dark:border-yellow-600 dark:bg-yellow-950/30";
      default:
        return "text-gray-500 border-gray-300 bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:bg-gray-800/30";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return connectedModel;
      case 'error':
        return `Fehler: ${errorDetails.length > 30 ? errorDetails.substring(0, 30) + '...' : errorDetails}`;
      case 'disconnected':
        return "Keine KI verbunden";
      case 'checking':
        return "Verbindung prüfen...";
      default:
        return "Unbekannt";
    }
  };

  const getStatusIcon = () => {
    if (connectionStatus === 'error') {
      return <AlertCircle className="w-3 h-3 mr-1" />;
    }
    return <Brain className="w-3 h-3 mr-1" />;
  };

  return (
    <Badge 
      variant="outline" 
      className={`${getStatusColor()} transition-colors cursor-help`}
      title={connectionStatus === 'error' ? `Fehler: ${errorDetails}` : getStatusText()}
    >
      {getStatusIcon()}
      {getStatusText()}
    </Badge>
  );
};