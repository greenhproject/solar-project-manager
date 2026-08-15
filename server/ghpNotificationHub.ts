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
import * as db from "./db";

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

export type HubDeliveryResult = {
  success: boolean;
  deliveryStatus: "sent" | "failed" | "skipped";
  configured: boolean;
  responseStatus?: number;
  error?: string;
  durationMs: number;
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
export function getGhpHubConfigurationStatus() {
  const baseUrl = process.env.GHP_NOTIFICATION_HUB_URL?.replace(/\/+$/, "");
  const sourceKey = process.env.GHP_NOTIFICATION_SOURCE_KEY;
  const secret = process.env.GHP_NOTIFICATION_SIGNING_SECRET;
  const missing = [
    !baseUrl && "GHP_NOTIFICATION_HUB_URL",
    !sourceKey && "GHP_NOTIFICATION_SOURCE_KEY",
    !secret && "GHP_NOTIFICATION_SIGNING_SECRET",
  ].filter(Boolean) as string[];
  return { configured: missing.length === 0, missing };
}

async function recordHubDelivery(
  event: HubEvent,
  body: string,
  result: Omit<HubDeliveryResult, "configured">,
) {
  try {
    await db.createGhpNotificationDeliveryLog({
      eventId: event.eventId,
      eventType: event.eventType,
      recipientEmail: event.recipientEmail.toLowerCase(),
      payload: body,
      deliveryStatus: result.deliveryStatus,
      responseStatus: result.responseStatus ?? null,
      responseBody: null,
      error: result.error ?? null,
      durationMs: result.durationMs,
    });
  } catch (logError) {
    console.warn("[GHP Hub] No se pudo guardar la auditoría de entrega:", (logError as Error).message);
  }
}

/**
 * Entrega un evento y retorna el resultado detallado para diagnóstico y pruebas.
 * Nunca lanza una excepción, para no bloquear operaciones de negocio.
 */
export async function deliverGhpHubEvent(event: HubEvent): Promise<HubDeliveryResult> {
  const baseUrl = process.env.GHP_NOTIFICATION_HUB_URL?.replace(/\/+$/, "");
  const sourceKey = process.env.GHP_NOTIFICATION_SOURCE_KEY;
  const secret = process.env.GHP_NOTIFICATION_SIGNING_SECRET;
  const startedAt = Date.now();
  const body = JSON.stringify(event);

  if (!baseUrl || !sourceKey || !secret) {
    const missing = getGhpHubConfigurationStatus().missing.join(", ");
    const result = {
      success: false,
      deliveryStatus: "skipped" as const,
      error: `Integración no configurada. Faltan: ${missing}`,
      durationMs: Date.now() - startedAt,
    };
    console.warn(`[GHP Hub] ${result.error}`);
    await recordHubDelivery(event, body, result);
    return { ...result, configured: false };
  }

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

    const responseStatus = response.status;
    const responseBody = (await response.text()).slice(0, 2_000);
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const result = {
        success: false,
        deliveryStatus: "failed" as const,
        responseStatus,
        error: `Hub respondió HTTP ${responseStatus}${responseBody ? `: ${responseBody}` : ""}`,
        durationMs,
      };
      console.warn(`[GHP Hub] Evento rechazado: ${responseStatus} — eventId: ${event.eventId}`);
      await recordHubDelivery(event, body, result);
      return { ...result, configured: true };
    }

    const result = {
      success: true,
      deliveryStatus: "sent" as const,
      responseStatus,
      durationMs,
    };
    console.info(`[GHP Hub] Evento enviado: ${event.eventType} → ${event.recipientEmail} (${event.eventId})`);
    await recordHubDelivery(event, body, result);
    return { ...result, configured: true };
  } catch (error) {
    const result = {
      success: false,
      deliveryStatus: "failed" as const,
      error: (error as Error).message,
      durationMs: Date.now() - startedAt,
    };
    console.warn("[GHP Hub] No se pudo enviar el evento:", result.error);
    await recordHubDelivery(event, body, result);
    return { ...result, configured: true };
  }
}

/** Mantiene compatibilidad con los helpers existentes que solo necesitan éxito/fallo. */
export async function notifyGhpHub(event: HubEvent): Promise<boolean> {
  return (await deliverGhpHubEvent(event)).success;
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
