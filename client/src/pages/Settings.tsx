import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Wrench, Bell, Mail, ChevronRight, Globe, Webhook } from "lucide-react";
import { NotificationSettings } from "@/components/NotificationSettings";
import { SystemConfiguration } from "@/components/SystemConfiguration";
import { AutoNotificationsManager } from "@/components/AutoNotificationsManager";
import { TimezoneSettings } from "@/components/TimezoneSettings";
import { WebhookLogs } from "@/components/WebhookLogs";
import { useLocation } from "wouter";

export default function Settings() {
  const [, navigate] = useLocation();

  return (
    <div className="container py-4 sm:py-6 lg:py-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Administra las opciones del sistema y preferencias
        </p>
      </div>

      {/* Zona Horaria */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Zona Horaria
        </h2>
        <TimezoneSettings />
      </div>

      {/* Configuración de Email */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Servicio de Email
        </h2>
        <Card
          className="shadow-apple border-0 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/settings/email")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Mail className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Configuración de Email</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                    Configura el proveedor de email (Resend, SendGrid, SMTP) para notificaciones automáticas
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notificaciones Push */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notificaciones
        </h2>
        <div className="space-y-6">
          <NotificationSettings />
          <AutoNotificationsManager />
        </div>
      </div>

      {/* Webhooks de OpenSolar */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          Webhooks de OpenSolar
        </h2>
        <WebhookLogs />
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
