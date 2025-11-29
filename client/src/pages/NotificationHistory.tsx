import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, 
  Search, 
  Filter, 
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Briefcase,
  TrendingUp,
  Zap,
  Info
} from "lucide-react";
import * as XLSX from 'xlsx';

type NotificationType = "milestone_due_soon" | "milestone_overdue" | "project_completed" | "project_assigned" | "project_updated" | "milestone_reminder" | "delay" | "ai_alert" | "general";

export default function NotificationHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [filterRead, setFilterRead] = useState<"all" | "read" | "unread">("all");

  // Obtener todas las notificaciones
  const { data: notifications, isLoading } = trpc.notifications.getUserNotifications.useQuery({
    limit: 1000,
    unreadOnly: false
  });

  // Filtrar notificaciones
  const filteredNotifications = notifications?.filter(notif => {
    const matchesSearch = notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notif.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || notif.type === filterType;
    const matchesRead = filterRead === "all" || 
                       (filterRead === "read" && notif.isRead) ||
                       (filterRead === "unread" && !notif.isRead);
    
    return matchesSearch && matchesType && matchesRead;
  }) || [];

  // Exportar a Excel
  const handleExport = () => {
    const data = filteredNotifications.map(notif => ({
      "Fecha": new Date(notif.sentAt).toLocaleString('es-ES'),
      "Tipo": getTypeLabel(notif.type),
      "Título": notif.title,
      "Mensaje": notif.message,
      "Leída": notif.isRead ? "Sí" : "No",
      "Proyecto ID": notif.relatedProjectId || "-",
      "Hito ID": notif.relatedMilestoneId || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notificaciones");
    XLSX.writeFile(wb, `notificaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "milestone_due_soon": return <Clock className="h-4 w-4" />;
      case "milestone_overdue": return <AlertCircle className="h-4 w-4" />;
      case "project_completed": return <CheckCircle2 className="h-4 w-4" />;
      case "project_assigned": return <Briefcase className="h-4 w-4" />;
      case "project_updated": return <TrendingUp className="h-4 w-4" />;
      case "milestone_reminder": return <Bell className="h-4 w-4" />;
      case "delay": return <AlertCircle className="h-4 w-4" />;
      case "ai_alert": return <Zap className="h-4 w-4" />;
      case "general": return <Info className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    switch (type) {
      case "milestone_due_soon": return "Hito Próximo";
      case "milestone_overdue": return "Hito Vencido";
      case "project_completed": return "Proyecto Completado";
      case "project_assigned": return "Proyecto Asignado";
      case "project_updated": return "Proyecto Actualizado";
      case "milestone_reminder": return "Recordatorio";
      case "delay": return "Retraso";
      case "ai_alert": return "Alerta IA";
      case "general": return "General";
      default: return type;
    }
  };

  const getTypeBadgeColor = (type: NotificationType) => {
    switch (type) {
      case "milestone_due_soon": return "bg-yellow-100 text-yellow-700";
      case "milestone_overdue": return "bg-red-100 text-red-700";
      case "project_completed": return "bg-green-100 text-green-700";
      case "project_assigned": return "bg-blue-100 text-blue-700";
      case "project_updated": return "bg-purple-100 text-purple-700";
      case "milestone_reminder": return "bg-orange-100 text-orange-700";
      case "delay": return "bg-red-100 text-red-700";
      case "ai_alert": return "bg-indigo-100 text-indigo-700";
      case "general": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Bell className="h-8 w-8 text-orange-500" />
              Historial de Notificaciones
            </h1>
            <p className="text-gray-600 mt-1">
              Todas tus notificaciones en un solo lugar
            </p>
          </div>
          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            disabled={filteredNotifications.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar a Excel
          </Button>
        </div>

        {/* Filtros */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-orange-500" />
              Filtros
            </CardTitle>
            <CardDescription>
              Filtra y busca en tu historial de notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Búsqueda */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar en notificaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtro por tipo */}
              <Select value={filterType} onValueChange={(value) => setFilterType(value as typeof filterType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de notificación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="milestone_due_soon">Hito Próximo</SelectItem>
                  <SelectItem value="milestone_overdue">Hito Vencido</SelectItem>
                  <SelectItem value="project_completed">Proyecto Completado</SelectItem>
                  <SelectItem value="project_assigned">Proyecto Asignado</SelectItem>
                  <SelectItem value="project_updated">Proyecto Actualizado</SelectItem>
                  <SelectItem value="milestone_reminder">Recordatorio</SelectItem>
                  <SelectItem value="delay">Retraso</SelectItem>
                  <SelectItem value="ai_alert">Alerta IA</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por estado de lectura */}
              <Select value={filterRead} onValueChange={(value) => setFilterRead(value as typeof filterRead)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="unread">No leídas</SelectItem>
                  <SelectItem value="read">Leídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-apple border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{notifications?.length || 0}</p>
                </div>
                <Bell className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-apple border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">No Leídas</p>
                  <p className="text-2xl font-bold text-red-600">
                    {notifications?.filter(n => !n.isRead).length || 0}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-apple border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Filtradas</p>
                  <p className="text-2xl font-bold text-blue-600">{filteredNotifications.length}</p>
                </div>
                <Filter className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de notificaciones */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle>Notificaciones ({filteredNotifications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No se encontraron notificaciones</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-lg border transition-all ${
                      notif.isRead 
                        ? "bg-white border-gray-200" 
                        : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${getTypeBadgeColor(notif.type)}`}>
                          {getTypeIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{notif.title}</h3>
                            {!notif.isRead && (
                              <Badge className="bg-red-500 text-white text-xs">Nuevo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{notif.message}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(notif.sentAt).toLocaleString('es-ES')}
                            </span>
                            <Badge variant="outline" className={getTypeBadgeColor(notif.type)}>
                              {getTypeLabel(notif.type)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
