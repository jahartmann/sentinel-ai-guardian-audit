#!/usr/bin/env node

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import services
import { SSHService } from './services/SSHService.js';
import { OllamaService } from './services/OllamaService.js';
import { AuditService } from './services/AuditService.js';
import { Logger } from './services/Logger.js';
import { ServerManager } from './services/ServerManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuration
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 5001;

// Initialize services
const logger = new Logger();
const sshService = new SSHService(logger);
const ollamaService = new OllamaService(logger);
const auditService = new AuditService(logger, sshService, ollamaService);
const serverManager = new ServerManager(logger);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../dist')));

// ============= API ROUTES =============

// Import route handlers
import ollamaRoutes from './routes/ollama.js';

// Use routes
app.use('/api/ollama', ollamaRoutes);

// Server Management Routes
app.get('/api/servers', async (req, res) => {
  try {
    const servers = await serverManager.getAllServers();
    res.json({ success: true, data: servers });
  } catch (error) {
    logger.error('API', `Failed to get servers: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/servers', async (req, res) => {
  try {
    const server = await serverManager.addServer(req.body);
    res.json({ success: true, data: server });
  } catch (error) {
    logger.error('API', `Failed to add server: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/servers/:id', async (req, res) => {
  try {
    await serverManager.removeServer(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('API', `Failed to remove server: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SSH Connection Routes
app.post('/api/ssh/connect', async (req, res) => {
  try {
    const { serverId } = req.body;
    const server = await serverManager.getServer(serverId);
    if (!server) {
      return res.status(404).json({ success: false, error: 'Server not found' });
    }

    const connection = await sshService.connect(server);
    res.json({ 
      success: true, 
      data: { 
        connectionId: connection.id,
        status: connection.status 
      } 
    });
  } catch (error) {
    logger.error('SSH', `Connection failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ssh/execute', async (req, res) => {
  try {
    const { connectionId, command } = req.body;
    const result = await sshService.executeCommand(connectionId, command);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('SSH', `Command execution failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ssh/gather-data', async (req, res) => {
  try {
    const { connectionId } = req.body;
    const systemData = await sshService.gatherSystemData(connectionId);
    res.json({ success: true, data: { systemData } });
  } catch (error) {
    logger.error('SSH', `Data gathering failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ollama Routes
app.get('/api/ollama/status', async (req, res) => {
  try {
    const status = await ollamaService.testConnection();
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Ollama', `Status check failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ollama/chat', async (req, res) => {
  try {
    const { model, messages } = req.body;
    const response = await ollamaService.chat(model, messages);
    res.json({ success: true, data: response });
  } catch (error) {
    logger.error('Ollama', `Chat failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Audit Routes
app.post('/api/audit/start', async (req, res) => {
  try {
    const { serverId, model } = req.body;
    const auditId = await auditService.startAudit(serverId, model, io);
    res.json({ success: true, data: { auditId } });
  } catch (error) {
    logger.error('Audit', `Failed to start audit: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/audit/:auditId/status', async (req, res) => {
  try {
    const status = await auditService.getAuditStatus(req.params.auditId);
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Audit', `Failed to get audit status: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= SOCKET.IO REAL-TIME EVENTS =============

io.on('connection', (socket) => {
  logger.info('WebSocket', `Client connected: ${socket.id}`);

  // SSH Console Events
  socket.on('ssh_connect', async (data) => {
    try {
      const { serverId } = data;
      const server = await serverManager.getServer(serverId);
      if (!server) {
        socket.emit('ssh_error', { error: 'Server not found' });
        return;
      }

      const connection = await sshService.connect(server);
      socket.emit('ssh_connected', { 
        connectionId: connection.id,
        serverName: server.name 
      });
      
      logger.info('SSH', `Console connected for ${server.name}`);
    } catch (error) {
      socket.emit('ssh_error', { error: error.message });
      logger.error('SSH', `Console connection failed: ${error.message}`);
    }
  });

  socket.on('ssh_command', async (data) => {
    try {
      const { connectionId, command } = data;
      const result = await sshService.executeCommand(connectionId, command);
      
      socket.emit('ssh_output', {
        command,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      });
    } catch (error) {
      socket.emit('ssh_error', { error: error.message });
    }
  });

  socket.on('ssh_disconnect', async (data) => {
    try {
      const { connectionId } = data;
      await sshService.disconnect(connectionId);
      socket.emit('ssh_disconnected');
      logger.info('SSH', `Console disconnected: ${connectionId}`);
    } catch (error) {
      socket.emit('ssh_error', { error: error.message });
    }
  });

  // Audit Progress Events
  socket.on('join_audit_room', (auditId) => {
    socket.join(`audit_${auditId}`);
    logger.info('Audit', `Client joined audit room: ${auditId}`);
  });

  socket.on('leave_audit_room', (auditId) => {
    socket.leave(`audit_${auditId}`);
  });

  socket.on('disconnect', () => {
    logger.info('WebSocket', `Client disconnected: ${socket.id}`);
  });
});

// Serve React App for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Server', `Unhandled error: ${error.message}`, error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  logger.info('Server', `
┌─────────────────────────────────────────────────────┐
│  🛡️  Linux Security Audit System                   │
├─────────────────────────────────────────────────────┤
│  HTTP Server: http://0.0.0.0:${PORT}                │
│  WebSocket:   ws://0.0.0.0:${PORT}                  │
│  Status:      Production Ready                      │
└─────────────────────────────────────────────────────┘
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Server', 'Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Server', `Uncaught exception: ${error.message}`, error);
  process.exit(1);
});

export { io };