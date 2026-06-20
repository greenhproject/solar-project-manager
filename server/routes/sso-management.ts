/**
 * SSO Management Router
 * Gestión de aplicaciones SSO conectadas al ecosistema GHP.
 * 
 * Funcionalidades:
 * - CRUD de aplicaciones SSO
 * - Activar/desactivar apps
 * - Generar tokens SSO para usuarios
 * - Mapeo de roles entre apps
 * - Historial de accesos SSO
 * - Endpoint público para que apps externas soliciten tokens
 */
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { ssoApps, ssoAccessLogs, users } from "../../drizzle/schema";
import * as db from "../db";
import crypto from "crypto";
import { SignJWT } from "jose";
import { ENV } from "../_core/env";

// Procedimiento solo para administradores
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo los administradores pueden gestionar SSO",
    });
  }
  return next({ ctx });
});

export const ssoManagementRouter = router({
  /**
   * Listar todas las apps SSO registradas
   */
  list: adminProcedure.query(async () => {
    const dbInst = await db.getDb();
    if (!dbInst) return [];
    
    const apps = await dbInst.select().from(ssoApps).orderBy(desc(ssoApps.createdAt));
    return apps.map(app => ({
      ...app,
      roleMapping: app.roleMapping ? JSON.parse(app.roleMapping) : {},
      // No exponer el secret completo, solo un preview
      ssoSecretPreview: app.ssoSecret ? `${app.ssoSecret.substring(0, 8)}...` : "",
    }));
  }),

  /**
   * Obtener detalle de una app SSO
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      
      const [app] = await dbInst.select().from(ssoApps).where(eq(ssoApps.id, input.id));
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "App SSO no encontrada" });
      
      return {
        ...app,
        roleMapping: app.roleMapping ? JSON.parse(app.roleMapping) : {},
      };
    }),

  /**
   * Crear nueva app SSO
   */
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
      description: z.string().optional(),
      url: z.string().url(),
      callbackUrl: z.string().url().optional(),
      logoUrl: z.string().optional(),
      authModel: z.enum(["sso_jwt", "sso_redirect", "sso_action"]).default("sso_jwt"),
      roleMapping: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Verificar que el slug no exista
      const [existing] = await dbInst.select({ id: ssoApps.id }).from(ssoApps).where(eq(ssoApps.slug, input.slug));
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Ya existe una app con ese identificador (slug)" });
      }

      // Generar secret compartido
      const ssoSecret = `sso_${crypto.randomBytes(32).toString("hex")}`;

      const userId = typeof ctx.user.id === "string" ? parseInt(ctx.user.id, 10) : ctx.user.id;

      await dbInst.insert(ssoApps).values({
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        url: input.url,
        callbackUrl: input.callbackUrl || null,
        logoUrl: input.logoUrl || null,
        ssoSecret,
        authModel: input.authModel,
        roleMapping: input.roleMapping ? JSON.stringify(input.roleMapping) : null,
        isActive: false,
        totalAccesses: 0,
        createdBy: userId,
      });

      return {
        success: true,
        ssoSecret, // Se muestra UNA SOLA VEZ al crear
        message: "App SSO creada. Guarda el secret, no se mostrará de nuevo.",
      };
    }),

  /**
   * Actualizar app SSO (sin cambiar el secret)
   */
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      url: z.string().url().optional(),
      callbackUrl: z.string().url().optional().nullable(),
      logoUrl: z.string().optional().nullable(),
      authModel: z.enum(["sso_jwt", "sso_redirect", "sso_action"]).optional(),
      roleMapping: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.url) updateData.url = input.url;
      if (input.callbackUrl !== undefined) updateData.callbackUrl = input.callbackUrl;
      if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;
      if (input.authModel) updateData.authModel = input.authModel;
      if (input.roleMapping) updateData.roleMapping = JSON.stringify(input.roleMapping);

      await dbInst.update(ssoApps).set(updateData).where(eq(ssoApps.id, input.id));
      return { success: true };
    }),

  /**
   * Regenerar secret de una app SSO
   */
  regenerateSecret: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const newSecret = `sso_${crypto.randomBytes(32).toString("hex")}`;
      await dbInst.update(ssoApps).set({ ssoSecret: newSecret }).where(eq(ssoApps.id, input.id));

      return {
        success: true,
        ssoSecret: newSecret,
        message: "Secret regenerado. Actualiza la configuración en la app destino.",
      };
    }),

  /**
   * Activar app SSO
   */
  activate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await dbInst.update(ssoApps).set({ isActive: true }).where(eq(ssoApps.id, input.id));
      return { success: true };
    }),

  /**
   * Desactivar app SSO
   */
  deactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await dbInst.update(ssoApps).set({ isActive: false }).where(eq(ssoApps.id, input.id));
      return { success: true };
    }),

  /**
   * Eliminar app SSO
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await dbInst.delete(ssoApps).where(eq(ssoApps.id, input.id));
      return { success: true };
    }),

  /**
   * Generar token SSO para un usuario específico hacia una app
   * Este es el endpoint que usa el Hub para autenticar usuarios en apps destino
   */
  generateToken: adminProcedure
    .input(z.object({
      appId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Obtener la app
      const [app] = await dbInst.select().from(ssoApps).where(
        and(eq(ssoApps.id, input.appId), eq(ssoApps.isActive, true))
      );
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "App SSO no encontrada o inactiva" });

      // Obtener el usuario
      const [user] = await dbInst.select().from(users).where(eq(users.id, input.userId));
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });

      // Determinar rol mapeado
      const roleMapping = app.roleMapping ? JSON.parse(app.roleMapping) : {};
      const mappedRole = roleMapping[user.role] || user.role;

      // Generar token JWT firmado con el secret de la app
      const secretKey = new TextEncoder().encode(app.ssoSecret);
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({
        sub: String(user.id),
        email: user.email,
        name: user.name,
        role: mappedRole,
        originalRole: user.role,
        appSlug: app.slug,
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer("solar-project-manager")
        .setAudience(app.slug)
        .setIssuedAt(now)
        .setExpirationTime(now + 5 * 60) // 5 minutos
        .sign(secretKey);

      // Registrar acceso
      await dbInst.insert(ssoAccessLogs).values({
        ssoAppId: app.id,
        userId: user.id,
        userName: user.name || "",
        userEmail: user.email || "",
        mappedRole,
        success: true,
      });

      // Actualizar estadísticas
      await dbInst.update(ssoApps).set({
        totalAccesses: sql`${ssoApps.totalAccesses} + 1`,
        lastAccessAt: new Date(),
      }).where(eq(ssoApps.id, app.id));

      // Construir URL de login
      const loginUrl = app.callbackUrl 
        ? `${app.callbackUrl}?token=${token}`
        : `${app.url}/api/sso/callback?token=${token}`;

      return {
        token,
        loginUrl,
        expiresIn: "5 minutos",
        user: { id: user.id, name: user.name, email: user.email, mappedRole },
      };
    }),

  /**
   * Historial de accesos SSO (últimos 50)
   */
  accessLogs: adminProcedure
    .input(z.object({
      appId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) return [];

      const limit = input?.limit || 50;

      let query = dbInst
        .select({
          id: ssoAccessLogs.id,
          ssoAppId: ssoAccessLogs.ssoAppId,
          userId: ssoAccessLogs.userId,
          userName: ssoAccessLogs.userName,
          userEmail: ssoAccessLogs.userEmail,
          mappedRole: ssoAccessLogs.mappedRole,
          success: ssoAccessLogs.success,
          errorMessage: ssoAccessLogs.errorMessage,
          accessedAt: ssoAccessLogs.accessedAt,
          appName: ssoApps.name,
        })
        .from(ssoAccessLogs)
        .leftJoin(ssoApps, eq(ssoAccessLogs.ssoAppId, ssoApps.id))
        .orderBy(desc(ssoAccessLogs.accessedAt))
        .limit(limit);

      if (input?.appId) {
        query = query.where(eq(ssoAccessLogs.ssoAppId, input.appId)) as any;
      }

      return await query;
    }),

  /**
   * Obtener estadísticas generales de SSO
   */
  stats: adminProcedure.query(async () => {
    const dbInst = await db.getDb();
    if (!dbInst) return { totalApps: 0, activeApps: 0, totalAccesses: 0 };

    const allApps = await dbInst.select().from(ssoApps);
    const activeApps = allApps.filter(a => a.isActive);
    const totalAccesses = allApps.reduce((sum, a) => sum + (a.totalAccesses || 0), 0);

    return {
      totalApps: allApps.length,
      activeApps: activeApps.length,
      totalAccesses,
    };
  }),
});
