import { logger } from '@/services/loggerService';
import type { Server } from '@/hooks/useServerManagement';

export interface ConsoleMessage {
  type: 'command' | 'output' | 'error' | 'system';
  content: string;
  timestamp: string;
}

export interface ConsoleConnection {
  id: string;
  server: Server;
  isConnected: boolean;
  messages: ConsoleMessage[];
}

export class ConsoleService {
  private connections: Map<string, ConsoleConnection> = new Map();
  private webSocket: WebSocket | null = null;
  private listeners: Map<string, (message: ConsoleMessage) => void> = new Map();

  constructor() {
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    try {
      // WebSocket-Verbindung zum Backend
      const wsUrl = `ws://${window.location.hostname}:3001`;
      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = () => {
        logger.info('system', 'Console WebSocket connected');
        console.log('Console WebSocket connected');
      };

      this.webSocket.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data));
      };

      this.webSocket.onerror = (error) => {
        logger.error('system', 'Console WebSocket error', { error });
        console.error('Console WebSocket error:', error);
      };

      this.webSocket.onclose = () => {
        logger.info('system', 'Console WebSocket disconnected, attempting reconnect...');
        console.log('Console WebSocket disconnected, attempting reconnect...');
        setTimeout(() => this.initializeWebSocket(), 5000);
      };
    } catch (error) {
      logger.error('system', 'Failed to initialize Console WebSocket', { error });
      console.error('Failed to initialize Console WebSocket:', error);
    }
  }

  private handleWebSocketMessage(message: any) {
    const { type, connectionId, data } = message;

    switch (type) {
      case 'ssh_connected':
        this.handleConnectionEstablished(connectionId);
        break;
      case 'ssh_output':
        this.handleCommandOutput(connectionId, data);
        break;
      case 'error':
        this.handleError(connectionId, data.message);
        break;
    }
  }

  private handleConnectionEstablished(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isConnected = true;
      this.addMessage(connectionId, 'system', '✅ SSH-Verbindung hergestellt');
    }
  }

  private handleCommandOutput(connectionId: string, data: any) {
    if (data.stdout) {
      this.addMessage(connectionId, 'output', data.stdout);
    }
    if (data.stderr) {
      this.addMessage(connectionId, 'error', data.stderr);
    }
  }

  private handleError(connectionId: string, error: string) {
    this.addMessage(connectionId, 'error', `❌ Fehler: ${error}`);
  }

  private addMessage(connectionId: string, type: ConsoleMessage['type'], content: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      const message: ConsoleMessage = {
        type,
        content,
        timestamp: new Date().toLocaleTimeString('de-DE')
      };
      
      connection.messages.push(message);
      
      // Benachrichtige Listener
      const listener = this.listeners.get(connectionId);
      if (listener) {
        listener(message);
      }
    }
  }

  async connect(server: Server): Promise<string> {
    const connectionId = `console_${server.id}_${Date.now()}`;
    
    const connection: ConsoleConnection = {
      id: connectionId,
      server,
      isConnected: false,
      messages: []
    };

    this.connections.set(connectionId, connection);

    // Nachricht hinzufügen
    this.addMessage(connectionId, 'system', `Verbindung zu ${server.name} (${server.ip}) wird hergestellt...`);

    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      try {
        // SSH-Verbindung über WebSocket anfordern
        this.webSocket.send(JSON.stringify({
          type: 'ssh_connect',
          server: {
            id: server.id,
            ip: server.ip,
            port: server.port,
            username: server.username,
            password: server.password,
            hostname: server.hostname
          }
        }));

        logger.info('system', `Console connection requested for ${server.name}`);
        
        // Warte auf Verbindung
        return new Promise((resolve, reject) => {
          const checkConnection = () => {
            const conn = this.connections.get(connectionId);
            if (conn?.isConnected) {
              resolve(connectionId);
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          
          checkConnection();
          
          // Timeout nach 10 Sekunden
          setTimeout(() => {
            if (!this.connections.get(connectionId)?.isConnected) {
              this.addMessage(connectionId, 'error', 'Verbindungs-Timeout');
              reject(new Error('Connection timeout'));
            }
          }, 10000);
        });
      } catch (error) {
        this.addMessage(connectionId, 'error', `Verbindungsfehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        throw error;
      }
    } else {
      // Fallback: Simulation für Demo
      return this.simulateConnection(connectionId);
    }
  }

  private async simulateConnection(connectionId: string): Promise<string> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error('Connection not found');

    // Simuliere Verbindungsaufbau
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    connection.isConnected = true;
    this.addMessage(connectionId, 'system', '✅ SSH-Verbindung hergestellt (Demo-Modus)');
    this.addMessage(connectionId, 'output', `Willkommen auf ${connection.server.hostname || connection.server.ip}`);
    this.addMessage(connectionId, 'output', `${connection.server.username}@${connection.server.hostname || connection.server.ip}:~$`);
    
    return connectionId;
  }

  async executeCommand(connectionId: string, command: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isConnected) {
      throw new Error('Keine aktive Verbindung');
    }

    // Befehl zu Messages hinzufügen
    this.addMessage(connectionId, 'command', `${connection.server.username}@${connection.server.hostname || connection.server.ip}:~$ ${command}`);

    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      // Befehl über WebSocket senden
      this.webSocket.send(JSON.stringify({
        type: 'ssh_command',
        connectionId,
        command
      }));
    } else {
      // Fallback: Simulation
      await this.simulateCommand(connectionId, command);
    }
  }

  private async simulateCommand(connectionId: string, command: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Simuliere Verarbeitungszeit
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Mock-Antworten für häufige Befehle
    const mockResponses: Record<string, string> = {
      'ls': 'bin  etc  home  opt  root  tmp  usr  var',
      'pwd': `/home/${connection.server.username}`,
      'whoami': connection.server.username,
      'uname -a': `Linux ${connection.server.hostname || connection.server.ip} 5.4.0-74-generic #83-Ubuntu SMP Sat May 8 02:35:39 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux`,
      'df -h': 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        50G   15G   33G  32% /\ntmpfs           2.0G     0  2.0G   0% /dev/shm',
      'free -m': 'total        used        free      shared  buff/cache   available\nMem:          3924        1543         345          94        2035        2108',
      'ps aux': 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1 168576 11484 ?        Ss   May08   0:02 /sbin/init'
    };

    if (command === 'exit') {
      this.disconnect(connectionId);
      return;
    }

    const response = mockResponses[command] || `Befehl ausgeführt: ${command}\nAusgabe würde hier in der echten Implementierung angezeigt werden.`;
    
    this.addMessage(connectionId, 'output', response);
    this.addMessage(connectionId, 'output', `${connection.server.username}@${connection.server.hostname || connection.server.ip}:~$`);
  }

  disconnect(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isConnected = false;
      this.addMessage(connectionId, 'system', `Verbindung zu ${connection.server.name} getrennt`);
      this.connections.delete(connectionId);
      this.listeners.delete(connectionId);
    }
  }

  getConnection(connectionId: string): ConsoleConnection | undefined {
    return this.connections.get(connectionId);
  }

  onMessage(connectionId: string, callback: (message: ConsoleMessage) => void) {
    this.listeners.set(connectionId, callback);
  }

  offMessage(connectionId: string) {
    this.listeners.delete(connectionId);
  }
}

export const consoleService = new ConsoleService();