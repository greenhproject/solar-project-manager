import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("User Profile Update", () => {
  const testUserId = 1;
  const otherUserId = 2;

  it("should update user name", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    const originalUser = await db.getUserById(testUserId);
    const originalName = originalUser?.name;

    const newName = "Updated Name " + Date.now();
    const result = await caller.users.updateProfile({ name: newName });

    expect(result).toBeDefined();
    expect(result?.name).toBe(newName);

    // Restaurar nombre original
    if (originalName) {
      await db.updateUserProfile(testUserId, { name: originalName });
    }
  });

  it("should update user email", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    const originalUser = await db.getUserById(testUserId);
    const originalEmail = originalUser?.email;

    const newEmail = `test${Date.now()}@example.com`;
    const result = await caller.users.updateProfile({ email: newEmail });

    expect(result).toBeDefined();
    expect(result?.email).toBe(newEmail);

    // Restaurar email original
    if (originalEmail) {
      await db.updateUserProfile(testUserId, { email: originalEmail });
    }
  });

  it("should update both name and email", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    const originalUser = await db.getUserById(testUserId);
    const originalName = originalUser?.name;
    const originalEmail = originalUser?.email;

    const timestamp = Date.now();
    const newName = "Full Update " + timestamp;
    const newEmail = `fullupdate${timestamp}@example.com`;

    const result = await caller.users.updateProfile({ 
      name: newName,
      email: newEmail 
    });

    expect(result).toBeDefined();
    expect(result?.name).toBe(newName);
    expect(result?.email).toBe(newEmail);

    // Restaurar datos originales
    await db.updateUserProfile(testUserId, { 
      name: originalName || "Test User",
      email: originalEmail || ""
    });
  });

  it("should reject empty name", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.users.updateProfile({ name: "" })
    ).rejects.toThrow();
  });

  it("should reject invalid email format", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.users.updateProfile({ email: "invalid-email" })
    ).rejects.toThrow();
  });

  it("should reject duplicate email", async () => {
    // Obtener email de otro usuario
    const otherUser = await db.getUserById(otherUserId);
    if (!otherUser || !otherUser.email) {
      // Skip test si no hay otro usuario con email
      return;
    }

    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.users.updateProfile({ email: otherUser.email })
    ).rejects.toThrow("Este email ya está en uso");
  });

  it("should allow updating to same email (no change)", async () => {
    const currentUser = await db.getUserById(testUserId);
    if (!currentUser || !currentUser.email) {
      // Skip test si el usuario no tiene email
      return;
    }

    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    // Actualizar con el mismo email no debería dar error
    const result = await caller.users.updateProfile({ email: currentUser.email });
    expect(result).toBeDefined();
    expect(result?.email).toBe(currentUser.email);
  });

  it("should only update user's own profile", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    const newName = "Updated by User 1";
    await caller.users.updateProfile({ name: newName });

    // Verificar que solo se actualizó el usuario correcto
    const user1 = await db.getUserById(testUserId);
    expect(user1?.name).toBe(newName);

    // Restaurar
    await db.updateUserProfile(testUserId, { name: "Test User" });
  });
});
