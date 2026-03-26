/**
 * Tests para las funciones utilitarias de manejo de fechas.
 * Verifica que fromDateInputValue y toLocalDateString eviten
 * el desfase de un día causado por timezone.
 */
import { describe, it, expect } from "vitest";

// Simulamos las funciones que están en el frontend (hooks/useTimezone.ts)
// para probar la lógica de conversión de fechas

function fromDateInputValue(dateString: string): Date {
  return new Date(dateString + "T12:00:00");
}

function toLocalDateString(
  date: Date | string | null,
  timezone: string = "America/Bogota"
): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(dateObj);
}

describe("Date utility functions - Timezone safety", () => {
  describe("fromDateInputValue", () => {
    it("should create a Date for the correct day regardless of timezone", () => {
      const date = fromDateInputValue("2026-03-26");
      // La fecha debe ser 26 de marzo, no 25
      expect(date.getDate()).toBe(26);
      expect(date.getMonth()).toBe(2); // Marzo = 2 (0-indexed)
      expect(date.getFullYear()).toBe(2026);
    });

    it("should not shift to previous day for negative UTC offsets (e.g., America/Bogota UTC-5)", () => {
      const date = fromDateInputValue("2026-01-15");
      // Usando T12:00:00, incluso en UTC-5 (7:00 AM local), sigue siendo el mismo día
      const formatted = toLocalDateString(date, "America/Bogota");
      expect(formatted).toBe("2026-01-15");
    });

    it("should work correctly for all Americas timezones (UTC-3 to UTC-8)", () => {
      const date = fromDateInputValue("2026-06-20");
      // America/Bogota (UTC-5)
      expect(toLocalDateString(date, "America/Bogota")).toBe("2026-06-20");
      // America/New_York (UTC-4 DST)
      expect(toLocalDateString(date, "America/New_York")).toBe("2026-06-20");
      // America/Chicago (UTC-5 DST)
      expect(toLocalDateString(date, "America/Chicago")).toBe("2026-06-20");
      // America/Los_Angeles (UTC-7 DST)
      expect(toLocalDateString(date, "America/Los_Angeles")).toBe("2026-06-20");
      // America/Sao_Paulo (UTC-3)
      expect(toLocalDateString(date, "America/Sao_Paulo")).toBe("2026-06-20");
    });

    it("should handle end of month correctly", () => {
      const date = fromDateInputValue("2026-02-28");
      const formatted = toLocalDateString(date, "America/Bogota");
      expect(formatted).toBe("2026-02-28");
    });

    it("should handle year boundary correctly", () => {
      const date = fromDateInputValue("2025-12-31");
      const formatted = toLocalDateString(date, "America/Bogota");
      expect(formatted).toBe("2025-12-31");
    });

    it("should handle January 1st correctly", () => {
      const date = fromDateInputValue("2026-01-01");
      const formatted = toLocalDateString(date, "America/Bogota");
      expect(formatted).toBe("2026-01-01");
    });
  });

  describe("toLocalDateString", () => {
    it("should return empty string for null", () => {
      expect(toLocalDateString(null)).toBe("");
    });

    it("should return empty string for invalid date", () => {
      expect(toLocalDateString("invalid-date")).toBe("");
    });

    it("should format a Date object correctly for America/Bogota", () => {
      // Crear una fecha que es medianoche UTC del 26 de marzo
      // En Bogota (UTC-5) esto sería 25 de marzo a las 19:00
      const midnightUTC = new Date("2026-03-26T00:00:00Z");
      const formatted = toLocalDateString(midnightUTC, "America/Bogota");
      // Debería mostrar el 25 porque en Bogota aún es 25 de marzo
      expect(formatted).toBe("2026-03-25");
    });

    it("should format a noon UTC date correctly for America/Bogota", () => {
      // Crear una fecha que es mediodía UTC del 26 de marzo
      // En Bogota (UTC-5) esto sería 26 de marzo a las 7:00 AM
      const noonUTC = new Date("2026-03-26T12:00:00Z");
      const formatted = toLocalDateString(noonUTC, "America/Bogota");
      // Debería mostrar el 26 correctamente
      expect(formatted).toBe("2026-03-26");
    });

    it("should demonstrate the bug: new Date('yyyy-MM-dd') causes day shift", () => {
      // Este test demuestra el bug original:
      // new Date("2026-03-26") se interpreta como medianoche UTC
      // En Colombia (UTC-5), eso es 25 de marzo a las 19:00
      const buggyDate = new Date("2026-03-26");
      const formatted = toLocalDateString(buggyDate, "America/Bogota");
      // El bug: muestra 25 en vez de 26
      expect(formatted).toBe("2026-03-25");
    });

    it("should demonstrate the fix: fromDateInputValue avoids day shift", () => {
      // Este test demuestra que fromDateInputValue corrige el bug
      const fixedDate = fromDateInputValue("2026-03-26");
      const formatted = toLocalDateString(fixedDate, "America/Bogota");
      // La corrección: muestra 26 correctamente
      expect(formatted).toBe("2026-03-26");
    });
  });

  describe("Round-trip: input -> Date -> display", () => {
    it("should preserve the same date through the full cycle for America/Bogota", () => {
      const inputValue = "2026-07-15";
      const dateObj = fromDateInputValue(inputValue);
      const displayValue = toLocalDateString(dateObj, "America/Bogota");
      expect(displayValue).toBe(inputValue);
    });

    it("should preserve the same date through the full cycle for America/New_York", () => {
      const inputValue = "2026-11-30";
      const dateObj = fromDateInputValue(inputValue);
      const displayValue = toLocalDateString(dateObj, "America/New_York");
      expect(displayValue).toBe(inputValue);
    });

    it("should preserve the same date through the full cycle for Europe/London", () => {
      const inputValue = "2026-08-20";
      const dateObj = fromDateInputValue(inputValue);
      const displayValue = toLocalDateString(dateObj, "Europe/London");
      expect(displayValue).toBe(inputValue);
    });

    it("should preserve the same date through the full cycle for America/Mexico_City", () => {
      const inputValue = "2026-04-10";
      const dateObj = fromDateInputValue(inputValue);
      const displayValue = toLocalDateString(dateObj, "America/Mexico_City");
      expect(displayValue).toBe(inputValue);
    });
  });
});
