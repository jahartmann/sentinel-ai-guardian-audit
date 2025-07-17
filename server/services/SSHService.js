import { NodeSSH } from 'node-ssh';
import { v4 as uuidv4 } from 'uuid';

export class SSHService {
  constructor(logger) {
    this.logger = logger;
    this.connections = new Map();
    this.logger.info('SSH', '🚀 SSH Service initialized');
  }

  async connect(serverConfig) {
    const connectionId = `ssh_${serverConfig.id}_${Date.now()}`;
    const ssh = new NodeSSH();
    
    try {
      this.logger.info('SSH', `🔄 Connecting to ${serverConfig.name} (${serverConfig.ip}:${serverConfig.port})`);
      
      const connectConfig = {
        host: serverConfig.ip,
        port: serverConfig.port || 22,
        username: serverConfig.username,
        readyTimeout: 10000,
        algorithms: {
          kex: ['diffie-hellman-group-exchange-sha256', 'diffie-hellman-group14-sha256'],
          cipher: ['aes128-gcm', 'aes256-gcm'],
          hmac: ['hmac-sha2-256'],
          compress: ['none']
        }
      };

      // Use password or key-based authentication
      if (serverConfig.connectionType === 'password' && serverConfig.password) {
        connectConfig.password = serverConfig.password;
      } else if (serverConfig.connectionType === 'key' && serverConfig.privateKeyPath) {
        connectConfig.privateKeyPath = serverConfig.privateKeyPath;
      } else {
        throw new Error('Invalid authentication configuration');
      }

      await ssh.connect(connectConfig);
      
      const connection = {
        id: connectionId,
        ssh,
        server: serverConfig,
        status: 'connected',
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      this.connections.set(connectionId, connection);
      
      this.logger.info('SSH', `✅ Connected to ${serverConfig.name}`, {
        connectionId,
        server: serverConfig.name,
        ip: serverConfig.ip
      });

      return connection;
    } catch (error) {
      this.logger.error('SSH', `❌ Connection failed to ${serverConfig.name}`, {
        error: error.message,
        ip: serverConfig.ip,
        port: serverConfig.port
      });
      throw new Error(`SSH connection failed: ${error.message}`);
    }
  }

  async executeCommand(connectionId, command) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== 'connected') {
      throw new Error('No active SSH connection');
    }

    try {
      this.logger.debug('SSH', `💻 Executing: ${command}`, { connectionId });
      
      const result = await connection.ssh.execCommand(command, {
        cwd: `/home/${connection.server.username}`,
        options: { pty: true }
      });

      // Update last activity
      connection.lastActivity = new Date().toISOString();

      this.logger.debug('SSH', `📤 Command completed: ${command}`, {
        connectionId,
        exitCode: result.code,
        hasOutput: result.stdout.length > 0
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('SSH', `❌ Command failed: ${command}`, {
        error: error.message,
        connectionId
      });
      throw new Error(`Command execution failed: ${error.message}`);
    }
  }

  async gatherSystemData(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    this.logger.info('SSH', '📊 Starting comprehensive data collection', { connectionId });

    // Comprehensive system data collection commands
    const commands = {
      // Basic system information
      os_info: 'cat /etc/os-release',
      kernel: 'uname -a',
      hostname: 'hostname',
      uptime: 'uptime',
      
      // Hardware information
      cpu_info: 'lscpu',
      memory_info: 'free -h',
      disk_usage: 'df -h',
      block_devices: 'lsblk',
      hardware_info: 'lshw -short 2>/dev/null || echo "lshw not available"',
      
      // Network information
      network_interfaces: 'ip addr show',
      network_routes: 'ip route show',
      listening_ports: 'ss -tuln',
      network_stats: 'netstat -i',
      
      // Security information
      users: 'cat /etc/passwd',
      groups: 'cat /etc/group',
      sudoers: 'cat /etc/sudoers 2>/dev/null || echo "Access denied"',
      ssh_config: 'cat /etc/ssh/sshd_config',
      firewall_status: 'ufw status verbose 2>/dev/null || iptables -L 2>/dev/null || echo "Firewall info unavailable"',
      
      // Services and processes
      systemd_services: 'systemctl list-units --type=service --state=running',
      running_processes: 'ps aux --sort=-%cpu | head -20',
      cron_jobs: 'crontab -l 2>/dev/null || echo "No cron jobs"',
      
      // System logs (recent)
      auth_logs: 'journalctl --since "24 hours ago" -u ssh.service --no-pager | tail -50',
      system_logs: 'journalctl --since "1 hour ago" --no-pager | tail -50',
      
      // Package management
      installed_packages: 'dpkg -l 2>/dev/null || rpm -qa 2>/dev/null || echo "Package list unavailable"',
      package_updates: 'apt list --upgradable 2>/dev/null || yum check-update 2>/dev/null || echo "Update check unavailable"'
    };

    const systemData = {
      server: {
        id: connection.server.id,
        name: connection.server.name,
        ip: connection.server.ip,
        hostname: connection.server.hostname,
        collectionTime: new Date().toISOString()
      },
      data: {}
    };

    let collectedCount = 0;
    const totalCommands = Object.keys(commands).length;

    for (const [category, command] of Object.entries(commands)) {
      try {
        const result = await this.executeCommand(connectionId, command);
        systemData.data[category] = {
          command,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          timestamp: result.timestamp
        };
        
        collectedCount++;
        this.logger.debug('SSH', `✅ Collected: ${category} (${collectedCount}/${totalCommands})`, { 
          connectionId, 
          command: command.substring(0, 50) + '...'
        });
      } catch (error) {
        systemData.data[category] = {
          command,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        this.logger.warn('SSH', `⚠️ Failed to collect: ${category}`, { 
          error: error.message 
        });
      }
    }

    this.logger.info('SSH', '📈 Data collection completed', {
      connectionId,
      categoriesCollected: collectedCount,
      totalCategories: totalCommands,
      dataSize: JSON.stringify(systemData).length
    });

    return systemData;
  }

  async disconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ssh) {
      try {
        await connection.ssh.dispose();
        this.connections.delete(connectionId);
        this.logger.info('SSH', '🔌 Connection closed', { 
          connectionId,
          server: connection.server.name
        });
      } catch (error) {
        this.logger.error('SSH', `Error closing connection: ${error.message}`, { connectionId });
      }
    }
  }

  getConnection(connectionId) {
    return this.connections.get(connectionId);
  }

  getAllConnections() {
    return Array.from(this.connections.values());
  }

  // Cleanup inactive connections
  async cleanupInactiveConnections(maxIdleTime = 30 * 60 * 1000) { // 30 minutes
    const now = Date.now();
    const connectionsToCleanup = [];

    for (const [connectionId, connection] of this.connections) {
      const lastActivity = new Date(connection.lastActivity).getTime();
      if (now - lastActivity > maxIdleTime) {
        connectionsToCleanup.push(connectionId);
      }
    }

    for (const connectionId of connectionsToCleanup) {
      await this.disconnect(connectionId);
      this.logger.info('SSH', `🧹 Cleaned up inactive connection: ${connectionId}`);
    }

    return connectionsToCleanup.length;
  }
}