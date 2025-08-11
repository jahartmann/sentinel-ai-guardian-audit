// Backend-Service für Server-Integration
import { logger } from '@/services/loggerService';

export interface BackendResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class BackendService {
  private baseUrl: string;
  
  constructor() {
    // In Production: http://[SERVER-IP]:3000
    this.baseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:3000' 
      : window.location.origin;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<BackendResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      logger.info('system', `Making request to ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('system', `Request failed: ${endpoint}`, { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  // Server Management
  async getServers() {
    return this.request('/api/servers');
  }

  async addServer(server: any) {
    return this.request('/api/servers', {
      method: 'POST',
      body: JSON.stringify(server),
    });
  }

  // SSH Connections
  async connectSSH(serverId: string) {
    return this.request('/api/ssh/connect', {
      method: 'POST',
      body: JSON.stringify({ serverId }),
    });
  }

  async executeCommand(connectionId: string, command: string) {
    return this.request('/api/ssh/execute', {
      method: 'POST',
      body: JSON.stringify({ connectionId, command }),
    });
  }

  async gatherSystemData(connectionId: string) {
    return this.request('/api/ssh/gather-data', {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
  }

  // Ollama Integration
  async getOllamaStatus() {
    return this.request('/api/ollama/status');
  }

  async getOllamaModels() {
    return this.request('/api/ollama/models');
  }

  async sendOllamaChat(model: string, messages: any[]) {
    return this.request('/api/ollama/chat', {
      method: 'POST',
      body: JSON.stringify({ model, messages }),
    });
  }

  // System Info
  async getSystemInfo(serverId: string) {
    return this.request(`/api/system/info/${serverId}`);
  }

  async gatherSystemInfo(serverId: string) {
    return this.request('/api/system/gather-info', {
      method: 'POST',
      body: JSON.stringify({ serverId }),
    });
  }

  // Audits
  async startAudit(serverId: string, model: string) {
    return this.request('/api/audit/start', {
      method: 'POST',
      body: JSON.stringify({ serverId, model }),
    });
  }

  async getAuditStatus(auditId: string) {
    return this.request(`/api/audit/${auditId}/status`);
  }

  async getAllAuditResults() {
    return this.request('/api/audit/results');
  }

  async getAuditResults(serverId: string) {
    return this.request(`/api/audit/results/${serverId}`);
  }
}

export const backendService = new BackendService();