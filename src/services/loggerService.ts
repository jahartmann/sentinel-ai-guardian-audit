export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';
export type LogCategory = 'ssh' | 'ollama' | 'network' | 'audit' | 'system' | 'ui' | 'general';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  error?: Error;
  stack?: string;
  context?: Record<string, any>;
  sessionId: string;
}

export interface LoggerConfig {
  maxEntries: number;
  enableConsole: boolean;
  enableStorage: boolean;
  logLevel: LogLevel;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private sessionId: string;
  private config: LoggerConfig;
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.config = {
      maxEntries: 1000,
      enableConsole: true,
      enableStorage: true,
      logLevel: 'info'
    };
    
    this.loadPersistedLogs();
    this.setupErrorHandlers();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupErrorHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.error('system', 'Global JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.error('system', 'Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  private loadPersistedLogs(): void {
    if (!this.config.enableStorage) return;
    
    try {
      const stored = localStorage.getItem('system_logs');
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        // Nur Logs der letzten 24 Stunden laden
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.logs = parsedLogs.filter((log: LogEntry) => 
          new Date(log.timestamp).getTime() > dayAgo
        );
      }
    } catch (error) {
      console.warn('Failed to load persisted logs:', error);
    }
  }

  private persistLogs(): void {
    if (!this.config.enableStorage) return;
    
    try {
      localStorage.setItem('system_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.warn('Failed to persist logs:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4
    };
    
    return levels[level] >= levels[this.config.logLevel];
  }

  private addLog(level: LogLevel, category: LogCategory, message: string, details?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      error,
      stack: error?.stack,
      context: this.gatherContext(),
      sessionId: this.sessionId
    };

    this.logs.push(logEntry);

    // Limit log entries
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry);
    }

    // Persist logs
    this.persistLogs();

    // Notify listeners
    this.notifyListeners();
  }

  private gatherContext(): Record<string, any> {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      memoryUsage: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : undefined
    };
  }

  private outputToConsole(entry: LogEntry): void {
    const style = this.getConsoleStyle(entry.level);
    const prefix = `[${entry.level.toUpperCase()}] [${entry.category}] ${entry.timestamp}`;
    
    switch (entry.level) {
      case 'error':
        console.error(`%c${prefix}`, style, entry.message, entry.details || '', entry.error || '');
        break;
      case 'warn':
        console.warn(`%c${prefix}`, style, entry.message, entry.details || '');
        break;
      case 'debug':
        console.debug(`%c${prefix}`, style, entry.message, entry.details || '');
        break;
      case 'trace':
        console.trace(`%c${prefix}`, style, entry.message, entry.details || '');
        break;
      default:
        console.log(`%c${prefix}`, style, entry.message, entry.details || '');
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      trace: 'color: #9CA3AF; font-size: 11px;',
      debug: 'color: #6B7280; font-size: 11px;',
      info: 'color: #3B82F6; font-weight: bold;',
      warn: 'color: #F59E0B; font-weight: bold;',
      error: 'color: #EF4444; font-weight: bold; background: #FEE2E2; padding: 2px 4px;'
    };
    return styles[level];
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.logs]);
      } catch (error) {
        console.error('Error notifying log listener:', error);
      }
    });
  }

  // Public methods
  trace(category: LogCategory, message: string, details?: any): void {
    this.addLog('trace', category, message, details);
  }

  debug(category: LogCategory, message: string, details?: any): void {
    this.addLog('debug', category, message, details);
  }

  info(category: LogCategory, message: string, details?: any): void {
    this.addLog('info', category, message, details);
  }

  warn(category: LogCategory, message: string, details?: any): void {
    this.addLog('warn', category, message, details);
  }

  error(category: LogCategory, message: string, details?: any, error?: Error): void {
    this.addLog('error', category, message, details, error);
  }

  // SSH-specific logging methods
  sshConnect(server: string, details?: any): void {
    this.info('ssh', `🔌 Initiating SSH connection to ${server}`, { 
      ...details, 
      protocol: 'SSH',
      timestamp: Date.now()
    });
  }

  sshConnectSuccess(server: string, details?: any): void {
    this.info('ssh', `✅ SSH connection established to ${server}`, { 
      ...details, 
      success: true,
      timestamp: Date.now()
    });
  }

  sshConnectFailed(server: string, error: Error, details?: any): void {
    this.error('ssh', `❌ SSH connection failed to ${server}`, { 
      ...details, 
      errorName: error.name,
      errorMessage: error.message,
      timestamp: Date.now()
    }, error);
  }

  sshCommand(server: string, command: string, details?: any): void {
    this.debug('ssh', `💻 Executing SSH command on ${server}: ${command}`, { 
      ...details, 
      command,
      timestamp: Date.now()
    });
  }

  sshKeyExchange(server: string, details?: any): void {
    this.info('ssh', `🔑 SSH key exchange with ${server}`, { 
      ...details, 
      phase: 'key_exchange',
      timestamp: Date.now()
    });
  }

  sshFingerprint(server: string, fingerprint: string, accepted: boolean): void {
    this.info('ssh', `🔐 SSH fingerprint ${accepted ? 'accepted' : 'rejected'} for ${server}`, { 
      fingerprint, 
      accepted,
      timestamp: Date.now()
    });
  }

  sshDataCollection(server: string, phase: string, details?: any): void {
    this.debug('ssh', `📊 Data collection ${phase} on ${server}`, { 
      ...details, 
      phase,
      timestamp: Date.now()
    });
  }

  // Ollama-specific logging methods
  ollamaConnect(url: string): void {
    this.info('ollama', `🤖 Testing Ollama connection to ${url}`, { 
      url, 
      timestamp: Date.now(),
      action: 'connection_test'
    });
  }

  ollamaConnectSuccess(url: string, models?: string[]): void {
    this.info('ollama', `✅ Ollama connection successful to ${url}`, { 
      url, 
      models, 
      modelCount: models?.length || 0,
      timestamp: Date.now()
    });
  }

  ollamaConnectFailed(url: string, error: Error): void {
    this.error('ollama', `❌ Ollama connection failed to ${url}`, { 
      url, 
      errorType: error.name,
      timestamp: Date.now()
    }, error);
  }

  ollamaGenerate(model: string, prompt: string): void {
    this.debug('ollama', `🧠 Generating response with model ${model}`, { 
      model, 
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      timestamp: Date.now()
    });
  }

  ollamaCorsIssue(url: string): void {
    this.warn('ollama', `🚫 CORS issue detected with Ollama at ${url}`, { 
      url, 
      issue: 'cors_blocked',
      solution: 'Set OLLAMA_ORIGINS environment variable',
      timestamp: Date.now()
    });
  }

  // Network-specific logging methods
  networkScan(range: string): void {
    this.info('network', `Starting network scan for range ${range}`);
  }

  networkScanResult(hosts: number, time: number): void {
    this.info('network', `Network scan completed: ${hosts} hosts found in ${time}ms`);
  }

  networkAnomaly(type: string, severity: string, description: string): void {
    this.warn('network', `Network anomaly detected: ${type}`, { severity, description });
  }

  // Audit-specific logging methods
  auditStart(serverId: string): void {
    this.info('audit', `Starting security audit for server ${serverId}`);
  }

  auditComplete(serverId: string, score: number, findings: number): void {
    this.info('audit', `Security audit completed for server ${serverId}`, { score, findings });
  }

  auditFailed(serverId: string, error: Error): void {
    this.error('audit', `Security audit failed for server ${serverId}`, {}, error);
  }

  // Utility methods
  getLogs(category?: LogCategory, level?: LogLevel): LogEntry[] {
    let filtered = [...this.logs];
    
    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }
    
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  clearLogs(): void {
    this.logs = [];
    this.persistLogs();
    this.notifyListeners();
  }

  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      logs: this.logs
    }, null, 2);
  }

  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getSessionId(): string {
    return this.sessionId;
  }

  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const logger = new LoggerService();

// Export hook for React components
export const useLogger = () => {
  return logger;
};