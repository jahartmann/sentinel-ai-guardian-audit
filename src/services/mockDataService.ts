import { Server, AuditResult } from './backendApiService';

export interface MockSystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  uptime: string;
  loadAverage: string;
  memory: {
    total: string;
    used: string;
    free: string;
    usage_percent: number;
  };
  disk: {
    total: string;
    used: string;
    free: string;
    usage_percent: number;
  };
  cpu: {
    model: string;
    cores: number;
    speed: string;
    usage: number;
  };
  network: {
    connections: Array<{
      protocol: string;
      local_address: string;
      foreign_address: string;
      state: string;
      process?: string;
    }>;
    interfaces: Array<{
      name: string;
      ip: string;
      mac: string;
      status: string;
    }>;
  };
  processes: Array<{
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    user: string;
  }>;
  packages: {
    total: number;
    upgradable: number;
    manager: string;
  };
  security: {
    firewall_status: string;
    ssh_config: any;
    failed_logins: number;
    last_login: string;
  };
}

export class MockDataService {
  private static servers: Server[] = [
    {
      id: 'srv-001',
      name: 'Production Web Server',
      hostname: 'web-prod-01',
      ip: '192.168.1.100',
      port: 22,
      username: 'admin',
      connectionType: 'key',
      status: 'online',
      securityScore: 85,
      lastAudit: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'srv-002',
      name: 'Database Server',
      hostname: 'db-prod-01',
      ip: '192.168.1.101',
      port: 22,
      username: 'dbadmin',
      connectionType: 'password',
      status: 'warning',
      securityScore: 72,
      lastAudit: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'srv-003',
      name: 'Development Server',
      hostname: 'dev-01',
      ip: '192.168.1.102',
      port: 22,
      username: 'developer',
      connectionType: 'key',
      status: 'critical',
      securityScore: 45,
      lastAudit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  private static auditResults: AuditResult[] = [
    {
      id: 'audit-001',
      serverId: 'srv-001',
      serverName: 'Production Web Server',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      scores: {
        overall: 85,
        security: 90,
        performance: 88,
        compliance: 77
      },
      findings: [
        {
          id: 'f-001',
          title: 'SSH Key Management',
          severity: 'medium',
          category: 'Security',
          description: 'SSH keys should be rotated regularly for enhanced security.',
          recommendation: 'Implement a key rotation policy and update SSH keys every 90 days.'
        },
        {
          id: 'f-002',
          title: 'Firewall Configuration',
          severity: 'low',
          category: 'Security',
          description: 'Firewall rules can be optimized for better security.',
          recommendation: 'Review and tighten firewall rules, remove unnecessary open ports.'
        },
        {
          id: 'f-003',
          title: 'System Updates',
          severity: 'info',
          category: 'Performance',
          description: 'System packages are up to date.',
          recommendation: 'Continue regular update schedule to maintain security.'
        }
      ],
      analysis: 'Server shows good overall security posture with room for improvement in key management.',
      model: 'llama3.1:8b',
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000 - 5 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      duration: 5 * 60 * 1000
    },
    {
      id: 'audit-002',
      serverId: 'srv-002',
      serverName: 'Database Server',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      scores: {
        overall: 72,
        security: 68,
        performance: 80,
        compliance: 68
      },
      findings: [
        {
          id: 'f-004',
          title: 'Database Access Controls',
          severity: 'high',
          category: 'Security',
          description: 'Database has overly permissive access controls that could pose security risks.',
          recommendation: 'Implement principle of least privilege for database access and review user permissions.'
        },
        {
          id: 'f-005',
          title: 'Password Policy',
          severity: 'medium',
          category: 'Security',
          description: 'Password policy does not meet current security standards.',
          recommendation: 'Enforce stronger password requirements including length, complexity, and rotation.'
        },
        {
          id: 'f-006',
          title: 'Backup Verification',
          severity: 'critical',
          category: 'Performance',
          description: 'Database backup integrity checks are not performed regularly.',
          recommendation: 'Implement automated backup verification and recovery testing procedures.'
        }
      ],
      analysis: 'Database server requires attention to access controls and backup procedures.',
      model: 'llama3.1:8b',
      startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 7 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 7 * 60 * 1000
    },
    {
      id: 'audit-003',
      serverId: 'srv-003',
      serverName: 'Development Server',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
      scores: {
        overall: 45,
        security: 35,
        performance: 60,
        compliance: 40
      },
      findings: [
        {
          id: 'f-007',
          title: 'Unpatched Vulnerabilities',
          severity: 'critical',
          category: 'Security',
          description: 'Multiple critical security patches are missing from the system.',
          recommendation: 'Immediately apply all available security updates and establish regular patching schedule.'
        },
        {
          id: 'f-008',
          title: 'Weak Authentication',
          severity: 'critical',
          category: 'Security',
          description: 'Default passwords are still in use for several system accounts.',
          recommendation: 'Change all default passwords immediately and implement strong authentication policies.'
        },
        {
          id: 'f-009',
          title: 'Unnecessary Services',
          severity: 'high',
          category: 'Security',
          description: 'Several unnecessary services are running and listening on network ports.',
          recommendation: 'Disable unused services and close unnecessary network ports to reduce attack surface.'
        },
        {
          id: 'f-010',
          title: 'Log Management',
          severity: 'medium',
          category: 'Performance',
          description: 'System logs are not being properly rotated and archived.',
          recommendation: 'Configure proper log rotation and implement centralized log management.'
        }
      ],
      analysis: 'Development server has significant security issues that require immediate attention.',
      model: 'llama3.1:8b',
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 8 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 8 * 60 * 1000
    }
  ];

  private static systemInfoMap: Record<string, MockSystemInfo> = {
    'srv-001': {
      hostname: 'web-prod-01',
      os: 'Ubuntu 22.04.3 LTS',
      kernel: 'Linux 6.2.0-39-generic',
      uptime: '47 days, 13:24:15',
      loadAverage: '0.15, 0.12, 0.08',
      memory: {
        total: '16384 MB',
        used: '8192 MB',
        free: '8192 MB',
        usage_percent: 50
      },
      disk: {
        total: '500 GB',
        used: '125 GB',
        free: '375 GB',
        usage_percent: 25
      },
      cpu: {
        model: 'Intel(R) Xeon(R) CPU E5-2690 v4',
        cores: 8,
        speed: '2.60GHz',
        usage: 15
      },
      network: {
        connections: [
          {
            protocol: 'tcp',
            local_address: '192.168.1.100:80',
            foreign_address: '0.0.0.0:*',
            state: 'LISTEN',
            process: 'nginx'
          },
          {
            protocol: 'tcp',
            local_address: '192.168.1.100:443',
            foreign_address: '0.0.0.0:*',
            state: 'LISTEN',
            process: 'nginx'
          },
          {
            protocol: 'tcp',
            local_address: '192.168.1.100:22',
            foreign_address: '0.0.0.0:*',
            state: 'LISTEN',
            process: 'sshd'
          }
        ],
        interfaces: [
          {
            name: 'eth0',
            ip: '192.168.1.100',
            mac: '00:50:56:c0:00:01',
            status: 'UP'
          }
        ]
      },
      processes: [
        { pid: 1234, name: 'nginx', cpu: 2.5, memory: 1.2, user: 'www-data' },
        { pid: 5678, name: 'php-fpm', cpu: 5.8, memory: 3.4, user: 'www-data' },
        { pid: 9012, name: 'mysql', cpu: 8.2, memory: 12.5, user: 'mysql' }
      ],
      packages: {
        total: 1247,
        upgradable: 3,
        manager: 'apt'
      },
      security: {
        firewall_status: 'active',
        ssh_config: {
          PermitRootLogin: 'no',
          PasswordAuthentication: 'no',
          PubkeyAuthentication: 'yes'
        },
        failed_logins: 2,
        last_login: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    },
    'srv-002': {
      hostname: 'db-prod-01',
      os: 'Ubuntu 20.04.6 LTS',
      kernel: 'Linux 5.15.0-92-generic',
      uptime: '23 days, 8:42:33',
      loadAverage: '0.45, 0.38, 0.42',
      memory: {
        total: '32768 MB',
        used: '24576 MB',
        free: '8192 MB',
        usage_percent: 75
      },
      disk: {
        total: '2000 GB',
        used: '1200 GB',
        free: '800 GB',
        usage_percent: 60
      },
      cpu: {
        model: 'Intel(R) Xeon(R) CPU E5-2690 v4',
        cores: 16,
        speed: '2.60GHz',
        usage: 35
      },
      network: {
        connections: [
          {
            protocol: 'tcp',
            local_address: '192.168.1.101:3306',
            foreign_address: '0.0.0.0:*',
            state: 'LISTEN',
            process: 'mysqld'
          },
          {
            protocol: 'tcp',
            local_address: '192.168.1.101:22',
            foreign_address: '0.0.0.0:*',
            state: 'LISTEN',
            process: 'sshd'
          }
        ],
        interfaces: [
          {
            name: 'eth0',
            ip: '192.168.1.101',
            mac: '00:50:56:c0:00:02',
            status: 'UP'
          }
        ]
      },
      processes: [
        { pid: 2345, name: 'mysqld', cpu: 25.3, memory: 45.6, user: 'mysql' },
        { pid: 6789, name: 'redis-server', cpu: 3.2, memory: 2.1, user: 'redis' }
      ],
      packages: {
        total: 956,
        upgradable: 12,
        manager: 'apt'
      },
      security: {
        firewall_status: 'active',
        ssh_config: {
          PermitRootLogin: 'yes',
          PasswordAuthentication: 'yes',
          PubkeyAuthentication: 'yes'
        },
        failed_logins: 15,
        last_login: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    },
    'srv-003': {
      hostname: 'dev-01',
      os: 'Ubuntu 18.04.6 LTS',
      kernel: 'Linux 5.4.0-150-generic',
      uptime: '5 days, 14:22:11',
      loadAverage: '0.85, 0.72, 0.68',
      memory: {
        total: '8192 MB',
        used: '6144 MB',
        free: '2048 MB',
        usage_percent: 75
      },
      disk: {
        total: '100 GB',
        used: '85 GB',
        free: '15 GB',
        usage_percent: 85
      },
      cpu: {
        model: 'Intel(R) Core(TM) i5-8250U',
        cores: 4,
        speed: '1.60GHz',
        usage: 65
      },
      network: {
        connections: [
          {
            protocol: 'tcp',
            local_address: '192.168.1.102:3000',
            foreign_address: '0.0.0.0:*',
            state: 'LISTEN',
            process: 'node'
          },
          {
            protocol: 'tcp',
            local_address: '192.168.1.102:8080',
            foreign_address: '0.0.0.0:*',
            state: 'LISTEN',
            process: 'java'
          },
          {
            protocol: 'tcp',
            local_address: '192.168.1.102:22',
            foreign_address: '0.0.0.0:*',
            state: 'LISTEN',
            process: 'sshd'
          }
        ],
        interfaces: [
          {
            name: 'eth0',
            ip: '192.168.1.102',
            mac: '00:50:56:c0:00:03',
            status: 'UP'
          }
        ]
      },
      processes: [
        { pid: 3456, name: 'node', cpu: 15.7, memory: 8.9, user: 'developer' },
        { pid: 7890, name: 'java', cpu: 35.2, memory: 25.3, user: 'developer' },
        { pid: 1122, name: 'docker', cpu: 12.1, memory: 15.7, user: 'root' }
      ],
      packages: {
        total: 2341,
        upgradable: 125,
        manager: 'apt'
      },
      security: {
        firewall_status: 'inactive',
        ssh_config: {
          PermitRootLogin: 'yes',
          PasswordAuthentication: 'yes',
          PubkeyAuthentication: 'yes'
        },
        failed_logins: 45,
        last_login: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    }
  };

  static generateNetworkAnomalies() {
    return [
      {
        id: 'anomaly-001',
        type: 'suspicious_country',
        severity: 'high',
        description: 'Multiple connection attempts from suspicious countries detected',
        details: {
          countries: ['Unknown', 'China', 'Russia'],
          attempts: 45,
          timeframe: '24 hours'
        },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'anomaly-002',
        type: 'brute_force',
        severity: 'critical',
        description: 'SSH brute force attack detected',
        details: {
          source_ip: '203.0.113.42',
          attempts: 127,
          timeframe: '1 hour',
          target_port: 22
        },
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        id: 'anomaly-003',
        type: 'port_scan',
        severity: 'medium',
        description: 'Port scanning activity detected',
        details: {
          source_ip: '198.51.100.25',
          ports_scanned: [21, 22, 23, 80, 443, 3389],
          timeframe: '15 minutes'
        },
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
      }
    ];
  }

  static generateNetworkConnections() {
    return [
      {
        protocol: 'TCP',
        local_address: '192.168.1.100:80',
        foreign_address: '203.0.113.10:54321',
        state: 'ESTABLISHED',
        process: 'nginx',
        country: 'Germany'
      },
      {
        protocol: 'TCP',
        local_address: '192.168.1.100:443',
        foreign_address: '198.51.100.15:42156',
        state: 'ESTABLISHED',
        process: 'nginx',
        country: 'United States'
      },
      {
        protocol: 'TCP',
        local_address: '192.168.1.101:3306',
        foreign_address: '192.168.1.100:51234',
        state: 'ESTABLISHED',
        process: 'mysqld',
        country: 'Local'
      },
      {
        protocol: 'TCP',
        local_address: '192.168.1.102:22',
        foreign_address: '203.0.113.42:31337',
        state: 'SYN_RECV',
        process: 'sshd',
        country: 'Unknown'
      }
    ];
  }

  static generatePortUsage() {
    return [
      { port: 80, service: 'HTTP', connections: 45, status: 'normal' },
      { port: 443, service: 'HTTPS', connections: 78, status: 'normal' },
      { port: 22, service: 'SSH', connections: 12, status: 'warning' },
      { port: 3306, service: 'MySQL', connections: 8, status: 'normal' },
      { port: 3000, service: 'Node.js', connections: 3, status: 'normal' },
      { port: 8080, service: 'Java App', connections: 15, status: 'normal' }
    ];
  }

  static getServers(): Promise<Server[]> {
    return Promise.resolve([...this.servers]);
  }

  static getAuditResults(): Promise<AuditResult[]> {
    return Promise.resolve([...this.auditResults]);
  }

  static getSystemInfo(serverId: string): Promise<MockSystemInfo | null> {
    return Promise.resolve(this.systemInfoMap[serverId] || null);
  }

  static addServer(server: Omit<Server, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Server> {
    const newServer: Server = {
      ...server,
      id: `srv-${String(this.servers.length + 1).padStart(3, '0')}`,
      status: 'offline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.servers.push(newServer);
    return Promise.resolve(newServer);
  }

  static removeServer(serverId: string): Promise<void> {
    this.servers = this.servers.filter(s => s.id !== serverId);
    return Promise.resolve();
  }

  static async startAudit(serverId: string, model: string): Promise<AuditResult> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error('Server not found');

    const auditId = `audit-${Date.now()}`;
    const audit: AuditResult = {
      id: auditId,
      serverId,
      serverName: server.name,
      timestamp: new Date().toISOString(),
      status: 'starting',
      scores: { overall: 0, security: 0, performance: 0, compliance: 0 },
      findings: [],
      model,
      startTime: new Date().toISOString()
    };

    // Simulate audit progress
    setTimeout(() => {
      const completedAudit: AuditResult = {
        ...audit,
        status: 'completed',
        scores: {
          overall: Math.floor(Math.random() * 40) + 60,
          security: Math.floor(Math.random() * 40) + 60,
          performance: Math.floor(Math.random() * 40) + 60,
          compliance: Math.floor(Math.random() * 40) + 60
        },
        findings: [
          {
            id: `f-${Date.now()}-1`,
            title: 'System Configuration Review',
            severity: Math.random() > 0.5 ? 'medium' : 'low',
            category: 'Security',
            description: 'System configuration has been analyzed for security compliance.',
            recommendation: 'Continue monitoring system configuration changes.'
          }
        ],
        endTime: new Date().toISOString(),
        duration: 5 * 60 * 1000
      };
      
      this.auditResults.unshift(completedAudit);
    }, 5000);

    this.auditResults.unshift(audit);
    return audit;
  }
}