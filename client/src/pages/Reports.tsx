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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, ArrowLeft, Download, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Reports() {
  const { user, isAuthenticated } = useAuth();
  const { data: projects } = trpc.projects.list.useQuery();

  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState({
    completionRate: true,
    averageTime: true,
    monthlyMetrics: true,
    distribution: true,
  });
  const [dateRange, setDateRange] = useState<string>("last_month");
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = trpc.reports.generateProjectPDF.useMutation();

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

  const handleProjectToggle = (projectId: number) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSelectAllProjects = () => {
    if (selectedProjects.length === projects?.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects?.map(p => p.id) || []);
    }
  };

  const handleGenerateReport = async () => {
    if (selectedProjects.length === 0) {
      toast.error("Selecciona al menos un proyecto");
      return;
    }

    const selectedMetricsList = Object.entries(selectedMetrics)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    if (selectedMetricsList.length === 0) {
      toast.error("Selecciona al menos una métrica");
      return;
    }

    try {
      setIsGenerating(true);

      // Generar un PDF por cada proyecto seleccionado
      for (const projectId of selectedProjects) {
        const result = await generatePDF.mutateAsync({ projectId });

        // Descargar el PDF
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${result.pdfBase64}`;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Esperar un poco entre descargas
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(
        `${selectedProjects.length} reporte(s) generado(s) exitosamente`
      );
    } catch (error: any) {
      toast.error(error.message || "Error al generar el reporte");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-solar bg-clip-text text-transparent">
                Generador de Reportes
              </h1>
              <p className="text-muted-foreground mt-1">
                Crea reportes personalizados con las métricas que necesites
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Configuración */}
          <div className="space-y-6">
            {/* Selección de Proyectos */}
            <Card>
              <CardHeader>
                <CardTitle>Proyectos</CardTitle>
                <CardDescription>
                  Selecciona los proyectos a incluir en el reporte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Seleccionar todos</Label>
                  <Checkbox
                    checked={
                      selectedProjects.length === projects?.length &&
                      projects?.length > 0
                    }
                    onCheckedChange={handleSelectAllProjects}
                  />
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {projects?.map(project => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-lg"
                    >
                      <Label
                        htmlFor={`project-${project.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {project.name}
                      </Label>
                      <Checkbox
                        id={`project-${project.id}`}
                        checked={selectedProjects.includes(project.id)}
                        onCheckedChange={() => handleProjectToggle(project.id)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Selección de Métricas */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas</CardTitle>
                <CardDescription>
                  Selecciona las métricas a incluir
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="completionRate">Tasa de Completación</Label>
                  <Checkbox
                    id="completionRate"
                    checked={selectedMetrics.completionRate}
                    onCheckedChange={checked =>
                      setSelectedMetrics(prev => ({
                        ...prev,
                        completionRate: checked as boolean,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="averageTime">Tiempo Promedio</Label>
                  <Checkbox
                    id="averageTime"
                    checked={selectedMetrics.averageTime}
                    onCheckedChange={checked =>
                      setSelectedMetrics(prev => ({
                        ...prev,
                        averageTime: checked as boolean,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="monthlyMetrics">Métricas Mensuales</Label>
                  <Checkbox
                    id="monthlyMetrics"
                    checked={selectedMetrics.monthlyMetrics}
                    onCheckedChange={checked =>
                      setSelectedMetrics(prev => ({
                        ...prev,
                        monthlyMetrics: checked as boolean,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="distribution">Distribución por Tipo</Label>
                  <Checkbox
                    id="distribution"
                    checked={selectedMetrics.distribution}
                    onCheckedChange={checked =>
                      setSelectedMetrics(prev => ({
                        ...prev,
                        distribution: checked as boolean,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rango de Fechas */}
            <Card>
              <CardHeader>
                <CardTitle>Rango de Fechas</CardTitle>
                <CardDescription>
                  Selecciona el período del reporte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rango" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_week">Última semana</SelectItem>
                    <SelectItem value="last_month">Último mes</SelectItem>
                    <SelectItem value="last_quarter">
                      Último trimestre
                    </SelectItem>
                    <SelectItem value="last_year">Último año</SelectItem>
                    <SelectItem value="all_time">Todo el tiempo</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Vista Previa y Generación */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vista Previa del Reporte</CardTitle>
                <CardDescription>
                  Resumen de la configuración seleccionada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">
                    Proyectos Seleccionados
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedProjects.length} de {projects?.length || 0}{" "}
                    proyectos
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold">
                    Métricas Seleccionadas
                  </Label>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    {selectedMetrics.completionRate && (
                      <li>• Tasa de Completación</li>
                    )}
                    {selectedMetrics.averageTime && <li>• Tiempo Promedio</li>}
                    {selectedMetrics.monthlyMetrics && (
                      <li>• Métricas Mensuales</li>
                    )}
                    {selectedMetrics.distribution && (
                      <li>• Distribución por Tipo</li>
                    )}
                  </ul>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Período</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dateRange === "last_week" && "Última semana"}
                    {dateRange === "last_month" && "Último mes"}
                    {dateRange === "last_quarter" && "Último trimestre"}
                    {dateRange === "last_year" && "Último año"}
                    {dateRange === "all_time" && "Todo el tiempo"}
                  </p>
                </div>

                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || selectedProjects.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Generar Reporte PDF
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Información */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Información</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  El reporte incluirá gráficos y tablas con las métricas
                  seleccionadas para los proyectos especificados.
                </p>
                <p>
                  El archivo PDF se descargará automáticamente una vez generado.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
