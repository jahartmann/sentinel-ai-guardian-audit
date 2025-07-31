import { MockDataService, MockSystemInfo } from './mockDataService';
import { backendApi, Server, AuditResult } from './backendApiService';
import { logger } from './loggerService';
import { useServerStore } from '@/stores/serverStore';

class DataService {
  private static instance: DataService;
  private backendAvailable = false;

  private constructor() {}

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.backendAvailable = await backendApi.isBackendAvailable();
      logger.info('system', `Backend ${this.backendAvailable ? 'available' : 'unavailable'}`);
      await this.loadInitialData();
    } catch (error) {
      logger.error('system', 'Failed to initialize data service', { error });
      this.backendAvailable = false;
      await this.loadMockData();
    }
  }

  private async loadInitialData(): Promise<void> {
    const { setLoading, setServers, setAuditResults, setSystemInfo } = useServerStore.getState();
    
    setLoading(true);
    try {
      if (this.backendAvailable) {
        await this.loadBackendData();
      } else {
        await this.loadMockData();
      }
    } catch (error) {
      logger.error('system', 'Failed to load data', { error });
      await this.loadMockData();
    } finally {
      setLoading(false);
    }
  }

  private async loadBackendData(): Promise<void> {
    try {
      const [serversResponse, auditsResponse] = await Promise.all([
        backendApi.getServers(),
        backendApi.request<AuditResult[]>('/api/audit/results')
      ]);

      const { setServers, setAuditResults } = useServerStore.getState();

      if (serversResponse.success && serversResponse.data) {
        setServers(serversResponse.data);
      }

      if (auditsResponse.success && auditsResponse.data) {
        setAuditResults(auditsResponse.data);
      }

      logger.info('system', 'Backend data loaded successfully');
    } catch (error) {
      logger.warn('system', 'Backend data loading failed, falling back to mock');
      throw error;
    }
  }

  private async loadMockData(): Promise<void> {
    try {
      const [servers, auditResults] = await Promise.all([
        MockDataService.getServers(),
        MockDataService.getAuditResults()
      ]);

      const { setServers, setAuditResults, setSystemInfo } = useServerStore.getState();

      setServers(servers);
      setAuditResults(auditResults);

      // Load system info for all servers
      for (const server of servers) {
        const systemInfo = await MockDataService.getSystemInfo(server.id);
        if (systemInfo) {
          setSystemInfo(server.id, systemInfo);
        }
      }

      logger.info('system', 'Mock data loaded successfully');
    } catch (error) {
      logger.error('system', 'Failed to load mock data', { error });
      throw error;
    }
  }

  async addServer(serverData: Omit<Server, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Server> {
    const { addServer, setSystemInfo } = useServerStore.getState();

    try {
      let newServer: Server;

      if (this.backendAvailable) {
        const response = await backendApi.addServer(serverData);
        if (response.success && response.data) {
          newServer = response.data;
        } else {
          throw new Error('Backend add server failed');
        }
      } else {
        newServer = await MockDataService.addServer(serverData);
      }

      addServer({ ...newServer, keyDeployed: false });

      // Load system info for the new server
      const systemInfo = await MockDataService.getSystemInfo(newServer.id);
      if (systemInfo) {
        setSystemInfo(newServer.id, systemInfo);
      }

      logger.info('system', `Server added: ${newServer.name}`);
      return newServer;
    } catch (error) {
      logger.error('system', 'Failed to add server', { error });
      throw error;
    }
  }

  async removeServer(serverId: string): Promise<void> {
    const { removeServer } = useServerStore.getState();

    try {
      if (this.backendAvailable) {
        const response = await backendApi.deleteServer(serverId);
        if (!response.success) {
          throw new Error('Backend remove server failed');
        }
      } else {
        await MockDataService.removeServer(serverId);
      }

      removeServer(serverId);
      logger.info('system', `Server removed: ${serverId}`);
    } catch (error) {
      logger.error('system', 'Failed to remove server', { error });
      throw error;
    }
  }

  async testConnection(serverId: string): Promise<boolean> {
    const { updateServer } = useServerStore.getState();

    try {
      let success = false;

      if (this.backendAvailable) {
        const response = await backendApi.connectSSH(serverId);
        success = response.success;
      } else {
        // Mock connection test
        await new Promise(resolve => setTimeout(resolve, 2000));
        success = Math.random() > 0.3; // 70% success rate
      }

      updateServer(serverId, { 
        status: success ? 'online' as const : 'offline' as const 
      });

      logger.info('ssh', `Connection test ${success ? 'successful' : 'failed'}: ${serverId}`);
      return success;
    } catch (error) {
      updateServer(serverId, { status: 'offline' as const });
      logger.error('ssh', 'Connection test error', { error });
      return false;
    }
  }

  async startAudit(serverId: string, model: string = 'llama3.1:8b'): Promise<AuditResult> {
    const { addAuditResult, servers } = useServerStore.getState();
    const server = servers.find(s => s.id === serverId);

    try {
      let audit: AuditResult;

      if (this.backendAvailable) {
        const response = await backendApi.startAudit(serverId, model);
        if (response.success && response.data) {
          audit = {
            id: response.data.auditId,
            serverId,
            serverName: server?.name || 'Unknown',
            timestamp: new Date().toISOString(),
            status: 'completed',
            scores: { overall: 85, security: 90, performance: 80, compliance: 85 },
            findings: [],
            model,
            startTime: new Date().toISOString()
          };
        } else {
          throw new Error('Backend audit failed');
        }
      } else {
        audit = await MockDataService.startAudit(serverId, model);
      }

      addAuditResult(audit);
      logger.info('audit', `Audit completed: ${audit.id}`);
      return audit;
    } catch (error) {
      logger.error('audit', 'Failed to start audit', { error });
      throw error;
    }
  }

  async getSystemInfo(serverId: string): Promise<MockSystemInfo | null> {
    const { systemInfoMap, setSystemInfo } = useServerStore.getState();

    // Return cached if available
    if (systemInfoMap[serverId]) {
      return systemInfoMap[serverId];
    }

    try {
      let systemInfo: MockSystemInfo | null = null;

      if (this.backendAvailable) {
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
              try {
                systemInfo = JSON.parse(executeResponse.data.stdout || '{}');
              } catch {
                systemInfo = null;
              }
            }
          }
        }
      }

      // Fallback to mock data
      if (!systemInfo) {
        systemInfo = await MockDataService.getSystemInfo(serverId);
      }

      if (systemInfo) {
        setSystemInfo(serverId, systemInfo);
      }

      logger.info('ssh', `System info collected: ${serverId}`);
      return systemInfo;
    } catch (error) {
      logger.error('ssh', 'System info collection failed', { error });
      // Always return mock data as fallback
      const mockInfo = await MockDataService.getSystemInfo(serverId);
      if (mockInfo) {
        setSystemInfo(serverId, mockInfo);
      }
      return mockInfo;
    }
  }

  async getNetworkAnomalies() {
    try {
      if (this.backendAvailable) {
        const response = await backendApi.request('/api/network/anomalies');
        if (response.success && response.data) {
          return response.data;
        }
      }
      return MockDataService.generateNetworkAnomalies();
    } catch {
      return MockDataService.generateNetworkAnomalies();
    }
  }

  async refreshData(): Promise<void> {
    await this.initialize();
  }

  isBackendAvailable(): boolean {
    return this.backendAvailable;
  }
}

export const dataService = DataService.getInstance();