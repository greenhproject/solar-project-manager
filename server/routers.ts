import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { JWT_COOKIE_NAME } from "./_core/jwtAuth";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import {
  getMonthlyMetrics,
  getCompletionRate,
  getAverageCompletionTime,
  getProjectDistributionByType,
} from "./db";
import { generateProjectReport } from "./pdfGenerator";
import {
  getOpenSolarClient,
  checkOpenSolarConnection,
} from "./openSolarIntegration";
import { metricsRouter } from "./metricsRouters";
import { adminToolsRouter } from "./routes/admin-tools";
import { getConfiguredTimezone, saveTimezone, invalidateTimezoneCache, LATIN_AMERICA_TIMEZONES, getNowInConfiguredTimezone } from "./timezone";

// Procedimiento solo para administradores
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo los administradores pueden realizar esta acción",
    });
  }
  return next({ ctx });
});

// Procedimiento para admin e ingeniero_tramites
const tramitesProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "ingeniero_tramites") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo administradores e ingenieros de trámites pueden realizar esta acción",
    });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  analytics: metricsRouter,
  adminTools: adminToolsRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      // También limpiar cookie JWT si existe
      ctx.res.clearCookie(JWT_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Registro con JWT (para Railway)
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email inválido"),
          password: z
            .string()
            .min(6, "La contraseña debe tener al menos 6 caracteres"),
          name: z.string().min(1, "El nombre es requerido"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { createJWTUser, getUserByEmailForAuth } = await import(
          "./jwtAuthFunctions"
        );
        const { jwtAuthService, JWT_COOKIE_NAME } = await import(
          "./_core/jwtAuth"
        );

        // Verificar si el email ya existe
        const existingUser = await getUserByEmailForAuth(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este email ya está registrado",
          });
        }

        // Crear usuario
        await createJWTUser(input);

        // Obtener usuario recién creado
        const user = await getUserByEmailForAuth(input.email);
        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error al crear usuario",
          });
        }

        // Crear sesión JWT
        const token = await jwtAuthService.createJWTSessionToken(
          user.id,
          user.email!,
          user.name || ""
        );

        // NO establecer cookie - solo usar Authorization header
        // const cookieOptions = getSessionCookieOptions(ctx.req);
        // ctx.res.cookie(JWT_COOKIE_NAME, token, cookieOptions);

        // Enviar email de bienvenida (no bloqueante)
        const { sendWelcomeEmail } = await import("./_core/email");
        sendWelcomeEmail(user.email!, user.name || "Usuario").catch(err =>
          console.error("[Register] Error sending welcome email:", err)
        );

        return {
          success: true,
          token, // Devolver el token para autenticación híbrida
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      }),

    // Login con JWT (para Railway)
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email inválido"),
          password: z.string().min(1, "La contraseña es requerida"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { getUserByEmailForAuth, verifyPassword } = await import(
          "./jwtAuthFunctions"
        );
        const { jwtAuthService, JWT_COOKIE_NAME } = await import(
          "./_core/jwtAuth"
        );

        // Buscar usuario
        const user = await getUserByEmailForAuth(input.email);
        if (!user || !user.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email o contraseña incorrectos",
          });
        }

        // Verificar contraseña
        const isValid = await verifyPassword(input.password, user.password);
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email o contraseña incorrectos",
          });
        }

        // Crear sesión JWT
        const token = await jwtAuthService.createJWTSessionToken(
          user.id,
          user.email!,
          user.name || ""
        );

        // NO establecer cookie - solo usar Authorization header
        // const cookieOptions = getSessionCookieOptions(ctx.req);
        // ctx.res.cookie(JWT_COOKIE_NAME, token, cookieOptions);

        console.log("[Login Success]", {
          userId: user.id,
          email: user.email,
          tokenLength: token.length,
          authMethod: 'Authorization header only',
        });

        return {
          success: true,
          token, // Devolver el token para autenticación híbrida
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      }),

    // Solicitar recuperación de contraseña
    forgotPassword: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email inválido"),
        })
      )
      .mutation(async ({ input }) => {
        const { getUserByEmailForAuth } = await import("./jwtAuthFunctions");
        const { createPasswordResetToken } = await import(
          "./passwordResetFunctions"
        );
        const { sendPasswordResetEmail } = await import("./_core/email");

        // Buscar usuario
        const user = await getUserByEmailForAuth(input.email);

        // Siempre retornar éxito para no revelar si el email existe
        if (!user) {
          return {
            success: true,
            message: "Si el email existe, recibirás un enlace de recuperación",
          };
        }

        // Crear token de recuperación
        const resetToken = await createPasswordResetToken(user.id);

        // Construir URL de reset (detectar entorno)
        const isProduction = process.env.NODE_ENV === "production";
        const baseUrl = isProduction
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || "localhost:3000"}`
          : "http://localhost:3000";
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

        // Enviar email (no bloqueante)
        sendPasswordResetEmail(
          user.email!,
          user.name || "Usuario",
          resetToken,
          resetUrl
        ).catch(err =>
          console.error("[ForgotPassword] Error sending email:", err)
        );

        return {
          success: true,
          message: "Si el email existe, recibirás un enlace de recuperación",
        };
      }),

    // Restablecer contraseña con token
    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string().min(1, "Token requerido"),
          newPassword: z
            .string()
            .min(6, "La contraseña debe tener al menos 6 caracteres"),
        })
      )
      .mutation(async ({ input }) => {
        const { verifyResetToken } = await import("./passwordResetFunctions");
        const { hashPassword } = await import("./jwtAuthFunctions");
        const { updateUserPassword } = await import("./db");

        // Verificar token
        const userId = await verifyResetToken(input.token);
        if (!userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Token inválido o expirado",
          });
        }

        // Hash de nueva contraseña
        const hashedPassword = await hashPassword(input.newPassword);

        // Actualizar contraseña
        await updateUserPassword(userId, hashedPassword);

        return {
          success: true,
          message: "Contraseña actualizada correctamente",
        };
      }),
  }),

  // ============================================
  // GESTIÓN DE USUARIOS
  // ============================================
  users: router({
    // Actualizar rol de usuario
    updateRole: adminProcedure
      .input(
        z.object({ userId: z.number(), role: z.enum(["admin", "engineer", "ingeniero_tramites"]) })
      )
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuario no encontrado",
          });
        }

        // Proteger usuario maestro
        if (user.email === "greenhproject@gmail.com") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No se puede modificar el rol del usuario maestro",
          });
        }

        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    // Actualizar perfil de usuario
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "El nombre es requerido").optional(),
          email: z.string().email("Email inválido").optional(),
          theme: z.enum(["light", "dark", "system"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Verificar que el email no esté en uso por otro usuario
        if (input.email) {
          const existingUser = await db.getUserByEmail(input.email);
          if (existingUser && existingUser.id !== ctx.user.id) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Este email ya está en uso por otro usuario",
            });
          }
        }

        const updated = await db.updateUserProfile(ctx.user.id, input);
        return updated;
      }),

    // Subir avatar de usuario
    uploadAvatar: protectedProcedure
      .input(
        z.object({
          imageData: z.string(), // Base64 encoded image
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("./storage");

        // Convertir base64 a buffer
        const base64Data = input.imageData.replace(
          /^data:image\/\w+;base64,/,
          ""
        );
        const buffer = Buffer.from(base64Data, "base64");

        // Validar tamaño (máximo 2MB)
        if (buffer.length > 2 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La imagen es demasiado grande. Máximo 2MB.",
          });
        }

        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const extension = input.mimeType.split("/")[1] || "jpg";
        const fileKey = `avatars/${ctx.user.id}-${timestamp}.${extension}`;

        // Subir a S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Actualizar usuario con nueva URL de avatar
        await db.updateUserProfile(ctx.user.id, { avatarUrl: url });

        return { avatarUrl: url };
      }),

    // Cambiar contraseña (solo para usuarios JWT)
    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string().min(1),
          newPassword: z
            .string()
            .min(8, "La contraseña debe tener al menos 8 caracteres"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          return await db.changeUserPassword(
            ctx.user.id,
            input.currentPassword,
            input.newPassword
          );
        } catch (error: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
      }),

    // Eliminar usuario
    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuario no encontrado",
          });
        }

        // Proteger usuario maestro
        if (user.email === "greenhproject@gmail.com") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No se puede eliminar el usuario maestro",
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
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          color: z.string().default("#FF6B35"),
          estimatedDurationDays: z.number().default(30),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createProjectType(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          color: z.string().optional(),
          estimatedDurationDays: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
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
      let projectList;
      // Administradores ven todos los proyectos
      if (ctx.user.role === "admin") {
        projectList = await db.getAllProjects();
      } else {
        // Usuarios normales solo ven proyectos donde tienen hitos asignados
        projectList = await db.getProjectsWithAssignedMilestones(ctx.user.id);
      }
      
      // Obtener hitos vencidos para marcar proyectos con retraso por hitos
      const overdueMilestones = await db.getOverdueMilestones();
      
      // Para admin: mostrar todos los hitos vencidos
      // Para otros roles: filtrar solo hitos vencidos asignados al usuario actual
      const relevantOverdueMilestones = ctx.user.role === "admin"
        ? overdueMilestones
        : overdueMilestones.filter(m => m.assignedUserId === ctx.user.id);
      
      const projectIdsWithOverdueMilestones = new Set(
        relevantOverdueMilestones.map(m => m.projectId)
      );
      
      // Agregar flag hasOverdueMilestones a cada proyecto
      return projectList.map(p => ({
        ...p,
        hasOverdueMilestones: projectIdsWithOverdueMilestones.has(p.id),
      }));
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.id);

        // Verificar permisos: admin puede ver todo, ingeniero solo sus proyectos
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Permitir acceso si:
        // 1. Es admin
        // 2. Es el ingeniero asignado al proyecto
        // 3. Tiene hitos asignados en el proyecto
        const hasAssignedMilestones = await db.userHasAssignedMilestones(ctx.user.id, input.id);
        
        if (
          ctx.user.role !== "admin" &&
          project.assignedEngineerId !== ctx.user.id &&
          !hasAssignedMilestones
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para ver este proyecto",
          });
        }

        return project;
      }),

    create: adminProcedure
      .input(
        z.object({
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
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await db.createProject({
          ...input,
          createdBy: ctx.user.id,
          status: "planning",
          progressPercentage: 0,
        });

        const projectId = Number((result as any).insertId || 0);

        // Crear hitos desde plantillas
        console.log('[Project Create] projectId:', projectId, 'projectTypeId:', input.projectTypeId);
        if (projectId > 0) {
          const templates = await db.getMilestoneTemplatesByProjectType(
            input.projectTypeId
          );
          console.log('[Project Create] Found templates:', templates.length);

          for (const template of templates) {
            const dueDate = new Date(input.startDate);
            dueDate.setDate(
              dueDate.getDate() +
                template.orderIndex * (template.estimatedDurationDays || 7)
            );

            await db.createMilestone({
              projectId,
              name: template.name,
              description: template.description || "",
              dueDate,
              status: "pending",
              orderIndex: template.orderIndex,
              weight: 1,
              assignedUserId: template.defaultAssignedUserId || null,
            });
          }

          console.log('[Project Create] Created', templates.length, 'milestones for project', projectId);
          
          // Crear actualización de proyecto
          await db.createProjectUpdate({
            projectId,
            updateType: "status_change",
            title: "Proyecto creado",
            description: `El proyecto "${input.name}" ha sido creado con ${templates.length} hitos`,
            createdBy: ctx.user.id,
          });

          // Enviar email al ingeniero asignado
          if (input.assignedEngineerId) {
            try {
              const { sendProjectAssignedEmail } = await import("./emailService");
              const engineer = await db.getUserById(input.assignedEngineerId);
              if (engineer?.email) {
                await sendProjectAssignedEmail(
                  engineer.email,
                  engineer.name || 'Ingeniero',
                  input.name,
                  input.location || 'No especificada',
                  input.startDate
                );
                console.log(`[Project Create] Email sent to ${engineer.email} for project assignment`);
              }
            } catch (error) {
              console.error('[Project Create] Error sending email:', error);
            }
          }
        }

        return { success: true, projectId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          assignedEngineerId: z.number().optional(),
          status: z
            .enum([
              "planning",
              "in_progress",
              "on_hold",
              "completed",
              "cancelled",
            ])
            .optional(),
          progressPercentage: z.number().min(0).max(100).optional(),
          actualEndDate: z.date().optional(),
          location: z.string().optional(),
          clientName: z.string().optional(),
          clientEmail: z.string().optional(),
          clientPhone: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const project = await db.getProjectById(id);

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Solo admin puede actualizar, o el ingeniero asignado puede actualizar ciertos campos
        if (
          ctx.user.role !== "admin" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para actualizar este proyecto",
          });
        }

        // Ingenieros no pueden cambiar asignación ni ciertos campos críticos
        if (ctx.user.role !== "admin") {
          delete data.assignedEngineerId;
        }

        await db.updateProject(id, data);

        // Registrar actualización si cambió el estado
        if (data.status && data.status !== project.status) {
          await db.createProjectUpdate({
            projectId: id,
            updateType: "status_change",
            title: "Estado actualizado",
            description: `Estado cambiado de "${project.status}" a "${data.status}"`,
            oldValue: project.status,
            newValue: data.status,
            createdBy: ctx.user.id,
          });
        }

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.id);

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Eliminar proyecto (esto eliminará en cascada hitos, archivos, etc.)
        await db.deleteProject(input.id);

        return { success: true };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      // Estadísticas generales solo para admin
      if (ctx.user.role === "admin") {
        return await db.getProjectStats();
      } else {
        // Para ingenieros y otros roles, calcular stats basados en hitos asignados
        // Primero intentar por hitos asignados (más preciso)
        const projectsByMilestones = await db.getProjectsWithAssignedMilestones(ctx.user.id);
        // También incluir proyectos asignados directamente
        const projectsByEngineer = await db.getProjectsByEngineerId(ctx.user.id);
        
        // Combinar ambas listas sin duplicados
        const projectMap = new Map<number, typeof projectsByMilestones[0]>();
        for (const p of projectsByMilestones) projectMap.set(p.id, p);
        for (const p of projectsByEngineer) projectMap.set(p.id, p);
        const allUserProjects = Array.from(projectMap.values());
        
        // getOverdueMilestones ya usa getNowInConfiguredTimezone internamente
        const overdueMilestones = await db.getOverdueMilestones();
        const userOverdueMilestones = overdueMilestones.filter(
          m => m.assignedUserId === ctx.user.id
        );
        const projectIdsWithUserOverdueMilestones = new Set(
          userOverdueMilestones.map(m => m.projectId)
        );
        
        // Un proyecto está "overdue" para este usuario SOLO si tiene hitos
        // vencidos ASIGNADOS A ESTE USUARIO (no por fecha del proyecto)
        const overdueCount = allUserProjects.filter(
          p =>
            p.status !== "completed" &&
            p.status !== "cancelled" &&
            projectIdsWithUserOverdueMilestones.has(p.id)
        ).length;
        
        return {
          total: allUserProjects.length,
          active: allUserProjects.filter(p => p.status === "in_progress").length,
          completed: allUserProjects.filter(p => p.status === "completed").length,
          overdue: overdueCount,
        };
      }
    }),

    // Cargar hitos desde plantillas
    loadMilestonesFromTemplate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        console.log(`[Projects] Loading milestones from template for project ${input.projectId}`);
        
        // Obtener el proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos
        if (ctx.user.role !== "admin" && project.createdBy !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permisos para modificar este proyecto",
          });
        }

        // Obtener plantillas de hitos para el tipo de proyecto
        const templates = await db.getMilestoneTemplatesByProjectType(project.projectTypeId);
        console.log(`[Projects] Found ${templates.length} milestone templates for project type ${project.projectTypeId}`);

        if (templates.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No hay plantillas de hitos configuradas para este tipo de proyecto",
          });
        }

        // Insertar hitos desde las plantillas
        let createdCount = 0;
        for (const template of templates) {
          console.log(`[Projects] Creating milestone from template: ${template.name}`);
          await db.createMilestone({
            projectId: project.id,
            name: template.name,
            description: template.description || "",
            dueDate: new Date(project.startDate.getTime() + (template.estimatedDurationDays || 0) * 24 * 60 * 60 * 1000),
            orderIndex: template.orderIndex,
            status: "pending",
            assignedUserId: template.defaultAssignedUserId || null,
          });
          createdCount++;
        }

        // Recalcular progreso del proyecto
        const { recalculateProjectProgress } = await import(
          "./progressCalculator.js"
        );
        await recalculateProjectProgress(project.id);
        console.log(`[Projects] Created ${createdCount} milestones and recalculated progress`);

        return {
          success: true,
          count: createdCount,
          message: `Se cargaron ${createdCount} hitos predeterminados correctamente`,
        };
      }),
  }),

  // ============================================
  // MILESTONES (Hitos)ILLAS DE HITOS
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
      .input(
        z.object({
          projectTypeId: z.number(),
          name: z.string().min(1),
          description: z.string().optional(),
          orderIndex: z.number(),
          estimatedDurationDays: z.number().default(7),
          defaultAssignedUserId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createMilestoneTemplate(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          orderIndex: z.number().optional(),
          estimatedDurationDays: z.number().optional(),
          defaultAssignedUserId: z.number().nullable().optional(),
          isActive: z.boolean().optional(),
        })
      )
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

      // Si no es admin, filtrar solo los hitos ASIGNADOS al usuario (no todos los del proyecto)
      if (ctx.user.role !== "admin") {
        return allMilestones.filter(m => m.assignedUserId === ctx.user.id);
      }

      return allMilestones;
    }),

    getByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Solo admin ve todos los hitos del proyecto
        if (ctx.user.role === "admin") {
          return await db.getMilestonesByProjectId(input.projectId);
        }

        // Todos los demás roles (engineer, ingeniero_tramites, etc.) solo ven sus hitos asignados
        return await db.getMilestonesByProjectIdForUser(input.projectId, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          name: z.string().min(1),
          description: z.string().optional(),
          dueDate: z.date(),
          orderIndex: z.number(),
          weight: z.number().default(1),
          dependencies: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Solo admin o ingeniero asignado pueden crear hitos
        if (
          ctx.user.role !== "admin" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para crear hitos en este proyecto",
          });
        }

        // Validar y convertir dependencias
        const { dependencies, ...restInput } = input;
        const dependenciesJson =
          dependencies && dependencies.length > 0
            ? JSON.stringify(dependencies)
            : null;

        const result = await db.createMilestone({
          ...restInput,
          status: "pending",
          dependencies: dependenciesJson,
        });

        // Sincronizar con Google Calendar
        const milestoneId = Number((result as any).insertId || 0);
        if (milestoneId > 0) {
          try {
            const { createCalendarEvent, toRFC3339, createEndDate } =
              await import("./googleCalendar");
            const eventId = await createCalendarEvent({
              summary: `📅 ${project.name} - ${input.name}`,
              description:
                input.description || `Hito del proyecto ${project.name}`,
              start_time: toRFC3339(input.dueDate),
              end_time: toRFC3339(createEndDate(input.dueDate)),
              location: project.location || undefined,
              reminders: [1440, 60], // 1 día antes y 1 hora antes
            });

            if (eventId) {
              await db.updateMilestone(milestoneId, {
                googleCalendarEventId: eventId,
              });
            }
          } catch (error) {
            console.error(
              "[Milestone] Error syncing with Google Calendar:",
              error
            );
            // No fallar la creación del hito si falla la sincronización
          }
        }

        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          status: z
            .enum(["pending", "in_progress", "completed", "overdue"])
            .optional(),
          completedDate: z.date().optional(),
          notes: z.string().optional(),
          observations: z.string().optional(),
          dependencies: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, dependencies, ...data } = input;

        // Convertir dependencias a JSON si están presentes
        const updateData: any = { ...data };
        if (dependencies !== undefined) {
          updateData.dependencies =
            dependencies.length > 0 ? JSON.stringify(dependencies) : null;
        }

        // Si se marca como completado y no hay completedDate, usar fecha actual (zona horaria configurada)
        if (updateData.status === "completed" && !updateData.completedDate) {
          updateData.completedDate = await getNowInConfiguredTimezone();
        }

        // Obtener el hito para saber su projectId
        const milestone = await db.getMilestoneById(id);
        if (!milestone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hito no encontrado",
          });
        }

        await db.updateMilestone(id, updateData);

        // Sincronizar con Google Calendar si hay cambios relevantes
        if (
          milestone.googleCalendarEventId &&
          (data.name || data.description)
        ) {
          try {
            const { updateCalendarEvent } = await import("./googleCalendar");
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
            console.error(
              "[Milestone] Error syncing update with Google Calendar:",
              error
            );
          }
        }

        // Recalcular progreso del proyecto
        const { recalculateProjectProgress } = await import(
          "./progressCalculator"
        );
        await recalculateProjectProgress(milestone.projectId);

        // Si se completó el hito, crear actualización
        if (data.status === "completed") {
          await db.createProjectUpdate({
            projectId: milestone.projectId,
            updateType: "milestone_completed",
            title: "Hito completado",
            description: `El hito "${milestone.name}" ha sido marcado como completado`,
            createdBy: ctx.user.id,
          });
        }

        return { success: true, projectId: milestone.projectId };
      }),

    // Solicitar reprogramación de fecha con justificación (para roles no-admin)
    requestReschedule: protectedProcedure
      .input(
        z.object({
          milestoneId: z.number(),
          newDueDate: z.date(),
          justification: z.string().min(5, "La justificación debe tener al menos 5 caracteres"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const milestone = await db.getMilestoneById(input.milestoneId);
        if (!milestone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hito no encontrado",
          });
        }

        // Verificar que el usuario sea el responsable del hito o admin
        if (ctx.user.role !== "admin" && milestone.assignedUserId !== ctx.user.id) {
          const project = await db.getProjectById(milestone.projectId);
          if (!project || project.assignedEngineerId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "No tienes permiso para reprogramar este hito",
            });
          }
        }

        const oldDueDate = milestone.dueDate;

        // Actualizar la fecha del hito
        await db.updateMilestone(input.milestoneId, {
          dueDate: input.newDueDate,
        });

        // Registrar la reprogramación como nota en project_updates
        await db.createProjectUpdate({
          projectId: milestone.projectId,
          updateType: "note_added",
          title: `Hito reprogramado: ${milestone.name}`,
          description: `${ctx.user.name || "Usuario"} reprogramó la fecha del hito "${milestone.name}" de ${oldDueDate ? new Date(oldDueDate).toLocaleDateString("es-CO", { timeZone: await getConfiguredTimezone() }) : "sin fecha"} a ${input.newDueDate.toLocaleDateString("es-CO", { timeZone: await getConfiguredTimezone() })}. Justificación: ${input.justification}`,
          oldValue: oldDueDate ? JSON.stringify({ dueDate: oldDueDate }) : null,
          newValue: JSON.stringify({ dueDate: input.newDueDate }),
          createdBy: ctx.user.id,
        });

        return { success: true, projectId: milestone.projectId };
      }),

    overdue: protectedProcedure.query(async ({ ctx }) => {
      const overdueMilestones = await db.getOverdueMilestones();

      // Filtrar por permisos según rol
      if (ctx.user.role !== "admin") {
        // Todos los roles no-admin solo ven hitos vencidos ASIGNADOS a ellos
        return overdueMilestones.filter(m => m.assignedUserId === ctx.user.id);
      }

      return overdueMilestones;
    }),

    // Sincronizar hito manualmente con Google Calendar
    syncToCalendar: protectedProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const milestone = await db.getMilestoneById(input.id);

        if (!milestone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hito no encontrado",
          });
        }

        const project = await db.getProjectById(milestone.projectId);

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos
        if (
          ctx.user.role !== "admin" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para sincronizar este hito",
          });
        }

        try {
          const { createCalendarEvent, updateCalendarEvent, toRFC3339, createEndDate } =
            await import("./googleCalendarClient");

          // Si ya tiene eventId, actualizar; si no, crear
          if (milestone.googleCalendarEventId) {
            const success = await updateCalendarEvent({
              event_id: milestone.googleCalendarEventId,
              summary: `📅 ${project.name} - ${milestone.name}`,
              description:
                milestone.description || `Hito del proyecto ${project.name}`,
              start_time: toRFC3339(milestone.dueDate),
              end_time: toRFC3339(createEndDate(milestone.dueDate)),
              location: project.location || undefined,
              reminders: [1440, 60],
            });

            if (!success) {
              throw new Error("Error al actualizar evento en Google Calendar");
            }

            return {
              success: true,
              message: "Hito actualizado en Google Calendar",
              eventId: milestone.googleCalendarEventId,
            };
          } else {
            const eventId = await createCalendarEvent({
              summary: `📅 ${project.name} - ${milestone.name}`,
              description:
                milestone.description || `Hito del proyecto ${project.name}`,
              start_time: toRFC3339(milestone.dueDate),
              end_time: toRFC3339(createEndDate(milestone.dueDate)),
              location: project.location || undefined,
              reminders: [1440, 60],
            });

            if (!eventId) {
              throw new Error("Error al crear evento en Google Calendar");
            }

            // Guardar el eventId
            await db.updateMilestone(input.id, {
              googleCalendarEventId: eventId,
            });

            return {
              success: true,
              message: "Hito sincronizado con Google Calendar",
              eventId,
            };
          }
        } catch (error: any) {
          console.error("[Milestone] Error syncing with Google Calendar:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Error al sincronizar con Google Calendar",
          });
        }
      }),

    assignResponsible: protectedProcedure
      .input(
        z.object({
          milestoneId: z.number(),
          userId: z.number().nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const milestone = await db.getMilestoneById(input.milestoneId);

        if (!milestone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hito no encontrado",
          });
        }

        const project = await db.getProjectById(milestone.projectId);

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos (solo admin o ingeniero asignado)
        if (
          ctx.user.role !== "admin" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para asignar responsables",
          });
        }

        // Actualizar responsable
        await db.updateMilestone(input.milestoneId, {
          assignedUserId: input.userId,
        });

        // Si se asignó un responsable, enviar notificación por email
        if (input.userId) {
          try {
            const assignedUser = await db.getUserById(input.userId);
            if (assignedUser && assignedUser.email) {
              const { sendEmail } = await import("./emailService");
              await sendEmail({
                to: assignedUser.email,
                subject: `📌 Nuevo hito asignado: ${milestone.name}`,
                html: `
                  <h2>Hito asignado</h2>
                  <p>Hola ${assignedUser.name},</p>
                  <p>Se te ha asignado el siguiente hito:</p>
                  <ul>
                    <li><strong>Proyecto:</strong> ${project.name}</li>
                    <li><strong>Hito:</strong> ${milestone.name}</li>
                    <li><strong>Fecha de vencimiento:</strong> ${new Date(milestone.dueDate).toLocaleDateString('es-CO', { timeZone: await getConfiguredTimezone() })}</li>
                    ${milestone.description ? `<li><strong>Descripción:</strong> ${milestone.description}</li>` : ''}
                  </ul>
                  <p>Por favor, revisa los detalles en el sistema.</p>
                `,
              });
            }
          } catch (error) {
            console.error("[Milestone] Error sending assignment email:", error);
            // No fallar la asignación si falla el email
          }
        }

        return { success: true };
      }),

    updateDueDate: protectedProcedure
      .input(
        z.object({
          milestoneId: z.number(),
          dueDate: z.date(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const milestone = await db.getMilestoneById(input.milestoneId);

        if (!milestone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hito no encontrado",
          });
        }

        const project = await db.getProjectById(milestone.projectId);

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos
        if (
          ctx.user.role !== "admin" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para editar este hito",
          });
        }

        // Actualizar fecha de vencimiento
        await db.updateMilestone(input.milestoneId, {
          dueDate: input.dueDate,
        });

        // Sincronizar con Google Calendar si existe eventId
        if (milestone.googleCalendarEventId) {
          try {
            const { updateCalendarEvent, toRFC3339, createEndDate } =
              await import("./googleCalendarClient");

            await updateCalendarEvent({
              event_id: milestone.googleCalendarEventId,
              summary: `📅 ${project.name} - ${milestone.name}`,
              description:
                milestone.description || `Hito del proyecto ${project.name}`,
              start_time: toRFC3339(input.dueDate),
              end_time: toRFC3339(createEndDate(input.dueDate)),
              location: project.location || undefined,
              reminders: [1440, 60],
            });
          } catch (error) {
            console.error(
              "[Milestone] Error updating Google Calendar event:",
              error
            );
            // No fallar la actualización si falla la sincronización
          }
        }

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const milestone = await db.getMilestoneById(input.id);
        if (!milestone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hito no encontrado",
          });
        }

        const project = await db.getProjectById(milestone.projectId);

        // Intentar eliminar el evento de Google Calendar si existe
        if (milestone.googleCalendarEventId) {
          try {
            const { deleteCalendarEvent } = await import("./googleCalendar");
            await deleteCalendarEvent(milestone.googleCalendarEventId);
          } catch (error) {
            console.error("[Milestone] Error deleting Google Calendar event:", error);
          }
        }

        // Eliminar el hito y sus datos relacionados (reminders)
        await db.deleteMilestone(input.id);

        // Registrar la eliminación en el historial del proyecto
        await db.createProjectUpdate({
          projectId: milestone.projectId,
          updateType: "note_added",
          title: "Hito eliminado",
          description: `El administrador ${ctx.user.name || "Admin"} eliminó el hito "${milestone.name}" del proyecto "${project?.name || "Desconocido"}"`,
          createdBy: ctx.user.id,
        });

        // Recalcular progreso del proyecto
        const { recalculateProjectProgress } = await import("./progressCalculator");
        await recalculateProjectProgress(milestone.projectId);

        return { success: true, projectId: milestone.projectId };
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

    // Obtener hitos próximos a vencer
    upcoming: protectedProcedure
      .input(
        z
          .object({
            daysAhead: z.number().min(1).max(30).default(7),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const allUpcoming = await db.getUpcomingMilestones(input?.daysAhead || 7);
        
        // Filtrar por permisos según rol
        if (ctx.user.role !== "admin") {
          // Todos los roles no-admin solo ven hitos próximos ASIGNADOS a ellos
          return allUpcoming.filter(m => m.assignedUserId === ctx.user.id);
        }
        
        return allUpcoming;
      }),

    // Obtener hitos vencidos
    overdue: protectedProcedure.query(async ({ ctx }) => {
      const allOverdue = await db.getOverdueMilestones();
      
      // Filtrar por permisos según rol
      if (ctx.user.role !== "admin") {
        // Todos los roles no-admin solo ven hitos vencidos ASIGNADOS a ellos
        return allOverdue.filter(m => m.assignedUserId === ctx.user.id);
      }
      
      return allOverdue;
    }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          milestoneId: z.number().optional(),
          title: z.string().min(1),
          message: z.string().optional(),
          reminderDate: z.date(),
          type: z
            .enum([
              "milestone_due",
              "project_overdue",
              "custom",
              "sync_required",
            ])
            .default("custom"),
        })
      )
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
Análisis de Proyectos Solares - Green House Project

Estadísticas Generales:
- Total de proyectos: ${stats.total}
- Proyectos activos: ${stats.active}
- Proyectos completados: ${stats.completed}
- Proyectos con retraso: ${stats.overdue}

Proyectos:
${projects
  .map(
    p => `
- ${p.name} (${p.location})
  Estado: ${p.status}
  Estado: ${p.status}
  Tipo: ${p.projectTypeId}
  Ingeniero: ${p.assignedEngineerId}
  Fecha inicio: ${p.startDate}
  Fecha fin estimada: ${p.estimatedEndDate}
`
  )
  .join("")}

Por favor, proporciona:
1. Un análisis general del estado de los proyectos
2. Identificación de problemas o cuellos de botella
3. Sugerencias específicas de mejora
4. Recomendaciones para optimizar recursos y tiempos
5. Predicción de riesgos potenciales
`;

      const { invokeLLM } = await import("./_core/groqClient");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente experto en gestión de proyectos solares. Analiza los datos proporcionados y ofrece insights valiosos, detecta problemas y sugiere mejoras concretas. Responde en español de forma profesional y estructurada.",
          },
          {
            role: "user",
            content: context,
          },
        ],
      });

      return {
        analysis:
          response.choices[0]?.message?.content ||
          "No se pudo generar el análisis",
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

Proyectos: ${projects.map(p => `${p.name} (${p.status})`).join(", ")}

Pregunta del usuario: ${input.question}
`;

        const { invokeLLM } = await import("./_core/groqClient");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Eres un asistente experto en gestión de proyectos solares de Green House Project. Responde preguntas de forma clara, concisa y profesional en español. Usa los datos proporcionados para dar respuestas precisas.",
            },
            {
              role: "user",
              content: context,
            },
          ],
        });

        return {
          answer:
            response.choices[0]?.message?.content ||
            "No se pudo generar una respuesta",
        };
      }),

    // Generar informe PDF descargable
    generateReport: protectedProcedure.mutation(async ({ ctx }) => {
      const projects = await db.getAllProjects();
      const stats = await db.getProjectStats();
      const milestones = await db.getUpcomingMilestones(7);
      const overdueMilestones = await db.getOverdueMilestones();

      // Generar análisis con IA
      const context = `
Análisis de Proyectos Solares - Green House Project

Estadísticas Generales:
- Total de proyectos: ${stats.total}
- Proyectos activos: ${stats.active}
- Proyectos completados: ${stats.completed}
- Proyectos con retraso: ${stats.overdue}

Proyectos:
${projects
  .map(
    p => `
- ${p.name} (${p.location})
  Estado: ${p.status}
  Tipo: ${p.projectTypeId}
  Fecha inicio: ${p.startDate}
  Fecha fin estimada: ${p.estimatedEndDate}
`
  )
  .join("")}

Hitos próximos a vencer (7 días):
${milestones.map(m => `- ${m.milestoneName} (${m.projectName}) - Vence: ${m.dueDate}`).join("\n")}

Hitos vencidos:
${overdueMilestones.map(m => `- ${m.milestoneName} (${m.projectName}) - Venció: ${m.dueDate}`).join("\n")}

Por favor, genera un informe ejecutivo profesional en formato Markdown con:
1. Resumen Ejecutivo
2. Estado General de Proyectos
3. Análisis de Riesgos
4. Hitos Críticos
5. Recomendaciones Prioritarias
6. Plan de Acción
`;

      const { invokeLLM } = await import("./_core/groqClient");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Eres un consultor experto en gestión de proyectos solares. Genera informes ejecutivos profesionales, concisos y accionables en español. Usa formato Markdown con secciones claras.",
          },
          {
            role: "user",
            content: context,
          },
        ],
      });

      const reportContent =
        response.choices[0]?.message?.content ||
        "No se pudo generar el informe";

      // Por ahora retornamos el contenido del informe
      // En una implementación completa, generaríamos un PDF y lo subiríamos a S3
      return {
        reportContent,
        reportUrl: null, // TODO: Implementar generación de PDF
        timestamp: new Date().toISOString(),
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

    // Obtener datos de proyecto desde OpenSolar para auto-completar formulario
    getProjectData: protectedProcedure
      .input(z.object({ openSolarId: z.string() }))
      .query(async ({ input }) => {
        const { openSolarClient } = await import('./_core/openSolarClient');
        
        console.log('[OpenSolar] Getting project data for ID:', input.openSolarId);
        
        try {
          const project = await openSolarClient.getProjectById(input.openSolarId);
          console.log('[OpenSolar] Project retrieved successfully:', project.title);
          
          // Usar la nueva función que incluye equipos
          const formData = await openSolarClient.mapProjectToFormWithEquipment(project);
          console.log('[OpenSolar] Form data mapped with equipment successfully');
          
          return formData;
        } catch (error: any) {
          console.error('[OpenSolar] Error getting project:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: error.message || 'Error al obtener datos de OpenSolar' 
          });
        }
      }),

    // Sincronizar proyecto desde OpenSolar
    syncProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        if (!project.openSolarId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este proyecto no tiene un ID de OpenSolar asociado",
          });
        }

        // Usar el cliente correcto de OpenSolar (con EMAIL/PASSWORD)
        const { openSolarClient } = await import('./_core/openSolarClient');
        
        try {
          const openSolarProject = await openSolarClient.getProjectById(project.openSolarId);
          const formData = openSolarClient.mapProjectToForm(openSolarProject);
          
          // Actualizar proyecto con datos sincronizados
          await db.updateProject(input.projectId, {
            name: formData.name,
            location: formData.location,
            clientName: formData.clientName,
            clientEmail: formData.clientEmail,
            clientPhone: formData.clientPhone,
          });
          
             // Registrar log de sincronización exitosa
          await db.createSyncLog({
            projectId: input.projectId,
            syncedBy: ctx.user.id,
            syncType: "manual",
            status: "success",
            message: 'Proyecto sincronizado exitosamente desde OpenSolar',
          });
          
          return { success: true, message: "Proyecto sincronizado exitosamente" };
        } catch (error: any) {
          // Registrar log de sincronización fallida
          await db.createSyncLog({
            projectId: input.projectId,
            syncedBy: ctx.user.id,
            syncType: "manual",
            status: "failed",
            message: 'Error al sincronizar con OpenSolar',
            errorDetails: error.message,
          });
          
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Error al sincronizar con OpenSolar",
          });
        }
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
      .input(
        z.object({
          projectId: z.number(),
          syncType: z.enum(["manual", "automatic", "scheduled"]),
          direction: z.enum(["import", "export", "bidirectional"]),
          status: z.enum(["success", "partial", "failed"]),
          message: z.string().optional(),
          errorDetails: z.string().optional(),
          dataSynced: z.string().optional(),
        })
      )
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos
        if (
          ctx.user.role !== "admin" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para generar reportes de este proyecto",
          });
        }

        const milestones = await db.getMilestonesByProjectId(input.projectId);
        const projectType = project.projectTypeId
          ? await db.getProjectTypeById(project.projectTypeId)
          : undefined;
        const assignedEngineer = project.assignedEngineerId
          ? await db.getUserById(project.assignedEngineerId)
          : undefined;

        const pdfBuffer = await generateProjectReport({
          project,
          milestones,
          projectType,
          assignedEngineer,
        });

        // Convertir buffer a base64 para enviar al cliente
        const pdfBase64 = pdfBuffer.toString("base64");
        return {
          pdfBase64,
          fileName: `proyecto-${project.name.replace(/\s+/g, "-").toLowerCase()}.pdf`,
        };
      }),

    generateCustomReport: protectedProcedure
      .input(
        z.object({
          projectIds: z.array(z.number()),
          metrics: z.array(z.string()),
          dateRange: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Solo administradores pueden generar reportes personalizados",
          });
        }

        const fileName = `reporte-personalizado-${new Date().toISOString().split("T")[0]}.pdf`;

        return {
          url: `data:application/pdf;base64,placeholder`,
          fileName,
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
      .input(
        z.object({
          projectId: z.number(),
          fileName: z.string(),
          fileKey: z.string(),
          fileData: z.string(), // base64 encoded file
          fileSize: z.number(),
          mimeType: z.string(),
          category: z.enum(["technical", "legal", "financial", "other"]),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { fileData, fileKey, ...rest } = input;

        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos
        if (
          ctx.user.role !== "admin" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para subir archivos a este proyecto",
          });
        }

        // Convertir base64 a buffer y subir a S3
        const buffer = Buffer.from(fileData, "base64");
        const { storagePut } = await import("./storage");
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos
        if (
          ctx.user.role !== "admin" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para ver archivos de este proyecto",
          });
        }

        return await db.getProjectAttachments(input.projectId);
      }),

    // Eliminar archivo adjunto
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const attachment = await db.getProjectAttachmentById(input.id);
        if (!attachment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Archivo no encontrado",
          });
        }

        const project = await db.getProjectById(attachment.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos (solo admin o quien lo subió)
        if (
          ctx.user.role !== "admin" &&
          attachment.uploadedBy !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para eliminar este archivo",
          });
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
      .input(
        z.object({
          limit: z.number().optional().default(50),
          unreadOnly: z.boolean().optional().default(false),
        })
      )
      .query(async ({ input, ctx }) => {
        return await db.getUserNotifications(
          ctx.user.id,
          input.limit,
          input.unreadOnly
        );
      }),

    // Marcar notificación como leída
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const notification = await db.getNotificationById(input.id);
        if (!notification) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notificación no encontrada",
          });
        }

        // Verificar que la notificación pertenece al usuario
        if (notification.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para modificar esta notificación",
          });
        }

        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),

    // Marcar todas como leídas
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),

    // Eliminar notificación
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const notification = await db.getNotificationById(input.id);
        if (!notification) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notificación no encontrada",
          });
        }

        // Verificar que la notificación pertenece al usuario
        if (notification.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para eliminar esta notificación",
          });
        }

        await db.deleteNotification(input.id);
        return { success: true };
      }),

    // Obtener configuración de notificaciones
    getSettings: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserNotificationSettings(ctx.user.id);
    }),

    // Actualizar configuración de notificaciones
    updateSettings: protectedProcedure
      .input(
        z.object({
          enablePushNotifications: z.boolean().optional(),
          enableMilestoneReminders: z.boolean().optional(),
          enableDelayAlerts: z.boolean().optional(),
          enableAIAlerts: z.boolean().optional(),
          milestoneReminderDays: z.number().min(1).max(30).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.updateNotificationSettings(ctx.user.id, input);
      }),

    // Verificar y crear notificaciones automáticas para el usuario actual
    checkAndCreateAutoNotifications: protectedProcedure.mutation(
      async ({ ctx }) => {
        const {
          getUpcomingMilestones,
          getOverdueMilestones,
          createMilestoneDueSoonNotification,
          createMilestoneOverdueNotification,
          getUserNotifications,
        } = await import("./db");

        let upcomingCount = 0;
        let overdueCount = 0;

        try {
          // Obtener notificaciones existentes del usuario para evitar duplicados
          const existingNotifications = await getUserNotifications(ctx.user.id, 200, false);
          const existingTitles = new Set(existingNotifications.map(n => n.title));

          // Obtener hitos próximos a vencer (3 días)
          const upcomingMilestones = await getUpcomingMilestones(3);

          for (const milestone of upcomingMilestones) {
            // Notificar al responsable del hito (assignedUserId) o al ingeniero del proyecto
            const targetUserId = milestone.assignedUserId || milestone.assignedEngineerId;
            
            // Solo crear notificación si es para el usuario actual
            if (targetUserId !== ctx.user.id) continue;
            
            // Evitar duplicados
            const title = `Hito próximo a vencer: ${milestone.milestoneName}`;
            if (existingTitles.has(title)) continue;
            
            await createMilestoneDueSoonNotification(
              ctx.user.id,
              milestone.milestoneId,
              milestone.projectId,
              milestone.milestoneName,
              milestone.projectName,
              new Date(milestone.dueDate)
            );
            upcomingCount++;
          }

          // Obtener hitos vencidos
          const overdueMilestones = await getOverdueMilestones();

          for (const milestone of overdueMilestones) {
            // Notificar al responsable del hito (assignedUserId) o al ingeniero del proyecto
            const targetUserId = milestone.assignedUserId || milestone.assignedEngineerId;
            
            // Solo crear notificación si es para el usuario actual
            if (targetUserId !== ctx.user.id) continue;
            
            // Evitar duplicados
            const title = `Hito vencido: ${milestone.milestoneName}`;
            if (existingTitles.has(title)) continue;
            
            await createMilestoneOverdueNotification(
              ctx.user.id,
              milestone.milestoneId,
              milestone.projectId,
              milestone.milestoneName,
              milestone.projectName,
              new Date(milestone.dueDate)
            );
            overdueCount++;
          }

          return {
            success: true,
            upcomingCount,
            overdueCount,
            message: `Se crearon ${upcomingCount} notificaciones de hitos próximos y ${overdueCount} de hitos vencidos`,
          };
        } catch (error) {
          console.error("Error al crear notificaciones automáticas:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error al crear notificaciones automáticas",
          });
        }
      }
    ),

    // Enviar email de recordatorio para hitos próximos/vencidos
    sendEmailReminder: protectedProcedure
      .input(
        z.object({
          notificationId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          // Obtener la notificación para extraer los datos
          const notification = await db.getNotificationById(input.notificationId);
          if (!notification) {
            return { success: false };
          }

          const { sendMilestoneReminderEmail } = await import("./emailService");
          const { getEmailConfig } = await import("./db");

          // Determinar tipo
          const type = notification.type === "milestone_overdue" ? "overdue" as const : "due_soon" as const;

          // Enviar al usuario actual
          const sent = await sendMilestoneReminderEmail({
            toEmail: ctx.user.email || "",
            toName: ctx.user.name || "Usuario",
            milestoneName: notification.title,
            projectName: notification.message,
            dueDate: new Date(notification.sentAt),
            type,
          });

          if (!sent) {
            return { success: false };
          }

          // Enviar copia al admin si está configurado
          try {
            const emailConfig = await getEmailConfig();
            if (emailConfig?.sendCopyToAdmin && emailConfig.adminEmail) {
              await sendMilestoneReminderEmail({
                toEmail: emailConfig.adminEmail,
                toName: "Administrador",
                milestoneName: notification.title,
                projectName: notification.message,
                dueDate: new Date(notification.sentAt),
                type,
              });
            }
          } catch (e) {
            console.warn("No se pudo enviar copia al admin:", e);
          }

          return { success: true };
        } catch (error) {
          console.error("Error al enviar email de recordatorio:", error);
          return { success: false };
        }
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Permitir acceso si:
        // 1. Es admin
        // 2. Es el ingeniero asignado al proyecto
        // 3. Tiene hitos asignados en el proyecto
        const hasAssignedMilestones = await db.userHasAssignedMilestones(ctx.user.id, input.projectId);
        
        if (
          ctx.user.role !== "admin" &&
          project.assignedEngineerId !== ctx.user.id &&
          !hasAssignedMilestones
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para ver este historial",
          });
        }

        return await db.getProjectUpdatesByProjectId(input.projectId);
      }),
  }),

  // ============================================
  // MÓDULO TRÁMITES Y DISEÑO
  // ============================================
  
  // Plantillas CAD
  cadTemplates: router({
    // Listar plantillas con filtros
    list: tramitesProcedure
      .input(
        z.object({
          marcaInversor: z.string().optional(),
          potenciaInversor: z.string().optional(),
          operadorRed: z.string().optional(),
          cantidadPaneles: z.number().optional(),
          potenciaPaneles: z.string().optional(),
          marcaPaneles: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getCadTemplates(input);
      }),

    // Crear plantilla CAD
    create: tramitesProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileKey: z.string(),
          fileData: z.string(), // base64
          fileSize: z.number(),
          marcaInversor: z.string(),
          modeloInversor: z.string().optional(),
          potenciaInversor: z.string().optional(),
          operadorRed: z.string().optional(),
          cantidadPaneles: z.number().optional(),
          potenciaPaneles: z.string().optional(),
          marcaPaneles: z.string().optional(),
          descripcion: z.string().optional(),
          tags: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { fileData, fileKey, ...rest } = input;

        // Convertir base64 a buffer y subir a S3
        const buffer = Buffer.from(fileData, "base64");
        const { storagePut } = await import("./storage");
        const { url } = await storagePut(fileKey, buffer, "application/octet-stream");

        await db.createCadTemplate({
          ...rest,
          fileKey,
          fileUrl: url,
          uploadedBy: ctx.user.id,
        });

        return { success: true };
      }),

    // Eliminar plantilla CAD
    delete: tramitesProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCadTemplate(input.id);
        return { success: true };
      }),
  }),

  // Documentos comunes
  commonDocuments: router({
    // Listar documentos con filtros
    list: tramitesProcedure
      .input(
        z.object({
          tipo: z.string().optional(),
          marca: z.string().optional(),
          modelo: z.string().optional(),
          potencia: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getCommonDocuments(input);
      }),

    // Crear documento común
    create: tramitesProcedure
      .input(
        z.object({
          tipo: z.enum([
            "certificado_inversor",
            "certificado_paneles",
            "manual_inversor",
            "matricula_constructor",
            "matricula_disenador",
            "experiencia_constructor",
          ]),
          fileName: z.string(),
          fileKey: z.string(),
          fileData: z.string(), // base64
          fileSize: z.number(),
          mimeType: z.string(),
          marca: z.string().optional(),
          modelo: z.string().optional(),
          potencia: z.string().optional(),
          descripcion: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { fileData, fileKey, ...rest } = input;

        // Convertir base64 a buffer y subir a S3
        const buffer = Buffer.from(fileData, "base64");
        const { storagePut } = await import("./storage");
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        await db.createCommonDocument({
          ...rest,
          fileKey,
          fileUrl: url,
          uploadedBy: ctx.user.id,
        });

        return { success: true };
      }),

    // Eliminar documento común
    delete: tramitesProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCommonDocument(input.id);
        return { success: true };
      }),
  }),

  // Checklist de legalización
  legalizationChecklist: router({
    // Obtener checklist de un proyecto
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos
        if (
          ctx.user.role !== "admin" &&
          ctx.user.role !== "ingeniero_tramites" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para ver este checklist",
          });
        }

        return await db.getProjectLegalizationChecklist(input.projectId);
      }),

    // Inicializar checklist para un proyecto
    initialize: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos
        if (
          ctx.user.role !== "admin" &&
          ctx.user.role !== "ingeniero_tramites" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para inicializar este checklist",
          });
        }

        await db.initializeProjectLegalizationChecklist(input.projectId);
        return { success: true };
      }),

    // Actualizar item del checklist
    upsert: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          documentType: z.enum([
            "certificado_tradicion",
            "cedula_cliente",
            "plano_agpe",
            "autodeclaracion_retie",
            "certificado_inversor",
            "certificado_paneles",
            "manual_inversor",
            "matricula_inversor",
            "experiencia_constructor",
            "matricula_disenador",
            "memoria_calculo",
            "disponibilidad_red",
            "otros",
          ]),
          fileName: z.string().optional(),
          fileKey: z.string().optional(),
          fileData: z.string().optional(), // base64
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
          isCompleted: z.boolean(),
          autoLoaded: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proyecto no encontrado",
          });
        }

        // Verificar permisos
        if (
          ctx.user.role !== "admin" &&
          ctx.user.role !== "ingeniero_tramites" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para actualizar este checklist",
          });
        }

        let fileUrl = input.fileKey;
        
        // Si hay datos de archivo, subirlo a S3
        if (input.fileData && input.fileKey && input.mimeType) {
          const buffer = Buffer.from(input.fileData, "base64");
          const { storagePut } = await import("./storage");
          const { url } = await storagePut(input.fileKey, buffer, input.mimeType);
          fileUrl = url;
        }

        await db.upsertLegalizationChecklistItem({
          projectId: input.projectId,
          documentType: input.documentType,
          fileName: input.fileName,
          fileKey: input.fileKey,
          fileUrl,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          isCompleted: input.isCompleted,
          autoLoaded: input.autoLoaded,
          uploadedBy: ctx.user.id,
        });

        return { success: true };
      }),

    // Eliminar item del checklist
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Solo admin e ingeniero_tramites pueden eliminar
        if (ctx.user.role !== "admin" && ctx.user.role !== "ingeniero_tramites") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para eliminar items del checklist",
          });
        }

        await db.deleteLegalizationChecklistItem(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // CONFIGURACIÓN DE EMAIL (ADMIN)
  // ============================================
  emailConfig: router({
    // Obtener configuración actual
    get: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden ver la configuración de email",
        });
      }
      return await db.getEmailConfig();
    }),

    // Actualizar configuración
    update: protectedProcedure
      .input(
        z.object({
          provider: z.enum(["resend", "sendgrid", "smtp"]),
          apiKey: z.string().nullable().optional(),
          smtpHost: z.string().nullable().optional(),
          smtpPort: z.number().nullable().optional(),
          smtpUser: z.string().nullable().optional(),
          smtpPassword: z.string().nullable().optional(),
          smtpSecure: z.boolean().optional(),
          fromEmail: z.string().email(),
          fromName: z.string(),
          enableEmailNotifications: z.boolean(),
          sendCopyToAdmin: z.boolean(),
          adminEmail: z.string().email().nullable().optional(),
          isActive: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden modificar la configuración de email",
          });
        }

        // Invalidar cache del servicio de email
        const { invalidateEmailConfigCache } = await import("./emailService");
        invalidateEmailConfigCache();

        return await db.upsertEmailConfig({
          ...input,
          updatedBy: ctx.user.id,
        });
      }),

    // Enviar email de prueba
    sendTest: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden enviar emails de prueba",
          });
        }

        const { invalidateEmailConfigCache, sendTestEmail } = await import("./emailService");
        invalidateEmailConfigCache();

        const success = await sendTestEmail(input.email);

        if (success) {
          const config = await db.getEmailConfig();
          if (config) {
            await db.updateEmailConfigTestDate(config.id);
          }
        }

        return { success };
      }),
  }),

  // ============================================
  // CONFIGURACIÓN DE ZONA HORARIA (ADMIN)
  // ============================================
  appSettings: router({
    // Obtener zona horaria configurada (público para todos los usuarios autenticados)
    getTimezone: protectedProcedure.query(async () => {
      const tz = await getConfiguredTimezone();
      return { timezone: tz, timezones: LATIN_AMERICA_TIMEZONES };
    }),

    // Actualizar zona horaria (solo admin)
    setTimezone: adminProcedure
      .input(z.object({ timezone: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Validar que sea una zona horaria válida
        try {
          Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Zona horaria inválida: ${input.timezone}`,
          });
        }

        const success = await saveTimezone(input.timezone, ctx.user.id);
        if (!success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error al guardar la zona horaria",
          });
        }

        return { success: true, timezone: input.timezone };
      }),
  }),
});

export type AppRouter = typeof appRouter;
