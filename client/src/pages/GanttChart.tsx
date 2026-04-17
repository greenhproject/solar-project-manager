import { useState, useEffect, useMemo, useRef } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import "../gantt-custom.css";
import { trpc } from "@/lib/trpc";
import { exportGanttToExcel } from "@/lib/excelExport";
import { exportGanttToPdf } from "@/lib/ganttPdfExport";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Calendar,
  ZoomIn,
  ZoomOut,
  Download,
  FileSpreadsheet,
  FileImage,
  FileText,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { useTimezone } from "@/hooks/useTimezone";
import html2canvas from "html2canvas";

export default function GanttChart() {
  const { formatDate: tzFormatDate } = useTimezone();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const ganttRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: milestones, isLoading: milestonesLoading } = trpc.milestones.getByProject.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Convertir hitos a tareas de Gantt usando startDate/endDate reales
  const tasks: Task[] = useMemo(() => {
    if (!milestones || !selectedProjectId) return [];
    const project = projects?.find((p) => p.id === selectedProjectId);
    if (!project) return [];

    const ganttTasks: Task[] = [];

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

    milestones.forEach((milestone, index) => {
      // Usar startDate y endDate reales si existen
      const msAny = milestone as any;
      const start = msAny.startDate
        ? new Date(msAny.startDate)
        : new Date(milestone.dueDate);
      
      let taskEnd: Date;
      if (milestone.status === "completed" && milestone.completedDate) {
        taskEnd = new Date(milestone.completedDate);
      } else if (msAny.endDate) {
        taskEnd = new Date(msAny.endDate);
      } else {
        // Fallback: dueDate + 1 día
        taskEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      }

      // Asegurar que end > start
      if (taskEnd <= start) {
        taskEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      }

      const progress =
        milestone.status === "completed"
          ? 100
          : milestone.status === "in_progress"
            ? 50
            : milestone.status === "overdue"
              ? 25
              : 0;

      const color = getStatusColor(milestone.status);

      ganttTasks.push({
        id: `milestone-${milestone.id}`,
        name: `${milestone.name}${msAny.durationDays ? ` (${msAny.durationDays}d)` : ""}`,
        start,
        end: taskEnd,
        progress,
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
      case "day": setViewMode(ViewMode.Day); break;
      case "week": setViewMode(ViewMode.Week); break;
      case "month": setViewMode(ViewMode.Month); break;
      default: setViewMode(ViewMode.Month);
    }
  };

  const handleExportExcel = () => {
    const project = projects?.find((p) => p.id === selectedProjectId);
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
  };

  // Scroll lateral con botones
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  /**
   * OKLCH -> HEX override CSS.
   * html2canvas parses CSS from stylesheets directly (not just computed styles).
   * Our :root uses oklch() which html2canvas v1.x cannot parse.
   * This CSS overrides every CSS variable with safe HEX equivalents.
   */
  const OKLCH_TO_HEX_CSS = `
    :root, *, *::before, *::after {
      --primary: #d4622b !important;
      --primary-foreground: #ffffff !important;
      --sidebar-primary: #d4622b !important;
      --sidebar-primary-foreground: #ffffff !important;
      --chart-1: #c99a3a !important;
      --chart-2: #d4622b !important;
      --chart-3: #a84a1f !important;
      --chart-4: #8c3b17 !important;
      --chart-5: #722e11 !important;
      --background: #ffffff !important;
      --foreground: #3b3226 !important;
      --card: #ffffff !important;
      --card-foreground: #3b3226 !important;
      --popover: #ffffff !important;
      --popover-foreground: #3b3226 !important;
      --secondary: #fafafa !important;
      --secondary-foreground: #665c4d !important;
      --muted: #f5f5f5 !important;
      --muted-foreground: #8b8b8b !important;
      --accent: #f5f5f5 !important;
      --accent-foreground: #222222 !important;
      --destructive: #e53e3e !important;
      --destructive-foreground: #fbfbfb !important;
      --border: #e8e8e8 !important;
      --input: #e8e8e8 !important;
      --ring: #3b82f6 !important;
      --sidebar: #fbfbfb !important;
      --sidebar-foreground: #3b3226 !important;
      --sidebar-accent: #f5f5f5 !important;
      --sidebar-accent-foreground: #222222 !important;
      --sidebar-border: #e8e8e8 !important;
      --sidebar-ring: #3b82f6 !important;
    }
  `;

  // Exportar Gantt como imagen PNG brandeada
  const handleExportImage = async () => {
    if (!ganttRef.current) return;
    setIsExporting(true);

    // Step 1: Inject HEX override into <head> BEFORE cloning
    const overrideStyle = document.createElement("style");
    overrideStyle.id = "__oklch_export_fix__";
    overrideStyle.textContent = OKLCH_TO_HEX_CSS;
    document.head.appendChild(overrideStyle);

    // Wait for browser to apply the override
    await new Promise(r => setTimeout(r, 150));

    try {
      const project = projects?.find((p) => p.id === selectedProjectId);
      const pName = project?.name || "Proyecto";

      // Step 2: Build export container with ALL inline HEX colors
      const exportContainer = document.createElement("div");
      exportContainer.style.cssText = `
        position: fixed; left: -9999px; top: 0;
        background: #FFFFFF; padding: 40px;
        min-width: 1400px; color: #1F2937;
        font-family: Inter, -apple-system, sans-serif;
      `;
      document.body.appendChild(exportContainer);

      // Header brandeado
      const header = document.createElement("div");
      header.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        padding: 20px 30px; margin-bottom: 24px;
        background: linear-gradient(135deg, #FF6B35 0%, #F7B32B 100%);
        border-radius: 12px; color: #FFFFFF;
      `;
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 50px; height: 50px; background: #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2"/>
              <path d="M12 20v2"/>
              <path d="m4.93 4.93 1.41 1.41"/>
              <path d="m17.66 17.66 1.41 1.41"/>
              <path d="M2 12h2"/>
              <path d="M20 12h2"/>
              <path d="m6.34 17.66-1.41 1.41"/>
              <path d="m19.07 4.93-1.41 1.41"/>
            </svg>
          </div>
          <div>
            <div style="font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #FFFFFF;">Solar Manager</div>
            <div style="font-size: 13px; opacity: 0.9; color: #FFFFFF;">Green House Project</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: 600; color: #FFFFFF;">Diagrama de Gantt</div>
          <div style="font-size: 13px; opacity: 0.9; color: #FFFFFF;">${pName}</div>
        </div>
      `;
      exportContainer.appendChild(header);

      // Info del proyecto
      const infoBar = document.createElement("div");
      infoBar.style.cssText = `
        display: flex; gap: 24px; padding: 12px 20px; margin-bottom: 20px;
        background: #FFF7ED; border-radius: 8px; border: 1px solid #FFEDD5;
        font-size: 13px; color: #92400E;
      `;
      const sDate = project ? new Date(project.startDate).toLocaleDateString("es-CO") : "-";
      const eDate = project ? new Date(project.estimatedEndDate).toLocaleDateString("es-CO") : "-";
      const totalMs = milestones?.length || 0;
      const completedMs = milestones?.filter((m) => m.status === "completed").length || 0;
      infoBar.innerHTML = `
        <span style="color:#92400E;"><strong>Inicio:</strong> ${sDate}</span>
        <span style="color:#92400E;"><strong>Fin estimado:</strong> ${eDate}</span>
        <span style="color:#92400E;"><strong>Hitos:</strong> ${completedMs}/${totalMs} completados</span>
        <span style="color:#92400E;"><strong>Progreso:</strong> ${calculateProjectProgress(milestones || [])}%</span>
        <span style="color:#92400E;"><strong>Generado:</strong> ${new Date().toLocaleDateString("es-CO")} ${new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
      `;
      exportContainer.appendChild(infoBar);

      // Step 3: Clone Gantt (now with HEX overrides active in the DOM)
      const ganttClone = ganttRef.current.cloneNode(true) as HTMLElement;
      ganttClone.style.cssText = "overflow: visible; width: auto;";
      const scrollable = ganttClone.querySelector(".gantt-container") as HTMLElement;
      if (scrollable) {
        scrollable.style.overflow = "visible";
        scrollable.style.width = "auto";
      }
      exportContainer.appendChild(ganttClone);

      // Leyenda
      const legend = document.createElement("div");
      legend.style.cssText = `
        display: flex; gap: 24px; padding: 16px 20px; margin-top: 20px;
        background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;
        font-size: 12px; color: #6B7280;
      `;
      legend.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:14px;height:14px;border-radius:3px;background:#10B981;"></div><span style="color:#374151;">Completado</span></div>
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:14px;height:14px;border-radius:3px;background:#3B82F6;"></div><span style="color:#374151;">En Progreso</span></div>
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:14px;height:14px;border-radius:3px;background:#EF4444;"></div><span style="color:#374151;">Vencido</span></div>
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:14px;height:14px;border-radius:3px;background:#9CA3AF;"></div><span style="color:#374151;">Pendiente</span></div>
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:14px;height:14px;border-radius:3px;background:#FF6B35;"></div><span style="color:#374151;">Proyecto</span></div>
      `;
      exportContainer.appendChild(legend);

      // Footer
      const footer = document.createElement("div");
      footer.style.cssText = `
        text-align: center; padding: 16px; margin-top: 16px;
        font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB;
      `;
      footer.innerHTML = `Solar Manager - Green House Project &bull; Diagrama de Gantt generado automáticamente &bull; ${new Date().toLocaleDateString("es-CO")}`;
      exportContainer.appendChild(footer);

      // Step 4: Force-resolve computed colors to inline RGB on ALL elements
      const allEls = [exportContainer, ...Array.from(exportContainer.querySelectorAll("*"))];
      for (const el of allEls) {
        const htmlEl = el as HTMLElement;
        const cs = window.getComputedStyle(el);
        const bg = cs.backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          htmlEl.style.backgroundColor = bg;
        }
        htmlEl.style.color = cs.color;
        htmlEl.style.borderColor = cs.borderColor;
      }

      // Step 5: Capture with html2canvas - use onclone to sanitize the cloned document
      const canvas = await html2canvas(exportContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        logging: false,
        windowWidth: exportContainer.scrollWidth,
        windowHeight: exportContainer.scrollHeight,
        onclone: (clonedDoc: Document) => {
          // Inject our HEX overrides into the cloned document
          const fixStyle = clonedDoc.createElement("style");
          fixStyle.textContent = OKLCH_TO_HEX_CSS;
          clonedDoc.head.appendChild(fixStyle);

          // Replace ALL oklch() references in ALL <style> tags with a safe fallback
          clonedDoc.querySelectorAll("style").forEach(s => {
            if (s.textContent && s.textContent.includes("oklch")) {
              s.textContent = s.textContent.replace(/oklch\([^)]*\)/g, "#888888");
            }
          });

          // Also resolve computed colors on all elements in the clone
          const clonedEls = clonedDoc.body.querySelectorAll("*");
          clonedEls.forEach(el => {
            try {
              const htmlEl = el as HTMLElement;
              const cs = clonedDoc.defaultView?.getComputedStyle(el);
              if (!cs) return;
              const bg = cs.backgroundColor;
              if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
                htmlEl.style.backgroundColor = bg;
              }
              htmlEl.style.color = cs.color;
              htmlEl.style.borderColor = cs.borderColor;
            } catch {
              // Skip elements that can't be styled
            }
          });
        },
      });

      // Descargar
      const link = document.createElement("a");
      link.download = `Gantt_${pName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();

      // Limpiar
      document.body.removeChild(exportContainer);
      toast.success("Diagrama de Gantt exportado como imagen");
    } catch (error) {
      console.error("Error al exportar Gantt:", error);
      toast.error("Error al exportar el diagrama");
    } finally {
      // ALWAYS remove the override stylesheet to restore normal UI colors
      const fix = document.getElementById("__oklch_export_fix__");
      if (fix) fix.remove();
      setIsExporting(false);
    }
  };

  // Exportar Gantt como PDF profesional brandeado
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const project = projects?.find((p) => p.id === selectedProjectId);
      if (!project || !milestones) {
        toast.error("Selecciona un proyecto con hitos para exportar");
        return;
      }
      await exportGanttToPdf(
        project.name,
        project.clientName || "N/A",
        milestones,
        new Date(project.startDate),
        new Date(project.estimatedEndDate),
        calculateProjectProgress(milestones)
      );
      toast.success("Diagrama de Gantt exportado como PDF");
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      toast.error("Error al exportar el PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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
      <div className="container py-4 sm:py-6 lg:py-8">
        <Card className="p-8 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No hay proyectos disponibles</h3>
          <p className="text-muted-foreground">Crea un proyecto para visualizar el diagrama de Gantt</p>
        </Card>
      </div>
    );
  }

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  return (
    <div className={`${isFullscreen ? "fixed inset-0 z-50 bg-background p-4 overflow-auto" : "container py-4 sm:py-6 lg:py-8 space-y-6 max-w-full"}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Diagrama de Gantt</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Visualización temporal de proyectos y hitos
          </p>
        </div>
        {isFullscreen && (
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            Salir de pantalla completa
          </Button>
        )}
      </div>

      {/* Controles */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
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

          {!isMobile && (
            <div className="flex-1 min-w-[150px]">
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
          )}

          <div className="flex gap-2 items-end flex-wrap">
            {!isMobile && (
              <>
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
                  variant="outline"
                  size="icon"
                  onClick={toggleFullscreen}
                  title="Pantalla completa"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="default"
              onClick={handleExportExcel}
              className="gap-2"
              size={isMobile ? "sm" : "default"}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span> Excel
            </Button>
            <Button
              variant="default"
              onClick={handleExportImage}
              className="gap-2"
              size={isMobile ? "sm" : "default"}
              disabled={isExporting || !milestones || milestones.length === 0}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileImage className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Descargar</span> Imagen
            </Button>
            <Button
              variant="default"
              onClick={handleExportPdf}
              className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              size={isMobile ? "sm" : "default"}
              disabled={isExportingPdf || !milestones || milestones.length === 0}
            >
              {isExportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Descargar</span> PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Resumen del proyecto seleccionado */}
      {selectedProject && milestones && milestones.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Inicio</div>
            <div className="text-sm font-semibold">
              {new Date(selectedProject.startDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Fin Estimado</div>
            <div className="text-sm font-semibold">
              {new Date(selectedProject.estimatedEndDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Hitos</div>
            <div className="text-sm font-semibold">
              {milestones.filter((m) => m.status === "completed").length}/{milestones.length}
            </div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Progreso</div>
            <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
              {calculateProjectProgress(milestones)}%
            </div>
          </Card>
        </div>
      )}

      {/* Vista Móvil - Lista de Hitos */}
      {isMobile && milestones && milestones.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Cronograma del Proyecto</h3>
          <div className="space-y-3">
            {milestones.map((milestone) => {
              const status = getStatusInfo(milestone.status);
              const msAny = milestone as any;
              return (
                <div key={milestone.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm flex-1">{milestone.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${status.bgColor} ${status.textColor}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {msAny.startDate && (
                      <div className="flex justify-between">
                        <span>Inicio:</span>
                        <span className="font-medium">{tzFormatDate(msAny.startDate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Vencimiento:</span>
                      <span className="font-medium">{tzFormatDate(milestone.dueDate)}</span>
                    </div>
                    {msAny.endDate && (
                      <div className="flex justify-between">
                        <span>Fin:</span>
                        <span className="font-medium">{tzFormatDate(msAny.endDate)}</span>
                      </div>
                    )}
                    {msAny.durationDays && (
                      <div className="flex justify-between">
                        <span>Duración:</span>
                        <span className="font-medium">{msAny.durationDays} días hábiles</span>
                      </div>
                    )}
                    {milestone.completedDate && (
                      <div className="flex justify-between">
                        <span>Completado:</span>
                        <span className="font-medium">{tzFormatDate(milestone.completedDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Vista Desktop - Diagrama de Gantt */}
      {!isMobile && (
        <Card className="p-4 overflow-hidden">
          {milestonesLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tasks.length > 0 ? (
            <div className="relative">
              {/* Botones de scroll lateral */}
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white dark:bg-gray-900 shadow-lg rounded-full p-2 border border-gray-200 dark:border-gray-700 transition-all hover:scale-110"
                title="Desplazar izquierda"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
              </button>
              <button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white dark:bg-gray-900 shadow-lg rounded-full p-2 border border-gray-200 dark:border-gray-700 transition-all hover:scale-110"
                title="Desplazar derecha"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
              </button>

              <div ref={ganttRef}>
                <div
                  ref={scrollContainerRef}
                  className="gantt-container overflow-x-auto scroll-smooth px-8"
                  style={{ scrollbarWidth: "thin" }}
                >
                  <Gantt
                    tasks={tasks}
                    viewMode={viewMode}
                    locale="es"
                    listCellWidth="220px"
                    columnWidth={viewMode === ViewMode.Month ? 65 : viewMode === ViewMode.Week ? 90 : 110}
                    rowHeight={50}
                    barCornerRadius={6}
                    barProgressColor="#F7B32B"
                    barProgressSelectedColor="#FF6B35"
                    barBackgroundColor="#E0E0E0"
                    barBackgroundSelectedColor="#C0C0C0"
                    projectProgressColor="#F7B32B"
                    projectProgressSelectedColor="#FF6B35"
                    projectBackgroundColor="#FF6B35"
                    projectBackgroundSelectedColor="#F7B32B"
                    todayColor="rgba(255, 107, 53, 0.15)"
                    fontSize="13px"
                    headerHeight={60}
                  />
                </div>
              </div>

              {/* Indicador de scroll */}
              <div className="flex justify-center mt-3 gap-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <ChevronLeft className="h-3 w-3" />
                  Desliza horizontalmente para ver más
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay hitos para este proyecto</p>
            </div>
          )}
        </Card>
      )}

      {/* Tabla de Cronograma */}
      {milestones && milestones.length > 0 && (
        <Card className="p-4 overflow-x-auto">
          <h3 className="font-semibold mb-4 text-sm sm:text-base">Cronograma Detallado</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2 font-medium">#</th>
                <th className="text-left p-2 font-medium">Hito</th>
                <th className="text-left p-2 font-medium">Inicio</th>
                <th className="text-left p-2 font-medium">Fin</th>
                <th className="text-center p-2 font-medium">Días</th>
                <th className="text-left p-2 font-medium">Vencimiento</th>
                <th className="text-left p-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((milestone, idx) => {
                const msAny = milestone as any;
                const status = getStatusInfo(milestone.status);
                return (
                  <tr key={milestone.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-2 text-muted-foreground">{idx + 1}</td>
                    <td className="p-2 font-medium">{milestone.name}</td>
                    <td className="p-2 text-muted-foreground">
                      {msAny.startDate
                        ? new Date(msAny.startDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
                        : "-"}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {msAny.endDate
                        ? new Date(msAny.endDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
                        : "-"}
                    </td>
                    <td className="p-2 text-center font-medium">
                      {msAny.durationDays || "-"}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(milestone.dueDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="p-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${status.bgColor} ${status.textColor}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Leyenda de Estados */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 text-sm sm:text-base">Leyenda de Estados</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-50 dark:bg-green-900/200"></div>
            <span className="text-sm">Completado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-50 dark:bg-blue-900/200"></div>
            <span className="text-sm">En Progreso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-50 dark:bg-red-900/200"></div>
            <span className="text-sm">Vencido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-400"></div>
            <span className="text-sm">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-50 dark:bg-orange-900/200"></div>
            <span className="text-sm">Proyecto</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Funciones auxiliares
function calculateProjectProgress(milestones: any[]): number {
  if (!milestones || milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.status === "completed").length;
  return Math.round((completed / milestones.length) * 100);
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed": return "#10B981";
    case "in_progress": return "#3B82F6";
    case "overdue": return "#EF4444";
    case "pending": return "#9CA3AF";
    default: return "#9CA3AF";
  }
}

function getStatusInfo(status: string) {
  switch (status) {
    case "completed": return { label: "Completado", bgColor: "bg-green-100 dark:bg-green-900/30", textColor: "text-green-700 dark:text-green-400" };
    case "in_progress": return { label: "En Progreso", bgColor: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-700 dark:text-blue-400" };
    case "overdue": return { label: "Vencido", bgColor: "bg-red-100 dark:bg-red-900/30", textColor: "text-red-700 dark:text-red-400" };
    case "pending": return { label: "Pendiente", bgColor: "bg-gray-100 dark:bg-gray-800", textColor: "text-gray-700 dark:text-gray-300" };
    default: return { label: "Pendiente", bgColor: "bg-gray-100 dark:bg-gray-800", textColor: "text-gray-700 dark:text-gray-300" };
  }
}

function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const r = (num >> 16) - percent;
  const g = ((num >> 8) & 0x00ff) - percent;
  const b = (num & 0x0000ff) - percent;
  return (
    "#" +
    (
      0x1000000 +
      (r < 255 ? (r < 1 ? 0 : r) : 255) * 0x10000 +
      (g < 255 ? (g < 1 ? 0 : g) : 255) * 0x100 +
      (b < 255 ? (b < 1 ? 0 : b) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
