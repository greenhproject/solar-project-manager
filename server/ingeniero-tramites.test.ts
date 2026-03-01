import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createIngenieroTramitesContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "tramites-user",
    email: "tramites@greenhproject.com",
    name: "Ingeniero Tramites",
    loginMethod: "jwt",
    role: "ingeniero_tramites",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    avatarUrl: null,
    theme: "system",
    password: null,
    jobTitle: "Ingeniero de Trámites",
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
    avatarUrl: null,
    theme: "system",
    password: null,
    jobTitle: "Administrador",
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

describe("ingeniero_tramites - acceso al dashboard", () => {
  it("puede obtener estadísticas del dashboard", async () => {
    const ctx = createIngenieroTramitesContext();
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

  it("puede listar proyectos", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projects.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("puede listar tipos de proyecto", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.projectTypes.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("ingeniero_tramites - acceso a hitos", () => {
  it("puede obtener todos los hitos", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.milestones.getAll();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("puede obtener hitos vencidos", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.milestones.overdue();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("ingeniero_tramites - acceso a recordatorios", () => {
  it("puede listar recordatorios", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reminders.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("puede listar recordatorios no leídos", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reminders.unread();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("ingeniero_tramites - acceso a notificaciones", () => {
  it("puede obtener notificaciones", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.getUserNotifications({
      limit: 10,
      unreadOnly: false,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("puede obtener configuración de notificaciones", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.getSettings();

    // Puede ser null si no tiene configuración aún
    expect(result !== undefined).toBe(true);
  });
});

describe("ingeniero_tramites - restricciones de acceso", () => {
  it("NO puede listar usuarios", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.list()).rejects.toThrow(
      "Solo los administradores"
    );
  });

  it("NO puede crear proyectos", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.projects.create({
        name: "Test Project",
        projectTypeId: 1,
        startDate: new Date(),
        estimatedEndDate: new Date(),
      })
    ).rejects.toThrow();
  });
});

describe("ingeniero_tramites - acceso a auth", () => {
  it("auth.me retorna usuario con rol ingeniero_tramites", async () => {
    const ctx = createIngenieroTramitesContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.email).toBe("tramites@greenhproject.com");
    expect(result?.role).toBe("ingeniero_tramites");
  });
});
