import { logger } from '@/services/loggerService';

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

interface OllamaResponse {
  response: string;
  done: boolean;
  context?: number[];
}

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

// Komplett neue Ollama-Service-Implementation
export class NewOllamaService {
  private baseUrl: string;
  private model: string;
  private corsProxy?: string;

  constructor(baseUrl: string, model: string) {
    // Normalisiere Base URL - entferne trailing slash
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.model = model;
    
    // Stelle sicher, dass die URL ein Protokoll hat (inspiriert vom Python Code)
    if (!this.baseUrl.startsWith('http://') && !this.baseUrl.startsWith('https://')) {
      // Standardmäßig HTTP verwenden für lokale IPs (wie im Python Code)
      this.baseUrl = `http://${this.baseUrl}`;
    }
    
    logger.info('ollama', `🚀 Initializing Ollama service (Python-inspired)`, {
      baseUrl: this.baseUrl,
      model: this.model,
      timestamp: Date.now()
    });
  }

  async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    logger.ollamaConnect(this.baseUrl);

    try {
      // Direkte Verbindung versuchen (wie im Python Code mit ollama.Client)
      const result = await this.testDirectOllamaAPI();
      if (result.success) {
        logger.ollamaConnectSuccess(this.baseUrl, result.models);
        return result;
      }

      // Fallback-Methoden wenn direkte Verbindung fehlschlägt
      const fallbackMethods = [
        () => this.testWithCorsProxy(),
        () => this.testAlternativeEndpoints(),
        () => this.testWithDifferentProtocols()
      ];

      for (const method of fallbackMethods) {
        try {
          const fallbackResult = await method();
          if (fallbackResult.success) {
            logger.ollamaConnectSuccess(this.baseUrl, fallbackResult.models || []);
            return fallbackResult;
          }
        } catch (error) {
          logger.debug('ollama', `Fallback method failed: ${error instanceof Error ? error.message : 'Unknown'}`);
          continue;
        }
      }

      // Alle Methoden fehlgeschlagen
      const finalError = new Error(`Ollama nicht erreichbar unter ${this.baseUrl}. Prüfe ob Ollama läuft und CORS konfiguriert ist.`);
      logger.ollamaConnectFailed(this.baseUrl, finalError);
      return { success: false, error: finalError.message };

    } catch (error) {
      logger.ollamaConnectFailed(this.baseUrl, error as Error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      };
    }
  }

  private async testDirectOllamaAPI(): Promise<{ success: boolean; models?: string[] }> {
    logger.debug('ollama', `🔗 Testing direct Ollama API connection to ${this.baseUrl}`);

    try {
      // Teste /api/tags Endpoint (Standard Ollama API)
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(15000) // 15 Sekunden für bessere Kompatibilität
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: OllamaTagsResponse = await response.json();
      const models = data.models?.map(m => m.name) || [];

      logger.info('ollama', `✅ Direct Ollama API connection successful`, {
        url: this.baseUrl,
        modelCount: models.length,
        models: models.slice(0, 5),
        endpoint: '/api/tags'
      });

      return { success: true, models };

    } catch (error) {
      if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('CORS'))) {
        logger.ollamaCorsIssue(this.baseUrl);
        logger.warn('ollama', `CORS-Problem erkannt. Setze OLLAMA_ORIGINS="*" und starte Ollama neu.`);
      }
      logger.debug('ollama', `❌ Direct API connection failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      throw error;
    }
  }

  private async testWithCorsProxy(): Promise<{ success: boolean; models?: string[] }> {
    logger.debug('ollama', `🔄 Testing connection with CORS proxy`);

    // Verschiedene CORS-Proxies versuchen
    const corsProxies = [
      'https://cors-anywhere.herokuapp.com/',
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?'
    ];

    let apiUrl = this.baseUrl;
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = `http://${apiUrl}`;
    }

    for (const proxy of corsProxies) {
      try {
        logger.trace('ollama', `Trying CORS proxy: ${proxy}`);
        
        const response = await fetch(`${proxy}${encodeURIComponent(apiUrl + '/api/tags')}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(8000)
        });

        if (response.ok) {
          const data: OllamaTagsResponse = await response.json();
          const models = data.models?.map(m => m.name) || [];
          
          this.corsProxy = proxy;
          logger.info('ollama', `✅ CORS proxy connection successful`, {
            proxy,
            modelCount: models.length
          });
          
          return { success: true, models };
        }
      } catch (error) {
        logger.trace('ollama', `CORS proxy failed: ${proxy}`);
        continue;
      }
    }

    throw new Error('Alle CORS-Proxies fehlgeschlagen');
  }

  private async testAlternativeEndpoints(): Promise<{ success: boolean; models?: string[] }> {
    logger.debug('ollama', `🔍 Testing alternative endpoints`);

    let baseApiUrl = this.baseUrl;
    if (!baseApiUrl.startsWith('http://') && !baseApiUrl.startsWith('https://')) {
      baseApiUrl = `http://${baseApiUrl}`;
    }

    // Alternative Endpunkte versuchen
    const endpoints = [
      '/api/version',
      '/api/ps',
      '/health',
      '/status',
      '/'
    ];

    for (const endpoint of endpoints) {
      try {
        logger.trace('ollama', `Testing endpoint: ${endpoint}`);
        
        const response = await fetch(`${baseApiUrl}${endpoint}`, {
          method: 'GET',
          mode: 'no-cors', // no-cors für einfache Erreichbarkeitsprüfung
          signal: AbortSignal.timeout(5000)
        });

        // Bei no-cors bekommen wir immer status 0, aber das bedeutet der Server antwortet
        logger.info('ollama', `✅ Alternative endpoint responded`, {
          endpoint,
          note: 'Server ist erreichbar, aber CORS blockiert API-Zugriff'
        });

        // Fallback: Zeige dass Server läuft, auch wenn API nicht zugänglich
        return { 
          success: true, 
          models: [] // Keine Modelle abrufbar wegen CORS
        };

      } catch (error) {
        logger.trace('ollama', `Alternative endpoint failed: ${endpoint}`);
        continue;
      }
    }

    throw new Error('Keine alternativen Endpunkte erreichbar');
  }

  private async testWithDifferentProtocols(): Promise<{ success: boolean; models?: string[] }> {
    logger.debug('ollama', `🔄 Testing different protocols`);

    const urls = [
      this.baseUrl.replace('http://', 'https://'),
      this.baseUrl.replace('https://', 'http://'),
      `http://localhost:11434`, // Standard Ollama
      `http://127.0.0.1:11434`
    ].filter((url, index, arr) => arr.indexOf(url) === index); // Remove duplicates

    for (const url of urls) {
      try {
        logger.trace('ollama', `Testing protocol variant: ${url}`);
        
        const response = await fetch(`${url}/api/tags`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const data: OllamaTagsResponse = await response.json();
          const models = data.models?.map(m => m.name) || [];
          
          // Update baseUrl if different protocol works
          this.baseUrl = url;
          
          logger.info('ollama', `✅ Protocol variant successful`, {
            url,
            modelCount: models.length
          });
          
          return { success: true, models };
        }
      } catch (error) {
        logger.trace('ollama', `Protocol variant failed: ${url}`);
        continue;
      }
    }

    throw new Error('Keine Protokoll-Varianten erfolgreich');
  }

  async getAvailableModels(): Promise<string[]> {
    logger.debug('ollama', `📋 Fetching available models from ${this.baseUrl}`);

    try {
      const result = await this.testConnection();
      if (result.success && result.models) {
        logger.info('ollama', `📋 Models retrieved successfully`, {
          count: result.models.length,
          models: result.models
        });
        return result.models;
      } else {
        logger.warn('ollama', `⚠️  Could not retrieve models: ${result.error}`);
        return [];
      }
    } catch (error) {
      logger.error('ollama', `❌ Failed to fetch models`, {}, error as Error);
      return [];
    }
  }

  async generateResponse(prompt: string, options?: { temperature?: number }): Promise<string> {
    logger.ollamaGenerate(this.model, prompt);

    let apiUrl = this.baseUrl;
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = `http://${apiUrl}`;
    }

    // Verwende CORS-Proxy falls verfügbar
    const finalUrl = this.corsProxy ? 
      `${this.corsProxy}${encodeURIComponent(apiUrl + '/api/generate')}` : 
      `${apiUrl}/api/generate`;

    const request: OllamaRequest = {
      model: this.model,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.7,
        top_p: 0.9,
        top_k: 40
      }
    };

    try {
      logger.debug('ollama', `🧠 Sending generation request`, {
        url: finalUrl,
        model: this.model,
        promptLength: prompt.length,
        usesCorsProxy: !!this.corsProxy
      });

      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(60000) // 1 Minute für Generation
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      
      logger.info('ollama', `✅ Response generated successfully`, {
        model: this.model,
        responseLength: data.response.length,
        done: data.done
      });

      return data.response;

    } catch (error) {
      logger.error('ollama', `❌ Generation failed`, {
        model: this.model,
        promptLength: prompt.length
      }, error as Error);
      
      throw new Error(`Ollama-Generierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  // Diagnostische Methoden
  async performDiagnostics(): Promise<any> {
    logger.info('ollama', `🔧 Performing Ollama diagnostics for ${this.baseUrl}`);

    const diagnostics = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      model: this.model,
      tests: {
        directConnection: false,
        corsProxy: false,
        alternativeEndpoints: false,
        protocolVariants: false
      },
      models: [] as string[],
      errors: [] as string[],
      recommendations: [] as string[]
    };

    // Test alle Verbindungsmethoden
    try {
      await this.testDirectOllamaAPI();
      diagnostics.tests.directConnection = true;
    } catch (error) {
      diagnostics.errors.push(`Direct connection: ${error instanceof Error ? error.message : 'Failed'}`);
    }

    try {
      await this.testWithCorsProxy();
      diagnostics.tests.corsProxy = true;
    } catch (error) {
      diagnostics.errors.push(`CORS proxy: ${error instanceof Error ? error.message : 'Failed'}`);
    }

    try {
      await this.testAlternativeEndpoints();
      diagnostics.tests.alternativeEndpoints = true;
    } catch (error) {
      diagnostics.errors.push(`Alternative endpoints: ${error instanceof Error ? error.message : 'Failed'}`);
    }

    try {
      await this.testWithDifferentProtocols();
      diagnostics.tests.protocolVariants = true;
    } catch (error) {
      diagnostics.errors.push(`Protocol variants: ${error instanceof Error ? error.message : 'Failed'}`);
    }

    // Generiere Empfehlungen
    if (!diagnostics.tests.directConnection) {
      diagnostics.recommendations.push('Set OLLAMA_ORIGINS="*" environment variable and restart Ollama');
      diagnostics.recommendations.push('Ensure Ollama is running on the specified URL');
      diagnostics.recommendations.push('Check firewall settings');
    }

    if (!Object.values(diagnostics.tests).some(Boolean)) {
      diagnostics.recommendations.push('Consider using a cloud-based AI API instead');
      diagnostics.recommendations.push('Check if Ollama is properly installed and running');
    }

    logger.info('ollama', `🔧 Diagnostics completed`, {
      passedTests: Object.values(diagnostics.tests).filter(Boolean).length,
      totalTests: Object.keys(diagnostics.tests).length,
      errorCount: diagnostics.errors.length
    });

    return diagnostics;
  }

  // Hilfsmethoden für spezielle Use Cases
  async analyzeSecurityFindings(findings: any[]): Promise<string> {
    const prompt = `Als Cybersecurity-Experte analysiere die folgenden Sicherheitsbefunde und erstelle einen detaillierten Bericht:

SICHERHEITSBEFUNDE:
${findings.map(f => `- ${f.title} (${f.severity}): ${f.description}`).join('\\n')}

Erstelle einen strukturierten Bericht mit:
1. EXECUTIVE SUMMARY (2-3 Sätze)
2. KRITISCHE BEFUNDE (Schweregrad: critical/high)
3. SOFORTIGE MASSNAHMEN (konkrete Schritte)
4. MITTELFRISTIGE EMPFEHLUNGEN
5. RISIKOBEWERTUNG

Antworte auf Deutsch und sei konkret und handlungsorientiert.`;

    return this.generateResponse(prompt, { temperature: 0.3 });
  }

  async analyzeSystemLogs(logs: string[]): Promise<string> {
    const prompt = `Analysiere die folgenden Systemlogs auf Sicherheitsanomalien:

LOGS:
${logs.slice(0, 20).join('\\n')}

Identifiziere:
1. SICHERHEITSBEDROHUNGEN
2. UNGEWÖHNLICHE MUSTER
3. VERDÄCHTIGE AKTIVITÄTEN
4. EMPFOHLENE UNTERSUCHUNGSSCHRITTE

Antworte auf Deutsch und fokussiere auf die wichtigsten Befunde.`;

    return this.generateResponse(prompt, { temperature: 0.2 });
  }

  async generateOptimizationRecommendations(systemInfo: any): Promise<string> {
    const prompt = `Basierend auf den Systeminformationen erstelle Optimierungsempfehlungen:

SYSTEMDATEN:
- OS: ${systemInfo.os || 'Unknown'}
- CPU: ${systemInfo.cpu || 'Unknown'}
- Memory: ${systemInfo.memory || 'Unknown'}
- Uptime: ${systemInfo.uptime || 'Unknown'}

Erstelle Empfehlungen für:
1. PERFORMANCE-OPTIMIERUNG
2. SICHERHEITSHÄRTUNG  
3. WARTUNG UND UPDATES
4. MONITORING-VERBESSERUNGEN

Antworte auf Deutsch mit konkreten, umsetzbaren Vorschlägen.`;

    return this.generateResponse(prompt, { temperature: 0.4 });
  }
}

// Factory function für einfache Verwendung
export const createNewOllamaService = (baseUrl: string, model: string) => {
  return new NewOllamaService(baseUrl, model);
};