import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Mail, Settings, History, AlertTriangle, CheckCircle, XCircle, Send } from "lucide-react";
import { toast } from "sonner";

export default function MilestoneRemindersConfig() {
  const configQuery = trpc.milestoneReminders.getConfig.useQuery();
  const logsQuery = trpc.milestoneReminders.getLogs.useQuery({ page: 1, limit: 20 });
  const updateConfig = trpc.milestoneReminders.updateConfig.useMutation();
  const toggleCron = trpc.milestoneReminders.toggleCronJob.useMutation();
  const updateHour = trpc.milestoneReminders.updateCronHour.useMutation();
  const sendTest = trpc.milestoneReminders.sendTestReminder.useMutation();

  const [testEmail, setTestEmail] = useState("");
  const [formState, setFormState] = useState({
    sendHourUtc: 12,
    reminderDaysThreshold: 1,
    urgentDaysThreshold: 4,
    criticalDaysThreshold: 8,
    maxReminderDays: 30,
    sendCopyToAdmin: true,
    adminCcEmail: "admin@greenhproject.com",
    reminderSubject: "Recordatorio: Hito pendiente de completar",
    urgentSubject: "⚠️ Urgente: Hito con retraso significativo",
    criticalSubject: "🚨 Crítico: Hito con retraso grave - Acción inmediata requerida",
    customMessage: "",
  });

  useEffect(() => {
    if (configQuery.data) {
      setFormState({
        sendHourUtc: configQuery.data.sendHourUtc ?? 12,
        reminderDaysThreshold: configQuery.data.reminderDaysThreshold ?? 1,
        urgentDaysThreshold: configQuery.data.urgentDaysThreshold ?? 4,
        criticalDaysThreshold: configQuery.data.criticalDaysThreshold ?? 8,
        maxReminderDays: configQuery.data.maxReminderDays ?? 30,
        sendCopyToAdmin: configQuery.data.sendCopyToAdmin ?? true,
        adminCcEmail: configQuery.data.adminCcEmail ?? "admin@greenhproject.com",
        reminderSubject: configQuery.data.reminderSubject ?? "Recordatorio: Hito pendiente de completar",
        urgentSubject: configQuery.data.urgentSubject ?? "⚠️ Urgente: Hito con retraso significativo",
        criticalSubject: configQuery.data.criticalSubject ?? "🚨 Crítico: Hito con retraso grave - Acción inmediata requerida",
        customMessage: configQuery.data.customMessage ?? "",
      });
    }
  }, [configQuery.data]);

  const handleSaveConfig = async () => {
    try {
      await updateConfig.mutateAsync(formState);
      toast.success("Configuración guardada", { description: "Los cambios se aplicarán en el próximo envío." });
      configQuery.refetch();
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleToggleCron = async (enabled: boolean) => {
    try {
      await toggleCron.mutateAsync({ enabled });
      toast.success(enabled ? "Sistema activado" : "Sistema pausado", {
        description: enabled
          ? "Los recordatorios se enviarán diariamente."
          : "Los recordatorios están pausados.",
      });
      configQuery.refetch();
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleUpdateHour = async (hour: number) => {
    try {
      await updateHour.mutateAsync({ hour });
      setFormState((prev) => ({ ...prev, sendHourUtc: hour }));
      toast.success("Hora actualizada", { description: `Los emails se enviarán a las ${hour}:00 UTC.` });
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Ingresa un email de prueba");
      return;
    }
    try {
      await sendTest.mutateAsync({ email: testEmail });
      toast.success("Email enviado", { description: `Email de prueba enviado a ${testEmail}` });
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const isEnabled = configQuery.data?.isEnabled ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-orange-500" />
            Recordatorios de Hitos
          </h1>
          <p className="text-gray-500 mt-1">
            Configura el envío automático de emails para hitos vencidos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {isEnabled ? "Activo" : "Inactivo"}
          </span>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleCron}
            disabled={toggleCron.isPending}
          />
          {isEnabled && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" /> Enviando diariamente
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config" className="flex items-center gap-1">
            <Settings className="h-4 w-4" /> Configuración
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1">
            <Mail className="h-4 w-4" /> Mensajes
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1">
            <History className="h-4 w-4" /> Historial
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-1">
            <Send className="h-4 w-4" /> Prueba
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configuración */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Programación
              </CardTitle>
              <CardDescription>
                Define cuándo y cómo se envían los recordatorios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Hora de envío (UTC)</Label>
                  <Select
                    value={String(formState.sendHourUtc)}
                    onValueChange={(v) => handleUpdateHour(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {i.toString().padStart(2, "0")}:00 UTC
                          {i === 12 ? " (7:00 AM COL)" : ""}
                          {i === 13 ? " (8:00 AM COL)" : ""}
                          {i === 14 ? " (9:00 AM COL)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Colombia es UTC-5. Las 12:00 UTC = 7:00 AM Colombia.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Máximo de días para enviar recordatorios</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={formState.maxReminderDays}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        maxReminderDays: parseInt(e.target.value) || 30,
                      }))
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Después de este número de días, se dejará de enviar recordatorios.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Niveles de Urgencia
              </CardTitle>
              <CardDescription>
                Define los umbrales de días para cada nivel de urgencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <Label className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    Recordatorio
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={formState.reminderDaysThreshold}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          reminderDaysThreshold: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">a</span>
                    <span className="text-sm font-medium">{formState.urgentDaysThreshold - 1} días</span>
                  </div>
                </div>

                <div className="space-y-2 p-4 rounded-lg bg-orange-50 border border-orange-200">
                  <Label className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                    Urgente
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={2}
                      max={60}
                      value={formState.urgentDaysThreshold}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          urgentDaysThreshold: parseInt(e.target.value) || 4,
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">a</span>
                    <span className="text-sm font-medium">{formState.criticalDaysThreshold - 1} días</span>
                  </div>
                </div>

                <div className="space-y-2 p-4 rounded-lg bg-red-50 border border-red-200">
                  <Label className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    Crítico
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={3}
                      max={90}
                      value={formState.criticalDaysThreshold}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          criticalDaysThreshold: parseInt(e.target.value) || 8,
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">días en adelante</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Copia al Administrador</CardTitle>
              <CardDescription>
                Recibe una copia de cada recordatorio enviado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formState.sendCopyToAdmin}
                  onCheckedChange={(v) =>
                    setFormState((prev) => ({ ...prev, sendCopyToAdmin: v }))
                  }
                />
                <Label>Enviar copia al administrador</Label>
              </div>
              {formState.sendCopyToAdmin && (
                <div className="space-y-2">
                  <Label>Email del administrador (CC)</Label>
                  <Input
                    type="email"
                    value={formState.adminCcEmail}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        adminCcEmail: e.target.value,
                      }))
                    }
                    placeholder="admin@greenhproject.com"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </TabsContent>

        {/* Tab: Mensajes */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asuntos de Email por Nivel</CardTitle>
              <CardDescription>
                Personaliza el asunto del email según el nivel de urgencia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  Asunto - Recordatorio
                </Label>
                <Input
                  value={formState.reminderSubject}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, reminderSubject: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  Asunto - Urgente
                </Label>
                <Input
                  value={formState.urgentSubject}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, urgentSubject: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  Asunto - Crítico
                </Label>
                <Input
                  value={formState.criticalSubject}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, criticalSubject: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mensaje Personalizado</CardTitle>
              <CardDescription>
                Agrega un mensaje adicional que aparecerá en todos los emails de recordatorio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formState.customMessage}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, customMessage: e.target.value }))
                }
                placeholder="Ej: Recuerda que los hitos son fundamentales para el avance del proyecto. Si necesitas apoyo, contacta a tu coordinador."
                rows={4}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? "Guardando..." : "Guardar Mensajes"}
            </Button>
          </div>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Envíos</CardTitle>
              <CardDescription>
                Registro de todos los recordatorios enviados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsQuery.isLoading ? (
                <p className="text-gray-500 text-center py-8">Cargando historial...</p>
              ) : !logsQuery.data?.logs.length ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay envíos registrados aún</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Los registros aparecerán aquí cuando se envíen los primeros recordatorios.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logsQuery.data.logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {log.status === "sent" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : log.status === "failed" ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{log.recipientEmail}</p>
                          <p className="text-xs text-gray-500">
                            Hito #{log.milestoneId} · Proyecto #{log.projectId} · {log.daysOverdue} días de retraso
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            log.urgencyLevel === "critical"
                              ? "destructive"
                              : log.urgencyLevel === "urgent"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {log.urgencyLevel}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {log.sentAt ? new Date(log.sentAt).toLocaleDateString("es-CO") : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                  {logsQuery.data.totalPages > 1 && (
                    <p className="text-center text-sm text-gray-500 pt-2">
                      Mostrando {logsQuery.data.logs.length} de {logsQuery.data.total} registros
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Prueba */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" /> Enviar Email de Prueba
              </CardTitle>
              <CardDescription>
                Envía un email de prueba para verificar que el sistema funciona correctamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email de destino</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="tu@email.com"
                  />
                  <Button
                    onClick={handleSendTest}
                    disabled={sendTest.isPending || !testEmail}
                  >
                    {sendTest.isPending ? "Enviando..." : "Enviar Prueba"}
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> El email de prueba incluirá datos ficticios para que puedas
                  verificar el diseño y formato del recordatorio. Los botones de acción en el email
                  de prueba no tendrán funcionalidad real.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
