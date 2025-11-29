/**
 * Helper para gestionar notificaciones del navegador
 */

export type NotificationPermission = "default" | "granted" | "denied";

/**
 * Solicitar permiso para notificaciones del navegador
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("Este navegador no soporta notificaciones");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Verificar si las notificaciones están habilitadas
 */
export function areNotificationsEnabled(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

/**
 * Mostrar notificación del navegador
 */
export function showNotification(title: string, options?: NotificationOptions) {
  if (!areNotificationsEnabled()) {
    console.warn("Las notificaciones no están habilitadas");
    return null;
  }

  const defaultOptions: NotificationOptions = {
    icon: "/icon.png", // Logo de GreenH Project
    badge: "/icon.png",
    requireInteraction: false,
    ...options,
  };

  try {
    const notification = new Notification(title, defaultOptions);

    // Auto-cerrar después de 10 segundos si no se especifica requireInteraction
    if (!defaultOptions.requireInteraction) {
      setTimeout(() => notification.close(), 10000);
    }

    return notification;
  } catch (error) {
    console.error("Error al mostrar notificación:", error);
    return null;
  }
}

/**
 * Mostrar notificación de hito próximo a vencer
 */
export function notifyMilestoneDue(
  milestoneName: string,
  projectName: string,
  daysLeft: number
) {
  return showNotification("⏰ Hito Próximo a Vencer", {
    body: `El hito "${milestoneName}" del proyecto "${projectName}" vence en ${daysLeft} día(s)`,
    tag: `milestone-due-${milestoneName}`,
    requireInteraction: true,
  });
}

/**
 * Mostrar notificación de proyecto con retraso
 */
export function notifyProjectDelayed(projectName: string) {
  return showNotification("⚠️ Proyecto con Retraso", {
    body: `El proyecto "${projectName}" está retrasado. Revisa el estado de los hitos.`,
    tag: `project-delayed-${projectName}`,
    requireInteraction: true,
  });
}

/**
 * Mostrar notificación de problema detectado por IA
 */
export function notifyAIIssue(projectName: string, issue: string) {
  return showNotification("🤖 Problema Detectado por IA", {
    body: `Proyecto "${projectName}": ${issue}`,
    tag: `ai-issue-${projectName}`,
    requireInteraction: true,
  });
}

/**
 * Mostrar notificación genérica del sistema
 */
export function notifySystem(message: string) {
  return showNotification("🔔 Solar Project Manager", {
    body: message,
    tag: "system-notification",
  });
}
