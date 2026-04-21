import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, FolderKanban, ListTodo, User, GripVertical, CalendarDays } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SortableList } from "@/components/SortableList";
import { Switch } from "@/components/ui/switch";

export function SystemConfiguration() {
  const utils = trpc.useUtils();

  // Estados para tipos de proyectos
  const [projectTypeDialog, setProjectTypeDialog] = useState(false);
  const [editingProjectType, setEditingProjectType] = useState<any>(null);
  const [projectTypeName, setProjectTypeName] = useState("");
  const [projectTypeDescription, setProjectTypeDescription] = useState("");
  const [projectTypeColor, setProjectTypeColor] = useState("#FF6B35");
  const [projectTypeDuration, setProjectTypeDuration] = useState(30);

  // Estados para plantillas de hitos
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateProjectType, setTemplateProjectType] = useState<number | null>(
    null
  );
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateOrder, setTemplateOrder] = useState(1);
  const [templateDuration, setTemplateDuration] = useState(7);
  const [templateAssignedUserId, setTemplateAssignedUserId] = useState<number | null>(null);

  // Queries
  const { data: projectTypes = [], isLoading: loadingTypes } =
    trpc.projectTypes.list.useQuery();
  const { data: milestoneTemplates = [], isLoading: loadingTemplates } =
    trpc.milestoneTemplates.list.useQuery();
  const { data: allUsers = [] } = trpc.users.list.useQuery();

  // Query para configuración de días hábiles
  const { data: weekendsConfig } = trpc.settings.getIncludeWeekends.useQuery();
  const setIncludeWeekends = trpc.settings.setIncludeWeekends.useMutation({
    onSuccess: (data) => {
      utils.settings.getIncludeWeekends.invalidate();
      toast.success(
        data.includeWeekends
          ? "Fines de semana incluidos en el cálculo de días"
          : "Solo días hábiles (lunes a viernes) en el cálculo"
      );
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar configuración");
    },
  });

  // Filtrar usuarios con roles de ingeniería
  const engineers = allUsers.filter(
    (u: any) => u.role === "engineer" || u.role === "ingeniero_tramites" || u.role === "admin"
  );

  // Mutations para tipos de proyectos
  const createProjectType = trpc.projectTypes.create.useMutation({
    onSuccess: () => {
      utils.projectTypes.list.invalidate();
      setProjectTypeDialog(false);
      resetProjectTypeForm();
      toast.success("Tipo de proyecto creado exitosamente");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const updateProjectType = trpc.projectTypes.update.useMutation({
    onSuccess: () => {
      utils.projectTypes.list.invalidate();
      setProjectTypeDialog(false);
      resetProjectTypeForm();
      toast.success("Tipo de proyecto actualizado exitosamente");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  // Mutations para plantillas de hitos
  const createTemplate = trpc.milestoneTemplates.create.useMutation({
    onSuccess: () => {
      utils.milestoneTemplates.list.invalidate();
      setTemplateDialog(false);
      resetTemplateForm();
      toast.success("Plantilla de hito creada exitosamente");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const updateTemplate = trpc.milestoneTemplates.update.useMutation({
    onSuccess: () => {
      utils.milestoneTemplates.list.invalidate();
      setTemplateDialog(false);
      resetTemplateForm();
      toast.success("Plantilla de hito actualizada exitosamente");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const deleteTemplate = trpc.milestoneTemplates.delete.useMutation({
    onSuccess: () => {
      utils.milestoneTemplates.list.invalidate();
      toast.success("Plantilla de hito eliminada exitosamente");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const reorderTemplates = trpc.milestoneTemplates.reorder.useMutation({
    onSuccess: () => {
      utils.milestoneTemplates.list.invalidate();
      toast.success("Orden de hitos actualizado");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  // Funciones auxiliares
  const resetProjectTypeForm = () => {
    setEditingProjectType(null);
    setProjectTypeName("");
    setProjectTypeDescription("");
    setProjectTypeColor("#FF6B35");
    setProjectTypeDuration(30);
  };

  const resetTemplateForm = () => {
    setEditingTemplate(null);
    setTemplateProjectType(null);
    setTemplateName("");
    setTemplateDescription("");
    setTemplateOrder(1);
    setTemplateDuration(7);
    setTemplateAssignedUserId(null);
  };

  const handleSaveProjectType = () => {
    if (!projectTypeName.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    if (editingProjectType) {
      updateProjectType.mutate({
        id: editingProjectType.id,
        name: projectTypeName,
        description: projectTypeDescription,
        color: projectTypeColor,
        estimatedDurationDays: projectTypeDuration,
      });
    } else {
      createProjectType.mutate({
        name: projectTypeName,
        description: projectTypeDescription,
        color: projectTypeColor,
        estimatedDurationDays: projectTypeDuration,
      });
    }
  };

  const handleEditProjectType = (type: any) => {
    setEditingProjectType(type);
    setProjectTypeName(type.name);
    setProjectTypeDescription(type.description || "");
    setProjectTypeColor(type.color || "#FF6B35");
    setProjectTypeDuration(type.estimatedDurationDays || 30);
    setProjectTypeDialog(true);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !templateProjectType) {
      toast.error("El nombre y tipo de proyecto son requeridos");
      return;
    }

    if (editingTemplate) {
      updateTemplate.mutate({
        id: editingTemplate.id,
        name: templateName,
        description: templateDescription,
        orderIndex: templateOrder,
        estimatedDurationDays: templateDuration,
        defaultAssignedUserId: templateAssignedUserId,
      });
    } else {
      createTemplate.mutate({
        projectTypeId: templateProjectType,
        name: templateName,
        description: templateDescription,
        orderIndex: templateOrder,
        estimatedDurationDays: templateDuration,
        defaultAssignedUserId: templateAssignedUserId,
      });
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateProjectType(template.projectTypeId);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    setTemplateOrder(template.orderIndex);
    setTemplateDuration(template.estimatedDurationDays || 7);
    setTemplateAssignedUserId(template.defaultAssignedUserId || null);
    setTemplateDialog(true);
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta plantilla?")) {
      deleteTemplate.mutate({ id });
    }
  };

  // Helper para obtener nombre de usuario por ID
  const getUserName = (userId: number | null) => {
    if (!userId) return null;
    const user = allUsers.find((u: any) => u.id === userId);
    return user ? (user.name || user.email || `Usuario #${userId}`) : null;
  };

  if (loadingTypes || loadingTemplates) {
    return <div className="p-6">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="project-types" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="project-types">
            <FolderKanban className="w-4 h-4 mr-2" />
            Tipos de Proyectos
          </TabsTrigger>
          <TabsTrigger value="milestone-templates">
            <ListTodo className="w-4 h-4 mr-2" />
            Plantillas de Hitos
          </TabsTrigger>
          <TabsTrigger value="business-days">
            <CalendarDays className="w-4 h-4 mr-2" />
            Días Hábiles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="project-types" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Tipos de Proyectos</CardTitle>
                  <CardDescription>
                    Define las categorías de proyectos solares que tu equipo
                    gestiona
                  </CardDescription>
                </div>
                <Dialog
                  open={projectTypeDialog}
                  onOpenChange={setProjectTypeDialog}
                >
                  <DialogTrigger asChild>
                    <Button onClick={resetProjectTypeForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Tipo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingProjectType
                          ? "Editar Tipo de Proyecto"
                          : "Nuevo Tipo de Proyecto"}
                      </DialogTitle>
                      <DialogDescription>
                        Define las características del tipo de proyecto
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="pt-name">Nombre *</Label>
                        <Input
                          id="pt-name"
                          value={projectTypeName}
                          onChange={e => setProjectTypeName(e.target.value)}
                          placeholder="ej: Residencial, Comercial, Industrial"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pt-description">Descripción</Label>
                        <Textarea
                          id="pt-description"
                          value={projectTypeDescription}
                          onChange={e =>
                            setProjectTypeDescription(e.target.value)
                          }
                          placeholder="Describe este tipo de proyecto..."
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pt-color">Color</Label>
                          <Input
                            id="pt-color"
                            type="color"
                            value={projectTypeColor}
                            onChange={e => setProjectTypeColor(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="pt-duration">
                            Duración estimada (días)
                          </Label>
                          <Input
                            id="pt-duration"
                            type="number"
                            value={projectTypeDuration}
                            onChange={e =>
                              setProjectTypeDuration(Number(e.target.value))
                            }
                            min={1}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setProjectTypeDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveProjectType}>
                        {editingProjectType ? "Actualizar" : "Crear"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectTypes.map((type: any) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: type.color }}
                      />
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {type.description || "Sin descripción"} •{" "}
                          {type.estimatedDurationDays} días
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditProjectType(type)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {projectTypes.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay tipos de proyectos creados
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestone-templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Plantillas de Hitos</CardTitle>
                  <CardDescription>
                    Define los hitos predeterminados para cada tipo de proyecto.
                    Puedes asignar un responsable por defecto que se precargará al crear nuevos proyectos.
                  </CardDescription>
                </div>
                <Dialog
                  open={templateDialog}
                  onOpenChange={setTemplateDialog}
                >
                  <DialogTrigger asChild>
                    <Button onClick={resetTemplateForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Plantilla
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate
                          ? "Editar Plantilla de Hito"
                          : "Nueva Plantilla de Hito"}
                      </DialogTitle>
                      <DialogDescription>
                        Define un hito que se agregará automáticamente a nuevos
                        proyectos. El responsable asignado se precargará por defecto.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="t-project-type">
                          Tipo de Proyecto *
                        </Label>
                        <select
                          id="t-project-type"
                          className="w-full p-2 border rounded-md bg-background text-foreground"
                          value={templateProjectType || ""}
                          onChange={e =>
                            setTemplateProjectType(Number(e.target.value))
                          }
                          disabled={!!editingTemplate}
                        >
                          <option value="">Seleccionar tipo...</option>
                          {projectTypes.map((type: any) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="t-name">Nombre del Hito *</Label>
                        <Input
                          id="t-name"
                          value={templateName}
                          onChange={e => setTemplateName(e.target.value)}
                          placeholder="ej: Visita técnica, Instalación de paneles"
                        />
                      </div>
                      <div>
                        <Label htmlFor="t-description">Descripción</Label>
                        <Textarea
                          id="t-description"
                          value={templateDescription}
                          onChange={e => setTemplateDescription(e.target.value)}
                          placeholder="Describe este hito..."
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="t-order">Orden</Label>
                          <Input
                            id="t-order"
                            type="number"
                            value={templateOrder}
                            onChange={e =>
                              setTemplateOrder(Number(e.target.value))
                            }
                            min={1}
                          />
                        </div>
                        <div>
                          <Label htmlFor="t-duration">Duración (días)</Label>
                          <Input
                            id="t-duration"
                            type="number"
                            value={templateDuration}
                            onChange={e =>
                              setTemplateDuration(Number(e.target.value))
                            }
                            min={1}
                          />
                        </div>
                      </div>
                      {/* Selector de responsable por defecto */}
                      <div>
                        <Label htmlFor="t-assigned-user" className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Responsable por Defecto
                        </Label>
                        <select
                          id="t-assigned-user"
                          className="w-full p-2 border rounded-md bg-background text-foreground mt-1"
                          value={templateAssignedUserId || ""}
                          onChange={e =>
                            setTemplateAssignedUserId(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        >
                          <option value="">Sin asignar (se asignará manualmente)</option>
                          {engineers.map((user: any) => (
                            <option key={user.id} value={user.id}>
                              {user.name || user.email} ({user.role === "admin" ? "Admin" : user.role === "engineer" ? "Ingeniero" : "Ing. Trámites"})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Este usuario será asignado automáticamente como responsable del hito al crear un nuevo proyecto con esta plantilla.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setTemplateDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveTemplate}>
                        {editingTemplate ? "Actualizar" : "Crear"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectTypes.map((type: any) => {
                  const templates = milestoneTemplates.filter(
                    (t: any) => t.projectTypeId === type.id && t.isActive
                  );

                  return (
                    <div key={type.id} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </h4>
                      <div className="space-y-2 pl-2">
                        {templates.length > 0 ? (
                          <SortableList
                            items={[...templates].sort((a: any, b: any) => a.orderIndex - b.orderIndex)}
                            getItemId={(t: any) => t.id}
                            onReorder={(newOrder) => {
                              const orderedIds = newOrder.map((t: any) => t.id);
                              reorderTemplates.mutate({
                                projectTypeId: type.id,
                                orderedIds,
                              });
                            }}
                            className="space-y-2"
                            renderItem={(template: any, index: number) => (
                              <div className="flex items-center justify-between p-3 border rounded hover:bg-accent/50 transition-colors bg-card">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {index + 1}. {template.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {template.description || "Sin descripción"} •{" "}
                                    {template.estimatedDurationDays} días
                                  </p>
                                  {template.defaultAssignedUserId && (
                                    <p className="text-xs text-primary flex items-center gap-1 mt-1">
                                      <User className="w-3 h-3" />
                                      Responsable: {getUserName(template.defaultAssignedUserId) || "Usuario no encontrado"}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditTemplate(template)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleDeleteTemplate(template.id)
                                    }
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                            renderOverlay={(template: any) => (
                              <div className="flex items-center justify-between p-3 border rounded bg-card">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                  <p className="font-medium text-sm">{template.name}</p>
                                </div>
                              </div>
                            )}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No hay plantillas de hitos para este tipo
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {projectTypes.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Primero debes crear tipos de proyectos
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business-days" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Días Hábiles</CardTitle>
              <CardDescription>
                Define cómo el sistema calcula la duración de los hitos al crear proyectos y al recalcular fechas en cascada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Incluir fines de semana</Label>
                  <p className="text-sm text-muted-foreground">
                    {weekendsConfig?.includeWeekends
                      ? "El sistema cuenta sábados y domingos como días de trabajo al calcular la duración de hitos."
                      : "El sistema solo cuenta días hábiles (lunes a viernes) al calcular la duración de hitos. Los sábados y domingos se excluyen."}
                  </p>
                </div>
                <Switch
                  checked={weekendsConfig?.includeWeekends ?? false}
                  onCheckedChange={(checked) => {
                    setIncludeWeekends.mutate({ includeWeekends: checked });
                  }}
                  disabled={setIncludeWeekends.isPending}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">¿Cómo funciona?</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                    <span><strong>Desactivado (solo días hábiles):</strong> Si un hito tiene duración de 5 días y empieza un lunes, terminará el viernes de esa misma semana.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                    <span><strong>Activado (incluye fines de semana):</strong> Si un hito tiene duración de 5 días y empieza un lunes, terminará el sábado (cuenta todos los días calendario).</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                    <span><strong>Aplica a:</strong> Creación de proyectos con plantillas, carga de hitos predeterminados, y recálculo en cascada al cambiar fechas de vencimiento.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                    <span><strong>Toggle por hito:</strong> Cada hito individual también tiene su propio toggle para hacer ajustes rápidos sin cambiar la configuración global.</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
