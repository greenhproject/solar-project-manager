import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  TrendingUp,
  Clock,
  Target,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AdvancedAnalytics() {
  const { data: velocity, isLoading: loadingVelocity } =
    trpc.analytics.teamVelocity.useQuery();
  const { data: typeMetrics, isLoading: loadingTypes } =
    trpc.analytics.projectTypeMetrics.useQuery();
  const { data: predictions, isLoading: loadingPredictions } =
    trpc.analytics.predictions.useQuery();
  const { data: stats, isLoading: loadingStats } =
    trpc.analytics.dashboardStats.useQuery();

  if (loadingVelocity || loadingTypes || loadingPredictions || loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análisis Avanzado</h1>
        <p className="text-muted-foreground mt-1">
          Métricas predictivas y análisis de rendimiento del equipo
        </p>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Progreso Promedio
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageProgress || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              De todos los proyectos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Hitos Completados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedMilestones || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              De {stats?.totalMilestones || 0} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Hitos Vencidos
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.overdueMilestones || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Proyectos Retrasados
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.delayedProjects || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              De {stats?.activeProjects || 0} activos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Velocidad del Equipo */}
      <Card>
        <CardHeader>
          <CardTitle>Velocidad del Equipo (Últimos 6 Meses)</CardTitle>
          <CardDescription>
            Hitos y proyectos completados por mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={velocity || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="milestonesCompleted"
                stroke="#FF6B35"
                name="Hitos Completados"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="projectsCompleted"
                stroke="#37B7C3"
                name="Proyectos Completados"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Métricas por Tipo de Proyecto */}
        <Card>
          <CardHeader>
            <CardTitle>Duración Promedio por Tipo</CardTitle>
            <CardDescription>
              Días promedio de duración de proyectos completados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeMetrics || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="projectTypeName" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="averageDurationDays"
                  fill="#FF6B35"
                  name="Días Promedio"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Progreso Promedio por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Progreso Promedio por Tipo</CardTitle>
            <CardDescription>
              Porcentaje de avance promedio de proyectos por tipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeMetrics || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="projectTypeName" type="category" width={120} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar
                  dataKey="averageProgress"
                  fill="#37B7C3"
                  name="Progreso Promedio"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Predicciones */}
      {predictions && predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Predicciones de Finalización</CardTitle>
            <CardDescription>
              Proyectos con posibles retrasos basados en datos históricos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {predictions.map(prediction => (
                <div
                  key={prediction.projectId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{prediction.projectName}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>
                        Estimado:{" "}
                        {new Date(
                          prediction.estimatedEndDate
                        ).toLocaleDateString("es-ES")}
                      </span>
                      <span>
                        Predicho:{" "}
                        {new Date(
                          prediction.predictedEndDate
                        ).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${prediction.daysDelay > 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {prediction.daysDelay > 0 ? "+" : ""}
                      {prediction.daysDelay} días
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confianza: {prediction.confidence}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!predictions || predictions.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                No hay suficientes datos históricos para generar predicciones
              </p>
              <p className="text-sm mt-2">
                Completa más proyectos para obtener análisis predictivo
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
