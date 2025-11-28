import * as db from "./db";

/**
 * Recalcula el progreso de un proyecto basado en sus hitos completados
 * @param projectId ID del proyecto
 * @returns El nuevo porcentaje de progreso
 */
export async function recalculateProjectProgress(projectId: number): Promise<number> {
  // Obtener todos los hitos del proyecto
  const milestones = await db.getMilestonesByProjectId(projectId);
  
  console.log(`[Progress] Project ${projectId}: ${milestones.length} milestones found`);
  
  if (milestones.length === 0) {
    await db.updateProject(projectId, { progressPercentage: 0 });
    return 0;
  }
  
  // Contar hitos completados
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  
  console.log(`[Progress] Project ${projectId}: ${completedMilestones}/${milestones.length} completed`);
  
  // Calcular porcentaje
  const progressPercentage = Math.round((completedMilestones / milestones.length) * 100);
  
  console.log(`[Progress] Project ${projectId}: ${progressPercentage}% progress`);
  
  // Actualizar el proyecto
  await db.updateProject(projectId, { progressPercentage });
  
  return progressPercentage;
}

/**
 * Recalcula el progreso de todos los proyectos activos
 */
export async function recalculateAllProjectsProgress(): Promise<void> {
  const projects = await db.getAllProjects();
  
  for (const project of projects) {
    if (project.status !== 'completed' && project.status !== 'cancelled') {
      await recalculateProjectProgress(project.id);
    }
  }
}
