import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Timer,
  X,
  Filter,
  LayoutGrid,
  List,
  CalendarDays,
  Sun,
} from "lucide-react";
import { Link } from "wouter";
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getWeek } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";

const locales = { es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

// Paleta de colores profesional y armónica
const PROJECT_PALETTE = [
  { bg: "#FF6B35", light: "rgba(255,107,53,0.12)", text: "#fff" },
  { bg: "#0EA5E9", light: "rgba(14,165,233,0.12)", text: "#fff" },
  { bg: "#8B5CF6", light: "rgba(139,92,246,0.12)", text: "#fff" },
  { bg: "#10B981", light: "rgba(16,185,129,0.12)", text: "#fff" },
  { bg: "#F59E0B", light: "rgba(245,158,11,0.12)", text: "#fff" },
  { bg: "#EC4899", light: "rgba(236,72,153,0.12)", text: "#fff" },
  { bg: "#06B6D4", light: "rgba(6,182,212,0.12)", text: "#fff" },
  { bg: "#EF4444", light: "rgba(239,68,68,0.12)", text: "#fff" },
  { bg: "#84CC16", light: "rgba(132,204,22,0.12)", text: "#fff" },
  { bg: "#A855F7", light: "rgba(168,85,247,0.12)", text: "#fff" },
];

type ViewType = "month" | "week" | "day" | "agenda";

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    projectId: number;
    projectName: string;
    milestoneName: string;
    status: string;
    color: string;
    lightColor: string;
    assignedUser?: string;
  };
}

export default function CalendarPage() {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const user = meQuery.data ?? null;
  const { data: projects, isLoading: loadingProjects } = trpc.projects.list.useQuery();
  const { data: allMilestones, isLoading: loadingMilestones } = trpc.milestones.getAll.useQuery();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<ViewType>("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Cerrar filtros al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Mapa de colores por proyecto
  const projectColorMap = useMemo(() => {
    if (!projects) return {};
    const map: Record<number, { bg: string; light: string; text: string }> = {};
    projects.forEach((p, i) => {
      map[p.id] = PROJECT_PALETTE[i % PROJECT_PALETTE.length];
    });
    return map;
  }, [projects]);

  // Filtrar y convertir hitos a eventos
  const events: CalendarEvent[] = useMemo(() => {
    if (!allMilestones || !projects) return [];
    return allMilestones
      .filter(m => selectedProjectIds.size === 0 || selectedProjectIds.has(m.projectId))
      .map(milestone => {
        const project = projects.find(p => p.id === milestone.projectId);
        const colors = projectColorMap[milestone.projectId] || PROJECT_PALETTE[0];
        return {
          id: milestone.id,
          title: milestone.name,
          start: new Date(milestone.dueDate),
          end: new Date(milestone.dueDate),
          resource: {
            projectId: milestone.projectId,
            projectName: project?.name || "Proyecto",
            milestoneName: milestone.name,
            status: milestone.status,
            color: colors.bg,
            lightColor: colors.light,
          },
        };
      });
  }, [allMilestones, projects, projectColorMap, selectedProjectIds]);

  // Estadísticas
  const stats = useMemo(() => {
    const filtered = events;
    const completed = filtered.filter(e => e.resource.status === "completed").length;
    const pending = filtered.filter(e => e.resource.status !== "completed").length;
    const today = filtered.filter(e => isToday(e.start)).length;
    return { total: filtered.length, completed, pending, today };
  }, [events]);

  // Navegación
  const navigate = useCallback((direction: "prev" | "next" | "today") => {
    if (direction === "today") { setCurrentDate(new Date()); return; }
    const fn = direction === "next"
      ? currentView === "month" ? addMonths : currentView === "week" ? addWeeks : addDays
      : currentView === "month" ? subMonths : currentView === "week" ? subWeeks : subDays;
    setCurrentDate(d => fn(d, 1));
  }, [currentView]);

  // Estilo de eventos
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const isCompleted = event.resource.status === "completed";
    return {
      style: {
        backgroundColor: isCompleted ? "rgba(120,120,120,0.15)" : event.resource.lightColor,
        color: isCompleted ? "var(--muted-foreground)" : event.resource.color,
        border: `1px solid ${isCompleted ? "rgba(120,120,120,0.3)" : event.resource.color}`,
        borderLeft: `3px solid ${isCompleted ? "rgba(120,120,120,0.5)" : event.resource.color}`,
        borderRadius: "6px",
        fontSize: "11px",
        padding: "1px 6px",
        textDecoration: isCompleted ? "line-through" : "none",
        opacity: isCompleted ? 0.6 : 1,
        fontWeight: 500,
        lineHeight: "1.4",
      },
    };
  }, []);

  // Toggle filtro de proyecto
  const toggleProject = (id: number) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => setSelectedProjectIds(new Set());

  // Título del período
  const periodTitle = useMemo(() => {
    if (currentView === "month") return format(currentDate, "MMMM yyyy", { locale: es });
    if (currentView === "week") {
      const weekNum = getWeek(currentDate, { weekStartsOn: 1 });
      return `Semana ${weekNum} — ${format(currentDate, "MMMM yyyy", { locale: es })}`;
    }
    if (currentView === "day") return format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es });
    return format(currentDate, "MMMM yyyy", { locale: es });
  }, [currentDate, currentView]);

  // Loading
  if (meQuery.isLoading || !user || loadingProjects || loadingMilestones) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-[3px] border-orange-500/20 mx-auto" />
            <div className="absolute inset-0 h-14 w-14 rounded-full border-[3px] border-orange-500 border-t-transparent animate-spin mx-auto" />
          </div>
          <p className="text-muted-foreground text-sm">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  const viewButtons: { key: ViewType; icon: React.ReactNode; label: string }[] = [
    { key: "month", icon: <LayoutGrid className="h-3.5 w-3.5" />, label: "Mes" },
    { key: "week", icon: <CalendarDays className="h-3.5 w-3.5" />, label: "Semana" },
    { key: "day", icon: <Sun className="h-3.5 w-3.5" />, label: "Día" },
    { key: "agenda", icon: <List className="h-3.5 w-3.5" />, label: "Agenda" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 space-y-4">

        {/* === HEADER === */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Calendario
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Hitos y actividades de proyectos
              </p>
            </div>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-medium">
              <CalendarIcon className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-foreground">{stats.total}</span>
              <span className="text-muted-foreground hidden sm:inline">hitos</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">{stats.completed}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-xs font-medium">
              <Timer className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400">{stats.pending}</span>
            </div>
            {stats.today > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-xs font-medium animate-pulse">
                <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400">{stats.today} hoy</span>
              </div>
            )}
          </div>
        </div>

        {/* === TOOLBAR === */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
          {/* Navegación de fecha */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("today")} className="text-xs h-8 px-3">
              Hoy
            </Button>
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button onClick={() => navigate("prev")} className="p-1.5 hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => navigate("next")} className="p-1.5 hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-sm sm:text-base font-semibold capitalize text-foreground ml-1">
              {periodTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro de proyectos */}
            <div className="relative" ref={filterRef}>
              <Button
                variant={selectedProjectIds.size > 0 ? "default" : "outline"}
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-3.5 w-3.5" />
                Filtrar
                {selectedProjectIds.size > 0 && (
                  <span className="ml-1 bg-white/20 rounded-full px-1.5 text-[10px]">
                    {selectedProjectIds.size}
                  </span>
                )}
              </Button>

              {showFilters && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Filtrar por proyecto</span>
                    {selectedProjectIds.size > 0 && (
                      <button onClick={clearFilters} className="text-[10px] text-orange-500 hover:text-orange-600 font-medium">
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
                    {projects?.map(project => {
                      const colors = projectColorMap[project.id];
                      const isSelected = selectedProjectIds.has(project.id);
                      const count = allMilestones?.filter(m => m.projectId === project.id).length || 0;
                      return (
                        <button
                          key={project.id}
                          onClick={() => toggleProject(project.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                            isSelected ? "bg-muted" : "hover:bg-muted/50"
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0 transition-all"
                            style={{
                              backgroundColor: isSelected ? colors?.bg : "transparent",
                              border: `2px solid ${colors?.bg || "#999"}`,
                            }}
                          />
                          <span className="flex-1 truncate text-foreground font-medium">{project.name}</span>
                          <span className="text-muted-foreground text-[10px]">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Selector de vista */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              {viewButtons.map(v => (
                <button
                  key={v.key}
                  onClick={() => setCurrentView(v.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all ${
                    currentView === v.key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {v.icon}
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* === CALENDAR + SIDEBAR === */}
        <div className="flex gap-4">
          {/* Calendario principal */}
          <div className={`flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${selectedEvent ? "lg:mr-0" : ""}`}>
            <div className="calendar-pro" style={{ height: currentView === "month" ? "calc(100vh - 240px)" : currentView === "agenda" ? "calc(100vh - 240px)" : "calc(100vh - 240px)", minHeight: "500px" }}>
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                eventPropGetter={eventStyleGetter}
                view={currentView}
                date={currentDate}
                onNavigate={setCurrentDate}
                onView={(v) => setCurrentView(v as ViewType)}
                onSelectEvent={(event) => setSelectedEvent(event as CalendarEvent)}
                toolbar={false}
                min={new Date(2026, 0, 1, 8, 0)}
                max={new Date(2026, 0, 1, 17, 0)}
                popup
                selectable
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
                  noEventsInRange: "No hay hitos en este rango",
                  showMore: (total: number) => `+${total} más`,
                }}
                culture="es"
                formats={{
                  dayHeaderFormat: (date: Date) => format(date, "EEEE d", { locale: es }),
                  dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                    `${format(start, "d MMM", { locale: es })} — ${format(end, "d MMM yyyy", { locale: es })}`,
                  agendaDateFormat: (date: Date) => format(date, "EEE d MMM", { locale: es }),
                  agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                    `${format(start, "d MMM", { locale: es })} — ${format(end, "d MMM yyyy", { locale: es })}`,
                }}
              />
            </div>
          </div>

          {/* Panel lateral de detalle */}
          {selectedEvent && (
            <div className="hidden lg:block w-80 flex-shrink-0 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-card border border-border rounded-xl shadow-sm sticky top-4 overflow-hidden">
                {/* Header del panel */}
                <div className="p-4 border-b border-border" style={{ backgroundColor: selectedEvent.resource.lightColor }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedEvent.resource.color }} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: selectedEvent.resource.color }}>
                          {selectedEvent.resource.projectName}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground leading-tight">
                        {selectedEvent.resource.milestoneName}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Detalles */}
                <div className="p-4 space-y-4">
                  {/* Estado */}
                  <div className="flex items-center gap-3">
                    {selectedEvent.resource.status === "completed" ? (
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Completado</span>
                      </div>
                    ) : selectedEvent.resource.status === "in_progress" ? (
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Timer className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">En progreso</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Pendiente</span>
                      </div>
                    )}
                  </div>

                  {/* Fecha */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Fecha límite</p>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {format(selectedEvent.start, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>

                  {/* Proyecto */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Proyecto</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedEvent.resource.projectName}
                      </p>
                    </div>
                  </div>

                  {/* Botón ir al proyecto */}
                  <Link href={`/projects/${selectedEvent.resource.projectId}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs mt-2">
                      Ver proyecto completo
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel de detalle mobile (bottom sheet) */}
        {selectedEvent && (
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-card border-t border-border rounded-t-2xl shadow-2xl mx-2 mb-0">
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedEvent.resource.color }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: selectedEvent.resource.color }}>
                        {selectedEvent.resource.projectName}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{selectedEvent.resource.milestoneName}</h3>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {format(selectedEvent.start, "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                  </div>
                  <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  {selectedEvent.resource.status === "completed" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">Completado</Badge>
                  ) : selectedEvent.resource.status === "in_progress" ? (
                    <Badge className="bg-blue-500/10 text-blue-600 border-0 text-[10px]">En progreso</Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px]">Pendiente</Badge>
                  )}
                </div>
                <Link href={`/projects/${selectedEvent.resource.projectId}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Ver proyecto
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
