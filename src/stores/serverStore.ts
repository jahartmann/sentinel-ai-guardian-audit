import { create } from 'zustand';
import { Server, AuditResult } from '@/services/backendApiService';
import { MockSystemInfo } from '@/services/mockDataService';

export interface ServerWithKeyStatus extends Server {
  keyDeployed?: boolean;
  fingerprint?: string;
}

interface ServerStore {
  servers: ServerWithKeyStatus[];
  auditResults: AuditResult[];
  systemInfoMap: Record<string, MockSystemInfo>;
  loading: boolean;
  error: string | null;
  
  // Actions
  setServers: (servers: ServerWithKeyStatus[]) => void;
  setAuditResults: (results: AuditResult[]) => void;
  setSystemInfo: (serverId: string, info: MockSystemInfo) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addServer: (server: ServerWithKeyStatus) => void;
  removeServer: (serverId: string) => void;
  updateServer: (serverId: string, updates: Partial<ServerWithKeyStatus>) => void;
  addAuditResult: (result: AuditResult) => void;
}

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  auditResults: [],
  systemInfoMap: {},
  loading: false,
  error: null,

  setServers: (servers) => set({ servers }),
  setAuditResults: (auditResults) => set({ auditResults }),
  setSystemInfo: (serverId, info) => set((state) => ({
    systemInfoMap: { ...state.systemInfoMap, [serverId]: info }
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  addServer: (server) => set((state) => ({
    servers: [...state.servers, server]
  })),
  
  removeServer: (serverId) => set((state) => ({
    servers: state.servers.filter(s => s.id !== serverId),
    auditResults: state.auditResults.filter(r => r.serverId !== serverId),
    systemInfoMap: Object.fromEntries(
      Object.entries(state.systemInfoMap).filter(([id]) => id !== serverId)
    )
  })),
  
  updateServer: (serverId, updates) => set((state) => ({
    servers: state.servers.map(s => 
      s.id === serverId ? { ...s, ...updates } : s
    )
  })),
  
  addAuditResult: (result) => set((state) => ({
    auditResults: [result, ...state.auditResults]
  }))
}));