import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Terminal, 
  Download, 
  Trash2, 
  RefreshCw,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Filter,
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
  Eye,
  Zap,
  Settings,
  Search,
  Globe
} from 'lucide-react';
import { logger, LogEntry, LogLevel, LogCategory } from '@/services/loggerService';

export const SystemLogViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tailMode, setTailMode] = useState(true);
  const [maxLines, setMaxLines] = useState(1000);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Erweiterte Logs mit zusätzlichen System-Events
  useEffect(() => {
    // System-weite Event-Logs hinzufügen
    const logSystemEvents = () => {
      // Browser Events (ohne console.log Override um Recursion zu vermeiden)

      // Network Events
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        logger.logNetwork(`HTTP Request`, { url, method: args[1]?.method || 'GET' });
        
        try {
          const response = await originalFetch.apply(window, args);
          logger.logNetwork(`HTTP Response`, { 
            url, 
            status: response.status, 
            statusText: response.statusText 
          });
          return response;
        } catch (error) {
          logger.logNetwork(`HTTP Error`, { url, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      };

      // Error Events
      window.addEventListener('error', (event) => {
        logger.logSystem('Global Error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.toString()
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        logger.logSystem('Unhandled Promise Rejection', {
          reason: event.reason?.toString(),
          promise: event.promise
        });
      });

      // Performance Events
      const logPerformance = () => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          if (memory) {
            logger.logSystem('Memory Usage', {
              used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
              total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
              limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
            });
          }
        }
      };

      // Log performance every 30 seconds
      setInterval(logPerformance, 30000);
      logPerformance(); // Initial log

      // WebSocket Events (if any)
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends WebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          logger.logNetwork('WebSocket Connection Attempt', { url: url.toString() });
          
          this.addEventListener('open', () => {
            logger.logNetwork('WebSocket Connected', { url: url.toString() });
          });
          
          this.addEventListener('close', (event) => {
            logger.logNetwork('WebSocket Closed', { 
              url: url.toString(), 
              code: event.code, 
              reason: event.reason 
            });
          });
          
          this.addEventListener('error', () => {
            logger.logNetwork('WebSocket Error', { url: url.toString() });
          });
        }
      };
    };

    logSystemEvents();
    
    // Initial load
    setLogs(logger.getLogs());

    // Subscribe to log updates
    const unsubscribe = logger.subscribe((newLogs) => {
      if (autoRefresh) {
        // Begrenze die Anzahl der Logs für Performance
        const limitedLogs = newLogs.slice(-maxLines);
        setLogs(limitedLogs);
      }
    });

    return unsubscribe;
  }, [autoRefresh, maxLines]);

  // Auto-scroll im Tail-Mode
  useEffect(() => {
    if (tailMode && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, tailMode]);

  useEffect(() => {
    let filtered = logs;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(term) ||
        log.category.toLowerCase().includes(term) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(term) ||
        JSON.stringify(log.context || {}).toLowerCase().includes(term)
      );
    }

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, selectedLevel, selectedCategory]);

  const getLevelIcon = (level: LogLevel) => {
    const icons = {
      trace: <Eye className="w-3 h-3" />,
      debug: <Bug className="w-3 h-3" />,
      info: <Info className="w-3 h-3" />,
      warn: <AlertTriangle className="w-3 h-3" />,
      error: <AlertCircle className="w-3 h-3" />
    };
    return icons[level];
  };

  const getLevelColor = (level: LogLevel) => {
    const colors = {
      trace: 'bg-muted text-muted-foreground dark:bg-gray-800 dark:text-gray-400',
      debug: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      info: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      warn: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[level];
  };

  const getCategoryIcon = (category: LogCategory) => {
    const icons = {
      ssh: <Terminal className="w-3 h-3" />,
      ollama: <Zap className="w-3 h-3" />,
      network: <Globe className="w-3 h-3" />,
      audit: <AlertTriangle className="w-3 h-3" />,
      system: <Settings className="w-3 h-3" />,
      ui: <Eye className="w-3 h-3" />,
      general: <Info className="w-3 h-3" />
    };
    return icons[category];
  };

  const handleExportLogs = () => {
    const logData = logger.exportLogs();
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    logger.clearLogs();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  const getLogStats = () => {
    const stats = {
      total: logs.length,
      error: logs.filter(l => l.level === 'error').length,
      warn: logs.filter(l => l.level === 'warn').length,
      info: logs.filter(l => l.level === 'info').length,
      debug: logs.filter(l => l.level === 'debug').length,
      trace: logs.filter(l => l.level === 'trace').length,
    };
    return stats;
  };

  const stats = getLogStats();

  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-background p-4 overflow-hidden"
    : "space-y-4";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Terminal className="w-6 h-6" />
            System Log (tail -f)
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{stats.total} Einträge</Badge>
            {stats.error > 0 && <Badge variant="destructive">{stats.error} Errors</Badge>}
            {stats.warn > 0 && <Badge className="bg-yellow-500 text-white">{stats.warn} Warnings</Badge>}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearLogs}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
        </div>
        
        <Select value={selectedLevel} onValueChange={(value) => setSelectedLevel(value as LogLevel | 'all')}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="trace">Trace</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as LogCategory | 'all')}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="ssh">SSH</SelectItem>
            <SelectItem value="ollama">Ollama</SelectItem>
            <SelectItem value="network">Network</SelectItem>
            <SelectItem value="audit">Audit</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="ui">UI</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2">
          <Switch
            id="tail-mode"
            checked={tailMode}
            onCheckedChange={setTailMode}
          />
          <Label htmlFor="tail-mode" className="text-sm">Auto-scroll</Label>
        </div>
      </div>

      {/* Log Display */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea 
            ref={scrollRef}
            className={isFullscreen ? "h-[calc(100vh-200px)]" : "h-[70vh]"}
          >
            <div className="p-4 font-mono text-sm space-y-1">
              {filteredLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Keine Logs gefunden.</p>
                  {searchTerm && <p className="text-xs">Versuche andere Suchbegriffe.</p>}
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 hover:bg-muted/50 p-2 -m-2 rounded group dark:hover:bg-gray-800/50"
                  >
                    <div className="text-xs text-muted-foreground shrink-0 w-16">
                      {formatTimestamp(log.timestamp)}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`${getLevelColor(log.level)} text-xs px-1.5 py-0.5`}>
                        {getLevelIcon(log.level)}
                        <span className="ml-1">{log.level.toUpperCase()}</span>
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                        {getCategoryIcon(log.category)}
                        <span className="ml-1">{log.category}</span>
                      </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground">{log.message}</span>
                      {log.details && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {typeof log.details === 'object' 
                            ? JSON.stringify(log.details)
                            : String(log.details)
                          }
                        </div>
                      )}
                      {log.error && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Error: {log.error.message}
                        </div>
                      )}
                      {log.stack && (
                        <div className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {log.stack.split('\n')[0]}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
        <div>
          Zeige {filteredLogs.length} von {logs.length} Einträgen 
          {tailMode && autoRefresh && <span className="ml-2 text-green-600 dark:text-green-400">• Live</span>}
        </div>
        <div>
          Max. {maxLines} Einträge • Session: {logger.getSessionId().slice(-8)}
        </div>
      </div>
    </div>
  );
};