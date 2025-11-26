import jsPDF from 'jspdf';
import type { Project, Milestone } from '../drizzle/schema';

interface ProjectReportData {
  project: Project;
  milestones: Milestone[];
  projectType?: { name: string; color: string | null };
  assignedEngineer?: { name: string | null; email: string | null };
}

/**
 * Genera un reporte PDF ejecutivo para un proyecto solar
 * Incluye información del proyecto, progreso de hitos y métricas clave
 */
export async function generateProjectReport(data: ProjectReportData): Promise<Buffer> {
  const { project, milestones, projectType, assignedEngineer } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper para agregar nueva página si es necesario
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // ============================================
  // HEADER
  // ============================================
  doc.setFillColor(255, 107, 53); // Color naranja solar
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte Ejecutivo', margin, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Proyecto Solar', margin, 33);

  yPos = 55;

  // ============================================
  // INFORMACIÓN DEL PROYECTO
  // ============================================
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(project.name, margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  
  if (project.description) {
    const descLines = doc.splitTextToSize(project.description, pageWidth - 2 * margin);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 5 + 5;
  }

  yPos += 5;

  // Información en dos columnas
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Detalles del Proyecto', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const leftCol = margin;
  const rightCol = pageWidth / 2 + 10;
  let leftY = yPos;
  let rightY = yPos;

  // Columna izquierda
  doc.setFont('helvetica', 'bold');
  doc.text('Tipo:', leftCol, leftY);
  doc.setFont('helvetica', 'normal');
  doc.text(projectType?.name || 'N/A', leftCol + 30, leftY);
  leftY += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', leftCol, leftY);
  doc.setFont('helvetica', 'normal');
  const statusMap: Record<string, string> = {
    planning: 'Planificación',
    in_progress: 'En Progreso',
    on_hold: 'En Espera',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  doc.text(statusMap[project.status] || project.status, leftCol + 30, leftY);
  leftY += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Ubicación:', leftCol, leftY);
  doc.setFont('helvetica', 'normal');
  doc.text(project.location || 'N/A', leftCol + 30, leftY);
  leftY += 6;

  if (project.clientName) {
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', leftCol, leftY);
    doc.setFont('helvetica', 'normal');
    doc.text(project.clientName, leftCol + 30, leftY);
    leftY += 6;
  }

  // Columna derecha
  doc.setFont('helvetica', 'bold');
  doc.text('Inicio:', rightCol, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(project.startDate).toLocaleDateString('es'), rightCol + 30, rightY);
  rightY += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Fin Estimado:', rightCol, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(project.estimatedEndDate).toLocaleDateString('es'), rightCol + 30, rightY);
  rightY += 6;

  if (assignedEngineer) {
    doc.setFont('helvetica', 'bold');
    doc.text('Ingeniero:', rightCol, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(assignedEngineer.name || assignedEngineer.email || 'N/A', rightCol + 30, rightY);
    rightY += 6;
  }

  if (project.openSolarId) {
    doc.setFont('helvetica', 'bold');
    doc.text('OpenSolar ID:', rightCol, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(project.openSolarId, rightCol + 30, rightY);
    rightY += 6;
  }

  yPos = Math.max(leftY, rightY) + 10;

  // ============================================
  // PROGRESO GENERAL
  // ============================================
  checkPageBreak(50);

  doc.setFillColor(240, 240, 240);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Progreso General', margin + 10, yPos + 12);

  doc.setFontSize(32);
  doc.setTextColor(255, 107, 53);
  doc.text(`${project.progressPercentage}%`, margin + 10, yPos + 28);

  // Barra de progreso
  const barX = margin + 80;
  const barY = yPos + 15;
  const barWidth = pageWidth - 2 * margin - 90;
  const barHeight = 10;

  doc.setFillColor(220, 220, 220);
  doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');

  doc.setFillColor(255, 107, 53);
  const progressWidth = (barWidth * project.progressPercentage) / 100;
  if (progressWidth > 0) {
    doc.roundedRect(barX, barY, progressWidth, barHeight, 2, 2, 'F');
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  doc.text(`${completedMilestones} de ${milestones.length} hitos completados`, barX, barY + barHeight + 8);

  yPos += 45;

  // ============================================
  // HITOS DEL PROYECTO
  // ============================================
  checkPageBreak(30);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Hitos del Proyecto', margin, yPos);
  yPos += 10;

  if (milestones.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    milestones.forEach((milestone, index) => {
      checkPageBreak(25);

      // Fondo alternado
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 20, 'F');
      }

      // Checkbox
      const checkboxSize = 4;
      const checkboxX = margin + 5;
      const checkboxY = yPos - 2;

      if (milestone.status === 'completed') {
        doc.setFillColor(21, 184, 105);
        doc.circle(checkboxX + checkboxSize / 2, checkboxY + checkboxSize / 2, checkboxSize / 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.text('✓', checkboxX + 0.5, checkboxY + 3.5);
      } else {
        doc.setDrawColor(150, 150, 150);
        doc.circle(checkboxX + checkboxSize / 2, checkboxY + checkboxSize / 2, checkboxSize / 2, 'S');
      }

      // Nombre del hito
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', milestone.status === 'completed' ? 'normal' : 'bold');
      doc.text(milestone.name, checkboxX + 10, yPos + 2);

      // Estado
      doc.setFontSize(8);
      const statusX = pageWidth - margin - 40;
      const statusMap: Record<string, { label: string; color: [number, number, number] }> = {
        pending: { label: 'Pendiente', color: [100, 100, 100] },
        in_progress: { label: 'En Progreso', color: [33, 150, 243] },
        completed: { label: 'Completado', color: [21, 184, 105] },
        overdue: { label: 'Vencido', color: [244, 67, 54] },
      };
      const status = statusMap[milestone.status] || statusMap.pending;
      doc.setTextColor(...status.color);
      doc.text(status.label, statusX, yPos + 2);

      // Fecha
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const dateText = `Vence: ${new Date(milestone.dueDate).toLocaleDateString('es')}`;
      doc.text(dateText, checkboxX + 10, yPos + 8);

      if (milestone.completedDate) {
        const completedText = `Completado: ${new Date(milestone.completedDate).toLocaleDateString('es')}`;
        doc.text(completedText, checkboxX + 10, yPos + 13);
      }

      yPos += 22;
    });
  } else {
    doc.setTextColor(150, 150, 150);
    doc.text('No hay hitos definidos para este proyecto', margin, yPos);
    yPos += 10;
  }

  // ============================================
  // MÉTRICAS CLAVE
  // ============================================
  checkPageBreak(50);
  yPos += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Métricas Clave', margin, yPos);
  yPos += 10;

  const metrics = [
    { label: 'Total de Hitos', value: milestones.length.toString() },
    { label: 'Hitos Completados', value: completedMilestones.toString() },
    { label: 'Hitos Pendientes', value: (milestones.length - completedMilestones).toString() },
    { label: 'Días Transcurridos', value: Math.floor((Date.now() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)).toString() },
  ];

  const metricBoxWidth = (pageWidth - 2 * margin - 15) / 2;
  const metricBoxHeight = 25;
  let metricX = margin;
  let metricY = yPos;

  metrics.forEach((metric, index) => {
    if (index % 2 === 0 && index > 0) {
      metricY += metricBoxHeight + 5;
      metricX = margin;
    } else if (index % 2 === 1) {
      metricX = pageWidth / 2 + 5;
    }

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(metricX, metricY, metricBoxWidth, metricBoxHeight, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(metric.label, metricX + 5, metricY + 10);

    doc.setFontSize(16);
    doc.setTextColor(255, 107, 53);
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, metricX + 5, metricY + 20);
  });

  // ============================================
  // FOOTER
  // ============================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    
    const footerText = `Solar Project Manager - GreenH | Generado el ${new Date().toLocaleDateString('es')}`;
    doc.text(footerText, margin, pageHeight - 10);
    
    const pageText = `Página ${i} de ${totalPages}`;
    doc.text(pageText, pageWidth - margin - 30, pageHeight - 10);
  }

  // Convertir a buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
