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

  const updateServerStatus = useCallback((serverId: string, status: Server['status']) => {
    setServers(prev => prev.map(server => 
      server.id === serverId ? { ...server, status } : server
    ));
  }, []);

  const testConnection = useCallback(async (serverId: string): Promise<boolean> => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return false;

    updateServerStatus(serverId, 'warning');
    
    try {
      const { RealSSHService } = await import('@/services/realSSHService');
      const sshService = new RealSSHService();
      const connection = await sshService.connect(server);
      
      if (connection.status === 'connected') {
        updateServerStatus(serverId, 'online');
        await sshService.disconnect(connection.id);
        return true;
      } else {
        updateServerStatus(serverId, 'critical');
        return false;
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      updateServerStatus(serverId, 'critical');
      return false;
    }
  }, [servers, updateServerStatus]);

  const startAudit = useCallback(async (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server || isScanning) return null;

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
      const { RealSSHService } = await import('@/services/realSSHService');
      const sshService = new RealSSHService();
      const connection = await sshService.connect(server);
      
      if (connection.status !== 'connected') {
        throw new Error(connection.error || 'Failed to connect to server');
      }

      // Perform real security audit with actual data
      const securityAudit = await sshService.performSecurityAudit(connection.id);
      
      const completedAudit: AuditResult = {
        ...newAudit,
        status: 'completed',
        overallScore: securityAudit.scores.overall,
        securityScore: securityAudit.scores.security,
        performanceScore: securityAudit.scores.performance,
        complianceScore: securityAudit.scores.compliance,
        findings: securityAudit.findings
      };

      setAuditResults(prev => prev.map(audit => 
        audit.id === auditId ? completedAudit : audit
      ));
      
      // Update server's last scan time and security score
      setServers(prev => prev.map(s => 
        s.id === serverId 
          ? { 
              ...s, 
              lastScan: completedAudit.timestamp,
              securityScore: completedAudit.securityScore
            } 
          : s
      ));

      await sshService.disconnect(connection.id);
      setIsScanning(null);
      
      return completedAudit;
    } catch (error) {
      console.error('Audit failed:', error);
      
      const failedAudit: AuditResult = {
        ...newAudit,
        status: 'failed',
        findings: [{
          id: 'connection-error',
          title: 'Verbindungsfehler',
          severity: 'critical',
          category: 'Connection',
          description: error instanceof Error ? error.message : 'Unbekannter Fehler beim Verbinden zum Server',
          recommendation: 'Überprüfen Sie IP-Adresse, Port, Benutzername und Passwort. Stellen Sie sicher, dass SSH aktiviert ist.'
        }]
      };

      setAuditResults(prev => prev.map(audit => 
        audit.id === auditId ? failedAudit : audit
      ));
      setIsScanning(null);
      
      throw error;
    }
  }, [servers, isScanning]);

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
    removeServer,
    testConnection,
    startAudit,
    startNetworkScan,
    updateServerStatus
  };
};