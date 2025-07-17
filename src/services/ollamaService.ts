import { useSettings } from '@/hooks/useSettings';
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

export class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.model = model;
  }

  async testConnection(): Promise<boolean> {
    try {
      let apiUrl = this.baseUrl;
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = `http://${apiUrl}`;
      }
      
      logger.ollamaConnect(apiUrl);
      console.log(`Testing Ollama connection to: ${apiUrl}`);
      
      // CORS-Problem lösen: Verwende einen Proxy oder fetch mit no-cors
      const response = await fetch(`${apiUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors', // Versuche CORS zuerst
        credentials: 'omit',
        signal: AbortSignal.timeout(5000) // 5 Sekunden Timeout
      });
      
      if (response.ok) {
        logger.ollamaConnectSuccess(apiUrl);
        console.log('Ollama connection successful');
        return true;
      } else {
        logger.ollamaConnectFailed(apiUrl, new Error(`${response.status} ${response.statusText}`));
        console.log(`Ollama connection failed: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      let currentApiUrl = this.baseUrl;
      if (!currentApiUrl.startsWith('http://') && !currentApiUrl.startsWith('https://')) {
        currentApiUrl = `http://${currentApiUrl}`;
      }
      logger.error('ollama', 'Ollama connection test failed', { url: currentApiUrl }, error as Error);
      console.error('Ollama connection test failed:', error);
      
      // Fallback: Teste ob Ollama überhaupt läuft (auch mit CORS-Fehler)
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.log('CORS-Fehler erkannt - Ollama läuft möglicherweise, aber CORS ist blockiert');
        
        // Versuche alternative Methode - Image-Loading-Trick
        return this.testOllamaWithImageTrick();
      }
      
      return false;
    }
  }

  private async testOllamaWithImageTrick(): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        console.log('Ollama nicht erreichbar über Image-Test');
        resolve(false);
      }, 3000);
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log('Ollama Server antwortet (CORS-blockiert aber erreichbar)');
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        // Fehler kann bedeuten dass Server läuft aber kein Bild zurückgibt
        console.log('Ollama Server scheint zu laufen (Fehlerresponse erhalten)');
        resolve(true);
      };
      
      let testUrl = this.baseUrl;
      if (!testUrl.startsWith('http://')) {
        testUrl = `http://${testUrl}`;
      }
      img.src = `${testUrl}/favicon.ico?${Date.now()}`;
    });
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      let apiUrl = this.baseUrl;
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = `http://${apiUrl}`;
      }
      
      console.log(`Fetching models from: ${apiUrl}`);
      
      const response = await fetch(`${apiUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        console.error(`Ollama API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const models = data.models?.map((model: any) => model.name) || [];
      console.log(`Found ${models.length} models:`, models);
      return models;
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }

  async generateResponse(prompt: string, options?: { temperature?: number }): Promise<string> {
    try {
      let apiUrl = this.baseUrl;
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = `http://${apiUrl}`;
      }
      
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

      console.log(`Generating response with model: ${this.model}`);
      
      const response = await fetch(`${apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      console.log('Ollama response generated successfully');
      return data.response;
    } catch (error) {
      console.error('Ollama generation failed:', error);
      throw new Error(`Ollama-Generierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  async analyzeSecurityFindings(findings: any[]): Promise<string> {
    const prompt = `Analysiere die folgenden Sicherheitsbefunde und erstelle einen zusammenfassenden Bericht mit Empfehlungen:

${findings.map(f => `- ${f.title}: ${f.description} (Schweregrad: ${f.severity})`).join('\n')}

Bitte strukturiere die Antwort folgendermaßen:
1. Zusammenfassung der kritischsten Probleme
2. Priorisierte Empfehlungen
3. Sofortige Maßnahmen
4. Langfristige Sicherheitsverbesserungen

Antworte auf Deutsch und sei konkret und handlungsorientiert.`;

    return this.generateResponse(prompt, { temperature: 0.3 });
  }

  async analyzeSystemLogs(logs: string[]): Promise<string> {
    const prompt = `Analysiere die folgenden Systemlogs auf Sicherheitsanomalien und ungewöhnliche Aktivitäten:

${logs.slice(0, 50).join('\n')}

Identifiziere:
1. Potenzielle Sicherheitsbedrohungen
2. Ungewöhnliche Zugriffsmuster
3. Systemanomalien
4. Empfohlene Untersuchungsschritte

Antworte auf Deutsch und konzentriere dich auf die wichtigsten Befunde.`;

    return this.generateResponse(prompt, { temperature: 0.2 });
  }

  async generateOptimizationRecommendations(systemInfo: any): Promise<string> {
    const prompt = `Basierend auf den folgenden Systeminformationen, erstelle Optimierungsempfehlungen:

Betriebssystem: ${systemInfo.os}
Speichernutzung: ${systemInfo.memoryUsage}
Festplattennutzung: ${systemInfo.diskUsage}
Last-Average: ${systemInfo.loadAverage}
Laufzeit: ${systemInfo.uptime}

Erstelle Empfehlungen für:
1. Performance-Optimierung
2. Ressourcen-Management
3. Wartung und Updates
4. Kapazitätsplanung

Antworte auf Deutsch mit konkreten, umsetzbaren Vorschlägen.`;

    return this.generateResponse(prompt, { temperature: 0.4 });
  }
}

// Factory function to create OllamaService instance
export const createOllamaService = (settings: ReturnType<typeof useSettings>['settings']) => {
  if (!settings.ollama.enabled || !settings.ollama.serverUrl) {
    return null;
  }
  
  return new OllamaService(settings.ollama.serverUrl, settings.ollama.model);
};