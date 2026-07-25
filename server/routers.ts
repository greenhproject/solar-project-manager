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
import { clientPortalRouter } from "./routes/client-portal";
import { milestoneReminderConfigRouter } from "./routes/milestone-reminder-config";
import { ssoManagementRouter } from "./routes/sso-management";
import { getConfiguredTimezone, saveTimezone, invalidateTimezoneCache, LATIN_AMERICA_TIMEZONES, getNowInConfiguredTimezone } from "./timezone";
import { appSettings, apiKeys, webhooks, outgoingWebhookLogs, users, clientProjectAccess } from "../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import { triggerMilestoneStatusChanged, triggerMilestoneCompleted, triggerProjectCompleted, triggerProjectStatusChanged } from "./webhookService";

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
  clientPortal: clientPortalRouter,
  milestoneReminders: milestoneReminderConfigRouter,

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

        // Verificar si el email ya existe
        const existingUser = await getUserByEmailForAuth(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este email ya está registrado",
          });
        }

        // Crear usuario con status 'pending' (requiere aprobación del admin)
        await createJWTUser(input);

        // Auto-vincular proyectos existentes por email del cliente
        try {
          const dbInst = await db.getDb();
          if (dbInst) {
            const { projects } = await import("../drizzle/schema");
            // Buscar proyectos donde el email del cliente coincida
            const matchingProjects = await dbInst.select({ id: projects.id })
              .from(projects)
              .where(eq(projects.clientEmail, input.email));
            
            if (matchingProjects.length > 0) {
              // Obtener el ID del usuario recién creado
              const newUser = await getUserByEmailForAuth(input.email);
              if (newUser) {
                // Crear acceso para cada proyecto encontrado
                for (const proj of matchingProjects) {
                  await dbInst.insert(clientProjectAccess).values({
                    clientUserId: newUser.id,
                    projectId: proj.id,
                    canViewFiles: true,
                    canViewUpdates: true,
                    grantedBy: newUser.id, // auto-asignado
                  }).onDuplicateKeyUpdate({ set: { canViewFiles: true } });
                }
                console.log(`[Register] Auto-vinculados ${matchingProjects.length} proyectos para ${input.email}`);
              }
            }
          }
        } catch (err) {
          console.error("[Register] Error auto-vinculando proyectos:", err);
        }

        // Notificar al admin sobre nuevo registro pendiente (no bloqueante)
        const { notifyOwner } = await import("./_core/notification");
        notifyOwner({
          title: "Nuevo registro pendiente de aprobación",
          content: `El usuario ${input.name} (${input.email}) se ha registrado y espera aprobación.`,
        }).catch(err => console.error("[Register] Error notifying admin:", err));

        return {
          success: true,
          pendingApproval: true,
          message: "Tu cuenta ha sido creada. Un administrador debe aprobarla antes de que puedas acceder.",
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

        // Verificar status de la cuenta
        if ((user as any).status === "pending") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos cuando sea aprobada.",
          });
        }
        if ((user as any).status === "rejected") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Tu cuenta ha sido rechazada. Contacta al administrador para más información.",
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
        z.object({ userId: z.number(), role: z.enum(["admin", "engineer", "ingeniero_tramites", "admin_financiero", "client"]) })
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

    // Aprobar usuario pendiente
    approveUser: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["admin", "engineer", "ingeniero_tramites", "admin_financiero", "client"]).default("engineer") }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
        await dbInst.update(users).set({ status: "approved" as any, role: input.role }).where(eq(users.id, input.userId));
        
        // Notificar al usuario que fue aprobado (no bloqueante)
        if (user.email) {
          const { sendEmail } = await import("./_core/email");
          sendEmail({
            to: user.email,
            subject: "Tu cuenta ha sido aprobada - Solar Project Manager",
            html: `<p>Hola ${user.name || "Usuario"},</p><p>Tu cuenta ha sido aprobada. Ya puedes iniciar sesi\u00f3n en Solar Project Manager.</p><p>Saludos,<br/>Equipo GreenH Project</p>`,
          }).catch(err => console.error("[ApproveUser] Error sending email:", err));
        }
        return { success: true };
      }),

    // Rechazar usuario pendiente
    rejectUser: adminProcedure
      .input(z.object({ userId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
        await dbInst.update(users).set({ status: "rejected" as any }).where(eq(users.id, input.userId));
        return { success: true };
      }),

    // Listar usuarios pendientes de aprobaci\u00f3n
    pendingApproval: adminProcedure.query(async () => {
      const dbInst = await db.getDb();
      if (!dbInst) return [];
      const pending = await dbInst.select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.status, "pending" as any));
      return pending;
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
      // Administradores y admin_financiero ven todos los proyectos
      if (ctx.user.role === "admin" || ctx.user.role === "admin_financiero") {
        projectList = await db.getAllProjects();
      } else {
        // Usuarios normales solo ven proyectos donde tienen hitos asignados
        projectList = await db.getProjectsWithAssignedMilestones(ctx.user.id);
      }
      
      // Obtener hitos vencidos para marcar proyectos con retraso por hitos
      const overdueMilestones = await db.getOverdueMilestones();
      
      // Para admin y admin_financiero: mostrar todos los hitos vencidos
      // Para otros roles: filtrar solo hitos vencidos asignados al usuario actual
      const relevantOverdueMilestones = (ctx.user.role === "admin" || ctx.user.role === "admin_financiero")
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
          ctx.user.role !== "admin_financiero" &&
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

        const projectId = Number((result as any)[0]?.insertId || (result as any).insertId || 0);

        // Crear hitos desde plantillas
        console.log('[Project Create] projectId:', projectId, 'projectTypeId:', input.projectTypeId);
        if (projectId > 0) {
          const templates = await db.getMilestoneTemplatesByProjectType(
            input.projectTypeId
          );
          console.log('[Project Create] Found templates:', templates.length);

          // Calcular fechas con días hábiles
          const { addBusinessDays } = await import("../shared/businessDays");
          let includeWeekends = false;
          try {
            const dbInst = await db.getDb();
            const settingResult = dbInst ? await dbInst
              .select()
              .from(appSettings)
              .where(eq(appSettings.settingKey, "include_weekends"))
              .limit(1) : [];
            if (settingResult.length > 0 && settingResult[0].settingValue === "true") {
              includeWeekends = true;
            }
          } catch (e) {
            console.warn("[Project Create] Could not read include_weekends setting");
          }

          let currentStartDate = new Date(input.startDate);
          for (const template of templates) {
            const durationDays = template.estimatedDurationDays || 7;
            const milestoneStartDate = new Date(currentStartDate);
            const milestoneEndDate = addBusinessDays(milestoneStartDate, durationDays, includeWeekends);

            await db.createMilestone({
              projectId,
              name: template.name,
              description: template.description || "",
              startDate: milestoneStartDate,
              endDate: milestoneEndDate,
              durationDays: durationDays,
              dueDate: milestoneEndDate,
              status: "pending",
              orderIndex: template.orderIndex,
              weight: 1,
              assignedUserId: template.defaultAssignedUserId || null,
            });
            
            currentStartDate = new Date(milestoneEndDate);
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
          startDate: z.string().optional(),
          estimatedEndDate: z.string().optional(),
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

        // Admin, ingeniero asignado, o ingeniero de trámites pueden actualizar
        if (
          ctx.user.role !== "admin" &&
          ctx.user.role !== "ingeniero_tramites" &&
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

        // Convertir fechas de string a Date para Drizzle
        const updateData: any = { ...data };
        if (data.startDate) {
          updateData.startDate = new Date(data.startDate + 'T12:00:00');
        }
        if (data.estimatedEndDate) {
          updateData.estimatedEndDate = new Date(data.estimatedEndDate + 'T12:00:00');
        }

        await db.updateProject(id, updateData);

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
      // Estadísticas generales para admin y admin_financiero
      if (ctx.user.role === "admin" || ctx.user.role === "admin_financiero") {
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

        // Obtener configuración de días hábiles
        const { addBusinessDays } = await import("../shared/businessDays");
        let includeWeekends = false;
        try {
          const dbInst2 = await db.getDb();
          const settingResult = dbInst2 ? await dbInst2
            .select()
            .from(appSettings)
            .where(eq(appSettings.settingKey, "include_weekends"))
            .limit(1) : [];
          if (settingResult.length > 0 && settingResult[0].settingValue === "true") {
            includeWeekends = true;
          }
        } catch (e) {
          console.warn("[Projects] Could not read include_weekends setting, defaulting to false");
        }

        // Insertar hitos desde las plantillas con cálculo de fechas usando días hábiles
        let createdCount = 0;
        let currentStartDate = new Date(project.startDate);
        for (const template of templates) {
          console.log(`[Projects] Creating milestone from template: ${template.name}`);
          const durationDays = template.estimatedDurationDays || 7;
          const milestoneStartDate = new Date(currentStartDate);
          const milestoneEndDate = addBusinessDays(milestoneStartDate, durationDays, includeWeekends);
          
          await db.createMilestone({
            projectId: project.id,
            name: template.name,
            description: template.description || "",
            startDate: milestoneStartDate,
            endDate: milestoneEndDate,
            durationDays: durationDays,
            dueDate: milestoneEndDate,
            orderIndex: template.orderIndex,
            status: "pending",
            assignedUserId: template.defaultAssignedUserId || null,
          });
          
          // El siguiente hito empieza donde termina este
          currentStartDate = new Date(milestoneEndDate);
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

    // Enviar invitación al cliente por email
    sendClientInvitation: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        customMessage: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Solo admin e ingenieros pueden invitar
        if (ctx.user.role !== "admin" && ctx.user.role !== "engineer" && ctx.user.role !== "ingeniero_tramites") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permisos para enviar invitaciones" });
        }

        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

        // Obtener proyecto
        const project = await db.getProjectById(input.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        if (!project.clientEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto no tiene un email de cliente configurado. Edita el proyecto y agrega el email del cliente." });
        }

        // Determinar URL del portal
        const isProduction = process.env.NODE_ENV === "production";
        const baseUrl = isProduction
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || "spm.ghp.center"}`
          : "http://localhost:3000";
        const portalUrl = `${baseUrl}/portal`;

        // Enviar email de invitación
        const { sendClientInvitationEmail } = await import("./emailService");
        const success = await sendClientInvitationEmail({
          toEmail: project.clientEmail,
          clientName: project.clientName || "",
          projectName: project.name,
          projectId: project.id,
          portalUrl,
          senderName: ctx.user.name || "Equipo GreenH",
        });

        if (!success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo enviar el email. Verifica la configuración de email en Ajustes." });
        }

        // Registrar la invitación como una actualización del proyecto
        await db.createProjectUpdate({
          projectId: input.projectId,
          updateType: "note_added",
          title: "Invitación enviada al cliente",
          description: `Se envió invitación al portal a ${project.clientEmail}`,
          createdBy: ctx.user.id,
        });

        return { success: true, sentTo: project.clientEmail };
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

    reorder: adminProcedure
      .input(
        z.object({
          projectTypeId: z.number(),
          orderedIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input }) => {
        await db.reorderMilestoneTemplates(input.orderedIds);
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

      // Si no es admin ni admin_financiero, filtrar solo los hitos ASIGNADOS al usuario
      if (ctx.user.role !== "admin" && ctx.user.role !== "admin_financiero") {
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

        // Admin y admin_financiero ven todos los hitos del proyecto
        if (ctx.user.role === "admin" || ctx.user.role === "admin_financiero") {
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
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          durationDays: z.number().optional(),
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

        // Admin, ingeniero asignado, o ingeniero de trámites pueden crear hitos
        if (
          ctx.user.role !== "admin" &&
          ctx.user.role !== "ingeniero_tramites" &&
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
          startDate: input.startDate || null,
          endDate: input.endDate || null,
          durationDays: input.durationDays || null,
        });

        // Sincronizar con Google Calendar
        const milestoneId = Number((result as any)[0]?.insertId || (result as any).insertId || 0);
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
          startDate: z.date().nullable().optional(),
          endDate: z.date().nullable().optional(),
          dueDate: z.date().nullable().optional(),
          durationDays: z.number().nullable().optional(),
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

        // Sincronizar: si se envía endDate, también actualizar dueDate
        if (updateData.endDate && !updateData.dueDate) {
          updateData.dueDate = updateData.endDate;
        }
        // Sincronizar: si se envía dueDate, también actualizar endDate
        if (updateData.dueDate && !updateData.endDate) {
          updateData.endDate = updateData.dueDate;
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

        // admin_financiero solo puede cambiar status de sus propios hitos asignados
        if (ctx.user.role === "admin_financiero") {
          if (milestone.assignedUserId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Solo puedes modificar los hitos que te están asignados",
            });
          }
          // Solo permitir cambiar status y completedDate, no otros campos
          const allowedFields = ['status', 'completedDate'];
          const attemptedFields = Object.keys(updateData).filter(k => updateData[k] !== undefined);
          const disallowed = attemptedFields.filter(f => !allowedFields.includes(f));
          if (disallowed.length > 0) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Solo puedes marcar como completado tus hitos asignados",
            });
          }
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

        // Disparar webhooks si cambió el status
        if (data.status && data.status !== milestone.status) {
          const project = await db.getProjectById(milestone.projectId);
          triggerMilestoneStatusChanged({
            milestoneId: id,
            milestoneName: milestone.name,
            projectId: milestone.projectId,
            projectName: project?.name || "Desconocido",
            oldStatus: milestone.status,
            newStatus: data.status,
          });
          if (data.status === "completed") {
            triggerMilestoneCompleted({
              milestoneId: id,
              milestoneName: milestone.name,
              projectId: milestone.projectId,
              projectName: project?.name || "Desconocido",
              completedDate: new Date().toISOString(),
            });
            // Verificar si el proyecto se completó
            const milestones = await db.getMilestonesByProjectId(milestone.projectId);
            const allCompleted = milestones.every((m: any) => m.id === id ? true : m.status === "completed");
            if (allCompleted && milestones.length > 0) {
              triggerProjectCompleted({
                projectId: milestone.projectId,
                projectName: project?.name || "Desconocido",
                completedDate: new Date().toISOString(),
                totalMilestones: milestones.length,
              });
            }
          }
        }

        return { success: true, projectId: milestone.projectId };
      }),

    // Recalcular fechas de un hito individual basado en toggle de días hábiles
    recalculateWithWeekends: protectedProcedure
      .input(
        z.object({
          milestoneId: z.number(),
          includeWeekends: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const milestone = await db.getMilestoneById(input.milestoneId);
        if (!milestone) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Hito no encontrado" });
        }

        const project = await db.getProjectById(milestone.projectId);
        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Proyecto no encontrado" });
        }

        // Verificar permisos
        if (
          ctx.user.role !== "admin" &&
          ctx.user.role !== "ingeniero_tramites" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
        }

        const { addBusinessDays } = await import("../shared/businessDays");

        // Usar startDate del hito como base, o dueDate si no hay startDate
        const startDate = milestone.startDate ? new Date(milestone.startDate) : new Date(milestone.dueDate);
        const durationDays = milestone.durationDays || 7;

        // Recalcular endDate y dueDate usando la configuración de weekends
        const newEndDate = addBusinessDays(startDate, durationDays, input.includeWeekends);

        await db.updateMilestone(input.milestoneId, {
          endDate: newEndDate,
          dueDate: newEndDate,
        });

        return {
          success: true,
          newEndDate,
          includeWeekends: input.includeWeekends,
          durationDays,
        };
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

        // Verificar que el usuario sea el responsable del hito, admin, o ingeniero de trámites
        if (ctx.user.role !== "admin" && ctx.user.role !== "ingeniero_tramites" && milestone.assignedUserId !== ctx.user.id) {
          const project = await db.getProjectById(milestone.projectId);
          if (!project || project.assignedEngineerId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "No tienes permiso para reprogramar este hito",
            });
          }
        }

        const oldDueDate = milestone.dueDate;
        const tz = await getConfiguredTimezone();
        const oldDateStr = oldDueDate ? new Date(oldDueDate).toLocaleDateString("es-CO", { timeZone: tz }) : "sin fecha";
        const newDateStr = input.newDueDate.toLocaleDateString("es-CO", { timeZone: tz });
        const userName = ctx.user.name || "Usuario";
        const now = new Date().toLocaleDateString("es-CO", { timeZone: tz });

        // Construir la nota de reprogramación para el hito
        const rescheduleNote = `[${now}] Reprogramado por ${userName}: ${oldDateStr} → ${newDateStr}. Justificación: ${input.justification}`;

        // Actualizar la fecha del hito Y agregar la justificación en el campo notes
        const existingNotes = milestone.notes || "";
        const updatedNotes = existingNotes 
          ? `${existingNotes}\n\n--- Reprogramación ---\n${rescheduleNote}`
          : `--- Reprogramación ---\n${rescheduleNote}`;

        // Si la nueva fecha es futura y el hito estaba en overdue, revertir a pending
        const now2 = new Date();
        
        // Calcular nueva startDate: mantener la misma duración si existe, sino usar newDueDate como start
        const durationDays = milestone.durationDays || 1;
        let newStartDate: Date;
        if (milestone.startDate && milestone.endDate) {
          // Si tenía startDate y endDate, recalcular startDate manteniendo la duración
          // newStartDate = newDueDate - durationDays
          const { subtractBusinessDays } = await import("../shared/businessDays");
          let includeWeekends = false;
          try {
            const { appSettings } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            const dbInst = await db.getDb();
            const settingResult = dbInst ? await dbInst
              .select()
              .from(appSettings)
              .where(eq(appSettings.settingKey, "include_weekends"))
              .limit(1) : [];
            if (settingResult.length > 0 && settingResult[0].settingValue === "true") {
              includeWeekends = true;
            }
          } catch (e) { /* default false */ }
          newStartDate = subtractBusinessDays(input.newDueDate, durationDays, includeWeekends);
        } else {
          newStartDate = input.newDueDate; // Si no tenía startDate, usar la nueva fecha
        }
        
        const updateData: any = {
          startDate: newStartDate,
          dueDate: input.newDueDate,
          endDate: input.newDueDate, // Sincronizar endDate = dueDate
          notes: updatedNotes,
        };
        if (input.newDueDate > now2 && (milestone.status === 'overdue' || milestone.status === 'pending' || milestone.status === 'in_progress')) {
          // Si la nueva fecha es futura, el hito ya no está vencido
          if (milestone.status === 'overdue') {
            updateData.status = 'pending';
          }
        }
        await db.updateMilestone(input.milestoneId, updateData);

        // Registrar la reprogramación como nota en project_updates
        const project = await db.getProjectById(milestone.projectId);
        await db.createProjectUpdate({
          projectId: milestone.projectId,
          updateType: "note_added",
          title: `Hito reprogramado: ${milestone.name}`,
          description: `${userName} reprogramó la fecha del hito "${milestone.name}" de ${oldDateStr} a ${newDateStr}. Justificación: ${input.justification}`,
          oldValue: oldDueDate ? JSON.stringify({ dueDate: oldDueDate }) : null,
          newValue: JSON.stringify({ dueDate: input.newDueDate }),
          createdBy: ctx.user.id,
        });

        // Enviar notificación por email al responsable del hito (si es diferente al que reprograma)
        if (milestone.assignedUserId && milestone.assignedUserId !== ctx.user.id) {
          try {
            const assignedUser = await db.getUserById(milestone.assignedUserId);
            if (assignedUser && assignedUser.email) {
              const { sendEmail } = await import("./emailService");
              const newDateFormatted = input.newDueDate.toLocaleDateString('es-CO', { timeZone: tz });
              await sendEmail({
                to: assignedUser.email,
                subject: `📅 Hito reprogramado: ${milestone.name}`,
                html: `
                  <h2>Tu hito ha sido reprogramado</h2>
                  <p>Hola ${assignedUser.name || 'Usuario'},</p>
                  <p><strong>${userName}</strong> ha reprogramado el siguiente hito:</p>
                  <ul>
                    <li><strong>Proyecto:</strong> ${project?.name || 'Proyecto'}</li>
                    <li><strong>Hito:</strong> ${milestone.name}</li>
                    <li><strong>Fecha anterior:</strong> ${oldDateStr}</li>
                    <li><strong>Nueva fecha:</strong> ${newDateFormatted}</li>
                    <li><strong>Justificación:</strong> ${input.justification}</li>
                  </ul>
                  <p>Por favor, ten en cuenta la nueva fecha de vencimiento.</p>
                `,
              });
              console.log(`[Reschedule] Notificación enviada a responsable: ${assignedUser.email}`);
            }
          } catch (error) {
            console.error("[Reschedule] Error enviando notificación al responsable:", error);
          }
        }

        // Enviar copia al remitente para trazabilidad
        if (ctx.user.email) {
          try {
            const { sendEmail } = await import("./emailService");
            const responsableName = milestone.assignedUserId 
              ? (await db.getUserById(milestone.assignedUserId))?.name || 'Sin asignar'
              : 'Sin asignar';
            const newDateFormatted = input.newDueDate.toLocaleDateString('es-CO', { timeZone: tz });
            await sendEmail({
              to: ctx.user.email,
              subject: `📅 Confirmación: Reprogramaste el hito "${milestone.name}"`,
              html: `
                <h2>Confirmación de reprogramación</h2>
                <p>Hola ${userName},</p>
                <p>Has reprogramado exitosamente el siguiente hito:</p>
                <ul>
                  <li><strong>Proyecto:</strong> ${project?.name || 'Proyecto'}</li>
                  <li><strong>Hito:</strong> ${milestone.name}</li>
                  <li><strong>Responsable:</strong> ${responsableName}</li>
                  <li><strong>Fecha anterior:</strong> ${oldDateStr}</li>
                  <li><strong>Nueva fecha:</strong> ${newDateFormatted}</li>
                  <li><strong>Justificación:</strong> ${input.justification}</li>
                </ul>
              `,
            });
          } catch (error) {
            console.error("[Reschedule] Error enviando copia al remitente:", error);
          }
        }

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
          ctx.user.role !== "ingeniero_tramites" &&
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

        // Verificar permisos (admin, ingeniero asignado, o ingeniero de trámites)
        if (
          ctx.user.role !== "admin" &&
          ctx.user.role !== "ingeniero_tramites" &&
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
          cascadeSubsequent: z.boolean().default(true), // Cascada automática por defecto
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
          ctx.user.role !== "ingeniero_tramites" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para editar este hito",
          });
        }

        // Actualizar fecha de vencimiento del hito seleccionado (endDate = dueDate siempre)
        // También recalcular startDate manteniendo la duración
        const nowCheck = new Date();
        const dueDateUpdate: any = {
          dueDate: input.dueDate,
          endDate: input.dueDate,
        };
        
        // Recalcular startDate basado en la duración del hito
        if (milestone.startDate && milestone.durationDays) {
          const { subtractBusinessDays } = await import("../shared/businessDays");
          let includeWeekends = false;
          try {
            const { appSettings } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            const dbInst = await db.getDb();
            const settingResult = dbInst ? await dbInst
              .select()
              .from(appSettings)
              .where(eq(appSettings.settingKey, "include_weekends"))
              .limit(1) : [];
            if (settingResult.length > 0 && settingResult[0].settingValue === "true") {
              includeWeekends = true;
            }
          } catch (e) { /* default false */ }
          dueDateUpdate.startDate = subtractBusinessDays(input.dueDate, milestone.durationDays, includeWeekends);
        }
        
        if (input.dueDate > nowCheck && milestone.status === 'overdue') {
          dueDateUpdate.status = 'pending';
        }
        await db.updateMilestone(input.milestoneId, dueDateUpdate);

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
          }
        }

        // === CASCADA AUTOMÁTICA DE FECHAS ===
        // Recalcular fechas de hitos siguientes usando duración de plantillas
        let cascadedCount = 0;
        if (input.cascadeSubsequent) {
          try {
            // Obtener todos los hitos del proyecto ordenados por orderIndex
            const allMilestones = await db.getMilestonesByProjectId(milestone.projectId);

            // Obtener plantillas del tipo de proyecto para conocer la duración de cada hito
            const templates = await db.getMilestoneTemplatesByProjectType(project.projectTypeId);

            // Crear un mapa de orderIndex -> estimatedDurationDays desde las plantillas
            const durationByOrder = new Map<number, number>();
            for (const tmpl of templates) {
              durationByOrder.set(tmpl.orderIndex, tmpl.estimatedDurationDays || 7);
            }

            // Filtrar solo los hitos con orderIndex mayor al hito editado
            // y que no estén completados (no mover hitos ya terminados)
            const subsequentMilestones = allMilestones.filter(
              (m) => m.orderIndex > milestone.orderIndex && m.status !== "completed"
            );

            // Ordenar por orderIndex ascendente
            subsequentMilestones.sort((a, b) => a.orderIndex - b.orderIndex);

            // Obtener configuración de días hábiles para cascada
            const { addBusinessDays: addBizDays } = await import("../shared/businessDays");
            let cascadeIncludeWeekends = false;
            try {
              const dbInst3 = await db.getDb();
              const settingResult = dbInst3 ? await dbInst3
                .select()
                .from(appSettings)
                .where(eq(appSettings.settingKey, "include_weekends"))
                .limit(1) : [];
              if (settingResult.length > 0 && settingResult[0].settingValue === "true") {
                cascadeIncludeWeekends = true;
              }
            } catch (e) { /* default false */ }

            // Calcular fechas en cascada: cada hito empieza donde termina el anterior
            let previousDueDate = new Date(input.dueDate);

            for (const subsequentMilestone of subsequentMilestones) {
              // Obtener la duración de este hito desde la plantilla
              const durationDays = durationByOrder.get(subsequentMilestone.orderIndex) || 7;

              // La nueva fecha = fecha del hito anterior + duración en días hábiles
              const newDueDate = addBizDays(previousDueDate, durationDays, cascadeIncludeWeekends);

              // Actualizar el hito con startDate, endDate y durationDays
              const milestoneStart = new Date(previousDueDate);
              const cascadeUpdate: any = {
                startDate: milestoneStart,
                endDate: newDueDate,
                durationDays: durationDays,
                dueDate: newDueDate,
              };
              // Si la nueva fecha es futura y el hito estaba overdue, revertir a pending
              if (newDueDate > nowCheck && subsequentMilestone.status === 'overdue') {
                cascadeUpdate.status = 'pending';
              }
              await db.updateMilestone(subsequentMilestone.id, cascadeUpdate);

              // Sincronizar con Google Calendar si existe eventId
              if (subsequentMilestone.googleCalendarEventId) {
                try {
                  const { updateCalendarEvent, toRFC3339, createEndDate } =
                    await import("./googleCalendarClient");

                  await updateCalendarEvent({
                    event_id: subsequentMilestone.googleCalendarEventId,
                    summary: `📅 ${project.name} - ${subsequentMilestone.name}`,
                    description:
                      subsequentMilestone.description || `Hito del proyecto ${project.name}`,
                    start_time: toRFC3339(newDueDate),
                    end_time: toRFC3339(createEndDate(newDueDate)),
                    location: project.location || undefined,
                    reminders: [1440, 60],
                  });
                } catch (calError) {
                  console.error(
                    `[Milestone Cascade] Error updating Google Calendar for milestone ${subsequentMilestone.id}:`,
                    calError
                  );
                }
              }

              cascadedCount++;
              previousDueDate = newDueDate;
            }

            if (cascadedCount > 0) {
              console.log(
                `[Milestone Cascade] Updated ${cascadedCount} subsequent milestones for project ${project.id}`
              );
            }
          } catch (cascadeError) {
            console.error("[Milestone Cascade] Error during cascade update:", cascadeError);
            // No fallar la actualización principal si falla la cascada
          }
        }

        return { success: true, cascadedCount };
      }),

    reorder: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          orderedIds: z.array(z.number()),
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

        // Solo admin, ingeniero asignado o ingeniero de trámites pueden reordenar
        if (
          ctx.user.role !== "admin" &&
          ctx.user.role !== "ingeniero_tramites" &&
          project.assignedEngineerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes permiso para reordenar hitos en este proyecto",
          });
        }

        await db.reorderMilestones(input.projectId, input.orderedIds);
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
  // COMENTARIOS DE HITOS (TRAZABILIDAD)
  // ============================================
  milestoneComments: router({
    /**
     * Listar comentarios de un hito con datos del autor
     */
    list: protectedProcedure
      .input(z.object({ milestoneId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMilestoneComments(input.milestoneId);
      }),

    /**
     * Agregar un comentario a un hito
     */
    add: protectedProcedure
      .input(z.object({
        milestoneId: z.number(),
        content: z.string().min(1, "El comentario no puede estar vacío"),
      }))
      .mutation(async ({ input, ctx }) => {
        const milestone = await db.getMilestoneById(input.milestoneId);
        if (!milestone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hito no encontrado",
          });
        }

        const commentId = await db.createMilestoneComment({
          milestoneId: input.milestoneId,
          userId: ctx.user.id,
          content: input.content,
        });

        return { success: true, commentId };
      }),

    /**
     * Eliminar un comentario (solo el autor o admin)
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const comment = await db.getMilestoneCommentById(input.id);
        if (!comment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Comentario no encontrado",
          });
        }

        // Solo el autor del comentario o un admin puede eliminarlo
        if (comment.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo puedes eliminar tus propios comentarios",
          });
        }

        await db.deleteMilestoneComment(input.id);
        return { success: true };
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

    // Obtener logs de webhooks recibidos
    webhookLogs: adminProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return await db.getWebhookLogs(input.limit);
      }),
  }),

  // ============================================
  // GENERACIÓN DE REPORTES PDF
  // ============================================
  reports: router({
    generateProjectPDF: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        includeGantt: z.boolean().optional().default(true),
        includeSchedule: z.boolean().optional().default(true),
      }))
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

        // Obtener comentarios de cada hito para trazabilidad
        const milestoneComments: Record<number, any[]> = {};
        for (const milestone of milestones) {
          try {
            const comments = await db.getMilestoneComments(milestone.id);
            if (comments && comments.length > 0) {
              milestoneComments[milestone.id] = comments;
            }
          } catch (e) {
            // Si falla, continuar sin comentarios
          }
        }

        const pdfBuffer = await generateProjectReport({
          project,
          milestones,
          projectType,
          assignedEngineer,
          milestoneComments,
          includeGantt: input.includeGantt,
          includeSchedule: input.includeSchedule,
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

        // Verificar permisos: admin, engineer e ingeniero_tramites pueden subir archivos
        // Todos los miembros del equipo pueden subir archivos a cualquier proyecto
        if (!ctx.user.role || !['admin', 'engineer', 'ingeniero_tramites', 'admin_financiero'].includes(ctx.user.role)) {
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

        // Verificar permisos: admin, engineer, ingeniero_tramites y admin_financiero pueden ver archivos
        if (!ctx.user.role || !['admin', 'engineer', 'ingeniero_tramites', 'admin_financiero'].includes(ctx.user.role)) {
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

    // Obtener configuración de días hábiles (incluir fines de semana)
    getIncludeWeekends: protectedProcedure.query(async () => {
      try {
        const dbInst = await db.getDb();
        if (!dbInst) return { includeWeekends: false };
        const result = await dbInst
          .select()
          .from(appSettings)
          .where(eq(appSettings.settingKey, "include_weekends"))
          .limit(1);
        return { includeWeekends: result.length > 0 && result[0].settingValue === "true" };
      } catch {
        return { includeWeekends: false };
      }
    }),

    // Configurar si se incluyen fines de semana en el cálculo de duración de hitos
    setIncludeWeekends: adminProcedure
      .input(z.object({ includeWeekends: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await dbInst
          .insert(appSettings)
          .values({
            settingKey: "include_weekends",
            settingValue: input.includeWeekends ? "true" : "false",
            description: "Incluir fines de semana en el cálculo de duración de hitos",
            updatedBy: ctx.user.id,
          })
          .onDuplicateKeyUpdate({
            set: {
              settingValue: input.includeWeekends ? "true" : "false",
              updatedBy: ctx.user.id,
            },
          });
        return { success: true, includeWeekends: input.includeWeekends };
      }),

    // Obtener configuración SSO (callback URL + secret para compartir)
    getSsoConfig: adminProcedure.query(async () => {
      try {
        const dbInst = await db.getDb();
        if (!dbInst) return { callbackUrl: "", ssoSecret: "", ssoSecretConfigured: false };
        
        const [callbackRow] = await dbInst
          .select()
          .from(appSettings)
          .where(eq(appSettings.settingKey, "sso_callback_url"))
          .limit(1);
        const [secretRow] = await dbInst
          .select()
          .from(appSettings)
          .where(eq(appSettings.settingKey, "crm_sso_secret"))
          .limit(1);
        
        // También verificar si hay env variable configurada
        const envSecret = process.env.CRM_SSO_SECRET || process.env.SSO_SECRET || "";
        const storedSecret = secretRow?.settingValue || "";
        const effectiveSecret = storedSecret || envSecret;
        
        return {
          callbackUrl: callbackRow?.settingValue || "https://spm.ghp.center/api/sso/callback",
          ssoSecret: effectiveSecret,
          ssoSecretPreview: effectiveSecret ? `${effectiveSecret.substring(0, 12)}...${effectiveSecret.substring(effectiveSecret.length - 4)}` : "",
          ssoSecretConfigured: !!effectiveSecret,
          source: storedSecret ? "database" : (envSecret ? "env" : "none"),
        };
      } catch {
        return { callbackUrl: "https://spm.ghp.center/api/sso/callback", ssoSecret: "", ssoSecretConfigured: false, ssoSecretPreview: "", source: "none" };
      }
    }),

    // Guardar configuración SSO (callback URL + secret)
    setSsoConfig: adminProcedure
      .input(z.object({
        callbackUrl: z.string().optional(),
        ssoSecret: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        if (input.callbackUrl !== undefined) {
          await dbInst
            .insert(appSettings)
            .values({
              settingKey: "sso_callback_url",
              settingValue: input.callbackUrl,
              description: "URL de callback SSO para recibir tokens del Hub",
              updatedBy: ctx.user.id,
            })
            .onDuplicateKeyUpdate({
              set: {
                settingValue: input.callbackUrl,
                updatedBy: ctx.user.id,
              },
            });
        }

        if (input.ssoSecret !== undefined && input.ssoSecret.length > 0) {
          await dbInst
            .insert(appSettings)
            .values({
              settingKey: "crm_sso_secret",
              settingValue: input.ssoSecret,
              description: "Secret compartido con el Hub GHP para verificar tokens JWT de SSO",
              updatedBy: ctx.user.id,
            })
            .onDuplicateKeyUpdate({
              set: {
                settingValue: input.ssoSecret,
                updatedBy: ctx.user.id,
              },
            });
        }

        return { success: true };
      }),
  }),

  // ==========================================
  // Documentos Dinámicos
  // ==========================================
  dynamicDocuments: router({
    // Listar plantillas dinámicas
    listTemplates: tramitesProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getDynamicDocTemplates(input || {});
      }),

    // Obtener plantilla con sus campos
    getTemplate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await db.getDynamicDocTemplateById(input.id);
        if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });
        const fields = await db.getDynamicDocFieldsByTemplateId(input.id);
        return { ...template, fields };
      }),

    // Parsear documento Word: extraer HTML y detectar marcadores {{...}}
    parseDocument: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await db.getDynamicDocTemplateById(input.id);
        if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });

        try {
          // Download the file from S3
          const response = await fetch(template.fileUrl);
          if (!response.ok) throw new Error("No se pudo descargar el archivo");
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Convert docx to HTML using mammoth
          const mammoth = await import("mammoth");
          const result = await mammoth.default.convertToHtml({ buffer });
          const html = result.value;

          // Extract raw text for marker detection
          const textResult = await mammoth.default.extractRawText({ buffer });
          const rawText = textResult.value;

          // Detect all {{...}} markers in the document
          const markerRegex = /\{\{([^}]+)\}\}/g;
          const markers: string[] = [];
          let match;
          while ((match = markerRegex.exec(rawText)) !== null) {
            const key = match[1].trim();
            if (!markers.includes(key)) {
              markers.push(key);
            }
          }

          return {
            html,
            rawText,
            markers,
            warnings: result.messages.map((m: any) => m.message),
          };
        } catch (err: any) {
          console.error("[parseDocument] Error:", err.message);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error al parsear el documento Word: " + err.message,
          });
        }
      }),

    // Crear plantilla dinámica (subir archivo Word)
    createTemplate: tramitesProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        fileName: z.string(),
        fileKey: z.string(),
        fileData: z.string(), // base64
        fileSize: z.number(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { fileData, fileKey: rawFileKey, ...rest } = input;
        // Sanitize file key: remove spaces and special chars
        const fileKey = rawFileKey.replace(/\s+/g, '_');
        const buffer = Buffer.from(fileData, "base64");
        
        // Upload to S3
        const { storagePut } = await import("./storage");
        let url: string;
        try {
          const result = await storagePut(fileKey, buffer, input.mimeType);
          url = result.url;
        } catch (err: any) {
          console.error('[createTemplate] S3 upload error:', err.message);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al subir el archivo. Intenta de nuevo." });
        }

        // Save to database
        try {
          const templateId = await db.createDynamicDocTemplate({
            ...rest,
            fileKey,
            fileUrl: url,
            uploadedBy: ctx.user.id,
          });
          return { success: true, templateId };
        } catch (err: any) {
          console.error('[createTemplate] DB insert error:', err.message);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al guardar la plantilla en la base de datos. Intenta de nuevo." });
        }
      }),

    // Actualizar plantilla
    updateTemplate: tramitesProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDynamicDocTemplate(id, data);
        return { success: true };
      }),

    // Eliminar plantilla (soft delete)
    deleteTemplate: tramitesProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDynamicDocTemplate(input.id);
        return { success: true };
      }),

    // ---- Campos dinámicos ----

    // Obtener campos de una plantilla
    getFields: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDynamicDocFieldsByTemplateId(input.templateId);
      }),

    // Crear campo dinámico
    createField: tramitesProcedure
      .input(z.object({
        templateId: z.number(),
        fieldKey: z.string().min(1),
        fieldLabel: z.string().min(1),
        fieldType: z.enum(["text", "number", "date", "select", "project"]).default("text"),
        options: z.string().optional(), // JSON array
        projectMapping: z.string().optional(),
        defaultValue: z.string().optional(),
        orderIndex: z.number().default(0),
        isRequired: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const fieldId = await db.createDynamicDocField(input);
        return { success: true, fieldId };
      }),

    // Actualizar campo dinámico
    updateField: tramitesProcedure
      .input(z.object({
        id: z.number(),
        fieldKey: z.string().optional(),
        fieldLabel: z.string().optional(),
        fieldType: z.enum(["text", "number", "date", "select", "project"]).optional(),
        options: z.string().optional(),
        projectMapping: z.string().optional(),
        defaultValue: z.string().optional(),
        orderIndex: z.number().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDynamicDocField(id, data);
        return { success: true };
      }),

    // Eliminar campo dinámico
    deleteField: tramitesProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDynamicDocField(input.id);
        return { success: true };
      }),

    // Guardar todos los campos de una plantilla de golpe (reemplaza los existentes)
    saveFields: tramitesProcedure
      .input(z.object({
        templateId: z.number(),
        fields: z.array(z.object({
          fieldKey: z.string().min(1),
          fieldLabel: z.string().min(1),
          fieldType: z.enum(["text", "number", "date", "select", "project"]).default("text"),
          options: z.string().optional(),
          projectMapping: z.string().optional(),
          defaultValue: z.string().optional(),
          orderIndex: z.number().default(0),
          isRequired: z.boolean().default(true),
        })),
      }))
      .mutation(async ({ input }) => {
        // Eliminar campos existentes
        await db.deleteAllDynamicDocFieldsByTemplate(input.templateId);
        // Crear nuevos campos
        for (const field of input.fields) {
          await db.createDynamicDocField({
            templateId: input.templateId,
            ...field,
          });
        }
        return { success: true };
      }),

    // ---- Generación de documentos ----

    // Generar documento dinámico a partir de plantilla Word
    generateDocument: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        projectId: z.number(),
        fieldValues: z.record(z.string(), z.string()),
      }))
      .mutation(async ({ input, ctx }) => {
        const template = await db.getDynamicDocTemplateById(input.templateId);
        if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Plantilla no encontrada" });

        // Descargar la plantilla Word desde S3
        const response = await fetch(template.fileUrl);
        if (!response.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo descargar la plantilla" });
        const templateBuffer = Buffer.from(await response.arrayBuffer());

        // Procesar el documento Word con docx-templates
        const { createReport } = await import("docx-templates");
        const generatedBuffer = await createReport({
          template: templateBuffer,
          data: input.fieldValues,
          cmdDelimiter: ["{{", "}}"],
        });

        // Convertir el documento Word generado a PDF usando LibreOffice
        const { storagePut } = await import("./storage");
        const timestamp = Date.now();
        let finalBuffer: Buffer;
        let outputFileName: string;
        let mimeType: string;

        try {
          const libre = await import("libreoffice-convert");
          const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
            libre.convert(Buffer.from(generatedBuffer), ".pdf", undefined, (err: Error | null, result: Buffer) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
          finalBuffer = pdfBuffer;
          outputFileName = `${template.name.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.pdf`;
          mimeType = "application/pdf";
        } catch (conversionError) {
          // Fallback: si LibreOffice no está disponible, guardar como Word
          console.warn("LibreOffice no disponible, guardando como Word:", conversionError);
          finalBuffer = Buffer.from(generatedBuffer);
          outputFileName = `${template.name.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.docx`;
          mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }

        const fileKey = `dynamic-docs/generated/${input.projectId}/${outputFileName}`;
        const { url } = await storagePut(fileKey, finalBuffer, mimeType);

        // Guardar registro en BD
        const docId = await db.createGeneratedDoc({
          projectId: input.projectId,
          templateId: input.templateId,
          fileName: outputFileName,
          fileKey,
          fileUrl: url,
          fileSize: finalBuffer.byteLength,
          fieldValues: JSON.stringify(input.fieldValues),
          generatedBy: ctx.user.id,
        });

        return { success: true, docId, fileUrl: url, fileName: outputFileName };
      }),

    // Listar documentos generados por proyecto
    getGeneratedDocs: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getGeneratedDocsByProjectId(input.projectId);
      }),

    // Eliminar documento generado
    deleteGeneratedDoc: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGeneratedDoc(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // GESTIÓN DE API KEYS (ADMIN)
  // ============================================
  apiKeyManagement: router({
    // Listar API Keys
    list: adminProcedure.query(async () => {
      const dbInst = await db.getDb();
      if (!dbInst) return [];
      const keys = await dbInst.select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        permissions: apiKeys.permissions,
        isActive: apiKeys.isActive,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      }).from(apiKeys).orderBy(desc(apiKeys.createdAt));
      return keys.map(k => ({
        ...k,
        permissions: k.permissions ? JSON.parse(k.permissions) : ["*"],
        keyPreview: `${k.prefix}...`
      }));
    }),

    // Generar nueva API Key
    generate: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        permissions: z.array(z.string()).default(["*"]),
        expiresInDays: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

        try {
          const rawKey = `spm_${crypto.randomBytes(32).toString("hex")}`;
          const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
          const prefix = rawKey.substring(0, 8);

          // Calcular expiración como string ISO para MySQL
          let expiresAtStr: string | null = null;
          if (input.expiresInDays && input.expiresInDays > 0) {
            const expiresDate = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
            expiresAtStr = expiresDate.toISOString().slice(0, 19).replace('T', ' ');
          }

          // Asegurar que userId sea un número entero
          const userId = typeof ctx.user.id === "string" ? parseInt(ctx.user.id, 10) : ctx.user.id;
          const permissionsJson = JSON.stringify(input.permissions);

          // Escapar valores para SQL raw - evita TODOS los problemas de Drizzle ORM con params
          const escapeSql = (val: string) => val.replace(/'/g, "''").replace(/\\/g, "\\\\");
          const nameEsc = escapeSql(input.name);
          const keyEsc = escapeSql(keyHash);
          const prefixEsc = escapeSql(prefix);
          const permEsc = escapeSql(permissionsJson);
          const expiresClause = expiresAtStr ? `'${expiresAtStr}'` : 'NULL';

          const insertQuery = `INSERT INTO api_keys (name, keyHash, prefix, userId, permissions, isActive, expiresAt, createdAt, updatedAt) VALUES ('${nameEsc}', '${keyEsc}', '${prefixEsc}', ${userId}, '${permEsc}', 1, ${expiresClause}, NOW(), NOW())`;
          
          await dbInst.execute(sql.raw(insertQuery));

          return {
            key: rawKey,
            prefix,
            name: input.name,
            permissions: input.permissions,
            expiresAt: expiresAtStr || null,
          };
        } catch (error: any) {
          console.error("[API Key Generate] Error:", error?.message || error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Error al generar API Key: ${error?.message || "Error desconocido"}`,
          });
        }
      }),

    // Desactivar API Key
    deactivate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
        await dbInst.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, input.id));
        return { success: true };
      }),

    // Reactivar API Key
    activate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
        await dbInst.update(apiKeys).set({ isActive: true }).where(eq(apiKeys.id, input.id));
        return { success: true };
      }),

    // Eliminar API Key permanentemente
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
        await dbInst.delete(apiKeys).where(eq(apiKeys.id, input.id));
        return { success: true };
      }),
  }),

  // ============================================
  // GESTIÓN DE WEBHOOKS (ADMIN)
  // ============================================
  ssoManagement: ssoManagementRouter,

  webhookManagement: router({
    // Listar webhooks
    list: adminProcedure.query(async () => {
      const dbInst = await db.getDb();
      if (!dbInst) return [];
      const whs = await dbInst.select().from(webhooks).orderBy(desc(webhooks.createdAt));
      return whs.map(({ secretKey, eventTypes, ...wh }) => ({
        ...wh,
        events: JSON.parse(eventTypes) as string[],
      }));
    }),

    // Crear webhook
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        url: z.string().url(),
        events: z.array(z.string()).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

        const secret = crypto.randomBytes(32).toString("hex");

        await dbInst.insert(webhooks).values({
          name: input.name,
          url: input.url,
          secretKey: secret,
          eventTypes: JSON.stringify(input.events),
          userId: ctx.user.id,
        });

        return { success: true, secret };
      }),

    // Actualizar webhook
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        url: z.string().url().optional(),
        events: z.array(z.string()).min(1).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.url) updateData.url = input.url;
        if (input.events) updateData.eventTypes = JSON.stringify(input.events);
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        await dbInst.update(webhooks).set(updateData).where(eq(webhooks.id, input.id));
        return { success: true };
      }),

    // Eliminar webhook
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
        await dbInst.delete(webhooks).where(eq(webhooks.id, input.id));
        return { success: true };
      }),

    // Obtener logs de un webhook
    logs: adminProcedure
      .input(z.object({ webhookId: z.number().optional(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) return [];
        if (input.webhookId) {
          return dbInst.select().from(outgoingWebhookLogs).where(eq(outgoingWebhookLogs.webhookId, input.webhookId)).orderBy(desc(outgoingWebhookLogs.createdAt)).limit(input.limit);
        }
        return dbInst.select().from(outgoingWebhookLogs).orderBy(desc(outgoingWebhookLogs.createdAt)).limit(input.limit);
      }),

    // Test webhook (enviar ping)
    test: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

        const [wh] = await dbInst.select().from(webhooks).where(eq(webhooks.id, input.id));
        if (!wh) throw new TRPCError({ code: "NOT_FOUND", message: "Webhook no encontrado" });

        const payload = JSON.stringify({
          event: "test.ping",
          timestamp: new Date().toISOString(),
          data: { message: "Test ping from Solar Project Manager" },
        });

        const signature = crypto.createHmac("sha256", wh.secretKey).update(payload).digest("hex");

        try {
          const response = await fetch(wh.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": `sha256=${signature}`,
              "X-Webhook-Event": "test.ping",
              "User-Agent": "SolarProjectManager/1.0",
            },
            body: payload,
          });

          await dbInst.insert(outgoingWebhookLogs).values({
            webhookId: wh.id,
            event: "test.ping",
            payload,
            responseStatus: response.status,
            responseBody: (await response.text()).substring(0, 500),
            success: response.ok,
            duration: 0,
          });

          return { success: response.ok, status: response.status };
        } catch (err: any) {
          await dbInst.insert(outgoingWebhookLogs).values({
            webhookId: wh.id,
            event: "test.ping",
            payload,
            success: false,
            error: err.message,
            duration: 0,
          });
          return { success: false, error: err.message };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
