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

    // Simulate connection test
    updateServerStatus(serverId, 'warning');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.3; // 70% success rate
        updateServerStatus(serverId, success ? 'online' : 'critical');
        resolve(success);
      }, 2000);
    });
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

    // Simulate audit process
    return new Promise<AuditResult>((resolve) => {
      setTimeout(() => {
        const completedAudit: AuditResult = {
          ...newAudit,
          status: 'completed',
          overallScore: Math.floor(Math.random() * 40) + 60, // 60-100
          securityScore: Math.floor(Math.random() * 40) + 50, // 50-90
          performanceScore: Math.floor(Math.random() * 30) + 70, // 70-100
          complianceScore: Math.floor(Math.random() * 35) + 65, // 65-100
          findings: [
            {
              id: 'finding-1',
              title: 'SSH Root Login Enabled',
              severity: 'critical',
              category: 'Security',
              description: 'SSH root login is enabled, which poses a significant security risk.',
              recommendation: 'Disable SSH root login and use sudo for administrative tasks.'
            },
            {
              id: 'finding-2',
              title: 'Outdated Package Versions',
              severity: 'high',
              category: 'Security',
              description: 'Several system packages are outdated and may contain vulnerabilities.',
              recommendation: 'Update all packages to their latest versions.'
            }
          ]
        };

        setAuditResults(prev => prev.map(audit => 
          audit.id === auditId ? completedAudit : audit
        ));
        setIsScanning(null);
        
        // Update server's last scan time and security score
        setServers(prev => prev.map(server => 
          server.id === serverId 
            ? { 
                ...server, 
                lastScan: completedAudit.timestamp,
                securityScore: completedAudit.securityScore
              } 
            : server
        ));

        resolve(completedAudit);
      }, 5000); // 5 second simulation
    });
  }, [servers, isScanning]);

  const startNetworkScan = useCallback(async () => {
    // Simulate network scanning
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('Network scan completed');
        resolve();
      }, 3000);
    });
  }, []);

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