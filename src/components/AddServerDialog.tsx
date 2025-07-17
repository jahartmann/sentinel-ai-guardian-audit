import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Server, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Server as ServerType } from '@/services/backendApiService';

interface AddServerDialogProps {
  onAddServer: (server: Omit<ServerType, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<ServerType>;
  onTestConnection: (serverId: string) => Promise<boolean>;
  trigger?: React.ReactNode;
}

export const AddServerDialog = ({ onAddServer, onTestConnection, trigger }: AddServerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ip: '', // Primäres Feld
    hostname: '', // Optional
    port: 22,
    username: '',
    password: '',
    connectionType: 'password' as 'password' | 'key'
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.ip || !formData.username) {
      toast({
        title: 'Fehler',
        description: 'Bitte füllen Sie Name, IP-Adresse und Benutzername aus.',
        variant: 'destructive'
      });
      return;
    }

    setIsTestingConnection(true);
    
    try {
      // Konvertiere Form-Daten ins Server-Format
      const serverData: Omit<ServerType, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        hostname: formData.hostname || formData.ip, // Default zu IP falls kein Hostname
        ip: formData.ip,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        connectionType: formData.password ? 'password' : 'key'
      };

      // Erst Server hinzufügen
      const newServer = await onAddServer(serverData);
      
      // Dann Verbindung testen
      const connectionSuccessful = await onTestConnection(newServer.id);
      
      if (connectionSuccessful) {
        toast({
          title: 'Server hinzugefügt',
          description: `${newServer.name} wurde erfolgreich hinzugefügt und die Verbindung getestet.`
        });
      } else {
        toast({
          title: 'Server hinzugefügt',
          description: `${newServer.name} wurde hinzugefügt, aber die Verbindung konnte nicht hergestellt werden.`,
          variant: 'destructive'
        });
      }
      
      setFormData({
        name: '',
        hostname: '',
        ip: '',
        port: 22,
        username: '',
        password: '',
        connectionType: 'password'
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Server konnte nicht hinzugefügt werden.',
        variant: 'destructive'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Server hinzufügen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Neuen Server hinzufügen
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Server Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Web Server 01"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hostname">Hostname (optional)</Label>
              <Input
                id="hostname"
                value={formData.hostname}
                onChange={(e) => setFormData(prev => ({ ...prev, hostname: e.target.value }))}
                placeholder="z.B. server.company.com (optional)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ip">IP Adresse *</Label>
              <Input
                id="ip"
                value={formData.ip}
                onChange={(e) => setFormData(prev => ({ ...prev, ip: e.target.value }))}
                placeholder="z.B. 192.168.1.100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 22 }))}
                placeholder="22"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Benutzername *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="z.B. admin"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Passwort für Authentifizierung"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort oder SSH-Key</Label>
            <p className="text-sm text-muted-foreground">
              Lassen Sie das Passwort leer, um SSH-Key-Authentifizierung zu verwenden
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isTestingConnection}>
              {isTestingConnection ? 'Verbindung wird getestet...' : 'Server hinzufügen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};