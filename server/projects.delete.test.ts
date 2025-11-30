import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Projects Delete Functionality", () => {
  it("debe tener la función deleteProject disponible", () => {
    expect(typeof db.deleteProject).toBe("function");
  });

  it("debe poder eliminar un proyecto sin lanzar errores", async () => {
    // Intentar eliminar un proyecto que no existe no debería lanzar error
    // (la base de datos simplemente no eliminará nada)
    await expect(db.deleteProject(999999)).resolves.not.toThrow();
  });

  it("debe verificar que getProjectById retorna undefined para proyectos inexistentes", async () => {
    const nonExistentProject = await db.getProjectById(999999);
    expect(nonExistentProject).toBeUndefined();
  });
});
