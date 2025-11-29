import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Profile Enhancements", () => {
  const testUserId = 1;

  describe("Notification Settings", () => {
    it("should get notification settings (creates default if not exists)", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "engineer", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      const settings = await caller.notifications.getSettings();
      
      expect(settings).toBeDefined();
      expect(settings).toHaveProperty('enablePushNotifications');
      expect(settings).toHaveProperty('enableMilestoneReminders');
      expect(settings).toHaveProperty('enableDelayAlerts');
      expect(settings).toHaveProperty('enableAIAlerts');
      expect(settings).toHaveProperty('milestoneReminderDays');
    });

    it("should update notification settings", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "engineer", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      const updated = await caller.notifications.updateSettings({
        enablePushNotifications: false,
        milestoneReminderDays: 7
      });

      expect(updated).toBeDefined();
      expect(updated?.enablePushNotifications).toBe(false);
      expect(updated?.milestoneReminderDays).toBe(7);

      // Restaurar valores por defecto
      await caller.notifications.updateSettings({
        enablePushNotifications: true,
        milestoneReminderDays: 3
      });
    });

    it("should validate milestoneReminderDays range", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "engineer", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      // Debe fallar con valor fuera de rango
      await expect(
        caller.notifications.updateSettings({ milestoneReminderDays: 0 })
      ).rejects.toThrow();

      await expect(
        caller.notifications.updateSettings({ milestoneReminderDays: 31 })
      ).rejects.toThrow();
    });
  });

  describe("Avatar Upload", () => {
    it("should reject non-image data", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "engineer", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      // Intentar subir datos que no son imagen
      await expect(
        caller.users.uploadAvatar({
          imageData: "data:text/plain;base64,SGVsbG8gV29ybGQ=",
          mimeType: "text/plain"
        })
      ).rejects.toThrow();
    });

    it("should reject oversized images", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "engineer", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      // Crear imagen grande (>2MB en base64)
      const largeData = "data:image/png;base64," + "A".repeat(3 * 1024 * 1024);

      await expect(
        caller.users.uploadAvatar({
          imageData: largeData,
          mimeType: "image/png"
        })
      ).rejects.toThrow();
    });
  });

  describe("Password Change", () => {
    it("should reject password change for OAuth users", async () => {
      // Obtener un usuario OAuth
      const oauthUser = await db.getUserById(testUserId);
      
      // Si el usuario de prueba es JWT, skip este test
      if (oauthUser?.loginMethod === 'jwt') {
        return;
      }

      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "engineer", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.users.changePassword({
          currentPassword: "oldpass",
          newPassword: "newpass123"
        })
      ).rejects.toThrow("JWT");
    });

    it("should reject short passwords", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "engineer", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.users.changePassword({
          currentPassword: "anything",
          newPassword: "short"
        })
      ).rejects.toThrow();
    });

    it("should reject incorrect current password", async () => {
      const user = await db.getUserById(testUserId);
      
      // Solo probar si es usuario JWT con contraseña
      if (user?.loginMethod !== 'jwt' || !user.password) {
        return;
      }

      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "engineer", name: "Test User" },
        req: {} as any,
        res: {} as any,
      });

      await expect(
        caller.users.changePassword({
          currentPassword: "wrongpassword",
          newPassword: "newpassword123"
        })
      ).rejects.toThrow("incorrecta");
    });
  });

  describe("Database Functions", () => {
    it("should get user notification settings", async () => {
      const settings = await db.getUserNotificationSettings(testUserId);
      
      expect(settings).toBeDefined();
      expect(typeof settings?.enablePushNotifications).toBe('boolean');
      expect(typeof settings?.milestoneReminderDays).toBe('number');
    });

    it("should update notification settings via db function", async () => {
      const original = await db.getUserNotificationSettings(testUserId);
      
      const updated = await db.updateNotificationSettings(testUserId, {
        enableDelayAlerts: false
      });

      expect(updated?.enableDelayAlerts).toBe(false);

      // Restaurar
      if (original) {
        await db.updateNotificationSettings(testUserId, {
          enableDelayAlerts: original.enableDelayAlerts
        });
      }
    });
  });
});
