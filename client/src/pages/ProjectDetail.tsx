import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sun, 
  ArrowLeft, 
  MapPin, 
  Users, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  FileText,
  RefreshCw,
  Edit,
  Loader2
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

export default function ProjectDetail() {
  const { user, isAuthenticated } = useAuth();
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id ? parseInt(params.id) : 0;

  const { data: project, isLoading, refetch } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: milestones, refetch: refetchMilestones } = trpc.milestones.getByProject.useQuery({ projectId });
  const { data: updates } = trpc.projectUpdates.getByProject.useQuery({ projectId });
  const { data: syncLogs } = trpc.sync.logs.useQuery({ projectId });

  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    name: "",
    description: "",
    dueDate: "",
  });

  const createMilestone = trpc.milestones.create.useMutation();
  const updateMilestone = trpc.milestones.update.useMutation();
  const updateProject = trpc.projects.update.useMutation();
  const generatePDF = trpc.reports.generateProjectPDF.useMutation();
  const syncProject = trpc.sync.syncProject.useMutation();

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin">
          <Sun className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Proyecto no encontrado</CardTitle>
          </CardHeader>
        </Card>
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
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planning;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMilestoneStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendiente", variant: "secondary" as const, icon: Clock },
      in_progress: { label: "En Progreso", variant: "default" as const, icon: RefreshCw },
      completed: { label: "Completado", variant: "default" as const, icon: CheckCircle2 },
      overdue: { label: "Vencido", variant: "destructive" as const, icon: AlertTriangle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const isOverdue = (estimatedEndDate: Date, status: string) => {
    return status !== 'completed' && status !== 'cancelled' && new Date(estimatedEndDate) < new Date();
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.name || !newMilestone.dueDate) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    try {
      const existingMilestones = milestones || [];
      await createMilestone.mutateAsync({
        projectId,
        name: newMilestone.name,
        description: newMilestone.description || undefined,
        dueDate: new Date(newMilestone.dueDate),
        orderIndex: existingMilestones.length + 1,
        weight: 1,
      });

      toast.success("Hito creado exitosamente");
      setNewMilestone({ name: "", description: "", dueDate: "" });
      setIsAddingMilestone(false);
      refetchMilestones();
    } catch (error: any) {
      toast.error(error.message || "Error al crear el hito");
    }
  };

  const handleToggleMilestoneStatus = async (milestoneId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const completedDate = newStatus === 'completed' ? new Date() : undefined;

    try {
      await updateMilestone.mutateAsync({
        id: milestoneId,
        status: newStatus,
        completedDate,
      });

      toast.success(`Hito marcado como ${newStatus === 'completed' ? 'completado' : 'pendiente'}`);
      refetchMilestones();
      refetch(); // Actualizar progreso del proyecto
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar el hito");
    }
  };

  const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0;
  const totalMilestones = milestones?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Link href="/projects">
              <Button variant="ghost" className="gap-2 mb-2">
                <ArrowLeft className="h-4 w-4" />
                Volver a Proyectos
              </Button>
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-gradient-solar flex items-center justify-center">
                <Sun className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(project.status)}
                  {isOverdue(project.estimatedEndDate, project.status) && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Retrasado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={async () => {
                try {
                  toast.info("Generando reporte PDF...");
                  const result = await generatePDF.mutateAsync({ projectId });
                  
                  // Convertir base64 a blob y descargar
                  const byteCharacters = atob(result.pdfBase64);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: 'application/pdf' });
                  
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = result.fileName;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  
                  toast.success("Reporte PDF generado exitosamente");
                } catch (error: any) {
                  toast.error(error.message || "Error al generar el reporte");
                }
              }}
              disabled={generatePDF.isPending}
            >
              {generatePDF.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Generar Reporte
            </Button>
            {user.role === 'admin' && (
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Información General */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Progreso General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{project.progressPercentage}%</div>
              <Progress value={project.progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {completedMilestones} de {totalMilestones} hitos completados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Cronograma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inicio:</span>
                <span className="font-medium">{format(new Date(project.startDate), 'dd MMM yyyy', { locale: es })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimado:</span>
                <span className="font-medium">{format(new Date(project.estimatedEndDate), 'dd MMM yyyy', { locale: es })}</span>
              </div>
              {project.actualEndDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Finalizado:</span>
                  <span className="font-medium">{format(new Date(project.actualEndDate), 'dd MMM yyyy', { locale: es })}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {project.clientName && (
                <div className="font-medium">{project.clientName}</div>
              )}
              {project.clientEmail && (
                <div className="text-muted-foreground">{project.clientEmail}</div>
              )}
              {project.clientPhone && (
                <div className="text-muted-foreground">{project.clientPhone}</div>
              )}
              {project.location && (
                <div className="flex items-center gap-1 text-muted-foreground mt-2">
                  <MapPin className="h-3 w-3" />
                  {project.location}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="milestones" className="space-y-6">
          <TabsList>
            <TabsTrigger value="milestones">Hitos</TabsTrigger>
            <TabsTrigger value="updates">Actualizaciones</TabsTrigger>
            <TabsTrigger value="sync">Sincronización</TabsTrigger>
          </TabsList>

          {/* Hitos */}
          <TabsContent value="milestones" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Hitos del Proyecto</h2>
              <Dialog open={isAddingMilestone} onOpenChange={setIsAddingMilestone}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Hito
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo Hito</DialogTitle>
                    <DialogDescription>
                      Agrega un nuevo hito al proyecto
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="milestoneName">Nombre *</Label>
                      <Input
                        id="milestoneName"
                        value={newMilestone.name}
                        onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                        placeholder="Ej: Instalación de paneles"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="milestoneDescription">Descripción</Label>
                      <Textarea
                        id="milestoneDescription"
                        value={newMilestone.description}
                        onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                        placeholder="Detalles del hito..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="milestoneDueDate">Fecha de Vencimiento *</Label>
                      <Input
                        id="milestoneDueDate"
                        type="date"
                        value={newMilestone.dueDate}
                        onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsAddingMilestone(false)} className="flex-1">
                        Cancelar
                      </Button>
                      <Button onClick={handleAddMilestone} className="flex-1">
                        Crear Hito
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {milestones && milestones.length > 0 ? (
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <Card key={milestone.id} className="hover:shadow-apple transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => handleToggleMilestoneStatus(milestone.id, milestone.status)}
                          className="mt-1 flex-shrink-0"
                        >
                          {milestone.status === 'completed' ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <div className="h-6 w-6 rounded-full border-2 border-muted-foreground hover:border-primary transition-colors" />
                          )}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className={`font-semibold ${milestone.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {milestone.name}
                            </h3>
                            {getMilestoneStatusBadge(milestone.status)}
                          </div>
                          
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Vence: {format(new Date(milestone.dueDate), 'dd MMM yyyy', { locale: es })}
                            </span>
                            {milestone.completedDate && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Completado: {format(new Date(milestone.completedDate), 'dd MMM yyyy', { locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay hitos definidos para este proyecto</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Actualizaciones */}
          <TabsContent value="updates" className="space-y-4">
            <h2 className="text-2xl font-bold">Historial de Actualizaciones</h2>
            {updates && updates.length > 0 ? (
              <div className="space-y-3">
                {updates.map((update) => (
                  <Card key={update.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{update.title}</h4>
                          {update.description && (
                            <p className="text-sm text-muted-foreground mt-1">{update.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay actualizaciones registradas</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sincronización */}
          <TabsContent value="sync" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Sincronización con OpenSolar</h2>
              {user.role === 'admin' && project.openSolarId && (
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={async () => {
                    try {
                      toast.info("Sincronizando con OpenSolar...");
                      await syncProject.mutateAsync({ projectId });
                      toast.success("Proyecto sincronizado exitosamente");
                      refetch();
                    } catch (error: any) {
                      toast.error(error.message || "Error al sincronizar");
                    }
                  }}
                  disabled={syncProject.isPending}
                >
                  {syncProject.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizar Ahora
                </Button>
              )}
            </div>
            
            {project.openSolarId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">ID de OpenSolar</CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{project.openSolarId}</code>
                </CardContent>
              </Card>
            )}

            {syncLogs && syncLogs.length > 0 ? (
              <div className="space-y-3">
                {syncLogs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                              {log.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{log.syncType}</span>
                          </div>
                          {log.message && (
                            <p className="text-sm mt-1">{log.message}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.syncedAt), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay logs de sincronización</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
