import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Download } from "lucide-react";

export default function NewProject() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOpenSolar, setIsLoadingOpenSolar] = useState(false);
  const [openSolarIdInput, setOpenSolarIdInput] = useState("");

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
    startDate: new Date().toISOString().split('T')[0],
    estimatedEndDate: "",
    location: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
  });

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>Solo los administradores pueden crear proyectos</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.projectTypeId || !formData.startDate || !formData.estimatedEndDate) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setIsSubmitting(true);

    try {
      await createProject.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        projectTypeId: parseInt(formData.projectTypeId),
        assignedEngineerId: formData.assignedEngineerId && formData.assignedEngineerId !== "0"
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

  const engineers = users?.filter(u => u.role === 'engineer');

  const handleLoadFromOpenSolar = async () => {
    if (!openSolarIdInput.trim()) {
      toast.error("Por favor ingresa un ID de OpenSolar");
      return;
    }

    setIsLoadingOpenSolar(true);

    try {
      const result = await utils.openSolar.getProject.fetch({ projectId: openSolarIdInput.trim() });

      if (result.success && result.data) {
        // Autocompletar campos del formulario
        setFormData({
          ...formData,
          name: result.data.name || formData.name,
          location: result.data.location || formData.location,
          clientName: result.data.client || formData.clientName,
          description: result.data.description || formData.description,
          openSolarId: result.data.openSolarId || openSolarIdInput,
          startDate: result.data.startDate 
            ? new Date(result.data.startDate).toISOString().split('T')[0] 
            : formData.startDate,
        });

        toast.success("Datos cargados desde OpenSolar exitosamente");
      } else {
        toast.error(result.error || "No se pudieron cargar los datos de OpenSolar");
      }
    } catch (error: any) {
      console.error('OpenSolar error:', error);
      toast.error("Error al conectar con OpenSolar. Verifica el ID del proyecto.");
    } finally {
      setIsLoadingOpenSolar(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setLocation("/projects")} className="gap-2">
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
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Instalación Solar Residencial"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectTypeId">Tipo de Proyecto *</Label>
                    <Select
                      value={formData.projectTypeId}
                      onValueChange={(value) => setFormData({ ...formData, projectTypeId: value })}
                    >
                      <SelectTrigger id="projectTypeId">
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTypes?.map((type) => (
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
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe los detalles del proyecto..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Dirección o ubicación del proyecto"
                  />
                </div>
              </div>

              {/* Asignación */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Asignación</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="assignedEngineerId">Ingeniero Asignado</Label>
                    <Select
                      value={formData.assignedEngineerId}
                      onValueChange={(value) => setFormData({ ...formData, assignedEngineerId: value })}
                    >
                      <SelectTrigger id="assignedEngineerId">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sin asignar</SelectItem>
                        {engineers?.map((engineer) => (
                          <SelectItem key={engineer.id} value={engineer.id.toString()}>
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
                        value={openSolarIdInput}
                        onChange={(e) => setOpenSolarIdInput(e.target.value)}
                        placeholder="Ingresa el ID del proyecto"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleLoadFromOpenSolar();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleLoadFromOpenSolar}
                        disabled={!openSolarIdInput || isLoadingOpenSolar}
                        className="gap-2"
                      >
                        {isLoadingOpenSolar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Cargar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ingresa el ID y presiona Cargar para autocompletar los datos desde OpenSolar
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
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedEndDate">Fecha Estimada de Finalización *</Label>
                    <Input
                      id="estimatedEndDate"
                      type="date"
                      value={formData.estimatedEndDate}
                      onChange={(e) => setFormData({ ...formData, estimatedEndDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Información del Cliente */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información del Cliente</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Nombre del Cliente</Label>
                    <Input
                      id="clientName"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email del Cliente</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
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
