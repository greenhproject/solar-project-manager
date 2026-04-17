import jsPDF from "jspdf";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663169336317/i9L9SEfcrUSsT5mzwNhmmi/GHPLogo-03_9b11623d.png";

// Brand colors
const COLORS = {
  orange: [255, 107, 53] as [number, number, number],
  amber: [247, 179, 43] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  gray: [156, 163, 175] as [number, number, number],
  darkGray: [55, 65, 81] as [number, number, number],
  lightGray: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  warmBg: [255, 247, 237] as [number, number, number],
  text: [31, 41, 55] as [number, number, number],
  textLight: [107, 114, 128] as [number, number, number],
};

function getStatusColor(status: string): [number, number, number] {
  switch (status) {
    case "completed": return COLORS.green;
    case "in_progress": return COLORS.blue;
    case "overdue": return COLORS.red;
    case "pending": return COLORS.gray;
    default: return COLORS.gray;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "completed": return "Completado";
    case "in_progress": return "En Progreso";
    case "overdue": return "Vencido";
    case "pending": return "Pendiente";
    default: return "Pendiente";
  }
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawGradientRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  colorStart: [number, number, number],
  colorEnd: [number, number, number],
  steps = 20
) {
  const stepW = w / steps;
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps;
    const r = Math.round(colorStart[0] + (colorEnd[0] - colorStart[0]) * ratio);
    const g = Math.round(colorStart[1] + (colorEnd[1] - colorStart[1]) * ratio);
    const b = Math.round(colorStart[2] + (colorEnd[2] - colorStart[2]) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(x + i * stepW, y, stepW + 0.5, h, "F");
  }
}

function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: [number, number, number]
) {
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, h, r, r, "F");
}

export async function exportGanttToPdf(
  projectName: string,
  clientName: string,
  milestones: any[],
  projectStartDate: Date,
  projectEndDate: Date,
  projectProgress: number
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;

  // Load logo
  const logoBase64 = await loadImageAsBase64(LOGO_URL);

  // ═══════════════════════════════════════════════════════
  // HEADER - Gradient bar with logo and project info
  // ═══════════════════════════════════════════════════════
  drawGradientRect(doc, 0, 0, pageW, 28, COLORS.orange, COLORS.amber);

  // Logo
  if (logoBase64) {
    // White background for logo
    drawRoundedRect(doc, margin, 4, 60, 20, 2, COLORS.white);
    try {
      doc.addImage(logoBase64, "PNG", margin + 2, 6, 56, 16);
    } catch {
      // Fallback text if logo fails
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.orange);
      doc.text("Green House Project", margin + 4, 16);
    }
  } else {
    doc.setFontSize(16);
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.text("Green House Project", margin + 4, 16);
  }

  // Right side - Project title
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text("Diagrama de Gantt", pageW - margin, 12, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(projectName, pageW - margin, 19, { align: "right" });
  doc.setFontSize(8);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}`, pageW - margin, 24, { align: "right" });

  // ═══════════════════════════════════════════════════════
  // PROJECT INFO CARDS
  // ═══════════════════════════════════════════════════════
  const infoY = 33;
  const cardW = (contentW - 12) / 4;
  const cardH = 16;

  const infoCards = [
    { label: "Cliente", value: clientName || "N/A", color: COLORS.orange },
    { label: "Inicio", value: projectStartDate.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }), color: COLORS.blue },
    { label: "Fin Estimado", value: projectEndDate.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }), color: COLORS.amber },
    { label: "Progreso", value: `${projectProgress}%`, color: COLORS.green },
  ];

  infoCards.forEach((card, i) => {
    const cx = margin + i * (cardW + 4);
    // Card background
    drawRoundedRect(doc, cx, infoY, cardW, cardH, 2, COLORS.warmBg);
    // Left accent bar
    doc.setFillColor(...card.color);
    doc.rect(cx, infoY + 2, 1.5, cardH - 4, "F");
    // Label
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, cx + 5, infoY + 6);
    // Value
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text(card.value, cx + 5, infoY + 12);
  });

  // ═══════════════════════════════════════════════════════
  // GANTT TABLE WITH VISUAL BARS
  // ═══════════════════════════════════════════════════════
  const tableY = infoY + cardH + 6;
  
  // Table header
  const colWidths = {
    num: 8,
    name: 72,
    status: 22,
    start: 24,
    end: 24,
    days: 14,
    bar: contentW - 8 - 72 - 22 - 24 - 24 - 14 - 4,
  };

  // Header background
  drawRoundedRect(doc, margin, tableY, contentW, 8, 1.5, COLORS.orange);
  
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  
  let colX = margin + 2;
  doc.text("#", colX, tableY + 5.5);
  colX += colWidths.num;
  doc.text("HITO / ACTIVIDAD", colX, tableY + 5.5);
  colX += colWidths.name;
  doc.text("ESTADO", colX, tableY + 5.5);
  colX += colWidths.status;
  doc.text("INICIO", colX, tableY + 5.5);
  colX += colWidths.start;
  doc.text("FIN", colX, tableY + 5.5);
  colX += colWidths.end;
  doc.text("DÍAS", colX, tableY + 5.5);
  colX += colWidths.days;
  doc.text("CRONOGRAMA VISUAL", colX, tableY + 5.5);

  // Calculate date range for visual bars
  const projectStartMs = projectStartDate.getTime();
  const projectEndMs = projectEndDate.getTime();
  const totalDuration = projectEndMs - projectStartMs;
  const barAreaX = margin + 2 + colWidths.num + colWidths.name + colWidths.status + colWidths.start + colWidths.end + colWidths.days;
  const barAreaW = colWidths.bar - 2;

  // Draw month markers in bar area header
  if (totalDuration > 0) {
    const monthStart = new Date(projectStartDate.getFullYear(), projectStartDate.getMonth(), 1);
    const months: { label: string; x: number }[] = [];
    const current = new Date(monthStart);
    while (current.getTime() <= projectEndMs) {
      const pos = (current.getTime() - projectStartMs) / totalDuration;
      if (pos >= 0 && pos <= 1) {
        months.push({
          label: current.toLocaleDateString("es-CO", { month: "short" }).toUpperCase(),
          x: barAreaX + pos * barAreaW,
        });
      }
      current.setMonth(current.getMonth() + 1);
    }
    // We'll draw month labels below the header
  }

  // Table rows
  let rowY = tableY + 8;
  const rowH = 7;
  const maxRowsPerPage = Math.floor((pageH - rowY - 20) / rowH);

  milestones.forEach((milestone, idx) => {
    // Check if we need a new page
    if (idx > 0 && idx % maxRowsPerPage === 0) {
      doc.addPage();
      rowY = margin + 5;
      
      // Redraw header on new page
      drawRoundedRect(doc, margin, rowY - 5, contentW, 8, 1.5, COLORS.orange);
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "bold");
      let cx2 = margin + 2;
      doc.text("#", cx2, rowY);
      cx2 += colWidths.num;
      doc.text("HITO / ACTIVIDAD", cx2, rowY);
      cx2 += colWidths.name;
      doc.text("ESTADO", cx2, rowY);
      cx2 += colWidths.status;
      doc.text("INICIO", cx2, rowY);
      cx2 += colWidths.start;
      doc.text("FIN", cx2, rowY);
      cx2 += colWidths.end;
      doc.text("DÍAS", cx2, rowY);
      cx2 += colWidths.days;
      doc.text("CRONOGRAMA VISUAL", cx2, rowY);
      rowY += 3;
    }

    const msAny = milestone as any;
    const isEven = idx % 2 === 0;

    // Row background
    if (isEven) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, rowY, contentW, rowH, "F");
    }

    // Bottom border
    doc.setDrawColor(230, 230, 235);
    doc.setLineWidth(0.1);
    doc.line(margin, rowY + rowH, margin + contentW, rowY + rowH);

    const statusColor = getStatusColor(milestone.status);
    const statusLabel = getStatusLabel(milestone.status);

    // Row data
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    
    let rx = margin + 2;
    
    // Number
    doc.setTextColor(...COLORS.textLight);
    doc.text(`${idx + 1}`, rx, rowY + 4.5);
    rx += colWidths.num;

    // Name (truncate if too long)
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    const nameText = milestone.name.length > 40 ? milestone.name.substring(0, 38) + "..." : milestone.name;
    doc.text(nameText, rx, rowY + 4.5);
    rx += colWidths.name;

    // Status badge
    doc.setFillColor(...statusColor);
    doc.roundedRect(rx, rowY + 1.2, 18, 4.5, 1, 1, "F");
    doc.setFontSize(5.5);
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.text(statusLabel, rx + 9, rowY + 4, { align: "center" });
    rx += colWidths.status;

    // Start date
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont("helvetica", "normal");
    const startDate = msAny.startDate
      ? new Date(msAny.startDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
      : new Date(milestone.dueDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
    doc.text(startDate, rx, rowY + 4.5);
    rx += colWidths.start;

    // End date
    let endDate: string;
    if (milestone.status === "completed" && milestone.completedDate) {
      endDate = new Date(milestone.completedDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
    } else if (msAny.endDate) {
      endDate = new Date(msAny.endDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
    } else {
      endDate = new Date(milestone.dueDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
    }
    doc.text(endDate, rx, rowY + 4.5);
    rx += colWidths.end;

    // Duration days
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    const durationDays = msAny.durationDays || "-";
    doc.text(`${durationDays}`, rx + 4, rowY + 4.5, { align: "center" });
    rx += colWidths.days;

    // Visual Gantt bar
    if (totalDuration > 0) {
      const msStart = msAny.startDate
        ? new Date(msAny.startDate).getTime()
        : new Date(milestone.dueDate).getTime();
      let msEnd: number;
      if (milestone.status === "completed" && milestone.completedDate) {
        msEnd = new Date(milestone.completedDate).getTime();
      } else if (msAny.endDate) {
        msEnd = new Date(msAny.endDate).getTime();
      } else {
        msEnd = msStart + 24 * 60 * 60 * 1000;
      }
      if (msEnd <= msStart) msEnd = msStart + 24 * 60 * 60 * 1000;

      const barStart = Math.max(0, (msStart - projectStartMs) / totalDuration);
      const barEnd = Math.min(1, (msEnd - projectStartMs) / totalDuration);
      const barX = barAreaX + barStart * barAreaW;
      const barW = Math.max(2, (barEnd - barStart) * barAreaW);

      // Bar track (light gray)
      doc.setFillColor(235, 235, 240);
      doc.roundedRect(barAreaX, rowY + 2, barAreaW, 3, 0.5, 0.5, "F");

      // Bar fill
      doc.setFillColor(...statusColor);
      doc.roundedRect(barX, rowY + 1.5, barW, 4, 1, 1, "F");

      // Progress overlay for in_progress
      if (milestone.status === "in_progress") {
        const progressW = barW * 0.5;
        const darkerColor: [number, number, number] = [
          Math.max(0, statusColor[0] - 30),
          Math.max(0, statusColor[1] - 30),
          Math.max(0, statusColor[2] - 30),
        ];
        doc.setFillColor(...darkerColor);
        doc.roundedRect(barX, rowY + 1.5, progressW, 4, 1, 1, "F");
      }
    }

    rowY += rowH;
  });

  // ═══════════════════════════════════════════════════════
  // LEGEND
  // ═══════════════════════════════════════════════════════
  const legendY = rowY + 6;
  
  // Check if legend fits on current page
  if (legendY + 12 > pageH - 10) {
    doc.addPage();
    rowY = margin;
  }

  const finalLegendY = legendY + 12 > pageH - 10 ? margin + 5 : legendY;

  drawRoundedRect(doc, margin, finalLegendY, contentW, 10, 2, COLORS.lightGray);
  
  const legendItems = [
    { label: "Completado", color: COLORS.green },
    { label: "En Progreso", color: COLORS.blue },
    { label: "Vencido", color: COLORS.red },
    { label: "Pendiente", color: COLORS.gray },
  ];

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textLight);
  doc.text("LEYENDA:", margin + 4, finalLegendY + 6);

  legendItems.forEach((item, i) => {
    const lx = margin + 28 + i * 36;
    doc.setFillColor(...item.color);
    doc.roundedRect(lx, finalLegendY + 3, 4, 4, 0.5, 0.5, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, lx + 6, finalLegendY + 6);
  });

  // ═══════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    
    // Footer line
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);

    // Footer text
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Solar Manager - Green House Project  |  ${projectName}  |  Diagrama de Gantt`,
      margin,
      pageH - 6
    );
    doc.text(
      `Página ${p} de ${totalPages}`,
      pageW - margin,
      pageH - 6,
      { align: "right" }
    );
  }

  // ═══════════════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════════════
  const fileName = `Gantt_${projectName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
