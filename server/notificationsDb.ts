import { getDb } from "./db";
import { notificationHistory, type InsertNotificationHistory } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Crear una nueva notificación
 */
export async function createNotification(data: InsertNotificationHistory) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(notificationHistory).values(data);
  return result;
}

/**
 * Obtener todas las notificaciones de un usuario
 */
export async function getNotificationsByUserId(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db
    .select()
    .from(notificationHistory)
    .where(eq(notificationHistory.userId, userId))
    .orderBy(desc(notificationHistory.sentAt))
    .limit(limit);
}

/**
 * Obtener notificaciones no leídas de un usuario
 */
export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db
    .select()
    .from(notificationHistory)
    .where(
      and(
        eq(notificationHistory.userId, userId),
        eq(notificationHistory.isRead, false)
      )
    )
    .orderBy(desc(notificationHistory.sentAt));
}

/**
 * Contar notificaciones no leídas
 */
export async function countUnreadNotifications(userId: number): Promise<number> {
  const notifications = await getUnreadNotifications(userId);
  return notifications.length;
}

/**
 * Marcar notificación como leída
 */
export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(notificationHistory)
    .set({ isRead: true })
    .where(eq(notificationHistory.id, notificationId));
  
  return { success: true };
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(notificationHistory)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationHistory.userId, userId),
        eq(notificationHistory.isRead, false)
      )
    );
  
  return { success: true };
}

/**
 * Eliminar una notificación
 */
export async function deleteNotification(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .delete(notificationHistory)
    .where(eq(notificationHistory.id, notificationId));
  
  return { success: true };
}

/**
 * Eliminar todas las notificaciones de un usuario
 */
export async function deleteAllNotifications(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .delete(notificationHistory)
    .where(eq(notificationHistory.userId, userId));
  
  return { success: true };
}
