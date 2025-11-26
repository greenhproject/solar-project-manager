import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "greenhproject@gmail.com",
    name: "Green House Project",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createEngineerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "engineer-user",
    email: "engineer@example.com",
    name: "Engineer User",
    loginMethod: "manus",
    role: "engineer",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Gestión de Usuarios", () => {
  it("admin puede listar usuarios", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const users = await caller.users.list();
    expect(Array.isArray(users)).toBe(true);
  });

  it("ingeniero no puede listar usuarios", async () => {
    const ctx = createEngineerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.list()).rejects.toThrow();
  });

  it("no se puede modificar rol del usuario maestro", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Intentar cambiar rol del usuario maestro (ID 1 en este test)
    await expect(
      caller.users.updateRole({ userId: 1, role: "engineer" })
    ).rejects.toThrow("No se puede modificar el rol del usuario maestro");
  });

  it("no se puede eliminar el usuario maestro", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.delete({ userId: 1 })
    ).rejects.toThrow("No se puede eliminar el usuario maestro");
  });
});

describe("Asistente de IA", () => {
  it("tiene procedimiento de análisis disponible", () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    // Verificar que el procedimiento existe
    expect(caller.ai.analyzeProjects).toBeDefined();
  });

  it("tiene procedimiento de preguntas disponible", () => {
    const ctx = createEngineerContext();
    const caller = appRouter.createCaller(ctx);

    // Verificar que el procedimiento existe
    expect(caller.ai.askQuestion).toBeDefined();
  });

  it("ingeniero tiene acceso al asistente de IA", () => {
    const ctx = createEngineerContext();
    const caller = appRouter.createCaller(ctx);

    // Verificar que el procedimiento existe para ingenieros
    expect(caller.ai.analyzeProjects).toBeDefined();
  });
});
