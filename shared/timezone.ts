/**
 * Tipos y constantes compartidas de zona horaria
 * Usadas tanto en frontend como en backend
 */

export interface TimezoneOption {
  value: string;
  label: string;
  offset: number;
}

/**
 * Lista de zonas horarias comunes para el selector del admin
 */
export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: "America/Bogota", label: "Colombia (UTC-5)", offset: -5 },
  { value: "America/Lima", label: "Perú (UTC-5)", offset: -5 },
  { value: "America/Guayaquil", label: "Ecuador (UTC-5)", offset: -5 },
  { value: "America/Panama", label: "Panamá (UTC-5)", offset: -5 },
  { value: "America/Mexico_City", label: "México Central (UTC-6)", offset: -6 },
  { value: "America/Cancun", label: "México Sureste (UTC-5)", offset: -5 },
  { value: "America/Caracas", label: "Venezuela (UTC-4)", offset: -4 },
  { value: "America/Santiago", label: "Chile (UTC-3/-4)", offset: -4 },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (UTC-3)", offset: -3 },
  { value: "America/Sao_Paulo", label: "Brasil (UTC-3)", offset: -3 },
  { value: "America/Montevideo", label: "Uruguay (UTC-3)", offset: -3 },
  { value: "America/La_Paz", label: "Bolivia (UTC-4)", offset: -4 },
  { value: "America/Costa_Rica", label: "Costa Rica (UTC-6)", offset: -6 },
  { value: "America/Guatemala", label: "Guatemala (UTC-6)", offset: -6 },
  { value: "America/Santo_Domingo", label: "Rep. Dominicana (UTC-4)", offset: -4 },
  { value: "US/Eastern", label: "EE.UU. Este (UTC-5/-4)", offset: -5 },
  { value: "US/Central", label: "EE.UU. Central (UTC-6/-5)", offset: -6 },
  { value: "US/Pacific", label: "EE.UU. Pacífico (UTC-8/-7)", offset: -8 },
  { value: "Europe/Madrid", label: "España (UTC+1/+2)", offset: 1 },
  { value: "UTC", label: "UTC (Universal)", offset: 0 },
];

export const DEFAULT_TIMEZONE = "America/Bogota";
