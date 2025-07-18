import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  hostname?: string;
  status?: 'connected' | 'online' | 'offline' | 'warning' | 'critical';
}

interface EditServerDialogProps {
  server: Server;
  onEditServer: (server: Server) => void;
  trigger?: React.ReactNode;
}

export const EditServerDialog = ({ server, onEditServer, trigger }: EditServerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: server.name,
    ip: server.ip,
    port: server.port,
    username: server.username,
    hostname: server.hostname || ''
  });
  const { toast } = useToast();

  useEffect(() => {
    setFormData({
      name: server.name,
      ip: server.ip,
      port: server.port,
      username: server.username,
      hostname: server.hostname || ''
    });
  }, [server]);

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
      onEditServer({
        ...server,
        ...formData,
        hostname: formData.hostname || formData.ip
      });
      setOpen(false);
      toast({
        title: "Server aktualisiert",
        description: "Die Server-Einstellungen wurden gespeichert."
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Server konnte nicht aktualisiert werden.",
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
          <DialogTitle>Server bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Servername"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ip">IP-Adresse *</Label>
            <Input
              id="edit-ip"
              value={formData.ip}
              onChange={(e) => setFormData(prev => ({ ...prev, ip: e.target.value }))}
              placeholder="192.168.1.100"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-port">Port</Label>
            <Input
              id="edit-port"
              type="number"
              value={formData.port}
              onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 22 }))}
              placeholder="22"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-username">Benutzername *</Label>
            <Input
              id="edit-username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="root"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-hostname">Hostname (optional)</Label>
            <Input
              id="edit-hostname"
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
              {loading ? "Speichern..." : "Speichern"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};