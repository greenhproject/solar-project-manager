import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Webhook, Play, AlertTriangle, CheckCircle2, XCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_EVENTS = [
  { value: "*", label: "Todos los eventos", description: "Recibir todos los eventos" },
  { value: "milestone.status_changed", label: "Hito: Cambio de estado", description: "Cuando un hito cambia de estado" },
  { value: "milestone.completed", label: "Hito: Completado", description: "Cuando un hito se marca como completado" },
  { value: "project.completed", label: "Proyecto: Completado", description: "Cuando todos los hitos de un proyecto se completan" },
  { value: "project.status_changed", label: "Proyecto: Cambio de estado", description: "Cuando un proyecto cambia de estado" },
];

export function WebhookSettings() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["*"]);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showLogs, setShowLogs] = useState<number | null>(null);

  const { data: webhooksList, refetch } = trpc.webhookManagement.list.useQuery();
  const { data: logs } = trpc.webhookManagement.logs.useQuery(
    { webhookId: showLogs ?? undefined, limit: 20 },
    { enabled: showLogs !== null }
  );

  const createMutation = trpc.webhookManagement.create.useMutation({
    onSuccess: (data) => {
      setGeneratedSecret(data.secret);
      refetch();
      toast.success("Webhook creado exitosamente");
    },
    onError: (err) => toast.error(err.message || "Error al crear webhook"),
  });

  const updateMutation = trpc.webhookManagement.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Webhook actualizado"); },
  });

  const deleteMutation = trpc.webhookManagement.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Webhook eliminado"); },
  });

  const testMutation = trpc.webhookManagement.test.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Test exitoso (HTTP ${data.status})`);
      } else {
        toast.error(`Test fallido: ${data.error || `HTTP ${data.status}`}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!webhookName.trim() || !webhookUrl.trim()) {
      toast.error("Nombre y URL son requeridos");
      return;
    }
    createMutation.mutate({
      name: webhookName.trim(),
      url: webhookUrl.trim(),
      events: selectedEvents,
    });
  };

  const toggleEvent = (event: string) => {
    if (event === "*") {
      setSelectedEvents(["*"]);
      return;
    }
    let newEvents = selectedEvents.filter(e => e !== "*");
    if (newEvents.includes(event)) {
      newEvents = newEvents.filter(e => e !== event);
    } else {
      newEvents.push(event);
    }
    if (newEvents.length === 0) newEvents = ["*"];
    setSelectedEvents(newEvents);
  };

  const resetForm = () => {
    setWebhookName("");
    setWebhookUrl("");
    setSelectedEvents(["*"]);
    setGeneratedSecret(null);
    setCopiedSecret(false);
  };

  const handleCopySecret = () => {
    if (generatedSecret) {
      navigator.clipboard.writeText(generatedSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <Card className="shadow-apple border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-orange-500" />
              Webhooks Salientes
            </CardTitle>
            <CardDescription>
              Notifica a aplicaciones externas cuando ocurren eventos en tus proyectos
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Nuevo Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              {!generatedSecret ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Crear Webhook</DialogTitle>
                    <DialogDescription>
                      Configura una URL que recibirá notificaciones cuando ocurran eventos.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        placeholder="Ej: Notificación Slack, App Móvil, CRM..."
                        value={webhookName}
                        onChange={(e) => setWebhookName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL de destino</Label>
                      <Input
                        placeholder="https://tu-app.com/webhook/solar"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        type="url"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Eventos</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {AVAILABLE_EVENTS.map((evt) => (
                          <label
                            key={evt.value}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                              selectedEvents.includes(evt.value)
                                ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedEvents.includes(evt.value)}
                              onChange={() => toggleEvent(evt.value)}
                              className="rounded border-gray-300"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">{evt.label}</span>
                              <p className="text-xs text-muted-foreground">{evt.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creando..." : "Crear Webhook"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" /> Webhook Creado
                    </DialogTitle>
                    <DialogDescription>
                      Guarda el secret para verificar la firma de los webhooks recibidos.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Guarda este secret. Se usa para verificar la firma HMAC-SHA256 de los webhooks. No se puede recuperar.
                      </p>
                    </div>
                    <div className="relative">
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                        {generatedSecret}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-7 w-7 p-0"
                        onClick={handleCopySecret}
                      >
                        {copiedSecret ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Verificación de firma:</strong></p>
                      <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-[11px]">
                        signature = HMAC-SHA256(secret, body)<br/>
                        Comparar con header: X-Webhook-Signature
                      </code>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                      Entendido, cerrar
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!webhooksList || webhooksList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Webhook className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay webhooks configurados</p>
            <p className="text-xs mt-1">Crea un webhook para recibir notificaciones en tu app</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooksList.map((wh: any) => (
              <div key={wh.id} className="space-y-2">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    wh.isActive
                      ? "border-gray-200 dark:border-gray-700"
                      : "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${wh.isActive ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                      <Webhook className={`h-4 w-4 ${wh.isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{wh.name}</span>
                        <Badge variant={wh.isActive ? "default" : "destructive"} className="text-xs">
                          {wh.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                        {wh.failCount > 0 && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            {wh.failCount} fallos
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(wh.events as string[]).map((evt: string) => (
                          <span key={evt} className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                            {evt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-blue-500"
                      onClick={() => testMutation.mutate({ id: wh.id })}
                      disabled={testMutation.isPending}
                      title="Enviar test ping"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setShowLogs(showLogs === wh.id ? null : wh.id)}
                    >
                      Logs
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => updateMutation.mutate({ id: wh.id, isActive: !wh.isActive })}
                    >
                      {wh.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => {
                        if (confirm("¿Eliminar este webhook permanentemente?")) {
                          deleteMutation.mutate({ id: wh.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Logs del webhook */}
                {showLogs === wh.id && logs && (
                  <div className="ml-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                    <h4 className="text-xs font-semibold mb-2">Últimos envíos</h4>
                    {logs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin envíos registrados</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {logs.map((log: any) => (
                          <div key={log.id} className="flex items-center gap-2 text-xs">
                            {log.success ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                            )}
                            <span className="font-mono text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {log.event}
                            </Badge>
                            {log.responseStatus && (
                              <span className={`font-mono ${log.success ? "text-green-600" : "text-red-600"}`}>
                                {log.responseStatus}
                              </span>
                            )}
                            {log.error && (
                              <span className="text-red-500 truncate max-w-[200px]">{log.error}</span>
                            )}
                            {log.duration && (
                              <span className="text-muted-foreground">{log.duration}ms</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info de eventos */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-muted-foreground">
            Los webhooks se envían como POST con firma HMAC-SHA256 en el header <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">X-Webhook-Signature</code>.
            Se desactivan automáticamente después de 10 fallos consecutivos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
