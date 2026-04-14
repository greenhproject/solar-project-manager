import { jsPDF } from "jspdf";
import type { Project, Milestone } from "../drizzle/schema";

interface MilestoneComment {
  id: number;
  milestoneId: number;
  userId: number;
  content: string;
  createdAt: Date | string;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
}

interface ProjectReportData {
  project: Project;
  milestones: Milestone[];
  projectType?: { name: string; color: string | null };
  assignedEngineer?: { name: string | null; email: string | null };
  milestoneComments?: Record<number, MilestoneComment[]>;
  includeGantt?: boolean;
  includeSchedule?: boolean;
}

const COLORS = {
  primary: [255, 107, 53] as [number, number, number],
  secondary: [247, 179, 43] as [number, number, number],
  dark: [31, 41, 55] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  lightGray: [150, 150, 150] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  bgLight: [250, 250, 250] as [number, number, number],
  bgMuted: [245, 245, 245] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
};

const STATUS_MAP: Record<string, { label: string; color: [number, number, number] }> = {
  pending: { label: "Pendiente", color: COLORS.gray },
  in_progress: { label: "En Progreso", color: COLORS.blue },
  completed: { label: "Completado", color: COLORS.green },
  overdue: { label: "Vencido", color: COLORS.red },
};

const PROJECT_STATUS_MAP: Record<string, string> = {
  planning: "Planificación",
  in_progress: "En Progreso",
  on_hold: "En Espera",
  completed: "Completado",
  cancelled: "Cancelado",
};

/**
 * Genera un reporte PDF ejecutivo para un proyecto solar
 * Incluye información del proyecto, cronograma, hitos con comentarios y métricas
 */
export async function generateProjectReport(data: ProjectReportData): Promise<Buffer> {
  const {
    project,
    milestones,
    projectType,
    assignedEngineer,
    milestoneComments = {},
    includeGantt = true,
    includeSchedule = true,
  } = data;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 25) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // ============================================
  // HEADER - Branding Solar Manager / Green House Project
  // ============================================
  // Gradient header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 42, "F");
  // Secondary accent bar
  doc.setFillColor(...COLORS.secondary);
  doc.rect(0, 42, pageWidth, 3, "F");

  // Logo circle
  doc.setFillColor(...COLORS.white);
  doc.circle(margin + 12, 21, 12, "F");
  // Sun icon (simplified)
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1.5);
  doc.circle(margin + 12, 21, 5, "S");
  // Sun rays
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  rays.forEach((angle) => {
    const rad = (angle * Math.PI) / 180;
    const x1 = margin + 12 + Math.cos(rad) * 7;
    const y1 = 21 + Math.sin(rad) * 7;
    const x2 = margin + 12 + Math.cos(rad) * 10;
    const y2 = 21 + Math.sin(rad) * 10;
    doc.line(x1, y1, x2, y2);
  });

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Solar Manager", margin + 30, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Green House Project", margin + 30, 27);

  // Right side - report title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte Ejecutivo de Proyecto", pageWidth - margin, 20, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generado: ${new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}`,
    pageWidth - margin,
    27,
    { align: "right" }
  );

  yPos = 55;

  // ============================================
  // INFORMACIÓN DEL PROYECTO
  // ============================================
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(project.name, margin, yPos);
  yPos += 8;

  if (project.description) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    const descLines = doc.splitTextToSize(project.description, pageWidth - 2 * margin);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 5 + 5;
  }

  yPos += 5;

  // Info box
  doc.setFillColor(...COLORS.bgMuted);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 40, 3, 3, "F");
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 40, 3, 3, "S");

  const leftCol = margin + 8;
  const rightCol = pageWidth / 2 + 8;
  let leftY = yPos + 10;
  let rightY = yPos + 10;

  doc.setFontSize(9);

  // Left column
  const addField = (label: string, value: string, x: number, y: number): number => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.dark);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(value, x + 35, y);
    return y + 6;
  };

  leftY = addField("Tipo:", projectType?.name || "N/A", leftCol, leftY);
  leftY = addField("Estado:", PROJECT_STATUS_MAP[project.status] || project.status, leftCol, leftY);
  leftY = addField("Ubicación:", project.location || "N/A", leftCol, leftY);
  if (project.clientName) {
    leftY = addField("Cliente:", project.clientName, leftCol, leftY);
  }

  rightY = addField("Inicio:", new Date(project.startDate).toLocaleDateString("es-CO"), rightCol, rightY);
  rightY = addField("Fin Est.:", new Date(project.estimatedEndDate).toLocaleDateString("es-CO"), rightCol, rightY);
  if (assignedEngineer) {
    rightY = addField("Ingeniero:", assignedEngineer.name || assignedEngineer.email || "N/A", rightCol, rightY);
  }
  if (project.openSolarId) {
    rightY = addField("OpenSolar:", project.openSolarId, rightCol, rightY);
  }

  yPos = yPos + 45;

  // ============================================
  // PROGRESO GENERAL
  // ============================================
  checkPageBreak(50);

  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, "F");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text("Progreso General", margin + 10, yPos + 12);

  doc.setFontSize(28);
  doc.setTextColor(...COLORS.primary);
  doc.text(`${project.progressPercentage}%`, margin + 10, yPos + 28);

  // Progress bar
  const barX = margin + 70;
  const barY = yPos + 16;
  const barWidth = pageWidth - 2 * margin - 80;
  const barHeight = 10;

  doc.setFillColor(220, 220, 220);
  doc.roundedRect(barX, barY, barWidth, barHeight, 3, 3, "F");

  doc.setFillColor(...COLORS.primary);
  const progressWidth = (barWidth * project.progressPercentage) / 100;
  if (progressWidth > 0) {
    doc.roundedRect(barX, barY, Math.min(progressWidth, barWidth), barHeight, 3, 3, "F");
  }

  const completedMilestones = milestones.filter((m) => m.status === "completed").length;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray);
  doc.text(`${completedMilestones} de ${milestones.length} hitos completados`, barX, barY + barHeight + 7);

  yPos += 45;

  // ============================================
  // CRONOGRAMA DETALLADO (tabla de hitos con fechas)
  // ============================================
  if (includeSchedule && milestones.length > 0) {
    checkPageBreak(40);

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Cronograma del Proyecto", margin, yPos);
    yPos += 3;

    // Línea decorativa
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1);
    doc.line(margin, yPos, margin + 50, yPos);
    yPos += 8;

    // Table header
    const colWidths = [8, 52, 28, 28, 16, 28, 18];
    const colX = [margin];
    for (let i = 1; i < colWidths.length; i++) {
      colX.push(colX[i - 1] + colWidths[i - 1]);
    }

    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos - 4, pageWidth - 2 * margin, 10, 2, 2, "F");

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const headers = ["#", "Hito", "Inicio", "Fin", "Días", "Vencimiento", "Estado"];
    headers.forEach((h, i) => {
      doc.text(h, colX[i] + 2, yPos + 2);
    });
    yPos += 10;

    // Table rows
    doc.setFontSize(7);
    milestones.forEach((milestone, idx) => {
      checkPageBreak(12);

      const msAny = milestone as any;

      if (idx % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 10, "F");
      }

      doc.setTextColor(...COLORS.gray);
      doc.setFont("helvetica", "normal");
      doc.text(`${idx + 1}`, colX[0] + 2, yPos + 2);

      doc.setTextColor(...COLORS.dark);
      doc.setFont("helvetica", "bold");
      const nameText = doc.splitTextToSize(milestone.name, colWidths[1] - 4);
      doc.text(nameText[0], colX[1] + 2, yPos + 2);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.gray);
      doc.text(
        msAny.startDate ? new Date(msAny.startDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : "-",
        colX[2] + 2,
        yPos + 2
      );
      doc.text(
        msAny.endDate ? new Date(msAny.endDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : "-",
        colX[3] + 2,
        yPos + 2
      );
      doc.text(msAny.durationDays ? `${msAny.durationDays}` : "-", colX[4] + 2, yPos + 2);
      doc.text(
        new Date(milestone.dueDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
        colX[5] + 2,
        yPos + 2
      );

      const status = STATUS_MAP[milestone.status] || STATUS_MAP.pending;
      doc.setTextColor(...status.color);
      doc.setFont("helvetica", "bold");
      doc.text(status.label, colX[6] + 2, yPos + 2);

      yPos += 10;
    });

    yPos += 5;
  }

  // ============================================
  // DIAGRAMA DE GANTT (representación visual simplificada)
  // ============================================
  if (includeGantt && milestones.length > 0) {
    checkPageBreak(60);

    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Diagrama de Gantt", margin, yPos);
    yPos += 3;

    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1);
    doc.line(margin, yPos, margin + 50, yPos);
    yPos += 8;

    // Calculate date range
    const projectStart = new Date(project.startDate).getTime();
    const projectEnd = new Date(project.estimatedEndDate).getTime();
    const totalDays = Math.max((projectEnd - projectStart) / (1000 * 60 * 60 * 24), 1);

    const chartLeft = margin + 55;
    const chartWidth = pageWidth - chartLeft - margin;
    const rowHeight = 8;

    // Timeline header
    const months: { label: string; x: number }[] = [];
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.estimatedEndDate);
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (current <= endDate) {
      const dayOffset = (current.getTime() - projectStart) / (1000 * 60 * 60 * 24);
      const x = chartLeft + (dayOffset / totalDays) * chartWidth;
      if (x >= chartLeft && x <= chartLeft + chartWidth) {
        months.push({
          label: current.toLocaleDateString("es-CO", { month: "short" }).replace(".", ""),
          x,
        });
      }
      current.setMonth(current.getMonth() + 1);
    }

    doc.setFontSize(6);
    doc.setTextColor(...COLORS.gray);
    months.forEach((m) => {
      doc.text(m.label, m.x, yPos);
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(m.x, yPos + 1, m.x, yPos + 1 + milestones.length * (rowHeight + 2));
    });
    yPos += 5;

    // Today line
    const todayOffset = (Date.now() - projectStart) / (1000 * 60 * 60 * 24);
    if (todayOffset >= 0 && todayOffset <= totalDays) {
      const todayX = chartLeft + (todayOffset / totalDays) * chartWidth;
      doc.setDrawColor(...COLORS.primary);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(todayX, yPos, todayX, yPos + milestones.length * (rowHeight + 2));
      doc.setLineDashPattern([], 0);
      doc.setFontSize(5);
      doc.setTextColor(...COLORS.primary);
      doc.text("Hoy", todayX - 3, yPos - 1);
    }

    // Milestone bars
    milestones.forEach((milestone) => {
      checkPageBreak(rowHeight + 4);

      const msAny = milestone as any;
      const msStart = msAny.startDate ? new Date(msAny.startDate).getTime() : new Date(milestone.dueDate).getTime();
      const msEnd = msAny.endDate
        ? new Date(msAny.endDate).getTime()
        : milestone.completedDate
          ? new Date(milestone.completedDate).getTime()
          : msStart + 24 * 60 * 60 * 1000;

      const startOffset = Math.max((msStart - projectStart) / (1000 * 60 * 60 * 24), 0);
      const endOffset = Math.min((msEnd - projectStart) / (1000 * 60 * 60 * 24), totalDays);
      const barX = chartLeft + (startOffset / totalDays) * chartWidth;
      const barW = Math.max(((endOffset - startOffset) / totalDays) * chartWidth, 3);

      // Milestone name (truncated)
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.dark);
      doc.setFont("helvetica", "normal");
      const truncName = milestone.name.length > 22 ? milestone.name.substring(0, 20) + "..." : milestone.name;
      doc.text(truncName, margin, yPos + rowHeight / 2 + 1);

      // Bar
      const status = STATUS_MAP[milestone.status] || STATUS_MAP.pending;
      doc.setFillColor(...status.color);
      doc.roundedRect(barX, yPos, barW, rowHeight - 1, 1.5, 1.5, "F");

      // Duration text on bar
      if (barW > 15 && msAny.durationDays) {
        doc.setFontSize(5);
        doc.setTextColor(...COLORS.white);
        doc.text(`${msAny.durationDays}d`, barX + 2, yPos + rowHeight / 2 + 0.5);
      }

      yPos += rowHeight + 2;
    });

    // Legend
    yPos += 5;
    doc.setFontSize(6);
    const legendItems = [
      { label: "Completado", color: COLORS.green },
      { label: "En Progreso", color: COLORS.blue },
      { label: "Vencido", color: COLORS.red },
      { label: "Pendiente", color: COLORS.gray },
    ];
    let legendX = margin;
    legendItems.forEach((item) => {
      doc.setFillColor(...item.color);
      doc.roundedRect(legendX, yPos, 6, 4, 1, 1, "F");
      doc.setTextColor(...COLORS.dark);
      doc.text(item.label, legendX + 8, yPos + 3);
      legendX += 35;
    });

    yPos += 12;
  }

  // ============================================
  // HITOS DEL PROYECTO CON COMENTARIOS
  // ============================================
  checkPageBreak(30);

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle de Hitos", margin, yPos);
  yPos += 3;

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.line(margin, yPos, margin + 50, yPos);
  yPos += 8;

  if (milestones.length > 0) {
    milestones.forEach((milestone, index) => {
      const msAny = milestone as any;
      const comments = milestoneComments[milestone.id] || [];
      const neededSpace = 25 + (comments.length > 0 ? comments.length * 10 + 10 : 0);
      checkPageBreak(Math.min(neededSpace, 60));

      // Milestone card background
      if (index % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 20 + (comments.length > 0 ? comments.length * 8 + 8 : 0), "F");
      }

      // Status indicator dot
      const status = STATUS_MAP[milestone.status] || STATUS_MAP.pending;
      doc.setFillColor(...status.color);
      doc.circle(margin + 5, yPos + 1, 2.5, "F");

      // Milestone name
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(milestone.name, margin + 12, yPos + 2);

      // Status label
      doc.setFontSize(8);
      doc.setTextColor(...status.color);
      doc.text(status.label, pageWidth - margin - 25, yPos + 2);

      yPos += 7;

      // Dates row
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.gray);

      let dateInfo = `Vence: ${new Date(milestone.dueDate).toLocaleDateString("es-CO")}`;
      if (msAny.startDate) {
        dateInfo = `Inicio: ${new Date(msAny.startDate).toLocaleDateString("es-CO")} | Fin: ${msAny.endDate ? new Date(msAny.endDate).toLocaleDateString("es-CO") : "-"} | ${dateInfo}`;
      }
      if (msAny.durationDays) {
        dateInfo += ` | Duración: ${msAny.durationDays} días hábiles`;
      }
      if (milestone.completedDate) {
        dateInfo += ` | Completado: ${new Date(milestone.completedDate).toLocaleDateString("es-CO")}`;
      }
      doc.text(dateInfo, margin + 12, yPos);
      yPos += 5;

      // Description
      if (milestone.description) {
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.gray);
        const descLines = doc.splitTextToSize(milestone.description, pageWidth - 2 * margin - 15);
        doc.text(descLines.slice(0, 2), margin + 12, yPos);
        yPos += Math.min(descLines.length, 2) * 4 + 2;
      }

      // Comments (trazabilidad)
      if (comments.length > 0) {
        checkPageBreak(comments.length * 8 + 8);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.amber);
        doc.text(`Observaciones (${comments.length}):`, margin + 12, yPos);
        yPos += 5;

        comments.forEach((comment) => {
          checkPageBreak(10);
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...COLORS.dark);

          const roleMap: Record<string, string> = {
            admin: "Admin",
            ingeniero: "Ing.",
            ingeniero_tramites: "Ing. Trámites",
          };
          const roleName = roleMap[comment.userRole || ""] || comment.userRole || "";
          const commentDate = new Date(comment.createdAt).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          doc.text(`${comment.userName || comment.userEmail || "Usuario"} (${roleName}) - ${commentDate}:`, margin + 16, yPos);
          yPos += 4;

          doc.setFont("helvetica", "normal");
          doc.setTextColor(...COLORS.gray);
          const commentLines = doc.splitTextToSize(comment.content, pageWidth - 2 * margin - 20);
          doc.text(commentLines.slice(0, 3), margin + 16, yPos);
          yPos += Math.min(commentLines.length, 3) * 3.5 + 2;
        });
      }

      yPos += 5;
    });
  } else {
    doc.setTextColor(...COLORS.lightGray);
    doc.setFontSize(10);
    doc.text("No hay hitos definidos para este proyecto", margin, yPos);
    yPos += 10;
  }

  // ============================================
  // MÉTRICAS CLAVE
  // ============================================
  checkPageBreak(55);
  yPos += 5;

  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Métricas Clave", margin, yPos);
  yPos += 3;

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.line(margin, yPos, margin + 50, yPos);
  yPos += 8;

  const daysElapsed = Math.floor((Date.now() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const totalProjectDays = Math.floor(
    (new Date(project.estimatedEndDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const overdueMilestones = milestones.filter((m) => m.status === "overdue").length;

  const metrics = [
    { label: "Total de Hitos", value: milestones.length.toString(), color: COLORS.dark },
    { label: "Hitos Completados", value: completedMilestones.toString(), color: COLORS.green },
    { label: "Hitos Pendientes", value: (milestones.length - completedMilestones - overdueMilestones).toString(), color: COLORS.blue },
    { label: "Hitos Vencidos", value: overdueMilestones.toString(), color: COLORS.red },
    { label: "Días Transcurridos", value: `${daysElapsed} / ${totalProjectDays}`, color: COLORS.primary },
    { label: "Progreso", value: `${project.progressPercentage}%`, color: COLORS.primary },
  ];

  const metricBoxWidth = (pageWidth - 2 * margin - 10) / 3;
  const metricBoxHeight = 22;

  metrics.forEach((metric, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const mx = margin + col * (metricBoxWidth + 5);
    const my = yPos + row * (metricBoxHeight + 5);

    if (row === 0 || !checkPageBreak(metricBoxHeight + 5)) {
      doc.setFillColor(...COLORS.bgMuted);
      doc.roundedRect(mx, my, metricBoxWidth, metricBoxHeight, 2, 2, "F");

      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.setFont("helvetica", "normal");
      doc.text(metric.label, mx + 5, my + 9);

      doc.setFontSize(14);
      doc.setTextColor(...metric.color);
      doc.setFont("helvetica", "bold");
      doc.text(metric.value, mx + 5, my + 18);
    }
  });

  // ============================================
  // FOOTER en todas las páginas
  // ============================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFontSize(7);
    doc.setTextColor(...COLORS.lightGray);
    doc.setFont("helvetica", "normal");

    doc.text(
      `Solar Manager - Green House Project | Reporte generado el ${new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}`,
      margin,
      pageHeight - 10
    );

    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 25, pageHeight - 10);

    // Orange accent line at bottom
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return pdfBuffer;
}
