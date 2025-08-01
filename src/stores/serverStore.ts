import { create } from 'zustand';
import { Server, AuditResult } from '@/services/backendApiService';
import { MockSystemInfo } from '@/services/mockDataService';
import { dataAgent, FastAuditData } from '@/services/dataAgent';

export interface ServerWithKeyStatus extends Server {
  keyDeployed?: boolean;
  fingerprint?: string;
}

interface ServerStore {
  servers: ServerWithKeyStatus[];
  auditResults: AuditResult[];
  fastAudits: FastAuditData[];
  systemInfoMap: Record<string, MockSystemInfo>;
  loading: boolean;
  error: string | null;
  
  // Actions
  setServers: (servers: ServerWithKeyStatus[]) => void;
  setAuditResults: (results: AuditResult[]) => void;
  setFastAudits: (audits: FastAuditData[]) => void;
  setSystemInfo: (serverId: string, info: MockSystemInfo) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addServer: (server: ServerWithKeyStatus) => void;
  removeServer: (serverId: string) => void;
  updateServer: (serverId: string, updates: Partial<ServerWithKeyStatus>) => void;
  addAuditResult: (result: AuditResult) => void;
  addFastAudit: (audit: FastAuditData) => void;
  
  // Fast Data Methods
  loadFastData: () => void;
  getFastAudit: (serverId: string) => FastAuditData | null;
  startFastAudit: (serverId: string) => FastAuditData | null;
}

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  auditResults: [],
  fastAudits: [],
  systemInfoMap: {},
  loading: false,
  error: null,

  setServers: (servers) => set({ servers }),
  setAuditResults: (auditResults) => set({ auditResults }),
  setFastAudits: (fastAudits) => set({ fastAudits }),
  setSystemInfo: (serverId, info) => set((state) => ({
    systemInfoMap: { ...state.systemInfoMap, [serverId]: info }
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  addServer: (server) => {
    const newServer = dataAgent.addServer(server);
    set((state) => ({
      servers: [...state.servers, newServer],
      fastAudits: dataAgent.getAllAudits(),
      systemInfoMap: {
        ...state.systemInfoMap,
        [newServer.id]: dataAgent.getSystemInfo(newServer.id) || {} as MockSystemInfo
      }
    }));
  },
  
  removeServer: (serverId) => {
    dataAgent.removeServer(serverId);
    set((state) => ({
      servers: state.servers.filter(s => s.id !== serverId),
      auditResults: state.auditResults.filter(r => r.serverId !== serverId),
      fastAudits: state.fastAudits.filter(a => a.serverId !== serverId),
      systemInfoMap: Object.fromEntries(
        Object.entries(state.systemInfoMap).filter(([id]) => id !== serverId)
      )
    }));
  },
  
  updateServer: (serverId, updates) => set((state) => ({
    servers: state.servers.map(s => 
      s.id === serverId ? { ...s, ...updates } : s
    )
  })),
  
  addAuditResult: (result) => set((state) => ({
    auditResults: [result, ...state.auditResults]
  })),

  addFastAudit: (audit) => set((state) => ({
    fastAudits: [audit, ...state.fastAudits.filter(a => a.serverId !== audit.serverId)]
  })),

  // Fast Data Methods
  loadFastData: () => {
    const servers = dataAgent.getAllServers();
    const audits = dataAgent.getAllAudits();
    const systemInfoMap: Record<string, MockSystemInfo> = {};
    
    servers.forEach(server => {
      const systemInfo = dataAgent.getSystemInfo(server.id);
      if (systemInfo) {
        systemInfoMap[server.id] = systemInfo;
      }
    });

    set({
      servers,
      fastAudits: audits,
      systemInfoMap,
      loading: false,
      error: null
    });
  },

  getFastAudit: (serverId) => {
    return dataAgent.getAuditData(serverId);
  },

  startFastAudit: (serverId) => {
    const audit = dataAgent.startAudit(serverId);
    if (audit) {
      get().addFastAudit(audit);
    }
    return audit;
  }
}));