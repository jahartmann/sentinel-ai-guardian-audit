import { useState, useEffect } from 'react';
import { backendApi, Server, AuditResult } from '@/services/backendApiService';
import { MockDataService, MockSystemInfo } from '@/services/mockDataService';
import { logger } from '@/services/loggerService';

export interface ServerWithKeyStatus extends Server {
  keyDeployed?: boolean;
  fingerprint?: string;
}

export const useHybridServerManagement = () => {
  const [servers, setServers] = useState<ServerWithKeyStatus[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [isScanning, setIsScanning] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string>('ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(false);

  // Check backend availability on mount
  useEffect(() => {
    checkBackendAvailability();
    loadInitialData();
  }, []);

  const checkBackendAvailability = async () => {
    try {
      const available = await backendApi.isBackendAvailable();
      setBackendAvailable(available);
      logger.info('system', `🔌 Backend ${available ? 'connected' : 'using mock data'}`);
    } catch {
      setBackendAvailable(false);
      logger.warn('system', '🔌 Backend unavailable, using mock data');
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (backendAvailable) {
        await loadServersFromBackend();
        await loadAuditResultsFromBackend();
      } else {
        await loadMockData();
      }
    } catch (error) {
      logger.error('system', 'Failed to load initial data', { error });
      await loadMockData(); // Fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  const loadServersFromBackend = async () => {
    try {
      const response = await backendApi.getServers();
      if (response.success && response.data && !backendApi['isHtmlResponse'](response)) {
        setServers(response.data);
        setBackendAvailable(true);
      } else {
        throw new Error('Backend returned HTML instead of JSON');
      }
    } catch (error) {
      logger.warn('system', 'Backend failed, switching to mock data');
      setBackendAvailable(false);
      await loadMockData();
    }
  };

  const loadAuditResultsFromBackend = async () => {
    try {
      const response = await backendApi.request<AuditResult[]>('/api/audit/results');
      if (response.success && response.data && !backendApi['isHtmlResponse'](response)) {
        setAuditResults(response.data);
      }
    } catch (error) {
      logger.warn('system', 'Failed to load audit results from backend');
    }
  };

  const loadMockData = async () => {
    try {
      const [mockServers, mockAudits] = await Promise.all([
        MockDataService.getServers(),
        MockDataService.getAuditResults()
      ]);
      setServers(mockServers);
      setAuditResults(mockAudits);
      logger.info('system', '📊 Loaded mock data successfully');
    } catch (error) {
      logger.error('system', 'Failed to load mock data', { error });
      setError('Failed to load data');
    }
  };

  const addServer = async (serverData: Omit<Server, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (backendAvailable) {
        const response = await backendApi.addServer(serverData);
        if (response.success && response.data) {
          setServers(prev => [...prev, { ...response.data, keyDeployed: false }]);
          logger.info('system', `✅ Server added via backend: ${response.data.name}`);
          return response.data;
        }
      }
      
      // Fallback to mock service
      const newServer = await MockDataService.addServer(serverData);
      setServers(prev => [...prev, { ...newServer, keyDeployed: false }]);
      logger.info('system', `✅ Server added via mock: ${newServer.name}`);
      return newServer;
    } catch (error) {
      logger.error('system', 'Failed to add server', { error });
      throw error;
    }
  };

  const removeServer = async (serverId: string) => {
    try {
      if (backendAvailable) {
        const response = await backendApi.deleteServer(serverId);
        if (response.success) {
          setServers(prev => prev.filter(s => s.id !== serverId));
          logger.info('system', `🗑️ Server removed via backend: ${serverId}`);
          return;
        }
      }
      
      // Fallback to mock service
      await MockDataService.removeServer(serverId);
      setServers(prev => prev.filter(s => s.id !== serverId));
      logger.info('system', `🗑️ Server removed via mock: ${serverId}`);
    } catch (error) {
      logger.error('system', 'Failed to remove server', { error });
      throw error;
    }
  };

  const testConnection = async (serverId: string): Promise<boolean> => {
    setIsScanning(serverId);
    try {
      if (backendAvailable) {
        const response = await backendApi.connectSSH(serverId);
        if (response.success) {
          setServers(prev => prev.map(s => 
            s.id === serverId ? { ...s, status: 'online' as const } : s
          ));
          logger.info('ssh', `✅ Connection test successful: ${serverId}`);
          return true;
        }
      }
      
      // Mock connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      setServers(prev => prev.map(s => 
        s.id === serverId 
          ? { ...s, status: success ? 'online' as const : 'offline' as const }
          : s
      ));
      
      logger.info('ssh', `${success ? '✅' : '❌'} Mock connection test: ${serverId}`);
      return success;
    } catch (error) {
      setServers(prev => prev.map(s => 
        s.id === serverId ? { ...s, status: 'offline' as const } : s
      ));
      logger.error('ssh', 'Connection test error', { error });
      return false;
    } finally {
      setIsScanning(null);
    }
  };

  const startAudit = async (serverId: string, model: string = 'llama3.1:8b'): Promise<AuditResult> => {
    setIsScanning(serverId);
    try {
      let audit: AuditResult;
      
      if (backendAvailable) {
        const response = await backendApi.startAudit(serverId, model);
        if (response.success && response.data) {
          audit = {
            id: response.data.auditId,
            serverId,
            serverName: servers.find(s => s.id === serverId)?.name || 'Unknown',
            timestamp: new Date().toISOString(),
            status: 'starting',
            scores: { overall: 0, security: 0, performance: 0, compliance: 0 },
            findings: [],
            model,
            startTime: new Date().toISOString()
          };
        } else {
          throw new Error('Backend audit failed');
        }
      } else {
        // Use mock audit
        audit = await MockDataService.startAudit(serverId, model);
      }

      setAuditResults(prev => [audit, ...prev]);
      logger.info('audit', `🔍 Audit started: ${audit.id}`);
      
      return audit;
    } catch (error) {
      logger.error('audit', 'Failed to start audit', { error });
      throw error;
    } finally {
      setIsScanning(null);
    }
  };

  const getSystemInfo = async (serverId: string): Promise<MockSystemInfo | null> => {
    try {
      if (backendAvailable) {
        // Try backend first
        const connectResponse = await backendApi.connectSSH(serverId);
        if (connectResponse.success && connectResponse.data) {
          const scriptResponse = await backendApi.request<{ scriptPath: string }>('/api/ssh/upload-script', {
            method: 'POST',
            body: JSON.stringify({ 
              connectionId: connectResponse.data.connectionId,
              scriptType: 'system_info'
            })
          });

          if (scriptResponse.success) {
            const executeResponse = await backendApi.executeSSHCommand(
              connectResponse.data.connectionId, 
              `chmod +x ${scriptResponse.data?.scriptPath} && ${scriptResponse.data?.scriptPath}`
            );

            if (executeResponse.success) {
              logger.info('ssh', `📊 System info collected from backend: ${serverId}`);
              // Parse backend response to MockSystemInfo format
              return parseBackendSystemInfo(executeResponse.data);
            }
          }
        }
      }
      
      // Fallback to mock data
      const systemInfo = await MockDataService.getSystemInfo(serverId);
      logger.info('ssh', `📊 System info loaded from mock: ${serverId}`);
      return systemInfo;
    } catch (error) {
      logger.error('ssh', 'System info collection failed', { error });
      // Always return mock data as fallback
      return await MockDataService.getSystemInfo(serverId);
    }
  };

  const getNetworkAnomalies = async () => {
    try {
      if (backendAvailable) {
        const response = await backendApi.request('/api/network/anomalies');
        if (response.success && response.data) {
          return response.data;
        }
      }
      
      // Return mock anomalies
      return MockDataService.generateNetworkAnomalies();
    } catch (error) {
      logger.error('network', 'Failed to get network anomalies', { error });
      return MockDataService.generateNetworkAnomalies();
    }
  };

  const getNetworkConnections = async () => {
    try {
      if (backendAvailable) {
        const response = await backendApi.request('/api/network/connections');
        if (response.success && response.data) {
          return response.data;
        }
      }
      
      // Return mock connections
      return MockDataService.generateNetworkConnections();
    } catch (error) {
      logger.error('network', 'Failed to get network connections', { error });
      return MockDataService.generateNetworkConnections();
    }
  };

  const getPortUsage = async () => {
    try {
      if (backendAvailable) {
        const response = await backendApi.request('/api/network/ports');
        if (response.success && response.data) {
          return response.data;
        }
      }
      
      // Return mock port usage
      return MockDataService.generatePortUsage();
    } catch (error) {
      logger.error('network', 'Failed to get port usage', { error });
      return MockDataService.generatePortUsage();
    }
  };

  const startNetworkScan = async () => {
    const startTime = Date.now();
    try {
      if (backendAvailable) {
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

        if (response.success && response.data) {
          const scanTime = Date.now() - startTime;
          logger.info('network', `🌐 Network scan completed via backend in ${scanTime}ms`);
          return { hosts: response.data.hosts, scanTime };
        }
      }
      
      // Mock network scan
      await new Promise(resolve => setTimeout(resolve, 3000));
      const scanTime = Date.now() - startTime;
      
      const mockHosts = [
        {
          ip: '192.168.1.1',
          hostname: 'router.local',
          services: [
            { port: 80, service: 'http', state: 'open' },
            { port: 443, service: 'https', state: 'open' }
          ]
        },
        {
          ip: '192.168.1.100',
          hostname: 'web-prod-01',
          services: [
            { port: 22, service: 'ssh', state: 'open' },
            { port: 80, service: 'http', state: 'open' },
            { port: 443, service: 'https', state: 'open' }
          ]
        },
        {
          ip: '192.168.1.101',
          hostname: 'db-prod-01',
          services: [
            { port: 22, service: 'ssh', state: 'open' },
            { port: 3306, service: 'mysql', state: 'open' }
          ]
        }
      ];
      
      logger.info('network', `🌐 Mock network scan completed in ${scanTime}ms`);
      return { hosts: mockHosts, scanTime };
    } catch (error) {
      logger.error('network', 'Network scan failed', { error });
      throw error;
    }
  };

  const refreshData = async () => {
    await checkBackendAvailability();
    await loadInitialData();
  };

  // Helper function to parse backend system info
  const parseBackendSystemInfo = (data: any): MockSystemInfo | null => {
    try {
      return JSON.parse(data.stdout || '{}');
    } catch {
      return null;
    }
  };

  return {
    servers,
    auditResults,
    isScanning,
    publicKey,
    loading,
    error,
    backendAvailable,
    addServer,
    removeServer,
    testConnection,
    markKeyDeployed: (serverId: string) => {
      setServers(prev => prev.map(s => 
        s.id === serverId ? { ...s, keyDeployed: true, status: 'connected' as const } : s
      ));
      logger.info('ssh', `🔑 SSH key marked as deployed: ${serverId}`);
    },
    startDataGathering: async (serverId: string) => {
      // Implementation similar to getSystemInfo but for data gathering
      return await getSystemInfo(serverId);
    },
    startAudit,
    getAuditProgress: async (auditId: string) => {
      // Mock progress for demo
      return {
        id: auditId,
        status: 'running',
        progress: Math.random() * 100,
        currentStep: 'Analyzing security configurations...',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        scores: { overall: 0, security: 0, performance: 0, compliance: 0 },
        findingsCount: 0
      };
    },
    startNetworkScan,
    refreshServers: () => loadInitialData(),
    refreshAuditResults: () => loadInitialData(),
    getSystemInfo,
    getNetworkAnomalies,
    getNetworkConnections,
    getPortUsage,
    refreshData
  };
};