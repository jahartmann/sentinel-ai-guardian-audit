import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Server, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Server as ServerType } from '@/hooks/useServerManagement';

interface AddServerDialogProps {
  onAddServer: (server: Omit<ServerType, 'id' | 'status'>) => ServerType;
  trigger?: React.ReactNode;
}

export const AddServerDialog = ({ onAddServer, trigger }: AddServerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    ip: '',
    port: 22,
    username: '',
    connectionType: 'ssh' as 'ssh' | 'winrm' | 'snmp'
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.hostname || !formData.ip || !formData.username) {
      toast({
        title: 'Fehler',
        description: 'Bitte füllen Sie alle Pflichtfelder aus.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const newServer = onAddServer(formData);
      toast({
        title: 'Server hinzugefügt',
        description: `${newServer.name} wurde erfolgreich hinzugefügt.`
      });
      
      setFormData({
        name: '',
        hostname: '',
        ip: '',
        port: 22,
        username: '',
        connectionType: 'ssh'
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Server konnte nicht hinzugefügt werden.',
        variant: 'destructive'
      });
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
              <Label htmlFor="hostname">Hostname *</Label>
              <Input
                id="hostname"
                value={formData.hostname}
                onChange={(e) => setFormData(prev => ({ ...prev, hostname: e.target.value }))}
                placeholder="z.B. server.company.com"
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
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit">
              Server hinzufügen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};