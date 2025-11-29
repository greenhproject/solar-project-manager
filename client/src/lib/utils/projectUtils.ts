/**
 * Utilidades compartidas para la gestión de proyectos
 * Centraliza funciones reutilizables relacionadas con proyectos
 */

/**
 * Tipo de estado de proyecto
 */
export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "cancelled";

/**
 * Tipo de estado de hito
 */
export type MilestoneStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "delayed";

/**
 * Tipo de variante de badge
 */
export type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive";

/**
 * Configuración de badge para un estado
 */
export interface BadgeConfig {
  label: string;
  variant: BadgeVariant;
}

/**
 * Obtiene la configuración de badge según el estado del proyecto
 * @param status - Estado del proyecto
 * @returns Configuración del badge (label y variant)
 */
export function getStatusBadgeConfig(status: ProjectStatus): BadgeConfig {
  const statusConfig: Record<ProjectStatus, BadgeConfig> = {
    planning: { label: "Planificación", variant: "secondary" },
    in_progress: { label: "En Progreso", variant: "default" },
    completed: { label: "Completado", variant: "success" },
    on_hold: { label: "En Espera", variant: "warning" },
    cancelled: { label: "Cancelado", variant: "destructive" },
  };

  return statusConfig[status] || statusConfig.planning;
}

/**
 * Obtiene la configuración de badge según el estado del hito
 * @param status - Estado del hito
 * @returns Configuración del badge (label y variant)
 */
export function getMilestoneStatusBadgeConfig(
  status: MilestoneStatus
): BadgeConfig {
  const statusConfig: Record<MilestoneStatus, BadgeConfig> = {
    pending: { label: "Pendiente", variant: "secondary" },
    in_progress: { label: "En Progreso", variant: "default" },
    completed: { label: "Completado", variant: "success" },
    delayed: { label: "Retrasado", variant: "destructive" },
  };

  return statusConfig[status] || statusConfig.pending;
}

/**
 * Obtiene el color asociado a un estado de proyecto
 * @param status - Estado del proyecto
 * @returns Color en formato hexadecimal
 */
export function getProjectStatusColor(status: ProjectStatus): string {
  const colors = {
    planning: "#6B7280", // Gris
    in_progress: "#3B82F6", // Azul
    completed: "#10B981", // Verde
    on_hold: "#F59E0B", // Ámbar
    cancelled: "#EF4444", // Rojo
  };

  return colors[status] || colors.planning;
}

/**
 * Obtiene el texto legible de un estado de proyecto
 * @param status - Estado del proyecto
 * @returns Texto descriptivo del estado
 */
export function getProjectStatusText(status: ProjectStatus): string {
  const texts = {
    planning: "Planificación",
    in_progress: "En Progreso",
    completed: "Completado",
    on_hold: "En Espera",
    cancelled: "Cancelado",
  };

  return texts[status] || "Desconocido";
}

/**
 * Calcula el porcentaje de progreso basado en hitos completados
 * @param completedMilestones - Número de hitos completados
 * @param totalMilestones - Número total de hitos
 * @returns Porcentaje de progreso (0-100)
 */
export function calculateProgress(
  completedMilestones: number,
  totalMilestones: number
): number {
  if (totalMilestones === 0) return 0;
  return Math.round((completedMilestones / totalMilestones) * 100);
}

/**
 * Determina si un proyecto está retrasado
 * @param status - Estado del proyecto
 * @param endDate - Fecha de finalización estimada
 * @param progress - Progreso actual (0-100)
 * @returns true si el proyecto está retrasado
 */
export function isProjectDelayed(
  status: ProjectStatus,
  endDate: Date | string | null,
  progress: number
): boolean {
  if (status === "completed" || status === "cancelled") return false;
  if (!endDate) return false;

  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const now = new Date();

  // Si ya pasó la fecha de finalización y no está completado
  if (end < now && progress < 100) return true;

  // Si está cerca de la fecha de finalización pero el progreso es bajo
  const daysUntilEnd = Math.ceil(
    (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntilEnd > 0 && daysUntilEnd < 7 && progress < 80) return true;

  return false;
}
