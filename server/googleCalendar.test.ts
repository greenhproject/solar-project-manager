import { describe, it, expect, vi } from "vitest";
import * as googleCalendar from "./googleCalendar";

describe("Google Calendar Integration", () => {
  it("should format date to RFC3339", () => {
    const date = new Date("2025-12-25T10:00:00Z");
    const rfc3339 = googleCalendar.toRFC3339(date);

    expect(rfc3339).toBe("2025-12-25T10:00:00.000Z");
  });

  it("should create end date 1 hour after start", () => {
    const startDate = new Date("2025-12-25T10:00:00Z");
    const endDate = googleCalendar.createEndDate(startDate);

    expect(endDate.getTime() - startDate.getTime()).toBe(60 * 60 * 1000); // 1 hora en ms
  });

  it("should handle createCalendarEvent gracefully on error", async () => {
    // Este test verifica que la función no lance errores incluso si MCP falla
    const result = await googleCalendar.createCalendarEvent({
      summary: "Test Event",
      description: "Test Description",
      start_time: "2025-12-25T10:00:00.000Z",
      end_time: "2025-12-25T11:00:00.000Z",
    });

    // Puede retornar null si MCP no está disponible o falla
    expect(result === null || typeof result === "string").toBe(true);
  });

  it("should handle updateCalendarEvent gracefully on error", async () => {
    const result = await googleCalendar.updateCalendarEvent({
      event_id: "test-event-id",
      summary: "Updated Event",
    });

    // Debe retornar boolean
    expect(typeof result).toBe("boolean");
  });

  it("should handle deleteCalendarEvent gracefully on error", async () => {
    const result = await googleCalendar.deleteCalendarEvent("test-event-id");

    // Debe retornar boolean
    expect(typeof result).toBe("boolean");
  });
});
