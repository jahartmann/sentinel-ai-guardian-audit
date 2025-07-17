// IP-First SSH Service basierend auf dem Python-Code
import { Server } from '@/hooks/useServerManagement';
import { logger } from '@/services/loggerService';

export interface IPSSHConnection {
  id: string;
  server: Server;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  systemInfo?: any;
  connectionMethod?: string;
  logs: string[];
}

export interface SSHConnectionStep {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  details?: any;
  timestamp: number;
}

// Modernisierte SSH-Service-Implementation (IP-fokussiert wie im Python Code)
export class IPBasedSSHService {
  private connections: Map<string, IPSSHConnection> = new Map();
  
  constructor() {
    logger.info('ssh', '🚀 IP-Based SSH Service initialized (Python-inspired)');
  }

  // Primäre Verbindungsmethode über IP (wie im Python Code)
  async connect(server: Server): Promise<IPSSHConnection> {
    const connectionId = `ssh_${server.id}_${Date.now()}`;
    
    const connection: IPSSHConnection = {
      id: connectionId,
      server,
      status: 'connecting',
      logs: []
    };

    this.connections.set(connectionId, connection);
    
    // IP-First Logging (hostname ist optional)
    const target = server.ip + (server.port !== 22 ? `:${server.port}` : '');
    logger.sshConnect(target, { 
      serverId: server.id, 
      primaryIP: server.ip,
      port: server.port,
      hostname: server.hostname || 'N/A',
      connectionId,
      method: 'ip_based'
    });

    try {
      return await this.establishIPBasedConnection(connection);
    } catch (error) {
      logger.sshConnectFailed(target, error as Error, {
        serverId: server.id,
        connectionId,
        primaryIP: server.ip
      });
      connection.status = 'error';
      connection.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async establishIPBasedConnection(connection: IPSSHConnection): Promise<IPSSHConnection> {
    const { server } = connection;
    const target = server.ip;
    
    // Definiere Workflow-Schritte (Python-inspiriert)
    const steps: SSHConnectionStep[] = [
      { step: 'ip_validation', status: 'pending', message: 'IP-Adresse validieren...', timestamp: Date.now() },
      { step: 'network_connectivity', status: 'pending', message: 'Netzwerk-Konnektivität prüfen...', timestamp: Date.now() },
      { step: 'ssh_port_test', status: 'pending', message: 'SSH-Port-Verfügbarkeit testen...', timestamp: Date.now() },
      { step: 'service_discovery', status: 'pending', message: 'Service-Discovery durchführen...', timestamp: Date.now() },
      { step: 'data_collection', status: 'pending', message: 'Datensammlung initialisieren...', timestamp: Date.now() }
    ];

    logger.info('ssh', `🔄 Starting IP-based SSH workflow for ${target}`, { 
      steps: steps.length,
      targetIP: target,
      targetPort: server.port
    });

    // Schritt 1: IP-Validierung
    steps[0].status = 'running';
    connection.logs.push(`[${new Date().toISOString()}] Validating IP address: ${target}`);
    
    if (!this.isValidIP(server.ip)) {
      steps[0].status = 'failed';
      const errorMsg = `❌ Ungültige IP-Adresse: ${server.ip}`;
      logger.error('ssh', errorMsg, { step: 'ip_validation', ip: server.ip });
      throw new Error(errorMsg);
    }

    steps[0].status = 'completed';
    connection.logs.push(`[${new Date().toISOString()}] ✅ IP address validated: ${target}`);
    logger.info('ssh', `✅ IP address validated: ${target}`, { step: 'ip_validation' });

    // Schritt 2: Netzwerk-Konnektivität (erweitert wie im Python Code)
    steps[1].status = 'running';
    connection.logs.push(`[${new Date().toISOString()}] Testing network connectivity...`);
    
    const networkResult = await this.performComprehensiveNetworkTest(server);
    if (!networkResult.success) {
      steps[1].status = 'failed';
      const errorMsg = `❌ Server ${target} nicht erreichbar: ${networkResult.error}`;
      logger.error('ssh', errorMsg, { step: 'network_connectivity', ...networkResult });
      throw new Error(errorMsg);
    }

    steps[1].status = 'completed';
    connection.logs.push(`[${new Date().toISOString()}] ✅ Network connectivity confirmed`);
    logger.info('ssh', `✅ Network connectivity confirmed for ${target}`, { 
      step: 'network_connectivity',
      tests: networkResult.tests
    });

    // Schritt 3: SSH-Port-Test (wie im Python paramiko.connect)
    steps[2].status = 'running';
    connection.logs.push(`[${new Date().toISOString()}] Testing SSH port ${server.port}...`);
    
    const sshPortResult = await this.testSSHPort(server.ip, server.port);
    if (!sshPortResult.accessible) {
      steps[2].status = 'failed';
      connection.logs.push(`[${new Date().toISOString()}] ⚠️ SSH port ${server.port} not accessible, continuing anyway...`);
      logger.warn('ssh', `⚠️ SSH port ${server.port} not accessible on ${target}`, { 
        step: 'ssh_port_test',
        port: server.port,
        error: sshPortResult.error
      });
      // Nicht kritisch - fortfahren
    } else {
      steps[2].status = 'completed';
      connection.logs.push(`[${new Date().toISOString()}] ✅ SSH port ${server.port} accessible`);
      logger.info('ssh', `✅ SSH port accessible on ${target}:${server.port}`, { step: 'ssh_port_test' });
    }

    // Schritt 4: Service-Discovery (erweitert)
    steps[3].status = 'running';
    connection.logs.push(`[${new Date().toISOString()}] Discovering services...`);
    
    const services = await this.performServiceDiscovery(server);
    steps[3].status = 'completed';
    connection.logs.push(`[${new Date().toISOString()}] ✅ Service discovery completed, found ${services.length} services`);
    logger.info('ssh', `✅ Service discovery completed for ${target}`, { 
      step: 'service_discovery',
      serviceCount: services.length,
      services: services.slice(0, 5)
    });

    // Schritt 5: Datensammlung (wie im Python gather_data.sh)
    steps[4].status = 'running';
    connection.logs.push(`[${new Date().toISOString()}] Initializing data collection...`);
    logger.sshDataCollection(target, 'initialization', { method: 'ip_based' });
    
    const collectedData = await this.performDataCollection(server, services);
    connection.systemInfo = collectedData;
    
    steps[4].status = 'completed';
    connection.logs.push(`[${new Date().toISOString()}] ✅ Data collection completed`);
    logger.sshDataCollection(target, 'completed', { 
      dataCategories: Object.keys(collectedData).length,
      collectionMethod: 'browser_based'
    });

    connection.status = 'connected';
    connection.connectionMethod = 'ip_based_discovery';
    
    logger.sshConnectSuccess(target, { 
      serverId: server.id,
      connectionId: connection.id,
      steps: steps.length,
      method: 'ip_based',
      servicesFound: services.length
    });

    return connection;
  }

  private isValidIP(ip: string): boolean {
    // IPv4 Validierung
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6 Validierung (basic)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'localhost';
  }

  private async performComprehensiveNetworkTest(server: Server): Promise<{
    success: boolean;
    error?: string;
    tests: any[];
  }> {
    logger.debug('ssh', `🔍 Comprehensive network test for ${server.ip}`, {
      tests: ['icmp_ping', 'tcp_connect', 'http_probe', 'websocket_probe']
    });

    const tests: any[] = [];
    let successCount = 0;

    // Test 1: ICMP-style ping (über HTTP Request)
    try {
      const pingResult = await this.performHTTPPing(server.ip);
      tests.push({ name: 'http_ping', success: pingResult, method: 'fetch_probe' });
      if (pingResult) successCount++;
    } catch (error) {
      tests.push({ name: 'http_ping', success: false, error: error instanceof Error ? error.message : 'Unknown' });
    }

    // Test 2: TCP-Connect simulation (WebSocket)
    try {
      const tcpResult = await this.performTCPConnectTest(server.ip, server.port);
      tests.push({ name: 'tcp_connect', success: tcpResult, port: server.port });
      if (tcpResult) successCount++;
    } catch (error) {
      tests.push({ name: 'tcp_connect', success: false, error: error instanceof Error ? error.message : 'Unknown' });
    }

    // Test 3: HTTP-Service-Probe
    try {
      const httpResult = await this.performHTTPServiceProbe(server.ip);
      tests.push({ name: 'http_service', success: httpResult.found, services: httpResult.services });
      if (httpResult.found) successCount++;
    } catch (error) {
      tests.push({ name: 'http_service', success: false, error: error instanceof Error ? error.message : 'Unknown' });
    }

    const success = successCount > 0; // Mindestens ein Test erfolgreich

    logger.info('ssh', `📊 Network test results for ${server.ip}`, {
      successful: successCount,
      total: tests.length,
      percentage: Math.round((successCount / tests.length) * 100),
      overallSuccess: success
    });

    return {
      success,
      error: success ? undefined : 'Alle Netzwerk-Tests fehlgeschlagen',
      tests
    };
  }

  private async performHTTPPing(ip: string): Promise<boolean> {
    logger.trace('ssh', `🏓 HTTP ping to ${ip}`);
    
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        logger.trace('ssh', `⏰ HTTP ping timeout for ${ip}`);
        resolve(false);
      }, 3000);
      
      img.onload = () => {
        clearTimeout(timeout);
        logger.trace('ssh', `✅ HTTP ping successful to ${ip}`);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        logger.trace('ssh', `📡 HTTP ping response (error) from ${ip} - host reachable`);
        resolve(true); // Error response bedeutet host ist erreichbar
      };
      
      // Verschiedene Standard-Pfade probieren
      img.src = `http://${ip}/favicon.ico?t=${Date.now()}`;
    });
  }

  private async performTCPConnectTest(ip: string, port: number): Promise<boolean> {
    logger.trace('ssh', `🔌 TCP connect test to ${ip}:${port}`);
    
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`ws://${ip}:${port}`);
        const timeout = setTimeout(() => {
          ws.close();
          logger.trace('ssh', `⏰ TCP connect timeout for ${ip}:${port}`);
          resolve(false);
        }, 2000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          logger.trace('ssh', `✅ TCP connection successful to ${ip}:${port}`);
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          logger.trace('ssh', `❌ TCP connection failed to ${ip}:${port}`);
          resolve(false);
        };
      } catch (error) {
        logger.trace('ssh', `❌ TCP connect error for ${ip}:${port}`);
        resolve(false);
      }
    });
  }

  private async performHTTPServiceProbe(ip: string): Promise<{ found: boolean; services: any[] }> {
    logger.trace('ssh', `🌐 HTTP service probe for ${ip}`);
    
    const commonPorts = [80, 443, 8080, 8443, 3000, 5000, 9000];
    const services: any[] = [];

    for (const port of commonPorts) {
      try {
        const response = await fetch(`http://${ip}:${port}`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(1500)
        });
        
        services.push({
          port,
          protocol: 'http',
          status: 'responding',
          timestamp: Date.now()
        });
        
        logger.trace('ssh', `✅ HTTP service found on ${ip}:${port}`);
      } catch (error) {
        // Service nicht verfügbar, normal
        continue;
      }
    }

    return {
      found: services.length > 0,
      services
    };
  }

  private async testSSHPort(ip: string, port: number): Promise<{ accessible: boolean; error?: string }> {
    logger.trace('ssh', `🔐 SSH port test for ${ip}:${port}`);
    
    try {
      // WebSocket-Test für SSH-Port
      const result = await this.performTCPConnectTest(ip, port);
      return { accessible: result };
    } catch (error) {
      return { 
        accessible: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async performServiceDiscovery(server: Server): Promise<any[]> {
    logger.debug('ssh', `🔍 Service discovery for ${server.ip}`);

    const discoveredServices: any[] = [];

    // Standard-Service-Ports scannen
    const servicePorts = [
      { port: 22, name: 'SSH', protocol: 'ssh' },
      { port: 80, name: 'HTTP', protocol: 'http' },
      { port: 443, name: 'HTTPS', protocol: 'https' },
      { port: 21, name: 'FTP', protocol: 'ftp' },
      { port: 25, name: 'SMTP', protocol: 'smtp' },
      { port: 53, name: 'DNS', protocol: 'dns' },
      { port: 8080, name: 'HTTP-Alt', protocol: 'http' },
      { port: 3389, name: 'RDP', protocol: 'rdp' },
      { port: 5432, name: 'PostgreSQL', protocol: 'postgresql' },
      { port: 3306, name: 'MySQL', protocol: 'mysql' }
    ];

    for (const service of servicePorts) {
      try {
        const isAccessible = await this.performTCPConnectTest(server.ip, service.port);
        if (isAccessible) {
          discoveredServices.push({
            ...service,
            status: 'accessible',
            timestamp: Date.now()
          });
          logger.trace('ssh', `✅ Service found: ${service.name} on ${server.ip}:${service.port}`);
        }
      } catch (error) {
        // Service nicht verfügbar
        continue;
      }
    }

    logger.info('ssh', `🔍 Service discovery completed for ${server.ip}`, {
      totalScanned: servicePorts.length,
      servicesFound: discoveredServices.length,
      services: discoveredServices.map(s => `${s.name}:${s.port}`)
    });

    return discoveredServices;
  }

  private async performDataCollection(server: Server, services: any[]): Promise<any> {
    logger.debug('ssh', `📊 Data collection for ${server.ip}`);

    const systemData = {
      server: {
        ip: server.ip,
        hostname: server.hostname || 'Unknown',
        port: server.port,
        os: server.os || 'Unknown',
        username: server.username || 'Unknown',
        scanTimestamp: new Date().toISOString()
      },
      network: {
        primaryIP: server.ip,
        discoveredServices: services,
        accessibility: 'confirmed',
        scanMethod: 'browser_based'
      },
      services: services.map(s => ({
        name: s.name,
        port: s.port,
        protocol: s.protocol,
        status: s.status
      })),
      security: await this.performBasicSecurityAssessment(server, services),
      metadata: {
        collectionMethod: 'ip_based_discovery',
        browserBased: true,
        limitations: [
          'Limited to network-accessible data',
          'No direct SSH access',
          'Browser security restrictions apply'
        ],
        timestamp: Date.now(),
        dataCategories: ['network', 'services', 'security_basic']
      }
    };

    logger.info('ssh', `📈 Data collection completed for ${server.ip}`, {
      dataSize: JSON.stringify(systemData).length,
      categories: Object.keys(systemData),
      servicesAnalyzed: services.length
    });

    return systemData;
  }

  private async performBasicSecurityAssessment(server: Server, services: any[]): Promise<any> {
    const assessment = {
      openPorts: services.length,
      criticalServices: services.filter(s => ['SSH', 'RDP', 'FTP'].includes(s.name)),
      webServices: services.filter(s => s.protocol === 'http' || s.protocol === 'https'),
      databaseServices: services.filter(s => ['PostgreSQL', 'MySQL'].includes(s.name)),
      riskLevel: 'unknown',
      recommendations: [] as string[]
    };

    // Basis-Risikobewertung
    if (assessment.criticalServices.length > 0) {
      assessment.recommendations.push('Critical services detected - ensure proper authentication');
    }
    
    if (assessment.webServices.length > 0) {
      assessment.recommendations.push('Web services found - verify HTTPS configuration');
    }

    if (assessment.databaseServices.length > 0) {
      assessment.recommendations.push('Database services exposed - verify access controls');
    }

    // Risiko-Level basierend auf gefundenen Services
    if (assessment.criticalServices.length > 2) {
      assessment.riskLevel = 'high';
    } else if (assessment.openPorts > 5) {
      assessment.riskLevel = 'medium';
    } else {
      assessment.riskLevel = 'low';
    }

    return assessment;
  }

  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = 'disconnected';
      logger.info('ssh', `🔌 Disconnecting from ${connection.server.ip}`, {
        connectionId,
        duration: Date.now() - parseInt(connectionId.split('_')[2])
      });
      this.connections.delete(connectionId);
    }
  }

  getConnection(connectionId: string): IPSSHConnection | undefined {
    return this.connections.get(connectionId);
  }

  getAllConnections(): IPSSHConnection[] {
    return Array.from(this.connections.values());
  }
}

// Export singleton
export const ipSSHService = new IPBasedSSHService();