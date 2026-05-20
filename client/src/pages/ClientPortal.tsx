import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAuth0Custom } from "@/_core/hooks/useAuth0Custom";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sun,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  LogOut,
  User,
  Building2,
  Phone,
  Mail,
} from "lucide-react";

// Componente principal del portal
export default function ClientPortal() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  if (authLoading) {
    return <ClientPortalSkeleton />;
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-orange-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Green House Project</h1>
                <p className="text-xs text-gray-500">Portal de Cliente</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <ClientLogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClientProjectsList />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-orange-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Green House Project. Todos los derechos reservados.</p>
            <p className="mt-1">Energía solar para un futuro sostenible</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Detectar si Auth0 está configurado
const isAuth0Configured = () => {
  return !!(import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID);
};

function ClientLogoutButton() {
  const manusAuth = useAuth();
  const auth0 = useAuth0Custom();
  const isUsingAuth0 = isAuth0Configured();

  const handleLogout = () => {
    if (isUsingAuth0) {
      // Auth0: cierra sesión completamente en Auth0 y redirige a la home
      auth0.logout();
    } else {
      // JWT/Manus: limpia localStorage y redirige al login
      manusAuth.logout();
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
    >
      <LogOut className="w-4 h-4" />
    </Button>
  );
}

function ClientProjectsList() {
  const { data: projects, isLoading } = trpc.clientPortal.myProjects.useQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  if (isLoading) {
    return <ClientPortalSkeleton />;
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-20">
        <Sun className="w-16 h-16 text-orange-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido al Portal</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Aún no tienes proyectos asignados. Cuando tu proyecto esté registrado, podrás ver su avance aquí.
        </p>
      </div>
    );
  }

  if (selectedProjectId) {
    return (
      <ClientProjectDetail
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Mis Proyectos</h2>
        <p className="text-gray-500 mt-1">Consulta el estado y avance de tus proyectos solares</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-orange-100 hover:border-orange-300"
            onClick={() => setSelectedProjectId(project.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <ProjectStatusBadge status={project.status} />
              </div>
              {project.location && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3 h-3" />
                  {project.location}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progreso</span>
                    <span className="font-semibold text-orange-600">{project.progressPercentage}%</span>
                  </div>
                  <Progress value={project.progressPercentage} className="h-2" />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Inicio: {formatDate(project.startDate)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ClientProjectDetail({ projectId, onBack }: { projectId: number; onBack: () => void }) {
  const { data, isLoading } = trpc.clientPortal.projectDetail.useQuery({ projectId });
  const { data: updates } = trpc.clientPortal.projectUpdates.useQuery({ projectId });

  if (isLoading || !data) {
    return <ClientPortalSkeleton />;
  }

  const { project, milestones } = data;
  const completedMilestones = milestones.filter(m => m.status === "completed").length;
  const totalMilestones = milestones.length;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="mb-2">
        ← Volver a mis proyectos
      </Button>

      {/* Project header */}
      <div className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-orange-100 mt-1">{project.projectTypeName}</p>
            </div>
            <ProjectStatusBadge status={project.status} large />
          </div>
        </div>

        {/* Client info & project summary */}
        <div className="grid md:grid-cols-3 gap-6 p-6">
          {/* Progreso */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                <circle
                  cx="48" cy="48" r="40" fill="none"
                  stroke="#f97316" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - project.progressPercentage / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xl font-bold text-gray-900">{project.progressPercentage}%</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Progreso General</p>
            <p className="text-xs text-gray-400">{completedMilestones} de {totalMilestones} etapas</p>
          </div>

          {/* Cronograma */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              Cronograma
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Inicio:</span>
                <span className="font-medium">{formatDate(project.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimado:</span>
                <span className="font-medium">{formatDate(project.estimatedEndDate)}</span>
              </div>
              {project.actualEndDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Finalizado:</span>
                  <span className="font-medium text-green-600">{formatDate(project.actualEndDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Info del cliente */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" />
              Información
            </h3>
            <div className="space-y-2 text-sm">
              {project.clientName && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-gray-400" />
                  <span>{project.clientName}</span>
                </div>
              )}
              {project.clientEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <span>{project.clientEmail}</span>
                </div>
              )}
              {project.clientPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <span>{project.clientPhone}</span>
                </div>
              )}
              {project.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span>{project.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <Card className="border-orange-100">
          <CardHeader>
            <CardTitle className="text-base">Descripción del Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-line">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Milestones / Etapas */}
      <Card className="border-orange-100">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-orange-500" />
            Etapas del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <MilestoneCard key={milestone.id} milestone={milestone} index={index} total={totalMilestones} />
            ))}
            {milestones.length === 0 && (
              <p className="text-center text-gray-500 py-4">Las etapas del proyecto se están configurando</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Updates timeline */}
      {updates && updates.length > 0 && (
        <Card className="border-orange-100">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Actualizaciones Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {updates.map((update) => (
                <div key={update.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{update.title}</p>
                    {update.description && (
                      <p className="text-xs text-gray-500 mt-1">{update.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatDate(update.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MilestoneCard({ milestone, index, total }: { milestone: any; index: number; total: number }) {
  const statusConfig = {
    completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50", label: "Completado" },
    in_progress: { icon: Clock, color: "text-blue-500", bg: "bg-blue-50", label: "En Progreso" },
    pending: { icon: Clock, color: "text-gray-400", bg: "bg-gray-50", label: "Pendiente" },
    overdue: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", label: "Vencido" },
  };

  const config = statusConfig[milestone.status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-4 p-4 rounded-lg ${config.bg} transition-all`}>
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${milestone.status === "completed" ? "bg-green-500" : "bg-white border-2 border-gray-200"}`}>
          {milestone.status === "completed" ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : (
            <span className="text-xs font-bold text-gray-500">{index + 1}</span>
          )}
        </div>
        {index < total - 1 && (
          <div className={`w-0.5 h-8 mt-1 ${milestone.status === "completed" ? "bg-green-300" : "bg-gray-200"}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={`text-sm font-semibold ${milestone.status === "completed" ? "text-green-700" : "text-gray-900"}`}>
            {milestone.name}
          </h4>
          <Badge variant={milestone.status === "completed" ? "default" : "outline"} className="text-xs flex-shrink-0">
            {config.label}
          </Badge>
        </div>
        {milestone.description && (
          <p className="text-xs text-gray-600 mt-1">{milestone.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          {milestone.startDate && (
            <span>Inicio: {formatDate(milestone.startDate)}</span>
          )}
          {milestone.completedDate ? (
            <span className="text-green-600">Completado: {formatDate(milestone.completedDate)}</span>
          ) : milestone.dueDate ? (
            <span>Vence: {formatDate(milestone.dueDate)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProjectStatusBadge({ status, large }: { status: string; large?: boolean }) {
  const statusMap: Record<string, { label: string; className: string }> = {
    planning: { label: "Planificación", className: "bg-blue-100 text-blue-700 border-blue-200" },
    in_progress: { label: "En Progreso", className: "bg-orange-100 text-orange-700 border-orange-200" },
    on_hold: { label: "En Pausa", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    completed: { label: "Completado", className: "bg-green-100 text-green-700 border-green-200" },
    cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700 border-red-200" },
  };

  const config = statusMap[status] || statusMap.planning;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.className} ${large ? "text-sm px-4 py-1.5" : ""}`}>
      {config.label}
    </span>
  );
}

function ClientPortalSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded mb-8" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}
