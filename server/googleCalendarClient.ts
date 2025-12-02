/**
 * Cliente de Google Calendar que funciona en Manus (MCP) y Railway (API directa)
 */

import { exec } from "child_process";
import { promisify } from "util";
import { google } from "googleapis";

const execAsync = promisify(exec);

interface CalendarEvent {
  summary: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  reminders?: number[];
}

interface UpdateCalendarEvent extends Partial<CalendarEvent> {
  event_id: string;
}

/**
 * Detecta si estamos en entorno Manus (tiene MCP disponible)
 */
function isManusEnvironment(): boolean {
  // En Manus, manus-mcp-cli está disponible
  // En Railway, no lo está
  return process.env.MANUS_MCP_AVAILABLE === 'true' || 
         (process.env.VITE_FRONTEND_FORGE_API_URL?.includes('manus') ?? false);
}

/**
 * Obtiene el cliente de Google Calendar API para Railway
 */
function getGoogleCalendarClient() {
  const credentials = process.env.GOOGLE_CALENDAR_CREDENTIALS;
  
  if (!credentials) {
    console.error('[GoogleCalendar] GOOGLE_CALENDAR_CREDENTIALS not configured');
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    return google.calendar({ version: 'v3', auth });
  } catch (error) {
    console.error('[GoogleCalendar] Error initializing Google Calendar client:', error);
    return null;
  }
}

/**
 * Crea un evento en Google Calendar
 * Usa MCP en Manus, API directa en Railway
 */
export async function createCalendarEvent(
  event: CalendarEvent
): Promise<string | null> {
  const isManus = isManusEnvironment();
  
  console.log(`[GoogleCalendar] Creating event in ${isManus ? 'Manus (MCP)' : 'Railway (API)'} environment`);

  if (isManus) {
    return createCalendarEventMCP(event);
  } else {
    return createCalendarEventAPI(event);
  }
}

/**
 * Crea evento usando MCP (solo Manus)
 */
async function createCalendarEventMCP(event: CalendarEvent): Promise<string | null> {
  try {
    const input = JSON.stringify({
      events: [event],
    });

    const command = `manus-mcp-cli tool call google_calendar_create_events --server google-calendar --input '${input.replace(/'/g, "'\\''")}'`;

    const { stdout } = await execAsync(command);
    const response = JSON.parse(stdout);

    if (response.content && response.content[0] && response.content[0].text) {
      const result = JSON.parse(response.content[0].text);
      if (result.results && result.results[0] && result.results[0].id) {
        console.log('[GoogleCalendar] Event created via MCP:', result.results[0].id);
        return result.results[0].id;
      }
    }

    return null;
  } catch (error) {
    console.error("[GoogleCalendar] Error creating event via MCP:", error);
    return null;
  }
}

/**
 * Crea evento usando API directa (Railway)
 */
async function createCalendarEventAPI(event: CalendarEvent): Promise<string | null> {
  const calendar = getGoogleCalendarClient();
  
  if (!calendar) {
    console.error('[GoogleCalendar] Calendar client not available');
    return null;
  }

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.start_time,
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: event.end_time,
          timeZone: 'America/New_York',
        },
        reminders: event.reminders ? {
          useDefault: false,
          overrides: event.reminders.map(minutes => ({
            method: 'popup',
            minutes,
          })),
        } : undefined,
      },
    });

    console.log('[GoogleCalendar] Event created via API:', response.data.id);
    return response.data.id || null;
  } catch (error: any) {
    console.error('[GoogleCalendar] Error creating event via API:', error.message);
    return null;
  }
}

/**
 * Actualiza un evento en Google Calendar
 */
export async function updateCalendarEvent(
  update: UpdateCalendarEvent
): Promise<boolean> {
  const isManus = isManusEnvironment();
  
  console.log(`[GoogleCalendar] Updating event in ${isManus ? 'Manus (MCP)' : 'Railway (API)'} environment`);

  if (isManus) {
    return updateCalendarEventMCP(update);
  } else {
    return updateCalendarEventAPI(update);
  }
}

/**
 * Actualiza evento usando MCP (solo Manus)
 */
async function updateCalendarEventMCP(update: UpdateCalendarEvent): Promise<boolean> {
  try {
    const input = JSON.stringify({
      events: [update],
    });

    const command = `manus-mcp-cli tool call google_calendar_update_events --server google-calendar --input '${input.replace(/'/g, "'\\''")}'`;

    await execAsync(command);
    console.log('[GoogleCalendar] Event updated via MCP');
    return true;
  } catch (error) {
    console.error("[GoogleCalendar] Error updating event via MCP:", error);
    return false;
  }
}

/**
 * Actualiza evento usando API directa (Railway)
 */
async function updateCalendarEventAPI(update: UpdateCalendarEvent): Promise<boolean> {
  const calendar = getGoogleCalendarClient();
  
  if (!calendar) {
    console.error('[GoogleCalendar] Calendar client not available');
    return false;
  }

  try {
    const updateData: any = {};
    
    if (update.summary) updateData.summary = update.summary;
    if (update.description) updateData.description = update.description;
    if (update.location) updateData.location = update.location;
    if (update.start_time) {
      updateData.start = {
        dateTime: update.start_time,
        timeZone: 'America/New_York',
      };
    }
    if (update.end_time) {
      updateData.end = {
        dateTime: update.end_time,
        timeZone: 'America/New_York',
      };
    }
    if (update.reminders) {
      updateData.reminders = {
        useDefault: false,
        overrides: update.reminders.map(minutes => ({
          method: 'popup',
          minutes,
        })),
      };
    }

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: update.event_id,
      requestBody: updateData,
    });

    console.log('[GoogleCalendar] Event updated via API');
    return true;
  } catch (error: any) {
    console.error('[GoogleCalendar] Error updating event via API:', error.message);
    return false;
  }
}

/**
 * Elimina un evento de Google Calendar
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const isManus = isManusEnvironment();
  
  console.log(`[GoogleCalendar] Deleting event in ${isManus ? 'Manus (MCP)' : 'Railway (API)'} environment`);

  if (isManus) {
    return deleteCalendarEventMCP(eventId);
  } else {
    return deleteCalendarEventAPI(eventId);
  }
}

/**
 * Elimina evento usando MCP (solo Manus)
 */
async function deleteCalendarEventMCP(eventId: string): Promise<boolean> {
  try {
    const input = JSON.stringify({
      events: [{ event_id: eventId }],
    });

    const command = `manus-mcp-cli tool call google_calendar_delete_events --server google-calendar --input '${input.replace(/'/g, "'\\''")}'`;

    await execAsync(command);
    console.log('[GoogleCalendar] Event deleted via MCP');
    return true;
  } catch (error) {
    console.error("[GoogleCalendar] Error deleting event via MCP:", error);
    return false;
  }
}

/**
 * Elimina evento usando API directa (Railway)
 */
async function deleteCalendarEventAPI(eventId: string): Promise<boolean> {
  const calendar = getGoogleCalendarClient();
  
  if (!calendar) {
    console.error('[GoogleCalendar] Calendar client not available');
    return false;
  }

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    console.log('[GoogleCalendar] Event deleted via API');
    return true;
  } catch (error: any) {
    console.error('[GoogleCalendar] Error deleting event via API:', error.message);
    return false;
  }
}

/**
 * Convierte una fecha de hito a formato RFC3339 para Google Calendar
 */
export function toRFC3339(date: Date): string {
  return date.toISOString();
}

/**
 * Crea una fecha de fin para un hito (1 hora después del inicio)
 */
export function createEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1);
  return endDate;
}
