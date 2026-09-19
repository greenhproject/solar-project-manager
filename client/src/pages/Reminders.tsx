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
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { useLocation } from "wouter";
import { useState } from "react";
import { useTimezone, fromDateInputValue } from "@/hooks/useTimezone";
import { partitionRemindersByOwnership } from "@shared/reminderOwnership";

type ReminderMilestone = {
  milestoneId: number;
  milestoneName: string;
  dueDate: Date | string;
  status: string;
  description: string | null;
  projectId: number;
  projectName: string;
  projectLocation: string | null;
  assignedUserId: number | null;
  assignedUserName: string | null;
};

type ReminderSectionProps = {
  title: string;
  description: string;
  milestones: ReminderMilestone[];
  kind: "overdue" | "upcoming";
  showAssignee?: boolean;
  emptyMessage: string;
  onOpenProject: (projectId: number) => void;
  onComplete: (milestoneId: number, milestoneName: string) => void;
  onReschedule: (milestone: ReminderMilestone) => void;
  completing: boolean;
  formatDate: (date: Date | string) => string;
};

function ReminderSection({
  title,
  description,
  milestones,
  kind,
  showAssignee = false,
  emptyMessage,
  onOpenProject,
  onComplete,
  onReschedule,
  completing,
  formatDate,
}: ReminderSectionProps) {
  const isOverdue = kind === "overdue";

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {isOverdue ? (
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
          ) : (
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
          )}
          <h3 className={`text-base sm:text-lg font-semibold ${isOverdue ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
            {title} ({milestones.length})
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {milestones.length === 0 ? (
        <Card className="border-dashed bg-muted/20 shadow-none">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            {emptyMessage}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {milestones.map((milestone) => {
            const days = isOverdue
              ? differenceInDays(new Date(), new Date(milestone.dueDate))
              : differenceInDays(new Date(milestone.dueDate), new Date());
            const urgencyBorder = isOverdue
              ? "border-l-red-500"
              : days <= 2
                ? "border-l-orange-500"
                : days <= 5
                  ? "border-l-yellow-500"
                  : "border-l-blue-500";
            const urgencyBadge = isOverdue
              ? "destructive"
              : days <= 2
                ? "destructive"
                : days <= 5
                  ? "default"
                  : "secondary";

            return (
              <Card
                key={milestone.milestoneId}
                className={`border-l-4 ${urgencyBorder} cursor-pointer transition-shadow hover:shadow-md`}
                onClick={() => onOpenProject(milestone.projectId)}
              >
                <CardHeader className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="flex items-center gap-2 break-words text-sm sm:text-base lg:text-lg">
                          {milestone.milestoneName}
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </CardTitle>
                        <Badge variant={urgencyBadge as "default" | "secondary" | "destructive"} className="gap-1">
                          {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {isOverdue
                            ? `${days} ${days === 1 ? "día" : "días"} de retraso`
                            : days === 0
                              ? "Hoy"
                              : days === 1
                                ? "Mañana"
                                : `En ${days} días`}
                        </Badge>
                      </div>

                      {milestone.description && <CardDescription className="text-sm">{milestone.description}</CardDescription>}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
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
                          {isOverdue ? "Vencía: " : "Vence: "}{formatDate(milestone.dueDate)}
                        </span>
                        {showAssignee && (
                          <Badge variant="outline" className="font-normal">
                            {milestone.assignedUserName || "Sin responsable asignado"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                      <Button
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          onComplete(milestone.milestoneId, milestone.milestoneName);
                        }}
                        disabled={completing}
                        className={isOverdue ? "gap-2 bg-green-600 hover:bg-green-700" : "gap-2"}
                      >
                        {isOverdue ? <CheckCircle2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        Completar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onReschedule(milestone);
                        }}
                        className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-gray-600 dark:text-orange-400 dark:hover:bg-orange-900/20"
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
    </section>
  );
}

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

  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: upcomingMilestones, isLoading: loadingUpcoming, refetch: refetchUpcoming } =
    trpc.reminders.upcoming.useQuery({ daysAhead: 7 });
  const { data: overdueMilestones, isLoading: loadingOverdue, refetch: refetchOverdue } =
    trpc.reminders.overdue.useQuery();
  const updateMilestone = trpc.milestones.update.useMutation();
  const requestReschedule = trpc.milestones.requestReschedule.useMutation();

  const handleMarkAsCompleted = async (milestoneId: number, milestoneName: string) => {
    try {
      await updateMilestone.mutateAsync({ id: milestoneId, status: "completed" });
      toast.success(`Hito "${milestoneName}" marcado como completado`);
      refetchUpcoming();
      refetchOverdue();
    } catch {
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

  const openRescheduleDialog = (milestone: ReminderMilestone) => {
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

  if (loadingUpcoming || loadingOverdue) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 dark:text-orange-400" />
      </div>
    );
  }

  const overdue = (overdueMilestones || []) as ReminderMilestone[];
  const upcoming = (upcomingMilestones || []) as ReminderMilestone[];
  const totalActive = overdue.length + upcoming.length;
  const isGlobalAdministrator = currentUser?.role === "admin";
  const ownOverdue = partitionRemindersByOwnership(overdue, currentUser?.id).mine;
  const teamOverdue = partitionRemindersByOwnership(overdue, currentUser?.id).team;
  const ownUpcoming = partitionRemindersByOwnership(upcoming, currentUser?.id).mine;
  const teamUpcoming = partitionRemindersByOwnership(upcoming, currentUser?.id).team;
  const sharedSectionProps = {
    onOpenProject: (projectId: number) => setLocation(`/projects/${projectId}`),
    onComplete: handleMarkAsCompleted,
    onReschedule: openRescheduleDialog,
    completing: updateMilestone.isPending,
    formatDate: tzFormatDate,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-3xl font-bold text-transparent">Recordatorios</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Gestiona tus notificaciones y recordatorios de proyectos</p>
      </div>

      {isGlobalAdministrator ? (
        <>
          <Card className="overflow-hidden border-primary/20 shadow-apple">
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 px-5 py-1" />
            <CardHeader className="bg-gradient-to-r from-orange-50 via-amber-50/70 to-background pb-4 dark:from-orange-950/20 dark:via-amber-950/10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><UserRoundCheck className="h-6 w-6" /></div>
                  <div>
                    <CardTitle className="text-xl">Mi bandeja de atención</CardTitle>
                    <CardDescription className="mt-1">Tus hitos asignados aparecen primero; la supervisión del resto del equipo se conserva aparte.</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit border-primary/25 bg-primary/5 px-3 py-1.5 text-sm text-primary">
                  {ownOverdue.length + ownUpcoming.length} pendientes propios
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-5 sm:grid-cols-2">
              <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Vencidos asignados a mí</p>
                <p className="mt-1 text-3xl font-bold text-red-700 dark:text-red-300">{ownOverdue.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Requieren gestión inmediata.</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Próximos asignados a mí</p>
                <p className="mt-1 text-3xl font-bold text-amber-800 dark:text-amber-200">{ownUpcoming.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Vencen en los próximos 7 días.</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 rounded-2xl border border-primary/15 bg-primary/[0.025] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <UserRoundCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Mis recordatorios</h2>
                <p className="text-sm text-muted-foreground">Hitos cuyo responsable eres tú.</p>
              </div>
            </div>
            <ReminderSection title="Mis hitos vencidos" description="Prioridad personal" milestones={ownOverdue} kind="overdue" emptyMessage="No tienes hitos vencidos asignados." {...sharedSectionProps} />
            <ReminderSection title="Mis próximos vencimientos" description="Próximos 7 días" milestones={ownUpcoming} kind="upcoming" emptyMessage="No tienes hitos próximos asignados." {...sharedSectionProps} />
          </div>

          <div className="space-y-6 rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <UsersRound className="mt-0.5 h-5 w-5 text-slate-600 dark:text-slate-300" />
              <div>
                <h2 className="text-xl font-semibold">Seguimiento general del equipo</h2>
                <p className="text-sm text-muted-foreground">Hitos de otros responsables y los que aún no tienen responsable asignado.</p>
              </div>
            </div>
            <ReminderSection title="Hitos vencidos del equipo" description="Vista de supervisión" milestones={teamOverdue} kind="overdue" showAssignee emptyMessage="No hay hitos vencidos del equipo." {...sharedSectionProps} />
            <ReminderSection title="Próximos vencimientos del equipo" description="Próximos 7 días" milestones={teamUpcoming} kind="upcoming" showAssignee emptyMessage="No hay hitos próximos del equipo." {...sharedSectionProps} />
          </div>
        </>
      ) : (
        <>
          <ReminderSection title="Hitos vencidos" description="Requieren atención inmediata" milestones={overdue} kind="overdue" emptyMessage="No tienes hitos vencidos." {...sharedSectionProps} />
          <ReminderSection title="Próximos a vencer" description="Próximos 7 días" milestones={upcoming} kind="upcoming" emptyMessage="No hay hitos próximos a vencer en los próximos 7 días." {...sharedSectionProps} />
        </>
      )}

      {totalActive === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <p className="mb-2 text-lg font-medium text-foreground">¡Todo al día!</p>
            <p>No tienes hitos pendientes próximos a vencer ni vencidos.</p>
          </CardContent>
        </Card>
      )}

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
              <CalendarClock className="h-5 w-5 text-orange-500" />
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
              <Input id="newDueDate" type="date" value={newDueDate} onChange={(event) => setNewDueDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="justification">Justificación <span className="text-red-500">*</span></Label>
              <Textarea
                id="justification"
                placeholder="Explica por qué se necesita reprogramar este hito..."
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Esta justificación quedará registrada como nota del proyecto y será visible para administradores e ingenieros.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setRescheduleDialog(null); setNewDueDate(""); setJustification(""); }}>Cancelar</Button>
            <Button onClick={handleReschedule} disabled={!newDueDate || !justification || requestReschedule.isPending} className="bg-orange-600 hover:bg-orange-700">
              {requestReschedule.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
              Reprogramar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
