import { useUnifiedAuth } from "@/_core/hooks/useUnifiedAuth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useMemo } from "react";

const locales = {
  es: es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Colores para diferentes proyectos
const projectColors = [
  "#FF6B35", // Naranja solar
  "#4ECDC4", // Turquesa
  "#95E1D3", // Verde menta
  "#F38181", // Rosa coral
  "#AA96DA", // Púrpura
  "#FCBAD3", // Rosa claro
  "#A8D8EA", // Azul cielo
  "#FFCF56", // Amarillo dorado
];

export default function CalendarPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useUnifiedAuth();
  const { data: projects, isLoading: loadingProjects } =
    trpc.projects.list.useQuery();
  const { data: allMilestones, isLoading: loadingMilestones } =
    trpc.milestones.getAll.useQuery();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Crear mapa de colores por proyecto
  const projectColorMap = useMemo(() => {
    if (!projects) return {};
    const map: Record<number, string> = {};
    projects.forEach((project, index) => {
      map[project.id] = projectColors[index % projectColors.length];
    });
    return map;
  }, [projects]);

  // Convertir hitos a eventos de calendario
  const events = useMemo(() => {
    if (!allMilestones || !projects) return [];

    return allMilestones.map(milestone => {
      const project = projects.find(p => p.id === milestone.projectId);
      return {
        id: milestone.id,
        title: `${project?.name || "Proyecto"}: ${milestone.name}`,
        start: new Date(milestone.dueDate),
        end: new Date(milestone.dueDate),
        resource: {
          projectId: milestone.projectId,
          projectName: project?.name,
          status: milestone.status,
          color: projectColorMap[milestone.projectId] || projectColors[0],
        },
      };
    });
  }, [allMilestones, projects, projectColorMap]);

  // Estilo personalizado para eventos
  const eventStyleGetter = (event: any) => {
    const style = {
      backgroundColor: event.resource.color,
      borderRadius: "4px",
      opacity: event.resource.status === "completed" ? 0.6 : 1,
      color: "white",
      border: "0px",
      display: "block",
      fontSize: "12px",
      padding: "2px 4px",
    };
    return { style };
  };

  if (loadingProjects || loadingMilestones) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin">
          <CalendarIcon className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-solar bg-clip-text text-transparent">
                Calendario de Hitos
              </h1>
              <p className="text-muted-foreground mt-1">
                Vista general de todos los hitos de proyectos
              </p>
            </div>
          </div>
        </div>

        {/* Leyenda de proyectos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Proyectos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {projects?.map(project => (
                <Badge
                  key={project.id}
                  style={{
                    backgroundColor: projectColorMap[project.id],
                    color: "white",
                  }}
                >
                  {project.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendario */}
        <Card>
          <CardContent className="p-6">
            <div style={{ height: "600px" }}>
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                eventPropGetter={eventStyleGetter}
                messages={{
                  next: "Siguiente",
                  previous: "Anterior",
                  today: "Hoy",
                  month: "Mes",
                  week: "Semana",
                  day: "Día",
                  agenda: "Agenda",
                  date: "Fecha",
                  time: "Hora",
                  event: "Evento",
                  noEventsInRange: "No hay hitos en este rango de fechas",
                  showMore: (total: number) => `+ Ver más (${total})`,
                }}
                culture="es"
              />
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Hitos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {allMilestones?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hitos Completados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {allMilestones?.filter(m => m.status === "completed").length ||
                  0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hitos Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">
                {allMilestones?.filter(m => m.status !== "completed").length ||
                  0}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
