/**
 * Handler del Heartbeat para envío de emails de recordatorio de hitos vencidos
 * Se ejecuta diariamente a la hora configurada por el admin
 * Detecta hitos vencidos, determina nivel de urgencia y envía emails profesionales
 */

import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { milestones, projects, users, milestoneReminderConfig, milestoneReminderLogs } from "../../drizzle/schema";
import { eq, and, lt, ne, isNull, isNotNull, sql } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { sdk } from "../_core/sdk";
import { getConfiguredTimezone, getNowInConfiguredTimezone } from "../timezone";

/**
 * Función exportada que ejecuta la lógica de envío de recordatorios.
 * Puede ser invocada tanto desde el endpoint HTTP como desde el cron interno.
 */
export async function processMilestoneReminders(): Promise<{ ok: boolean; summary?: any; skipped?: string }> {
  const dbInst = await getDb();
  if (!dbInst) {
    throw new Error("DB no disponible");
  }

  const [config] = await dbInst.select().from(milestoneReminderConfig).limit(1);
  
  if (!config || !config.isEnabled) {
    console.log("[MilestoneReminders] Sistema desactivado");
    return { ok: true, skipped: "disabled" };
  }

  const now = await getNowInConfiguredTimezone();
  // Solo considerar vencidos los hitos cuya fecha es ANTES del inicio de hoy
  const startOfToday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0
  ));
  const overdueMilestones = await dbInst
    .select({
      milestone: milestones,
      project: projects,
      assignedUser: users,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .leftJoin(users, eq(milestones.assignedUserId, users.id))
    .where(
      and(
        lt(milestones.dueDate, startOfToday),
        ne(milestones.status, "completed"),
        isNull(milestones.completedDate)
      )
    );

  console.log(`[MilestoneReminders] Encontrados ${overdueMilestones.length} hitos vencidos`);

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const { milestone, project, assignedUser } of overdueMilestones) {
    const daysOverdue = Math.floor((now.getTime() - milestone.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue > config.maxReminderDays) {
      skippedCount++;
      continue;
    }

    let urgencyLevel: "reminder" | "urgent" | "critical";
    let subject: string;
    
    if (daysOverdue >= config.criticalDaysThreshold) {
      urgencyLevel = "critical";
      subject = config.criticalSubject || "\u{1F6A8} Crítico: Hito con retraso grave - Acción inmediata requerida";
    } else if (daysOverdue >= config.urgentDaysThreshold) {
      urgencyLevel = "urgent";
      subject = config.urgentSubject || "\u26A0\uFE0F Urgente: Hito con retraso significativo";
    } else {
      urgencyLevel = "reminder";
      subject = config.reminderSubject || "Recordatorio: Hito pendiente de completar";
    }

    let recipientEmail: string | null = null;
    let recipientName: string | null = null;
    let recipientUserId: number | null = null;

    if (assignedUser && assignedUser.email) {
      recipientEmail = assignedUser.email;
      recipientName = assignedUser.name || "Responsable";
      recipientUserId = assignedUser.id;
    }

    if (!recipientEmail) {
      skippedCount++;
      continue;
    }

    // Verificar si ya se envió hoy para este hito
    const [existingLog] = await dbInst
      .select()
      .from(milestoneReminderLogs)
      .where(
        and(
          eq(milestoneReminderLogs.milestoneId, milestone.id),
          eq(milestoneReminderLogs.recipientEmail, recipientEmail),
          sql`DATE(${milestoneReminderLogs.sentAt}) = CURDATE()`
        )
      )
      .limit(1);

    if (existingLog) {
      skippedCount++;
      continue;
    }

    const [preLog] = await dbInst.insert(milestoneReminderLogs).values({
      milestoneId: milestone.id,
      projectId: project.id,
      recipientUserId,
      recipientEmail,
      recipientName,
      urgencyLevel,
      daysOverdue,
      status: "sent",
      errorMessage: null,
    }).$returningId();

    const logId = preLog.id;
    const rescheduleToken = Buffer.from(`${logId}-${milestone.id}-${recipientEmail}`).toString("base64url");

    const emailHtml = generateReminderEmailHtml({
      recipientName: recipientName || "Responsable",
      milestoneName: milestone.name,
      projectName: project.name,
      dueDate: milestone.dueDate,
      daysOverdue,
      urgencyLevel,
      milestoneDescription: milestone.description || "",
      customMessage: config.customMessage || "",
      milestoneId: milestone.id,
      projectId: project.id,
      logId,
      rescheduleToken,
    });

    const personalizedSubject = `${subject} - ${milestone.name} (${daysOverdue} días)`;

    const sent = await sendEmail({
      to: recipientEmail,
      subject: personalizedSubject,
      html: emailHtml,
    });

    if (sent && config.sendCopyToAdmin && config.adminCcEmail) {
      await sendEmail({
        to: config.adminCcEmail,
        subject: `[CC] ${personalizedSubject}`,
        html: emailHtml,
      });
    }

    await dbInst.update(milestoneReminderLogs)
      .set({
        status: sent ? "sent" : "failed",
        errorMessage: sent ? null : "Email service returned false",
      })
      .where(eq(milestoneReminderLogs.id, logId));

    // ─── GHP Hub: Notificar hito vencido ───
    try {
      const { notifyMilestoneOverdue } = await import("../ghpNotificationHub");
      await notifyMilestoneOverdue({
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        projectId: project.id,
        projectName: project.name,
        recipientEmail: recipientEmail!,
      });
    } catch (e) {
      console.warn("[GHP Hub] Error notificando hito vencido:", e);
    }

    if (sent) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`[MilestoneReminders] Resultado: ${sentCount} enviados, ${skippedCount} omitidos, ${failedCount} fallidos`);

  return {
    ok: true,
    summary: {
      totalOverdue: overdueMilestones.length,
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount,
    },
  };
}

export const milestoneReminderRouter = Router();

/**
 * POST /api/scheduled/milestone-reminders
 * Handler del Heartbeat - se ejecuta diariamente
 */
/**
 * POST /api/scheduled/milestone-reminders
 * Endpoint HTTP que puede ser llamado manualmente o por un cron externo.
 * Ya no requiere autenticación de Heartbeat de Manus.
 * Acepta un header secreto X-Cron-Secret para seguridad básica.
 */
milestoneReminderRouter.post("/api/scheduled/milestone-reminders", async (req: Request, res: Response) => {
  try {
    // Seguridad: verificar header secreto o autenticación
    const cronSecret = req.headers["x-cron-secret"];
    const expectedSecret = process.env.CRON_SECRET || "ghp-milestone-cron-2026";
    
    // Permitir acceso si: tiene el secreto correcto, o viene de localhost, o tiene sesión válida
    const isLocalhost = req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1";
    const hasValidSecret = cronSecret === expectedSecret;
    
    if (!isLocalhost && !hasValidSecret) {
      // Intentar autenticación normal como fallback
      try {
        const user = await sdk.authenticateRequest(req);
        if (!user || ((user as any).role !== "admin" && !(user as any).isCron)) {
          return res.status(403).json({ error: "unauthorized" });
        }
      } catch {
        return res.status(403).json({ error: "unauthorized - provide X-Cron-Secret header" });
      }
    }

    console.log("[MilestoneReminders] Cron triggered at", new Date().toISOString());

    const result = await processMilestoneReminders();
    return res.json(result);
  } catch (error) {
    console.error("[MilestoneReminders] Error:", error);
    return res.status(500).json({
      error: (error as Error).message,
      stack: (error as Error).stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/scheduled/milestone-reminders/reschedule
 * Endpoint público para que el responsable solicite reprogramación desde el email
 */
milestoneReminderRouter.post("/api/scheduled/milestone-reminders/reschedule", async (req: Request, res: Response) => {
  try {
    const { logId, justification, newDate, token } = req.body;

    if (!logId || !justification || !newDate || !token) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    // Verificar token simple (hash del logId + milestoneId)
    const dbInst = await getDb();
    if (!dbInst) {
      return res.status(500).json({ error: "DB no disponible" });
    }
    const [log] = await dbInst
      .select()
      .from(milestoneReminderLogs)
      .where(eq(milestoneReminderLogs.id, parseInt(logId)))
      .limit(1);

    if (!log) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    // Verificar token (simple hash check)
    const expectedToken = Buffer.from(`${log.id}-${log.milestoneId}-${log.recipientEmail}`).toString("base64url");
    if (token !== expectedToken) {
      return res.status(403).json({ error: "Token inválido" });
    }

    // Actualizar el log con la solicitud de reprogramación
    await dbInst
      .update(milestoneReminderLogs)
      .set({
        rescheduleRequested: true,
        rescheduleJustification: justification,
        rescheduleNewDate: new Date(newDate),
        rescheduleRespondedAt: new Date(),
      })
      .where(eq(milestoneReminderLogs.id, log.id));

    // Notificar al admin
    const [config] = await dbInst.select().from(milestoneReminderConfig).limit(1);
    if (config?.adminCcEmail) {
      const [milestone] = await dbInst.select().from(milestones).where(eq(milestones.id, log.milestoneId)).limit(1);
      const [project] = await dbInst.select().from(projects).where(eq(projects.id, log.projectId)).limit(1);
      
      await sendEmail({
        to: config.adminCcEmail,
        subject: `📋 Solicitud de Reprogramación: ${milestone?.name || "Hito"} - ${project?.name || "Proyecto"}`,
        html: generateRescheduleNotificationHtml({
          milestoneName: milestone?.name || "Hito",
          projectName: project?.name || "Proyecto",
          responsibleName: log.recipientName || log.recipientEmail,
          justification,
          newDate: new Date(newDate),
          daysOverdue: log.daysOverdue,
        }),
      });
    }

    return res.json({ ok: true, message: "Solicitud de reprogramación registrada exitosamente" });
  } catch (error) {
    console.error("[MilestoneReminders] Error en reschedule:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * Genera el HTML del email de recordatorio de hito vencido
 */
function generateReminderEmailHtml(params: {
  recipientName: string;
  milestoneName: string;
  projectName: string;
  dueDate: Date;
  daysOverdue: number;
  urgencyLevel: "reminder" | "urgent" | "critical";
  milestoneDescription: string;
  customMessage: string;
  milestoneId: number;
  projectId: number;
  logId: number;
  rescheduleToken: string;
}): string {
  const {
    recipientName,
    milestoneName,
    projectName,
    dueDate,
    daysOverdue,
    urgencyLevel,
    milestoneDescription,
    customMessage,
    milestoneId,
    projectId,
    logId,
    rescheduleToken,
  } = params;

  // Colores según nivel de urgencia
  const colors = {
    reminder: { bg: "#FEF3C7", border: "#F59E0B", badge: "#D97706", text: "Recordatorio" },
    urgent: { bg: "#FED7AA", border: "#EA580C", badge: "#EA580C", text: "Urgente" },
    critical: { bg: "#FEE2E2", border: "#DC2626", badge: "#DC2626", text: "Crítico" },
  };

  const color = colors[urgencyLevel];
  const formattedDate = dueDate.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const urgencyIcon = urgencyLevel === "critical" ? "🚨" : urgencyLevel === "urgent" ? "⚠️" : "⏰";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a5c2e 0%, #2d8a4e 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">☀️ Solar Project Manager</h1>
              <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 14px;">Green House Project</p>
            </td>
          </tr>

          <!-- Urgency Badge -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: ${color.badge}; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">
                      ${urgencyIcon} ${color.text.toUpperCase()} — ${daysOverdue} ${daysOverdue === 1 ? "día" : "días"} de retraso
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 40px;">
              <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">
                Hola <strong>${recipientName}</strong>,
              </p>
              <p style="color: #374151; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
                El siguiente hito bajo tu responsabilidad ha superado su fecha de vencimiento y requiere atención ${urgencyLevel === "critical" ? "<strong>inmediata</strong>" : "prioritaria"}.
              </p>

              <!-- Milestone Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; border-radius: 8px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <h3 style="color: #1f2937; margin: 0 0 12px; font-size: 18px;">${milestoneName}</h3>
                    ${milestoneDescription ? `<p style="color: #4b5563; margin: 0 0 16px; font-size: 14px; line-height: 1.5;">${milestoneDescription}</p>` : ""}
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="color: #6b7280; font-size: 13px;">📁 Proyecto:</span>
                          <span style="color: #1f2937; font-size: 13px; font-weight: 600; margin-left: 8px;">${projectName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="color: #6b7280; font-size: 13px;">📅 Vencimiento:</span>
                          <span style="color: #1f2937; font-size: 13px; font-weight: 600; margin-left: 8px;">${formattedDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="color: #6b7280; font-size: 13px;">⏱️ Retraso:</span>
                          <span style="color: ${color.badge}; font-size: 13px; font-weight: 700; margin-left: 8px;">${daysOverdue} ${daysOverdue === 1 ? "día" : "días"}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${customMessage ? `<p style="color: #4b5563; font-size: 14px; margin: 0 0 24px; padding: 16px; background-color: #f3f4f6; border-radius: 8px; line-height: 1.6;"><em>${customMessage}</em></p>` : ""}

              <!-- Action Required -->
              <p style="color: #374151; font-size: 15px; margin: 0 0 8px; font-weight: 600;">
                Acción requerida:
              </p>
              <p style="color: #4b5563; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
                Por favor, completa este hito lo antes posible o solicita una reprogramación con la debida justificación.
              </p>

              <!-- Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="https://spm.ghp.center/projects/${projectId}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
                      ✅ Completar Hito
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="https://spm.ghp.center/reschedule/${milestoneId}?token=${rescheduleToken}&logId=${logId}" style="display: inline-block; background-color: #ffffff; color: ${color.badge}; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; border: 2px solid ${color.badge};">
                      📋 Solicitar Reprogramación
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px; text-align: center;">
                Este es un email automático del Solar Project Manager.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px; text-align: center;">
                Recibirás este recordatorio diariamente hasta que el hito sea completado o reprogramado.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Green House Project. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Genera el HTML de notificación de solicitud de reprogramación al admin
 */
function generateRescheduleNotificationHtml(params: {
  milestoneName: string;
  projectName: string;
  responsibleName: string;
  justification: string;
  newDate: Date;
  daysOverdue: number;
}): string {
  const { milestoneName, projectName, responsibleName, justification, newDate, daysOverdue } = params;
  
  const formattedNewDate = newDate.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a5c2e 0%, #2d8a4e 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">☀️ Solar Project Manager</h1>
              <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 14px;">Solicitud de Reprogramación</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px;">
                <h3 style="color: #1e40af; margin: 0 0 8px; font-size: 16px;">📋 Nueva Solicitud de Reprogramación</h3>
                <p style="color: #1e3a5f; margin: 0; font-size: 14px;">
                  <strong>${responsibleName}</strong> ha solicitado reprogramar el hito <strong>"${milestoneName}"</strong>.
                </p>
              </div>

              <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; color: #374151;">
                <tr>
                  <td style="font-weight: 600; width: 140px; vertical-align: top;">Proyecto:</td>
                  <td>${projectName}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; vertical-align: top;">Hito:</td>
                  <td>${milestoneName}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; vertical-align: top;">Días de retraso:</td>
                  <td style="color: #dc2626; font-weight: 600;">${daysOverdue} días</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; vertical-align: top;">Nueva fecha propuesta:</td>
                  <td style="color: #16a34a; font-weight: 600;">${formattedNewDate}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; vertical-align: top;">Justificación:</td>
                  <td style="line-height: 1.6;">${justification}</td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0; line-height: 1.6;">
                Revisa esta solicitud y aprueba o rechaza la reprogramación desde el panel de administración.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Green House Project. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
