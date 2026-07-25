/**
 * Utilidad para cálculo de días hábiles
 * Por defecto excluye sábados y domingos
 * Configurable para incluir fines de semana
 */

/**
 * Agrega N días hábiles a una fecha
 * Si includeWeekends es true, agrega días calendario normales
 */
export function addBusinessDays(
  startDate: Date,
  days: number,
  includeWeekends: boolean = false
): Date {
  const result = new Date(startDate);
  
  if (includeWeekends) {
    result.setDate(result.getDate() + days);
    return result;
  }

  let addedDays = 0;
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  return result;
}

/**
 * Calcula la cantidad de días hábiles entre dos fechas
 * Si includeWeekends es true, retorna días calendario
 */
export function getBusinessDaysBetween(
  startDate: Date,
  endDate: Date,
  includeWeekends: boolean = false
): number {
  if (includeWeekends) {
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  let count = 0;
  const current = new Date(startDate);
  while (current < endDate) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count;
}

/**
 * Calcula la fecha de fin dado una fecha de inicio y duración en días hábiles
 */
export function calculateEndDate(
  startDate: Date | string,
  durationDays: number,
  includeWeekends: boolean = false
): Date {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  return addBusinessDays(start, durationDays, includeWeekends);
}

/**
 * Resta N días hábiles a una fecha
 * Si includeWeekends es true, resta días calendario normales
 */
export function subtractBusinessDays(
  endDate: Date,
  days: number,
  includeWeekends: boolean = false
): Date {
  const result = new Date(endDate);
  
  if (includeWeekends) {
    result.setDate(result.getDate() - days);
    return result;
  }

  let subtractedDays = 0;
  while (subtractedDays < days) {
    result.setDate(result.getDate() - 1);
    const dayOfWeek = result.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      subtractedDays++;
    }
  }
  return result;
}
