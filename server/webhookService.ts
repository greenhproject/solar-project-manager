import crypto from "crypto";
import { getDb } from "./db";
import { webhooks, outgoingWebhookLogs } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export type WebhookEvent =
  | "milestone.status_changed"
  | "milestone.completed"
  | "project.completed"
  | "project.status_changed";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Dispara webhooks para un evento específico
 * Busca todos los webhooks activos suscritos al evento y envía el payload
 */
export async function triggerWebhooks(event: WebhookEvent, data: Record<string, any>) {
  const db = await getDb();
  if (!db) return;

  try {
    // Buscar todos los webhooks activos
    const activeWebhooks = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.isActive, true));

    // Filtrar por evento
    const matchingWebhooks = activeWebhooks.filter((wh) => {
      const events: string[] = JSON.parse(wh.events);
      return events.includes(event) || events.includes("*");
    });

    if (matchingWebhooks.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Enviar a cada webhook en paralelo
    const results = await Promise.allSettled(
      matchingWebhooks.map((wh) => sendWebhook(wh, payload))
    );

    // Actualizar contadores de fallo
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const wh = matchingWebhooks[i];
      if (result.status === "rejected" || (result.status === "fulfilled" && !result.value.success)) {
        const newFailCount = wh.failCount + 1;
        // Desactivar después de 10 fallos consecutivos
        if (newFailCount >= 10) {
          await db.update(webhooks).set({ isActive: false, failCount: newFailCount }).where(eq(webhooks.id, wh.id));
        } else {
          await db.update(webhooks).set({ failCount: newFailCount }).where(eq(webhooks.id, wh.id));
        }
      } else {
        // Reset fail count on success
        if (wh.failCount > 0) {
          await db.update(webhooks).set({ failCount: 0, lastTriggeredAt: new Date() }).where(eq(webhooks.id, wh.id));
        } else {
          await db.update(webhooks).set({ lastTriggeredAt: new Date() }).where(eq(webhooks.id, wh.id));
        }
      }
    }
  } catch (error) {
    console.error("[Webhook] Error triggering webhooks:", error);
  }
}

/**
 * Envía un webhook individual y registra el resultado
 */
async function sendWebhook(
  wh: typeof webhooks.$inferSelect,
  payload: WebhookPayload
): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };

  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", wh.secret)
    .update(payloadStr)
    .digest("hex");

  const startTime = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(wh.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": payload.event,
        "X-Webhook-Timestamp": payload.timestamp,
        "User-Agent": "SolarProjectManager/1.0",
      },
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = response.status;
    responseBody = (await response.text()).substring(0, 1000); // Truncar a 1000 chars
    success = response.status >= 200 && response.status < 300;
  } catch (err: any) {
    error = err.message || "Unknown error";
    if (err.name === "AbortError") {
      error = "Timeout: webhook no respondió en 10 segundos";
    }
  }

  const duration = Date.now() - startTime;

  // Registrar en logs
  try {
    await db.insert(outgoingWebhookLogs).values({
      webhookId: wh.id,
      event: payload.event,
      payload: payloadStr,
      responseStatus,
      responseBody,
      success,
      error,
      duration,
    });
  } catch (logErr) {
    console.error("[Webhook] Error logging webhook result:", logErr);
  }

  return { success };
}

/**
 * Helpers para disparar webhooks desde los routers
 */
export function triggerMilestoneStatusChanged(milestoneData: {
  milestoneId: number;
  milestoneName: string;
  projectId: number;
  projectName: string;
  oldStatus: string;
  newStatus: string;
}) {
  // Fire and forget - no bloquear el request principal
  triggerWebhooks("milestone.status_changed", milestoneData).catch(() => {});
}

export function triggerMilestoneCompleted(milestoneData: {
  milestoneId: number;
  milestoneName: string;
  projectId: number;
  projectName: string;
  completedDate: string;
}) {
  triggerWebhooks("milestone.completed", milestoneData).catch(() => {});
}

export function triggerProjectCompleted(projectData: {
  projectId: number;
  projectName: string;
  completedDate: string;
  totalMilestones: number;
}) {
  triggerWebhooks("project.completed", projectData).catch(() => {});
}

export function triggerProjectStatusChanged(projectData: {
  projectId: number;
  projectName: string;
  oldStatus: string;
  newStatus: string;
}) {
  triggerWebhooks("project.status_changed", projectData).catch(() => {});
}
