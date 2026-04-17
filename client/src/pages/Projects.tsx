import { trpc } from "@/lib/trpc";
import { useTimezone } from "@/hooks/useTimezone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sun,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Users,
  MapPin,
  ArrowLeft,
  Clock,
  Loader2,
  LayoutGrid,
  List,
  Columns3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  TrendingUp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { differenceInDays } from "date-fns";

type SortOption = "created_desc" | "created_asc" | "start_date" | "updated" | "progress_desc" | "progress_asc" | "name_asc" | "name_desc" | "client" | "status";
type ViewMode = "cards" | "table" | "kanban";

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: "created_desc", label: "Más recientes", icon: <ArrowDown className="h-3 w-3" /> },
  { value: "created_asc", label: "Más antiguos", icon: <ArrowUp className="h-3 w-3" /> },
  { value: "updated", label: "Última actualización", icon: <Clock className="h-3 w-3" /> },
  { value: "start_date", label: "Fecha de inicio", icon: <Calendar className="h-3 w-3" /> },
  { value: "progress_desc", label: "Mayor progreso", icon: <TrendingUp className="h-3 w-3" /> },
  { value: "progress_asc", label: "Menor progreso", icon: <TrendingUp className="h-3 w-3" /> },
  { value: "name_asc", label: "Nombre A-Z", icon: <ArrowUp className="h-3 w-3" /> },
  { value: "name_desc", label: "Nombre Z-A", icon: <ArrowDown className="h-3 w-3" /> },
  { value: "client", label: "Cliente", icon: <Users className="h-3 w-3" /> },
  { value: "status", label: "Estado (agrupado)", icon: <Filter className="h-3 w-3" /> },
];

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "destructive"; color: string; dotColor: string }> = {
  planning: { label: "Planificación", variant: "secondary", color: "bg-blue-50 dark:bg-blue-900/200/10 text-blue-400 border-blue-500/20", dotColor: "bg-blue-50 dark:bg-blue-900/200" },
  in_progress: { label: "En Progreso", variant: "default", color: "bg-green-50 dark:bg-green-900/200/10 text-green-400 border-green-500/20", dotColor: "bg-green-50 dark:bg-green-900/200" },
  on_hold: { label: "En Espera", variant: "outline", color: "bg-yellow-50 dark:bg-yellow-900/200/10 text-yellow-400 border-yellow-500/20", dotColor: "bg-yellow-50 dark:bg-yellow-900/200" },
  completed: { label: "Completado", variant: "default", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dotColor: "bg-emerald-500" },
  cancelled: { label: "Cancelado", variant: "destructive", color: "bg-red-50 dark:bg-red-900/200/10 text-red-400 border-red-500/20", dotColor: "bg-red-50 dark:bg-red-900/200" },
};

const KANBAN_COLUMNS = [
  { key: "planning", label: "Planificación", color: "border-blue-500/40", headerBg: "bg-blue-50 dark:bg-blue-900/200/10" },
  { key: "in_progress", label: "En Progreso", color: "border-green-500/40", headerBg: "bg-green-50 dark:bg-green-900/200/10" },
  { key: "on_hold", label: "En Espera", color: "border-yellow-500/40", headerBg: "bg-yellow-50 dark:bg-yellow-900/200/10" },
  { key: "completed", label: "Completado", color: "border-emerald-500/40", headerBg: "bg-emerald-500/10" },
  { key: "cancelled", label: "Cancelado", color: "border-red-500/40", headerBg: "bg-red-50 dark:bg-red-900/200/10" },
];

export default function Projects() {
  const { formatDate: tzFormatDate } = useTimezone();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const user = meQuery.data ?? null;
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created_desc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [, setLocation] = useLocation();

  // Leer filtro desde URL al cargar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    if (filter) setStatusFilter(filter);
    const view = params.get("view") as ViewMode;
    if (view && ["cards", "table", "kanban"].includes(view)) setViewMode(view);
    const sort = params.get("sort") as SortOption;
    if (sort) setSortBy(sort);
  }, []);

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(window.location.search);
    if (value === "all") params.delete("filter");
    else params.set("filter", value);
    const qs = params.toString();
    setLocation(qs ? `/projects?${qs}` : "/projects");
  };

  if (meQuery.isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 dark:text-orange-400 mx-auto" />
          <p className="text-muted-foreground">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  const isOverdue = (project: { estimatedEndDate: Date; status: string; hasOverdueMilestones?: boolean }) => {
    return (
      project.status !== "completed" &&
      project.status !== "cancelled" &&
      (new Date(project.estimatedEndDate) < new Date() || project.hasOverdueMilestones === true)
    );
  };

  const getDaysOverdue = (estimatedEndDate: Date) => {
    return differenceInDays(new Date(), new Date(estimatedEndDate));
  };

  const getFilterTitle = () => {
    switch (statusFilter) {
      case "overdue": return "Proyectos Con Retraso";
      case "in_progress": return "Proyectos En Progreso";
      case "completed": return "Proyectos Completados";
      case "planning": return "Proyectos En Planificación";
      case "on_hold": return "Proyectos En Espera";
      case "cancelled": return "Proyectos Cancelados";
      default: return "Todos los Proyectos";
    }
  };

  // Filtrar y ordenar proyectos
  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    let filtered = projects.filter(project => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.clientName?.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === "overdue") {
        return matchesSearch && isOverdue(project);
      }

      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Ordenar
    if (statusFilter === "overdue") {
      filtered.sort((a, b) => getDaysOverdue(b.estimatedEndDate) - getDaysOverdue(a.estimatedEndDate));
    } else {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case "created_desc":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "created_asc":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "start_date":
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          case "updated":
            return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
          case "progress_desc":
            return (b.progressPercentage || 0) - (a.progressPercentage || 0);
          case "progress_asc":
            return (a.progressPercentage || 0) - (b.progressPercentage || 0);
          case "name_asc":
            return a.name.localeCompare(b.name, 'es');
          case "name_desc":
            return b.name.localeCompare(a.name, 'es');
          case "client":
            return (a.clientName || '').localeCompare(b.clientName || '', 'es');
          case "status": {
            const statusOrder: Record<string, number> = { planning: 0, in_progress: 1, on_hold: 2, completed: 3, cancelled: 4 };
            return (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
          }
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [projects, searchTerm, statusFilter, sortBy]);

  // Agrupar por estado para Kanban
  const kanbanGroups = useMemo(() => {
    const groups: Record<string, typeof filteredProjects> = {};
    KANBAN_COLUMNS.forEach(col => { groups[col.key] = []; });
    filteredProjects.forEach(p => {
      if (groups[p.status]) groups[p.status].push(p);
      else if (groups.planning) groups.planning.push(p);
    });
    return groups;
  }, [filteredProjects]);

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.planning;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        {config.label}
      </span>
    );
  };

  // ─── Card View ───
  const renderCardView = () => (
    <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredProjects.map(project => {
        const projectIsOverdue = isOverdue(project);
        const daysOverdue = projectIsOverdue ? getDaysOverdue(project.estimatedEndDate) : 0;

        return (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className={`h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group border-border/50 ${
              projectIsOverdue ? "border-destructive/30" : ""
            }`}>
              {/* Color bar top */}
              <div className={`h-1 rounded-t-lg ${STATUS_CONFIG[project.status]?.dotColor || 'bg-gray-400'}`} />
              
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="group-hover:text-primary transition-colors text-sm font-semibold break-words line-clamp-2">
                      {project.name}
                    </CardTitle>
                    {project.clientName && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                        <Users className="h-3 w-3 flex-shrink-0" />
                        {project.clientName}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    {getStatusBadge(project.status)}
                    {daysOverdue > 0 && (
                      <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0">
                        <Clock className="h-2.5 w-2.5" />
                        {daysOverdue}d
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                {project.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {project.location}
                  </p>
                )}

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-semibold tabular-nums">{project.progressPercentage}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.max(project.progressPercentage, 0)}%`,
                        background: project.progressPercentage >= 100
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : project.progressPercentage >= 50
                          ? 'linear-gradient(135deg, oklch(0.65 0.19 45), oklch(0.75 0.15 65))'
                          : 'linear-gradient(135deg, oklch(0.65 0.19 45), oklch(0.60 0.16 30))'
                      }}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/50">
                  <span>Inicio: {tzFormatDate(project.startDate)}</span>
                  <span>Fin: {tzFormatDate(project.estimatedEndDate)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );

  // ─── Table View ───
  const renderTableView = () => (
    <Card className="overflow-hidden border-border/50">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Proyecto</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Cliente</th>
              <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Ubicación</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Progreso</th>

              <th className="text-center p-3 font-medium text-muted-foreground hidden md:table-cell">Inicio</th>
              <th className="text-center p-3 font-medium text-muted-foreground hidden lg:table-cell">Fin Est.</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((project, idx) => {
              const projectIsOverdue = isOverdue(project);
              const daysOverdue = projectIsOverdue ? getDaysOverdue(project.estimatedEndDate) : 0;

              return (
                <tr
                  key={project.id}
                  className={`border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors ${
                    idx % 2 === 0 ? '' : 'bg-muted/5'
                  }`}
                  onClick={() => setLocation(`/projects/${project.id}`)}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[project.status]?.dotColor || 'bg-gray-400'}`} />
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[200px] lg:max-w-[300px]">{project.name}</p>
                        <p className="text-xs text-muted-foreground sm:hidden truncate">{project.clientName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="text-muted-foreground truncate block max-w-[150px]">{project.clientName || '—'}</span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="text-muted-foreground truncate block max-w-[150px]">{project.location || '—'}</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getStatusBadge(project.status)}
                      {daysOverdue > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">{daysOverdue}d</Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(project.progressPercentage, 0)}%`,
                            background: 'linear-gradient(135deg, oklch(0.65 0.19 45), oklch(0.75 0.15 65))'
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums w-8 text-right">{project.progressPercentage}%</span>
                    </div>
                  </td>

                  <td className="p-3 text-center hidden md:table-cell">
                    <span className="text-muted-foreground text-xs">{tzFormatDate(project.startDate)}</span>
                  </td>
                  <td className={`p-3 text-center hidden lg:table-cell text-xs ${daysOverdue > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {tzFormatDate(project.estimatedEndDate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );

  // ─── Kanban View ───
  const renderKanbanView = () => (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
      {KANBAN_COLUMNS.map(col => {
        const colProjects = kanbanGroups[col.key] || [];
        return (
          <div key={col.key} className={`flex-shrink-0 w-72 rounded-xl border ${col.color} bg-card/50`}>
            {/* Column header */}
            <div className={`p-3 rounded-t-xl ${col.headerBg} border-b ${col.color}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="outline" className="text-xs h-5 px-1.5">{colProjects.length}</Badge>
              </div>
            </div>
            {/* Column body */}
            <div className="p-2 space-y-2 max-h-[65vh] overflow-y-auto">
              {colProjects.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Sin proyectos
                </div>
              ) : (
                colProjects.map(project => {
                  const projectIsOverdue = isOverdue(project);
                  const daysOverdue = projectIsOverdue ? getDaysOverdue(project.estimatedEndDate) : 0;

                  return (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <Card className="p-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-border/40">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-semibold line-clamp-2 flex-1">{project.name}</h4>
                            {daysOverdue > 0 && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 flex-shrink-0">{daysOverdue}d</Badge>
                            )}
                          </div>
                          
                          {project.clientName && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                              <Users className="h-2.5 w-2.5" />
                              {project.clientName}
                            </p>
                          )}

                          {/* Mini progress */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(project.progressPercentage, 0)}%`,
                                  background: 'linear-gradient(135deg, oklch(0.65 0.19 45), oklch(0.75 0.15 65))'
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-medium tabular-nums">{project.progressPercentage}%</span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{tzFormatDate(project.startDate)}</span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold">{getFilterTitle()}</h1>
              {filteredProjects.length > 0 && (
                <Badge variant="outline" className="text-xs">{filteredProjects.length}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground ml-11">
              {statusFilter === "overdue" ? (
                <span className="text-destructive font-medium">
                  {filteredProjects.length} proyecto(s) requieren atención urgente
                </span>
              ) : user.role === "admin" ? (
                "Gestiona todos los proyectos del sistema"
              ) : (
                "Tus proyectos asignados"
              )}
            </p>
          </div>

          {(user.role === "admin" || user.role === "engineer") && (
            <Link href="/projects/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Proyecto
              </Button>
            </Link>
          )}
        </div>

        {/* Toolbar: Search + Filters + Sort + View */}
        <Card className="border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              {/* Row 1: Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, ubicación o cliente..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>

              {/* Row 2: Filters + Sort + View toggle */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status filter */}
                <Select value={statusFilter} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-auto min-w-[140px] h-8 text-xs">
                    <Filter className="h-3 w-3 mr-1.5" />
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="overdue">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        Con Retraso
                      </span>
                    </SelectItem>
                    <SelectItem value="planning">Planificación</SelectItem>
                    <SelectItem value="in_progress">En Progreso</SelectItem>
                    <SelectItem value="on_hold">En Espera</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-auto min-w-[160px] h-8 text-xs">
                    <ArrowUpDown className="h-3 w-3 mr-1.5" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-1.5">
                          {opt.icon}
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Spacer */}
                <div className="flex-1" />

                {/* View mode toggle */}
                <div className="flex items-center border rounded-lg overflow-hidden bg-muted/30">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setViewMode("cards")}
                          className={`p-1.5 transition-colors ${viewMode === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Tarjetas</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setViewMode("table")}
                          className={`p-1.5 transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          <List className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Tabla</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setViewMode("kanban")}
                          className={`p-1.5 transition-colors ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          <Columns3 className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Kanban</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-6 bg-muted rounded w-3/4 mb-2" /><div className="h-4 bg-muted rounded w-1/2" /></CardHeader>
                <CardContent><div className="h-20 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <>
            {viewMode === "cards" && renderCardView()}
            {viewMode === "table" && renderTableView()}
            {viewMode === "kanban" && renderKanbanView()}
          </>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <Sun className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No se encontraron proyectos</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "Aún no hay proyectos creados"}
              </p>
              {statusFilter !== "all" && (
                <Button variant="outline" onClick={() => handleFilterChange("all")}>
                  Ver todos los proyectos
                </Button>
              )}
              {user.role === "admin" && !searchTerm && statusFilter === "all" && (
                <Link href="/projects/new">
                  <Button>Crear Primer Proyecto</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
