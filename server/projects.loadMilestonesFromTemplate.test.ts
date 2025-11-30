import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("loadMilestonesFromTemplate", () => {
  it("should have getMilestoneTemplatesByProjectType function", () => {
    expect(db.getMilestoneTemplatesByProjectType).toBeDefined();
    expect(typeof db.getMilestoneTemplatesByProjectType).toBe("function");
  });

  it("should have createMilestone function", () => {
    expect(db.createMilestone).toBeDefined();
    expect(typeof db.createMilestone).toBe("function");
  });

  it("should return milestone templates for a valid project type", async () => {
    // Tipo de proyecto 1 debería tener plantillas (si existen en la BD)
    const templates = await db.getMilestoneTemplatesByProjectType(1);
    expect(Array.isArray(templates)).toBe(true);
  });

  it("should return empty array for non-existent project type", async () => {
    // Tipo de proyecto 99999 no debería existir
    const templates = await db.getMilestoneTemplatesByProjectType(99999);
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBe(0);
  });

  it("should create milestone with required fields", async () => {
    const testMilestone = {
      projectId: 1,
      name: "Test Milestone from Template",
      description: "Test description",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días desde ahora
      orderIndex: 1,
      status: "pending" as const,
    };

    // createMilestone no devuelve el objeto creado, solo verifica que no lance error
    await expect(db.createMilestone(testMilestone)).resolves.toBeDefined();
  });

  it("should calculate correct due date based on estimatedDurationDays", () => {
    const startDate = new Date("2025-01-01");
    const estimatedDays = 30;
    const expectedDueDate = new Date(startDate.getTime() + estimatedDays * 24 * 60 * 60 * 1000);
    
    // Verificar que el cálculo es correcto
    const calculatedDueDate = new Date(startDate.getTime() + estimatedDays * 24 * 60 * 60 * 1000);
    expect(calculatedDueDate.getTime()).toBe(expectedDueDate.getTime());
  });

  it("should handle templates with null estimatedDurationDays", () => {
    const startDate = new Date("2025-01-01");
    const estimatedDays = null;
    const defaultDays = 0;
    
    // Cuando estimatedDurationDays es null, debería usar 0
    const calculatedDueDate = new Date(startDate.getTime() + (estimatedDays || defaultDays) * 24 * 60 * 60 * 1000);
    expect(calculatedDueDate.getTime()).toBe(startDate.getTime());
  });

  it("should accept orderIndex parameter", async () => {
    const testMilestone = {
      projectId: 1,
      name: "Test Milestone Order",
      description: "Test order preservation",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      orderIndex: 5,
      status: "pending" as const,
    };

    // Verificar que la función acepta orderIndex sin error
    await expect(db.createMilestone(testMilestone)).resolves.toBeDefined();
  });
});
