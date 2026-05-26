
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Trash2,
  Loader2,
  Edit,
  ExternalLink,
  MessageSquare,
  Send,
  User as UserIcon,
  Mail,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { useTimezone, fromDateInputValue } from "@/hooks/useTimezone";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import LegalizationChecklist from "@/components/LegalizationChecklist";
import { SortableList } from "@/components/SortableList";

// Componente: Botón para invitar al cliente al portal
function InviteClientButton({ projectId, clientEmail, clientName }: { projectId: number; clientEmail: string; clientName?: string | null }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const sendInvitation = trpc.projects.sendClientInvitation.useMutation({
    onSuccess: (data) => {
      toast.success(`Invitación enviada exitosamente a ${data.sentTo}`);
      setIsConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar la invitación");
    },
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3 gap-2 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        onClick={() => setIsConfirmOpen(true)}
      >
        <Mail className="h-3.5 w-3.5" />
        Invitar al Portal
      </Button>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              Invitar Cliente al Portal
            </DialogTitle>
            <DialogDescription>
              Se enviará un email de invitación con instrucciones de acceso al portal de clientes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                {clientName && <p className="text-sm font-medium truncate">{clientName}</p>}
                <p className="text-sm text-muted-foreground truncate">{clientEmail}</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>El email incluirá:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Enlace directo al portal de clientes</li>
                <li>Instrucciones de registro con su email</li>
                <li>Información del proyecto asignado</li>
                <li>Guía de funcionalidades disponibles</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button
              onClick={() => sendInvitation.mutate({ projectId })}
              disabled={sendInvitation.isPending}
              className="w-full sm:w-auto gap-2 bg-orange-500 hover:bg-orange-600"
            >
              {sendInvitation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-4 w-4" /> Enviar Invitación</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper para descargar PDF desde base64
function downloadPdfFromBase64(pdfBase64: string, fileName: string) {
  const byteCharacters = atob(pdfBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export default function ProjectDetail() {
  const { formatDate: tzFormatDate, toDateInputValue } = useTimezone();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const user = meQuery.data ?? null;
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id ? parseInt(params.id) : 0;

  const {
    data: project,
    isLoading,
    refetch,
  } = trpc.projects.getById.useQuery({ id: projectId });
  const [, setLocation] = useLocation();
  const { data: milestones, refetch: refetchMilestones } =
    trpc.milestones.getByProject.useQuery({ projectId });
  const { data: updates } = trpc.projectUpdates.getByProject.useQuery({
    projectId,
  });
  const { data: syncLogs } = trpc.sync.logs.useQuery({ projectId });
  const { data: allUsers } = trpc.users.list.useQuery(); // Obtener todos los usuarios

  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    name: "",
    description: "",
    dueDate: "",
    startDate: "",
    durationDays: "",
  });

  const utils = trpc.useUtils();
  const createMilestone = trpc.milestones.create.useMutation();
  const updateMilestone = trpc.milestones.update.useMutation();
  const updateProject = trpc.projects.update.useMutation();
  const deleteProject = trpc.projects.delete.useMutation();
  const generatePDF = trpc.reports.generateProjectPDF.useMutation();
  const syncProject = trpc.sync.syncProject.useMutation();
  const loadMilestonesFromTemplate = trpc.projects.loadMilestonesFromTemplate.useMutation();
  // Google Calendar URL helper - abre el evento en el calendar personal del usuario
  const openGoogleCalendar = (milestone: any) => {
    const startDate = new Date(milestone.dueDate);
    // Formato: YYYYMMDDTHHMMSSZ
    const formatGCalDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `📅 ${project?.name || 'Proyecto'} - ${milestone.name}`,
      dates: `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`,
      details: milestone.description || `Hito del proyecto ${project?.name || ''}`,
      location: project?.location || '',
    });

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
    window.open(url, '_blank');
    toast.success('Google Calendar abierto. Confirma el evento en la pestaña.');
  };
  const assignResponsible = trpc.milestones.assignResponsible.useMutation();
  const updateDueDate = trpc.milestones.updateDueDate.useMutation();
  const recalculateWithWeekends = trpc.milestones.recalculateWithWeekends.useMutation();
  const deleteMilestone = trpc.milestones.delete.useMutation();

  // Query para configuración global de días hábiles
  const { data: weekendsConfig } = trpc.appSettings.getIncludeWeekends.useQuery();
  const reorderMilestones = trpc.milestones.reorder.useMutation({
    onSuccess: () => {
      refetchMilestones();
      toast.success("Orden de hitos actualizado");
    },
    onError: (error) => {
      toast.error(error.message || "Error al reordenar hitos");
    },
  });
  const [milestoneToDelete, setMilestoneToDelete] = useState<{ id: number; name: string } | null>(null);

  // Estado para el diálogo de confirmación de cascada de fechas
  const [cascadeDialog, setCascadeDialog] = useState<{
    open: boolean;
    milestoneId: number;
    milestoneName: string;
    newDate: string; // valor del input date (yyyy-MM-dd)
  } | null>(null);

  // Estado local para tracking de toggles de weekends por hito
  const [milestoneWeekendOverrides, setMilestoneWeekendOverrides] = useState<Record<number, boolean>>({});

  // Handler para toggle de días hábiles por hito
  const handleMilestoneWeekendToggle = useCallback(async (milestoneId: number, milestoneName: string, includeWeekends: boolean) => {
    try {
      setMilestoneWeekendOverrides(prev => ({ ...prev, [milestoneId]: includeWeekends }));
      const result = await recalculateWithWeekends.mutateAsync({
        milestoneId,
        includeWeekends,
      });
      toast.success(
        includeWeekends
          ? `"${milestoneName}": Recalculado con fines de semana (${result.durationDays} días calendario)`
          : `"${milestoneName}": Recalculado solo días hábiles (${result.durationDays} días hábiles)`
      );
      await refetchMilestones();
    } catch (error: any) {
      // Revertir el toggle local
      setMilestoneWeekendOverrides(prev => ({ ...prev, [milestoneId]: !includeWeekends }));
      toast.error(error.message || "Error al recalcular fechas");
    }
  }, [recalculateWithWeekends, refetchMilestones]);

  if (meQuery.isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 dark:text-orange-400 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Cargando proyecto...</p>
        </div>
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

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.planning;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMilestoneStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: "Pendiente",
        variant: "secondary" as const,
        icon: Clock,
      },
      in_progress: {
        label: "En Progreso",
        variant: "default" as const,
        icon: RefreshCw,
      },
      completed: {
        label: "Completado",
        variant: "default" as const,
        icon: CheckCircle2,
      },
      overdue: {
        label: "Vencido",
        variant: "destructive" as const,
        icon: AlertTriangle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const isOverdue = (estimatedEndDate: Date, status: string) => {
    return (
      status !== "completed" &&
      status !== "cancelled" &&
      new Date(estimatedEndDate) < new Date()
    );
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
        dueDate: fromDateInputValue(newMilestone.dueDate),
        startDate: newMilestone.startDate ? fromDateInputValue(newMilestone.startDate) : undefined,
        endDate: newMilestone.dueDate ? fromDateInputValue(newMilestone.dueDate) : undefined,
        durationDays: newMilestone.durationDays ? parseInt(newMilestone.durationDays) : undefined,
        orderIndex: existingMilestones.length + 1,
        weight: 1,
      });

      toast.success("Hito creado exitosamente");
      setNewMilestone({ name: "", description: "", dueDate: "", startDate: "", durationDays: "" });
      setIsAddingMilestone(false);
      refetchMilestones();
    } catch (error: any) {
      toast.error(error.message || "Error al crear el hito");
    }
  };

  const handleToggleMilestoneStatus = async (
    milestoneId: number,
    currentStatus: string
  ) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const completedDate = newStatus === "completed" ? new Date() : undefined;

    try {
      setIsSyncing(true);
      await updateMilestone.mutateAsync({
        id: milestoneId,
        status: newStatus,
        completedDate,
      });

      toast.success(
        `Hito marcado como ${newStatus === "completed" ? "completado" : "pendiente"}`
      );
      refetchMilestones();
      refetch(); // Actualizar progreso del proyecto
      utils.projects.list.invalidate(); // Invalidar caché de lista de proyectos

      // Mostrar indicador de sincronización por 1 segundo
      setTimeout(() => setIsSyncing(false), 1000);
    } catch (error: any) {
      setIsSyncing(false);
      toast.error(error.message || "Error al actualizar el hito");
    }
  };

  const handleLoadMilestonesFromTemplate = async () => {
    try {
      const result = await loadMilestonesFromTemplate.mutateAsync({ projectId });
      toast.success(result.message);
      refetchMilestones();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al cargar plantillas de hitos");
    }
  };

  const completedMilestones =
    milestones?.filter(m => m.status === "completed").length || 0;
  const totalMilestones = milestones?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-4 sm:py-8 space-y-4 sm:space-y-8 px-3 sm:px-4">
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
              <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl bg-gradient-solar flex items-center justify-center flex-shrink-0">
                <Sun className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-4xl font-bold truncate">{project.name}</h1>
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

          <div className="flex gap-2 flex-wrap w-full md:w-auto">
            <div className="relative group">
              <Button
                variant="outline"
                className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial"
                onClick={async () => {
                  try {
                    toast.info("Generando reporte completo PDF...");
                    const result = await generatePDF.mutateAsync({
                      projectId,
                      includeGantt: true,
                      includeSchedule: true,
                    });
                    downloadPdfFromBase64(result.pdfBase64, result.fileName);
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
                <span className="sm:hidden">PDF</span><span className="hidden sm:inline">Reporte Completo</span>
              </Button>
            </div>
            <Button
              variant="outline"
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
              onClick={() => setLocation(`/projects/${project.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            {user.role === "admin" && (
              <Button
                variant="destructive"
                className="gap-1 sm:gap-2 text-xs sm:text-sm"
                onClick={async () => {
                  if (
                    !confirm(
                      `¿Estás seguro de que deseas eliminar el proyecto "${project.name}"?\n\nEsta acción no se puede deshacer y eliminará todos los hitos, archivos y datos asociados.`
                    )
                  ) {
                    return;
                  }

                  try {
                    await deleteProject.mutateAsync({ id: project.id });
                    toast.success("Proyecto eliminado exitosamente");
                    setLocation("/projects");
                  } catch (error: any) {
                    toast.error(error.message || "Error al eliminar el proyecto");
                  }
                }}
                disabled={deleteProject.isPending}
              >
                {deleteProject.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar
              </Button>
            )}
          </div>
        </div>

        {/* Información General */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Progreso General
                {isSyncing && (
                  <span className="flex items-center gap-1 text-xs text-primary animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Sincronizando...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold mb-2">
                {project.progressPercentage}%
              </div>
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
                <span className="font-medium">
                  {tzFormatDate(project.startDate, { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimado:</span>
                <span className="font-medium">
                  {tzFormatDate(project.estimatedEndDate, { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              {project.actualEndDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Finalizado:</span>
                  <span className="font-medium">
                    {tzFormatDate(project.actualEndDate, { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
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
                <div className="text-muted-foreground">
                  {project.clientEmail}
                </div>
              )}
              {project.clientPhone && (
                <div className="text-muted-foreground">
                  {project.clientPhone}
                </div>
              )}
              {project.location && (
                <div className="flex items-center gap-1 text-muted-foreground mt-2">
                  <MapPin className="h-3 w-3" />
                  {project.location}
                </div>
              )}
              {project.clientEmail && (user.role === "admin" || user.role === "engineer" || user.role === "ingeniero_tramites") && (
                <InviteClientButton projectId={project.id} clientEmail={project.clientEmail} clientName={project.clientName} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="milestones" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 whitespace-nowrap">
              <TabsTrigger value="milestones" className="text-xs sm:text-sm">Hitos</TabsTrigger>
              <TabsTrigger value="updates" className="text-xs sm:text-sm">Actualizaciones</TabsTrigger>
              <TabsTrigger value="attachments" className="text-xs sm:text-sm">Archivos</TabsTrigger>
              <TabsTrigger value="legalization" className="text-xs sm:text-sm">Trámites</TabsTrigger>
              <TabsTrigger value="sync" className="text-xs sm:text-sm">Sincronización</TabsTrigger>
            </TabsList>
          </div>

          {/* Hitos */}
          <TabsContent value="milestones" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-lg sm:text-2xl font-bold">Hitos del Proyecto</h2>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm"
                  onClick={handleLoadMilestonesFromTemplate}
                  disabled={loadMilestonesFromTemplate.isPending}
                >
                  {loadMilestonesFromTemplate.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Cargar Hitos Predeterminados</span>
                      <span className="sm:hidden">Cargar Hitos</span>
                    </>
                  )}
                </Button>
                <Dialog
                  open={isAddingMilestone}
                  onOpenChange={setIsAddingMilestone}
                >
                  <DialogTrigger asChild>
                    <Button className="gap-1 sm:gap-2 text-xs sm:text-sm">
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
                        onChange={e =>
                          setNewMilestone({
                            ...newMilestone,
                            name: e.target.value,
                          })
                        }
                        placeholder="Ej: Instalación de paneles"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="milestoneDescription">Descripción</Label>
                      <Textarea
                        id="milestoneDescription"
                        value={newMilestone.description}
                        onChange={e =>
                          setNewMilestone({
                            ...newMilestone,
                            description: e.target.value,
                          })
                        }
                        placeholder="Detalles del hito..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="milestoneStartDate">Fecha de Inicio</Label>
                        <Input
                          id="milestoneStartDate"
                          type="date"
                          value={newMilestone.startDate}
                          onChange={e =>
                            setNewMilestone({
                              ...newMilestone,
                              startDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="milestoneDueDate">
                          Fecha de Vencimiento *
                        </Label>
                        <Input
                          id="milestoneDueDate"
                          type="date"
                          value={newMilestone.dueDate}
                          onChange={e =>
                            setNewMilestone({
                              ...newMilestone,
                              dueDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="milestoneDuration">Duración (días hábiles)</Label>
                      <Input
                        id="milestoneDuration"
                        type="number"
                        min={1}
                        value={newMilestone.durationDays}
                        onChange={e =>
                          setNewMilestone({
                            ...newMilestone,
                            durationDays: e.target.value,
                          })
                        }
                        placeholder="Ej: 5"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddingMilestone(false)}
                        className="flex-1"
                      >
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
            </div>

            {milestones && milestones.length > 0 ? (
              <SortableList
                items={milestones}
                getItemId={(m) => m.id}
                onReorder={(newOrder) => {
                  reorderMilestones.mutate({
                    projectId,
                    orderedIds: newOrder.map((m) => m.id),
                  });
                }}
                className="space-y-3"
                renderItem={(milestone) => (
                  <Card className="hover:shadow-apple transition-all">
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-start gap-2 sm:gap-4">
                        <button
                          onClick={() =>
                            handleToggleMilestoneStatus(
                              milestone.id,
                              milestone.status
                            )
                          }
                          className="mt-1 flex-shrink-0"
                        >
                          {milestone.status === "completed" ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <div className="h-6 w-6 rounded-full border-2 border-muted-foreground hover:border-primary transition-colors" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3
                              className={`font-semibold ${milestone.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                            >
                              {milestone.name}
                            </h3>
                            {getMilestoneStatusBadge(milestone.status)}
                          </div>

                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {milestone.description}
                            </p>
                          )}

                          {/* Asignación de responsable */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-3">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Responsable</Label>
                              <Select
                                value={(milestone as any).assignedUserId?.toString() || "none"}
                                onValueChange={async (value) => {
                                  try {
                                    await assignResponsible.mutateAsync({
                                      milestoneId: milestone.id,
                                      userId: value === "none" ? null : parseInt(value),
                                    });
                                    toast.success("Responsable asignado correctamente");
                                    await refetchMilestones();
                                  } catch (error: any) {
                                    toast.error(error.message || "Error al asignar responsable");
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Sin asignar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sin asignar</SelectItem>
                                  {allUsers?.map((u) => (
                                    <SelectItem key={u.id} value={u.id.toString()}>
                                      {u.name} {(u as any).jobTitle ? `(${(u as any).jobTitle})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Fecha de vencimiento</Label>
                              <Input
                                type="date"
                                className="h-8 text-xs"
                                value={toDateInputValue(milestone.dueDate)}
                                onChange={(e) => {
                                  if (!e.target.value) return;
                                  setCascadeDialog({
                                    open: true,
                                    milestoneId: milestone.id,
                                    milestoneName: milestone.name,
                                    newDate: e.target.value,
                                  });
                                }}
                              />
                            </div>
                          </div>

                          {/* Fechas de inicio, fin y duración */}
                          <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_5rem] gap-2 sm:gap-4 mb-2">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Fecha inicio</Label>
                              <Input
                                type="date"
                                className="h-8 text-xs"
                                value={(milestone as any).startDate ? toDateInputValue((milestone as any).startDate) : ""}
                                onChange={async (e) => {
                                  if (!e.target.value) return;
                                  try {
                                    await updateMilestone.mutateAsync({
                                      id: milestone.id,
                                      startDate: fromDateInputValue(e.target.value),
                                    });
                                    toast.success("Fecha de inicio actualizada");
                                    await refetchMilestones();
                                  } catch (error: any) {
                                    toast.error(error.message || "Error al actualizar fecha");
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Fecha fin</Label>
                              <Input
                                type="date"
                                className="h-8 text-xs"
                                value={(milestone as any).endDate ? toDateInputValue((milestone as any).endDate) : ""}
                                onChange={async (e) => {
                                  if (!e.target.value) return;
                                  try {
                                    await updateMilestone.mutateAsync({
                                      id: milestone.id,
                                      endDate: fromDateInputValue(e.target.value),
                                    });
                                    toast.success("Fecha de fin actualizada");
                                    await refetchMilestones();
                                  } catch (error: any) {
                                    toast.error(error.message || "Error al actualizar fecha");
                                  }
                                }}
                              />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <Label className="text-xs text-muted-foreground mb-1 block">Días</Label>
                              <Input
                                type="number"
                                className="h-8 text-xs text-center w-full sm:w-20"
                                min={1}
                                value={(milestone as any).durationDays || ""}
                                placeholder="-"
                                onChange={async (e) => {
                                  const days = parseInt(e.target.value);
                                  if (!days || days < 1) return;
                                  try {
                                    await updateMilestone.mutateAsync({
                                      id: milestone.id,
                                      durationDays: days,
                                    });
                                    toast.success(`Duración actualizada: ${days} días`);
                                    await refetchMilestones();
                                  } catch (error: any) {
                                    toast.error(error.message || "Error al actualizar duración");
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {/* Toggle de días hábiles por hito */}
                          {(milestone as any).durationDays && (milestone as any).startDate && (
                            <div className="flex items-center gap-3 mb-2 p-2 rounded-md bg-muted/30 border border-dashed">
                              <Switch
                                checked={
                                  milestoneWeekendOverrides[milestone.id] !== undefined
                                    ? milestoneWeekendOverrides[milestone.id]
                                    : (weekendsConfig?.includeWeekends ?? false)
                                }
                                onCheckedChange={(checked) => {
                                  handleMilestoneWeekendToggle(milestone.id, milestone.name, checked);
                                }}
                                disabled={recalculateWithWeekends.isPending}
                                className="scale-75"
                              />
                              <span className="text-xs text-muted-foreground">
                                {
                                  (milestoneWeekendOverrides[milestone.id] !== undefined
                                    ? milestoneWeekendOverrides[milestone.id]
                                    : (weekendsConfig?.includeWeekends ?? false))
                                    ? "Incluye fines de semana"
                                    : "Solo días hábiles (L-V)"
                                }
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            {(milestone as any).startDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Inicio:{" "}
                                {tzFormatDate((milestone as any).startDate, { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Vence:{" "}
                              {tzFormatDate(milestone.dueDate, { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            {(milestone as any).durationDays && (
                              <span className="flex items-center gap-1 font-medium">
                                {(milestone as any).durationDays} día(s) {
                                  (milestoneWeekendOverrides[milestone.id] !== undefined
                                    ? milestoneWeekendOverrides[milestone.id]
                                    : (weekendsConfig?.includeWeekends ?? false))
                                    ? "calendario"
                                    : "hábiles"
                                }
                              </span>
                            )}
                            {milestone.completedDate && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Completado:{" "}
                                {tzFormatDate(milestone.completedDate, { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            )}
                            {(milestone as any).googleCalendarEventId && (
                              <span
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400"
                                title="Sincronizado con Google Calendar"
                              >
                                <Calendar className="h-3 w-3" />
                                Sincronizado
                              </span>
                            )}
                          </div>
                          
                          {/* Notas de reprogramación del hito */}
                          {(milestone as any).notes && (milestone as any).notes.includes("Reprogramaci\u00f3n") && (
                            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1 mb-1">
                                <Clock className="h-3 w-3" />
                                Historial de Reprogramaciones
                              </p>
                              <div className="text-xs text-amber-600 dark:text-amber-400 whitespace-pre-line">
                                {(milestone as any).notes.split("--- Reprogramaci\u00f3n ---\n").filter((_: string, i: number) => i > 0).map((note: string, idx: number) => (
                                  <p key={idx} className="mb-1 last:mb-0">{note.trim()}</p>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Observaciones del equipo - Sistema de comentarios con trazabilidad */}
                          <MilestoneCommentsSection milestoneId={milestone.id} currentUser={user} />

                          {/* Botones de acción */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 sm:gap-2 text-xs sm:text-sm"
                              onClick={() => openGoogleCalendar(milestone)}
                            >
                              <Calendar className="h-3 w-3" />
                              <ExternalLink className="h-3 w-3" />
                              <span className="hidden sm:inline">Agregar a mi</span> Calendar
                            </Button>

                            {/* Botón eliminar hito - solo admin */}
                            {user?.role === "admin" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 border-red-200"
                                onClick={() => setMilestoneToDelete({ id: milestone.id, name: milestone.name })}
                              >
                                <Trash2 className="h-3 w-3" />
                                Eliminar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                renderOverlay={(milestone) => (
                  <Card className="shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {milestone.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                        )}
                        <span className="font-semibold">{milestone.name}</span>
                        {getMilestoneStatusBadge(milestone.status)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No hay hitos definidos para este proyecto
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Actualizaciones */}
          <TabsContent value="updates" className="space-y-4">
            <h2 className="text-lg sm:text-2xl font-bold">Historial de Actualizaciones</h2>
            {updates && updates.length > 0 ? (
              <div className="space-y-3">
                {updates.map(update => (
                  <Card key={update.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{update.title}</h4>
                          {update.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {update.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(update.createdAt), {
                              addSuffix: true,
                              locale: es,
                            })}
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
                  <p className="text-muted-foreground">
                    No hay actualizaciones registradas
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Archivos Adjuntos */}
          <TabsContent value="attachments" className="space-y-4">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold mb-4">Archivos Adjuntos</h2>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-6">
                Sube y gestiona documentos relacionados con este proyecto
                (planos, contratos, certificaciones, etc.)
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Subir Nuevo Archivo
                </h3>
                <FileUpload
                  projectId={projectId}
                  onUploadComplete={() => {
                    // Los archivos se recargarán automáticamente gracias a tRPC
                  }}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Archivos del Proyecto
                </h3>
                <FileList projectId={projectId} />
              </div>
            </div>
          </TabsContent>

          {/* Trámites y Legalización */}
          <TabsContent value="legalization" className="space-y-4">
            <LegalizationChecklist projectId={projectId} />
          </TabsContent>

          {/* Sincronización */}
          <TabsContent value="sync" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-lg sm:text-2xl font-bold">
                Sincronización con OpenSolar
              </h2>
              {project.openSolarId && (
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
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {project.openSolarId}
                  </code>
                </CardContent>
              </Card>
            )}

            {syncLogs && syncLogs.length > 0 ? (
              <div className="space-y-3">
                {syncLogs.map(log => (
                  <Card key={log.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                log.status === "success"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {log.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {log.syncType}
                            </span>
                          </div>
                          {log.message && (
                            <p className="text-sm mt-1">{log.message}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.syncedAt), {
                            addSuffix: true,
                            locale: es,
                          })}
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
                  <p className="text-muted-foreground">
                    No hay logs de sincronización
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogo de confirmación para eliminar hito */}
      <Dialog open={!!milestoneToDelete} onOpenChange={(open) => !open && setMilestoneToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Eliminar Hito</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el hito <strong className="text-foreground">"{milestoneToDelete?.name}"</strong>? Esta acción no se puede deshacer y se eliminarán también los recordatorios asociados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setMilestoneToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMilestone.isPending}
              onClick={async () => {
                if (!milestoneToDelete) return;
                try {
                  await deleteMilestone.mutateAsync({ id: milestoneToDelete.id });
                  toast.success(`Hito "${milestoneToDelete.name}" eliminado exitosamente`);
                  setMilestoneToDelete(null);
                  await refetchMilestones();
                  await refetch(); // Refrescar proyecto para actualizar progreso
                  utils.projects.list.invalidate();
                } catch (error: any) {
                  toast.error(error.message || "Error al eliminar el hito");
                }
              }}
            >
              {deleteMilestone.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Eliminar Hito
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para cascada de fechas */}
      <Dialog
        open={!!cascadeDialog?.open}
        onOpenChange={(open) => !open && setCascadeDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500 dark:text-orange-400" />
              Actualizar fecha de hito
            </DialogTitle>
            <DialogDescription className="text-left">
              Estás cambiando la fecha del hito <strong className="text-foreground">"{cascadeDialog?.milestoneName}"</strong>.
              ¿Deseas recalcular automáticamente las fechas de todos los hitos siguientes según los tiempos de la plantilla?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0" />
              <span><strong>Recalcular todos:</strong> Ajusta las fechas de los hitos siguientes en cascada usando los días de duración de la plantilla.</span>
            </p>
            <p className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-blue-500 shrink-0" />
              <span><strong>Solo este hito:</strong> Cambia únicamente la fecha de este hito sin afectar los demás.</span>
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={updateDueDate.isPending}
              onClick={async () => {
                if (!cascadeDialog) return;
                try {
                  // Actualizar dueDate Y endDate al mismo valor
                  await updateDueDate.mutateAsync({
                    milestoneId: cascadeDialog.milestoneId,
                    dueDate: fromDateInputValue(cascadeDialog.newDate),
                    cascadeSubsequent: false,
                  });
                  // También actualizar endDate para que coincida con la nueva fecha de vencimiento
                  await updateMilestone.mutateAsync({
                    id: cascadeDialog.milestoneId,
                    endDate: fromDateInputValue(cascadeDialog.newDate),
                  });
                  toast.success("Fecha de vencimiento y fecha fin actualizadas");
                  setCascadeDialog(null);
                  await refetchMilestones();
                } catch (error: any) {
                  toast.error(error.message || "Error al actualizar fecha");
                }
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Solo este hito
            </Button>
            <Button
              className="flex-1 bg-orange-50 dark:bg-orange-900/200 hover:bg-orange-600"
              disabled={updateDueDate.isPending}
              onClick={async () => {
                if (!cascadeDialog) return;
                try {
                  const result = await updateDueDate.mutateAsync({
                    milestoneId: cascadeDialog.milestoneId,
                    dueDate: fromDateInputValue(cascadeDialog.newDate),
                    cascadeSubsequent: true,
                  });
                  if (result.cascadedCount && result.cascadedCount > 0) {
                    toast.success(
                      `Fecha actualizada. Se recalcularon ${result.cascadedCount} hito(s) siguientes en cascada.`,
                      { duration: 4000 }
                    );
                  } else {
                    toast.success("Fecha actualizada correctamente");
                  }
                  setCascadeDialog(null);
                  await refetchMilestones();
                } catch (error: any) {
                  toast.error(error.message || "Error al actualizar fecha");
                }
              }}
            >
              {updateDueDate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Recalcular todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


/**
 * Componente de comentarios con trazabilidad para hitos
 * Muestra un hilo de comentarios con autor, fecha/hora y permite agregar/eliminar
 */
function MilestoneCommentsSection({ milestoneId, currentUser }: { milestoneId: number; currentUser: any }) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: comments, refetch: refetchComments } = trpc.milestoneComments.list.useQuery(
    { milestoneId },
    { refetchOnWindowFocus: false }
  );

  const addComment = trpc.milestoneComments.add.useMutation({
    onSuccess: () => {
      setNewComment("");
      refetchComments();
    },
  });

  const deleteComment = trpc.milestoneComments.delete.useMutation({
    onSuccess: () => {
      refetchComments();
      toast.success("Comentario eliminado");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar comentario");
    },
  });

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await addComment.mutateAsync({
        milestoneId,
        content: newComment.trim(),
      });
    } catch (error: any) {
      toast.error(error.message || "Error al agregar comentario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Admin";
      case "engineer": return "Ingeniero";
      case "ingeniero_tramites": return "Ing. Trámites";
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-gray-600";
      case "engineer": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200";
      case "ingeniero_tramites": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200";
      default: return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <div className="mt-3">
      <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        Observaciones del equipo
        {comments && comments.length > 0 && (
          <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
            {comments.length}
          </span>
        )}
      </Label>

      {/* Hilo de comentarios */}
      {comments && comments.length > 0 && (
        <div className="space-y-2 mb-2 max-h-[300px] overflow-y-auto pr-1">
          {comments.map((comment: any) => (
            <div
              key={comment.id}
              className="bg-muted/50 rounded-lg px-3 py-2 text-sm group relative border border-border/50"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <UserIcon className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="font-medium text-xs">
                    {comment.userName || comment.userEmail || "Usuario"}
                  </span>
                </div>
                {comment.userRole && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getRoleBadgeColor(comment.userRole)}`}>
                    {getRoleLabel(comment.userRole)}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {format(new Date(comment.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                </span>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap pl-6">
                {comment.content}
              </p>
              {/* Botón eliminar - visible solo para el autor o admin */}
              {(comment.userId === currentUser?.id || currentUser?.role === "admin") && (
                <button
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 dark:text-red-400 p-0.5"
                  title="Eliminar comentario"
                  onClick={() => {
                    if (confirm("¿Eliminar este comentario?")) {
                      deleteComment.mutate({ id: comment.id });
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input para nuevo comentario */}
      <div className="flex gap-2 items-end">
        <Textarea
          placeholder="Escribe una observación..."
          className="min-h-[40px] max-h-[120px] text-sm resize-none flex-1"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <Button
          size="sm"
          className="h-9 px-3 shrink-0"
          disabled={!newComment.trim() || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        Enter para enviar, Shift+Enter para nueva línea
      </p>
    </div>
  );
}
