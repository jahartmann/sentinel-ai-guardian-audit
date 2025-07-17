import { useSettings } from '@/hooks/useSettings';

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
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit'
      });
      return response.ok;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      // Try alternative endpoint for load balancers
      try {
        const healthResponse = await fetch(`${this.baseUrl}/api/version`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit'
        });
        return healthResponse.ok;
      } catch (healthError) {
        console.error('Ollama health check also failed:', healthError);
        return false;
      }
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        // Try alternative for load balancers
        const altResponse = await fetch(`${this.baseUrl}/api/ps`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (altResponse.ok) {
          const altData = await altResponse.json();
          return altData.models?.map((model: any) => model.name) || [];
        }
        
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      // Return common models as fallback for load balancers
      return ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'gemma2'];
    }
  }

  async generateResponse(prompt: string, options?: { temperature?: number }): Promise<string> {
    try {
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

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama generation failed:', error);
      throw new Error('Failed to generate response from Ollama');
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