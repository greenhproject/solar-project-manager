import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Notification System - CRUD Operations", () => {
  const testUserId = 1; // Usuario existente en la BD
  const testProjectId = 1; // Proyecto existente en la BD
  let testNotificationId: number;

  it("should create a notification", async () => {
    await db.logNotification({
      userId: testUserId,
      type: "project_assigned",
      title: "Nuevo proyecto asignado",
      message: "Se te ha asignado un nuevo proyecto",
      projectId: testProjectId,
    });

    const notifications = await db.getUserNotifications(testUserId, 10, false);
    expect(notifications.length).toBeGreaterThan(0);
    
    const notification = notifications[0];
    testNotificationId = notification.id;
    expect(notification.title).toBe("Nuevo proyecto asignado");
    expect(notification.type).toBe("project_assigned");
    expect(notification.isRead).toBe(false);
  });

  it("should get user notifications via tRPC", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.notifications.getUserNotifications({
      limit: 10,
      unreadOnly: false,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].userId).toBe(testUserId);
  });

  it("should filter unread notifications only", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.notifications.getUserNotifications({
      limit: 10,
      unreadOnly: true,
    });

    expect(result.every(n => !n.isRead)).toBe(true);
  });

  it("should mark notification as read", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    await caller.notifications.markAsRead({ id: testNotificationId });

    const notification = await db.getNotificationById(testNotificationId);
    expect(notification?.isRead).toBe(true);
  });

  it("should mark all notifications as read", async () => {
    // Crear otra notificación no leída
    await db.logNotification({
      userId: testUserId,
      type: "milestone_due_soon",
      title: "Hito próximo a vencer",
      message: "Un hito está próximo a vencer",
    });

    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    await caller.notifications.markAllAsRead();

    const unreadNotifications = await db.getUserNotifications(testUserId, 10, true);
    expect(unreadNotifications.length).toBe(0);
  });

  it("should delete notification", async () => {
    // Crear notificación para eliminar
    await db.logNotification({
      userId: testUserId,
      type: "general",
      title: "Notificación de prueba",
      message: "Esta notificación será eliminada",
    });

    const notifications = await db.getUserNotifications(testUserId, 1, false);
    const notifToDelete = notifications[0];

    const caller = appRouter.createCaller({
      user: { id: testUserId, role: "engineer", name: "Test User" },
      req: {} as any,
      res: {} as any,
    });

    await caller.notifications.delete({ id: notifToDelete.id });

    const deletedNotif = await db.getNotificationById(notifToDelete.id);
    expect(deletedNotif).toBeNull();
  });

  it("should prevent access to other users notifications", async () => {
    const otherUserId = 999; // Usuario diferente

    // Crear notificación para el primer usuario
    await db.logNotification({
      userId: testUserId,
      type: "general",
      title: "Private notification",
      message: "This is private",
    });

    const notifications = await db.getUserNotifications(testUserId, 1, false);
    const privateNotif = notifications[0];

    const caller = appRouter.createCaller({
      user: { id: otherUserId, role: "engineer", name: "Other User" },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.notifications.markAsRead({ id: privateNotif.id })
    ).rejects.toThrow("No tienes permiso");
  });

  it("should support all notification types", async () => {
    const types = [
      "milestone_due_soon",
      "milestone_overdue",
      "project_completed",
      "project_assigned",
      "project_updated",
      "milestone_reminder",
    ] as const;

    for (const type of types) {
      await db.logNotification({
        userId: testUserId,
        type,
        title: `Test ${type}`,
        message: `Testing notification type: ${type}`,
      });
    }

    const notifications = await db.getUserNotifications(testUserId, 50, false);
    const createdTypes = notifications.map(n => n.type);
    
    for (const type of types) {
      expect(createdTypes).toContain(type);
    }
  });
});
