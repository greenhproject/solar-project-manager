import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@greenhproject.com",
    name: "Admin User",
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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createEngineerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "engineer-user",
    email: "engineer@greenhproject.com",
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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("projects", () => {
  it("admin puede listar tipos de proyecto", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projectTypes.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("ingeniero puede listar tipos de proyecto", async () => {
    const ctx = createEngineerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projectTypes.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin puede listar proyectos", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("ingeniero puede listar proyectos", async () => {
    const ctx = createEngineerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin puede obtener estadísticas del dashboard", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.stats();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("active");
    expect(result).toHaveProperty("completed");
    expect(result).toHaveProperty("overdue");
    expect(typeof result.total).toBe("number");
    expect(typeof result.active).toBe("number");
    expect(typeof result.completed).toBe("number");
    expect(typeof result.overdue).toBe("number");
  });

  it("ingeniero puede obtener estadísticas del dashboard", async () => {
    const ctx = createEngineerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.stats();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("active");
    expect(result).toHaveProperty("completed");
    expect(result).toHaveProperty("overdue");
  });

  it("admin puede listar usuarios", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("ingeniero NO puede listar usuarios", async () => {
    const ctx = createEngineerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.list()).rejects.toThrow(
      "Solo los administradores"
    );
  });
});

describe("recordatorios", () => {
  it("admin puede listar recordatorios", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reminders.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("ingeniero puede listar sus recordatorios", async () => {
    const ctx = createEngineerContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reminders.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("autenticación", () => {
  it("auth.me retorna usuario autenticado", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.email).toBe("admin@greenhproject.com");
    expect(result?.role).toBe("admin");
  });

  it("auth.me retorna null para usuario no autenticado", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });
});
