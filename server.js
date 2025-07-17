#!/usr/bin/env node
// Linux Headless Security Audit Server
// Basierend auf Ihrer Python-App Implementation

import express from 'express';
import { NodeSSH } from 'node-ssh';
import WebSocket from 'ws';
import { promises as fs } from 'fs';
import path from 'path';
import cors from 'cors';
import axios from 'axios';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Lokale Datenpfade (wie in Ihrer Python-App)
const DATA_DIR = process.env.DATA_DIR || '/opt/security-audit/data';
const SSH_DIR = process.env.SSH_DIR || '/opt/security-audit/.ssh';
const SERVERS_FILE = path.join(DATA_DIR, 'servers.json');
const AUDIT_RESULTS_DIR = path.join(DATA_DIR, 'audit-results');
const LOGS_DIR = path.join(DATA_DIR, 'logs');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist')); // Statische React-App

// Logging-System (wie in Python)
class Logger {
  constructor() {
    this.logFile = path.join(LOGS_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);
  }

  async log(level, category, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      metadata,
      pid: process.pid
    };

    console.log(`[${logEntry.timestamp}] ${level.upper()} [${category}] ${message}`);
    
    try {
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }

  info(category, message, metadata) { return this.log('info', category, message, metadata); }
  warn(category, message, metadata) { return this.log('warn', category, message, metadata); }
  error(category, message, metadata) { return this.log('error', category, message, metadata); }
  debug(category, message, metadata) { return this.log('debug', category, message, metadata); }
}

const logger = new Logger();

// SSH-Service (wie Ihre Python paramiko Implementation)
class LinuxSSHService {
  constructor() {
    this.connections = new Map();
    logger.info('ssh', '🚀 Linux SSH Service initialized (paramiko-style)');
  }

  async connect(serverConfig) {
    const ssh = new NodeSSH();
    const connectionId = `ssh_${serverConfig.id}_${Date.now()}`;
    
    try {
      const hostTarget = serverConfig.hostname || serverConfig.ip;
      const connectConfig = {
        host: serverConfig.ip, // IP-first wie in Python
        port: serverConfig.port || 22,
        username: serverConfig.username,
        privateKeyPath: serverConfig.privateKeyPath || path.join(SSH_DIR, 'id_rsa'),
        readyTimeout: 10000,
        algorithms: {
          kex: ['diffie-hellman-group-exchange-sha256', 'diffie-hellman-group14-sha256'],
          cipher: ['aes128-gcm', 'aes256-gcm'],
          hmac: ['hmac-sha2-256'],
          compress: ['none']
        }
      };

      if (serverConfig.password) {
        connectConfig.password = serverConfig.password;
        delete connectConfig.privateKeyPath;
      }

      logger.info('ssh', `🔄 Attempting SSH connection to ${hostTarget}:${serverConfig.port}`, {
        username: serverConfig.username,
        method: serverConfig.password ? 'password' : 'key'
      });

      await ssh.connect(connectConfig);
      
      const connection = {
        id: connectionId,
        ssh,
        server: serverConfig,
        connected: true,
        connectedAt: new Date().toISOString()
      };

      this.connections.set(connectionId, connection);
      
      logger.info('ssh', `✅ SSH connection established to ${hostTarget}`, {
        connectionId,
        username: serverConfig.username
      });

      return connection;
    } catch (error) {
      logger.error('ssh', `❌ SSH connection failed to ${serverConfig.ip}`, {
        error: error.message,
        host: serverConfig.ip,
        port: serverConfig.port
      });
      throw error;
    }
  }

  async executeCommand(connectionId, command) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.connected) {
      throw new Error('No active SSH connection');
    }

    try {
      logger.debug('ssh', `💻 Executing: ${command}`, { connectionId });
      
      const result = await connection.ssh.execCommand(command, {
        cwd: `/home/${connection.server.username}`,
        options: { pty: true }
      });

      logger.debug('ssh', `📤 Command result: ${command}`, {
        exitCode: result.code,
        stdoutLength: result.stdout.length,
        stderrLength: result.stderr.length
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code
      };
    } catch (error) {
      logger.error('ssh', `❌ Command execution failed: ${command}`, {
        error: error.message,
        connectionId
      });
      throw error;
    }
  }

  async gatherData(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error('Connection not found');

    logger.info('ssh', '📊 Starting data collection (Python-style)', { connectionId });

    // Datensammlung wie in Ihrer gather_data.sh
    const commands = {
      os_info: 'cat /etc/os-release',
      kernel: 'uname -a',
      cpu_info: 'lscpu',
      memory: 'free -h',
      disk: 'df -h',
      network: 'ip a',
      services: 'systemctl list-units --type=service --state=running',
      firewall: 'ufw status verbose || iptables -L',
      users: 'cat /etc/passwd',
      ssh_config: 'cat /etc/ssh/sshd_config',
      processes: 'ps aux --sort=-%cpu | head -20'
    };

    const systemData = {
      server: {
        id: connection.server.id,
        ip: connection.server.ip,
        hostname: connection.server.hostname,
        collectionTime: new Date().toISOString()
      },
      data: {}
    };

    for (const [category, command] of Object.entries(commands)) {
      try {
        const result = await this.executeCommand(connectionId, command);
        systemData.data[category] = {
          command,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          timestamp: new Date().toISOString()
        };
        logger.debug('ssh', `✅ Collected: ${category}`, { connectionId, command });
      } catch (error) {
        systemData.data[category] = {
          command,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        logger.warn('ssh', `⚠️ Failed to collect: ${category}`, { error: error.message });
      }
    }

    logger.info('ssh', '📈 Data collection completed', {
      connectionId,
      categories: Object.keys(systemData.data).length
    });

    return systemData;
  }

  async disconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ssh) {
      await connection.ssh.dispose();
      this.connections.delete(connectionId);
      logger.info('ssh', '🔌 SSH connection closed', { connectionId });
    }
  }
}

// Ollama-Service (lokaler Proxy)
class OllamaService {
  constructor(baseUrl = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl;
    logger.info('ollama', '🤖 Ollama service initialized', { baseUrl });
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      logger.info('ollama', '✅ Ollama connection successful', { models: response.data.models?.length || 0 });
      return { success: true, models: response.data.models || [] };
    } catch (error) {
      logger.error('ollama', '❌ Ollama connection failed', { error: error.message, url: this.baseUrl });
      return { success: false, error: error.message };
    }
  }

  async chat(model, messages) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model,
        messages,
        stream: false
      }, { timeout: 60000 });

      logger.info('ollama', '💬 Chat completion successful', { model, messageCount: messages.length });
      return response.data;
    } catch (error) {
      logger.error('ollama', '❌ Chat completion failed', { error: error.message, model });
      throw error;
    }
  }
}

// Services initialisieren
const sshService = new LinuxSSHService();
const ollamaService = new OllamaService(process.env.OLLAMA_URL || 'http://127.0.0.1:11434');

// Datenpfade erstellen
async function initializeDirectories() {
  const dirs = [DATA_DIR, SSH_DIR, AUDIT_RESULTS_DIR, LOGS_DIR];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      logger.info('system', `📁 Directory created: ${dir}`);
    } catch (error) {
      logger.error('system', `❌ Failed to create directory: ${dir}`, { error: error.message });
    }
  }
}

// Server-Konfiguration laden/speichern
async function loadServers() {
  try {
    const data = await fs.readFile(SERVERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.info('system', '📄 Creating new servers.json file');
    return [];
  }
}

async function saveServers(servers) {
  await fs.writeFile(SERVERS_FILE, JSON.stringify(servers, null, 2));
  logger.debug('system', '💾 Servers saved to disk', { count: servers.length });
}

// API-Routen

// Server-Management
app.get('/api/servers', async (req, res) => {
  try {
    const servers = await loadServers();
    res.json(servers);
  } catch (error) {
    logger.error('api', 'Failed to load servers', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/servers', async (req, res) => {
  try {
    const servers = await loadServers();
    const newServer = {
      id: crypto.randomUUID(),
      ...req.body,
      createdAt: new Date().toISOString(),
      status: 'offline'
    };
    
    servers.push(newServer);
    await saveServers(servers);
    
    logger.info('api', '🆕 Server added', { id: newServer.id, ip: newServer.ip });
    res.json(newServer);
  } catch (error) {
    logger.error('api', 'Failed to add server', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// SSH-Verbindungen
app.post('/api/ssh/connect', async (req, res) => {
  try {
    const { serverId } = req.body;
    const servers = await loadServers();
    const server = servers.find(s => s.id === serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const connection = await sshService.connect(server);
    res.json({ connectionId: connection.id, status: 'connected' });
  } catch (error) {
    logger.error('api', 'SSH connection failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ssh/execute', async (req, res) => {
  try {
    const { connectionId, command } = req.body;
    const result = await sshService.executeCommand(connectionId, command);
    res.json(result);
  } catch (error) {
    logger.error('api', 'Command execution failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ssh/gather-data', async (req, res) => {
  try {
    const { connectionId } = req.body;
    const systemData = await sshService.gatherData(connectionId);
    
    // Daten lokal speichern
    const filename = `audit-${systemData.server.id}-${Date.now()}.json`;
    const filepath = path.join(AUDIT_RESULTS_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(systemData, null, 2));
    
    logger.info('api', '📊 System data collected and saved', { filepath });
    res.json({ systemData, savedTo: filepath });
  } catch (error) {
    logger.error('api', 'Data gathering failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Ollama-Integration
app.get('/api/ollama/status', async (req, res) => {
  const status = await ollamaService.testConnection();
  res.json(status);
});

app.post('/api/ollama/chat', async (req, res) => {
  try {
    const { model, messages } = req.body;
    const response = await ollamaService.chat(model, messages);
    res.json(response);
  } catch (error) {
    logger.error('api', 'Ollama chat failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// WebSocket für Console (wie in Python mit SocketIO)
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
  logger.info('websocket', '🔌 Console WebSocket connected');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'ssh_connect') {
        const connection = await sshService.connect(message.server);
        ws.send(JSON.stringify({
          type: 'ssh_connected',
          connectionId: connection.id
        }));
      }
      
      if (message.type === 'ssh_command') {
        const result = await sshService.executeCommand(message.connectionId, message.command);
        ws.send(JSON.stringify({
          type: 'ssh_output',
          ...result
        }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    logger.info('websocket', '🔌 Console WebSocket disconnected');
  });
});

// Statische Dateien für die React-App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Server starten
async function startServer() {
  await initializeDirectories();
  
  app.listen(PORT, '0.0.0.0', () => {
    logger.info('system', `🚀 Security Audit Server running`, {
      http: `http://0.0.0.0:${PORT}`,
      websocket: `ws://0.0.0.0:${WS_PORT}`,
      dataDir: DATA_DIR
    });
    
    console.log(`
┌─────────────────────────────────────────────────┐
│  🛡️  Security Audit Server - Linux Headless    │
├─────────────────────────────────────────────────┤
│  HTTP:      http://0.0.0.0:${PORT}               │
│  WebSocket: ws://0.0.0.0:${WS_PORT}               │
│  Data:      ${DATA_DIR.padEnd(30)} │
│  Logs:      ${LOGS_DIR.padEnd(30)} │
└─────────────────────────────────────────────────┘
    `);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('system', '🛑 Shutting down server gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('system', '💥 Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Server starten
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});