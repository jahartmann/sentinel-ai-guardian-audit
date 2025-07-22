import { NodeSSH } from 'node-ssh';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
export class SSHService {
  constructor(logger) {
    this.logger = logger;
    this.connections = new Map();
    this.keyPath = path.join(process.cwd(), 'data', 'ssh_keys');
    this.publicKey = null;
    this.privateKey = null;
    this.logger.info('SSH', '🚀 SSH Service initialized');
  }

  async generateSSHKey() {
    try {
      this.logger.info('SSH', '🔑 Generating SSH key pair...');
      
      // Ensure ssh_keys directory exists
      await fs.mkdir(this.keyPath, { recursive: true });
      
      const privateKeyPath = path.join(this.keyPath, 'id_rsa');
      const publicKeyPath = path.join(this.keyPath, 'id_rsa.pub');
      
      // Generate SSH key pair
      const command = `ssh-keygen -t rsa -b 2048 -f "${privateKeyPath}" -N "" -C "secureai-audit@$(hostname)"`;
      await execAsync(command);
      
      // Read the generated keys
      this.privateKey = await fs.readFile(privateKeyPath, 'utf8');
      this.publicKey = await fs.readFile(publicKeyPath, 'utf8');
      
      this.logger.info('SSH', '✅ SSH key pair generated successfully');
      return {
        publicKey: this.publicKey,
        privateKey: this.privateKey
      };
    } catch (error) {
      this.logger.error('SSH', `❌ SSH key generation failed: ${error.message}`);
      throw new Error(`SSH key generation failed: ${error.message}`);
    }
  }

  async getPublicKey() {
    if (!this.publicKey) {
      try {
        const publicKeyPath = path.join(this.keyPath, 'id_rsa.pub');
        this.publicKey = await fs.readFile(publicKeyPath, 'utf8');
      } catch (error) {
        // Generate new key if not exists
        await this.generateSSHKey();
      }
    }
    return this.publicKey;
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
          kex: [
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group1-sha1',
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521'
          ],
          cipher: [
            'aes128-gcm',
            'aes256-gcm', 
            'aes128-ctr',
            'aes192-ctr',
            'aes256-ctr',
            'aes128-cbc',
            'aes192-cbc',
            'aes256-cbc',
            '3des-cbc'
          ],
          hmac: [
            'hmac-sha2-256',
            'hmac-sha2-512',
            'hmac-sha1',
            'hmac-md5'
          ],
          compress: ['none', 'zlib']
        }
      };

      // Use password or key-based authentication
      if (serverConfig.connectionType === 'password' && serverConfig.password) {
        connectConfig.password = serverConfig.password;
      } else if (serverConfig.connectionType === 'key' && serverConfig.privateKeyPath) {
        connectConfig.privateKeyPath = serverConfig.privateKeyPath;
      } else {
        // Default authentication - try passwordless first, then password if specified
        if (serverConfig.password) {
          connectConfig.password = serverConfig.password;
        } else {
          // Try with SSH keys if available
          try {
            const privateKeyPath = path.join(this.keyPath, 'id_rsa');
            connectConfig.privateKey = await fs.readFile(privateKeyPath, 'utf8');
          } catch (keyError) {
            throw new Error('No authentication method available. Please provide password or SSH key.');
          }
        }
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

    this.logger.info('SSH', '📊 Starting comprehensive data collection using universal script', { connectionId });

    try {
      // First, upload the universal audit script
      const scriptPath = '/tmp/universal_system_audit.sh';
      const localScriptPath = './scripts/universal_system_audit.sh';
      
      // Read the script content and upload it
      const fs = await import('fs/promises');
      const scriptContent = await fs.readFile(localScriptPath, 'utf8');
      
      // Create script on remote server
      await this.executeCommand(connectionId, `cat > ${scriptPath} << 'EOF'\n${scriptContent}\nEOF`);
      await this.executeCommand(connectionId, `chmod +x ${scriptPath}`);
      
      this.logger.info('SSH', '📄 Universal audit script uploaded and made executable', { connectionId });
      
      // Execute the comprehensive audit script
      const auditResult = await this.executeCommand(connectionId, `${scriptPath} /tmp`);
      
      if (auditResult.exitCode !== 0) {
        this.logger.warn('SSH', '⚠️ Audit script completed with warnings', { 
          exitCode: auditResult.exitCode,
          stderr: auditResult.stderr 
        });
      }
      
      // Extract the generated archive filename from script output
      const archiveMatch = auditResult.stdout.match(/system_audit_.*\.tar\.gz/);
      const archivePath = archiveMatch ? `/tmp/${archiveMatch[0]}` : null;
      
      if (archivePath) {
        this.logger.info('SSH', '📦 Audit archive created successfully', { archivePath });
        
        // Download the archive content (for now, just get basic info about it)
        const archiveInfo = await this.executeCommand(connectionId, `ls -lh ${archivePath} && tar -tzf ${archivePath} | wc -l`);
        
        return {
          server: {
            id: connection.server.id,
            name: connection.server.name,
            ip: connection.server.ip,
            hostname: connection.server.hostname,
            collectionTime: new Date().toISOString()
          },
          data: {
            audit_script_result: {
              command: `${scriptPath} /tmp`,
              stdout: auditResult.stdout,
              stderr: auditResult.stderr,
              exitCode: auditResult.exitCode,
              timestamp: auditResult.timestamp
            },
            archive_info: {
              command: `ls -lh ${archivePath} && tar -tzf ${archivePath} | wc -l`,
              stdout: archiveInfo.stdout,
              stderr: archiveInfo.stderr,
              exitCode: archiveInfo.exitCode,
              timestamp: archiveInfo.timestamp,
              archivePath
            }
          }
        };
      } else {
        // Fallback to individual commands if script fails
        this.logger.warn('SSH', '⚠️ Falling back to individual command collection');
        return await this.gatherSystemDataFallback(connectionId);
      }
      
    } catch (error) {
      this.logger.error('SSH', '❌ Failed to execute universal audit script', { 
        error: error.message 
      });
      
      // Fallback to individual commands
      return await this.gatherSystemDataFallback(connectionId);
    }
  }

  async gatherSystemDataFallback(connectionId) {
    const connection = this.connections.get(connectionId);
    
    this.logger.info('SSH', '📊 Using fallback data collection method', { connectionId });

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
      package_updates: 'apt list --upgradable 2>/dev/null || yum check-update 2>/dev/null || echo "Update check unavailable"',
      
      // Additional comprehensive data
      env_variables: 'env',
      mount_points: 'mount',
      open_files: 'lsof | head -100',
      network_connections: 'ss -tuln',
      kernel_modules: 'lsmod',
      system_calls: 'cat /proc/sys/kernel/version',
      
      // Virtualization detection
      virtualization: 'systemd-detect-virt 2>/dev/null || echo "Not detected"',
      dmi_info: 'cat /sys/class/dmi/id/product_name 2>/dev/null || echo "Not available"'
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

  // Simple system info gathering method
  async gatherSystemInfo(connectionId) {
    const basicInfo = await this.gatherSystemDataFallback(connectionId);
    return basicInfo;
  }

  // Network monitoring methods (stubs for now)
  async startNetworkMonitoring(connectionId) {
    this.logger.info('SSH', '🌐 Starting network monitoring', { connectionId });
    return { status: 'monitoring_started', timestamp: new Date().toISOString() };
  }

  async getNetworkAnomalies(connectionId) {
    this.logger.info('SSH', '🔍 Getting network anomalies', { connectionId });
    return { anomalies: [], checked_at: new Date().toISOString() };
  }

  // Key distribution method (stub)
  async distributeKey(serverConfig) {
    this.logger.info('SSH', `🔑 Distributing key to ${serverConfig.name}`);
    return { status: 'key_distributed', timestamp: new Date().toISOString() };
  }

  // Upload script method
  async uploadScript(connectionId, scriptType) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.ssh) {
      throw new Error('Invalid connection');
    }

    try {
      const scriptContent = this.getScriptContent(scriptType);
      const remoteScriptPath = `/tmp/${scriptType}_${Date.now()}.sh`;
      
      // Upload script content directly
      await this.executeCommand(connectionId, `cat > ${remoteScriptPath} << 'EOF'\n${scriptContent}\nEOF`);
      
      this.logger.info('SSH', `📤 Script uploaded: ${scriptType}`, {
        connectionId,
        remotePath: remoteScriptPath
      });

      return remoteScriptPath;
    } catch (error) {
      this.logger.error('SSH', `Failed to upload script: ${error.message}`, {
        connectionId,
        scriptType
      });
      throw error;
    }
  }

  getScriptContent(scriptType) {
    switch (scriptType) {
      case 'system_info':
        return `#!/bin/bash
echo "=== SYSTEM INFORMATION ==="
echo "Hostname: $(hostname)"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d '"' -f2)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"
echo "Uptime: $(uptime -p)"
echo ""
echo "=== HARDWARE ==="
echo "CPU: $(lscpu | grep 'Model name' | cut -d ':' -f2 | xargs)"
echo "CPU Cores: $(nproc)"
echo "Memory: $(free -h | grep Mem | awk '{print \$2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print \$2}')"
echo ""
echo "=== NETWORK ==="
ip addr show | grep -E 'inet [0-9]' | awk '{print \$2}' | head -5
echo ""
echo "=== PROCESSES ==="
ps aux --sort=-%cpu | head -10
echo ""
echo "=== SERVICES ==="
systemctl list-units --type=service --state=running | head -10`;
      
      case 'proxmox_data_export':
        return `#!/bin/bash
echo "=== PROXMOX DATA EXPORT ==="
pveversion
pvesm status
pvenode status
qm list
pct list
pvesh get /nodes/$(hostname)/status`;
      
      default:
        throw new Error(\`Unknown script type: \${scriptType}\`);
    }
  }
}