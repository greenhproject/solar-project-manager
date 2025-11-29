import { exec } from 'child_process';
import { promisify } from 'util';

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
 * Crea un evento en Google Calendar usando MCP
 */
export async function createCalendarEvent(event: CalendarEvent): Promise<string | null> {
  try {
    const input = JSON.stringify({
      events: [event]
    });

    const command = `manus-mcp-cli tool call google_calendar_create_events --server google-calendar --input '${input.replace(/'/g, "'\\''")}'`;
    
    const { stdout } = await execAsync(command);
    
    // Parsear la respuesta para obtener el event ID
    const response = JSON.parse(stdout);
    
    if (response.content && response.content[0] && response.content[0].text) {
      const result = JSON.parse(response.content[0].text);
      if (result.results && result.results[0] && result.results[0].id) {
        return result.results[0].id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[GoogleCalendar] Error creating event:', error);
    return null;
  }
}

/**
 * Actualiza un evento en Google Calendar usando MCP
 */
export async function updateCalendarEvent(update: UpdateCalendarEvent): Promise<boolean> {
  try {
    const input = JSON.stringify({
      events: [update]
    });

    const command = `manus-mcp-cli tool call google_calendar_update_events --server google-calendar --input '${input.replace(/'/g, "'\\''")}'`;
    
    await execAsync(command);
    return true;
  } catch (error) {
    console.error('[GoogleCalendar] Error updating event:', error);
    return false;
  }
}

/**
 * Elimina un evento de Google Calendar usando MCP
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const input = JSON.stringify({
      events: [{
        event_id: eventId
      }]
    });

    const command = `manus-mcp-cli tool call google_calendar_delete_events --server google-calendar --input '${input.replace(/'/g, "'\\''")}'`;
    
    await execAsync(command);
    return true;
  } catch (error) {
    console.error('[GoogleCalendar] Error deleting event:', error);
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
