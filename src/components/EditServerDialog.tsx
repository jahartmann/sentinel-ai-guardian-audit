import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Server as ServerType } from '@/hooks/useServerManagement';

interface EditServerDialogProps {
  server: ServerType;
  onUpdateServer: (serverId: string, updates: Partial<ServerType>) => void;
  onTestConnection: (serverId: string) => Promise<boolean>;
  trigger?: React.ReactNode;
}

export const EditServerDialog = ({ server, onUpdateServer, onTestConnection, trigger }: EditServerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [formData, setFormData] = useState({
    name: server.name,
    hostname: server.hostname,
    ip: server.ip,
    port: server.port,
    username: server.username,
    password: server.password || '',
    connectionType: server.connectionType,
    os: server.os || ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Hostname ist jetzt optional - nur Name, IP und Username sind Pflicht
    if (!formData.name || !formData.ip || !formData.username) {
      toast({
        title: 'Fehler',
        description: 'Bitte füllen Sie alle Pflichtfelder aus (Name, IP, Benutzername).',
        variant: 'destructive'
      });
      return;
    }

    setIsTestingConnection(true);
    
    try {
      // Server-Daten aktualisieren
      onUpdateServer(server.id, formData);
      
      // Verbindung testen
      const connectionSuccessful = await onTestConnection(server.id);
      
      if (connectionSuccessful) {
        toast({
          title: 'Server aktualisiert',
          description: `${formData.name} wurde erfolgreich aktualisiert und die Verbindung getestet.`
        });
      } else {
        toast({
          title: 'Server aktualisiert',
          description: `${formData.name} wurde aktualisiert, aber die Verbindung konnte nicht hergestellt werden.`,
          variant: 'destructive'
        });
      }
      
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Server konnte nicht aktualisiert werden.',
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
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Bearbeiten
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Server bearbeiten
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="connectionType">Verbindungstyp</Label>
              <Select 
                value={formData.connectionType} 
                onValueChange={(value: 'ssh' | 'winrm' | 'snmp') => 
                  setFormData(prev => ({ ...prev, connectionType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ssh">SSH (Linux/Unix)</SelectItem>
                  <SelectItem value="winrm">WinRM (Windows)</SelectItem>
                  <SelectItem value="snmp">SNMP (Network Devices)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="os">Betriebssystem</Label>
              <Input
                id="os"
                value={formData.os}
                onChange={(e) => setFormData(prev => ({ ...prev, os: e.target.value }))}
                placeholder="z.B. Ubuntu 22.04"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isTestingConnection}>
              {isTestingConnection ? 'Verbindung wird getestet...' : 'Server aktualisieren'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};