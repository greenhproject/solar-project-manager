import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bell,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  CheckCircle2,
  ExternalLink,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { useLocation } from "wouter";
import { useState } from "react";
import { useTimezone, fromDateInputValue } from "@/hooks/useTimezone";

export default function Reminders() {
  const [, setLocation] = useLocation();
  const { formatDate: tzFormatDate } = useTimezone();
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean;
    milestoneId: number;
    milestoneName: string;
    projectId: number;
    currentDueDate: string;
  } | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [justification, setJustification] = useState("");

  const {
    data: upcomingMilestones,
    isLoading: loadingUpcoming,
    refetch: refetchUpcoming,
  } = trpc.reminders.upcoming.useQuery({ daysAhead: 7 });

  const {
    data: overdueMilestones,
    isLoading: loadingOverdue,
    refetch: refetchOverdue,
  } = trpc.reminders.overdue.useQuery();

  const updateMilestone = trpc.milestones.update.useMutation();
  const requestReschedule = trpc.milestones.requestReschedule.useMutation();

  const handleMarkAsCompleted = async (milestoneId: number, milestoneName: string) => {
    try {
      await updateMilestone.mutateAsync({
        id: milestoneId,
        status: "completed",
      });
      toast.success(`Hito "${milestoneName}" marcado como completado`);
      refetchUpcoming();
      refetchOverdue();
    } catch (error) {
      toast.error("Error al actualizar hito");
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDialog || !newDueDate || !justification) {
      toast.error("Debes completar la nueva fecha y la justificación");
      return;
    }

    if (justification.length < 5) {
      toast.error("La justificación debe tener al menos 5 caracteres");
      return;
    }

    try {
      await requestReschedule.mutateAsync({
        milestoneId: rescheduleDialog.milestoneId,
        newDueDate: fromDateInputValue(newDueDate),
        justification,
      });
      toast.success(`Hito "${rescheduleDialog.milestoneName}" reprogramado exitosamente`);
      setRescheduleDialog(null);
      setNewDueDate("");
      setJustification("");
      refetchUpcoming();
      refetchOverdue();
    } catch (error: any) {
      toast.error(error?.message || "Error al reprogramar hito");
    }
  };

  const openRescheduleDialog = (milestone: {
    milestoneId: number;
    milestoneName: string;
    projectId: number;
    dueDate: string | Date;
  }) => {
    setRescheduleDialog({
      open: true,
      milestoneId: milestone.milestoneId,
      milestoneName: milestone.milestoneName,
      projectId: milestone.projectId,
      currentDueDate: tzFormatDate(milestone.dueDate),
    });
    setNewDueDate("");
    setJustification("");
  };

  const isLoading = loadingUpcoming || loadingOverdue;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 dark:text-orange-400" />
      </div>
    );
  }

  const totalActive = (upcomingMilestones?.length || 0) + (overdueMilestones?.length || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Recordatorios
        </h1>
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mt-2">
          Gestiona tus notificaciones y recordatorios de proyectos
        </p>
      </div>

      {/* Hitos Vencidos */}
      {overdueMilestones && overdueMilestones.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Hitos Vencidos ({overdueMilestones.length})
          </h2>

          <div className="grid gap-4">
            {overdueMilestones.map((milestone) => {
              const daysOverdue = differenceInDays(
                new Date(),
                new Date(milestone.dueDate)
              );

              return (
                <Card
                  key={milestone.milestoneId}
                  className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/projects/${milestone.projectId}`)}
                >
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2 break-words">
                            {milestone.milestoneName}
                            <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          </CardTitle>
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {daysOverdue} {daysOverdue === 1 ? "día" : "días"} de retraso
                          </Badge>
                        </div>

                        {milestone.description && (
                          <CardDescription className="text-sm">
                            {milestone.description}
                          </CardDescription>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                          <span className="flex items-center gap-1 font-medium text-orange-600 dark:text-orange-400">
                            <MapPin className="h-4 w-4" />
                            {milestone.projectName}
                          </span>

                          {milestone.projectLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {milestone.projectLocation}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Vencía: {tzFormatDate(milestone.dueDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsCompleted(
                              milestone.milestoneId,
                              milestone.milestoneName
                            );
                          }}
                          disabled={updateMilestone.isPending}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Completar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRescheduleDialog(milestone);
                          }}
                          className="gap-2 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-gray-600 hover:bg-orange-50 dark:bg-orange-900/20"
                        >
                          <CalendarClock className="h-4 w-4" />
                          Reprogramar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Hitos Próximos a Vencer */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 dark:text-orange-400" />
          Próximos a Vencer ({upcomingMilestones?.length || 0})
        </h2>

        {!upcomingMilestones || upcomingMilestones.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>No hay hitos próximos a vencer en los próximos 7 días</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {upcomingMilestones.map((milestone) => {
              const daysUntilDue = differenceInDays(
                new Date(milestone.dueDate),
                new Date()
              );

              const urgencyColor =
                daysUntilDue <= 2
                  ? "border-l-orange-500"
                  : daysUntilDue <= 5
                    ? "border-l-yellow-500"
                    : "border-l-blue-500";

              const badgeVariant =
                daysUntilDue <= 2
                  ? "destructive"
                  : daysUntilDue <= 5
                    ? "default"
                    : "secondary";

              return (
                <Card
                  key={milestone.milestoneId}
                  className={`border-l-4 ${urgencyColor} hover:shadow-md transition-shadow cursor-pointer`}
                  onClick={() => setLocation(`/projects/${milestone.projectId}`)}
                >
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-sm sm:text-base lg:text-lg flex items-center gap-2 break-words">
                            {milestone.milestoneName}
                            <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          </CardTitle>
                          <Badge variant={badgeVariant} className="gap-1">
                            <Clock className="h-3 w-3" />
                            {daysUntilDue === 0
                              ? "Hoy"
                              : daysUntilDue === 1
                                ? "Mañana"
                                : `En ${daysUntilDue} días`}
                          </Badge>
                        </div>

                        {milestone.description && (
                          <CardDescription className="text-sm">
                            {milestone.description}
                          </CardDescription>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                          <span className="flex items-center gap-1 font-medium text-orange-600 dark:text-orange-400">
                            <MapPin className="h-4 w-4" />
                            {milestone.projectName}
                          </span>

                          {milestone.projectLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {milestone.projectLocation}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {tzFormatDate(milestone.dueDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsCompleted(
                              milestone.milestoneId,
                              milestone.milestoneName
                            );
                          }}
                          disabled={updateMilestone.isPending}
                          className="gap-2"
                        >
                          <Check className="h-4 w-4" />
                          Completar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRescheduleDialog(milestone);
                          }}
                          className="gap-2 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-gray-600 hover:bg-orange-50 dark:bg-orange-900/20"
                        >
                          <CalendarClock className="h-4 w-4" />
                          Reprogramar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Estado Vacío Total */}
      {totalActive === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-6 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              ¡Todo al día!
            </p>
            <p>No tienes hitos pendientes próximos a vencer ni vencidos</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Reprogramación */}
      <Dialog
        open={!!rescheduleDialog?.open}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleDialog(null);
            setNewDueDate("");
            setJustification("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-orange-500 dark:text-orange-400" />
              Reprogramar Hito
            </DialogTitle>
            <DialogDescription>
              Reprogramar <strong>"{rescheduleDialog?.milestoneName}"</strong>
              <br />
              Fecha actual de vencimiento: <strong>{rescheduleDialog?.currentDueDate}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newDueDate">Nueva fecha de vencimiento</Label>
              <Input
                id="newDueDate"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">
                Justificación <span className="text-red-500 dark:text-red-400">*</span>
              </Label>
              <Textarea
                id="justification"
                placeholder="Explica por qué se necesita reprogramar este hito..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                Esta justificación quedará registrada como nota del proyecto y será visible para administradores e ingenieros.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRescheduleDialog(null);
                setNewDueDate("");
                setJustification("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!newDueDate || !justification || requestReschedule.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {requestReschedule.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CalendarClock className="h-4 w-4 mr-2" />
              )}
              Reprogramar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
