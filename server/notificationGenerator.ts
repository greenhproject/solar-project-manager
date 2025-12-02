/**
 * Generador automático de notificaciones para hitos próximos y vencidos
 */

import * as db from "./db";
import { sendMilestoneDueSoonEmail, sendMilestoneOverdueEmail } from "./emailService";

/**
 * Genera notificaciones para hitos próximos a vencer (3 días antes)
 */
export async function generateUpcomingMilestoneNotifications() {
  const upcomingMilestones = await db.getUpcomingMilestones(3);

  const notifications = [];

  for (const milestone of upcomingMilestones) {
    // Calcular días restantes
    const daysUntil = Math.ceil(
      (new Date(milestone.dueDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const message =
      daysUntil === 0
        ? `El hito "${milestone.milestoneName}" del proyecto "${milestone.projectName}" vence hoy`
        : daysUntil === 1
          ? `El hito "${milestone.milestoneName}" del proyecto "${milestone.projectName}" vence mañana`
          : `El hito "${milestone.milestoneName}" del proyecto "${milestone.projectName}" vence en ${daysUntil} días`;

    // Crear notificación para el usuario asignado al proyecto
    if (milestone.assignedEngineerId) {
      await db.logNotification({
        userId: milestone.assignedEngineerId,
        title: "Hito próximo a vencer",
        message,
        type: "milestone_due_soon",
        projectId: milestone.projectId,
      });

      // Enviar email
      try {
        const engineer = await db.getUserById(milestone.assignedEngineerId);
        if (engineer?.email) {
          await sendMilestoneDueSoonEmail(
            engineer.email,
            milestone.milestoneName,
            milestone.projectName,
            new Date(milestone.dueDate),
            daysUntil
          );
          console.log(`[NotificationGenerator] Email sent to ${engineer.email} for upcoming milestone`);
        }
      } catch (error) {
        console.error('[NotificationGenerator] Error sending email:', error);
      }

      notifications.push({
        userId: milestone.assignedEngineerId,
        milestoneId: milestone.milestoneId,
        type: "milestone_due_soon",
      });
    }
  }

  return notifications;
}

/**
 * Genera notificaciones para hitos vencidos
 */
export async function generateOverdueMilestoneNotifications() {
  const overdueMilestones = await db.getOverdueMilestones();

  const notifications = [];

  for (const milestone of overdueMilestones) {
    // Calcular días de retraso
    const daysOverdue = Math.ceil(
      (new Date().getTime() - new Date(milestone.dueDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const message =
      daysOverdue === 1
        ? `El hito "${milestone.milestoneName}" del proyecto "${milestone.projectName}" está vencido desde ayer`
        : `El hito "${milestone.milestoneName}" del proyecto "${milestone.projectName}" está vencido desde hace ${daysOverdue} días`;

    // Crear notificación para el usuario asignado al proyecto
    if (milestone.assignedEngineerId) {
      await db.logNotification({
        userId: milestone.assignedEngineerId,
        title: "Hito vencido",
        message,
        type: "milestone_overdue",
        projectId: milestone.projectId,
      });

      // Enviar email
      try {
        const engineer = await db.getUserById(milestone.assignedEngineerId);
        if (engineer?.email) {
          await sendMilestoneOverdueEmail(
            engineer.email,
            milestone.milestoneName,
            milestone.projectName,
            new Date(milestone.dueDate),
            daysOverdue
          );
          console.log(`[NotificationGenerator] Email sent to ${engineer.email} for overdue milestone`);
        }
      } catch (error) {
        console.error('[NotificationGenerator] Error sending email:', error);
      }

      notifications.push({
        userId: milestone.assignedEngineerId,
        milestoneId: milestone.milestoneId,
        type: "milestone_overdue",
      });
    }
  }

  return notifications;
}

/**
 * Ejecuta el generador de notificaciones (debe llamarse diariamente)
 */
export async function runNotificationGenerator() {
  console.log("[NotificationGenerator] Iniciando generación de notificaciones...");

  try {
    const upcomingNotifications = await generateUpcomingMilestoneNotifications();
    const overdueNotifications = await generateOverdueMilestoneNotifications();

    console.log(
      `[NotificationGenerator] Generadas ${upcomingNotifications.length} notificaciones de hitos próximos`
    );
    console.log(
      `[NotificationGenerator] Generadas ${overdueNotifications.length} notificaciones de hitos vencidos`
    );

    return {
      upcoming: upcomingNotifications.length,
      overdue: overdueNotifications.length,
      total: upcomingNotifications.length + overdueNotifications.length,
    };
  } catch (error) {
    console.error("[NotificationGenerator] Error al generar notificaciones:", error);
    throw error;
  }
}
