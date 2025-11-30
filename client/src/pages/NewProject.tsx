import { useAuth } from "@/_core/hooks/useAuth";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Download } from "lucide-react";

export default function NewProject() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFromOpenSolar, setIsLoadingFromOpenSolar] = useState(false);

  const { data: projectTypes } = trpc.projectTypes.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const createProject = trpc.projects.create.useMutation();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    projectTypeId: "",
    assignedEngineerId: "",
    openSolarId: "",
    startDate: new Date().toISOString().split("T")[0],
    estimatedEndDate: "",
    location: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
  });

  if (!isAuthenticated || !user || (user.role !== "admin" && user.role !== "engineer")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              Solo los administradores e ingenieros pueden crear proyectos
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.projectTypeId ||
      !formData.startDate ||
      !formData.estimatedEndDate
    ) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setIsSubmitting(true);

    try {
      await createProject.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        projectTypeId: parseInt(formData.projectTypeId),
        assignedEngineerId:
          formData.assignedEngineerId && formData.assignedEngineerId !== "0"
            ? parseInt(formData.assignedEngineerId)
            : undefined,
        openSolarId: formData.openSolarId || undefined,
        startDate: new Date(formData.startDate),
        estimatedEndDate: new Date(formData.estimatedEndDate),
        location: formData.location || undefined,
        clientName: formData.clientName || undefined,
        clientEmail: formData.clientEmail || undefined,
        clientPhone: formData.clientPhone || undefined,
      });

      toast.success("Proyecto creado exitosamente");
      setLocation("/projects");
    } catch (error: any) {
      toast.error(error.message || "Error al crear el proyecto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const engineers = users?.filter(u => u.role === "engineer");

  const handleLoadFromOpenSolar = async () => {
    if (!formData.openSolarId) {
      toast.error("Por favor ingresa un ID de OpenSolar");
      return;
    }

    setIsLoadingFromOpenSolar(true);

    try {
      const data = await utils.sync.getProjectData.fetch({
        openSolarId: formData.openSolarId,
      });

      // Auto-completar campos del formulario
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        clientName: data.clientName || prev.clientName,
        clientEmail: data.clientEmail || prev.clientEmail,
        clientPhone: data.clientPhone || prev.clientPhone,
        description: data.description || prev.description,
        location: data.location || prev.location,
      }));

      toast.success("Datos cargados exitosamente desde OpenSolar");
    } catch (error: any) {
      toast.error(error.message || "Error al cargar datos de OpenSolar");
    } finally {
      setIsLoadingFromOpenSolar(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/projects")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Proyectos
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Crear Nuevo Proyecto</CardTitle>
            <CardDescription>
              Completa la información del proyecto solar
            </CardDescription>
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
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Ej: Instalación Solar Residencial"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectTypeId">Tipo de Proyecto *</Label>
                    <Select
                      value={formData.projectTypeId}
                      onValueChange={value =>
                        setFormData({ ...formData, projectTypeId: value })
                      }
                    >
                      <SelectTrigger id="projectTypeId">
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTypes?.map(type => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe los detalles del proyecto..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={e =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Dirección o ubicación del proyecto"
                  />
                </div>
              </div>

              {/* Asignación */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Asignación</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="assignedEngineerId">
                      Ingeniero Asignado
                    </Label>
                    <Select
                      value={formData.assignedEngineerId}
                      onValueChange={value =>
                        setFormData({ ...formData, assignedEngineerId: value })
                      }
                    >
                      <SelectTrigger id="assignedEngineerId">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sin asignar</SelectItem>
                        {engineers?.map(engineer => (
                          <SelectItem
                            key={engineer.id}
                            value={engineer.id.toString()}
                          >
                            {engineer.name || engineer.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="openSolarId">ID de OpenSolar</Label>
                    <div className="flex gap-2">
                      <Input
                        id="openSolarId"
                        value={formData.openSolarId}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            openSolarId: e.target.value,
                          })
                        }
                        placeholder="ID del proyecto en OpenSolar"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleLoadFromOpenSolar}
                        disabled={
                          !formData.openSolarId || isLoadingFromOpenSolar
                        }
                        className="gap-2"
                      >
                        {isLoadingFromOpenSolar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Cargar
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ingresa el ID y haz clic en "Cargar" para auto-completar
                      los datos del proyecto
                    </p>
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Cronograma</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Fecha de Inicio *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={e =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedEndDate">
                      Fecha Estimada de Finalización *
                    </Label>
                    <Input
                      id="estimatedEndDate"
                      type="date"
                      value={formData.estimatedEndDate}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          estimatedEndDate: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Información del Cliente */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Información del Cliente
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Nombre del Cliente</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={e =>
                        setFormData({ ...formData, clientName: e.target.value })
                      }
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email del Cliente</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={formData.clientEmail}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          clientEmail: e.target.value,
                        })
                      }
                      placeholder="cliente@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Teléfono del Cliente</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={formData.clientPhone}
                    onChange={e =>
                      setFormData({ ...formData, clientPhone: e.target.value })
                    }
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/projects")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear Proyecto
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
