/**
 * Client Portal Router
 * Procedimientos para que usuarios con rol 'client' vean sus proyectos
 * Solo muestra información relevante sin detalles internos
 */
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { projects, milestones, projectUpdates, clientProjectAccess, users, projectTypes } from "../../drizzle/schema";
import * as db from "../db";

// Procedimiento solo para clientes (o admin que quiera ver como cliente)
const clientProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "client" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acceso no autorizado al portal de clientes",
    });
  }
  return next({ ctx });
});

export const clientPortalRouter = router({
  // Obtener proyectos asignados al cliente
  myProjects: clientProcedure.query(async ({ ctx }) => {
    const dbInst = await db.getDb();
    if (!dbInst) return [];

    // Si es admin, puede ver todos (para testing)
    if (ctx.user.role === "admin") {
      const allProjects = await dbInst.select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        progressPercentage: projects.progressPercentage,
        startDate: projects.startDate,
        estimatedEndDate: projects.estimatedEndDate,
        actualEndDate: projects.actualEndDate,
        location: projects.location,
        clientName: projects.clientName,
        projectTypeId: projects.projectTypeId,
      }).from(projects).orderBy(desc(projects.createdAt)).limit(10);
      return allProjects;
    }

    // Para clientes: solo proyectos asignados
    const accessList = await dbInst.select({
      projectId: clientProjectAccess.projectId,
      canViewFiles: clientProjectAccess.canViewFiles,
      canViewUpdates: clientProjectAccess.canViewUpdates,
    }).from(clientProjectAccess).where(eq(clientProjectAccess.clientUserId, ctx.user.id));

    if (accessList.length === 0) return [];

    const projectIds = accessList.map(a => a.projectId);
    
    const clientProjects = await dbInst.select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      progressPercentage: projects.progressPercentage,
      startDate: projects.startDate,
      estimatedEndDate: projects.estimatedEndDate,
      actualEndDate: projects.actualEndDate,
      location: projects.location,
      clientName: projects.clientName,
      projectTypeId: projects.projectTypeId,
    }).from(projects).where(
      sql`${projects.id} IN (${sql.raw(projectIds.join(","))})`
    ).orderBy(desc(projects.createdAt));

    return clientProjects;
  }),

  // Obtener detalle de un proyecto (solo si tiene acceso)
  projectDetail: clientProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Verificar acceso
      if (ctx.user.role !== "admin") {
        const access = await dbInst.select().from(clientProjectAccess)
          .where(and(
            eq(clientProjectAccess.clientUserId, ctx.user.id),
            eq(clientProjectAccess.projectId, input.projectId)
          ));
        if (access.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este proyecto" });
        }
      }

      // Obtener proyecto (sin información interna sensible)
      const [project] = await dbInst.select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        progressPercentage: projects.progressPercentage,
        startDate: projects.startDate,
        estimatedEndDate: projects.estimatedEndDate,
        actualEndDate: projects.actualEndDate,
        location: projects.location,
        clientName: projects.clientName,
        clientEmail: projects.clientEmail,
        clientPhone: projects.clientPhone,
        projectTypeId: projects.projectTypeId,
      }).from(projects).where(eq(projects.id, input.projectId));

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
      }

      // Obtener tipo de proyecto
      const [projectType] = await dbInst.select({
        name: projectTypes.name,
        color: projectTypes.color,
      }).from(projectTypes).where(eq(projectTypes.id, project.projectTypeId));

      // Obtener hitos (sin notas internas ni observaciones del equipo)
      const projectMilestones = await dbInst.select({
        id: milestones.id,
        name: milestones.name,
        description: milestones.description,
        status: milestones.status,
        startDate: milestones.startDate,
        endDate: milestones.endDate,
        dueDate: milestones.dueDate,
        completedDate: milestones.completedDate,
        durationDays: milestones.durationDays,
        orderIndex: milestones.orderIndex,
        weight: milestones.weight,
      }).from(milestones)
        .where(eq(milestones.projectId, input.projectId))
        .orderBy(milestones.orderIndex);

      return {
        project: {
          ...project,
          projectTypeName: projectType?.name || "Sin tipo",
          projectTypeColor: projectType?.color || "#FF6B35",
        },
        milestones: projectMilestones,
      };
    }),

  // Obtener actualizaciones del proyecto (solo las relevantes para el cliente)
  projectUpdates: clientProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const dbInst = await db.getDb();
      if (!dbInst) return [];

      // Verificar acceso
      if (ctx.user.role !== "admin") {
        const access = await dbInst.select().from(clientProjectAccess)
          .where(and(
            eq(clientProjectAccess.clientUserId, ctx.user.id),
            eq(clientProjectAccess.projectId, input.projectId)
          ));
        if (access.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este proyecto" });
        }
      }

      // Solo mostrar actualizaciones relevantes para el cliente
      const updates = await dbInst.select({
        id: projectUpdates.id,
        updateType: projectUpdates.updateType,
        title: projectUpdates.title,
        description: projectUpdates.description,
        createdAt: projectUpdates.createdAt,
      }).from(projectUpdates)
        .where(eq(projectUpdates.projectId, input.projectId))
        .orderBy(desc(projectUpdates.createdAt))
        .limit(20);

      return updates;
    }),

  // Admin: Asignar proyecto a un cliente
  assignProjectToClient: protectedProcedure
    .input(z.object({
      clientUserId: z.number(),
      projectId: z.number(),
      canViewFiles: z.boolean().default(true),
      canViewUpdates: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden asignar proyectos" });
      }
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Verificar que el usuario es un cliente
      const [clientUser] = await dbInst.select().from(users).where(eq(users.id, input.clientUserId));
      if (!clientUser || (clientUser.role as string) !== "client") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El usuario debe tener rol 'client'" });
      }

      // Verificar que no exista ya la asignación
      const existing = await dbInst.select().from(clientProjectAccess)
        .where(and(
          eq(clientProjectAccess.clientUserId, input.clientUserId),
          eq(clientProjectAccess.projectId, input.projectId)
        ));
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Este cliente ya tiene acceso a este proyecto" });
      }

      await dbInst.insert(clientProjectAccess).values({
        clientUserId: input.clientUserId,
        projectId: input.projectId,
        canViewFiles: input.canViewFiles,
        canViewUpdates: input.canViewUpdates,
        grantedBy: ctx.user.id,
      });

      return { success: true };
    }),

  // Admin: Revocar acceso de un cliente a un proyecto
  revokeProjectAccess: protectedProcedure
    .input(z.object({ accessId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden revocar acceso" });
      }
      const dbInst = await db.getDb();
      if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      await dbInst.delete(clientProjectAccess).where(eq(clientProjectAccess.id, input.accessId));
      return { success: true };
    }),

  // Admin: Listar accesos de un cliente
  getClientAccess: protectedProcedure
    .input(z.object({ clientUserId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores" });
      }
      const dbInst = await db.getDb();
      if (!dbInst) return [];

      const accessList = await dbInst.select({
        id: clientProjectAccess.id,
        projectId: clientProjectAccess.projectId,
        canViewFiles: clientProjectAccess.canViewFiles,
        canViewUpdates: clientProjectAccess.canViewUpdates,
        createdAt: clientProjectAccess.createdAt,
      }).from(clientProjectAccess).where(eq(clientProjectAccess.clientUserId, input.clientUserId));

      // Enriquecer con nombres de proyecto
      const enriched = await Promise.all(accessList.map(async (access) => {
        const [project] = await dbInst.select({ name: projects.name }).from(projects).where(eq(projects.id, access.projectId));
        return { ...access, projectName: project?.name || "Proyecto eliminado" };
      }));

      return enriched;
    }),
});
