import { useState, useEffect } from 'react';

interface OllamaConfig {
  serverUrl: string;
  model: string;
  enabled: boolean;
}

interface AppSettings {
  ollama: OllamaConfig;
  theme: 'light' | 'dark' | 'system';
  language: 'de' | 'en';
  autoScan: boolean;
  scanInterval: number; // in minutes
}

const DEFAULT_SETTINGS: AppSettings = {
  ollama: {
    serverUrl: 'http://localhost:11434',
    model: 'llama2',
    enabled: false
  },
  theme: 'system',
  language: 'de',
  autoScan: false,
  scanInterval: 60
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('secureai-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      localStorage.setItem('secureai-settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateOllamaConfig = (config: Partial<OllamaConfig>) => {
    const updatedOllamaConfig = { ...settings.ollama, ...config };
    const newSettings = {
      ...settings,
      ollama: updatedOllamaConfig
    };
    setSettings(newSettings);
    
    try {
      localStorage.setItem('secureai-settings', JSON.stringify(newSettings));
      console.log('Settings saved:', newSettings); // Debug log
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const testOllamaConnection = async (): Promise<boolean> => {
    if (!settings.ollama.serverUrl) return false;
    
    try {
      const response = await fetch(`${settings.ollama.serverUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  };

  const getAvailableModels = async (): Promise<string[]> => {
    if (!settings.ollama.serverUrl) return [];
    
    try {
      const response = await fetch(`${settings.ollama.serverUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    updateOllamaConfig,
    testOllamaConnection,
    getAvailableModels
  };
};