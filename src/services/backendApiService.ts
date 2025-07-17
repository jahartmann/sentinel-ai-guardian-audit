import { logger } from './loggerService';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

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
  updatedAt: string;
}

export interface AuditResult {
  id: string;
  serverId: string;
  serverName: string;
  timestamp: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
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
    evidence?: string;
  }>;
  analysis?: string;
  model?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

class BackendApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = window.location.origin;
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      logger.debug('system', `📤 ${options.method || 'GET'} ${endpoint}`);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        logger.debug('system', `✅ ${options.method || 'GET'} ${endpoint} successful`);
      } else {
        logger.error('system', `❌ ${options.method || 'GET'} ${endpoint} failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('system', `❌ Request failed: ${endpoint}`, { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  // Server Management
  async getServers(): Promise<ApiResponse<Server[]>> {
    return this.request<Server[]>('/api/servers');
  }

  async addServer(serverData: Omit<Server, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Server>> {
    return this.request<Server>('/api/servers', {
      method: 'POST',
      body: JSON.stringify(serverData),
    });
  }

  async deleteServer(serverId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/servers/${serverId}`, {
      method: 'DELETE',
    });
  }

  // SSH Operations
  async connectSSH(serverId: string): Promise<ApiResponse<{ connectionId: string; status: string }>> {
    return this.request<{ connectionId: string; status: string }>('/api/ssh/connect', {
      method: 'POST',
      body: JSON.stringify({ serverId }),
    });
  }

  async executeSSHCommand(connectionId: string, command: string): Promise<ApiResponse<{
    stdout: string;
    stderr: string;
    exitCode: number;
    timestamp: string;
  }>> {
    return this.request('/api/ssh/execute', {
      method: 'POST',
      body: JSON.stringify({ connectionId, command }),
    });
  }

  async gatherSystemData(connectionId: string): Promise<ApiResponse<{ systemData: any }>> {
    return this.request('/api/ssh/gather-data', {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
  }

  // Ollama Integration
  async getOllamaStatus(): Promise<ApiResponse<{
    success: boolean;
    models: Array<{ name: string; size?: number; modified?: string }>;
    status: string;
    url: string;
  }>> {
    return this.request('/api/ollama/status');
  }

  async sendOllamaChat(model: string, messages: Array<{ role: string; content: string }>): Promise<ApiResponse<{
    success: boolean;
    message: { content: string };
    model: string;
    created_at: string;
    done: boolean;
  }>> {
    return this.request('/api/ollama/chat', {
      method: 'POST',
      body: JSON.stringify({ model, messages }),
    });
  }

  // Audit Operations
  async startAudit(serverId: string, model: string): Promise<ApiResponse<{ auditId: string }>> {
    return this.request<{ auditId: string }>('/api/audit/start', {
      method: 'POST',
      body: JSON.stringify({ serverId, model }),
    });
  }

  async getAuditStatus(auditId: string): Promise<ApiResponse<{
    id: string;
    status: string;
    progress: number;
    currentStep: string;
    startTime: string;
    lastUpdate: string;
    scores: { overall: number; security: number; performance: number; compliance: number };
    findingsCount: number;
  }>> {
    return this.request(`/api/audit/${auditId}/status`);
  }

  // Test connection to backend
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getServers();
      return response.success;
    } catch {
      return false;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    backend: boolean;
    ollama: boolean;
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString();
    
    try {
      const [backendResult, ollamaResult] = await Promise.allSettled([
        this.getServers(),
        this.getOllamaStatus()
      ]);

      const backend = backendResult.status === 'fulfilled' && backendResult.value.success;
      const ollama = ollamaResult.status === 'fulfilled' && 
                    ollamaResult.value.success && 
                    ollamaResult.value.data?.success;

      return { backend, ollama, timestamp };
    } catch {
      return { backend: false, ollama: false, timestamp };
    }
  }
}

export const backendApi = new BackendApiService();