import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, Play, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AutoNotificationsManager() {
  const [lastResult, setLastResult] = useState<{ upcomingCount: number; overdueCount: number } | null>(null);

  const checkNotifications = trpc.notifications.checkAndCreateAutoNotifications.useMutation({
    onSuccess: (data) => {
      setLastResult({ upcomingCount: data.upcomingCount, overdueCount: data.overdueCount });
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message || "Error al verificar notificaciones");
    },
  });

  return (
    <Card className="shadow-apple border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-purple-500" />
          Notificaciones Automáticas
        </CardTitle>
        <CardDescription>
          Verificar y crear notificaciones para hitos próximos a vencer o vencidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Este proceso verifica todos los hitos del sistema y crea notificaciones para:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Hitos que vencen en los próximos 2 días</li>
              <li>Hitos que ya están vencidos</li>
            </ul>
            <p className="mt-2 text-sm">
              <strong>Nota:</strong> Para ejecución automática periódica, configura un cron job que llame al endpoint cada hora.
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => checkNotifications.mutate()}
            disabled={checkNotifications.isPending}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
          >
            {checkNotifications.isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Verificando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Ejecutar Verificación
              </>
            )}
          </Button>

          {lastResult && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-gray-600">
                  {lastResult.upcomingCount} próximos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-gray-600">
                  {lastResult.overdueCount} vencidos
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-sm mb-2">Configuración de Cron Job (opcional)</h4>
          <p className="text-xs text-gray-600 mb-2">
            Para ejecutar automáticamente cada hora, configura un servicio externo (como cron-job.org o EasyCron) con:
          </p>
          <code className="block bg-white p-2 rounded text-xs font-mono border">
            POST https://tu-dominio.com/api/trpc/notifications.checkAndCreateAutoNotifications
          </code>
          <p className="text-xs text-gray-500 mt-2">
            Requiere autenticación de administrador
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
