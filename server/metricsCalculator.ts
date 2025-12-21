/**
 * Calculador de métricas avanzadas y análisis predictivo
 */

import * as db from "./db";

export interface TeamVelocityMetric {
  month: string;
  milestonesCompleted: number;
  projectsCompleted: number;
  averageDaysPerMilestone: number;
}

export interface ProjectTypeMetric {
  projectTypeName: string;
  count: number;
  averageDurationDays: number;
  completionRate: number;
  averageProgress: number;
}

export interface PredictionResult {
  projectId: number;
  projectName: string;
  estimatedEndDate: Date;
  predictedEndDate: Date;
  daysDelay: number;
  confidence: number; // 0-100
}

/**
 * Calcular velocidad del equipo por mes (últimos 6 meses)
 */
export async function calculateTeamVelocity(): Promise<TeamVelocityMetric[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const allProjects = await db.getAllProjects();
  const allMilestones = await db.getAllMilestones();

  const metrics: TeamVelocityMetric[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - i);
    const monthStart = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1
    );
    const monthEnd = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0
    );

    // Hitos completados en el mes
    const completedMilestones = allMilestones.filter((m: any) => {
      if (!m.completedDate) return false;
      const completedDate = new Date(m.completedDate);
      return completedDate >= monthStart && completedDate <= monthEnd;
    });

    // Proyectos completados en el mes
    const completedProjects = allProjects.filter((p: any) => {
      if (!p.actualEndDate) return false;
      const endDate = new Date(p.actualEndDate);
      return endDate >= monthStart && endDate <= monthEnd;
    });

    // Calcular promedio de días por hito
    let totalDays = 0;
    completedMilestones.forEach((m: any) => {
      if (m.startDate && m.completedDate) {
        const start = new Date(m.startDate);
        const end = new Date(m.completedDate);
        const days = Math.ceil(
          (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
        );
        totalDays += days;
      }
    });

    const averageDays =
      completedMilestones.length > 0
        ? Math.round(totalDays / completedMilestones.length)
        : 0;

    metrics.push({
      month: monthDate.toLocaleDateString("es-ES", {
        month: "short",
        year: "numeric",
      }),
      milestonesCompleted: completedMilestones.length,
      projectsCompleted: completedProjects.length,
      averageDaysPerMilestone: averageDays,
    });
  }

  return metrics;
}

/**
 * Calcular métricas por tipo de proyecto
 */
export async function calculateProjectTypeMetrics(): Promise<
  ProjectTypeMetric[]
> {
  const projects = await db.getAllProjects();
  const projectTypes = await db.getAllProjectTypes();

  const metrics: ProjectTypeMetric[] = [];

  for (const type of projectTypes) {
    const typeProjects = projects.filter(
      (p: any) => p.projectTypeId === type.id
    );

    if (typeProjects.length === 0) continue;

    // Calcular duración promedio
    let totalDuration = 0;
    let completedCount = 0;

    typeProjects.forEach((p: any) => {
      if (p.actualEndDate) {
        const start = new Date(p.startDate);
        const end = new Date(p.actualEndDate);
        const days = Math.ceil(
          (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
        );
        totalDuration += days;
        completedCount++;
      }
    });

    const averageDuration =
      completedCount > 0
        ? Math.round(totalDuration / completedCount)
        : type.estimatedDurationDays || 0;

    const completionRate =
      typeProjects.length > 0
        ? Math.round((completedCount / typeProjects.length) * 100)
        : 0;

    // Calcular progreso promedio de todos los proyectos del tipo
    const totalProgress = typeProjects.reduce(
      (sum: number, p: any) => sum + (p.progressPercentage || 0),
      0
    );
    const averageProgress =
      typeProjects.length > 0
        ? Math.round(totalProgress / typeProjects.length)
        : 0;

    metrics.push({
      projectTypeName: type.name,
      count: typeProjects.length,
      averageDurationDays: averageDuration,
      completionRate,
      averageProgress,
    });
  }

  return metrics.sort((a, b) => b.count - a.count);
}

/**
 * Predecir fechas de finalización usando progreso actual y datos históricos
 */
export async function predictProjectCompletion(): Promise<PredictionResult[]> {
  const activeProjects = await db.getActiveProjects();
  const allProjects = await db.getAllProjects();
  const projectTypes = await db.getAllProjectTypes();
  const predictions: PredictionResult[] = [];

  for (const project of activeProjects) {
    // Obtener proyectos completados del mismo tipo
    const similarProjects = allProjects.filter(
      (p: any) =>
        p.projectTypeId === project.projectTypeId &&
        p.status === "completed" &&
        p.actualEndDate
    );

    // Calcular duración promedio de proyectos similares (si hay)
    let averageDuration = 0;
    if (similarProjects.length > 0) {
      let totalDuration = 0;
      similarProjects.forEach((p: any) => {
        const start = new Date(p.startDate);
        const end = new Date(p.actualEndDate!);
        const days = Math.ceil(
          (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
        );
        totalDuration += days;
      });
      averageDuration = totalDuration / similarProjects.length;
    } else {
      // Usar duración estimada del tipo de proyecto
      const projectType = projectTypes.find((t: any) => t.id === project.projectTypeId);
      averageDuration = projectType?.estimatedDurationDays || 30;
    }

    // Calcular progreso actual del proyecto
    const projectStart = new Date(project.startDate);
    const now = new Date();
    const daysElapsed = Math.ceil(
      (now.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Predecir fecha de finalización basada en progreso
    const progress = project.progressPercentage || 0;
    let predictedTotalDays: number;

    if (progress > 5) {
      // Usar progreso actual para estimar (solo si hay progreso significativo)
      predictedTotalDays = Math.round((daysElapsed / progress) * 100);
    } else {
      // Usar promedio histórico o duración estimada del tipo
      predictedTotalDays = Math.round(averageDuration);
    }

    const predictedEndDate = new Date(projectStart);
    predictedEndDate.setDate(predictedEndDate.getDate() + predictedTotalDays);

    const estimatedEndDate = new Date(project.estimatedEndDate);
    const daysDelay = Math.ceil(
      (predictedEndDate.getTime() - estimatedEndDate.getTime()) /
        (24 * 60 * 60 * 1000)
    );

    // Calcular confianza basada en progreso y datos históricos
    let confidence = 30; // Base confidence
    if (similarProjects.length > 0) {
      confidence += Math.min(40, similarProjects.length * 10); // +10% por cada proyecto similar, max 40%
    }
    if (progress > 20) {
      confidence += Math.min(30, Math.round(progress / 3)); // +1% por cada 3% de progreso, max 30%
    }
    confidence = Math.min(100, confidence);

    predictions.push({
      projectId: project.id,
      projectName: project.name,
      estimatedEndDate,
      predictedEndDate,
      daysDelay,
      confidence,
    });
  }

  return predictions.sort((a, b) => b.daysDelay - a.daysDelay);
}

/**
 * Calcular estadísticas generales del dashboard
 */
export async function calculateDashboardStats() {
  const projects = await db.getAllProjects();
  const milestones = await db.getAllMilestones();

  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p: any) => p.status === "in_progress"
  ).length;
  const completedProjects = projects.filter(
    (p: any) => p.status === "completed"
  ).length;
  const delayedProjects = projects.filter((p: any) => {
    if (p.status === "completed" || p.status === "cancelled") return false;
    const endDate = new Date(p.estimatedEndDate);
    return endDate < new Date();
  }).length;

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(
    (m: any) => m.status === "completed"
  ).length;
  
  // Calcular hitos vencidos: pendientes con fecha de vencimiento pasada
  const now = new Date();
  const overdueMilestones = milestones.filter((m: any) => {
    if (m.status === "completed") return false;
    const dueDate = new Date(m.dueDate);
    return dueDate < now;
  }).length;

  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce(
            (sum: number, p: any) => sum + (p.progressPercentage || 0),
            0
          ) / projects.length
        )
      : 0;

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    delayedProjects,
    totalMilestones,
    completedMilestones,
    overdueMilestones,
    averageProgress,
  };
}
