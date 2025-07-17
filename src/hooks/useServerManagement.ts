import { useState, useCallback, useEffect } from 'react';

export interface Server {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  port: number;
  username: string;
  password?: string;
  os?: string;
  status: 'online' | 'offline' | 'warning' | 'critical';
  lastScan?: string;
  securityScore?: number;
  connectionType: 'ssh' | 'winrm' | 'snmp';
}

export interface AuditResult {
  id: string;
  serverId: string;
  timestamp: string;
  overallScore: number;
  securityScore: number;
  performanceScore: number;
  complianceScore: number;
  status: 'running' | 'completed' | 'failed';
  findings: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    description: string;
    recommendation: string;
  }>;
}

export const useServerManagement = () => {
  // Load servers from localStorage
  const loadServers = (): Server[] => {
    try {
      const saved = localStorage.getItem('servers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const [servers, setServers] = useState<Server[]>(loadServers);

  // Save servers to localStorage whenever servers change
  useEffect(() => {
    localStorage.setItem('servers', JSON.stringify(servers));
  }, [servers]);

  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [isScanning, setIsScanning] = useState<string | null>(null);

  const addServer = useCallback((serverData: Omit<Server, 'id' | 'status'>) => {
    const newServer: Server = {
      ...serverData,
      id: `srv-${Date.now()}`,
      status: 'offline'
    };
    setServers(prev => [...prev, newServer]);
    return newServer;
  }, []);

  const removeServer = useCallback((serverId: string) => {
    setServers(prev => prev.filter(server => server.id !== serverId));
    setAuditResults(prev => prev.filter(result => result.serverId !== serverId));
  }, []);

  const updateServer = useCallback((serverId: string, updates: Partial<Server>) => {
    setServers(prev => prev.map(server => 
      server.id === serverId ? { ...server, ...updates } : server
    ));
  }, []);

  const updateServerStatus = useCallback((serverId: string, status: Server['status']) => {
    setServers(prev => prev.map(server => 
      server.id === serverId ? { ...server, status } : server
    ));
  }, []);

  const testConnection = useCallback(async (serverId: string): Promise<boolean> => {
    const server = servers.find(s => s.id === serverId);
    if (!server) {
      console.error(`Server mit ID ${serverId} nicht gefunden`);
      return false;
    }

    console.log(`Testing connection to ${server.hostname} (${server.ip}:${server.port})`);
    updateServerStatus(serverId, 'warning');
    
    try {
      const { RealSSHService } = await import('@/services/realSSHService');
      const sshService = new RealSSHService();
      
      // Echter SSH-Verbindungstest mit Schlüsselaustausch
      const connection = await sshService.connect(server);
      
      if (connection.status === 'connected') {
        console.log(`Connection successful to ${server.hostname}`);
        updateServerStatus(serverId, 'online');
        
        // Verbindung ordnungsgemäß trennen
        await sshService.disconnect(connection.id);
        return true;
      } else {
        console.log(`Connection failed to ${server.hostname}: ${connection.error}`);
        updateServerStatus(serverId, 'critical');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Verbindungsfehler';
      console.error(`Connection test failed for ${server.hostname}:`, errorMessage);
      updateServerStatus(serverId, 'critical');
      return false;
    }
  }, [servers, updateServerStatus]);

  const startAudit = useCallback(async (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server || isScanning) {
      console.error('Server nicht gefunden oder Audit bereits aktiv');
      return null;
    }

    console.log(`Starting comprehensive audit for ${server.hostname}`);
    setIsScanning(serverId);
    
    const auditId = `audit-${Date.now()}`;
    const newAudit: AuditResult = {
      id: auditId,
      serverId,
      timestamp: new Date().toISOString(),
      overallScore: 0,
      securityScore: 0,
      performanceScore: 0,
      complianceScore: 0,
      status: 'running',
      findings: []
    };

    setAuditResults(prev => [...prev, newAudit]);

    try {
      // 1. Prüfe ob KI-Modell verfügbar ist
      const aiService = await checkAIAvailability();
      if (!aiService) {
        throw new Error('Kein KI-Modell verfügbar. Bitte konfigurieren Sie Ollama oder ein anderes KI-Modell in den Einstellungen.');
      }

      // 2. Stelle SSH-Verbindung her
      const { RealSSHService } = await import('@/services/realSSHService');
      const sshService = new RealSSHService();
      const connection = await sshService.connect(server);
      
      if (connection.status !== 'connected') {
        throw new Error(connection.error || 'SSH-Verbindung konnte nicht hergestellt werden');
      }

      console.log('SSH connection established, gathering system data...');

      // 3. Sammle umfassende Systemdaten
      const systemInfo = await sshService.gatherSystemInfo(connection.id);
      
      console.log('System data collected, performing AI-powered security analysis...');

      // 4. Führe KI-gestützte Sicherheitsanalyse durch
      const securityAudit = await sshService.performSecurityAudit(connection.id);
      
      console.log('Security audit completed, generating AI recommendations...');

      // 5. Lasse KI die Ergebnisse analysieren und Empfehlungen generieren
      const aiAnalysis = await aiService.analyzeSecurityFindings(securityAudit.findings);
      
      const completedAudit: AuditResult = {
        ...newAudit,
        status: 'completed',
        overallScore: securityAudit.scores.overall,
        securityScore: securityAudit.scores.security,
        performanceScore: securityAudit.scores.performance,
        complianceScore: securityAudit.scores.compliance,
        findings: securityAudit.findings.map(finding => ({
          ...finding,
          aiAnalysis // Erweitere Befunde um KI-Analyse
        }))
      };

      setAuditResults(prev => prev.map(audit => 
        audit.id === auditId ? completedAudit : audit
      ));
      
      // 6. Aktualisiere Server-Daten
      setServers(prev => prev.map(s => 
        s.id === serverId 
          ? { 
              ...s, 
              lastScan: completedAudit.timestamp,
              securityScore: completedAudit.securityScore,
              os: systemInfo.os // Aktualisiere erkanntes OS
            } 
          : s
      ));

      await sshService.disconnect(connection.id);
      setIsScanning(null);
      
      console.log(`Audit completed for ${server.hostname} with score: ${completedAudit.overallScore}`);
      return completedAudit;
      
    } catch (error) {
      console.error('Audit failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Audit-Fehler';
      
      const failedAudit: AuditResult = {
        ...newAudit,
        status: 'failed',
        findings: [{
          id: 'audit-error',
          title: 'Audit-Fehler',
          severity: 'critical',
          category: 'System',
          description: errorMessage,
          recommendation: getErrorRecommendation(errorMessage)
        }]
      };

      setAuditResults(prev => prev.map(audit => 
        audit.id === auditId ? failedAudit : audit
      ));
      setIsScanning(null);
      
      throw error;
    }
  }, [servers, isScanning]);

  const checkAIAvailability = async () => {
    try {
      // Prüfe Ollama
      const { createOllamaService } = await import('@/services/ollamaService');
      const { useSettings } = await import('@/hooks/useSettings');
      
      // Da wir nicht in einem React-Kontext sind, müssen wir anders auf Settings zugreifen
      const savedSettings = localStorage.getItem('settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.ollama?.enabled && settings.ollama?.serverUrl) {
          const ollamaService = createOllamaService(settings);
          if (ollamaService && await ollamaService.testConnection()) {
            return ollamaService;
          }
        }
      }
      
      // Prüfe andere KI-Services falls konfiguriert
      // TODO: Implementiere andere KI-Services (OpenAI, Claude, etc.)
      
      return null;
    } catch (error) {
      console.error('AI availability check failed:', error);
      return null;
    }
  };

  const getErrorRecommendation = (errorMessage: string): string => {
    if (errorMessage.includes('Kein KI-Modell')) {
      return 'Konfigurieren Sie Ollama oder ein anderes KI-Modell in den Einstellungen. Stellen Sie sicher, dass der Ollama-Server läuft und erreichbar ist.';
    }
    if (errorMessage.includes('SSH-Verbindung')) {
      return 'Überprüfen Sie die SSH-Konfiguration des Servers. Stellen Sie sicher, dass SSH aktiviert ist und der Port korrekt ist.';
    }
    if (errorMessage.includes('nicht erreichbar')) {
      return 'Überprüfen Sie die Netzwerkverbindung und Firewall-Einstellungen. Der Server muss über das Netzwerk erreichbar sein.';
    }
    return 'Überprüfen Sie die Server-Konfiguration und Netzwerkverbindung. Stellen Sie sicher, dass alle erforderlichen Services laufen.';
  };

  const startNetworkScan = useCallback(async () => {
    try {
      const networkService = new (await import('@/services/networkService')).NetworkService();
      const result = await networkService.scanNetwork();
      
      console.log(`Network scan completed: ${result.hosts.length} hosts found in ${result.scanTime}ms`);
      
      // Auto-discover servers and add them
      const newServers = result.hosts
        .filter(host => host.services.some(s => s.service === 'SSH'))
        .map(host => ({
          name: host.hostname || `Server-${host.ip.split('.').pop()}`,
          hostname: host.hostname || host.ip,
          ip: host.ip,
          port: 22,
          username: '',
          connectionType: 'ssh' as const
        }));

      // Add discovered servers if they don't exist
      newServers.forEach(serverData => {
        const exists = servers.some(s => s.ip === serverData.ip);
        if (!exists) {
          addServer(serverData);
        }
      });

      return result;
    } catch (error) {
      console.error('Network scan failed:', error);
      throw error;
    }
  }, [servers, addServer]);

  return {
    servers,
    auditResults,
    isScanning,
    addServer,
    updateServer,
    removeServer,
    testConnection,
    startAudit,
    startNetworkScan,
    updateServerStatus
  };
};