import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Clock, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function Reminders() {
  const { data: reminders, isLoading, refetch } = trpc.reminders.list.useQuery();
  const markAsRead = trpc.reminders.markAsRead.useMutation();

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead.mutateAsync({ id });
      toast.success("Recordatorio marcado como leído");
      refetch();
    } catch (error) {
      toast.error("Error al marcar recordatorio");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const activeReminders = reminders?.filter(r => !r.isRead) || [];
  const readReminders = reminders?.filter(r => r.isRead) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Recordatorios
        </h1>
        <p className="text-gray-600 mt-2">
          Gestiona tus notificaciones y recordatorios de proyectos
        </p>
      </div>

      {/* Recordatorios Activos */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-500" />
          Activos ({activeReminders.length})
        </h2>

        {activeReminders.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No tienes recordatorios activos</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeReminders.map((reminder) => (
              <Card key={reminder.id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{reminder.title}</CardTitle>
                      <CardDescription>{reminder.message}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="ml-4">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(new Date(reminder.reminderDate), { 
                        addSuffix: true,
                        locale: es 
                      })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Tipo: {reminder.type === "milestone_due" ? "Hito próximo" : reminder.type === "project_overdue" ? "Proyecto retrasado" : "Personalizado"}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAsRead(reminder.id)}
                      disabled={markAsRead.isPending}
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Marcar como leído
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recordatorios Leídos */}
      {readReminders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Leídos ({readReminders.length})
          </h2>

          <div className="grid gap-4">
            {readReminders.map((reminder) => (
              <Card key={reminder.id} className="opacity-60">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{reminder.title}</CardTitle>
                      <CardDescription>{reminder.message}</CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      <Check className="h-3 w-3 mr-1" />
                      Leído
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
