/**
 * Utilidades compartidas para manejo de fechas
 * Centraliza funciones reutilizables relacionadas con fechas y tiempos
 */

import {
  format,
  formatDistance,
  isPast,
  isFuture,
  differenceInDays,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";

/**
 * Verifica si una fecha está vencida (en el pasado)
 * @param date - Fecha a verificar
 * @returns true si la fecha está vencida
 */
export function isOverdue(date: Date | string | null): boolean {
  if (!date) return false;

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return isPast(dateObj) && !isToday(dateObj);
}

/**
 * Verifica si una fecha es hoy
 * @param date - Fecha a verificar
 * @returns true si la fecha es hoy
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  const today = new Date();

  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Formatea una fecha en formato legible en español
 * @param date - Fecha a formatear
 * @param formatString - Formato deseado (por defecto: 'dd/MM/yyyy')
 * @returns Fecha formateada
 */
export function formatDate(
  date: Date | string | null,
  formatString: string = "dd/MM/yyyy"
): string {
  if (!date) return "-";

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, formatString, { locale: es });
}

/**
 * Formatea una fecha con hora en formato legible
 * @param date - Fecha a formatear
 * @returns Fecha y hora formateada
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "dd/MM/yyyy HH:mm", { locale: es });
}

/**
 * Obtiene la distancia relativa desde ahora (ej: "hace 2 días", "en 3 días")
 * @param date - Fecha de referencia
 * @returns Texto descriptivo de la distancia temporal
 */
export function getRelativeTime(date: Date | string | null): string {
  if (!date) return "-";

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: es });
}

/**
 * Calcula los días restantes hasta una fecha
 * @param date - Fecha objetivo
 * @returns Número de días (positivo si es futuro, negativo si es pasado)
 */
export function getDaysUntil(date: Date | string | null): number {
  if (!date) return 0;

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return differenceInDays(dateObj, new Date());
}

/**
 * Verifica si una fecha está próxima (dentro de los próximos N días)
 * @param date - Fecha a verificar
 * @param days - Número de días de anticipación (por defecto: 7)
 * @returns true si la fecha está dentro del rango
 */
export function isUpcoming(
  date: Date | string | null,
  days: number = 7
): boolean {
  if (!date) return false;

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  const daysUntil = getDaysUntil(dateObj);

  return daysUntil >= 0 && daysUntil <= days;
}

/**
 * Obtiene el color de alerta según la proximidad de una fecha
 * @param date - Fecha a evaluar
 * @returns Color en formato CSS (red, yellow, green)
 */
export function getDateAlertColor(date: Date | string | null): string {
  if (!date) return "gray";

  const daysUntil = getDaysUntil(date);

  if (daysUntil < 0) return "red"; // Vencido
  if (daysUntil <= 3) return "orange"; // Muy próximo
  if (daysUntil <= 7) return "yellow"; // Próximo
  return "green"; // Lejano
}

/**
 * Convierte una fecha a formato ISO para almacenamiento
 * @param date - Fecha a convertir
 * @returns String en formato ISO 8601
 */
export function toISOString(date: Date | string | null): string | null {
  if (!date) return null;

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return dateObj.toISOString();
}

/**
 * Valida si una cadena es una fecha válida
 * @param dateString - Cadena a validar
 * @returns true si es una fecha válida
 */
export function isValidDate(dateString: string): boolean {
  try {
    const date = parseISO(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}
