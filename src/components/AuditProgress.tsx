import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Shield,
  Server,
  AlertTriangle,
  TrendingUp,
  X
} from "lucide-react";
import { socketService } from "@/services/socketService";

interface AuditProgressProps {
  auditId: string;
  serverName: string;
  onClose: () => void;
}

interface AuditStatus {
  status: string;
  progress: number;
  message: string;
  eta?: number | null;
  timestamp: string;
}

export const AuditProgress = ({ auditId, serverName, onClose }: AuditProgressProps) => {
  const [auditStatus, setAuditStatus] = useState<AuditStatus>({
    status: 'starting',
    progress: 0,
    message: 'Initialisiere Audit...',
    eta: null,
    timestamp: new Date().toISOString()
  });

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startTime] = useState(new Date());

  useEffect(() => {
    // Timer für verstrichene Zeit
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);

    // Socket-Verbindung für Echtzeit-Updates
    socketService.joinAuditRoom(auditId);

    const handleAuditUpdate = (data: any) => {
      setAuditStatus({
        status: data.status,
        progress: data.progress,
        message: data.message,
        eta: data.eta,
        timestamp: data.timestamp
      });
    };

    socketService.onAuditUpdate(handleAuditUpdate);

    return () => {
      clearInterval(timer);
      socketService.leaveAuditRoom(auditId);
      socketService.offAuditUpdate();
    };
  }, [auditId, startTime]);

  const getStatusIcon = () => {
    switch (auditStatus.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (auditStatus.status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressColor = () => {
    if (auditStatus.status === 'failed') return 'bg-destructive';
    if (auditStatus.status === 'completed') return 'bg-success';
    return 'bg-primary';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Audit Fortschritt</span>
                {getStatusIcon()}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{serverName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Fortschrittsbalken */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Fortschritt</span>
            <span className="font-semibold">{auditStatus.progress}%</span>
          </div>
          <div className="relative">
            <Progress 
              value={auditStatus.progress} 
              className="h-3"
            />
            <div 
              className={`absolute inset-0 h-3 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${auditStatus.progress}%` }}
            />
          </div>
        </div>

        {/* Status und aktuelle Nachricht */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant={getStatusColor() as any} className="capitalize">
              {auditStatus.status === 'validating' && 'Validierung'}
              {auditStatus.status === 'connecting' && 'Verbindung'}
              {auditStatus.status === 'gathering' && 'Datensammlung'}
              {auditStatus.status === 'analyzing' && 'Analyse'}
              {auditStatus.status === 'scoring' && 'Bewertung'}
              {auditStatus.status === 'ai_analysis' && 'KI-Analyse'}
              {auditStatus.status === 'finalizing' && 'Abschluss'}
              {auditStatus.status === 'completed' && 'Abgeschlossen'}
              {auditStatus.status === 'failed' && 'Fehlgeschlagen'}
              {!['validating', 'connecting', 'gathering', 'analyzing', 'scoring', 'ai_analysis', 'finalizing', 'completed', 'failed'].includes(auditStatus.status) && auditStatus.status}
            </Badge>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeElapsed)}</span>
              </div>
              {auditStatus.eta && auditStatus.eta > 0 && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>~{formatTime(auditStatus.eta)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm">{auditStatus.message}</p>
          </div>
        </div>

        {/* Audit-Phasen Zeitstrahl */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Audit-Phasen</h4>
          <div className="space-y-2">
            {[
              { key: 'validating', label: 'Voraussetzungen prüfen', progress: 5 },
              { key: 'connecting', label: 'SSH-Verbindung aufbauen', progress: 10 },
              { key: 'gathering', label: 'Systemdaten sammeln', progress: 20 },
              { key: 'analyzing', label: 'Sicherheitsanalyse', progress: 40 },
              { key: 'scoring', label: 'Bewertung berechnen', progress: 60 },
              { key: 'ai_analysis', label: 'KI-Empfehlungen generieren', progress: 80 },
              { key: 'finalizing', label: 'Bericht finalisieren', progress: 95 },
              { key: 'completed', label: 'Abgeschlossen', progress: 100 }
            ].map((phase) => {
              const isActive = auditStatus.status === phase.key;
              const isCompleted = auditStatus.progress > phase.progress;
              const isFailed = auditStatus.status === 'failed' && auditStatus.progress <= phase.progress;
              
              return (
                <div key={phase.key} className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    isFailed ? 'bg-destructive' :
                    isCompleted ? 'bg-success' :
                    isActive ? 'bg-primary animate-pulse' :
                    'bg-muted'
                  }`} />
                  <span className={`text-sm ${
                    isActive ? 'font-medium text-foreground' :
                    isCompleted ? 'text-muted-foreground line-through' :
                    'text-muted-foreground'
                  }`}>
                    {phase.label}
                  </span>
                  {isActive && (
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  )}
                  {isCompleted && !isFailed && (
                    <CheckCircle className="w-3 h-3 text-success" />
                  )}
                  {isFailed && (
                    <XCircle className="w-3 h-3 text-destructive" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Abschluss-Informationen */}
        {auditStatus.status === 'completed' && (
          <div className="bg-success/10 border border-success/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Audit erfolgreich abgeschlossen!</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Der Audit-Bericht ist jetzt verfügbar und kann in der Audit-Übersicht eingesehen werden.
            </p>
          </div>
        )}

        {auditStatus.status === 'failed' && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Audit fehlgeschlagen</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {auditStatus.message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};