import { useState, useEffect } from 'react';
import { backendService } from '@/services/backendService';
import { logger } from '@/services/loggerService';
import { useToast } from '@/hooks/use-toast';

export interface Server {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  connectionType: 'password' | 'key';
  status: 'online' | 'offline' | 'warning' | 'critical';
  securityScore?: number;
  lastAudit?: string;
  createdAt: string;
}

export interface AuditResult {
  id: string;
  serverId: string;
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
  scores: {
    overall: number;
    security: number;
    performance: number;
    compliance: number;
  };
  findings: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    description: string;
    recommendation: string;
  }>;
  systemData?: any;
  analysis?: string;
}

export interface NetworkScanResult {
  hosts: Array<{
    ip: string;
    hostname?: string;
    services: Array<{
      port: number;
      service: string;
      version?: string;
    }>;
  }>;
  scanTime: number;
}

export const useServerManagement = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [isScanning, setIsScanning] = useState<string | null>(null);
  const { toast } = useToast();

  // Backend-Integration: Lade Server beim Start
  useEffect(() => {
    loadServersFromBackend();
  }, []);

  const loadServersFromBackend = async () => {
    try {
      const response = await backendService.getServers();
      if (response.success && response.data) {
        setServers(response.data as Server[]);
        logger.info('system', `Loaded ${(response.data as Server[]).length} servers from backend`);
      }
    } catch (error) {
      logger.error('system', 'Failed to load servers from backend', { error });
    }
  };

  const addServer = async (serverData: Omit<Server, 'id' | 'status' | 'createdAt'>) => {
    try {
      const response = await backendService.addServer(serverData);
      if (response.success && response.data) {
        const newServer = response.data as Server;
        setServers(prev => [...prev, newServer]);
        logger.info('system', `Server added: ${newServer.name} (${newServer.ip})`);
        
        toast({
          title: "Server hinzugefügt",
          description: `${newServer.name} wurde erfolgreich hinzugefügt.`
        });
        
        return newServer;
      } else {
        throw new Error(response.error || 'Failed to add server');
      }
    } catch (error) {
      logger.error('system', 'Failed to add server', { error });
      toast({
        title: "Fehler",
        description: "Server konnte nicht hinzugefügt werden.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateServer = (serverId: string, updates: Partial<Server>) => {
    setServers(prev => prev.map(server => 
      server.id === serverId ? { ...server, ...updates } : server
    ));
  };

  const removeServer = (serverId: string) => {
    setServers(prev => prev.filter(server => server.id !== serverId));
    setAuditResults(prev => prev.filter(result => result.serverId !== serverId));
  };

  const testConnection = async (serverId: string): Promise<boolean> => {
    setIsScanning(serverId);
    
    try {
      const response = await backendService.connectSSH(serverId);
      
      if (response.success) {
        // Update server status
        setServers(prev => prev.map(server => 
          server.id === serverId 
            ? { ...server, status: 'online' }
            : server
        ));
        
        logger.info('system', `SSH connection test successful for server ${serverId}`);
        return true;
      } else {
        // Update server status
        setServers(prev => prev.map(server => 
          server.id === serverId 
            ? { ...server, status: 'offline' }
            : server
        ));
        
        logger.error('system', `SSH connection test failed for server ${serverId}`, { error: response.error });
        return false;
      }
    } catch (error) {
      logger.error('system', `SSH connection test error for server ${serverId}`, { error });
      return false;
    } finally {
      setIsScanning(null);
    }
  };

  const startAudit = async (serverId: string) => {
    setIsScanning(serverId);
    const server = servers.find(s => s.id === serverId);
    
    if (!server) {
      setIsScanning(null);
      return;
    }

    try {
      logger.info('system', `Starting security audit for ${server.name} (${server.ip})`);
      
      // 1. SSH-Verbindung herstellen
      const connectionResponse = await backendService.connectSSH(serverId);
      if (!connectionResponse.success) {
        throw new Error('SSH connection failed: ' + connectionResponse.error);
      }
      
      const connectionId = (connectionResponse.data as any).connectionId;
      
      // 2. Systemdaten sammeln
      const dataResponse = await backendService.gatherSystemData(connectionId);
      if (!dataResponse.success) {
        throw new Error('Data gathering failed: ' + dataResponse.error);
      }
      
      const systemData = (dataResponse.data as any).systemData;
      
      // 3. Audit-Ergebnis erstellen
      const auditResult: AuditResult = {
        id: crypto.randomUUID(),
        serverId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        scores: {
          overall: 75,
          security: 70,
          performance: 80,
          compliance: 75
        },
        findings: [],
        systemData: systemData.data,
        analysis: 'Audit completed successfully via backend'
      };

      // Audit-Ergebnis hinzufügen
      setAuditResults(prev => [auditResult, ...prev]);
      
      // Server-Status und Score aktualisieren
      setServers(prev => prev.map(s => 
        s.id === serverId 
          ? { 
              ...s, 
              status: 'online',
              securityScore: auditResult.scores.overall,
              lastAudit: auditResult.timestamp
            }
          : s
      ));
      
      logger.info('system', `Security audit completed for ${server.name}`, {
        overallScore: auditResult.scores.overall,
        findingsCount: auditResult.findings.length
      });
      
    } catch (error) {
      logger.error('system', `Security audit failed for ${server.name}`, { error });
      
      // Fehlgeschlagenes Audit-Ergebnis
      const failedAudit: AuditResult = {
        id: crypto.randomUUID(),
        serverId,
        timestamp: new Date().toISOString(),
        status: 'failed',
        scores: { overall: 0, security: 0, performance: 0, compliance: 0 },
        findings: [],
        analysis: `Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      
      setAuditResults(prev => [failedAudit, ...prev]);
      
    } finally {
      setIsScanning(null);
    }
  };

  const startNetworkScan = async (): Promise<NetworkScanResult> => {
    // Simulation für Demo - in Realität würde Backend Network Scan durchführen
    const mockResult: NetworkScanResult = {
      hosts: [
        {
          ip: '192.168.1.100',
          hostname: 'web-server-01',
          services: [{ port: 22, service: 'SSH', version: 'OpenSSH 8.9' }]
        },
        {
          ip: '192.168.1.101', 
          hostname: 'db-server-01',
          services: [{ port: 22, service: 'SSH', version: 'OpenSSH 8.9' }]
        }
      ],
      scanTime: 2500
    };
    
    return new Promise(resolve => {
      setTimeout(() => resolve(mockResult), 2500);
    });
  };

  return {
    servers,
    auditResults,
    isScanning,
    addServer,
    updateServer,
    removeServer,
    testConnection,
    startAudit,
    startNetworkScan
  };
};