import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface AddServerDialogProps {
  onAddServer: (server: any) => Promise<any>;
  onTestConnection?: (serverId: string) => Promise<boolean>;
  trigger?: React.ReactNode;
}

export const AddServerDialog = ({ onAddServer, trigger }: AddServerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    port: 22,
    username: 'root',
    hostname: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ip || !formData.username) {
      toast({
        title: "Fehlende Angaben",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await onAddServer({
        ...formData,
        hostname: formData.hostname || formData.ip
      });
      setOpen(false);
      setFormData({ name: '', ip: '', port: 22, username: 'root', hostname: '' });
      toast({
        title: "Server hinzugefügt",
        description: "Der Server wurde erfolgreich hinzugefügt."
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Server konnte nicht hinzugefügt werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Server hinzufügen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Servername"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip">IP-Adresse *</Label>
            <Input
              id="ip"
              value={formData.ip}
              onChange={(e) => setFormData(prev => ({ ...prev, ip: e.target.value }))}
              placeholder="192.168.1.100"
              required
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
          <div className="space-y-2">
            <Label htmlFor="username">Benutzername *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="root"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hostname">Hostname (optional)</Label>
            <Input
              id="hostname"
              value={formData.hostname}
              onChange={(e) => setFormData(prev => ({ ...prev, hostname: e.target.value }))}
              placeholder="server.domain.com"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Hinzufügen..." : "Hinzufügen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};