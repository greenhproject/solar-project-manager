import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Wrench, Bell } from "lucide-react";
import { NotificationSettings } from "@/components/NotificationSettings";
import { SystemConfiguration } from "@/components/SystemConfiguration";

export default function Settings() {
  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Administra las opciones del sistema y preferencias
        </p>
      </div>

      {/* Notificaciones Push */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notificaciones
        </h2>
        <NotificationSettings />
      </div>

      {/* Configuración del Sistema */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Sistema
        </h2>
        <SystemConfiguration />
      </div>
    </div>
  );
}
