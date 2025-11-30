import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EditProject() {
  const [, params] = useRoute("/projects/:id/edit");
  const [, setLocation] = useLocation();
  const projectId = Number(params?.id);

  const { data: project, isLoading } = trpc.projects.getById.useQuery({
    id: projectId,
  });

  const { data: projectTypes } = trpc.projectTypes.list.useQuery();
  const updateProject = trpc.projects.update.useMutation();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    projectTypeId: 0,
    startDate: "",
    estimatedEndDate: "",
    location: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || "",
        projectTypeId: project.projectTypeId,
        startDate: format(new Date(project.startDate), "yyyy-MM-dd"),
        estimatedEndDate: format(new Date(project.estimatedEndDate), "yyyy-MM-dd"),
        location: project.location || "",
        clientName: project.clientName || "",
        clientEmail: project.clientEmail || "",
        clientPhone: project.clientPhone || "",
      });
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProject.mutateAsync({
        id: projectId,
        name: formData.name,
        description: formData.description,
        location: formData.location,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
      });

      toast.success("Proyecto actualizado exitosamente");
      setLocation(`/projects/${projectId}`);
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar el proyecto");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">Proyecto no encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation(`/projects/${projectId}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver al Proyecto
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Editar Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Básica</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Proyecto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectType">Tipo de Proyecto *</Label>
                  <Select
                    value={String(formData.projectTypeId)}
                    onValueChange={(value) =>
                      setFormData({ ...formData, projectTypeId: Number(value) })
                    }
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes?.map((type: any) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    El tipo de proyecto no se puede cambiar después de crearlo
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Fecha de Inicio *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedEndDate">Fecha Estimada de Finalización *</Label>
                  <Input
                    id="estimatedEndDate"
                    type="date"
                    value={formData.estimatedEndDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedEndDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Dirección del proyecto"
                />
              </div>
            </div>

            {/* Información del Cliente */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información del Cliente</h3>
              
              <div className="space-y-2">
                <Label htmlFor="clientName">Nombre del Cliente</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email del Cliente</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, clientEmail: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Teléfono del Cliente</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, clientPhone: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-4 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/projects/${projectId}`)}
                disabled={updateProject.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
