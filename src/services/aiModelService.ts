interface AIModelConfig {
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

interface AIResponse {
  content: string;
  usage?: {
    tokens: number;
    cost?: number;
  };
}

export class AIModelService {
  private configs: AIModelConfig[] = [];

  constructor() {
    this.loadConfigs();
  }

  private loadConfigs() {
    try {
      const saved = localStorage.getItem('ai_model_configs');
      this.configs = saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load AI model configs:', error);
      this.configs = [];
    }
  }

  private saveConfigs() {
    localStorage.setItem('ai_model_configs', JSON.stringify(this.configs));
  }

  addModel(config: Omit<AIModelConfig, 'name'> & { name?: string }): void {
    const name = config.name || `${config.type}-${Date.now()}`;
    
    const newConfig: AIModelConfig = {
      ...config,
      name
    };

    this.configs.push(newConfig);
    this.saveConfigs();
  }

  removeModel(name: string): void {
    this.configs = this.configs.filter(c => c.name !== name);
    this.saveConfigs();
  }

  updateModel(name: string, updates: Partial<AIModelConfig>): void {
    const index = this.configs.findIndex(c => c.name === name);
    if (index !== -1) {
      this.configs[index] = { ...this.configs[index], ...updates };
      this.saveConfigs();
    }
  }

  getModels(): AIModelConfig[] {
    return [...this.configs];
  }

  getEnabledModels(): AIModelConfig[] {
    return this.configs.filter(c => c.enabled);
  }

  async testConnection(name: string): Promise<boolean> {
    const config = this.configs.find(c => c.name === name);
    if (!config) return false;

    try {
      switch (config.type) {
        case 'ollama':
          return await this.testOllamaConnection(config);
        case 'openai':
          return await this.testOpenAIConnection(config);
        case 'anthropic':
          return await this.testAnthropicConnection(config);
        case 'custom':
          return await this.testCustomConnection(config);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to test ${config.type} connection:`, error);
      return false;
    }
  }

  private async testOllamaConnection(config: AIModelConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async testOpenAIConnection(config: AIModelConfig): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async testAnthropicConnection(config: AIModelConfig): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': config.apiKey || '',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Test' }]
        })
      });
      return response.status !== 401; // Not unauthorized
    } catch (error) {
      return false;
    }
  }

  private async testCustomConnection(config: AIModelConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.baseUrl}/health`, {
        method: 'GET',
        headers: config.apiKey ? {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        } : {
          'Content-Type': 'application/json',
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async generateResponse(prompt: string, modelName?: string): Promise<AIResponse> {
    const config = modelName 
      ? this.configs.find(c => c.name === modelName)
      : this.getEnabledModels()[0];

    if (!config) {
      throw new Error('No AI model configured');
    }

    switch (config.type) {
      case 'ollama':
        return await this.generateOllamaResponse(config, prompt);
      case 'openai':
        return await this.generateOpenAIResponse(config, prompt);
      case 'anthropic':
        return await this.generateAnthropicResponse(config, prompt);
      case 'custom':
        return await this.generateCustomResponse(config, prompt);
      default:
        throw new Error(`Unsupported model type: ${config.type}`);
    }
  }

  private async generateOllamaResponse(config: AIModelConfig, prompt: string): Promise<AIResponse> {
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.response,
      usage: {
        tokens: data.eval_count || 0
      }
    };
  }

  private async generateOpenAIResponse(config: AIModelConfig, prompt: string): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: {
        tokens: data.usage.total_tokens,
        cost: this.calculateOpenAICost(data.usage.total_tokens, config.model)
      }
    };
  }

  private async generateAnthropicResponse(config: AIModelConfig, prompt: string): Promise<AIResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey || '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: {
        tokens: data.usage.input_tokens + data.usage.output_tokens,
        cost: this.calculateAnthropicCost(data.usage.input_tokens + data.usage.output_tokens, config.model)
      }
    };
  }

  private async generateCustomResponse(config: AIModelConfig, prompt: string): Promise<AIResponse> {
    const response = await fetch(`${config.baseUrl}/generate`, {
      method: 'POST',
      headers: config.apiKey ? {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      } : {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        prompt,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.response || data.content || data.text,
      usage: {
        tokens: data.tokens || 0
      }
    };
  }

  private calculateOpenAICost(tokens: number, model: string): number {
    const rates: Record<string, number> = {
      'gpt-4': 0.03 / 1000,
      'gpt-4-turbo': 0.01 / 1000,
      'gpt-3.5-turbo': 0.002 / 1000
    };
    
    return (rates[model] || 0.01 / 1000) * tokens;
  }

  private calculateAnthropicCost(tokens: number, model: string): number {
    const rates: Record<string, number> = {
      'claude-3-opus': 0.015 / 1000,
      'claude-3-sonnet': 0.003 / 1000,
      'claude-3-haiku': 0.00025 / 1000
    };
    
    return (rates[model] || 0.003 / 1000) * tokens;
  }

  async analyzeSecurityFindings(findings: any[], modelName?: string): Promise<string> {
    const prompt = `Analysiere die folgenden Sicherheitsbefunde und erstelle einen detaillierten deutschen Bericht:

${findings.map(f => `- ${f.title} (${f.severity}): ${f.description}`).join('\n')}

Erstelle eine strukturierte Analyse mit:
1. Zusammenfassung der kritischsten Bedrohungen
2. Priorisierte Empfehlungen zur Behebung
3. Sofortige Sicherheitsmaßnahmen
4. Langfristige Sicherheitsstrategie

Antworte ausschließlich auf Deutsch und sei konkret und handlungsorientiert.`;

    const response = await this.generateResponse(prompt, modelName);
    return response.content;
  }
}