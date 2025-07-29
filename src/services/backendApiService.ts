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
  status: 'online' | 'offline' | 'warning' | 'critical' | 'connected';
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
    // Use relative URLs for production to avoid CORS issues
    this.baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:3000' 
      : '';
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint;
      logger.debug('system', `📤 ${options.method || 'GET'} ${endpoint}`);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
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
    models: Array<{ 
      name: string; 
      model: string;
      size?: number; 
      modified_at?: string;
      digest?: string;
      details?: any;
    }>;
    status: string;
    url: string;
  }>> {
    return this.request('/api/ollama/status');
  }

  async getOllamaModels(): Promise<ApiResponse<{
    models: Array<{ 
      name: string; 
      model: string;
      size?: number; 
      modified_at?: string;
      digest?: string;
      details?: any;
    }>;
  }>> {
    return this.request('/api/ollama/models');
  }

  async getRunningModels(): Promise<ApiResponse<{
    models: Array<{ 
      name: string; 
      model: string;
      size?: number; 
      size_vram?: number;
      expires_at?: string;
      digest?: string;
      details?: any;
    }>;
  }>> {
    return this.request('/api/ollama/running');
  }

  async getModelInfo(modelName: string): Promise<ApiResponse<{
    modelfile: string;
    parameters: string;
    template: string;
    details: any;
    model_info: any;
    capabilities: string[];
  }>> {
    return this.request(`/api/ollama/model/${encodeURIComponent(modelName)}`);
  }

  async sendOllamaChat(model: string, messages: Array<{ role: string; content: string }>): Promise<ApiResponse<{
    success: boolean;
    message: { content: string };
    model: string;
    created_at: string;
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
  }>> {
    return this.request('/api/ollama/chat', {
      method: 'POST',
      body: JSON.stringify({ model, messages }),
    });
  }

  async generateResponse(model: string, prompt: string, options?: any): Promise<ApiResponse<{
    success: boolean;
    response: string;
    model: string;
    created_at: string;
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
  }>> {
    return this.request('/api/ollama/generate', {
      method: 'POST',
      body: JSON.stringify({ model, prompt, options }),
    });
  }

  async generateEmbeddings(model: string, prompt: string): Promise<ApiResponse<{
    success: boolean;
    embedding: number[];
  }>> {
    return this.request('/api/ollama/embeddings', {
      method: 'POST',
      body: JSON.stringify({ model, prompt }),
    });
  }

  async loadModel(modelName: string): Promise<ApiResponse<{
    success: boolean;
    model: string;
    loaded: boolean;
  }>> {
    return this.request('/api/ollama/load', {
      method: 'POST',
      body: JSON.stringify({ model: modelName }),
    });
  }

  async unloadModel(modelName: string): Promise<ApiResponse<{
    success: boolean;
    model: string;
    unloaded: boolean;
  }>> {
    return this.request('/api/ollama/unload', {
      method: 'POST',
      body: JSON.stringify({ model: modelName }),
    });
  }

  async getOllamaVersion(): Promise<ApiResponse<{
    success: boolean;
    version: string;
  }>> {
    return this.request('/api/ollama/version');
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

  // Health check with fallback
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

      // Check if response is HTML (indicates backend is not running)
      const backend = backendResult.status === 'fulfilled' && 
                     backendResult.value.success &&
                     !this.isHtmlResponse(backendResult.value);
                     
      const ollama = ollamaResult.status === 'fulfilled' && 
                    ollamaResult.value.success && 
                    ollamaResult.value.data?.success &&
                    !this.isHtmlResponse(ollamaResult.value);

      return { backend, ollama, timestamp };
    } catch {
      return { backend: false, ollama: false, timestamp };
    }
  }

  private isHtmlResponse(response: any): boolean {
    return typeof response === 'string' && response.includes('<!DOCTYPE html>');
  }

  // Check if backend is available
  async isBackendAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl ? `${this.baseUrl}/api/servers` : '/api/servers', {
        method: 'HEAD',
        timeout: 5000
      } as any);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const backendApi = new BackendApiService();