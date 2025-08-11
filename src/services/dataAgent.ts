// Fast Data Agent - Sofortige Datenbereitstellung ohne Backend-Abhängigkeiten
import { AuditResult, Server } from './backendApiService';
import { MockSystemInfo } from './mockDataService';

export interface FastAuditData {
  id: string;
  serverId: string;
  serverName: string;
  timestamp: string;
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
    status: 'open' | 'resolved' | 'in_progress';
    cve?: string;
  }>;
  systemInfo: {
    os: string;
    uptime: string;
    loadAverage: string;
    memoryUsage: string;
    diskUsage: string;
    networkConnections: number;
    runningProcesses: number;
  };
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

class DataAgent {
  private static instance: DataAgent;
  private servers: Map<string, Server> = new Map();
  private audits: Map<string, FastAuditData> = new Map();
  private systemInfos: Map<string, MockSystemInfo> = new Map();

  private constructor() {
    this.initializeMockData();
  }

  public static getInstance(): DataAgent {
    if (!DataAgent.instance) {
      DataAgent.instance = new DataAgent();
    }
    return DataAgent.instance;
  }

  private initializeMockData() {
    // Mock Server-Daten
    const mockServers: Server[] = [
      {
        id: 'server-001',
        name: 'Production Web Server',
        hostname: 'web-prod-01',
        ip: '192.168.1.100',
        port: 22,
        username: 'admin',
        connectionType: 'key',
        status: 'connected',
        createdAt: new Date('2024-01-15').toISOString(),
        updatedAt: new Date().toISOString(),
        lastAudit: new Date().toISOString(),
        securityScore: 85
      },
      {
        id: 'server-002',
        name: 'Database Server',
        hostname: 'db-prod-01',
        ip: '192.168.1.101',
        port: 22,
        username: 'dbadmin',
        connectionType: 'key',
        status: 'connected',
        createdAt: new Date('2024-01-20').toISOString(),
        updatedAt: new Date().toISOString(),
        lastAudit: new Date().toISOString(),
        securityScore: 92
      },
      {
        id: 'server-003',
        name: 'File Server',
        hostname: 'file-srv-01',
        ip: '192.168.1.102',
        port: 22,
        username: 'fileadmin',
        connectionType: 'key',
        status: 'offline',
        createdAt: new Date('2024-02-01').toISOString(),
        updatedAt: new Date().toISOString(),
        lastAudit: new Date('2024-07-25').toISOString(),
        securityScore: 67
      }
    ];

    mockServers.forEach(server => {
      this.servers.set(server.id, server);
      this.generateAuditData(server);
      this.generateSystemInfo(server.id);
    });
  }

  private generateAuditData(server: Server) {
    const findings = this.generateFindings(server.id);
    const vulnerabilities = {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length
    };

    const auditData: FastAuditData = {
      id: `audit-${server.id}-${Date.now()}`,
      serverId: server.id,
      serverName: server.name,
      timestamp: new Date().toISOString(),
      scores: {
        overall: server.securityScore || 75,
        security: server.securityScore || 75,
        performance: Math.min(100, (server.securityScore || 75) + 10),
        compliance: Math.max(60, (server.securityScore || 75) - 5)
      },
      findings,
      systemInfo: {
        os: server.hostname.includes('db') ? 'Ubuntu 22.04 LTS' : 'CentOS 8',
        uptime: this.randomUptime(),
        loadAverage: this.randomLoadAverage(),
        memoryUsage: this.randomMemoryUsage(),
        diskUsage: this.randomDiskUsage(),
        networkConnections: Math.floor(Math.random() * 100) + 20,
        runningProcesses: Math.floor(Math.random() * 200) + 80
      },
      vulnerabilities
    };

    this.audits.set(server.id, auditData);
  }

  private generateFindings(serverId: string): FastAuditData['findings'] {
    const baseFindings = [
      {
        id: `${serverId}-finding-1`,
        title: 'Schwache SSH-Konfiguration',
        severity: 'high' as const,
        category: 'Network Security',
        description: 'SSH-Server erlaubt unsichere Authentifizierungsmethoden',
        recommendation: 'Deaktivieren Sie Passwort-Authentifizierung und verwenden Sie nur Schlüssel',
        status: 'open' as const,
        cve: 'CVE-2023-1234'
      },
      {
        id: `${serverId}-finding-2`,
        title: 'Veraltete Software-Pakete',
        severity: 'medium' as const,
        category: 'System Security',
        description: 'Mehrere installierte Pakete haben verfügbare Sicherheitsupdates',
        recommendation: 'Führen Sie regelmäßige System-Updates durch',
        status: 'open' as const
      },
      {
        id: `${serverId}-finding-3`,
        title: 'Firewall-Konfiguration',
        severity: 'low' as const,
        category: 'Network Security',
        description: 'Firewall-Regeln könnten restriktiver konfiguriert werden',
        recommendation: 'Überprüfen und optimieren Sie die Firewall-Regeln',
        status: 'in_progress' as const
      }
    ];

    if (serverId === 'server-003') {
      baseFindings.push({
        id: `${serverId}-finding-4`,
        title: 'Kritische Sicherheitslücke',
        severity: 'high' as const,
        category: 'System Security',
        description: 'Bekannte Schwachstelle in der Kernel-Version',
        recommendation: 'Sofortiges Kernel-Update erforderlich',
        status: 'open' as const,
        cve: 'CVE-2023-5678'
      });
    }

    return baseFindings;
  }

  private generateSystemInfo(serverId: string) {
    const server = this.servers.get(serverId);
    const systemInfo: MockSystemInfo = {
      hostname: server?.hostname || `host-${serverId}`,
      os: serverId.includes('db') ? 'Ubuntu 22.04 LTS' : 'CentOS 8',
      kernel: '5.15.0-89-generic',
      uptime: this.randomUptime(),
      loadAverage: this.randomLoadAverage(),
      memory: {
        total: '16GB',
        used: `${Math.floor(Math.random() * 12) + 4}GB`,
        free: `${Math.floor(Math.random() * 8) + 2}GB`,
        usage_percent: Math.floor(Math.random() * 60) + 20
      },
      disk: {
        total: '500GB',
        used: `${Math.floor(Math.random() * 300) + 100}GB`,
        free: '250GB',
        usage_percent: Math.floor(Math.random() * 60) + 20
      },
      cpu: {
        model: 'Intel(R) Xeon(R) CPU',
        cores: 8,
        speed: '2.60GHz',
        usage: Math.floor(Math.random() * 80)
      },
      network: {
        connections: Array.from({ length: Math.floor(Math.random() * 20) + 10 }, (_, i) => ({
          protocol: 'tcp',
          local_address: `192.168.1.${100 + i}:${8000 + i}`,
          foreign_address: `10.0.0.${i + 1}:443`,
          state: 'ESTABLISHED',
          process: ['nginx', 'mysql', 'apache2', 'sshd'][i % 4]
        })),
        interfaces: [
          {
            name: 'eth0',
            ip: `192.168.1.${100 + Math.floor(Math.random() * 50)}`,
            mac: '00:50:56:aa:bb:cc',
            status: 'UP'
          }
        ]
      },
      processes: Array.from({ length: Math.floor(Math.random() * 50) + 30 }, (_, i) => ({
        pid: 1000 + i,
        name: ['nginx', 'mysql', 'apache2', 'sshd', 'systemd'][i % 5],
        cpu: Math.floor(Math.random() * 20),
        memory: Math.floor(Math.random() * 10),
        user: ['root', 'www-data', 'mysql', 'admin'][i % 4]
      })),
      packages: {
        total: Math.floor(Math.random() * 2000) + 800,
        upgradable: Math.floor(Math.random() * 50),
        manager: 'apt'
      },
      security: {
        firewall_status: 'active',
        ssh_config: {
          PermitRootLogin: 'no',
          PasswordAuthentication: 'no',
          PubkeyAuthentication: 'yes'
        },
        failed_logins: Math.floor(Math.random() * 20),
        last_login: new Date(Date.now() - Math.floor(Math.random() * 6) * 60 * 60 * 1000).toISOString()
      }
    };

    this.systemInfos.set(serverId, systemInfo);
  }

  private randomUptime(): string {
    const days = Math.floor(Math.random() * 365);
    const hours = Math.floor(Math.random() * 24);
    return `${days} Tage, ${hours} Stunden`;
  }

  private randomLoadAverage(): string {
    return `${(Math.random() * 2).toFixed(2)}, ${(Math.random() * 2).toFixed(2)}, ${(Math.random() * 2).toFixed(2)}`;
  }

  private randomMemoryUsage(): string {
    const used = Math.floor(Math.random() * 12) + 4;
    return `${used}GB / 16GB`;
  }

  private randomDiskUsage(): string {
    const percent = Math.floor(Math.random() * 60) + 20;
    const used = Math.floor(500 * percent / 100);
    return `${percent}% (${used}GB / 500GB)`;
  }

  // Öffentliche API
  public getAllServers(): Server[] {
    return Array.from(this.servers.values());
  }

  public getServer(serverId: string): Server | null {
    return this.servers.get(serverId) || null;
  }

  public getAuditData(serverId: string): FastAuditData | null {
    return this.audits.get(serverId) || null;
  }

  public getSystemInfo(serverId: string): MockSystemInfo | null {
    return this.systemInfos.get(serverId) || null;
  }

  public getAllAudits(): FastAuditData[] {
    return Array.from(this.audits.values());
  }

  public addServer(serverData: Omit<Server, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Server {
    const newServer: Server = {
      ...serverData,
      id: `server-${Date.now()}`,
      port: serverData.port || 22,
      connectionType: serverData.connectionType || 'key',
      status: 'offline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      securityScore: 0
    };

    this.servers.set(newServer.id, newServer);
    this.generateAuditData(newServer);
    this.generateSystemInfo(newServer.id);

    return newServer;
  }

  public removeServer(serverId: string): void {
    this.servers.delete(serverId);
    this.audits.delete(serverId);
    this.systemInfos.delete(serverId);
  }

  public startAudit(serverId: string): FastAuditData | null {
    const server = this.servers.get(serverId);
    if (!server) return null;

    // Simuliere neuen Audit
    this.generateAuditData(server);
    server.lastAudit = new Date().toISOString();
    server.updatedAt = new Date().toISOString();

    return this.audits.get(serverId) || null;
  }
}

export const dataAgent = DataAgent.getInstance();