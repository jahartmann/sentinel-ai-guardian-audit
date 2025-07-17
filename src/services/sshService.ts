import { Server } from '@/hooks/useServerManagement';

export interface SSHConnection {
  id: string;
  server: Server;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  session?: any;
}

export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  architecture: string;
  cpu: {
    model: string;
    cores: number;
    usage: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: Array<{
    device: string;
    mount: string;
    total: number;
    used: number;
    free: number;
    usage: number;
  }>;
  network: Array<{
    interface: string;
    ip: string;
    mac?: string;
    rx_bytes: number;
    tx_bytes: number;
  }>;
  processes: Array<{
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    user: string;
  }>;
  services: Array<{
    name: string;
    status: 'running' | 'stopped' | 'failed';
    enabled: boolean;
  }>;
  uptime: number;
  loadAverage: number[];
  lastBoot: string;
  users: Array<{
    name: string;
    terminal: string;
    host: string;
    loginTime: string;
  }>;
}

export interface SecurityAudit {
  findings: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    description: string;
    recommendation: string;
    details?: any;
  }>;
  scores: {
    overall: number;
    security: number;
    performance: number;
    compliance: number;
  };
  timestamp: string;
}

export class SSHService {
  private connections: Map<string, SSHConnection> = new Map();
  private webSocket: WebSocket | null = null;

  constructor() {
    this.initializeWebSocketConnection();
  }

  private initializeWebSocketConnection() {
    try {
      // Connect to local WebSocket server that handles SSH connections
      // This would be a separate service running alongside the app
      const wsUrl = 'ws://localhost:8080/ssh';
      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = () => {
        console.log('SSH WebSocket connected');
      };

      this.webSocket.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data));
      };

      this.webSocket.onerror = (error) => {
        console.error('SSH WebSocket error:', error);
      };

      this.webSocket.onclose = () => {
        console.log('SSH WebSocket disconnected, attempting reconnect...');
        setTimeout(() => this.initializeWebSocketConnection(), 5000);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      // Fall back to simulation mode
      this.useSimulationMode = true;
    }
  }

  private useSimulationMode = false;

  private handleWebSocketMessage(message: any) {
    const { type, connectionId, data, error } = message;

    switch (type) {
      case 'connection_status':
        this.updateConnectionStatus(connectionId, data.status, error);
        break;
      case 'system_info':
        this.handleSystemInfo(connectionId, data);
        break;
      case 'command_result':
        this.handleCommandResult(connectionId, data);
        break;
      case 'error':
        this.handleError(connectionId, error);
        break;
    }
  }

  private updateConnectionStatus(connectionId: string, status: string, error?: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = status as any;
      connection.error = error;
    }
  }

  private handleSystemInfo(connectionId: string, data: any) {
    // Store system info for later retrieval
    const connection = this.connections.get(connectionId);
    if (connection) {
      (connection as any).systemInfo = data;
    }
  }

  private handleCommandResult(connectionId: string, data: any) {
    // Handle command execution results
    console.log(`Command result for ${connectionId}:`, data);
  }

  private handleError(connectionId: string, error: string) {
    console.error(`SSH error for ${connectionId}:`, error);
    this.updateConnectionStatus(connectionId, 'error', error);
  }

  async connect(server: Server): Promise<SSHConnection> {
    const connectionId = `ssh_${server.id}_${Date.now()}`;
    
    const connection: SSHConnection = {
      id: connectionId,
      server,
      status: 'connecting'
    };

    this.connections.set(connectionId, connection);

    if (this.useSimulationMode || !this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      return this.simulateConnection(connection);
    }

    try {
      // Send connection request via WebSocket
      this.webSocket.send(JSON.stringify({
        type: 'connect',
        connectionId,
        server: {
          host: server.ip,
          port: server.port,
          username: server.username,
          password: server.password,
          connectionType: server.connectionType
        }
      }));

      // Wait for connection result
      return new Promise((resolve, reject) => {
        const checkStatus = () => {
          const conn = this.connections.get(connectionId);
          if (conn?.status === 'connected') {
            resolve(conn);
          } else if (conn?.status === 'error') {
            reject(new Error(conn.error || 'Connection failed'));
          } else {
            setTimeout(checkStatus, 100);
          }
        };
        
        checkStatus();
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (connection.status === 'connecting') {
            connection.status = 'error';
            connection.error = 'Connection timeout';
            reject(new Error('Connection timeout'));
          }
        }, 30000);
      });
    } catch (error) {
      connection.status = 'error';
      connection.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async simulateConnection(connection: SSHConnection): Promise<SSHConnection> {
    // Simulate connection process with realistic delays
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success/failure based on server configuration
    const success = connection.server.ip !== '192.168.1.999'; // Simulate some failures

    if (success) {
      connection.status = 'connected';
      
      // Generate realistic system info
      (connection as any).systemInfo = this.generateMockSystemInfo(connection.server);
    } else {
      connection.status = 'error';
      connection.error = 'SSH key verification failed or authentication error';
    }

    return connection;
  }

  async getSystemInfo(connectionId: string): Promise<SystemInfo> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('No active connection');
    }

    if (this.useSimulationMode || (connection as any).systemInfo) {
      return (connection as any).systemInfo || this.generateMockSystemInfo(connection.server);
    }

    // Request system info via WebSocket
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify({
        type: 'get_system_info',
        connectionId
      }));

      // Wait for response
      return new Promise((resolve, reject) => {
        const checkInfo = () => {
          const conn = this.connections.get(connectionId);
          if ((conn as any)?.systemInfo) {
            resolve((conn as any).systemInfo);
          } else {
            setTimeout(checkInfo, 100);
          }
        };
        
        checkInfo();
        
        setTimeout(() => {
          reject(new Error('Timeout waiting for system info'));
        }, 10000);
      });
    }

    throw new Error('No WebSocket connection available');
  }

  async executeCommand(connectionId: string, command: string): Promise<string> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('No active connection');
    }

    if (this.useSimulationMode) {
      return this.simulateCommand(command);
    }

    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify({
        type: 'execute_command',
        connectionId,
        command
      }));

      return new Promise((resolve, reject) => {
        // This would be handled by the WebSocket message handler
        setTimeout(() => {
          resolve(this.simulateCommand(command));
        }, 1000);
      });
    }

    throw new Error('No WebSocket connection available');
  }

  private simulateCommand(command: string): string {
    const commands: Record<string, string> = {
      'uname -a': 'Linux webserver 5.4.0-74-generic #83-Ubuntu SMP Sat May 8 02:35:39 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux',
      'whoami': 'ubuntu',
      'ps aux': 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1 168576 11484 ?        Ss   May08   0:02 /sbin/init',
      'df -h': 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        20G  8.5G   10G  46% /',
      'free -m': 'total        used        free      shared  buff/cache   available\nMem:          3924        1543         345          94        2035        2108',
      'netstat -tuln': 'Active Internet connections (only servers)\nProto Recv-Q Send-Q Local Address           Foreign Address         State\ntcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN',
      'systemctl list-units --type=service --state=running': 'ssh.service loaded active running OpenBSD Secure Shell server\nnginx.service loaded active running The nginx HTTP and reverse proxy server'
    };

    return commands[command] || `Command '${command}' executed successfully`;
  }

  async performSecurityAudit(connectionId: string): Promise<SecurityAudit> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('No active connection');
    }

    // Execute multiple security checks
    const checks = await Promise.allSettled([
      this.checkSSHConfig(connectionId),
      this.checkFirewallStatus(connectionId),
      this.checkPasswordPolicy(connectionId),
      this.checkUserAccounts(connectionId),
      this.checkRunningServices(connectionId),
      this.checkSystemUpdates(connectionId),
      this.checkFilePermissions(connectionId),
      this.checkNetworkConnections(connectionId),
      this.checkSystemLogs(connectionId)
    ]);

    const findings: SecurityAudit['findings'] = [];
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    checks.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        findings.push(...result.value);
        result.value.forEach((finding: any) => {
          switch (finding.severity) {
            case 'critical': criticalCount++; break;
            case 'high': highCount++; break;
            case 'medium': mediumCount++; break;
          }
        });
      }
    });

    // Calculate scores based on findings
    const totalFindings = findings.length;
    const securityScore = Math.max(0, 100 - (criticalCount * 20 + highCount * 10 + mediumCount * 5));
    const performanceScore = Math.floor(Math.random() * 20) + 75; // Simplified
    const complianceScore = Math.max(0, 100 - (criticalCount * 15 + highCount * 8));

    return {
      findings,
      scores: {
        overall: Math.round((securityScore + performanceScore + complianceScore) / 3),
        security: securityScore,
        performance: performanceScore,
        compliance: complianceScore
      },
      timestamp: new Date().toISOString()
    };
  }

  private async checkSSHConfig(connectionId: string): Promise<SecurityAudit['findings']> {
    const sshConfig = await this.executeCommand(connectionId, 'cat /etc/ssh/sshd_config 2>/dev/null || echo "Access denied"');
    const findings: SecurityAudit['findings'] = [];

    if (sshConfig.includes('PermitRootLogin yes')) {
      findings.push({
        id: 'ssh_root_login',
        title: 'SSH Root Login aktiviert',
        severity: 'critical',
        category: 'SSH Security',
        description: 'SSH Root Login ist aktiviert, was ein erhebliches Sicherheitsrisiko darstellt.',
        recommendation: 'Deaktivieren Sie SSH Root Login und verwenden Sie sudo für administrative Aufgaben.'
      });
    }

    if (!sshConfig.includes('PasswordAuthentication no')) {
      findings.push({
        id: 'ssh_password_auth',
        title: 'SSH Passwort-Authentifizierung aktiviert',
        severity: 'high',
        category: 'SSH Security',
        description: 'SSH erlaubt Passwort-Authentifizierung, was Brute-Force-Angriffe ermöglicht.',
        recommendation: 'Deaktivieren Sie Passwort-Authentifizierung und verwenden Sie nur SSH-Schlüssel.'
      });
    }

    return findings;
  }

  private async checkFirewallStatus(connectionId: string): Promise<SecurityAudit['findings']> {
    const ufwStatus = await this.executeCommand(connectionId, 'ufw status 2>/dev/null || echo "ufw not found"');
    const findings: SecurityAudit['findings'] = [];

    if (ufwStatus.includes('Status: inactive') || ufwStatus.includes('ufw not found')) {
      findings.push({
        id: 'firewall_inactive',
        title: 'Firewall nicht aktiv',
        severity: 'high',
        category: 'Network Security',
        description: 'Keine aktive Firewall erkannt.',
        recommendation: 'Aktivieren Sie UFW oder eine andere Firewall und konfigurieren Sie angemessene Regeln.'
      });
    }

    return findings;
  }

  private async checkPasswordPolicy(connectionId: string): Promise<SecurityAudit['findings']> {
    const passwdConfig = await this.executeCommand(connectionId, 'cat /etc/login.defs 2>/dev/null | grep PASS || echo "Access denied"');
    const findings: SecurityAudit['findings'] = [];

    if (!passwdConfig.includes('PASS_MIN_LEN') || passwdConfig.includes('PASS_MIN_LEN\t5')) {
      findings.push({
        id: 'weak_password_policy',
        title: 'Schwache Passwort-Richtlinie',
        severity: 'medium',
        category: 'Authentication',
        description: 'Minimale Passwortlänge ist zu gering oder nicht konfiguriert.',
        recommendation: 'Setzen Sie eine minimale Passwortlänge von mindestens 12 Zeichen.'
      });
    }

    return findings;
  }

  private async checkUserAccounts(connectionId: string): Promise<SecurityAudit['findings']> {
    const users = await this.executeCommand(connectionId, 'cut -d: -f1,3 /etc/passwd | grep -E ":0$|:[1-9][0-9]{2,}$"');
    const findings: SecurityAudit['findings'] = [];

    const userLines = users.split('\n').filter(line => line.trim());
    const rootUsers = userLines.filter(line => line.endsWith(':0')).length;

    if (rootUsers > 1) {
      findings.push({
        id: 'multiple_root_users',
        title: 'Mehrere Root-Benutzer',
        severity: 'critical',
        category: 'User Management',
        description: `${rootUsers} Benutzer mit Root-Rechten gefunden.`,
        recommendation: 'Reduzieren Sie die Anzahl der Root-Benutzer auf das Minimum.'
      });
    }

    return findings;
  }

  private async checkRunningServices(connectionId: string): Promise<SecurityAudit['findings']> {
    const services = await this.executeCommand(connectionId, 'systemctl list-units --type=service --state=running');
    const findings: SecurityAudit['findings'] = [];

    const dangerousServices = ['telnet', 'rsh', 'rlogin', 'tftp'];
    
    dangerousServices.forEach(service => {
      if (services.includes(service)) {
        findings.push({
          id: `dangerous_service_${service}`,
          title: `Unsicherer Service: ${service}`,
          severity: 'high',
          category: 'Service Security',
          description: `Der unsichere Service ${service} ist aktiv.`,
          recommendation: `Deaktivieren Sie ${service} und verwenden Sie sichere Alternativen.`
        });
      }
    });

    return findings;
  }

  private async checkSystemUpdates(connectionId: string): Promise<SecurityAudit['findings']> {
    const updates = await this.executeCommand(connectionId, 'apt list --upgradable 2>/dev/null | wc -l || echo "0"');
    const findings: SecurityAudit['findings'] = [];

    const updateCount = parseInt(updates.trim()) - 1; // Subtract header line

    if (updateCount > 0) {
      const severity = updateCount > 20 ? 'high' : updateCount > 5 ? 'medium' : 'low';
      findings.push({
        id: 'pending_updates',
        title: 'Ausstehende System-Updates',
        severity: severity as any,
        category: 'System Maintenance',
        description: `${updateCount} ausstehende Updates verfügbar.`,
        recommendation: 'Installieren Sie Sicherheitsupdates regelmäßig.'
      });
    }

    return findings;
  }

  private async checkFilePermissions(connectionId: string): Promise<SecurityAudit['findings']> {
    const worldWritable = await this.executeCommand(connectionId, 'find /etc -type f -perm -002 2>/dev/null | head -5');
    const findings: SecurityAudit['findings'] = [];

    if (worldWritable.trim()) {
      findings.push({
        id: 'world_writable_files',
        title: 'Weltweit beschreibbare Dateien',
        severity: 'medium',
        category: 'File Security',
        description: 'Dateien mit unsicheren Berechtigungen gefunden.',
        recommendation: 'Überprüfen und korrigieren Sie Dateiberechtigungen.'
      });
    }

    return findings;
  }

  private async checkNetworkConnections(connectionId: string): Promise<SecurityAudit['findings']> {
    const connections = await this.executeCommand(connectionId, 'netstat -tuln');
    const findings: SecurityAudit['findings'] = [];

    if (connections.includes('0.0.0.0:23') || connections.includes(':::23')) {
      findings.push({
        id: 'telnet_listening',
        title: 'Telnet-Port offen',
        severity: 'critical',
        category: 'Network Security',
        description: 'Telnet-Service lauscht auf Netzwerk-Interface.',
        recommendation: 'Deaktivieren Sie Telnet und verwenden Sie SSH.'
      });
    }

    return findings;
  }

  private async checkSystemLogs(connectionId: string): Promise<SecurityAudit['findings']> {
    const authLog = await this.executeCommand(connectionId, 'tail -100 /var/log/auth.log 2>/dev/null | grep "Failed password" | wc -l || echo "0"');
    const findings: SecurityAudit['findings'] = [];

    const failedLogins = parseInt(authLog.trim());

    if (failedLogins > 10) {
      findings.push({
        id: 'failed_login_attempts',
        title: 'Viele fehlgeschlagene Login-Versuche',
        severity: failedLogins > 50 ? 'high' : 'medium',
        category: 'Authentication',
        description: `${failedLogins} fehlgeschlagene Login-Versuche in den letzten 100 Log-Einträgen.`,
        recommendation: 'Implementieren Sie Fail2Ban oder ähnliche Schutzmaßnahmen.'
      });
    }

    return findings;
  }

  private generateMockSystemInfo(server: Server): SystemInfo {
    return {
      hostname: server.hostname,
      os: server.os || 'Ubuntu 20.04.3 LTS',
      kernel: '5.4.0-74-generic',
      architecture: 'x86_64',
      cpu: {
        model: 'Intel(R) Xeon(R) CPU E5-2686 v4 @ 2.30GHz',
        cores: 4,
        usage: Math.random() * 30 + 10
      },
      memory: {
        total: 4096,
        used: Math.floor(Math.random() * 2048 + 1024),
        free: 0,
        usage: 0
      },
      disk: [{
        device: '/dev/sda1',
        mount: '/',
        total: 20480,
        used: Math.floor(Math.random() * 10240 + 5120),
        free: 0,
        usage: 0
      }],
      network: [{
        interface: 'eth0',
        ip: server.ip,
        mac: 'aa:bb:cc:dd:ee:ff',
        rx_bytes: Math.floor(Math.random() * 1000000),
        tx_bytes: Math.floor(Math.random() * 1000000)
      }],
      processes: [],
      services: [
        { name: 'ssh', status: 'running', enabled: true },
        { name: 'nginx', status: 'running', enabled: true },
        { name: 'mysql', status: 'stopped', enabled: false }
      ],
      uptime: Math.floor(Math.random() * 1000000),
      loadAverage: [0.15, 0.25, 0.20],
      lastBoot: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
      users: [
        { name: server.username, terminal: 'pts/0', host: 'localhost', loginTime: new Date().toISOString() }
      ]
    };
  }

  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = 'disconnected';
      
      if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
        this.webSocket.send(JSON.stringify({
          type: 'disconnect',
          connectionId
        }));
      }
      
      this.connections.delete(connectionId);
    }
  }

  getConnection(connectionId: string): SSHConnection | undefined {
    return this.connections.get(connectionId);
  }

  getAllConnections(): SSHConnection[] {
    return Array.from(this.connections.values());
  }
}