import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bug, 
  Download, 
  Filter, 
  Search, 
  Trash2, 
  Terminal,
  AlertTriangle,
  Info,
  AlertCircle,
  Zap,
  Eye,
  Settings,
  RefreshCw
} from 'lucide-react';
import { logger, LogEntry, LogLevel, LogCategory } from '@/services/loggerService';

export const LogViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Initial load
    setLogs(logger.getLogs());

    // Subscribe to log updates
    const unsubscribe = logger.subscribe((newLogs) => {
      if (autoRefresh) {
        setLogs(newLogs);
      }
    });

    return unsubscribe;
  }, [autoRefresh]);

  useEffect(() => {
    let filtered = logs;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(term) ||
        log.category.toLowerCase().includes(term) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(term)
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
      trace: 'bg-gray-100 text-gray-600',
      debug: 'bg-blue-100 text-blue-700',
      info: 'bg-green-100 text-green-700',
      warn: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700'
    };
    return colors[level];
  };

  const getCategoryIcon = (category: LogCategory) => {
    const icons = {
      ssh: <Terminal className="w-3 h-3" />,
      ollama: <Zap className="w-3 h-3" />,
      network: <Search className="w-3 h-3" />,
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
    setSelectedLog(null);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            System Logs
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{stats.total} Total</Badge>
            {stats.error > 0 && <Badge variant="destructive">{stats.error} Errors</Badge>}
            {stats.warn > 0 && <Badge variant="secondary">{stats.warn} Warnings</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearLogs}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
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
      </div>

      {/* Log List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Log Entries ({filteredLogs.length} of {logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    No logs match the current filters.
                  </AlertDescription>
                </Alert>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`${getLevelColor(log.level)} text-xs px-2 py-1`}>
                            {getLevelIcon(log.level)}
                            {log.level.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2 py-1">
                            {getCategoryIcon(log.category)}
                            {log.category}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{log.message}</p>
                          {log.details && (
                            <p className="text-xs text-gray-500 truncate">
                              {typeof log.details === 'object' 
                                ? JSON.stringify(log.details) 
                                : String(log.details)
                              }
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 shrink-0">
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Log Detail Sheet */}
      {selectedLog && (
        <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <SheetContent className="w-[600px] sm:w-[700px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {getLevelIcon(selectedLog.level)}
                Log Details
              </SheetTitle>
              <SheetDescription>
                {formatTimestamp(selectedLog.timestamp)} • {selectedLog.category} • {selectedLog.level}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="context">Context</TabsTrigger>
                  <TabsTrigger value="raw">Raw Data</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Message</h4>
                    <p className="text-sm bg-gray-50 p-3 rounded">{selectedLog.message}</p>
                  </div>
                  {selectedLog.details && (
                    <div>
                      <h4 className="font-semibold mb-2">Details</h4>
                      <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.error && (
                    <div>
                      <h4 className="font-semibold mb-2">Error</h4>
                      <div className="space-y-2">
                        <p className="text-sm bg-red-50 p-3 rounded text-red-800">
                          {selectedLog.error.message}
                        </p>
                        {selectedLog.stack && (
                          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                            {selectedLog.stack}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="context" className="space-y-4">
                  {selectedLog.context && (
                    <div>
                      <h4 className="font-semibold mb-2">Context Information</h4>
                      <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                        {JSON.stringify(selectedLog.context, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold mb-2">Session Info</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Session ID:</strong> {selectedLog.sessionId}</p>
                      <p><strong>Log ID:</strong> {selectedLog.id}</p>
                      <p><strong>Timestamp:</strong> {selectedLog.timestamp}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="raw" className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Raw Log Entry</h4>
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export const LogViewerTrigger = () => {
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const unsubscribe = logger.subscribe((logs) => {
      const errors = logs.filter(log => log.level === 'error').length;
      setErrorCount(errors);
    });

    return unsubscribe;
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Terminal className="w-4 h-4 mr-2" />
          Logs
          {errorCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 px-1 min-w-[20px] h-5">
              {errorCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[90vw] sm:w-[900px] max-w-[1200px]">
        <SheetHeader>
          <SheetTitle>System Logs & Debugging</SheetTitle>
          <SheetDescription>
            Monitor system activity, errors, and debugging information in real-time.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <LogViewer />
        </div>
      </SheetContent>
    </Sheet>
  );
};