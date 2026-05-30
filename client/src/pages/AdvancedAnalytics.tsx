import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  TrendingUp,
  Clock,
  Target,
  AlertTriangle,
  Users,
  Award,
  Trophy,
  ThumbsUp,
  AlertCircle,
} from "lucide-react";
import { useTimezone } from "@/hooks/useTimezone";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#FF6B35", "#F7931E", "#FDC830", "#37B7C3", "#088395"];

function ScoreBadge({ score, level }: { score: number; level: string }) {
  const config: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    excelente: { color: "text-green-700 dark:text-green-300", bg: "bg-green-100 dark:bg-green-900/40", icon: <Trophy className="h-4 w-4" /> },
    bueno: { color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-900/40", icon: <ThumbsUp className="h-4 w-4" /> },
    regular: { color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-900/40", icon: <AlertCircle className="h-4 w-4" /> },
    necesita_mejora: { color: "text-red-700 dark:text-red-300", bg: "bg-red-100 dark:bg-red-900/40", icon: <AlertTriangle className="h-4 w-4" /> },
  };
  const c = config[level] || config.regular;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.color} ${c.bg}`}>
      {c.icon}
      {score}/100
    </span>
  );
}

function ScoreMeter({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return "#16a34a";
    if (s >= 60) return "#2563eb";
    if (s >= 40) return "#d97706";
    return "#dc2626";
  };
  return (
    <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${score}%`, backgroundColor: getColor(score) }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
        {score}%
      </span>
    </div>
  );
}

export default function AdvancedAnalytics() {
  const { formatDate: tzFormatDate } = useTimezone();
  const [selectedEngineerId, setSelectedEngineerId] = useState<number | undefined>(undefined);

  const queryInput = selectedEngineerId ? { engineerId: selectedEngineerId } : undefined;

  const { data: engineers, isLoading: loadingEngineers } =
    trpc.analytics.engineers.useQuery();
  const { data: velocity, isLoading: loadingVelocity } =
    trpc.analytics.teamVelocity.useQuery(queryInput);
  const { data: typeMetrics, isLoading: loadingTypes } =
    trpc.analytics.projectTypeMetrics.useQuery(queryInput);
  const { data: predictions, isLoading: loadingPredictions } =
    trpc.analytics.predictions.useQuery(queryInput);
  const { data: stats, isLoading: loadingStats } =
    trpc.analytics.dashboardStats.useQuery(queryInput);
  
  // Score de desempeño - solo cuando hay ingeniero seleccionado
  const { data: engineerScore, isLoading: loadingScore } =
    trpc.analytics.engineerScore.useQuery(
      { engineerId: selectedEngineerId! },
      { enabled: !!selectedEngineerId }
    );
  const { data: scoreHistory, isLoading: loadingHistory } =
    trpc.analytics.engineerScoreHistory.useQuery(
      { engineerId: selectedEngineerId! },
      { enabled: !!selectedEngineerId }
    );

  // Scores de todos los ingenieros (cuando no hay filtro)
  const { data: allScores, isLoading: loadingAllScores } =
    trpc.analytics.allEngineerScores.useQuery(
      undefined,
      { enabled: !selectedEngineerId }
    );

  if (loadingVelocity || loadingTypes || loadingPredictions || loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-6 lg:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Análisis Avanzado</h1>
          <p className="text-muted-foreground mt-1">
            Métricas predictivas y análisis de rendimiento del equipo
          </p>
        </div>

        {/* Filtro por Ingeniero */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedEngineerId ? String(selectedEngineerId) : "all"}
            onValueChange={(val) => setSelectedEngineerId(val === "all" ? undefined : Number(val))}
          >
            <SelectTrigger className="w-[200px] sm:w-[240px]">
              <SelectValue placeholder="Filtrar por ingeniero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los ingenieros</SelectItem>
              {(engineers || []).map((eng) => (
                <SelectItem key={eng.id} value={String(eng.id)}>
                  {eng.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedEngineerId && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-2 text-sm text-orange-700 dark:text-orange-300">
          Mostrando métricas filtradas para: <strong>{engineers?.find(e => e.id === selectedEngineerId)?.name || "Ingeniero"}</strong>
        </div>
      )}

      {/* Score de Desempeño - Ingeniero Individual */}
      {selectedEngineerId && engineerScore && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <CardTitle>Score de Desempeño</CardTitle>
              </div>
              {engineerScore.score >= 0 ? (
                <ScoreBadge score={engineerScore.score} level={engineerScore.level} />
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                  <AlertCircle className="h-3 w-3" /> Sin datos
                </span>
              )}
            </div>
            <CardDescription>
              Evaluación del mes actual basada en cumplimiento de hitos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {engineerScore.score < 0 ? (
              <div className="text-center py-6">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-500">Sin datos suficientes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Este ingeniero no tiene hitos asignados ni actividad registrada este mes.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-bold" style={{
                    color: engineerScore.score >= 80 ? "#16a34a" : engineerScore.score >= 60 ? "#2563eb" : engineerScore.score >= 40 ? "#d97706" : "#dc2626"
                  }}>
                    {engineerScore.score}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nivel: <span className="font-medium capitalize">{engineerScore.level.replace("_", " ")}</span>
                  </p>
                  <ScoreMeter score={engineerScore.score} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold">{engineerScore.metrics.totalAssigned}</div>
                    <div className="text-xs text-muted-foreground">Asignados</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{engineerScore.metrics.completedOnTime}</div>
                    <div className="text-xs text-muted-foreground">A tiempo</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="text-lg font-bold text-amber-600">{engineerScore.metrics.completedLate}</div>
                    <div className="text-xs text-muted-foreground">Con retraso</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-lg font-bold text-red-600">{engineerScore.metrics.overdue}</div>
                    <div className="text-xs text-muted-foreground">Vencidos</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{engineerScore.metrics.onTimeRate}%</div>
                    <div className="text-xs text-muted-foreground">Tasa a tiempo</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">{engineerScore.metrics.completionRate}%</div>
                    <div className="text-xs text-muted-foreground">Completación</div>
                  </div>
                </div>

                {scoreHistory && scoreHistory.filter((s: any) => s.score >= 0).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Historial de Score (Últimos 6 meses)</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={scoreHistory.filter((s: any) => s.score >= 0)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number) => [`${value}/100`, "Score"]} />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#FF6B35"
                          strokeWidth={2}
                          dot={{ fill: "#FF6B35", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ranking de Ingenieros - Vista General (sin filtro) */}
      {!selectedEngineerId && allScores && allScores.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <CardTitle>Ranking de Desempeño</CardTitle>
            </div>
            <CardDescription>
              Score de desempeño del mes actual por ingeniero
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allScores.map((score, index) => (
                <div
                  key={score.engineerId}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEngineerId(score.engineerId)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{score.engineerName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ScoreMeter score={score.score} />
                    </div>
                  </div>
                  <ScoreBadge score={score.score} level={score.level} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              {selectedEngineerId ? "De proyectos con hitos asignados" : "De todos los proyectos activos"}
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
              De {stats?.totalMilestones || 0} {selectedEngineerId ? "asignados" : "totales"}
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
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
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
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
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
          <CardTitle>{selectedEngineerId ? "Velocidad del Ingeniero" : "Velocidad del Equipo"} (Últimos 6 Meses)</CardTitle>
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

        {/* Tasa de Completación */}
        <Card>
          <CardHeader>
            <CardTitle>Tasa de Completación por Tipo</CardTitle>
            <CardDescription>
              Porcentaje de proyectos completados vs totales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeMetrics || []}
                  dataKey="completionRate"
                  nameKey="projectTypeName"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={entry =>
                    `${entry.projectTypeName}: ${entry.completionRate}%`
                  }
                >
                  {(typeMetrics || []).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-2"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{prediction.projectName}</p>
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-sm text-muted-foreground">
                      <span>
                        Estimado:{" "}
                        {tzFormatDate(prediction.estimatedEndDate)}
                      </span>
                      <span>
                        Predicho:{" "}
                        {tzFormatDate(prediction.predictedEndDate)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${prediction.daysDelay > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
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
