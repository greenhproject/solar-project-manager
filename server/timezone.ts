/**
 * Utilidades de zona horaria para el servidor
 * 
 * Centraliza la conversión de fechas UTC a la zona horaria configurada
 * por el administrador. Por defecto: America/Bogota (UTC-5).
 * 
 * IMPORTANTE: Las fechas en la base de datos se almacenan en UTC.
 * Este módulo convierte las comparaciones y visualizaciones a la zona local.
 */

import { appSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// Conexión propia a la BD para evitar dependencia circular con db.ts
let _tzDb: ReturnType<typeof drizzle> | null = null;
function getTimezoneDb() {
  if (!_tzDb && process.env.DATABASE_URL) {
    try {
      _tzDb = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Timezone] Failed to connect to DB:", error);
      _tzDb = null;
    }
  }
  return _tzDb;
}

// Zona horaria por defecto (Colombia)
const DEFAULT_TIMEZONE = "America/Bogota";

// Cache de la zona horaria para evitar consultas repetidas a la BD
let cachedTimezone: string | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene la zona horaria configurada en la base de datos.
 * Usa cache de 5 minutos para evitar consultas excesivas.
 */
export async function getConfiguredTimezone(): Promise<string> {
  const now = Date.now();
  
  // Retornar cache si aún es válido
  if (cachedTimezone && now < cacheExpiry) {
    return cachedTimezone as string;
  }
  
  try {
    const db = getTimezoneDb();
    if (!db) return DEFAULT_TIMEZONE;
    
    const result = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.settingKey, "timezone"))
      .limit(1);
    
    const tz = result[0]?.settingValue || DEFAULT_TIMEZONE;
    
    // Validar que la zona horaria sea válida
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      cachedTimezone = tz;
    } catch {
      console.warn(`[Timezone] Zona horaria inválida: ${tz}, usando ${DEFAULT_TIMEZONE}`);
      cachedTimezone = DEFAULT_TIMEZONE;
    }
    
    cacheExpiry = now + CACHE_TTL_MS;
    return cachedTimezone as string;
  } catch (error) {
    console.error("[Timezone] Error al obtener zona horaria:", error);
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Invalida el cache de zona horaria (llamar después de actualizar la configuración)
 */
export function invalidateTimezoneCache(): void {
  cachedTimezone = null;
  cacheExpiry = 0;
}

/**
 * Obtiene la fecha/hora actual en la zona horaria configurada.
 * Retorna un objeto Date ajustado a la hora local de la zona configurada.
 * 
 * NOTA: JavaScript Date siempre es UTC internamente. Esta función
 * crea un Date cuyo valor UTC corresponde a la hora local de la zona configurada.
 * Esto permite comparar correctamente con fechas almacenadas en la BD.
 */
export async function getNowInConfiguredTimezone(): Promise<Date> {
  const tz = await getConfiguredTimezone();
  return getNowInTimezone(tz);
}

/**
 * Obtiene la fecha/hora actual en una zona horaria específica.
 */
export function getNowInTimezone(timezone: string): Date {
  // Obtener la hora actual formateada en la zona horaria deseada
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
  
  const year = parseInt(get("year"));
  const month = parseInt(get("month")) - 1; // JS months are 0-indexed
  const day = parseInt(get("day"));
  const hour = parseInt(get("hour"));
  const minute = parseInt(get("minute"));
  const second = parseInt(get("second"));
  
  // Crear un Date con los componentes de la hora local
  // Usamos Date.UTC para que el valor interno sea la hora local de la zona
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Convierte una fecha UTC a la zona horaria configurada para visualización.
 * Retorna un string formateado en español.
 */
export async function formatDateInTimezone(
  date: Date | string | null,
  options?: Intl.DateTimeFormatOptions
): Promise<string> {
  if (!date) return "-";
  
  const tz = await getConfiguredTimezone();
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  };
  
  return dateObj.toLocaleDateString("es-CO", defaultOptions);
}

/**
 * Convierte una fecha UTC a la zona horaria configurada con hora.
 */
export async function formatDateTimeInTimezone(
  date: Date | string | null
): Promise<string> {
  return formatDateInTimezone(date, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Obtiene el offset en horas de la zona horaria configurada respecto a UTC.
 * Ejemplo: America/Bogota retorna -5
 */
export async function getTimezoneOffset(): Promise<number> {
  const tz = await getConfiguredTimezone();
  const now = new Date();
  
  // Calcular el offset comparando la hora UTC con la hora local
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
}

/**
 * Lista de zonas horarias comunes de América Latina para el selector del admin
 */
export const LATIN_AMERICA_TIMEZONES = [
  { value: "America/Bogota", label: "Colombia (UTC-5)", offset: -5 },
  { value: "America/Lima", label: "Perú (UTC-5)", offset: -5 },
  { value: "America/Guayaquil", label: "Ecuador (UTC-5)", offset: -5 },
  { value: "America/Panama", label: "Panamá (UTC-5)", offset: -5 },
  { value: "America/Mexico_City", label: "México Central (UTC-6)", offset: -6 },
  { value: "America/Cancun", label: "México Sureste (UTC-5)", offset: -5 },
  { value: "America/Tijuana", label: "México Pacífico (UTC-8)", offset: -8 },
  { value: "America/Caracas", label: "Venezuela (UTC-4)", offset: -4 },
  { value: "America/Santiago", label: "Chile (UTC-3/-4)", offset: -4 },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (UTC-3)", offset: -3 },
  { value: "America/Sao_Paulo", label: "Brasil (UTC-3)", offset: -3 },
  { value: "America/Montevideo", label: "Uruguay (UTC-3)", offset: -3 },
  { value: "America/Asuncion", label: "Paraguay (UTC-3/-4)", offset: -4 },
  { value: "America/La_Paz", label: "Bolivia (UTC-4)", offset: -4 },
  { value: "America/Costa_Rica", label: "Costa Rica (UTC-6)", offset: -6 },
  { value: "America/Guatemala", label: "Guatemala (UTC-6)", offset: -6 },
  { value: "America/Havana", label: "Cuba (UTC-5)", offset: -5 },
  { value: "America/Santo_Domingo", label: "Rep. Dominicana (UTC-4)", offset: -4 },
  { value: "America/Puerto_Rico", label: "Puerto Rico (UTC-4)", offset: -4 },
  { value: "US/Eastern", label: "EE.UU. Este (UTC-5/-4)", offset: -5 },
  { value: "US/Central", label: "EE.UU. Central (UTC-6/-5)", offset: -6 },
  { value: "US/Pacific", label: "EE.UU. Pacífico (UTC-8/-7)", offset: -8 },
  { value: "Europe/Madrid", label: "España (UTC+1/+2)", offset: 1 },
  { value: "UTC", label: "UTC (Universal)", offset: 0 },
];

/**
 * Guarda la zona horaria en la base de datos
 */
export async function saveTimezone(timezone: string, userId: number): Promise<boolean> {
  try {
    // Validar la zona horaria
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    
    const db = getTimezoneDb();
    if (!db) return false;
    
    await db
      .insert(appSettings)
      .values({
        settingKey: "timezone",
        settingValue: timezone,
        description: "Zona horaria de la aplicación para cálculos de fechas y recordatorios",
        updatedBy: userId,
      })
      .onDuplicateKeyUpdate({
        set: {
          settingValue: timezone,
          updatedBy: userId,
        },
      });
    
    // Invalidar cache
    invalidateTimezoneCache();
    
    return true;
  } catch (error) {
    console.error("[Timezone] Error al guardar zona horaria:", error);
    return false;
  }
}
