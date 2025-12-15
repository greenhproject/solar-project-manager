import { useState, useMemo, useCallback } from "react";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../calendar-custom.css";
import { trpc } from "@/lib/trpc";
import { exportCalendarToExcel } from "@/lib/excelExport";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

// Configurar moment en español
moment.locale("es", {
  months:
    "Enero_Febrero_Marzo_Abril_Mayo_Junio_Julio_Agosto_Septiembre_Octubre_Noviembre_Diciembre".split(
      "_"
    ),
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
  allDay: boolean;
  resource: {
    type: "project" | "milestone";
    projectId: number;
    milestoneId?: number;
    status: string;
  };
}

// CustomToolbar movido fuera del componente principal para evitar problemas con hooks
function CustomToolbar({ 
  label, 
  onNavigate, 
  view, 
  onView 
}: any) {
  return (
    <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate("TODAY")}
        >
          Hoy
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate("PREV")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate("NEXT")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold ml-2">
          {label}
        </h2>
      </div>

      <div className="flex gap-1">
        <Button
          variant={view === Views.MONTH ? "default" : "outline"}
          size="sm"
          onClick={() => onView(Views.MONTH)}
        >
          Mes
        </Button>
        <Button
          variant={view === Views.WEEK ? "default" : "outline"}
          size="sm"
          onClick={() => onView(Views.WEEK)}
        >
          Semana
        </Button>
        <Button
          variant={view === Views.DAY ? "default" : "outline"}
          size="sm"
          onClick={() => onView(Views.DAY)}
        >
          Día
        </Button>
        <Button
          variant={view === Views.AGENDA ? "default" : "outline"}
          size="sm"
          onClick={() => onView(Views.AGENDA)}
        >
          Agenda
        </Button>
      </div>
    </div>
  );
}

export default function CalendarView() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [projectSearch, setProjectSearch] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: projects, isLoading: projectsLoading } =
    trpc.projects.list.useQuery();
  const { data: allMilestones, isLoading: milestonesLoading } =
    trpc.milestones.getAll.useQuery();

  // Filtrar proyectos por búsqueda
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!projectSearch) return projects;
    const search = projectSearch.toLowerCase();
    return projects.filter(p => 
      p.name.toLowerCase().includes(search) ||
      (p.openSolarId && p.openSolarId.toString().includes(search))
    );
  }, [projects, projectSearch]);

  // Convertir proyectos y hitos a eventos del calendario
  const events: CalendarEvent[] = useMemo(() => {
    const calendarEvents: CalendarEvent[] = [];

    // Agregar hitos como eventos (solo hitos, no proyectos completos)
    if (allMilestones) {
      allMilestones.forEach((milestone: any) => {
        // Filtrar por proyecto seleccionado
        if (projectFilter !== "all" && milestone.projectId.toString() !== projectFilter) {
          return;
        }
        // Filtrar por estado si es necesario
        if (statusFilter !== "all" && milestone.status !== statusFilter) {
          return;
        }

        // Crear fecha para evento de todo el día
        const dueDate = new Date(milestone.dueDate);
        // Normalizar a medianoche local
        const start = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const end = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

        // Buscar nombre del proyecto
        const project = projects?.find(p => p.id === milestone.projectId);
        const projectName = project?.name || `Proyecto ${milestone.projectId}`;

        calendarEvents.push({
          id: `milestone-${milestone.id}`,
          title: `${projectName}: ${milestone.name}`,
          start: start,
          end: end,
          allDay: true,
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
  }, [projects, allMilestones, statusFilter, projectFilter]);

  // Manejar clic en evento
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      navigate(`/projects/${event.resource.projectId}`);
    },
    [navigate]
  );

  // Personalizar el estilo de los eventos según el estado
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { status } = event.resource;

    let backgroundColor = "#9CA3AF"; // Gris por defecto
    let borderColor = "#6B7280";

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
        backgroundColor = "#FF6B35"; // Naranja para pendientes
        borderColor = "#F7B32B";
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: "2px",
        borderStyle: "solid",
        borderRadius: "4px",
        color: "white",
        fontWeight: "500",
        fontSize: "12px",
        padding: "2px 4px",
        cursor: "pointer",
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

  // Exportar a Excel
  const handleExport = useCallback(() => {
    if (events.length === 0) {
      toast.error("No hay eventos para exportar");
      return;
    }
    try {
      // Crear fechas de rango para el mes actual
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      exportCalendarToExcel(projects || [], allMilestones || [], startOfMonth, endOfMonth);
      toast.success("Calendario exportado exitosamente");
    } catch (error) {
      toast.error("Error al exportar el calendario");
    }
  }, [events, projects, allMilestones, date]);

  // Seleccionar proyecto del dropdown
  const handleSelectProject = (projectId: string, projectName: string) => {
    setProjectFilter(projectId);
    setProjectSearch(projectName);
    setShowDropdown(false);
  };

  // Limpiar filtro
  const handleClearFilter = () => {
    setProjectFilter("all");
    setProjectSearch("");
    setShowDropdown(false);
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
            Vista general de todos los hitos de proyectos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Filtro por Proyecto con búsqueda */}
          <div className="flex-1 min-w-[280px] relative">
            <label className="text-sm font-medium mb-2 block">
              Buscar Proyecto (nombre o ID OpenSolar)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o ID..."
                value={projectSearch}
                onChange={(e) => {
                  setProjectSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="pl-9 pr-9"
              />
              {projectSearch && (
                <button
                  onClick={handleClearFilter}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Lista de proyectos filtrados */}
            {showDropdown && projectSearch && filteredProjects.length > 0 && (
              <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto border rounded-md bg-background shadow-lg">
                <button
                  onClick={handleClearFilter}
                  className={`w-full text-left px-3 py-2 hover:bg-accent text-sm ${
                    projectFilter === "all" ? "bg-accent" : ""
                  }`}
                >
                  Todos los proyectos
                </button>
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProject(p.id.toString(), p.name)}
                    className={`w-full text-left px-3 py-2 hover:bg-accent text-sm border-t ${
                      projectFilter === p.id.toString() ? "bg-accent" : ""
                    }`}
                  >
                    <div className="font-medium truncate">{p.name}</div>
                    {p.openSolarId && (
                      <div className="text-xs text-muted-foreground">
                        ID OpenSolar: {p.openSolarId}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {/* Badge de proyecto filtrado */}
            {projectFilter !== "all" && (
              <div className="mt-2">
                <Badge variant="secondary" className="gap-1">
                  Filtrado: {projects?.find(p => p.id.toString() === projectFilter)?.name}
                  <button onClick={handleClearFilter}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}
          </div>

          {/* Filtro por Estado */}
          <div className="min-w-[180px]">
            <label className="text-sm font-medium mb-2 block">
              Filtrar por Estado
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón exportar */}
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
          <span>Total: {events.length} hitos</span>
          {projectFilter !== "all" && (
            <span>• Proyecto: {projects?.find(p => p.id.toString() === projectFilter)?.name}</span>
          )}
        </div>
      </Card>

      {/* Calendario */}
      <Card className="p-4">
        {events.length > 0 ? (
          <div style={{ height: "600px" }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              allDayAccessor={() => true}
              view={view}
              onView={onView}
              date={date}
              onNavigate={onNavigate}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              components={{
                toolbar: (props) => (
                  <CustomToolbar {...props} view={view} onView={onView} />
                ),
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
            <h3 className="text-lg font-semibold mb-2">
              No hay eventos en el calendario
            </h3>
            <p className="text-muted-foreground">
              {projectFilter !== "all" 
                ? "No hay hitos para el proyecto seleccionado"
                : "Crea proyectos y agrega hitos para visualizarlos en el calendario"
              }
            </p>
          </div>
        )}
      </Card>

      {/* Leyenda */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Leyenda</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#FF6B35" }} />
            <span className="text-sm">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#3B82F6" }} />
            <span className="text-sm">En Progreso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#10B981" }} />
            <span className="text-sm">Completado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#EF4444" }} />
            <span className="text-sm">Vencido</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
