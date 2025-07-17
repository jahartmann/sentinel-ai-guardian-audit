import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { consoleService, type ConsoleMessage } from '@/services/consoleService';
import type { Server } from '@/hooks/useServerManagement';

interface ConsoleDialogProps {
  server: Server;
  trigger?: React.ReactNode;
}


export const ConsoleDialog = ({ server, trigger }: ConsoleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (connectionId) {
      // Lade existierende Messages
      const connection = consoleService.getConnection(connectionId);
      if (connection) {
        setMessages(connection.messages);
      }

      // Höre auf neue Messages
      consoleService.onMessage(connectionId, (message) => {
        setMessages(prev => [...prev, message]);
      });

      return () => {
        consoleService.offMessage(connectionId);
      };
    }
  }, [connectionId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      const connId = await consoleService.connect(server);
      setConnectionId(connId);
      setIsConnected(true);
      
      toast({
        title: "Console verbunden",
        description: `SSH-Verbindung zu ${server.name} erfolgreich hergestellt.`
      });
    } catch (error) {
      toast({
        title: "SSH-Verbindungsfehler",
        description: "Konnte keine SSH-Verbindung zur Server-Console herstellen.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (connectionId) {
      consoleService.disconnect(connectionId);
    }
    setIsConnected(false);
    setConnectionId(null);
    toast({
      title: "Console getrennt",
      description: `Verbindung zu ${server.name} beendet.`
    });
  };

  const handleSendCommand = async () => {
    if (!command.trim() || !isConnected || !connectionId) return;

    const cmd = command.trim();
    setCommand('');
    
    try {
      await consoleService.executeCommand(connectionId, cmd);
    } catch (error) {
      toast({
        title: "Befehlsfehler",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendCommand();
    }
  };

  const handleClose = () => {
    if (isConnected && connectionId) {
      handleDisconnect();
    }
    setMessages([]);
    setOpen(false);
  };

  const getMessageColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'command': return 'text-primary';
      case 'output': return 'text-foreground';
      case 'error': return 'text-destructive';
      case 'system': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Terminal className="w-4 h-4 mr-2" />
            Console
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] sm:max-h-[600px] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Console - {server.name} ({server.ip})
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-muted'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Verbunden' : 'Getrennt'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-[500px]">
          {/* Console Output Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="font-mono text-sm space-y-1 bg-black/5 dark:bg-white/5 p-4 rounded-md min-h-full">
              {messages.length === 0 && !isConnected && (
                <div className="text-muted-foreground">
                  Console nicht verbunden. Klicken Sie auf "Verbinden" um zu starten.
                </div>
              )}
              {messages.map((message, index) => (
                <div key={index} className={`${getMessageColor(message.type)} whitespace-pre-wrap`}>
                  {message.type === 'system' && (
                    <span className="text-xs text-muted-foreground mr-2">[{message.timestamp}]</span>
                  )}
                  {message.content}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Command Input Area */}
          <div className="border-t p-4 space-y-3">
            {!isConnected ? (
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? 'Verbindung wird hergestellt...' : 'Mit Server verbinden'}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground shrink-0">
                  {server.username}@{server.hostname || server.ip}:~$
                </span>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Befehl eingeben..."
                  className="font-mono text-sm"
                  disabled={!isConnected}
                />
                <Button 
                  size="sm" 
                  onClick={handleSendCommand}
                  disabled={!command.trim() || !isConnected}
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDisconnect}
                >
                  Trennen
                </Button>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Echte SSH-Verbindung über WebSocket. Bei Verbindungsproblemen wird Demo-Modus verwendet.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};