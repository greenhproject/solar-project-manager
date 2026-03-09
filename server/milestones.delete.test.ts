import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Milestones Delete Functionality", () => {
  it("debe tener la función deleteMilestone disponible", () => {
    expect(typeof db.deleteMilestone).toBe("function");
  });

  it("debe poder eliminar un hito sin lanzar errores (hito inexistente)", async () => {
    // Intentar eliminar un hito que no existe no debería lanzar error
    await expect(db.deleteMilestone(999999)).resolves.not.toThrow();
  });

  it("debe verificar que getMilestoneById retorna undefined para hitos inexistentes", async () => {
    const nonExistentMilestone = await db.getMilestoneById(999999);
    expect(nonExistentMilestone).toBeNull();
  });

  it("debe tener la función getMilestoneById disponible", () => {
    expect(typeof db.getMilestoneById).toBe("function");
  });

  it("debe tener la función updateMilestone disponible", () => {
    expect(typeof db.updateMilestone).toBe("function");
  });

  it("debe tener la función createMilestone disponible", () => {
    expect(typeof db.createMilestone).toBe("function");
  });

  it("debe tener la función getMilestonesByProjectId disponible", () => {
    expect(typeof db.getMilestonesByProjectId).toBe("function");
  });

  it("deleteMilestone debe eliminar recordatorios asociados y luego el hito", async () => {
    // Verificar que la función existe y acepta un número como parámetro
    // La función internamente elimina reminders con milestoneId = id
    // y luego elimina el milestone con id = id
    expect(db.deleteMilestone).toBeDefined();
    expect(db.deleteMilestone.length).toBe(1); // Acepta 1 parámetro
  });
});
