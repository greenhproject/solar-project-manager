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
  CheckCircle2,
  ArrowLeft,
  Clock,
  Loader2,
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
  const [location, setLocation] = useLocation();

  // Leer filtro desde URL al cargar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    if (filter) {
      setStatusFilter(filter);
    }
  }, []);

  // Actualizar URL cuando cambia el filtro
  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    if (value === "all") {
      setLocation("/projects");
    } else {
      setLocation(`/projects?filter=${value}`);
    }
  };

  if (meQuery.isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
          <p className="text-gray-600">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planning: {
        label: "Planificación",
        variant: "secondary" as const,
        color: "bg-blue-500",
      },
      in_progress: {
        label: "En Progreso",
        variant: "default" as const,
        color: "bg-green-500",
      },
      on_hold: {
        label: "En Espera",
        variant: "outline" as const,
        color: "bg-yellow-500",
      },
      completed: {
        label: "Completado",
        variant: "default" as const,
        color: "bg-emerald-500",
      },
      cancelled: {
        label: "Cancelado",
        variant: "destructive" as const,
        color: "bg-red-500",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.planning;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isOverdue = (project: { estimatedEndDate: Date; status: string; hasOverdueMilestones?: boolean }) => {
    return (
      project.status !== "completed" &&
      project.status !== "cancelled" &&
      (new Date(project.estimatedEndDate) < new Date() || project.hasOverdueMilestones === true)
    );
  };

  // Calcular días de retraso
  const getDaysOverdue = (estimatedEndDate: Date) => {
    const today = new Date();
    const endDate = new Date(estimatedEndDate);
    return differenceInDays(today, endDate);
  };

  // Obtener título según el filtro
  const getFilterTitle = () => {
    switch (statusFilter) {
      case "overdue":
        return "Proyectos Con Retraso";
      case "in_progress":
        return "Proyectos En Progreso";
      case "completed":
        return "Proyectos Completados";
      case "planning":
        return "Proyectos En Planificación";
      case "on_hold":
        return "Proyectos En Espera";
      case "cancelled":
        return "Proyectos Cancelados";
      default:
        return "Todos los Proyectos";
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

      // Filtro especial para "overdue" (con retraso)
      if (statusFilter === "overdue") {
        return matchesSearch && isOverdue(project);
      }

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Ordenar por días de retraso (del más retrasado al menos) si es filtro overdue
    if (statusFilter === "overdue") {
      filtered.sort((a, b) => {
        const daysA = getDaysOverdue(a.estimatedEndDate);
        const daysB = getDaysOverdue(b.estimatedEndDate);
        return daysB - daysA; // Mayor retraso primero
      });
    }

    return filtered;
  }, [projects, searchTerm, statusFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold">{getFilterTitle()}</h1>
            </div>
            <p className="text-muted-foreground ml-11">
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

          <div className="flex gap-2">
            {(user.role === "admin" || user.role === "engineer") && (
              <Link href="/projects/new">
                <Button className="gap-2">
                  <Plus className="h-5 w-5" />
                  Nuevo Proyecto
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, ubicación o cliente..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="overdue">
                    <span className="flex items-center gap-2">
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
            </div>
          </CardContent>
        </Card>

        {/* Lista de Proyectos */}
        {isLoading ? (
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map(project => {
              const projectIsOverdue = isOverdue(project);
              const daysOverdue = projectIsOverdue 
                ? getDaysOverdue(project.estimatedEndDate) 
                : 0;
              
              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className={`h-full hover:shadow-apple-lg transition-all cursor-pointer group ${
                    statusFilter === "overdue" ? "border-destructive/30" : ""
                  }`}>
                    <CardHeader className="p-3 sm:p-6">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-lg bg-gradient-solar flex items-center justify-center flex-shrink-0">
                          <Sun className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {getStatusBadge(project.status)}
                          {daysOverdue > 0 && (
                            <Badge
                              variant="destructive"
                              className="gap-1 text-xs"
                            >
                              <Clock className="h-3 w-3" />
                              {daysOverdue} días de retraso
                            </Badge>
                          )}
                        </div>
                      </div>

                      <CardTitle className="group-hover:text-primary transition-colors text-sm sm:text-base lg:text-lg break-words">
                        {project.name}
                      </CardTitle>

                      {project.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1 sm:mt-2">
                          {project.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                      {/* Información del proyecto */}
                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                        {project.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{project.location}</span>
                          </div>
                        )}

                        {project.clientName && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span className="truncate">{project.clientName}</span>
                          </div>
                        )}
                      </div>

                      {/* Barra de progreso */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <div className="flex items-center justify-between text-xs mb-2">
                                <span className="text-muted-foreground">
                                  Progreso
                                </span>
                                <span className="font-semibold">
                                  {project.progressPercentage}%
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-solar transition-all duration-500 ease-out"
                                  style={{
                                    width: `${project.progressPercentage}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-semibold text-sm">
                                Estado del Proyecto
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                <span>
                                  Progreso: {project.progressPercentage}%
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Haz clic en el proyecto para ver el desglose
                                completo de hitos
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Fechas */}
                      <div className="text-[10px] sm:text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex justify-between">
                          <span>Inicio:</span>
                          <span>
                            {tzFormatDate(project.startDate)}
                          </span>
                        </div>
                        <div className={`flex justify-between mt-1 ${daysOverdue > 0 ? "text-destructive font-medium" : ""}`}>
                          <span>Estimado:</span>
                          <span>
                            {tzFormatDate(project.estimatedEndDate)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <Sun className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                No se encontraron proyectos
              </h3>
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
              {user.role === "admin" &&
                !searchTerm &&
                statusFilter === "all" && (
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
