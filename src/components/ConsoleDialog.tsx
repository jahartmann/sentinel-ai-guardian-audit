import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Server } from '@/hooks/useServerManagement';

interface ConsoleDialogProps {
  server: Server;
  trigger?: React.ReactNode;
}

interface ConsoleMessage {
  type: 'command' | 'output' | 'error' | 'system';
  content: string;
  timestamp: string;
}

export const ConsoleDialog = ({ server, trigger }: ConsoleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const addMessage = (type: ConsoleMessage['type'], content: string) => {
    const message: ConsoleMessage = {
      type,
      content,
      timestamp: new Date().toLocaleTimeString('de-DE')
    };
    setMessages(prev => [...prev, message]);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleConnect = async () => {
    setIsConnecting(true);
    const target = server.hostname ? `${server.username}@${server.hostname}` : `${server.username}@${server.ip}`;
    addMessage('system', `Establishing SSH connection to ${target}:${server.port}...`);
    
    try {
      // Use the IP-based SSH service for console connection (Python-style)
      const { ipSSHService } = await import('@/services/ipBasedSSHService');
      const connection = await ipSSHService.connect(server);
      
      setIsConnected(true);
      addMessage('system', `✅ SSH connection established to ${server.name}`);
      addMessage('system', `Welcome to ${server.hostname || server.ip}`);
      addMessage('output', `Last login: ${new Date().toLocaleString('de-DE')}`);
      addMessage('output', `${server.username}@${server.hostname || server.ip}:~$`);
      
      toast({
        title: "Console verbunden",
        description: `SSH-Verbindung zu ${server.name} erfolgreich hergestellt.`
      });
    } catch (error) {
      addMessage('error', `❌ SSH connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    setIsConnected(false);
    addMessage('system', `Disconnected from ${server.name}`);
    toast({
      title: "Console getrennt",
      description: `Verbindung zu ${server.name} beendet.`
    });
  };

  const handleSendCommand = async () => {
    if (!command.trim() || !isConnected) return;

    const cmd = command.trim();
    setCommand('');
    
    addMessage('command', `${server.username}@${server.hostname || server.ip}:~$ ${cmd}`);
    
    // Simulate command execution
    try {
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Mock responses for common commands
      if (cmd === 'ls') {
        addMessage('output', 'bin  etc  home  opt  root  tmp  usr  var');
      } else if (cmd === 'pwd') {
        addMessage('output', `/home/${server.username}`);
      } else if (cmd === 'whoami') {
        addMessage('output', server.username);
      } else if (cmd === 'uname -a') {
        addMessage('output', `Linux ${server.hostname || server.ip} 5.4.0-74-generic #83-Ubuntu SMP Sat May 8 02:35:39 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux`);
      } else if (cmd === 'df -h') {
        addMessage('output', 'Filesystem      Size  Used Avail Use% Mounted on');
        addMessage('output', '/dev/sda1        50G   15G   33G  32% /');
        addMessage('output', 'tmpfs           2.0G     0  2.0G   0% /dev/shm');
      } else if (cmd.startsWith('cat ') || cmd.startsWith('less ') || cmd.startsWith('more ')) {
        addMessage('output', 'File content would be displayed here...');
      } else if (cmd === 'exit') {
        handleDisconnect();
        return;
      } else {
        addMessage('output', `Command executed: ${cmd}`);
        addMessage('output', 'Output would be displayed here in a real implementation.');
      }
      
      addMessage('output', `${server.username}@${server.hostname || server.ip}:~$`);
    } catch (error) {
      addMessage('error', `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendCommand();
    }
  };

  const handleClose = () => {
    if (isConnected) {
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
              Hinweis: Dies ist eine Demo-Console. In der echten Implementierung würde eine WebSocket-Verbindung zum Server hergestellt.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};