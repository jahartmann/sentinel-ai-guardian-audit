import { useState, useEffect } from 'react';
import { backendApi, Server, AuditResult } from '@/services/backendApiService';
import { socketService } from '@/services/socketService';
import { logger } from '@/services/loggerService';

export interface ServerWithKeyStatus extends Server {
  keyDeployed?: boolean;
  fingerprint?: string;
}

export const useServerManagementBackend = () => {
  const [servers, setServers] = useState<ServerWithKeyStatus[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [isScanning, setIsScanning] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadServers();
    generateSSHKey();
  }, []);

  // Generate SSH key on backend
  const generateSSHKey = async () => {
    try {
      const response = await backendApi.request<{ publicKey: string }>('/api/ssh/generate-key', {
        method: 'POST'
      });
      
      if (response.success && response.data) {
        setPublicKey(response.data.publicKey);
        logger.info('ssh', '🔑 SSH public key generated');
      }
    } catch (error) {
      logger.error('ssh', 'Failed to generate SSH key', { error });
    }
  };

  const loadServers = async () => {
    setLoading(true);
    try {
      const response = await backendApi.getServers();
      if (response.success && response.data) {
        setServers(response.data);
      } else {
        setError(response.error || 'Failed to load servers');
      }
    } catch (error) {
      setError('Backend connection failed');
      logger.error('system', 'Failed to load servers', { error });
    } finally {
      setLoading(false);
    }
  };

  const addServer = async (serverData: Omit<Server, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Convert to backend format with default hostname if not provided
      const backendServerData = {
        ...serverData,
        hostname: serverData.hostname || serverData.ip // Use IP as hostname if not provided
      };
      
      const response = await backendApi.addServer(backendServerData);
      if (response.success && response.data) {
        setServers(prev => [...prev, { ...response.data, keyDeployed: false }]);
        logger.info('system', `✅ Server added: ${response.data.name}`);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to add server');
      }
    } catch (error) {
      logger.error('system', 'Failed to add server', { error });
      throw error;
    }
  };

  const removeServer = async (serverId: string) => {
    try {
      const response = await backendApi.deleteServer(serverId);
      if (response.success) {
        setServers(prev => prev.filter(s => s.id !== serverId));
        logger.info('system', `🗑️ Server removed: ${serverId}`);
      } else {
        throw new Error(response.error || 'Failed to remove server');
      }
    } catch (error) {
      logger.error('system', 'Failed to remove server', { error });
      throw error;
    }
  };

  const testConnection = async (serverId: string): Promise<boolean> => {
    setIsScanning(serverId);
    try {
      const response = await backendApi.connectSSH(serverId);
      if (response.success) {
        // Update server status
        setServers(prev => prev.map(s => 
          s.id === serverId 
            ? { ...s, status: 'online' as const }
            : s
        ));
        logger.info('ssh', `✅ Connection test successful: ${serverId}`);
        return true;
      } else {
        // Update server status to offline
        setServers(prev => prev.map(s => 
          s.id === serverId 
            ? { ...s, status: 'offline' as const }
            : s
        ));
        logger.error('ssh', `❌ Connection test failed: ${response.error}`);
        return false;
      }
    } catch (error) {
      setServers(prev => prev.map(s => 
        s.id === serverId 
          ? { ...s, status: 'offline' as const }
          : s
      ));
      logger.error('ssh', 'Connection test error', { error });
      return false;
    } finally {
      setIsScanning(null);
    }
  };

  const markKeyDeployed = (serverId: string) => {
    setServers(prev => prev.map(s => 
      s.id === serverId 
        ? { ...s, keyDeployed: true, status: 'connected' as const }
        : s
    ));
    logger.info('ssh', `🔑 SSH key marked as deployed: ${serverId}`);
  };

  const startDataGathering = async (serverId: string): Promise<any> => {
    setIsScanning(serverId);
    try {
      // First connect to SSH
      const connectResponse = await backendApi.connectSSH(serverId);
      if (!connectResponse.success || !connectResponse.data) {
        throw new Error('SSH connection failed');
      }

      const { connectionId } = connectResponse.data;

      // Upload and execute the data gathering script
      const scriptResponse = await backendApi.request<{ scriptPath: string }>('/api/ssh/upload-script', {
        method: 'POST',
        body: JSON.stringify({ 
          connectionId,
          scriptType: 'proxmox_data_export'
        })
      });

      if (!scriptResponse.success) {
        throw new Error('Failed to upload data gathering script');
      }

      // Execute the script
      const executeResponse = await backendApi.executeSSHCommand(
        connectionId, 
        `chmod +x ${scriptResponse.data?.scriptPath} && ${scriptResponse.data?.scriptPath}`
      );

      if (executeResponse.success) {
        logger.info('ssh', `📊 Data gathering completed: ${serverId}`);
        return executeResponse.data;
      } else {
        throw new Error('Script execution failed');
      }
    } catch (error) {
      logger.error('ssh', 'Data gathering failed', { error });
      throw error;
    } finally {
      setIsScanning(null);
    }
  };

  const startAudit = async (serverId: string, model: string = 'llama3.1:8b'): Promise<AuditResult> => {
    setIsScanning(serverId);
    try {
      const response = await backendApi.startAudit(serverId, model);
      if (response.success && response.data) {
        const auditId = response.data.auditId;
        
        // Join audit room for real-time updates
        socketService.joinAuditRoom(auditId);
        
        // Create initial audit result
        const initialResult: AuditResult = {
          id: auditId,
          serverId,
          serverName: servers.find(s => s.id === serverId)?.name || 'Unknown',
          timestamp: new Date().toISOString(),
          status: 'starting',
          scores: { overall: 0, security: 0, performance: 0, compliance: 0 },
          findings: [],
          model,
          startTime: new Date().toISOString()
        };

        setAuditResults(prev => [initialResult, ...prev]);
        logger.info('audit', `🔍 Audit started: ${auditId}`);
        
        return initialResult;
      } else {
        throw new Error(response.error || 'Failed to start audit');
      }
    } catch (error) {
      logger.error('audit', 'Failed to start audit', { error });
      throw error;
    } finally {
      setIsScanning(null);
    }
  };

  const getAuditProgress = async (auditId: string) => {
    try {
      const response = await backendApi.getAuditStatus(auditId);
      if (response.success && response.data) {
        // Update audit result with progress
        setAuditResults(prev => prev.map(audit => 
          audit.id === auditId 
            ? { 
                ...audit, 
                status: response.data.status as any,
                scores: response.data.scores 
              }
            : audit
        ));
        return response.data;
      }
    } catch (error) {
      logger.error('audit', 'Failed to get audit progress', { error });
    }
  };

  // Network scanning (simplified for backend)
  const startNetworkScan = async () => {
    const startTime = Date.now();
    try {
      const response = await backendApi.request<{
        hosts: Array<{
          ip: string;
          hostname?: string;
          services: Array<{ port: number; service: string; state: string }>;
        }>;
      }>('/api/network/scan', {
        method: 'POST',
        body: JSON.stringify({ range: '192.168.0.0/24' })
      });

      const scanTime = Date.now() - startTime;
      
      if (response.success && response.data) {
        logger.info('network', `🌐 Network scan completed in ${scanTime}ms`);
        return {
          hosts: response.data.hosts,
          scanTime
        };
      } else {
        throw new Error(response.error || 'Network scan failed');
      }
    } catch (error) {
      logger.error('network', 'Network scan failed', { error });
      throw error;
    }
  };

  const refreshAuditResults = async () => {
    try {
      const response = await backendApi.request<AuditResult[]>('/api/audit/results');
      if (response.success && response.data) {
        setAuditResults(response.data);
      }
    } catch (error) {
      logger.error('audit', 'Failed to refresh audit results', { error });
    }
  };

  return {
    servers,
    auditResults,
    isScanning,
    publicKey,
    loading,
    error,
    addServer,
    removeServer,
    testConnection,
    markKeyDeployed,
    startDataGathering,
    startAudit,
    getAuditProgress,
    startNetworkScan,
    refreshServers: loadServers,
    refreshAuditResults
  };
};
