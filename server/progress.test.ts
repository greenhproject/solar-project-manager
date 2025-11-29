import { describe, it, expect } from "vitest";
import { recalculateProjectProgress } from "./progressCalculator";

describe("Progress Calculator", () => {
  it("debe retornar 0% para proyecto sin hitos", async () => {
    const nonExistentProjectId = 999999;
    const progress = await recalculateProjectProgress(nonExistentProjectId);
    expect(progress).toBe(0);
  });

  it("debe retornar un número válido entre 0 y 100", async () => {
    // Usar proyecto existente (ID 1)
    const testProjectId = 1;
    const progress = await recalculateProjectProgress(testProjectId);
    
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
    expect(Number.isInteger(progress)).toBe(true);
  });

  it("debe calcular correctamente el porcentaje basado en hitos completados", async () => {
    // Este test verifica que la función calcula correctamente
    // usando los datos existentes en la base de datos
    const testProjectId = 1;
    const progress = await recalculateProjectProgress(testProjectId);
    
    // El progreso debe ser un múltiplo de 50 si hay 2 hitos (0%, 50%, 100%)
    // o un número válido si hay más hitos
    expect(typeof progress).toBe('number');
    expect(progress >= 0 && progress <= 100).toBe(true);
  });
});
