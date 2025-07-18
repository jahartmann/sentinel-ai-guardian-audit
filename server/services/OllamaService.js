import axios from 'axios';

export class OllamaService {
  constructor(logger, baseUrl = 'http://192.168.0.48:80') {
    this.logger = logger;
    this.baseUrl = baseUrl;
    this.logger.info('Ollama', '🤖 Ollama service initialized', { baseUrl });
  }

  async testConnection() {
    try {
      this.logger.info('Ollama', '🔄 Testing connection to Ollama');
      
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const models = response.data.models || [];
      this.logger.info('Ollama', '✅ Ollama connection successful', { 
        modelCount: models.length,
        models: models.map(m => m.name)
      });

      return {
        success: true,
        models: models,
        status: 'connected',
        url: this.baseUrl
      };
    } catch (error) {
      this.logger.error('Ollama', '❌ Ollama connection failed', {
        error: error.message,
        url: this.baseUrl,
        code: error.code
      });

      return {
        success: false,
        error: error.message,
        status: 'disconnected',
        url: this.baseUrl
      };
    }
  }

  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });

      const models = response.data.models || [];
      this.logger.info('Ollama', `📋 Retrieved ${models.length} available models`);
      
      return models.map(model => ({
        name: model.name,
        model: model.model,
        size: model.size,
        digest: model.digest,
        modified_at: model.modified_at,
        details: model.details
      }));
    } catch (error) {
      this.logger.error('Ollama', `Failed to get models: ${error.message}`);
      throw new Error(`Failed to retrieve Ollama models: ${error.message}`);
    }
  }

  async getRunningModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/ps`, {
        timeout: 5000
      });

      const models = response.data.models || [];
      this.logger.info('Ollama', `📊 Retrieved ${models.length} running models`);
      
      return models.map(model => ({
        name: model.name,
        model: model.model,
        size: model.size,
        size_vram: model.size_vram,
        digest: model.digest,
        details: model.details,
        expires_at: model.expires_at
      }));
    } catch (error) {
      this.logger.error('Ollama', `Failed to get running models: ${error.message}`);
      throw new Error(`Failed to retrieve running models: ${error.message}`);
    }
  }

  async getModelInfo(modelName) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/show`, {
        model: modelName
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('Ollama', `📄 Retrieved model info for ${modelName}`);
      
      return {
        modelfile: response.data.modelfile,
        parameters: response.data.parameters,
        template: response.data.template,
        details: response.data.details,
        model_info: response.data.model_info,
        capabilities: response.data.capabilities
      };
    } catch (error) {
      this.logger.error('Ollama', `Failed to get model info for ${modelName}: ${error.message}`);
      throw new Error(`Failed to retrieve model info: ${error.message}`);
    }
  }

  async chat(model, messages) {
    try {
      this.logger.info('Ollama', `💬 Starting chat with model: ${model}`, {
        messageCount: messages.length
      });

      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40
        }
      }, {
        timeout: 120000, // 2 minutes for AI responses
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('Ollama', '✅ Chat completion successful', {
        model,
        responseLength: response.data.message?.content?.length || 0
      });

      return {
        success: true,
        message: response.data.message,
        model,
        created_at: response.data.created_at,
        done: response.data.done,
        total_duration: response.data.total_duration,
        load_duration: response.data.load_duration,
        prompt_eval_count: response.data.prompt_eval_count,
        prompt_eval_duration: response.data.prompt_eval_duration,
        eval_count: response.data.eval_count,
        eval_duration: response.data.eval_duration
      };
    } catch (error) {
      this.logger.error('Ollama', `❌ Chat failed with model ${model}`, {
        error: error.message,
        model
      });
      throw new Error(`Ollama chat failed: ${error.message}`);
    }
  }

  async generateResponse(prompt, model = 'llama3.1:8b', options = {}) {
    try {
      this.logger.info('Ollama', `🎯 Generating response with ${model}`);

      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          top_k: options.top_k || 40,
          ...options
        }
      }, {
        timeout: 120000, // 2 minutes
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('Ollama', '✅ Response generated successfully', {
        model,
        responseLength: response.data.response?.length || 0
      });

      return {
        success: true,
        response: response.data.response,
        model,
        created_at: response.data.created_at,
        done: response.data.done,
        total_duration: response.data.total_duration,
        load_duration: response.data.load_duration,
        prompt_eval_count: response.data.prompt_eval_count,
        prompt_eval_duration: response.data.prompt_eval_duration,
        eval_count: response.data.eval_count,
        eval_duration: response.data.eval_duration
      };
    } catch (error) {
      this.logger.error('Ollama', `❌ Generation failed: ${error.message}`);
      throw new Error(`Response generation failed: ${error.message}`);
    }
  }

  async embeddings(model, prompt) {
    try {
      this.logger.info('Ollama', `🔢 Generating embeddings with ${model}`);

      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model,
        prompt
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('Ollama', '✅ Embeddings generated successfully', {
        model,
        embeddingLength: response.data.embedding?.length || 0
      });

      return {
        success: true,
        embedding: response.data.embedding
      };
    } catch (error) {
      this.logger.error('Ollama', `❌ Embeddings generation failed: ${error.message}`);
      throw new Error(`Embeddings generation failed: ${error.message}`);
    }
  }

  // Model Management Methods
  async pullModel(modelName) {
    try {
      this.logger.info('Ollama', `⬇️ Pulling model: ${modelName}`);

      const response = await axios.post(`${this.baseUrl}/api/pull`, {
        model: modelName
      }, {
        timeout: 300000, // 5 minutes for model downloads
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('Ollama', '✅ Model pulled successfully', { model: modelName });

      return {
        success: true,
        model: modelName,
        status: response.data.status
      };
    } catch (error) {
      this.logger.error('Ollama', `❌ Failed to pull model ${modelName}: ${error.message}`);
      throw new Error(`Failed to pull model: ${error.message}`);
    }
  }

  async deleteModel(modelName) {
    try {
      this.logger.info('Ollama', `🗑️ Deleting model: ${modelName}`);

      const response = await axios.delete(`${this.baseUrl}/api/delete`, {
        data: {
          model: modelName
        },
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('Ollama', '✅ Model deleted successfully', { model: modelName });

      return {
        success: true,
        model: modelName,
        deleted: true
      };
    } catch (error) {
      this.logger.error('Ollama', `❌ Failed to delete model ${modelName}: ${error.message}`);
      throw new Error(`Failed to delete model: ${error.message}`);
    }
  }

  async copyModel(source, destination) {
    try {
      this.logger.info('Ollama', `📋 Copying model from ${source} to ${destination}`);

      const response = await axios.post(`${this.baseUrl}/api/copy`, {
        source,
        destination
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('Ollama', '✅ Model copied successfully', { source, destination });

      return {
        success: true,
        source,
        destination,
        copied: true
      };
    } catch (error) {
      this.logger.error('Ollama', `❌ Failed to copy model: ${error.message}`);
      throw new Error(`Failed to copy model: ${error.message}`);
    }
  }

  async loadModel(modelName) {
    try {
      this.logger.info('Ollama', `📥 Loading model: ${modelName}`);

      // Load model by making a generate request with empty prompt
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: modelName,
        prompt: "",
        keep_alive: 300 // Keep loaded for 5 minutes
      }, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('Ollama', '✅ Model loaded successfully', { model: modelName });

      return {
        success: true,
        model: modelName,
        loaded: true
      };
    } catch (error) {
      this.logger.error('Ollama', `❌ Failed to load model ${modelName}: ${error.message}`);
      throw new Error(`Failed to load model: ${error.message}`);
    }
  }

  async unloadModel(modelName) {
    try {
      this.logger.info('Ollama', `📤 Unloading model: ${modelName}`);

      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: modelName,
        prompt: "",
        keep_alive: 0
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('Ollama', '✅ Model unloaded successfully', { model: modelName });

      return {
        success: true,
        model: modelName,
        unloaded: true
      };
    } catch (error) {
      this.logger.error('Ollama', `❌ Failed to unload model ${modelName}: ${error.message}`);
      throw new Error(`Failed to unload model: ${error.message}`);
    }
  }

  async getVersion() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/version`, {
        timeout: 5000
      });

      this.logger.info('Ollama', '📋 Retrieved Ollama version', { version: response.data.version });

      return {
        success: true,
        version: response.data.version
      };
    } catch (error) {
      this.logger.error('Ollama', `Failed to get version: ${error.message}`);
      throw new Error(`Failed to retrieve version: ${error.message}`);
    }
  }

  // Specialized methods for security analysis
  async analyzeSecurityFindings(findings, model = 'llama3.1:8b') {
    const prompt = `Als Cybersecurity-Experte analysiere diese Sicherheitsbefunde und erstelle einen strukturierten Bericht:

SICHERHEITSBEFUNDE:
${findings.map(f => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description}`).join('\n')}

Erstelle eine Analyse mit:
1. **Zusammenfassung der kritischsten Probleme**
2. **Priorisierte Empfehlungen (nach Risiko sortiert)**
3. **Sofortige Maßnahmen (heute umsetzbar)**
4. **Langfristige Sicherheitsverbesserungen**
5. **Geschätzter Aufwand für Behebung**

Antworte auf Deutsch und sei konkret und handlungsorientiert.`;

    return this.generateResponse(prompt, model, { temperature: 0.3 });
  }

  async analyzeSystemLogs(logs, model = 'llama3.1:8b') {
    const prompt = `Analysiere diese Linux-Systemlogs auf Sicherheitsanomalien:

LOGS:
${logs.slice(0, 100).join('\n')}

Identifiziere:
1. **Potenzielle Sicherheitsbedrohungen**
2. **Ungewöhnliche Zugriffsmuster** 
3. **Systemanomalien**
4. **Verdächtige Aktivitäten**
5. **Empfohlene Untersuchungsschritte**

Konzentriere dich auf die wichtigsten Befunde. Antworte auf Deutsch.`;

    return this.generateResponse(prompt, model, { temperature: 0.2 });
  }

  async generateOptimizationRecommendations(systemData, model = 'llama3.1:8b') {
    const prompt = `Erstelle Optimierungsempfehlungen basierend auf diesen Linux-Systemdaten:

SYSTEMINFO:
- OS: ${systemData.os_info?.stdout || 'Unknown'}
- Kernel: ${systemData.kernel?.stdout || 'Unknown'}
- CPU: ${systemData.cpu_info?.stdout?.split('\n').slice(0, 5).join(' ') || 'Unknown'}
- Memory: ${systemData.memory_info?.stdout || 'Unknown'}
- Disk: ${systemData.disk_usage?.stdout || 'Unknown'}

Erstelle Empfehlungen für:
1. **Performance-Optimierung**
2. **Ressourcen-Management** 
3. **Wartung und Updates**
4. **Kapazitätsplanung**
5. **Sicherheitsverbesserungen**

Antworte auf Deutsch mit konkreten, umsetzbaren Vorschlägen.`;

    return this.generateResponse(prompt, model, { temperature: 0.4 });
  }

  // Health check method
  async healthCheck() {
    try {
      const start = Date.now();
      const result = await this.testConnection();
      const responseTime = Date.now() - start;

      return {
        ...result,
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: -1,
        timestamp: new Date().toISOString()
      };
    }
  }
}
}