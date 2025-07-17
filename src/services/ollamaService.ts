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
      // Verwende Backend-Proxy für Ollama
      const { backendService } = await import('@/services/backendService');
      const response = await backendService.getOllamaStatus();
      
      if (response.success && (response.data as any)?.success) {
        logger.ollamaConnectSuccess(this.baseUrl);
        console.log('Ollama connection successful via backend');
        return true;
      } else {
        logger.ollamaConnectFailed(this.baseUrl, new Error(response.error || 'Connection failed'));
        console.log('Ollama connection failed:', response.error);
        return false;
      }
    } catch (error) {
      logger.error('ollama', 'Ollama connection test failed', { url: this.baseUrl }, error as Error);
      console.error('Ollama connection test failed:', error);
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
      const { backendService } = await import('@/services/backendService');
      const response = await backendService.getOllamaStatus();
      
      if (response.success && (response.data as any)?.models) {
        console.log(`Found ${(response.data as any).models.length} models:`, (response.data as any).models);
        return (response.data as any).models.map((model: any) => model.name || model);
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }

  async generateResponse(prompt: string, options?: { temperature?: number }): Promise<string> {
    try {
      const { backendService } = await import('@/services/backendService');
      
      const messages = [
        { role: 'user', content: prompt }
      ];
      
      console.log(`Generating response with model: ${this.model}`);
      
      const response = await backendService.sendOllamaChat(this.model, messages);
      
      if (response.success && (response.data as any)?.message?.content) {
        console.log('Ollama response generated successfully');
        return (response.data as any).message.content;
      } else {
        throw new Error(response.error || 'No response from Ollama');
      }
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