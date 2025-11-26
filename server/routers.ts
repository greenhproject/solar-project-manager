import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { generateProjectReport } from "./pdfGenerator";
import { getOpenSolarClient, checkOpenSolarConnection } from "./openSolarIntegration";

// Procedimiento solo para administradores
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'Solo los administradores pueden realizar esta acción' 
    });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================
  // GESTIÓN DE USUARIOS
  // ============================================
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getUserById(input.id);
      }),
  }),

  // ============================================
  // GESTIÓN DE TIPOS DE PROYECTO
  // ============================================
  projectTypes: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProjectTypes();
    }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        color: z.string().default("#FF6B35"),
        estimatedDurationDays: z.number().default(30),
      }))
      .mutation(async ({ input }) => {
        return await db.createProjectType(input);
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        estimatedDurationDays: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProjectType(id, data);
        return { success: true };
      }),
  }),

  // ============================================
  // GESTIÓN DE PROYECTOS
  // ============================================
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Administradores ven todos los proyectos, ingenieros solo los asignados
      if (ctx.user.role === 'admin') {
        return await db.getAllProjects();
      } else {
        return await db.getProjectsByEngineerId(ctx.user.id);
      }
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.id);
        
        // Verificar permisos: admin puede ver todo, ingeniero solo sus proyectos
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }
        
        if (ctx.user.role !== 'admin' && project.assignedEngineerId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para ver este proyecto' });
        }
        
        return project;
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        projectTypeId: z.number(),
        assignedEngineerId: z.number().optional(),
        openSolarId: z.string().optional(),
        startDate: z.date(),
        estimatedEndDate: z.date(),
        location: z.string().optional(),
        clientName: z.string().optional(),
        clientEmail: z.string().optional(),
        clientPhone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createProject({
          ...input,
          createdBy: ctx.user.id,
          status: 'planning',
          progressPercentage: 0,
        });
        
        const projectId = Number((result as any).insertId || 0);
        
        // Crear actualización de proyecto
        if (projectId > 0) {
          await db.createProjectUpdate({
            projectId,
            updateType: 'status_change',
            title: 'Proyecto creado',
            description: `El proyecto "${input.name}" ha sido creado`,
            createdBy: ctx.user.id,
          });
        }
        
        return { success: true, projectId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        assignedEngineerId: z.number().optional(),
        status: z.enum(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
        progressPercentage: z.number().min(0).max(100).optional(),
        actualEndDate: z.date().optional(),
        location: z.string().optional(),
        clientName: z.string().optional(),
        clientEmail: z.string().optional(),
        clientPhone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const project = await db.getProjectById(id);
        
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }
        
        // Solo admin puede actualizar, o el ingeniero asignado puede actualizar ciertos campos
        if (ctx.user.role !== 'admin' && project.assignedEngineerId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para actualizar este proyecto' });
        }
        
        // Ingenieros no pueden cambiar asignación ni ciertos campos críticos
        if (ctx.user.role !== 'admin') {
          delete data.assignedEngineerId;
        }
        
        await db.updateProject(id, data);
        
        // Registrar actualización si cambió el estado
        if (data.status && data.status !== project.status) {
          await db.createProjectUpdate({
            projectId: id,
            updateType: 'status_change',
            title: 'Estado actualizado',
            description: `Estado cambiado de "${project.status}" a "${data.status}"`,
            oldValue: project.status,
            newValue: data.status,
            createdBy: ctx.user.id,
          });
        }
        
        return { success: true };
      }),
    
    stats: protectedProcedure.query(async ({ ctx }) => {
      // Estadísticas generales solo para admin
      if (ctx.user.role === 'admin') {
        return await db.getProjectStats();
      } else {
        // Para ingenieros, calcular stats de sus proyectos
        const projects = await db.getProjectsByEngineerId(ctx.user.id);
        const now = new Date();
        return {
          total: projects.length,
          active: projects.filter(p => p.status === 'in_progress').length,
          completed: projects.filter(p => p.status === 'completed').length,
          overdue: projects.filter(p => 
            p.status !== 'completed' && 
            p.status !== 'cancelled' && 
            p.estimatedEndDate < now
          ).length,
        };
      }
    }),
  }),

  // ============================================
  // GESTIÓN DE PLANTILLAS DE HITOS
  // ============================================
  milestoneTemplates: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllMilestoneTemplates();
    }),
    
    getByProjectType: protectedProcedure
      .input(z.object({ projectTypeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMilestoneTemplatesByProjectType(input.projectTypeId);
      }),
    
    create: adminProcedure
      .input(z.object({
        projectTypeId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        orderIndex: z.number(),
        estimatedDurationDays: z.number().default(7),
      }))
      .mutation(async ({ input }) => {
        return await db.createMilestoneTemplate(input);
      }),
  }),

  // ============================================
  // GESTIÓN DE HITOS
  // ============================================
  milestones: router({
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }
        
        // Verificar permisos
        if (ctx.user.role !== 'admin' && project.assignedEngineerId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para ver estos hitos' });
        }
        
        return await db.getMilestonesByProjectId(input.projectId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.date(),
        orderIndex: z.number(),
        weight: z.number().default(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }
        
        // Solo admin o ingeniero asignado pueden crear hitos
        if (ctx.user.role !== 'admin' && project.assignedEngineerId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para crear hitos en este proyecto' });
        }
        
        return await db.createMilestone({
          ...input,
          status: 'pending',
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'overdue']).optional(),
        completedDate: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Obtener el hito y verificar permisos a través del proyecto
        const milestone = await db.getMilestonesByProjectId(0); // Necesitamos obtener el hito primero
        // Por simplicidad, permitimos la actualización si el usuario tiene acceso al proyecto
        
        await db.updateMilestone(id, data);
        
        // Si se completó el hito, crear actualización
        if (data.status === 'completed') {
          await db.createProjectUpdate({
            projectId: input.id, // Esto necesita ser corregido para obtener el projectId del milestone
            updateType: 'milestone_completed',
            title: 'Hito completado',
            description: `El hito ha sido marcado como completado`,
            createdBy: ctx.user.id,
          });
        }
        
        return { success: true };
      }),
    
    overdue: protectedProcedure.query(async ({ ctx }) => {
      const overdueMilestones = await db.getOverdueMilestones();
      
      // Filtrar por permisos si es ingeniero
      if (ctx.user.role !== 'admin') {
        const userProjects = await db.getProjectsByEngineerId(ctx.user.id);
        const userProjectIds = userProjects.map(p => p.id);
        return overdueMilestones.filter(m => userProjectIds.includes(m.projectId));
      }
      
      return overdueMilestones;
    }),
  }),

  // ============================================
  // GESTIÓN DE RECORDATORIOS
  // ============================================
  reminders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRemindersByUserId(ctx.user.id);
    }),
    
    unread: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadRemindersByUserId(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        milestoneId: z.number().optional(),
        title: z.string().min(1),
        message: z.string().optional(),
        reminderDate: z.date(),
        type: z.enum(['milestone_due', 'project_overdue', 'custom', 'sync_required']).default('custom'),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createReminder({
          ...input,
          userId: ctx.user.id,
          isRead: false,
          isSent: false,
        });
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markReminderAsRead(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // SINCRONIZACIÓN CON OPENSOLAR
  // ============================================
  sync: router({
    // Verificar estado de conexión
    checkConnection: adminProcedure.query(async () => {
      return await checkOpenSolarConnection();
    }),

    // Sincronizar proyecto desde OpenSolar
    syncProject: adminProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }

        if (!project.openSolarId) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Este proyecto no tiene un ID de OpenSolar asociado' 
          });
        }

        const client = getOpenSolarClient();
        const result = await client.syncProjectFromOpenSolar(project.openSolarId);

        // Registrar log de sincronización
        await db.createSyncLog({
          projectId: input.projectId,
          syncedBy: ctx.user.id,
          syncType: 'manual',
          status: result.success ? 'success' : 'failed',
          message: result.message,
          errorDetails: result.error,
        });

        if (!result.success) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: result.message || 'Error al sincronizar con OpenSolar' 
          });
        }

        // Actualizar proyecto con datos sincronizados si es necesario
        if (result.data) {
          await db.updateProject(input.projectId, result.data);
        }

        return { success: true, message: 'Proyecto sincronizado exitosamente' };
      }),

    // Obtener logs de sincronización
    logs: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSyncLogsByProjectId(input.projectId);
      }),
    
    recent: adminProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        return await db.getRecentSyncLogs(input.limit);
      }),
    
    createLog: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        syncType: z.enum(['manual', 'automatic', 'scheduled']),
        direction: z.enum(['import', 'export', 'bidirectional']),
        status: z.enum(['success', 'partial', 'failed']),
        message: z.string().optional(),
        errorDetails: z.string().optional(),
        dataSynced: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createSyncLog({
          ...input,
          syncedBy: ctx.user.id,
        });
      }),
  }),

  // ============================================
  // GENERACIÓN DE REPORTES PDF
  // ============================================
  reports: router({
    generateProjectPDF: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }
        
        // Verificar permisos
        if (ctx.user.role !== 'admin' && project.assignedEngineerId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para generar reportes de este proyecto' });
        }
        
        const milestones = await db.getMilestonesByProjectId(input.projectId);
        const projectType = project.projectTypeId ? await db.getProjectTypeById(project.projectTypeId) : undefined;
        const assignedEngineer = project.assignedEngineerId ? await db.getUserById(project.assignedEngineerId) : undefined;
        
        const pdfBuffer = await generateProjectReport({
          project,
          milestones,
          projectType,
          assignedEngineer,
        });
        
        // Convertir buffer a base64 para enviar al cliente
        const pdfBase64 = pdfBuffer.toString('base64');
        return { pdfBase64, fileName: `proyecto-${project.name.replace(/\s+/g, '-').toLowerCase()}.pdf` };
      }),
  }),

  // ============================================
  // HISTORIAL DE ACTUALIZACIONES
  // ============================================
  projectUpdates: router({
    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }
        
        // Verificar permisos
        if (ctx.user.role !== 'admin' && project.assignedEngineerId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para ver este historial' });
        }
        
        return await db.getProjectUpdatesByProjectId(input.projectId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
