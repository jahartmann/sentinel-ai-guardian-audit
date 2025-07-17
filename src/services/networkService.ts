export interface NetworkHost {
  ip: string;
  hostname?: string;
  mac?: string;
  ports: number[];
  status: 'online' | 'offline';
  os?: string;
  services: Array<{
    port: number;
    service: string;
    version?: string;
  }>;
  lastSeen: string;
}

export interface NetworkScanResult {
  hosts: NetworkHost[];
  scanTime: number;
  networkRange: string;
}

export class NetworkService {
  private workers: Worker[] = [];
  
  constructor() {
    // Initialize web workers for parallel scanning
    this.initializeWorkers();
  }

  private initializeWorkers() {
    // Since we can't use real workers in this environment, we'll simulate
    console.log('Initializing network scan workers...');
  }

  async scanNetwork(networkRange?: string): Promise<NetworkScanResult> {
    const startTime = Date.now();
    
    // Get current network info from browser if possible
    const range = networkRange || await this.detectNetworkRange();
    
    console.log(`Starting network scan for range: ${range}`);
    
    try {
      // Use multiple scanning techniques
      const hosts = await this.performNetworkScan(range);
      
      const scanTime = Date.now() - startTime;
      
      return {
        hosts,
        scanTime,
        networkRange: range
      };
    } catch (error) {
      console.error('Network scan failed:', error);
      throw new Error('Netzwerk-Scan fehlgeschlagen');
    }
  }

  private async detectNetworkRange(): Promise<string> {
    // Try to detect network range using WebRTC
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      return new Promise((resolve) => {
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        pc.onicecandidate = (ice) => {
          if (ice.candidate) {
            const candidate = ice.candidate.candidate;
            const match = candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (match) {
              const ip = match[1];
              const networkBase = ip.split('.').slice(0, 3).join('.');
              resolve(`${networkBase}.0/24`);
              pc.close();
              return;
            }
          }
        };
        
        // Fallback after timeout
        setTimeout(() => {
          pc.close();
          resolve('192.168.1.0/24');
        }, 3000);
      });
    } catch (error) {
      console.error('Failed to detect network range:', error);
      return '192.168.1.0/24';
    }
  }

  private async performNetworkScan(range: string): Promise<NetworkHost[]> {
    const hosts: NetworkHost[] = [];
    
    // Extract base IP and range
    const [baseNetwork, cidr] = range.split('/');
    const [a, b, c] = baseNetwork.split('.').map(Number);
    const maskBits = parseInt(cidr);
    
    // Calculate host range
    const hostBits = 32 - maskBits;
    const maxHosts = Math.min(Math.pow(2, hostBits) - 2, 254); // Limit to reasonable size
    
    console.log(`Scanning ${maxHosts} potential hosts...`);
    
    // Scan in parallel batches
    const batchSize = 50;
    const batches = Math.ceil(maxHosts / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const promises: Promise<NetworkHost | null>[] = [];
      
      for (let i = batch * batchSize; i < Math.min((batch + 1) * batchSize, maxHosts); i++) {
        const hostIP = `${a}.${b}.${c}.${i + 1}`;
        promises.push(this.scanHost(hostIP));
      }
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          hosts.push(result.value);
        }
      });
      
      // Add small delay between batches to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Found ${hosts.length} active hosts`);
    return hosts;
  }

  private async scanHost(ip: string): Promise<NetworkHost | null> {
    try {
      // Use multiple detection methods
      const isAlive = await this.pingHost(ip);
      if (!isAlive) return null;
      
      const ports = await this.scanPorts(ip);
      const services = await this.identifyServices(ip, ports);
      const hostname = await this.resolveHostname(ip);
      
      return {
        ip,
        hostname,
        ports,
        status: 'online',
        services,
        lastSeen: new Date().toISOString()
      };
    } catch (error) {
      return null;
    }
  }

  private async pingHost(ip: string): Promise<boolean> {
    // Since we can't do ICMP ping in browser, use other methods
    
    // Method 1: Try to fetch with very short timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      await fetch(`http://${ip}:80`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      // This is expected for most hosts
    }
    
    // Method 2: Try WebSocket connection
    try {
      const ws = new WebSocket(`ws://${ip}:80`);
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 500);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch (error) {
      // Try some common ports with img tag trick
      return this.tryImagePing(ip);
    }
  }

  private async tryImagePing(ip: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => resolve(false), 1000);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        // Even errors can indicate the host is reachable
        resolve(true);
      };
      
      img.src = `http://${ip}/favicon.ico?${Date.now()}`;
    });
  }

  private async scanPorts(ip: string): Promise<number[]> {
    const commonPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3389, 5432, 3306, 27017, 6379, 9200];
    const openPorts: number[] = [];
    
    // Use WebSocket to test ports
    const portPromises = commonPorts.map(port => this.testPort(ip, port));
    const results = await Promise.allSettled(portPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        openPorts.push(commonPorts[index]);
      }
    });
    
    return openPorts;
  }

  private async testPort(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 500);
      
      try {
        const ws = new WebSocket(`ws://${ip}:${port}`);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      } catch (error) {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  private async identifyServices(ip: string, ports: number[]): Promise<Array<{ port: number; service: string; version?: string }>> {
    const services: Array<{ port: number; service: string; version?: string }> = [];
    
    const serviceMap: Record<number, string> = {
      21: 'FTP',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      80: 'HTTP',
      110: 'POP3',
      143: 'IMAP',
      443: 'HTTPS',
      993: 'IMAPS',
      995: 'POP3S',
      3389: 'RDP',
      5432: 'PostgreSQL',
      3306: 'MySQL',
      27017: 'MongoDB',
      6379: 'Redis',
      9200: 'Elasticsearch'
    };
    
    for (const port of ports) {
      const service = serviceMap[port] || 'Unknown';
      services.push({ port, service });
    }
    
    return services;
  }

  private async resolveHostname(ip: string): Promise<string | undefined> {
    try {
      // Try to get hostname via reverse DNS (limited in browser)
      // This is a simulation since browser can't do reverse DNS
      const knownHosts: Record<string, string> = {
        '192.168.1.1': 'router.local',
        '192.168.1.254': 'gateway.local'
      };
      
      return knownHosts[ip];
    } catch (error) {
      return undefined;
    }
  }

  async monitorTraffic(): Promise<Array<{ timestamp: string; source: string; destination: string; protocol: string; size: number }>> {
    // Simulate network traffic monitoring
    // In real implementation, this would connect to network monitoring tools
    
    const mockTraffic = [];
    const now = Date.now();
    
    for (let i = 0; i < 20; i++) {
      mockTraffic.push({
        timestamp: new Date(now - (i * 1000)).toISOString(),
        source: `192.168.1.${Math.floor(Math.random() * 200) + 10}`,
        destination: `192.168.1.${Math.floor(Math.random() * 200) + 10}`,
        protocol: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
        size: Math.floor(Math.random() * 1500) + 64
      });
    }
    
    return mockTraffic;
  }

  async detectAnomalies(traffic: any[]): Promise<Array<{ type: string; severity: 'low' | 'medium' | 'high' | 'critical'; description: string; timestamp: string }>> {
    const anomalies = [];
    
    // Analyze traffic patterns for anomalies
    const sourceMap = new Map<string, number>();
    
    traffic.forEach(packet => {
      sourceMap.set(packet.source, (sourceMap.get(packet.source) || 0) + 1);
    });
    
    // Detect port scanning
    for (const [source, count] of sourceMap) {
      if (count > 10) {
        anomalies.push({
          type: 'Port Scan',
          severity: 'high' as const,
          description: `Möglicher Port-Scan von ${source} (${count} Verbindungen)`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Detect unusual protocols
    const protocolMap = new Map<string, number>();
    traffic.forEach(packet => {
      protocolMap.set(packet.protocol, (protocolMap.get(packet.protocol) || 0) + 1);
    });
    
    if ((protocolMap.get('ICMP') || 0) > traffic.length * 0.3) {
      anomalies.push({
        type: 'ICMP Flood',
        severity: 'medium' as const,
        description: 'Ungewöhnlich hoher ICMP-Traffic erkannt',
        timestamp: new Date().toISOString()
      });
    }
    
    return anomalies;
  }
}