import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Bell, BellOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  areNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
  notifyCustom,
} from "@/lib/pushNotifications";

export function NotificationSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    granted: false,
    denied: false,
    default: true,
  });

  // Verificar estado de permisos al montar
  useEffect(() => {
    if (areNotificationsSupported()) {
      const status = getNotificationPermission();
      setPermissionStatus(status);
      setNotificationsEnabled(status.granted);
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!areNotificationsSupported()) {
      toast.error("Tu navegador no soporta notificaciones push");
      return;
    }

    const granted = await requestNotificationPermission();

    if (granted) {
      setNotificationsEnabled(true);
      setPermissionStatus({ granted: true, denied: false, default: false });
      toast.success("Notificaciones activadas correctamente");

      // Enviar notificación de prueba
      notifyCustom(
        "Notificaciones activadas",
        "Recibirás alertas sobre hitos próximos a vencer y proyectos retrasados",
        "success"
      );
    } else {
      toast.error("Permisos de notificaciones denegados");
      setPermissionStatus({ granted: false, denied: true, default: false });
    }
  };

  const handleDisableNotifications = () => {
    setNotificationsEnabled(false);
    toast.info(
      "Las notificaciones se han desactivado. Para volver a activarlas, deberás cambiar los permisos en la configuración de tu navegador."
    );
  };

  const handleTestNotification = () => {
    console.log("[Test] Iniciando notificación de prueba...");
    console.log("[Test] Permisos:", Notification.permission);
    
    const notification = notifyCustom(
      "Notificación de prueba",
      "Esta es una notificación de prueba del sistema Solar Project Manager",
      "info"
    );
    
    if (notification) {
      console.log("[Test] Notificación creada:", notification);
      toast.success("Notificación de prueba enviada");
    } else {
      console.error("[Test] No se pudo crear la notificación");
      toast.error("Error al enviar notificación. Revisa la consola del navegador.");
    }
  };

  if (!areNotificationsSupported()) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <BellOff className="h-6 w-6 text-muted-foreground mt-1" />
          <div>
            <h3 className="font-semibold mb-2">
              Notificaciones no disponibles
            </h3>
            <p className="text-sm text-muted-foreground">
              Tu navegador no soporta notificaciones push. Considera usar un
              navegador moderno como Chrome, Firefox o Edge.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Bell className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Notificaciones Push</h3>
              <p className="text-sm text-muted-foreground">
                Recibe alertas en tiempo real sobre hitos próximos a vencer y
                proyectos retrasados
              </p>
            </div>
          </div>

          <Switch
            checked={notificationsEnabled}
            onCheckedChange={checked => {
              if (checked) {
                handleEnableNotifications();
              } else {
                handleDisableNotifications();
              }
            }}
            disabled={permissionStatus.denied}
          />
        </div>

        {/* Estado de permisos */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
          {permissionStatus.granted && (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Permisos concedidos
              </span>
            </>
          )}
          {permissionStatus.denied && (
            <>
              <X className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700 font-medium">
                Permisos denegados - Cambia la configuración en tu navegador
              </span>
            </>
          )}
          {permissionStatus.default && (
            <>
              <Bell className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700 font-medium">
                Activa las notificaciones para recibir alertas
              </span>
            </>
          )}
        </div>

        {/* Botón de prueba */}
        {notificationsEnabled && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleTestNotification}
              className="w-full"
            >
              Enviar notificación de prueba
            </Button>
          </div>
        )}

        {/* Información adicional */}
        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm mb-2">
            ¿Qué notificaciones recibirás?
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Hitos que vencen en los próximos 3 días</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Proyectos que están retrasados</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Hitos completados exitosamente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Alertas importantes del asistente de IA</span>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
