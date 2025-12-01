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
  Bell,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useLocation } from "wouter";

export default function Reminders() {
  const [, setLocation] = useLocation();

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

  const isLoading = loadingUpcoming || loadingOverdue;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
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
        <p className="text-gray-600 mt-2">
          Gestiona tus notificaciones y recordatorios de proyectos
        </p>
      </div>

      {/* Hitos Vencidos */}
      {overdueMilestones && overdueMilestones.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-red-600 flex items-center gap-2">
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
                  className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {milestone.milestoneName}
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

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <button
                            onClick={() => setLocation(`/projects/${milestone.projectId}`)}
                            className="flex items-center gap-1 hover:text-orange-600 transition-colors"
                          >
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{milestone.projectName}</span>
                          </button>

                          {milestone.projectLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {milestone.projectLocation}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Vencía: {format(new Date(milestone.dueDate), "dd/MM/yyyy", { locale: es })}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() =>
                          handleMarkAsCompleted(
                            milestone.milestoneId,
                            milestone.milestoneName
                          )
                        }
                        disabled={updateMilestone.isPending}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Completar
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Hitos Próximos a Vencer */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-500" />
          Próximos a Vencer ({upcomingMilestones?.length || 0})
        </h2>

        {!upcomingMilestones || upcomingMilestones.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay hitos próximos a vencer en los próximos 7 días</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
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
                  className={`border-l-4 ${urgencyColor} hover:shadow-md transition-shadow`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {milestone.milestoneName}
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

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <button
                            onClick={() => setLocation(`/projects/${milestone.projectId}`)}
                            className="flex items-center gap-1 hover:text-orange-600 transition-colors"
                          >
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">{milestone.projectName}</span>
                          </button>

                          {milestone.projectLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {milestone.projectLocation}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(milestone.dueDate), "dd/MM/yyyy", { locale: es })}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleMarkAsCompleted(
                            milestone.milestoneId,
                            milestone.milestoneName
                          )
                        }
                        disabled={updateMilestone.isPending}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Completar
                      </Button>
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
          <CardContent className="pt-6 text-center text-gray-500">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              ¡Todo al día!
            </p>
            <p>No tienes hitos pendientes próximos a vencer ni vencidos</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
