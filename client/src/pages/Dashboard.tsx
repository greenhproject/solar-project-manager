import { useIsMobile } from "@/hooks/useMobile";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sun,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  Calendar,
  Users,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useTimezone } from "@/hooks/useTimezone";

export default function Dashboard() {
  const { formatDate: tzFormatDate, formatRelative: tzFormatRelative } = useTimezone();
  // Usar meQuery del backend para obtener el usuario real (con rol correcto de la BD)
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const user = meQuery.data ?? null;
  const isMobile = useIsMobile();
  const { data: stats, isLoading: statsLoading } =
    trpc.projects.stats.useQuery();
  const { data: projects, isLoading: projectsLoading } =
    trpc.projects.list.useQuery();
  const { data: reminders } = trpc.reminders.unread.useQuery();

  if (meQuery.isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planning: { label: "Planificación", variant: "secondary" as const },
      in_progress: { label: "En Progreso", variant: "default" as const },
      on_hold: { label: "En Espera", variant: "outline" as const },
      completed: { label: "Completado", variant: "default" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.planning;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isOverdue = (estimatedEndDate: Date, status: string) => {
    return (
      status !== "completed" &&
      status !== "cancelled" &&
      new Date(estimatedEndDate) < new Date()
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-solar bg-clip-text text-transparent">
              Dashboard Solar
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 truncate">
              Bienvenido, {user.name || user.email}
              {user.role === "admin" && (
                <Badge variant="default" className="ml-2">
                  Admin
                </Badge>
              )}
            </p>
          </div>

          {(user.role === "admin" || user.role === "engineer") && (
            <Link href="/projects/new">
              <Button
                size={isMobile ? "default" : "lg"}
                className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-apple-lg hover:shadow-xl transition-all w-full sm:w-auto"
              >
                <Plus className="h-5 w-5" />
                Nuevo Proyecto
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Cards - Clickeables para filtrar */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-4">
          <Link href="/projects?filter=all">
            <Card className="shadow-apple hover:shadow-apple-lg transition-all cursor-pointer hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </CardHeader>
              <CardContent className="pt-0">
                {statsLoading ? (
                  <Skeleton className="h-7 sm:h-8 w-16 sm:w-20" />
                ) : (
                  <div className="text-2xl sm:text-3xl font-bold">{stats?.total || 0}</div>
                )}
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">Click para ver todos</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/projects?filter=in_progress">
            <Card className="shadow-apple hover:shadow-apple-lg transition-all cursor-pointer hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  En Progreso
                </CardTitle>
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </CardHeader>
              <CardContent className="pt-0">
                {statsLoading ? (
                  <Skeleton className="h-7 sm:h-8 w-16 sm:w-20" />
                ) : (
                  <div className="text-2xl sm:text-3xl font-bold text-blue-500">
                    {stats?.active || 0}
                  </div>
                )}
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">Click para ver detalles</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/projects?filter=completed">
            <Card className="shadow-apple hover:shadow-apple-lg transition-all cursor-pointer hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Completados
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </CardHeader>
              <CardContent className="pt-0">
                {statsLoading ? (
                  <Skeleton className="h-7 sm:h-8 w-16 sm:w-20" />
                ) : (
                  <div className="text-2xl sm:text-3xl font-bold text-green-500">
                    {stats?.completed || 0}
                  </div>
                )}
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">Click para ver detalles</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/projects?filter=overdue">
            <Card className="shadow-apple hover:shadow-apple-lg transition-all cursor-pointer hover:scale-[1.02] border-destructive/20">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Con Retraso
                </CardTitle>
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </CardHeader>
              <CardContent className="pt-0">
                {statsLoading ? (
                  <Skeleton className="h-7 sm:h-8 w-16 sm:w-20" />
                ) : (
                  <div className="text-2xl sm:text-3xl font-bold text-destructive">
                    {stats?.overdue || 0}
                  </div>
                )}
                <p className="text-[10px] sm:text-xs text-destructive/70 mt-1 hidden sm:block">Click para ver urgentes</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recordatorios Pendientes */}
        {reminders && reminders.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recordatorios Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reminders.slice(0, 3).map(reminder => (
                  <div
                    key={reminder.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-background"
                  >
                    <Calendar className="h-4 w-4 text-primary mt-1" />
                    <div className="flex-1">
                      <p className="font-medium">{reminder.title}</p>
                      {reminder.message && (
                        <p className="text-sm text-muted-foreground">
                          {reminder.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {tzFormatRelative(reminder.reminderDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Proyectos Recientes */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl">Proyectos Recientes</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {user.role === "admin"
                  ? "Todos los proyectos del sistema"
                  : "Tus proyectos asignados"}
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {(user.role === "admin" || user.role === "engineer") && !isMobile && (
                <Link href="/projects/new">
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                    <Plus className="h-4 w-4" />
                    Nuevo Proyecto
                  </Button>
                </Link>
              )}
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="gap-1">
                  Ver Todos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              isMobile ? (
                // Vista móvil: Cards
                <div className="space-y-4">
                  {projects.slice(0, 10).map(project => (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-solar flex items-center justify-center flex-shrink-0">
                            <Sun className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">
                              {project.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              ID: {project.id}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Cliente:</span>
                            <span className="text-sm font-medium">
                              {project.clientName || "-"}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Estado:</span>
                            <div className="flex flex-col gap-1 items-end">
                              {getStatusBadge(project.status)}
                              {isOverdue(project.estimatedEndDate, project.status) && (
                                <Badge variant="destructive" className="gap-1 text-xs">
                                  <AlertTriangle className="h-3 w-3" />
                                  Retrasado
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Progreso:</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-solar transition-all"
                                  style={{ width: `${project.progressPercentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {project.progressPercentage}%
                              </span>
                            </div>
                          </div>
                          
                          {project.location && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Ubicación:</span>
                              <span className="text-sm truncate max-w-[60%]">
                                {project.location}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <Button size="sm" className="w-full mt-3" variant="outline">
                          Ver Detalles
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                // Vista desktop: Tabla con scroll horizontal
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Proyecto</th>
                      <th className="text-left p-3 font-medium">Cliente</th>
                      <th className="text-left p-3 font-medium">Estado</th>
                      <th className="text-left p-3 font-medium">Progreso</th>
                      <th className="text-left p-3 font-medium">Ubicación</th>
                      <th className="text-right p-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.slice(0, 10).map(project => (
                      <tr
                        key={project.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-solar flex items-center justify-center flex-shrink-0">
                              <Sun className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">
                                {project.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {project.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate">
                              {project.clientName || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(project.status)}
                            {isOverdue(
                              project.estimatedEndDate,
                              project.status
                            ) && (
                              <Badge
                                variant="destructive"
                                className="gap-1 w-fit"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                Retrasado
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[80px]">
                              <div
                                className="h-full bg-gradient-solar transition-all"
                                style={{
                                  width: `${project.progressPercentage}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium min-w-[3ch] text-right">
                              {project.progressPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm truncate max-w-[200px] block">
                            {project.location || "-"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Link href={`/projects/${project.id}`}>
                            <Button size="sm" variant="ghost">
                              Ver Detalles
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )
            ) : (
              <div className="text-center py-12">
                <Sun className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No hay proyectos disponibles
                </p>
                {user.role === "admin" && (
                  <Link href="/projects/new">
                    <Button className="mt-4">Crear Primer Proyecto</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
