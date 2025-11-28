import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { recalculateProjectProgress } from "./progressCalculator";

describe("Progress Calculator", () => {
  let testProjectId: number;
  let milestone1Id: number;
  let milestone2Id: number;

  beforeAll(async () => {
    // Crear un proyecto de prueba
    const projectResult = await db.createProject({
      name: "Proyecto Test Progreso",
      description: "Proyecto para probar cálculo de progreso",
      projectTypeId: 1,
      clientName: "Cliente Test",
      clientEmail: "test@test.com",
      clientPhone: "123456789",
      location: "Test Location",
      startDate: new Date(),
      estimatedEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: 1,
      status: "in_progress",
      progressPercentage: 0,
    });

    testProjectId = Number((projectResult as any).insertId || 0);

    // Crear dos hitos
    const milestone1Result = await db.createMilestone({
      projectId: testProjectId,
      name: "Hito 1",
      description: "Primer hito",
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: "pending",
      orderIndex: 1,
    });

    milestone1Id = Number((milestone1Result as any).insertId || 0);

    const milestone2Result = await db.createMilestone({
      projectId: testProjectId,
      name: "Hito 2",
      description: "Segundo hito",
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: "pending",
      orderIndex: 2,
    });

    milestone2Id = Number((milestone2Result as any).insertId || 0);
  });

  it("debe calcular 0% cuando no hay hitos completados", async () => {
    const progress = await recalculateProjectProgress(testProjectId);
    expect(progress).toBe(0);

    const project = await db.getProjectById(testProjectId);
    expect(project?.progressPercentage).toBe(0);
  });

  it("debe calcular 50% cuando se completa 1 de 2 hitos", async () => {
    // Completar el primer hito
    await db.updateMilestone(milestone1Id, {
      status: "completed",
      completedDate: new Date(),
    });

    const progress = await recalculateProjectProgress(testProjectId);
    expect(progress).toBe(50);

    const project = await db.getProjectById(testProjectId);
    expect(project?.progressPercentage).toBe(50);
  });

  it("debe calcular 100% cuando se completan todos los hitos", async () => {
    // Completar el segundo hito
    await db.updateMilestone(milestone2Id, {
      status: "completed",
      completedDate: new Date(),
    });

    const progress = await recalculateProjectProgress(testProjectId);
    expect(progress).toBe(100);

    const project = await db.getProjectById(testProjectId);
    expect(project?.progressPercentage).toBe(100);
  });

  it("debe recalcular correctamente al descompletar un hito", async () => {
    // Descompletar el segundo hito
    await db.updateMilestone(milestone2Id, {
      status: "in_progress",
      completedDate: null,
    });

    const progress = await recalculateProjectProgress(testProjectId);
    expect(progress).toBe(50);

    const project = await db.getProjectById(testProjectId);
    expect(project?.progressPercentage).toBe(50);
  });
});
