import { io, Socket } from 'socket.io-client';
import { logger } from './loggerService';

export interface AuditUpdate {
  auditId: string;
  status: string;
  progress: number;
  message: string;
  eta?: number;
  timestamp: string;
}

export interface SSHOutput {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting || this.socket?.connected) {
      return;
    }

    this.isConnecting = true;
    const serverUrl = window.location.origin;
    
    logger.info('system', `🔌 Connecting to WebSocket server: ${serverUrl}`);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      logger.info('system', '✅ WebSocket connected', { 
        socketId: this.socket?.id 
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnecting = false;
      logger.warn('system', `🔌 WebSocket disconnected: ${reason}`);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      logger.error('system', `❌ WebSocket connection error: ${error.message}`);
      this.handleReconnect();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      logger.info('system', `🔄 WebSocket reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('error', (error) => {
      logger.error('system', `WebSocket error: ${error}`);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('system', '❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    logger.info('system', `⏳ Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // SSH Console Methods
  async connectSSH(serverId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('SSH connection timeout'));
      }, 30000);

      this.socket.once('ssh_connected', (data) => {
        clearTimeout(timeout);
        logger.info('ssh', '✅ SSH console connected', { 
          connectionId: data.connectionId,
          serverName: data.serverName 
        });
        resolve();
      });

      this.socket.once('ssh_error', (data) => {
        clearTimeout(timeout);
        logger.error('ssh', `❌ SSH connection failed: ${data.error}`);
        reject(new Error(data.error));
      });

      this.socket.emit('ssh_connect', { serverId });
    });
  }

  executeSSHCommand(connectionId: string, command: string): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    logger.debug('ssh', `💻 Executing command: ${command}`, { connectionId });
    this.socket.emit('ssh_command', { connectionId, command });
  }

  disconnectSSH(connectionId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    logger.info('ssh', '🔌 Disconnecting SSH console', { connectionId });
    this.socket.emit('ssh_disconnect', { connectionId });
  }

  // SSH Event Listeners
  onSSHOutput(callback: (output: SSHOutput) => void): void {
    this.socket?.on('ssh_output', callback);
  }

  onSSHError(callback: (error: { error: string }) => void): void {
    this.socket?.on('ssh_error', callback);
  }

  onSSHDisconnected(callback: () => void): void {
    this.socket?.on('ssh_disconnected', callback);
  }

  // Audit Methods
  joinAuditRoom(auditId: string): void {
    if (!this.socket?.connected) {
      logger.warn('system', 'Cannot join audit room - socket not connected');
      return;
    }

    logger.info('audit', `🏠 Joining audit room: ${auditId}`);
    this.socket.emit('join_audit_room', auditId);
  }

  leaveAuditRoom(auditId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    logger.info('audit', `🚪 Leaving audit room: ${auditId}`);
    this.socket.emit('leave_audit_room', auditId);
  }

  onAuditUpdate(callback: (update: AuditUpdate) => void): void {
    this.socket?.on('audit_update', callback);
  }

  // Remove Event Listeners
  offSSHOutput(): void {
    this.socket?.off('ssh_output');
  }

  offSSHError(): void {
    this.socket?.off('ssh_error');
  }

  offSSHDisconnected(): void {
    this.socket?.off('ssh_disconnected');
  }

  offAuditUpdate(): void {
    this.socket?.off('audit_update');
  }

  // Connection Status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionId(): string | undefined {
    return this.socket?.id;
  }

  // Clean up
  disconnect(): void {
    if (this.socket) {
      logger.info('system', '🔌 Manually disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();