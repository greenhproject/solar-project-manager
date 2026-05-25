/**
 * Router tRPC para la configuración de recordatorios de hitos vencidos
 * Solo accesible por administradores
 */

import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { milestoneReminderConfig, milestoneReminderLogs } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { createHeartbeatJob, updateHeartbeatJob, deleteHeartbeatJob, listHeartbeatJobs } from "../_core/heartbeat";
import * as db from "../db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores" });
  }
  return next({ ctx });
});

export const milestoneReminderConfigRouter = router({
  // Obtener configuración actual
  getConfig: adminProcedure.query(async ({ ctx }) => {
    const dbInst = await db.getDb();
    if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
    const [config] = await dbInst.select().from(milestoneReminderConfig).limit(1);
    return config || null;
  }),

  // Actualizar configuración
  updateConfig: adminProcedure
    .input(
      z.object({
        isEnabled: z.boolean().optional(),
        sendHourUtc: z.number().min(0).max(23).optional(),
        reminderDaysThreshold: z.number().min(1).max(30).optional(),
        urgentDaysThreshold: z.number().min(1).max(60).optional(),
        criticalDaysThreshold: z.number().min(1).max(90).optional(),
        maxReminderDays: z.number().min(1).max(365).optional(),
        sendCopyToAdmin: z.boolean().optional(),
        adminCcEmail: z.string().email().optional().nullable(),
        reminderSubject: z.string().max(255).optional(),
        urgentSubject: z.string().max(255).optional(),
        criticalSubject: z.string().max(255).optional(),
        customMessage: z.string().max(2000).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [existing] = await dbInst.select().from(milestoneReminderConfig).limit(1);

      if (!existing) {
        await dbInst.insert(milestoneReminderConfig).values({
          ...input,
          updatedBy: ctx.user.id,
        } as any);
      } else {
        await dbInst
          .update(milestoneReminderConfig)
          .set({
            ...input,
            updatedBy: ctx.user.id,
          } as any)
          .where(eq(milestoneReminderConfig.id, existing.id));
      }

      return { success: true };
    }),

  // Activar/Desactivar el cron job
  toggleCronJob: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [config] = await dbInst.select().from(milestoneReminderConfig).limit(1);

      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Configuración no encontrada" });
      }

      const sessionCookie = ctx.req.cookies?.["app_session_id"] || "";

      if (input.enabled && !config.scheduleCronTaskUid) {
        // Crear el cron job - ejecutar diariamente a la hora configurada (UTC)
        const hour = config.sendHourUtc || 12;
        const cronExpression = `0 0 ${hour} * * *`; // sec min hour dom mon dow

        const result = await createHeartbeatJob(
          {
            name: "milestone-overdue-reminders",
            cron: cronExpression,
            path: "/api/scheduled/milestone-reminders",
            method: "POST",
            description: "Envío diario de recordatorios de hitos vencidos",
          },
          sessionCookie
        );

        // Guardar el taskUid en la configuración
        await dbInst
          .update(milestoneReminderConfig)
          .set({
            scheduleCronTaskUid: result.taskUid,
            isEnabled: true,
            updatedBy: ctx.user.id,
          })
          .where(eq(milestoneReminderConfig.id, config.id));

        return { success: true, taskUid: result.taskUid, nextExecution: result.nextExecutionAt };
      } else if (input.enabled && config.scheduleCronTaskUid) {
        // Reactivar el cron existente
        await updateHeartbeatJob(config.scheduleCronTaskUid, { enable: true }, sessionCookie);
        await dbInst
          .update(milestoneReminderConfig)
          .set({ isEnabled: true, updatedBy: ctx.user.id })
          .where(eq(milestoneReminderConfig.id, config.id));

        return { success: true, taskUid: config.scheduleCronTaskUid };
      } else if (!input.enabled && config.scheduleCronTaskUid) {
        // Pausar el cron
        await updateHeartbeatJob(config.scheduleCronTaskUid, { enable: false }, sessionCookie);
        await dbInst
          .update(milestoneReminderConfig)
          .set({ isEnabled: false, updatedBy: ctx.user.id })
          .where(eq(milestoneReminderConfig.id, config.id));

        return { success: true, paused: true };
      }

      // Solo actualizar el estado
      await dbInst
        .update(milestoneReminderConfig)
        .set({ isEnabled: input.enabled, updatedBy: ctx.user.id })
        .where(eq(milestoneReminderConfig.id, config.id));

      return { success: true };
    }),

  // Actualizar la hora del cron
  updateCronHour: adminProcedure
    .input(z.object({ hour: z.number().min(0).max(23) }))
    .mutation(async ({ ctx, input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [config] = await dbInst.select().from(milestoneReminderConfig).limit(1);
      if (!config) throw new TRPCError({ code: "NOT_FOUND" });

      const sessionCookie = ctx.req.cookies?.["app_session_id"] || "";

      // Actualizar hora en la BD
      await dbInst
        .update(milestoneReminderConfig)
        .set({ sendHourUtc: input.hour, updatedBy: ctx.user.id })
        .where(eq(milestoneReminderConfig.id, config.id));

      // Si hay un cron activo, actualizar su expresión
      if (config.scheduleCronTaskUid) {
        const cronExpression = `0 0 ${input.hour} * * *`;
        await updateHeartbeatJob(
          config.scheduleCronTaskUid,
          { cron: cronExpression },
          sessionCookie
        );
      }

      return { success: true };
    }),

  // Obtener logs de envíos
  getLogs: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        projectId: z.number().optional(),
        status: z.enum(["sent", "failed", "skipped"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const offset = (input.page - 1) * input.limit;

      const conditions = [];
      if (input.projectId) {
        conditions.push(eq(milestoneReminderLogs.projectId, input.projectId));
      }
      if (input.status) {
        conditions.push(eq(milestoneReminderLogs.status, input.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await dbInst
        .select()
        .from(milestoneReminderLogs)
        .where(whereClause)
        .orderBy(desc(milestoneReminderLogs.sentAt))
        .limit(input.limit)
        .offset(offset);

      const [{ count }] = await dbInst
        .select({ count: sql<number>`COUNT(*)` })
        .from(milestoneReminderLogs)
        .where(whereClause);

      return {
        logs,
        total: Number(count),
        page: input.page,
        totalPages: Math.ceil(Number(count) / input.limit),
      };
    }),

  // Obtener solicitudes de reprogramación pendientes
  getRescheduleRequests: adminProcedure.query(async ({ ctx }) => {
    const dbInst = await db.getDb();
    if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
    const requests = await dbInst
      .select()
      .from(milestoneReminderLogs)
      .where(eq(milestoneReminderLogs.rescheduleRequested, true))
      .orderBy(desc(milestoneReminderLogs.rescheduleRespondedAt));

    return requests;
  }),

  // Enviar recordatorio manual (para pruebas)
  sendTestReminder: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { sendEmail } = await import("../emailService");
      
      // Generar un email de prueba con el template de recordatorio
      const testHtml = generateTestReminderHtml();
      
      const sent = await sendEmail({
        to: input.email,
        subject: "⚠️ [PRUEBA] Urgente: Hito con retraso significativo - Visita técnica (5 días)",
        html: testHtml,
      });

      return { success: sent };
    }),
});

function generateTestReminderHtml(): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <tr><td style="background: linear-gradient(135deg, #1a5c2e 0%, #2d8a4e 100%); padding: 30px 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">☀️ Solar Project Manager</h1>
          <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 14px;">Green House Project</p>
        </td></tr>
        <tr><td style="padding: 24px 40px 0;">
          <span style="display: inline-block; background-color: #EA580C; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">⚠️ URGENTE — 5 días de retraso</span>
        </td></tr>
        <tr><td style="padding: 24px 40px;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hola <strong>Ingeniero de Prueba</strong>,</p>
          <p style="color: #374151; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">El siguiente hito bajo tu responsabilidad ha superado su fecha de vencimiento y requiere atención prioritaria.</p>
          <table width="100%" style="background-color: #FED7AA; border-left: 4px solid #EA580C; border-radius: 8px; margin: 0 0 24px;">
            <tr><td style="padding: 20px 24px;">
              <h3 style="color: #1f2937; margin: 0 0 12px; font-size: 18px;">Visita técnica presencial</h3>
              <p style="color: #4b5563; margin: 0 0 16px; font-size: 14px;">Visita aclaratoria presencial de proyectos</p>
              <p style="color: #6b7280; font-size: 13px; margin: 4px 0;">📁 Proyecto: <strong>Proyecto Solar Residencial</strong></p>
              <p style="color: #6b7280; font-size: 13px; margin: 4px 0;">📅 Vencimiento: <strong>lunes, 13 de mayo de 2026</strong></p>
              <p style="color: #EA580C; font-size: 13px; margin: 4px 0; font-weight: 700;">⏱️ Retraso: 5 días</p>
            </td></tr>
          </table>
          <p style="color: #374151; font-size: 15px; margin: 0 0 8px; font-weight: 600;">Acción requerida:</p>
          <p style="color: #4b5563; font-size: 14px; margin: 0 0 24px;">Por favor, completa este hito lo antes posible o solicita una reprogramación con la debida justificación.</p>
          <table width="100%"><tr><td align="center" style="padding: 8px 0;">
            <a href="#" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">✅ Completar Hito</a>
          </td></tr><tr><td align="center" style="padding: 8px 0;">
            <a href="#" style="display: inline-block; background-color: #ffffff; color: #EA580C; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; border: 2px solid #EA580C;">📋 Solicitar Reprogramación</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px; text-align: center;">Este es un email de PRUEBA del Solar Project Manager.</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">© ${new Date().getFullYear()} Green House Project.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
