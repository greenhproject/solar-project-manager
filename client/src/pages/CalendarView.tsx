import { useState, useMemo, useCallback } from "react";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../calendar-custom.css";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

// Configurar moment en español
moment.locale("es", {
  months: "Enero_Febrero_Marzo_Abril_Mayo_Junio_Julio_Agosto_Septiembre_Octubre_Noviembre_Diciembre".split("_"),
  monthsShort: "Ene_Feb_Mar_Abr_May_Jun_Jul_Ago_Sep_Oct_Nov_Dic".split("_"),
  weekdays: "Domingo_Lunes_Martes_Miércoles_Jueves_Viernes_Sábado".split("_"),
  weekdaysShort: "Dom_Lun_Mar_Mié_Jue_Vie_Sáb".split("_"),
  weekdaysMin: "Do_Lu_Ma_Mi_Ju_Vi_Sá".split("_"),
});

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: "project" | "milestone";
    projectId: number;
    milestoneId?: number;
    status: string;
  };
}

export default function CalendarView() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: allMilestones, isLoading: milestonesLoading } = trpc.milestones.getAll.useQuery();

  // Convertir proyectos y hitos a eventos del calendario
  const events: CalendarEvent[] = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];

    // Agregar proyectos como eventos
    if (projects) {
      projects.forEach((project) => {
        // Filtrar por estado si es necesario
        if (statusFilter !== "all" && project.status !== statusFilter) {
          return;
        }

        calendarEvents.push({
          id: `project-${project.id}`,
          title: `📁 ${project.name}`,
          start: new Date(project.startDate),
          end: new Date(project.estimatedEndDate),
          resource: {
            type: "project",
            projectId: project.id,
            status: project.status,
          },
        });
      });
    }

    // Agregar hitos como eventos
    if (allMilestones) {
      allMilestones.forEach((milestone: any) => {
        // Filtrar por estado si es necesario
        if (statusFilter !== "all" && milestone.status !== statusFilter) {
          return;
        }

        const start = new Date(milestone.dueDate);
        const end = milestone.completedDate 
          ? new Date(milestone.completedDate)
          : new Date(milestone.dueDate);

        calendarEvents.push({
          id: `milestone-${milestone.id}`,
          title: `🎯 ${milestone.name}`,
          start: start,
          end: end,
          resource: {
            type: "milestone",
            projectId: milestone.projectId,
            milestoneId: milestone.id,
            status: milestone.status,
          },
        });
      });
    }

    return calendarEvents;
  }, [projects, allMilestones, statusFilter]);

  // Manejar clic en evento
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.resource.type === "project") {
      navigate(`/projects/${event.resource.projectId}`);
    } else if (event.resource.type === "milestone") {
      navigate(`/projects/${event.resource.projectId}`);
    }
  }, [navigate]);

  // Personalizar el estilo de los eventos según el tipo y estado
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { type, status } = event.resource;
    
    let backgroundColor = "#9CA3AF"; // Gris por defecto
    let borderColor = "#6B7280";

    if (type === "project") {
      backgroundColor = "#FF6B35"; // Naranja para proyectos
      borderColor = "#F7B32B";
    } else {
      // Colores según estado del hito
      switch (status) {
        case "completed":
          backgroundColor = "#10B981"; // Verde
          borderColor = "#059669";
          break;
        case "in_progress":
          backgroundColor = "#3B82F6"; // Azul
          borderColor = "#2563EB";
          break;
        case "overdue":
          backgroundColor = "#EF4444"; // Rojo
          borderColor = "#DC2626";
          break;
        default:
          backgroundColor = "#9CA3AF"; // Gris
          borderColor = "#6B7280";
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: "2px",
        borderStyle: "solid",
        borderRadius: "6px",
        color: "white",
        fontWeight: "500",
        fontSize: "13px",
        padding: "4px 8px",
        cursor: "pointer",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      },
    };
  }, []);

  // Navegar entre fechas
  const onNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const onView = useCallback((newView: View) => {
    setView(newView);
  }, []);

  // Botones de navegación personalizados
  const CustomToolbar = ({ label, onNavigate }: any) => {
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("PREV")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">
            {label}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("NEXT")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate("TODAY")}
          >
            Hoy
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={view === Views.MONTH ? "default" : "outline"}
            onClick={() => setView(Views.MONTH)}
          >
            Mes
          </Button>
          <Button
            variant={view === Views.WEEK ? "default" : "outline"}
            onClick={() => setView(Views.WEEK)}
          >
            Semana
          </Button>
          <Button
            variant={view === Views.DAY ? "default" : "outline"}
            onClick={() => setView(Views.DAY)}
          >
            Día
          </Button>
          <Button
            variant={view === Views.AGENDA ? "default" : "outline"}
            onClick={() => setView(Views.AGENDA)}
          >
            Agenda
          </Button>
        </div>
      </div>
    );
  };

  if (projectsLoading || milestonesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario de Proyectos</h1>
          <p className="text-muted-foreground mt-1">
            Vista temporal de proyectos y hitos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Filtrar por Estado</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="planning">Planificación</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="on_hold">En Espera</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-end">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              📁 {projects?.length || 0} Proyectos
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              🎯 {allMilestones?.length || 0} Hitos
            </Badge>
          </div>
        </div>
      </Card>

      {/* Calendario */}
      <Card className="p-6">
        {events.length > 0 ? (
          <div style={{ height: "700px" }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={onView}
              date={date}
              onNavigate={onNavigate}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              components={{
                toolbar: CustomToolbar,
              }}
              messages={{
                today: "Hoy",
                previous: "Anterior",
                next: "Siguiente",
                month: "Mes",
                week: "Semana",
                day: "Día",
                agenda: "Agenda",
                date: "Fecha",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "No hay eventos en este rango de fechas",
                showMore: (total: number) => `+ Ver más (${total})`,
              }}
              formats={{
                dayHeaderFormat: (date: Date) => moment(date).format("dddd D"),
                dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${moment(start).format("D MMM")} - ${moment(end).format("D MMM YYYY")}`,
                agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                  `${moment(start).format("D MMM")} - ${moment(end).format("D MMM YYYY")}`,
              }}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <CalendarDays className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay eventos en el calendario</h3>
            <p className="text-muted-foreground">
              Crea proyectos y agrega hitos para visualizarlos en el calendario
            </p>
          </div>
        )}
      </Card>

      {/* Leyenda */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Leyenda</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#FF6B35" }}></div>
            <span className="text-sm">Proyectos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#10B981" }}></div>
            <span className="text-sm">Completado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#3B82F6" }}></div>
            <span className="text-sm">En Progreso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#EF4444" }}></div>
            <span className="text-sm">Vencido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#9CA3AF" }}></div>
            <span className="text-sm">Pendiente</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
