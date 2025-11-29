import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
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
import { Sun, Plus, Search, Filter, AlertTriangle, Users, MapPin, CheckCircle2, Circle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "wouter";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function Projects() {
  const { user, isAuthenticated } = useAuth();
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planning: { label: "Planificación", variant: "secondary" as const, color: "bg-blue-500" },
      in_progress: { label: "En Progreso", variant: "default" as const, color: "bg-green-500" },
      on_hold: { label: "En Espera", variant: "outline" as const, color: "bg-yellow-500" },
      completed: { label: "Completado", variant: "default" as const, color: "bg-emerald-500" },
      cancelled: { label: "Cancelado", variant: "destructive" as const, color: "bg-red-500" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planning;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isOverdue = (estimatedEndDate: Date, status: string) => {
    return status !== 'completed' && status !== 'cancelled' && new Date(estimatedEndDate) < new Date();
  };

  // Filtrar proyectos
  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Proyectos</h1>
            <p className="text-muted-foreground mt-2">
              {user.role === 'admin' 
                ? 'Gestiona todos los proyectos del sistema' 
                : 'Tus proyectos asignados'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="outline">Volver al Dashboard</Button>
            </Link>
            {user.role === 'admin' && (
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full hover:shadow-apple-lg transition-all cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="h-12 w-12 rounded-lg bg-gradient-solar flex items-center justify-center flex-shrink-0">
                        <Sun className="h-6 w-6 text-white" />
                      </div>
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
                    
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {project.description}
                      </p>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Información del proyecto */}
                    <div className="space-y-2 text-sm">
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
                              <span className="text-muted-foreground">Progreso</span>
                              <span className="font-semibold">{project.progressPercentage}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-solar transition-all duration-500 ease-out"
                                style={{ width: `${project.progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-semibold text-sm">Estado del Proyecto</p>
                            <div className="flex items-center gap-2 text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              <span>Progreso: {project.progressPercentage}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Haz clic en el proyecto para ver el desglose completo de hitos
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* Fechas */}
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <div className="flex justify-between">
                        <span>Inicio:</span>
                        <span>{new Date(project.startDate).toLocaleDateString('es')}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Estimado:</span>
                        <span>{new Date(project.estimatedEndDate).toLocaleDateString('es')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
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
              {user.role === 'admin' && !searchTerm && statusFilter === "all" && (
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
