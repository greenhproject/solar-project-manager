// Helper para gestionar notificaciones push del navegador

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

/**
 * Verificar si las notificaciones están soportadas en el navegador
 */
export function areNotificationsSupported(): boolean {
  return "Notification" in window;
}

/**
 * Obtener el estado actual de los permisos de notificaciones
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!areNotificationsSupported()) {
    return { granted: false, denied: true, default: false };
  }

  const permission = Notification.permission;
  return {
    granted: permission === "granted",
    denied: permission === "denied",
    default: permission === "default",
  };
}

/**
 * Solicitar permiso para enviar notificaciones
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!areNotificationsSupported()) {
    console.warn("Las notificaciones no están soportadas en este navegador");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    console.warn("El usuario ha denegado los permisos de notificaciones");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error al solicitar permisos de notificaciones:", error);
    return false;
  }
}

/**
 * Enviar una notificación push
 */
export function sendNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!areNotificationsSupported()) {
    console.warn("Las notificaciones no están soportadas");
    return null;
  }

  if (Notification.permission !== "granted") {
    console.warn("No hay permisos para enviar notificaciones");
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: "/logo.png",
      badge: "/logo.png",
      ...options,
    });

    return notification;
  } catch (error) {
    console.error("Error al enviar notificación:", error);
    return null;
  }
}

/**
 * Enviar notificación de hito próximo a vencer
 */
export function notifyMilestoneDue(
  milestoneName: string,
  projectName: string,
  daysRemaining: number,
  onClick?: () => void
) {
  const notification = sendNotification(
    `🎯 Hito próximo a vencer`,
    {
      body: `El hito "${milestoneName}" del proyecto "${projectName}" vence en ${daysRemaining} día${daysRemaining !== 1 ? "s" : ""}`,
      tag: `milestone-due-${milestoneName}`,
      requireInteraction: true,
    }
  );

  if (notification && onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }

  return notification;
}

/**
 * Enviar notificación de proyecto retrasado
 */
export function notifyProjectDelayed(
  projectName: string,
  daysOverdue: number,
  onClick?: () => void
) {
  const notification = sendNotification(
    `⚠️ Proyecto retrasado`,
    {
      body: `El proyecto "${projectName}" está retrasado por ${daysOverdue} día${daysOverdue !== 1 ? "s" : ""}`,
      tag: `project-delayed-${projectName}`,
      requireInteraction: true,
    }
  );

  if (notification && onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }

  return notification;
}

/**
 * Enviar notificación de hito completado
 */
export function notifyMilestoneCompleted(
  milestoneName: string,
  projectName: string,
  onClick?: () => void
) {
  const notification = sendNotification(
    `✅ Hito completado`,
    {
      body: `El hito "${milestoneName}" del proyecto "${projectName}" ha sido completado`,
      tag: `milestone-completed-${milestoneName}`,
    }
  );

  if (notification && onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }

  return notification;
}

/**
 * Enviar notificación personalizada
 */
export function notifyCustom(
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  onClick?: () => void
) {
  const icons = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
  };

  const notification = sendNotification(
    `${icons[type]} ${title}`,
    {
      body: message,
      tag: `custom-${Date.now()}`,
    }
  );

  if (notification && onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }

  return notification;
}

/**
 * Verificar y solicitar permisos si es necesario
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const status = getNotificationPermission();
  
  if (status.granted) {
    return true;
  }
  
  if (status.denied) {
    return false;
  }
  
  // Si es default, solicitar permiso
  return await requestNotificationPermission();
}
