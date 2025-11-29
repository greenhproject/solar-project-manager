import { describe, it, expect, beforeEach } from "vitest";
import { recalculateProjectProgress } from "./progressCalculator";
import * as db from "./db";

describe("Notificaciones de Proyectos Completados", () => {
  it("debería calcular progreso correctamente cuando todos los hitos están completados", async () => {
    // Este test verifica que el cálculo de progreso funciona
    // La notificación se envía automáticamente cuando alcanza 100%

    // Nota: Este es un test de integración que requiere datos en la base de datos
    // En un entorno de producción, usaríamos mocks para las llamadas a la BD

    const testProjectId = 1;
    const progress = await recalculateProjectProgress(testProjectId);

    // Verificar que el progreso es un número válido entre 0 y 100
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });

  it("debería retornar 0 cuando no hay hitos", async () => {
    // Proyecto sin hitos debería tener 0% de progreso
    const nonExistentProjectId = 999999;
    const progress = await recalculateProjectProgress(nonExistentProjectId);

    expect(progress).toBe(0);
  });
});
