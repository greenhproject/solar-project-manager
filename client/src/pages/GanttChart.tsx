import { useState, useEffect, useMemo } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import "../gantt-custom.css";
import { trpc } from "@/lib/trpc";
import { exportGanttToExcel } from "@/lib/excelExport";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, ZoomIn, ZoomOut, Download } from "lucide-react";

export default function GanttChart() {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: milestones, isLoading: milestonesLoading } = trpc.milestones.getByProject.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  // Seleccionar el primer proyecto por defecto
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Convertir hitos a tareas de Gantt
  const tasks: Task[] = useMemo(() => {
    if (!milestones || !selectedProjectId) return [];

    const project = projects?.find(p => p.id === selectedProjectId);
    if (!project) return [];

    const ganttTasks: Task[] = [];

    // Agregar el proyecto como tarea principal
    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.estimatedEndDate);
    
    ganttTasks.push({
      id: `project-${project.id}`,
      name: project.name,
      start: projectStart,
      end: projectEnd,
      progress: calculateProjectProgress(milestones),
      type: "project",
      hideChildren: false,
      styles: {
        backgroundColor: "#FF6B35",
        backgroundSelectedColor: "#F7B32B",
        progressColor: "#F7B32B",
        progressSelectedColor: "#FF6B35",
      },
    });

    // Agregar hitos como tareas
    milestones.forEach((milestone, index) => {
      const start = new Date(milestone.dueDate);
      const end = new Date(milestone.completedDate || milestone.dueDate);
      
      // Si el hito está completado, usar la fecha de completación
      // Si no, usar la fecha de vencimiento más 1 día para visualización
      const taskEnd = milestone.status === "completed" 
        ? end 
        : new Date(start.getTime() + 24 * 60 * 60 * 1000);

      const progress = milestone.status === "completed" ? 100 :
                      milestone.status === "in_progress" ? 50 :
                      milestone.status === "overdue" ? 25 : 0;

      const color = getStatusColor(milestone.status);

      ganttTasks.push({
        id: `milestone-${milestone.id}`,
        name: milestone.name,
        start: start,
        end: taskEnd,
        progress: progress,
        type: "task",
        project: `project-${project.id}`,
        dependencies: index > 0 ? [`milestone-${milestones[index - 1].id}`] : undefined,
        styles: {
          backgroundColor: color,
          backgroundSelectedColor: color,
          progressColor: darkenColor(color, 20),
          progressSelectedColor: darkenColor(color, 20),
        },
      });
    });

    return ganttTasks;
  }, [milestones, selectedProjectId, projects]);

  const handleViewModeChange = (mode: string) => {
    switch (mode) {
      case "day":
        setViewMode(ViewMode.Day);
        break;
      case "week":
        setViewMode(ViewMode.Week);
        break;
      case "month":
        setViewMode(ViewMode.Month);
        break;
      default:
        setViewMode(ViewMode.Month);
    }
  };

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="container py-8">
        <Card className="p-8 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No hay proyectos disponibles</h3>
          <p className="text-muted-foreground">
            Crea un proyecto para visualizar el diagrama de Gantt
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Diagrama de Gantt</h1>
          <p className="text-muted-foreground mt-1">
            Visualización temporal de proyectos y hitos
          </p>
        </div>
      </div>

      {/* Controles */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Proyecto</label>
            <Select
              value={selectedProjectId?.toString() || ""}
              onValueChange={(value) => setSelectedProjectId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proyecto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Vista</label>
            <Select value={viewMode} onValueChange={handleViewModeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Día</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-end">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (viewMode === ViewMode.Month) setViewMode(ViewMode.Week);
                else if (viewMode === ViewMode.Week) setViewMode(ViewMode.Day);
              }}
              title="Acercar"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (viewMode === ViewMode.Day) setViewMode(ViewMode.Week);
                else if (viewMode === ViewMode.Week) setViewMode(ViewMode.Month);
              }}
              title="Alejar"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              onClick={() => {
                const project = projects?.find(p => p.id === selectedProjectId);
                if (project && milestones) {
                  exportGanttToExcel(
                    project.name,
                    milestones,
                    new Date(project.startDate),
                    new Date(project.estimatedEndDate)
                  );
                  toast.success("Cronograma exportado a Excel");
                } else {
                  toast.error("Selecciona un proyecto para exportar");
                }
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar a Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Diagrama de Gantt */}
      <Card className="p-6 overflow-x-auto">
        {milestonesLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tasks.length > 0 ? (
          <div className="gantt-container">
            <Gantt
              tasks={tasks}
              viewMode={viewMode}
              locale="es"
              listCellWidth="200px"
              columnWidth={viewMode === ViewMode.Month ? 60 : viewMode === ViewMode.Week ? 80 : 100}
              rowHeight={50}
              barCornerRadius={4}
              barProgressColor="#F7B32B"
              barProgressSelectedColor="#FF6B35"
              barBackgroundColor="#E5E7EB"
              barBackgroundSelectedColor="#D1D5DB"
              projectProgressColor="#F7B32B"
              projectProgressSelectedColor="#FF6B35"
              projectBackgroundColor="#FF6B35"
              projectBackgroundSelectedColor="#F7B32B"
              todayColor="rgba(255, 107, 53, 0.2)"
              fontSize="14px"
              fontFamily="Inter, sans-serif"
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay hitos en este proyecto</h3>
            <p className="text-muted-foreground">
              Agrega hitos al proyecto para visualizar el diagrama de Gantt
            </p>
          </div>
        )}
      </Card>

      {/* Leyenda */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Leyenda de Estados</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#10B981" }}></div>
            <span className="text-sm">Completado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#3B82F6" }}></div>
            <span className="text-sm">En Progreso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#EF4444" }}></div>
            <span className="text-sm">Vencido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: "#9CA3AF" }}></div>
            <span className="text-sm">Pendiente</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Funciones auxiliares
function calculateProjectProgress(milestones: any[]): number {
  if (!milestones || milestones.length === 0) return 0;
  const completed = milestones.filter(m => m.status === "completed").length;
  return Math.round((completed / milestones.length) * 100);
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "#10B981"; // Verde
    case "in_progress":
      return "#3B82F6"; // Azul
    case "overdue":
      return "#EF4444"; // Rojo
    case "pending":
    default:
      return "#9CA3AF"; // Gris
  }
}

function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return "#" + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}
