import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Webhook, CheckCircle2, XCircle, MinusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function getStatusBadge(status: string) {
  switch (status) {
    case "processed":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Procesado
        </Badge>
      );
    case "ignored":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <MinusCircle className="h-3 w-3 mr-1" />
          Ignorado
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getActionLabel(action: string | null) {
  if (!action) return "—";
  const labels: Record<string, string> = {
    created_project: "Proyecto creado",
    updated_project: "Proyecto actualizado",
    ignored_not_sold: "No vendido",
    ignored_model: "Modelo no procesado",
    delete_noted: "Eliminación registrada",
    create_failed: "Error al crear",
    update_failed: "Error al actualizar",
    processing_error: "Error de procesamiento",
    no_action: "Sin acción",
  };
  return labels[action] || action;
}

export function WebhookLogs() {
  const { data: logs, isLoading, refetch } = trpc.sync.webhookLogs.useQuery({ limit: 20 });

  if (isLoading) {
    return (
      <Card className="shadow-apple border-0">
        <CardContent className="pt-6 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Cargando logs...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-apple border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              Webhooks de OpenSolar
            </CardTitle>
            <CardDescription>
              Historial de webhooks recibidos. Solo los proyectos marcados como vendidos se crean automáticamente.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Webhook className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No se han recibido webhooks aún</p>
            <p className="text-sm mt-1">
              Configura la URL del webhook en OpenSolar para empezar a recibir eventos automáticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getStatusBadge(log.status)}
                  <Badge variant="outline" className="text-xs">
                    {log.event}
                  </Badge>
                  <span className="text-sm font-medium truncate">
                    {getActionLabel(log.action)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {log.modelId && (
                    <span className="bg-muted px-2 py-0.5 rounded">
                      OS #{log.modelId}
                    </span>
                  )}
                  <span>
                    {new Date(log.receivedAt).toLocaleString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {log.message && (
                  <p className="text-xs text-muted-foreground truncate max-w-md sm:max-w-xs" title={log.message}>
                    {log.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>URL del Webhook:</strong>{" "}
            <code className="bg-blue-100 px-1 rounded text-xs">
              {window.location.origin}/api/webhook/opensolar
            </code>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Configura esta URL en OpenSolar → Integraciones → Webhooks con el header <code>X-Webhook-Secret</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
