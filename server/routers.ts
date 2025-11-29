import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getMonthlyMetrics, getCompletionRate, getAverageCompletionTime, getProjectDistributionByType } from "./db";
import { generateProjectReport } from "./pdfGenerator";
import { getOpenSolarClient, checkOpenSolarConnection } from "./openSolarIntegration";
import { metricsRouter } from "./metricsRouters";

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
  analytics: metricsRouter,
  
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
    // Actualizar rol de usuario
    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["admin", "engineer"]) }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' });
        }

        // Proteger usuario maestro
        if (user.email === 'greenhproject@gmail.com') {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'No se puede modificar el rol del usuario maestro' 
          });
        }

        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    // Actualizar perfil de usuario
    updateProfile: protectedProcedure
      .input(z.object({ 
        name: z.string().min(1).optional(),
        email: z.string().email().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar que el email no esté en uso por otro usuario
        if (input.email) {
          const existingUser = await db.getUserByEmail(input.email);
          if (existingUser && existingUser.id !== ctx.user.id) {
            throw new TRPCError({ 
              code: 'CONFLICT', 
              message: 'Este email ya está en uso por otro usuario' 
            });
          }
        }

        const updated = await db.updateUserProfile(ctx.user.id, input);
        return updated;
      }),

    // Subir avatar de usuario
    uploadAvatar: protectedProcedure
      .input(z.object({ 
        imageData: z.string(), // Base64 encoded image
        mimeType: z.string()
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import('./storage');
        
        // Convertir base64 a buffer
        const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Validar tamaño (máximo 2MB)
        if (buffer.length > 2 * 1024 * 1024) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'La imagen es demasiado grande. Máximo 2MB.' 
          });
        }
        
        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const extension = input.mimeType.split('/')[1] || 'jpg';
        const fileKey = `avatars/${ctx.user.id}-${timestamp}.${extension}`;
        
        // Subir a S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Actualizar usuario con nueva URL de avatar
        await db.updateUserProfile(ctx.user.id, { avatarUrl: url });
        
        return { avatarUrl: url };
      }),

    // Cambiar contraseña (solo para usuarios JWT)
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          return await db.changeUserPassword(ctx.user.id, input.currentPassword, input.newPassword);
        } catch (error: any) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: error.message 
          });
        }
      }),

    // Eliminar usuario
    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' });
        }

        // Proteger usuario maestro
        if (user.email === 'greenhproject@gmail.com') {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'No se puede eliminar el usuario maestro' 
          });
        }

        await db.deleteUser(input.userId);
        return { success: true };
      }),

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
        
        // Crear hitos desde plantillas
        if (projectId > 0) {
          const templates = await db.getMilestoneTemplatesByProjectType(input.projectTypeId);
          
          for (const template of templates) {
            const dueDate = new Date(input.startDate);
            dueDate.setDate(dueDate.getDate() + (template.orderIndex * (template.estimatedDurationDays || 7)));
            
            await db.createMilestone({
              projectId,
              name: template.name,
              description: template.description || '',
              dueDate,
              status: 'pending',
              orderIndex: template.orderIndex,
              weight: 1,
            });
          }
          
          // Crear actualización de proyecto
          await db.createProjectUpdate({
            projectId,
            updateType: 'status_change',
            title: 'Proyecto creado',
            description: `El proyecto "${input.name}" ha sido creado con ${templates.length} hitos`,
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
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        orderIndex: z.number().optional(),
        estimatedDurationDays: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateMilestoneTemplate(id, data);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMilestoneTemplate(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // GESTIÓN DE HITOS
  // ============================================
  milestones: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      const allMilestones = await db.getAllMilestones();
      
      // Si es ingeniero, filtrar solo los hitos de sus proyectos
      if (ctx.user.role !== 'admin') {
        const userProjects = await db.getProjectsByEngineerId(ctx.user.id);
        const userProjectIds = userProjects.map(p => p.id);
        return allMilestones.filter(m => userProjectIds.includes(m.projectId));
      }
      
      return allMilestones;
    }),
    
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
        dependencies: z.array(z.number()).optional(),
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
        
        // Validar y convertir dependencias
        const { dependencies, ...restInput } = input;
        const dependenciesJson = dependencies && dependencies.length > 0 
          ? JSON.stringify(dependencies) 
          : null;
        
        const result = await db.createMilestone({
          ...restInput,
          status: 'pending',
          dependencies: dependenciesJson,
        });
        
        // Sincronizar con Google Calendar
        const milestoneId = Number((result as any).insertId || 0);
        if (milestoneId > 0) {
          try {
            const { createCalendarEvent, toRFC3339, createEndDate } = await import('./googleCalendar');
            const eventId = await createCalendarEvent({
              summary: `📅 ${project.name} - ${input.name}`,
              description: input.description || `Hito del proyecto ${project.name}`,
              start_time: toRFC3339(input.dueDate),
              end_time: toRFC3339(createEndDate(input.dueDate)),
              location: project.location || undefined,
              reminders: [1440, 60], // 1 día antes y 1 hora antes
            });
            
            if (eventId) {
              await db.updateMilestone(milestoneId, { googleCalendarEventId: eventId });
            }
          } catch (error) {
            console.error('[Milestone] Error syncing with Google Calendar:', error);
            // No fallar la creación del hito si falla la sincronización
          }
        }
        
        return result;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'overdue']).optional(),
        completedDate: z.date().optional(),
        notes: z.string().optional(),
        dependencies: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, dependencies, ...data } = input;
        
        // Convertir dependencias a JSON si están presentes
        const updateData: any = { ...data };
        if (dependencies !== undefined) {
          updateData.dependencies = dependencies.length > 0 ? JSON.stringify(dependencies) : null;
        }
        
        // Obtener el hito para saber su projectId
        const milestone = await db.getMilestoneById(id);
        if (!milestone) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Hito no encontrado' });
        }
        
        await db.updateMilestone(id, updateData);
        
        // Sincronizar con Google Calendar si hay cambios relevantes
        if (milestone.googleCalendarEventId && (data.name || data.description)) {
          try {
            const { updateCalendarEvent } = await import('./googleCalendar');
            const updatePayload: any = {
              event_id: milestone.googleCalendarEventId,
            };
            
            if (data.name) {
              const project = await db.getProjectById(milestone.projectId);
              updatePayload.summary = `📅 ${project?.name} - ${data.name}`;
            }
            if (data.description) {
              updatePayload.description = data.description;
            }
            
            await updateCalendarEvent(updatePayload);
          } catch (error) {
            console.error('[Milestone] Error syncing update with Google Calendar:', error);
          }
        }
        
        // Recalcular progreso del proyecto
        const { recalculateProjectProgress } = await import('./progressCalculator');
        await recalculateProjectProgress(milestone.projectId);
        
        // Si se completó el hito, crear actualización
        if (data.status === 'completed') {
          await db.createProjectUpdate({
            projectId: milestone.projectId,
            updateType: 'milestone_completed',
            title: 'Hito completado',
            description: `El hito "${milestone.name}" ha sido marcado como completado`,
            createdBy: ctx.user.id,
          });
        }
        
        return { success: true, projectId: milestone.projectId };
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
  // ASISTENTE DE IA
  // ============================================
  ai: router({
    // Analizar todos los proyectos
    analyzeProjects: protectedProcedure.query(async ({ ctx }) => {
      const projects = await db.getAllProjects();
      const stats = await db.getProjectStats();
      
      // Preparar contexto para el LLM
      const context = `
Análisis de Proyectos Solares - GreenH Project

Estadísticas Generales:
- Total de proyectos: ${stats.total}
- Proyectos activos: ${stats.active}
- Proyectos completados: ${stats.completed}
- Proyectos con retraso: ${stats.overdue}

Proyectos:
${projects.map(p => `
- ${p.name} (${p.location})
  Estado: ${p.status}
  Estado: ${p.status}
  Tipo: ${p.projectTypeId}
  Ingeniero: ${p.assignedEngineerId}
  Fecha inicio: ${p.startDate}
  Fecha fin estimada: ${p.estimatedEndDate}
`).join('')}

Por favor, proporciona:
1. Un análisis general del estado de los proyectos
2. Identificación de problemas o cuellos de botella
3. Sugerencias específicas de mejora
4. Recomendaciones para optimizar recursos y tiempos
5. Predicción de riesgos potenciales
`;

      const { invokeLLM } = await import("./_core/llm");
      
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Eres un asistente experto en gestión de proyectos solares. Analiza los datos proporcionados y ofrece insights valiosos, detecta problemas y sugiere mejoras concretas. Responde en español de forma profesional y estructurada."
          },
          {
            role: "user",
            content: context
          }
        ]
      });

      return {
        analysis: response.choices[0]?.message?.content || "No se pudo generar el análisis"
      };
    }),

    // Responder preguntas sobre proyectos
    askQuestion: protectedProcedure
      .input(z.object({ question: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const projects = await db.getAllProjects();
        const stats = await db.getProjectStats();
        
        const context = `
Contexto de Proyectos Solares:
- Total: ${stats.total}, Activos: ${stats.active}, Completados: ${stats.completed}, Retrasados: ${stats.overdue}

Proyectos: ${projects.map(p => `${p.name} (${p.status})`).join(', ')}

Pregunta del usuario: ${input.question}
`;

        const { invokeLLM } = await import("./_core/llm");
        
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Eres un asistente experto en gestión de proyectos solares de GreenH Project. Responde preguntas de forma clara, concisa y profesional en español. Usa los datos proporcionados para dar respuestas precisas."
            },
            {
              role: "user",
              content: context
            }
          ]
        });

        return {
          answer: response.choices[0]?.message?.content || "No se pudo generar una respuesta"
        };
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
    
    generateCustomReport: protectedProcedure
      .input(z.object({
        projectIds: z.array(z.number()),
        metrics: z.array(z.string()),
        dateRange: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores pueden generar reportes personalizados' });
        }
        
        const fileName = `reporte-personalizado-${new Date().toISOString().split('T')[0]}.pdf`;
        
        return { 
          url: `data:application/pdf;base64,placeholder`,
          fileName 
        };
      }),
  }),

  // ============================================
  // MÉTRICAS BÁSICAS (mantenidas para compatibilidad)
  // ============================================
  metrics: router({
    monthly: protectedProcedure
      .input(z.object({ months: z.number().optional().default(12) }))
      .query(async ({ input }) => {
        return await getMonthlyMetrics(input.months);
      }),
    
    completionRate: protectedProcedure.query(async () => {
      return await getCompletionRate();
    }),
    
    averageTime: protectedProcedure.query(async () => {
      return await getAverageCompletionTime();
    }),
    
    distribution: protectedProcedure.query(async () => {
      return await getProjectDistributionByType();
    }),
  }),

  // ============================================
  // ARCHIVOS ADJUNTOS
  // ============================================
  attachments: router({
    // Subir archivo adjunto
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileKey: z.string(),
        fileData: z.string(), // base64 encoded file
        fileSize: z.number(),
        mimeType: z.string(),
        category: z.enum(["technical", "legal", "financial", "other"]),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { fileData, fileKey, ...rest } = input;
        
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }
        
        // Verificar permisos
        if (ctx.user.role !== 'admin' && project.assignedEngineerId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para subir archivos a este proyecto' });
        }
        
        // Convertir base64 a buffer y subir a S3
        const buffer = Buffer.from(fileData, 'base64');
        const { storagePut } = await import('./storage');
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        const attachmentId = await db.createProjectAttachment({
          ...rest,
          fileKey,
          fileUrl: url,
          uploadedBy: ctx.user.id,
        });
        
        return { id: attachmentId, success: true };
      }),
    
    // Listar archivos de un proyecto
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }
        
        // Verificar permisos
        if (ctx.user.role !== 'admin' && project.assignedEngineerId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para ver archivos de este proyecto' });
        }
        
        return await db.getProjectAttachments(input.projectId);
      }),
    
    // Eliminar archivo adjunto
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const attachment = await db.getProjectAttachmentById(input.id);
        if (!attachment) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Archivo no encontrado' });
        }
        
        const project = await db.getProjectById(attachment.projectId);
        if (!project) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Proyecto no encontrado' });
        }
        
        // Verificar permisos (solo admin o quien lo subió)
        if (ctx.user.role !== 'admin' && attachment.uploadedBy !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para eliminar este archivo' });
        }
        
        await db.deleteProjectAttachment(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // NOTIFICACIONES
  // ============================================
  notifications: router({
    // Obtener notificaciones del usuario actual
    getUserNotifications: protectedProcedure
      .input(z.object({ 
        limit: z.number().optional().default(50),
        unreadOnly: z.boolean().optional().default(false)
      }))
      .query(async ({ input, ctx }) => {
        return await db.getUserNotifications(ctx.user.id, input.limit, input.unreadOnly);
      }),

    // Marcar notificación como leída
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const notification = await db.getNotificationById(input.id);
        if (!notification) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Notificación no encontrada' });
        }
        
        // Verificar que la notificación pertenece al usuario
        if (notification.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para modificar esta notificación' });
        }
        
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),

    // Marcar todas como leídas
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),

    // Eliminar notificación
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const notification = await db.getNotificationById(input.id);
        if (!notification) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Notificación no encontrada' });
        }
        
        // Verificar que la notificación pertenece al usuario
        if (notification.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permiso para eliminar esta notificación' });
        }
        
        await db.deleteNotification(input.id);
        return { success: true };
      }),

    // Obtener configuración de notificaciones
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserNotificationSettings(ctx.user.id);
      }),

    // Actualizar configuración de notificaciones
    updateSettings: protectedProcedure
      .input(z.object({
        enablePushNotifications: z.boolean().optional(),
        enableMilestoneReminders: z.boolean().optional(),
        enableDelayAlerts: z.boolean().optional(),
        enableAIAlerts: z.boolean().optional(),
        milestoneReminderDays: z.number().min(1).max(30).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.updateNotificationSettings(ctx.user.id, input);
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
