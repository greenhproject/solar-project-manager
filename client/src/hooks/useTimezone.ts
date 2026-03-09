/**
 * Hook para acceder a la zona horaria configurada en la aplicación.
 * 
 * Obtiene la zona horaria del backend y proporciona funciones utilitarias
 * para formatear fechas correctamente en la zona configurada.
 */

import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

const DEFAULT_TIMEZONE = "America/Bogota";

export function useTimezone() {
  const { data, isLoading } = trpc.appSettings.getTimezone.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    refetchOnWindowFocus: false,
  });

  const timezone = data?.timezone || DEFAULT_TIMEZONE;

  const utils = useMemo(() => ({
    /**
     * Formatea una fecha en la zona horaria configurada
     */
    formatDate: (date: Date | string | null, options?: Intl.DateTimeFormatOptions): string => {
      if (!date) return "-";
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "-";
      
      return dateObj.toLocaleDateString("es-CO", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        ...options,
      });
    },

    /**
     * Formatea una fecha con hora en la zona horaria configurada
     */
    formatDateTime: (date: Date | string | null): string => {
      if (!date) return "-";
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "-";
      
      return dateObj.toLocaleString("es-CO", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    },

    /**
     * Formatea una fecha en formato largo legible
     */
    formatDateLong: (date: Date | string | null): string => {
      if (!date) return "-";
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "-";
      
      return dateObj.toLocaleDateString("es-CO", {
        timeZone: timezone,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },

    /**
     * Formatea solo la hora en la zona horaria configurada
     */
    formatTime: (date: Date | string | null): string => {
      if (!date) return "-";
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "-";
      
      return dateObj.toLocaleTimeString("es-CO", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    },

    /**
     * Obtiene la hora actual en la zona horaria configurada como Date
     */
    getNow: (): Date => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      
      const parts = formatter.formatToParts(now);
      const get = (type: string) => parts.find(p => p.type === type)?.value || "0";
      
      return new Date(Date.UTC(
        parseInt(get("year")),
        parseInt(get("month")) - 1,
        parseInt(get("day")),
        parseInt(get("hour")),
        parseInt(get("minute")),
        parseInt(get("second"))
      ));
    },

    /**
     * Formatea una fecha relativa (ej: "hace 2 días")
     */
    formatRelative: (date: Date | string | null): string => {
      if (!date) return "-";
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "-";
      
      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMinutes < 1) return "Justo ahora";
      if (diffMinutes < 60) return `Hace ${diffMinutes} ${diffMinutes === 1 ? "minuto" : "minutos"}`;
      if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
      if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
      if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? "semana" : "semanas"}`;
      
      return dateObj.toLocaleDateString("es-CO", {
        timeZone: timezone,
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },
  }), [timezone]);

  return {
    timezone,
    isLoading,
    ...utils,
  };
}

/**
 * Función standalone para formatear fechas con una zona horaria específica.
 * Útil fuera de componentes React.
 */
export function formatDateWithTimezone(
  date: Date | string | null,
  timezone: string = DEFAULT_TIMEZONE,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "-";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "-";
  
  return dateObj.toLocaleDateString("es-CO", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  });
}
