import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ServerManager {
  constructor(logger) {
    this.logger = logger;
    this.dataDir = path.join(__dirname, '../data');
    this.serversFile = path.join(this.dataDir, 'servers.json');
    this.auditResultsDir = path.join(this.dataDir, 'audit-results');
    this.servers = [];
    
    this.initializeDataDirectory();
    this.loadServers();
  }

  async initializeDataDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.auditResultsDir, { recursive: true });
      this.logger.info('ServerManager', '📁 Data directories initialized');
    } catch (error) {
      this.logger.error('ServerManager', `Failed to initialize directories: ${error.message}`);
    }
  }

  async loadServers() {
    try {
      const data = await fs.readFile(this.serversFile, 'utf8');
      this.servers = JSON.parse(data);
      this.logger.info('ServerManager', `📋 Loaded ${this.servers.length} servers from storage`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.servers = [];
        await this.saveServers();
        this.logger.info('ServerManager', '📄 Created new servers storage file');
      } else {
        this.logger.error('ServerManager', `Failed to load servers: ${error.message}`);
        this.servers = [];
      }
    }
  }

  async saveServers() {
    try {
      await fs.writeFile(this.serversFile, JSON.stringify(this.servers, null, 2));
      this.logger.debug('ServerManager', `💾 Saved ${this.servers.length} servers to storage`);
    } catch (error) {
      this.logger.error('ServerManager', `Failed to save servers: ${error.message}`);
      throw error;
    }
  }

  async getAllServers() {
    return [...this.servers]; // Return copy to prevent external mutations
  }

  async getServer(serverId) {
    return this.servers.find(server => server.id === serverId);
  }

  async addServer(serverData) {
    // Validate required fields
    const requiredFields = ['name', 'ip', 'username', 'connectionType'];
    for (const field of requiredFields) {
      if (!serverData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate connection type specific requirements
    if (serverData.connectionType === 'password' && !serverData.password) {
      throw new Error('Password is required for password authentication');
    }
    if (serverData.connectionType === 'key' && !serverData.privateKeyPath) {
      throw new Error('Private key path is required for key authentication');
    }

    // Check for duplicate IP addresses
    const existingServer = this.servers.find(s => s.ip === serverData.ip);
    if (existingServer) {
      throw new Error(`Server with IP ${serverData.ip} already exists`);
    }

    const newServer = {
      id: uuidv4(),
      name: serverData.name.trim(),
      hostname: serverData.hostname?.trim() || null,
      ip: serverData.ip.trim(),
      port: serverData.port || 22,
      username: serverData.username.trim(),
      password: serverData.password || null,
      privateKeyPath: serverData.privateKeyPath || null,
      connectionType: serverData.connectionType,
      status: 'offline',
      securityScore: null,
      lastAudit: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.servers.push(newServer);
    await this.saveServers();

    this.logger.info('ServerManager', `🆕 Added new server: ${newServer.name}`, {
      id: newServer.id,
      ip: newServer.ip,
      connectionType: newServer.connectionType
    });

    return newServer;
  }

  async updateServer(serverId, updates) {
    const serverIndex = this.servers.findIndex(s => s.id === serverId);
    if (serverIndex === -1) {
      throw new Error('Server not found');
    }

    // Prevent updating certain protected fields
    const protectedFields = ['id', 'createdAt'];
    for (const field of protectedFields) {
      if (updates.hasOwnProperty(field)) {
        delete updates[field];
      }
    }

    // Update the server
    this.servers[serverIndex] = {
      ...this.servers[serverIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.saveServers();

    this.logger.info('ServerManager', `📝 Updated server: ${this.servers[serverIndex].name}`, {
      id: serverId,
      updatedFields: Object.keys(updates)
    });

    return this.servers[serverIndex];
  }

  async removeServer(serverId) {
    const serverIndex = this.servers.findIndex(s => s.id === serverId);
    if (serverIndex === -1) {
      throw new Error('Server not found');
    }

    const server = this.servers[serverIndex];
    this.servers.splice(serverIndex, 1);
    await this.saveServers();

    // Also remove audit results for this server
    await this.removeServerAuditResults(serverId);

    this.logger.info('ServerManager', `🗑️ Removed server: ${server.name}`, {
      id: serverId,
      ip: server.ip
    });

    return true;
  }

  async updateServerStatus(serverId, status, additionalData = {}) {
    const updates = {
      status,
      lastStatusUpdate: new Date().toISOString(),
      ...additionalData
    };

    return this.updateServer(serverId, updates);
  }

  async getServersByStatus(status) {
    return this.servers.filter(server => server.status === status);
  }

  async searchServers(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.servers.filter(server => 
      server.name.toLowerCase().includes(lowercaseQuery) ||
      server.hostname?.toLowerCase().includes(lowercaseQuery) ||
      server.ip.includes(lowercaseQuery) ||
      server.username.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Audit results management
  async saveAuditResult(serverId, auditData) {
    const server = await this.getServer(serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    const auditId = uuidv4();
    const auditResult = {
      id: auditId,
      serverId,
      serverName: server.name,
      timestamp: new Date().toISOString(),
      ...auditData
    };

    const filename = `audit-${serverId}-${Date.now()}.json`;
    const filepath = path.join(this.auditResultsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(auditResult, null, 2));

    // Update server with audit information
    await this.updateServer(serverId, {
      lastAudit: auditResult.timestamp,
      securityScore: auditData.scores?.overall || null,
      status: auditData.status === 'completed' ? 'online' : server.status
    });

    this.logger.info('ServerManager', `💾 Saved audit result for ${server.name}`, {
      auditId,
      filepath,
      overallScore: auditData.scores?.overall
    });

    return auditResult;
  }

  async getAuditResults(serverId) {
    try {
      const files = await fs.readdir(this.auditResultsDir);
      const serverAuditFiles = files.filter(file => 
        file.startsWith(`audit-${serverId}-`) && file.endsWith('.json')
      );

      const auditResults = [];
      for (const file of serverAuditFiles) {
        try {
          const filepath = path.join(this.auditResultsDir, file);
          const data = await fs.readFile(filepath, 'utf8');
          auditResults.push(JSON.parse(data));
        } catch (error) {
          this.logger.warn('ServerManager', `Failed to read audit file: ${file}`, { error: error.message });
        }
      }

      // Sort by timestamp (newest first)
      auditResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return auditResults;
    } catch (error) {
      this.logger.error('ServerManager', `Failed to get audit results for server ${serverId}: ${error.message}`);
      return [];
    }
  }

  async removeServerAuditResults(serverId) {
    try {
      const files = await fs.readdir(this.auditResultsDir);
      const serverAuditFiles = files.filter(file => 
        file.startsWith(`audit-${serverId}-`) && file.endsWith('.json')
      );

      for (const file of serverAuditFiles) {
        const filepath = path.join(this.auditResultsDir, file);
        await fs.unlink(filepath);
      }

      this.logger.info('ServerManager', `🧹 Removed ${serverAuditFiles.length} audit files for server ${serverId}`);
    } catch (error) {
      this.logger.error('ServerManager', `Failed to remove audit results: ${error.message}`);
    }
  }

  // Statistics and reporting
  async getServerStatistics() {
    const total = this.servers.length;
    const byStatus = this.servers.reduce((acc, server) => {
      acc[server.status] = (acc[server.status] || 0) + 1;
      return acc;
    }, {});

    const averageSecurityScore = this.servers
      .filter(s => s.securityScore !== null)
      .reduce((sum, s, _, arr) => sum + s.securityScore / arr.length, 0);

    const recentlyAudited = this.servers.filter(s => {
      if (!s.lastAudit) return false;
      const lastAudit = new Date(s.lastAudit);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return lastAudit > oneDayAgo;
    }).length;

    return {
      total,
      byStatus,
      averageSecurityScore: Math.round(averageSecurityScore) || 0,
      recentlyAudited,
      lastUpdated: new Date().toISOString()
    };
  }
}