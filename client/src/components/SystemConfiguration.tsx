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
import { Plus, Edit, Trash2, FolderKanban, ListTodo, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettings } from "./CompanySettings";
import { useAuth } from "@/_core/hooks/useAuth";

export function SystemConfiguration() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

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
  const [templateDefaultAssignedUserId, setTemplateDefaultAssignedUserId] = useState<number | null>(null);

  // Queries
  const { data: projectTypes = [], isLoading: loadingTypes } =
    trpc.projectTypes.list.useQuery();
  const { data: milestoneTemplates = [], isLoading: loadingTemplates } =
    trpc.milestoneTemplates.list.useQuery();
  const { data: users = [] } = trpc.users.list.useQuery();

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
    setTemplateDefaultAssignedUserId(null);
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
        defaultAssignedUserId: templateDefaultAssignedUserId,
      });
    } else {
      createTemplate.mutate({
        projectTypeId: templateProjectType,
        name: templateName,
        description: templateDescription,
        orderIndex: templateOrder,
        estimatedDurationDays: templateDuration,
        defaultAssignedUserId: templateDefaultAssignedUserId,
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
    setTemplateDefaultAssignedUserId(template.defaultAssignedUserId || null);
    setTemplateDialog(true);
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta plantilla?")) {
      deleteTemplate.mutate({ id });
    }
  };

  if (loadingTypes || loadingTemplates) {
    return <div className="p-6">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="project-types" className="w-full">
        {/* Tabs con scroll horizontal en móviles */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full gap-1 p-1" style={{ gridTemplateColumns: isAdmin ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
            <TabsTrigger value="project-types" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm">
              <FolderKanban className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="hidden xs:inline">Tipos de </span>Proyectos
            </TabsTrigger>
            <TabsTrigger value="milestone-templates" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm">
              <ListTodo className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="hidden xs:inline">Plantillas de </span>Hitos
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="company" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm">
                <Building2 className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                Empresa
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="project-types" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Tipos de Proyectos</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Define las categorías de proyectos solares que tu equipo
                    gestiona
                  </CardDescription>
                </div>
                <Dialog
                  open={projectTypeDialog}
                  onOpenChange={setProjectTypeDialog}
                >
                  <DialogTrigger asChild>
                    <Button onClick={resetProjectTypeForm} size="sm" className="w-full sm:w-auto">
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
              <div className="space-y-2">
                {projectTypes.map((type: any) => (
                  <div
                    key={type.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-2"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-4 h-4 rounded flex-shrink-0 mt-1 sm:mt-0"
                        style={{ backgroundColor: type.color }}
                      />
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm sm:text-base truncate">{type.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {type.description || "Sin descripción"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Duración: {type.estimatedDurationDays} días
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 self-end sm:self-center flex-shrink-0"
                      onClick={() => handleEditProjectType(type)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {projectTypes.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay tipos de proyectos configurados
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestone-templates" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Plantillas de Hitos</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Define hitos predeterminados para cada tipo de proyecto
                  </CardDescription>
                </div>
                <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetTemplateForm} size="sm" className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Plantilla
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate
                          ? "Editar Plantilla de Hito"
                          : "Nueva Plantilla de Hito"}
                      </DialogTitle>
                      <DialogDescription>
                        Define un hito que se agregará automáticamente a nuevos
                        proyectos
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="t-project-type">
                          Tipo de Proyecto *
                        </Label>
                        <select
                          id="t-project-type"
                          className="w-full p-2 border rounded-md"
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
                      <div>
                        <Label htmlFor="t-assigned-user">Responsable por Defecto (Opcional)</Label>
                        <select
                          id="t-assigned-user"
                          className="w-full p-2 border rounded-md"
                          value={templateDefaultAssignedUserId || "none"}
                          onChange={e => {
                            const value = e.target.value;
                            setTemplateDefaultAssignedUserId(value === "none" ? null : Number(value));
                          }}
                        >
                          <option value="none">Sin asignar</option>
                          {users.map((user: any) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.role === "admin" ? "Admin" : user.role === "ingeniero_tramites" ? "Ing. Trámites" : "Ingeniero"})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Al cargar hitos desde esta plantilla, se asignará automáticamente este responsable
                        </p>
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
                    <div key={type.id} className="border rounded-lg p-3 sm:p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <div
                          className="w-3 h-3 rounded flex-shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="truncate">{type.name}</span>
                      </h4>
                      <div className="space-y-2 pl-2 sm:pl-5">
                        {templates.length > 0 ? (
                          templates.map((template: any) => (
                            <div
                              key={template.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded hover:bg-accent/50 transition-colors gap-2"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {template.orderIndex}. {template.name}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {template.description || "Sin descripción"} •{" "}
                                  {template.estimatedDurationDays} días
                                </p>
                              </div>
                              <div className="flex gap-1 self-end sm:self-center flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditTemplate(template)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleDeleteTemplate(template.id)
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))
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

        {/* Tab de Configuración de Empresa (solo admin) */}
        {isAdmin && (
          <TabsContent value="company" className="space-y-4">
            <CompanySettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
