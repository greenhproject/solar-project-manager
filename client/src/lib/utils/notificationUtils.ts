/**
 * Utilidades consolidadas para gestión de notificaciones del navegador
 * Centraliza toda la lógica de notificaciones push en un solo módulo
 */

/**
 * Tipo de permiso de notificaciones
 */
export type NotificationPermission = "default" | "granted" | "denied";

/**
 * Estado detallado de permisos de notificaciones
 */
export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

/**
 * Tipo de notificación
 */
export type NotificationType = "info" | "success" | "warning" | "error";

/**
 * Verifica si las notificaciones están soportadas en el navegador
 * @returns true si el navegador soporta notificaciones
 */
export function areNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Verifica si las notificaciones están habilitadas y con permiso concedido
 * @returns true si las notificaciones están habilitadas
 */
export function areNotificationsEnabled(): boolean {
  return areNotificationsSupported() && Notification.permission === "granted";
}

/**
 * Obtiene el estado actual de los permisos de notificaciones
 * @returns Objeto con el estado detallado de permisos
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
 * Solicita permiso para mostrar notificaciones del navegador
 * @returns Promise que resuelve con el estado del permiso
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!areNotificationsSupported()) {
    console.warn("Este navegador no soporta notificaciones");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    console.warn("El usuario ha denegado los permisos de notificaciones");
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("Error al solicitar permisos de notificaciones:", error);
    return "denied";
  }
}

/**
 * Asegura que los permisos de notificación estén concedidos
 * Solicita permiso si aún no se ha decidido
 * @returns Promise que resuelve con true si se concedió el permiso
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
  const permission = await requestNotificationPermission();
  return permission === "granted";
}

/**
 * Muestra una notificación del navegador
 * @param title - Título de la notificación
 * @param options - Opciones de configuración de la notificación
 * @returns Instancia de Notification o null si falla
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
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

    // Auto-cerrar después de 10 segundos si no requiere interacción
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
 * Muestra una notificación de hito próximo a vencer
 * @param milestoneName - Nombre del hito
 * @param projectName - Nombre del proyecto
 * @param daysRemaining - Días restantes hasta el vencimiento
 * @param onClick - Callback opcional al hacer clic en la notificación
 * @returns Instancia de Notification o null
 */
export function notifyMilestoneDue(
  milestoneName: string,
  projectName: string,
  daysRemaining: number,
  onClick?: () => void
): Notification | null {
  const notification = showNotification("⏰ Hito Próximo a Vencer", {
    body: `El hito "${milestoneName}" del proyecto "${projectName}" vence en ${daysRemaining} día${daysRemaining !== 1 ? "s" : ""}`,
    tag: `milestone-due-${milestoneName}`,
    requireInteraction: true,
  });

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
 * Muestra una notificación de proyecto retrasado
 * @param projectName - Nombre del proyecto
 * @param daysOverdue - Días de retraso (opcional)
 * @param onClick - Callback opcional al hacer clic
 * @returns Instancia de Notification o null
 */
export function notifyProjectDelayed(
  projectName: string,
  daysOverdue?: number,
  onClick?: () => void
): Notification | null {
  const body = daysOverdue
    ? `El proyecto "${projectName}" está retrasado por ${daysOverdue} día${daysOverdue !== 1 ? "s" : ""}`
    : `El proyecto "${projectName}" está retrasado. Revisa el estado de los hitos.`;

  const notification = showNotification("⚠️ Proyecto con Retraso", {
    body,
    tag: `project-delayed-${projectName}`,
    requireInteraction: true,
  });

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
 * Muestra una notificación de hito completado
 * @param milestoneName - Nombre del hito
 * @param projectName - Nombre del proyecto
 * @param onClick - Callback opcional al hacer clic
 * @returns Instancia de Notification o null
 */
export function notifyMilestoneCompleted(
  milestoneName: string,
  projectName: string,
  onClick?: () => void
): Notification | null {
  const notification = showNotification("✅ Hito Completado", {
    body: `El hito "${milestoneName}" del proyecto "${projectName}" ha sido completado`,
    tag: `milestone-completed-${milestoneName}`,
  });

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
 * Muestra una notificación de problema detectado por IA
 * @param projectName - Nombre del proyecto
 * @param issue - Descripción del problema
 * @param onClick - Callback opcional al hacer clic
 * @returns Instancia de Notification o null
 */
export function notifyAIIssue(
  projectName: string,
  issue: string,
  onClick?: () => void
): Notification | null {
  const notification = showNotification("🤖 Problema Detectado por IA", {
    body: `Proyecto "${projectName}": ${issue}`,
    tag: `ai-issue-${projectName}`,
    requireInteraction: true,
  });

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
 * Muestra una notificación genérica del sistema
 * @param message - Mensaje a mostrar
 * @param onClick - Callback opcional al hacer clic
 * @returns Instancia de Notification o null
 */
export function notifySystem(
  message: string,
  onClick?: () => void
): Notification | null {
  const notification = showNotification("🔔 Solar Project Manager", {
    body: message,
    tag: "system-notification",
  });

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
 * Muestra una notificación personalizada con tipo
 * @param title - Título de la notificación
 * @param message - Mensaje de la notificación
 * @param type - Tipo de notificación (info, success, warning, error)
 * @param onClick - Callback opcional al hacer clic
 * @returns Instancia de Notification o null
 */
export function notifyCustom(
  title: string,
  message: string,
  type: NotificationType = "info",
  onClick?: () => void
): Notification | null {
  const icons: Record<NotificationType, string> = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
  };

  const notification = showNotification(`${icons[type]} ${title}`, {
    body: message,
    tag: `custom-${Date.now()}`,
  });

  if (notification && onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }

  return notification;
}
