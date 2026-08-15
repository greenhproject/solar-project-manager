/**
 * Adaptador para el Centro de Notificaciones GHP Hub.
 * 
 * Envía eventos firmados (HMAC-SHA256) al Hub centralizado de Green House Project.
 * El Hub muestra badges, campana y bandeja de pendientes con enlace directo al SPM.
 * 
 * Contrato: https://ghp.center/api/integrations/notifications
 * Documentación: Guía de despliegue — Centro de Notificaciones GHP
 * 
 * IMPORTANTE: Este adaptador NUNCA debe bloquear la operación de negocio.
 * Se ejecuta después del commit y falla silenciosamente si el Hub no está disponible.
 */
import crypto from "crypto";

// Tipos del evento según el contrato del Hub
export type HubEventSeverity = "info" | "warning" | "critical";
export type HubEventStatus = "open" | "resolved";

export type HubEvent = {
  eventId: string;
  recipientEmail: string;
  eventType: string;
  severity: HubEventSeverity;
  title: string;
  body: string;
  status: HubEventStatus;
  externalEntityId?: string;
  actionUrl?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
};

// Tipos de eventos que emite SPM
export type SpmEventType =
  | "milestone.assigned"
  | "milestone.due_soon"
  | "milestone.overdue"
  | "milestone.completed"
  | "milestone.rescheduled"
  | "project.assigned";

/**
 * Genera la firma HMAC-SHA256 según el contrato del Hub.
 * Firma = HMAC-SHA256(secret, timestamp + "." + jsonBody)
 */
export function generateSignature(secret: string, timestamp: string, body: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest("hex");
}

/**
 * Construye un eventId estable para un hito.
 * Formato: spm:milestone:<id>:attention
 */
export function buildMilestoneEventId(milestoneId: number): string {
  return `spm:milestone:${milestoneId}:attention`;
}

/**
 * Construye un eventId estable para un proyecto.
 * Formato: spm:project:<id>:attention
 */
export function buildProjectEventId(projectId: number): string {
  return `spm:project:${projectId}:attention`;
}

/**
 * Envía un evento al Centro de Notificaciones GHP Hub.
 * 
 * Retorna true si el Hub aceptó el evento (202), false en caso contrario.
 * NUNCA lanza excepciones — falla silenciosamente para no bloquear la operación de negocio.
 */
export async function notifyGhpHub(event: HubEvent): Promise<boolean> {
  const baseUrl = process.env.GHP_NOTIFICATION_HUB_URL?.replace(/\/+$/, "");
  const sourceKey = process.env.GHP_NOTIFICATION_SOURCE_KEY;
  const secret = process.env.GHP_NOTIFICATION_SIGNING_SECRET;

  if (!baseUrl || !sourceKey || !secret) {
    // Integración no configurada — omitir silenciosamente
    return false;
  }

  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = generateSignature(secret, timestamp, body);

  try {
    const response = await fetch(`${baseUrl}/api/integrations/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GHP-Source": sourceKey,
        "X-GHP-Timestamp": timestamp,
        "X-GHP-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.warn(`[GHP Hub] Evento rechazado: ${response.status} — eventId: ${event.eventId}`);
      return false;
    }

    console.info(`[GHP Hub] Evento enviado: ${event.eventType} → ${event.recipientEmail} (${event.eventId})`);
    return true;
  } catch (error) {
    console.warn("[GHP Hub] No se pudo enviar el evento:", (error as Error).message);
    return false;
  }
}

// ─── Helpers de alto nivel para SPM ───────────────────────────────────────────

/**
 * Notifica al Hub que un hito fue asignado a un ingeniero.
 */
export async function notifyMilestoneAssigned(params: {
  milestoneId: number;
  milestoneName: string;
  projectId: number;
  projectName: string;
  recipientEmail: string;
}): Promise<boolean> {
  return notifyGhpHub({
    eventId: buildMilestoneEventId(params.milestoneId),
    recipientEmail: params.recipientEmail.toLowerCase(),
    eventType: "milestone.assigned",
    severity: "info",
    title: "Nuevo hito asignado",
    body: `Se te asignó el hito "${params.milestoneName}" del proyecto "${params.projectName}".`,
    status: "open",
    externalEntityId: String(params.milestoneId),
    actionUrl: `https://spm.ghp.center/projects/${params.projectId}`,
    occurredAt: new Date().toISOString(),
    metadata: { projectName: params.projectName },
  });
}

/**
 * Notifica al Hub que un hito está próximo a vencer (warning).
 */
export async function notifyMilestoneDueSoon(params: {
  milestoneId: number;
  milestoneName: string;
  projectId: number;
  projectName: string;
  recipientEmail: string;
  dueDate: string;
}): Promise<boolean> {
  return notifyGhpHub({
    eventId: buildMilestoneEventId(params.milestoneId),
    recipientEmail: params.recipientEmail.toLowerCase(),
    eventType: "milestone.due_soon",
    severity: "warning",
    title: "Hito próximo a vencer",
    body: `El hito "${params.milestoneName}" del proyecto "${params.projectName}" vence el ${params.dueDate}.`,
    status: "open",
    externalEntityId: String(params.milestoneId),
    actionUrl: `https://spm.ghp.center/projects/${params.projectId}`,
    occurredAt: new Date().toISOString(),
    metadata: { projectName: params.projectName, dueDate: params.dueDate },
  });
}

/**
 * Notifica al Hub que un hito está vencido (critical).
 */
export async function notifyMilestoneOverdue(params: {
  milestoneId: number;
  milestoneName: string;
  projectId: number;
  projectName: string;
  recipientEmail: string;
}): Promise<boolean> {
  return notifyGhpHub({
    eventId: buildMilestoneEventId(params.milestoneId),
    recipientEmail: params.recipientEmail.toLowerCase(),
    eventType: "milestone.overdue",
    severity: "critical",
    title: "Hito vencido",
    body: `El hito "${params.milestoneName}" del proyecto "${params.projectName}" requiere atención inmediata.`,
    status: "open",
    externalEntityId: String(params.milestoneId),
    actionUrl: `https://spm.ghp.center/projects/${params.projectId}`,
    occurredAt: new Date().toISOString(),
    metadata: { projectName: params.projectName },
  });
}

/**
 * Notifica al Hub que un hito fue completado (resuelve el pendiente).
 */
export async function notifyMilestoneCompleted(params: {
  milestoneId: number;
  milestoneName: string;
  projectId: number;
  projectName: string;
  recipientEmail: string;
}): Promise<boolean> {
  return notifyGhpHub({
    eventId: buildMilestoneEventId(params.milestoneId),
    recipientEmail: params.recipientEmail.toLowerCase(),
    eventType: "milestone.completed",
    severity: "info",
    title: "Hito completado",
    body: `El hito "${params.milestoneName}" del proyecto "${params.projectName}" fue completado.`,
    status: "resolved",
    externalEntityId: String(params.milestoneId),
    actionUrl: `https://spm.ghp.center/projects/${params.projectId}`,
    occurredAt: new Date().toISOString(),
    metadata: { projectName: params.projectName },
  });
}

/**
 * Notifica al Hub que un hito fue reprogramado.
 */
export async function notifyMilestoneRescheduled(params: {
  milestoneId: number;
  milestoneName: string;
  projectId: number;
  projectName: string;
  recipientEmail: string;
  newDueDate: string;
  reason?: string;
}): Promise<boolean> {
  return notifyGhpHub({
    eventId: buildMilestoneEventId(params.milestoneId),
    recipientEmail: params.recipientEmail.toLowerCase(),
    eventType: "milestone.rescheduled",
    severity: "warning",
    title: "Hito reprogramado",
    body: `El hito "${params.milestoneName}" del proyecto "${params.projectName}" fue reprogramado al ${params.newDueDate}.${params.reason ? ` Motivo: ${params.reason}` : ""}`,
    status: "open",
    externalEntityId: String(params.milestoneId),
    actionUrl: `https://spm.ghp.center/projects/${params.projectId}`,
    occurredAt: new Date().toISOString(),
    metadata: { projectName: params.projectName, newDueDate: params.newDueDate, reason: params.reason },
  });
}

/**
 * Notifica al Hub que un proyecto fue asignado a un ingeniero.
 */
export async function notifyProjectAssigned(params: {
  projectId: number;
  projectName: string;
  recipientEmail: string;
}): Promise<boolean> {
  return notifyGhpHub({
    eventId: buildProjectEventId(params.projectId),
    recipientEmail: params.recipientEmail.toLowerCase(),
    eventType: "project.assigned",
    severity: "info",
    title: "Proyecto asignado",
    body: `Se te asignó el proyecto "${params.projectName}".`,
    status: "open",
    externalEntityId: String(params.projectId),
    actionUrl: `https://spm.ghp.center/projects/${params.projectId}`,
    occurredAt: new Date().toISOString(),
    metadata: { projectName: params.projectName },
  });
}
