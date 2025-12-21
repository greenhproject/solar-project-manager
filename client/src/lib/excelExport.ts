import * as XLSX from "xlsx";

interface CompanyInfo {
  companyName?: string;
  nit?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

/**
 * Agrega encabezado de empresa a los datos del Excel
 */
function addCompanyHeader(data: any[][], company?: CompanyInfo | null): any[][] {
  if (!company || !company.companyName) {
    return data;
  }

  const header = [
    [company.companyName],
    company.nit ? [`NIT: ${company.nit}`] : [],
    company.address ? [company.address] : [],
    [
      [company.phone, company.email, company.website]
        .filter(Boolean)
        .join(" | ")
    ].filter(v => v),
    [], // Línea en blanco
  ].filter(row => row.length > 0);

  return [...header, ...data];
}

/**
 * Exportar datos del diagrama de Gantt a Excel
 */
export function exportGanttToExcel(
  projectName: string,
  milestones: any[],
  projectStartDate: Date,
  projectEndDate: Date,
  company?: CompanyInfo | null
) {
  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Preparar datos para la hoja
  let data: any[][] = [
    ["CRONOGRAMA DE ACTIVIDADES"],
    ["PROYECTO", projectName],
    ["FECHA INICIO", projectStartDate.toLocaleDateString("es-ES")],
    ["FECHA FIN ESTIMADA", projectEndDate.toLocaleDateString("es-ES")],
    [],
    ["TAREA", "ESTADO", "DÍAS", "PROGRESO", "INICIO", "FINAL", "NOTAS"],
  ];

  // Agregar encabezado de empresa
  data = addCompanyHeader(data, company);

  // Agregar hitos
  milestones.forEach(milestone => {
    const progress =
      milestone.status === "completed"
        ? 100
        : milestone.status === "in_progress"
          ? 50
          : milestone.status === "overdue"
            ? 25
            : 0;

    const startDate = new Date(milestone.dueDate);
    const endDate = milestone.completedDate
      ? new Date(milestone.completedDate)
      : new Date(milestone.dueDate);

    const days =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      ) || 1;

    const statusText =
      (
        {
          completed: "Completado",
          in_progress: "En Progreso",
          overdue: "Vencido",
          pending: "Pendiente",
        } as any
      )[milestone.status] || "Pendiente";

    data.push([
      milestone.name,
      statusText,
      days,
      `${progress}%`,
      startDate.toLocaleDateString("es-ES"),
      endDate.toLocaleDateString("es-ES"),
      milestone.notes || "",
    ]);
  });

  // Crear hoja de cálculo
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Aplicar estilos básicos (anchos de columna)
  ws["!cols"] = [
    { wch: 40 }, // TAREA
    { wch: 15 }, // ESTADO
    { wch: 10 }, // DÍAS
    { wch: 12 }, // PROGRESO
    { wch: 15 }, // INICIO
    { wch: 15 }, // FINAL
    { wch: 30 }, // NOTAS
  ];

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(wb, ws, "Cronograma");

  // Generar archivo y descargar
  const fileName = `Cronograma_${projectName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exportar datos del calendario a Excel
 */
export function exportCalendarToExcel(
  projects: any[],
  milestones: any[],
  startDate: Date,
  endDate: Date,
  company?: CompanyInfo | null
) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen de Proyectos
  let projectData: any[][] = [
    ["RESUMEN DE PROYECTOS"],
    [
      "PERÍODO",
      `${startDate.toLocaleDateString("es-ES")} - ${endDate.toLocaleDateString("es-ES")}`,
    ],
    [],
    ["PROYECTO", "TIPO", "ESTADO", "FECHA INICIO", "FECHA FIN", "PROGRESO"],
  ];

  // Agregar encabezado de empresa
  projectData = addCompanyHeader(projectData, company);

  projects.forEach(project => {
    const statusText =
      (
        {
          planning: "Planificación",
          in_progress: "En Progreso",
          completed: "Completado",
          on_hold: "En Espera",
          cancelled: "Cancelado",
        } as any
      )[project.status] || "Desconocido";

    projectData.push([
      project.name,
      project.projectType?.name || "N/A",
      statusText,
      new Date(project.startDate).toLocaleDateString("es-ES"),
      new Date(project.estimatedEndDate).toLocaleDateString("es-ES"),
      `${project.progress || 0}%`,
    ]);
  });

  const wsProjects = XLSX.utils.aoa_to_sheet(projectData);
  wsProjects["!cols"] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsProjects, "Proyectos");

  // Hoja 2: Hitos
  let milestoneData: any[][] = [
    ["HITOS DEL PERÍODO"],
    [
      "PERÍODO",
      `${startDate.toLocaleDateString("es-ES")} - ${endDate.toLocaleDateString("es-ES")}`,
    ],
    [],
    ["HITO", "PROYECTO", "ESTADO", "FECHA VENCIMIENTO", "FECHA COMPLETADO"],
  ];

  // Agregar encabezado de empresa
  milestoneData = addCompanyHeader(milestoneData, company);

  milestones.forEach(milestone => {
    const project = projects.find(p => p.id === milestone.projectId);
    const statusText =
      (
        {
          completed: "Completado",
          in_progress: "En Progreso",
          overdue: "Vencido",
          pending: "Pendiente",
        } as any
      )[milestone.status] || "Pendiente";

    milestoneData.push([
      milestone.name,
      project?.name || "N/A",
      statusText,
      new Date(milestone.dueDate).toLocaleDateString("es-ES"),
      milestone.completedDate
        ? new Date(milestone.completedDate).toLocaleDateString("es-ES")
        : "N/A",
    ]);
  });

  const wsMilestones = XLSX.utils.aoa_to_sheet(milestoneData);
  wsMilestones["!cols"] = [
    { wch: 40 },
    { wch: 30 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMilestones, "Hitos");

  // Generar archivo y descargar
  const fileName = `Calendario_Proyectos_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exportar reporte completo de proyecto individual
 */
export function exportProjectReport(
  project: any,
  milestones: any[],
  attachments: any[],
  company?: CompanyInfo | null
) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Información del Proyecto
  let projectInfo: any[][] = [
    ["REPORTE DE PROYECTO"],
    [],
    ["Nombre", project.name],
    ["Descripción", project.description || "N/A"],
    ["Tipo", project.projectType?.name || "N/A"],
    ["Estado", project.status],
    ["Cliente", project.clientName || "N/A"],
    ["Ubicación", project.location || "N/A"],
    ["Fecha Inicio", new Date(project.startDate).toLocaleDateString("es-ES")],
    [
      "Fecha Fin Estimada",
      new Date(project.estimatedEndDate).toLocaleDateString("es-ES"),
    ],
    ["Progreso", `${project.progress || 0}%`],
    [],
    ["HITOS"],
    ["Nombre", "Estado", "Fecha Vencimiento", "Completado", "Notas"],
  ];

  // Agregar encabezado de empresa
  projectInfo = addCompanyHeader(projectInfo, company);

  milestones.forEach(milestone => {
    const statusText =
      (
        {
          completed: "Completado",
          in_progress: "En Progreso",
          overdue: "Vencido",
          pending: "Pendiente",
        } as any
      )[milestone.status] || "Pendiente";

    projectInfo.push([
      milestone.name,
      statusText,
      new Date(milestone.dueDate).toLocaleDateString("es-ES"),
      milestone.completedDate
        ? new Date(milestone.completedDate).toLocaleDateString("es-ES")
        : "N/A",
      milestone.notes || "",
    ]);
  });

  const wsProject = XLSX.utils.aoa_to_sheet(projectInfo);
  wsProject["!cols"] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsProject, "Información");

  // Hoja 2: Archivos Adjuntos (si existen)
  if (attachments && attachments.length > 0) {
    let attachmentData: any[][] = [
      ["ARCHIVOS ADJUNTOS"],
      [],
      ["Nombre", "Tipo", "Fecha de Subida", "URL"],
    ];

    // Agregar encabezado de empresa
    attachmentData = addCompanyHeader(attachmentData, company);

    attachments.forEach(attachment => {
      attachmentData.push([
        attachment.fileName,
        attachment.fileType || "N/A",
        new Date(attachment.uploadedAt).toLocaleDateString("es-ES"),
        attachment.fileUrl,
      ]);
    });

    const wsAttachments = XLSX.utils.aoa_to_sheet(attachmentData);
    wsAttachments["!cols"] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 18 },
      { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAttachments, "Archivos");
  }

  // Generar archivo y descargar
  const fileName = `Reporte_${project.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
