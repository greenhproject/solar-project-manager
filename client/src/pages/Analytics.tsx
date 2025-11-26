import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, CheckCircle2, PieChartIcon } from "lucide-react";

export default function Analytics() {
  const { data: monthlyData, isLoading: loadingMonthly } = trpc.metrics.monthly.useQuery({ months: 12 });
  const { data: completionRate, isLoading: loadingRate } = trpc.metrics.completionRate.useQuery();
  const { data: averageTime, isLoading: loadingTime } = trpc.metrics.averageTime.useQuery();
  const { data: distribution, isLoading: loadingDist } = trpc.metrics.distribution.useQuery();

  // Preparar datos para gráfico de línea temporal
  const timelineData = monthlyData?.map(m => ({
    month: m.month,
    total: Number(m.total),
    completados: Number(m.completed),
    enProgreso: Number(m.in_progress),
  })) || [];

  // Preparar datos para gráfico de distribución por tipo
  const distributionData = distribution?.map(d => ({
    name: d.typeName,
    value: Number(d.count),
    color: d.color,
  })) || [];

  const COLORS = distributionData.map(d => d.color);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Análisis y Métricas</h1>
          <p className="text-gray-600">Visualización avanzada del rendimiento de proyectos solares</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tasa de Completación */}
          <Card className="shadow-apple border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tasa de Completación</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              {loadingRate ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900">{completionRate?.rate}%</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {completionRate?.completed} de {completionRate?.total} proyectos completados
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tiempo Promedio */}
          <Card className="shadow-apple border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tiempo Promedio</CardTitle>
              <Clock className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              {loadingTime ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900">{averageTime?.avgDays} días</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Basado en {averageTime?.totalCompleted} proyectos completados
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total de Proyectos */}
          <Card className="shadow-apple border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Proyectos</CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              {loadingMonthly ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900">
                    {timelineData.reduce((sum, d) => sum + d.total, 0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Últimos 12 meses</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Evolución Temporal */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle>Evolución de Proyectos por Mes</CardTitle>
            <CardDescription>Tendencia de creación y completación de proyectos</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMonthly ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#FF6B35" 
                    strokeWidth={2}
                    name="Total"
                    dot={{ fill: '#FF6B35', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completados" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Completados"
                    dot={{ fill: '#10B981', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="enProgreso" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="En Progreso"
                    dot={{ fill: '#3B82F6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Barras - Proyectos por Mes */}
          <Card className="shadow-apple border-0">
            <CardHeader>
              <CardTitle>Proyectos Creados por Mes</CardTitle>
              <CardDescription>Distribución mensual de nuevos proyectos</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMonthly ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar dataKey="total" fill="#FF6B35" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Pastel - Distribución por Tipo */}
          <Card className="shadow-apple border-0">
            <CardHeader>
              <CardTitle>Distribución por Tipo de Proyecto</CardTitle>
              <CardDescription>Proporción de proyectos por categoría</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDist ? (
                <Skeleton className="h-64 w-full" />
              ) : distributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <PieChartIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No hay datos disponibles</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
