/**
 * Calculador de métricas avanzadas y análisis predictivo
 * 
 * LÓGICA DE FILTRADO POR INGENIERO:
 * - Cuando se filtra por engineerId, SOLO se consideran hitos donde assignedUserId === engineerId
 * - Los proyectos relevantes son aquellos que contienen al menos un hito asignado al ingeniero
 * - El progreso promedio se calcula solo sobre esos proyectos relevantes
 * - Los hitos vencidos son solo los asignados al ingeniero con dueDate < now
 */

import * as db from "./db";
import { getNowInConfiguredTimezone } from "./timezone";

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
}

export interface PredictionResult {
  projectId: number;
  projectName: string;
  estimatedEndDate: Date;
  predictedEndDate: Date;
  daysDelay: number;
  confidence: number; // 0-100
}

export interface EngineerScore {
  engineerId: number;
  engineerName: string;
  month: string; // "2026-05"
  score: number; // 0-100
  metrics: {
    totalAssigned: number;
    completedOnTime: number;
    completedLate: number;
    overdue: number;
    averageDaysToComplete: number;
    onTimeRate: number; // porcentaje
    completionRate: number; // porcentaje
  };
  level: "excelente" | "bueno" | "regular" | "necesita_mejora";
}

/**
 * Obtiene los hitos filtrados por ingeniero (SOLO por assignedUserId)
 */
function getEngineerMilestones(allMilestones: any[], engineerId?: number): any[] {
  if (!engineerId) return allMilestones;
  return allMilestones.filter((m: any) => m.assignedUserId === engineerId);
}

/**
 * Obtiene los proyectos relevantes para un ingeniero
 * (proyectos que tienen al menos un hito asignado al ingeniero)
 */
function getEngineerProjects(allProjects: any[], allMilestones: any[], engineerId?: number): any[] {
  if (!engineerId) return allProjects;
  
  // Obtener IDs de proyectos donde el ingeniero tiene hitos asignados
  const projectIdsWithEngineerMilestones = new Set(
    allMilestones
      .filter((m: any) => m.assignedUserId === engineerId)
      .map((m: any) => m.projectId)
  );
  
  return allProjects.filter((p: any) => projectIdsWithEngineerMilestones.has(p.id));
}

/**
 * Calcular velocidad del equipo por mes (últimos 6 meses)
 */
export async function calculateTeamVelocity(engineerId?: number): Promise<TeamVelocityMetric[]> {
  const allProjects = await db.getAllProjects();
  const allMilestones = await db.getAllMilestones();

  const filteredMilestones = getEngineerMilestones(allMilestones, engineerId);
  const filteredProjects = getEngineerProjects(allProjects, allMilestones, engineerId);

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

    // Hitos completados en el mes (solo los del ingeniero)
    const completedMilestones = filteredMilestones.filter((m: any) => {
      if (!m.completedDate) return false;
      const completedDate = new Date(m.completedDate);
      return completedDate >= monthStart && completedDate <= monthEnd;
    });

    // Proyectos completados en el mes (solo los relevantes al ingeniero)
    const completedProjects = filteredProjects.filter((p: any) => {
      if (!p.actualEndDate) return false;
      const endDate = new Date(p.actualEndDate);
      return endDate >= monthStart && endDate <= monthEnd;
    });

    // Calcular promedio de días por hito
    let totalDays = 0;
    let countWithDates = 0;
    completedMilestones.forEach((m: any) => {
      if (m.startDate && m.completedDate) {
        const start = new Date(m.startDate);
        const end = new Date(m.completedDate);
        const days = Math.ceil(
          (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
        );
        totalDays += days;
        countWithDates++;
      }
    });

    const averageDays = countWithDates > 0 ? Math.round(totalDays / countWithDates) : 0;

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
export async function calculateProjectTypeMetrics(engineerId?: number): Promise<ProjectTypeMetric[]> {
  const allProjects = await db.getAllProjects();
  const allMilestones = await db.getAllMilestones();
  const projectTypes = await db.getAllProjectTypes();

  const filteredProjects = getEngineerProjects(allProjects, allMilestones, engineerId);
  const metrics: ProjectTypeMetric[] = [];

  for (const type of projectTypes) {
    const typeProjects = filteredProjects.filter(
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

    metrics.push({
      projectTypeName: type.name,
      count: typeProjects.length,
      averageDurationDays: averageDuration,
      completionRate,
    });
  }

  return metrics.sort((a, b) => b.count - a.count);
}

/**
 * Predecir fechas de finalización usando datos históricos
 */
export async function predictProjectCompletion(engineerId?: number): Promise<PredictionResult[]> {
  const allActiveProjects = await db.getActiveProjects();
  const allProjects = await db.getAllProjects();
  const allMilestones = await db.getAllMilestones();

  const activeProjects = getEngineerProjects(allActiveProjects, allMilestones, engineerId);
  const predictions: PredictionResult[] = [];

  for (const project of activeProjects) {
    // Obtener proyectos completados del mismo tipo
    const similarProjects = allProjects.filter(
      (p: any) =>
        p.projectTypeId === project.projectTypeId &&
        p.status === "completed" &&
        p.actualEndDate
    );

    if (similarProjects.length === 0) {
      continue;
    }

    // Calcular duración promedio de proyectos similares
    let totalDuration = 0;
    similarProjects.forEach((p: any) => {
      const start = new Date(p.startDate);
      const end = new Date(p.actualEndDate!);
      const days = Math.ceil(
        (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
      );
      totalDuration += days;
    });

    const averageDuration = totalDuration / similarProjects.length;

    // Calcular progreso actual del proyecto
    const projectStart = new Date(project.startDate);
    const now = new Date();
    const daysElapsed = Math.ceil(
      (now.getTime() - projectStart.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Predecir fecha de finalización basada en progreso
    const progress = project.progressPercentage || 0;
    let predictedTotalDays: number;

    if (progress > 0) {
      predictedTotalDays = Math.round((daysElapsed / progress) * 100);
    } else {
      predictedTotalDays = Math.round(averageDuration);
    }

    const predictedEndDate = new Date(projectStart);
    predictedEndDate.setDate(predictedEndDate.getDate() + predictedTotalDays);

    const estimatedEndDate = new Date(project.estimatedEndDate);
    const daysDelay = Math.ceil(
      (predictedEndDate.getTime() - estimatedEndDate.getTime()) /
        (24 * 60 * 60 * 1000)
    );

    // Calcular confianza basada en cantidad de datos históricos
    const confidence = Math.min(
      100,
      Math.round((similarProjects.length / 5) * 100)
    );

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
 * 
 * Cuando se filtra por engineerId:
 * - totalMilestones: solo hitos asignados al ingeniero
 * - completedMilestones: solo hitos del ingeniero con status completed
 * - overdueMilestones: solo hitos del ingeniero con dueDate < now y status pending/in_progress/overdue
 * - activeProjects: proyectos activos donde el ingeniero tiene hitos
 * - averageProgress: progreso promedio de proyectos donde el ingeniero tiene hitos
 */
export async function calculateDashboardStats(engineerId?: number) {
  const allProjects = await db.getAllProjects();
  const allMilestones = await db.getAllMilestones();

  const milestones = getEngineerMilestones(allMilestones, engineerId);
  const projects = getEngineerProjects(allProjects, allMilestones, engineerId);

  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p: any) => p.status === "in_progress" || p.status === "planning"
  ).length;
  const completedProjects = projects.filter(
    (p: any) => p.status === "completed"
  ).length;
  
  // Proyectos retrasados: proyectos del ingeniero que tienen hitos vencidos del ingeniero
  const now = await getNowInConfiguredTimezone();
  const startOfToday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0
  ));
  const projectsWithOverdueMilestones = new Set(
    milestones
      .filter((m: any) => {
        if (m.status === "completed" || m.status === "cancelled") return false;
        if (!m.dueDate) return false;
        return new Date(m.dueDate) < startOfToday;
      })
      .map((m: any) => m.projectId)
  );
  const delayedProjects = projects.filter((p: any) => {
    if (p.status === "completed" || p.status === "cancelled") return false;
    return projectsWithOverdueMilestones.has(p.id);
  }).length;

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(
    (m: any) => m.status === "completed"
  ).length;
  
  // Hitos vencidos: dueDate es ANTES de hoy Y status es pending/in_progress/overdue
  const overdueMilestones = milestones.filter(
    (m: any) => {
      if (m.status === "completed" || m.status === "cancelled") return false;
      if (!m.dueDate) return false;
      const dueDate = new Date(m.dueDate);
      return dueDate < startOfToday && (m.status === "pending" || m.status === "in_progress" || m.status === "overdue");
    }
  ).length;

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

/**
 * Calcular Score de Desempeño para un ingeniero en un mes específico
 * 
 * FÓRMULA DEL SCORE (0-100):
 * - Tasa de completación a tiempo: 40% del score
 *   (hitos completados antes o en la fecha de vencimiento / total completados)
 * - Tasa de completación general: 30% del score
 *   (hitos completados / total asignados que debían completarse en el mes)
 * - Hitos sin vencer: 20% del score
 *   (1 - hitos vencidos actualmente / total asignados activos)
 * - Velocidad: 10% del score
 *   (basado en promedio de días para completar vs duración estimada)
 * 
 * NIVELES:
 * - 80-100: Excelente
 * - 60-79: Bueno
 * - 40-59: Regular
 * - 0-39: Necesita mejora
 */
export async function calculateEngineerScore(engineerId: number, monthDate?: Date): Promise<EngineerScore | null> {
  const allMilestones = await db.getAllMilestones();
  const users = await db.getAllUsers();
  
  const engineer = users.find((u: any) => u.id === engineerId);
  if (!engineer) return null;

  const targetDate = monthDate || new Date();
  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
  const now = await getNowInConfiguredTimezone();
  const startOfTodayScore = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0
  ));

  // Hitos asignados al ingeniero
  const engineerMilestones = allMilestones.filter((m: any) => m.assignedUserId === engineerId);
  
  // Hitos que debían completarse en este mes (dueDate dentro del mes)
  const milestonesForMonth = engineerMilestones.filter((m: any) => {
    if (!m.dueDate) return false;
    const due = new Date(m.dueDate);
    return due >= monthStart && due <= monthEnd;
  });

  // Hitos completados en este mes
  const completedInMonth = engineerMilestones.filter((m: any) => {
    if (!m.completedDate) return false;
    const completed = new Date(m.completedDate);
    return completed >= monthStart && completed <= monthEnd;
  });

  // Hitos completados a tiempo (completedDate <= dueDate)
  const completedOnTime = completedInMonth.filter((m: any) => {
    if (!m.dueDate || !m.completedDate) return false;
    return new Date(m.completedDate) <= new Date(m.dueDate);
  });

  // Hitos completados tarde
  const completedLate = completedInMonth.filter((m: any) => {
    if (!m.dueDate || !m.completedDate) return false;
    return new Date(m.completedDate) > new Date(m.dueDate);
  });

  // Hitos actualmente vencidos (no completados, dueDate es ANTES de hoy)
  const currentlyOverdue = engineerMilestones.filter((m: any) => {
    if (m.status === "completed" || m.status === "cancelled") return false;
    if (!m.dueDate) return false;
    return new Date(m.dueDate) < startOfTodayScore;
  });

  // Hitos activos (no completados, no cancelados)
  const activeMilestones = engineerMilestones.filter((m: any) => 
    m.status !== "completed" && m.status !== "cancelled"
  );

  // Calcular promedio de días para completar
  let totalDaysToComplete = 0;
  let countCompleted = 0;
  completedInMonth.forEach((m: any) => {
    if (m.startDate && m.completedDate) {
      const start = new Date(m.startDate);
      const end = new Date(m.completedDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      totalDaysToComplete += days;
      countCompleted++;
    }
  });
  const averageDaysToComplete = countCompleted > 0 ? Math.round(totalDaysToComplete / countCompleted) : 0;

  // CALCULAR SCORE
  const totalAssigned = milestonesForMonth.length + activeMilestones.length;
  
  // Si no tiene hitos asignados ni activos, no hay datos suficientes para evaluar
  if (totalAssigned === 0 && completedInMonth.length === 0 && currentlyOverdue.length === 0) {
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;
    return {
      engineerId,
      engineerName: engineer.name || engineer.email || `Ingeniero ${engineerId}`,
      month: monthStr,
      score: -1, // -1 indica "sin datos suficientes"
      metrics: {
        totalAssigned: 0,
        completedOnTime: 0,
        completedLate: 0,
        overdue: 0,
        averageDaysToComplete: 0,
        onTimeRate: 0,
        completionRate: 0,
      },
      level: "regular" as const,
    };
  }

  // 1. Tasa de completación a tiempo (40%)
  const onTimeRate = completedInMonth.length > 0 
    ? (completedOnTime.length / completedInMonth.length) * 100 
    : (milestonesForMonth.length === 0 && currentlyOverdue.length === 0 ? 100 : 0);
  const onTimeScore = (onTimeRate / 100) * 40;

  // 2. Tasa de completación general (30%)
  const completionRate = milestonesForMonth.length > 0
    ? (completedInMonth.length / milestonesForMonth.length) * 100
    : (completedInMonth.length > 0 ? 100 : 0);
  const completionScore = Math.min((completionRate / 100) * 30, 30);

  // 3. Hitos sin vencer (20%)
  const totalActive = activeMilestones.length;
  const overdueRate = totalActive > 0 ? currentlyOverdue.length / totalActive : 0;
  const noOverdueScore = (1 - overdueRate) * 20;

  // 4. Velocidad bonus (10%) - completar más rápido que el promedio
  let velocityScore = 5; // Base neutral
  if (countCompleted > 0 && milestonesForMonth.length > 0) {
    // Comparar días promedio vs duración estimada promedio
    let totalEstimatedDays = 0;
    let countWithDuration = 0;
    completedInMonth.forEach((m: any) => {
      if (m.durationDays) {
        totalEstimatedDays += m.durationDays;
        countWithDuration++;
      }
    });
    if (countWithDuration > 0) {
      const avgEstimated = totalEstimatedDays / countWithDuration;
      if (averageDaysToComplete <= avgEstimated) {
        velocityScore = 10; // Completó más rápido o igual que lo estimado
      } else {
        velocityScore = Math.max(0, 10 - ((averageDaysToComplete - avgEstimated) / avgEstimated) * 10);
      }
    }
  }

  const totalScore = Math.round(Math.min(100, Math.max(0, onTimeScore + completionScore + noOverdueScore + velocityScore)));

  // Determinar nivel
  let level: "excelente" | "bueno" | "regular" | "necesita_mejora";
  if (totalScore >= 80) level = "excelente";
  else if (totalScore >= 60) level = "bueno";
  else if (totalScore >= 40) level = "regular";
  else level = "necesita_mejora";

  const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;

  return {
    engineerId,
    engineerName: engineer.name || engineer.email || `Ingeniero ${engineerId}`,
    month: monthStr,
    score: totalScore,
    metrics: {
      totalAssigned: milestonesForMonth.length,
      completedOnTime: completedOnTime.length,
      completedLate: completedLate.length,
      overdue: currentlyOverdue.length,
      averageDaysToComplete,
      onTimeRate: Math.round(onTimeRate),
      completionRate: Math.round(completionRate),
    },
    level,
  };
}

/**
 * Calcular scores de todos los ingenieros para un mes
 */
export async function calculateAllEngineerScores(monthDate?: Date): Promise<EngineerScore[]> {
  const users = await db.getAllUsers();
  const engineers = users.filter((u: any) => 
    u.role === "user" || u.role === "admin" || u.role === "ingeniero_tramites"
  );

  const scores: EngineerScore[] = [];
  for (const eng of engineers) {
    const score = await calculateEngineerScore(eng.id, monthDate);
    if (score && score.metrics.totalAssigned > 0) {
      scores.push(score);
    }
  }

  return scores.sort((a, b) => b.score - a.score);
}
