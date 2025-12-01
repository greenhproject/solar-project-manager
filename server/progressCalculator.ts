import * as db from "./db";

/**
 * Recalcula el progreso de un proyecto basado en sus hitos completados
 * @param projectId ID del proyecto
 * @returns El nuevo porcentaje de progreso
 */
export async function recalculateProjectProgress(
  projectId: number
): Promise<number> {
  // Obtener todos los hitos del proyecto
  const milestones = await db.getMilestonesByProjectId(projectId);

  console.log(
    `[Progress] Project ${projectId}: ${milestones.length} milestones found`
  );

  if (milestones.length === 0) {
    await db.updateProject(projectId, { progressPercentage: 0 });
    return 0;
  }

  // Obtener progreso anterior
  const project = await db.getProjectById(projectId);
  const previousProgress = project?.progressPercentage || 0;

  // Contar hitos completados
  const completedMilestones = milestones.filter(
    m => m.status === "completed"
  ).length;

  console.log(
    `[Progress] Project ${projectId}: ${completedMilestones}/${milestones.length} completed`
  );

  // Calcular porcentaje
  const progressPercentage = Math.round(
    (completedMilestones / milestones.length) * 100
  );

  console.log(
    `[Progress] Project ${projectId}: ${progressPercentage}% progress`
  );

  // Determinar el nuevo estado basado en el progreso
  let newStatus: "planning" | "in_progress" | "completed" | "on_hold" | "cancelled" = "in_progress";
  
  if (progressPercentage === 0) {
    newStatus = "planning";
  } else if (progressPercentage === 100) {
    newStatus = "completed";
  } else {
    newStatus = "in_progress";
  }

  console.log(
    `[Progress] Project ${projectId}: Updating status to ${newStatus}`
  );

  // Preparar datos de actualización
  const updateData: any = {
    progressPercentage,
    status: newStatus
  };

  // Si el proyecto se completa y no tiene actualEndDate, usar fecha actual
  if (newStatus === "completed" && !project?.actualEndDate) {
    updateData.actualEndDate = new Date();
    console.log(`[Progress] Project ${projectId}: Setting actualEndDate to now`);
  }

  // Actualizar el proyecto con progreso, estado y fecha de fin
  await db.updateProject(projectId, updateData);

  // Si el proyecto acaba de completarse (pasó de <100% a 100%), enviar notificación
  if (previousProgress < 100 && progressPercentage === 100 && project) {
    try {
      const { notifyOwner } = await import("./_core/notification");

      // Calcular duración total
      const startDate = new Date(project.startDate);
      const endDate = new Date();
      const durationDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      await notifyOwner({
        title: `¡Proyecto Completado! 🎉`,
        content:
          `El proyecto "${project.name}" ha alcanzado el 100% de completitud.\n\n` +
          `📅 Duración total: ${durationDays} días\n` +
          `📍 Ubicación: ${project.location || "No especificada"}\n` +
          `👥 Cliente: ${project.clientName || "No especificado"}\n\n` +
          `Próximos pasos sugeridos:\n` +
          `- Revisar documentación final\n` +
          `- Programar inspección de cierre\n` +
          `- Preparar informe de entrega\n` +
          `- Solicitar feedback del cliente`,
      });

      console.log(
        `[Progress] Notification sent for completed project ${projectId}`
      );
    } catch (error) {
      console.error(
        `[Progress] Failed to send notification for project ${projectId}:`,
        error
      );
    }
  }

  return progressPercentage;
}

/**
 * Recalcula el progreso de todos los proyectos activos
 */
export async function recalculateAllProjectsProgress(): Promise<void> {
  const projects = await db.getAllProjects();

  for (const project of projects) {
    if (project.status !== "completed" && project.status !== "cancelled") {
      await recalculateProjectProgress(project.id);
    }
  }
}
