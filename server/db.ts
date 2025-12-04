import { eq, and, or, desc, asc, sql, gte, lte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  projects,
  projectTypes,
  milestones,
  milestoneTemplates,
  reminders,
  projectAttachments,
  InsertProjectAttachment,
  syncLogs,
  notificationSettings,
  notificationHistory,
  projectUpdates,
  InsertProject,
  InsertProjectType,
  InsertMilestone,
  InsertMilestoneTemplate,
  InsertReminder,
  InsertSyncLog,
  InsertProjectUpdate,
  cadTemplates,
  commonDocuments,
  projectLegalizationChecklist,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================
// GESTIÓN DE USUARIOS
// ============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    // Asignar rol de admin al propietario y usuario maestro, engineer por defecto a otros
    if (
      user.email === "greenhproject@gmail.com" ||
      user.openId === ENV.ownerOpenId
    ) {
      // Usuario maestro siempre es admin
      values.role = "admin";
      updateSet.role = "admin";
    } else if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else {
      // Por defecto, nuevos usuarios son ingenieros
      values.role = "engineer";
      updateSet.role = "engineer";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// GESTIÓN DE TIPOS DE PROYECTO
// ============================================

export async function createProjectType(data: InsertProjectType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectTypes).values(data);
  return result;
}

export async function getAllProjectTypes() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(projectTypes)
    .where(eq(projectTypes.isActive, true))
    .orderBy(asc(projectTypes.name));
}

export async function getProjectTypeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projectTypes)
    .where(eq(projectTypes.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProjectType(
  id: number,
  data: Partial<InsertProjectType>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectTypes).set(data).where(eq(projectTypes.id, id));
}

// ============================================
// GESTIÓN DE PROYECTOS
// ============================================

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(data);
  return result;
}

export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getActiveProjects() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(projects)
    .where(eq(projects.status, "in_progress"))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectsByEngineerId(engineerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(projects)
    .where(eq(projects.assignedEngineerId, engineerId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectsWithAssignedMilestones(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Obtener IDs de proyectos que tienen hitos asignados al usuario
  const projectIds = await db
    .selectDistinct({ projectId: milestones.projectId })
    .from(milestones)
    .where(eq(milestones.assignedUserId, userId));
  
  if (projectIds.length === 0) return [];
  
  // Obtener los proyectos completos
  const projectIdList = projectIds.map(p => p.projectId);
  return await db
    .select()
    .from(projects)
    .where(inArray(projects.id, projectIdList))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function userHasAssignedMilestonesInProject(
  userId: number,
  projectId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(and(
      eq(milestones.projectId, projectId),
      eq(milestones.assignedUserId, userId)
    ))
    .limit(1);
  
  return result.length > 0;
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Eliminar proyecto (las foreign keys con ON DELETE CASCADE eliminarán automáticamente
  // los hitos, archivos, actualizaciones, etc. relacionados)
  await db.delete(projects).where(eq(projects.id, id));
}

export async function getProjectStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, completed: 0, overdue: 0 };

  const now = new Date();
  const allProjects = await db.select().from(projects);

  return {
    total: allProjects.length,
    active: allProjects.filter(p => p.status === "in_progress").length,
    completed: allProjects.filter(p => p.status === "completed").length,
    overdue: allProjects.filter(
      p =>
        p.status !== "completed" &&
        p.status !== "cancelled" &&
        p.estimatedEndDate < now
    ).length,
  };
}

// ============================================
// GESTIÓN DE PLANTILLAS DE HITOS
// ============================================

export async function createMilestoneTemplate(data: InsertMilestoneTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(milestoneTemplates).values(data);
  return result;
}

export async function getMilestoneTemplatesByProjectType(
  projectTypeId: number
) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(milestoneTemplates)
    .where(
      and(
        eq(milestoneTemplates.projectTypeId, projectTypeId),
        eq(milestoneTemplates.isActive, true)
      )
    )
    .orderBy(asc(milestoneTemplates.orderIndex));
}

export async function getAllMilestoneTemplates() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(milestoneTemplates)
    .orderBy(
      asc(milestoneTemplates.projectTypeId),
      asc(milestoneTemplates.orderIndex)
    );
}

export async function updateMilestoneTemplate(
  id: number,
  data: Partial<InsertMilestoneTemplate>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(milestoneTemplates)
    .set(data)
    .where(eq(milestoneTemplates.id, id));
}

export async function deleteMilestoneTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(milestoneTemplates)
    .set({ isActive: false })
    .where(eq(milestoneTemplates.id, id));
}

// ============================================
// GESTIÓN DE HITOS
// ============================================

export async function createMilestone(data: InsertMilestone) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(milestones).values(data);
  return result;
}

export async function getMilestoneById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(milestones)
    .where(eq(milestones.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getMilestonesByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.orderIndex));
}

export async function getAllMilestones() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(milestones).orderBy(asc(milestones.dueDate));
}

export async function updateMilestone(
  id: number,
  data: Partial<InsertMilestone>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(milestones).set(data).where(eq(milestones.id, id));
}

export async function getOverdueMilestones() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();

  return await db
    .select({
      milestoneId: milestones.id,
      milestoneName: milestones.name,
      dueDate: milestones.dueDate,
      status: milestones.status,
      description: milestones.description,
      projectId: projects.id,
      projectName: projects.name,
      projectLocation: projects.location,
      assignedEngineerId: projects.assignedEngineerId,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(
      and(
        lte(milestones.dueDate, now),
        or(
          eq(milestones.status, "pending"),
          eq(milestones.status, "in_progress")
        )
      )
    )
    .orderBy(asc(milestones.dueDate));
}

export async function getUpcomingMilestones(daysAhead: number = 7) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return await db
    .select({
      milestoneId: milestones.id,
      milestoneName: milestones.name,
      dueDate: milestones.dueDate,
      status: milestones.status,
      description: milestones.description,
      projectId: projects.id,
      projectName: projects.name,
      projectLocation: projects.location,
      assignedEngineerId: projects.assignedEngineerId,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(
      and(
        gte(milestones.dueDate, now),
        lte(milestones.dueDate, futureDate),
        or(
          eq(milestones.status, "pending"),
          eq(milestones.status, "in_progress")
        )
      )
    )
    .orderBy(asc(milestones.dueDate));
}

// ============================================
// GESTIÓN DE RECORDATORIOS
// ============================================

export async function createReminder(data: InsertReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reminders).values(data);
  return result;
}

export async function getRemindersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, userId))
    .orderBy(desc(reminders.reminderDate));
}

export async function getUnreadRemindersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.isRead, false)))
    .orderBy(asc(reminders.reminderDate));
}

export async function markReminderAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reminders).set({ isRead: true }).where(eq(reminders.id, id));
}

// ============================================
// GESTIÓN DE LOGS DE SINCRONIZACIÓN
// ============================================

export async function createSyncLog(data: InsertSyncLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(syncLogs).values(data);
  return result;
}

export async function getSyncLogsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(syncLogs)
    .where(eq(syncLogs.projectId, projectId))
    .orderBy(desc(syncLogs.syncedAt));
}

export async function getRecentSyncLogs(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(syncLogs)
    .orderBy(desc(syncLogs.syncedAt))
    .limit(limit);
}

// ============================================
// GESTIÓN DE ACTUALIZACIONES DE PROYECTO
// ============================================

export async function createProjectUpdate(data: InsertProjectUpdate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectUpdates).values(data);
  return result;
}

export async function getProjectUpdatesByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(projectUpdates)
    .where(eq(projectUpdates.projectId, projectId))
    .orderBy(desc(projectUpdates.createdAt));
}

// ============================================
// GESTIÓN AVANZADA DE USUARIOS
// ============================================

export async function updateUserRole(
  userId: number,
  role: "admin" | "engineer" | "ingeniero_tramites"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, userId));
}

// ==================== MÉTRICAS AVANZADAS ====================

/**
 * Obtiene métricas mensuales de proyectos para gráficos temporales
 */
export async function getMonthlyMetrics(months: number = 12) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      DATE_FORMAT(createdAt, '%Y-%m') as month,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    FROM projects
    WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
    GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
    ORDER BY month ASC
  `);

  // Drizzle devuelve [[data], [metadata]], necesitamos el primer elemento
  const rows = result as unknown as any[];
  return rows[0] as Array<{
    month: string;
    total: number;
    completed: number;
    in_progress: number;
    cancelled: number;
  }>;
}

/**
 * Calcula el tiempo promedio de ejecución de proyectos completados
 */
export async function getAverageCompletionTime() {
  const db = await getDb();
  if (!db) return { avgDays: 0, totalCompleted: 0 };

  const result = await db.execute(sql`
    SELECT 
      AVG(DATEDIFF(updatedAt, startDate)) as avgDays,
      COUNT(*) as totalCompleted
    FROM projects
    WHERE status = 'completed' AND startDate IS NOT NULL
  `);

  // Drizzle devuelve [[data], [metadata]], necesitamos el primer elemento del primer array
  const rows = result as unknown as any[];
  const dataRows = rows[0]; // Primer elemento es el array de datos
  const row = dataRows[0]; // Primer fila de datos

  const avgDays = row?.avgDays ? Math.round(Number(row.avgDays)) : 0;
  const totalCompleted = Number(row?.totalCompleted) || 0;

  return { avgDays, totalCompleted };
}

/**
 * Obtiene distribución de proyectos por tipo
 */
export async function getProjectDistributionByType() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.execute(sql`
    SELECT 
      pt.name as typeName,
      pt.color as color,
      COUNT(p.id) as count
    FROM project_types pt
    LEFT JOIN projects p ON p.projectTypeId = pt.id
    WHERE pt.isActive = 1
    GROUP BY pt.id, pt.name, pt.color
    ORDER BY count DESC
  `);

  // Drizzle devuelve [[data], [metadata]], necesitamos el primer elemento
  const rows = result as unknown as any[];
  return rows[0] as Array<{
    typeName: string;
    color: string;
    count: number;
  }>;
}

/**
 * Calcula tasa de completación de proyectos
 */
export async function getCompletionRate() {
  const db = await getDb();
  if (!db) return { rate: 0, completed: 0, total: 0 };

  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM projects
  `);

  // Drizzle devuelve [[data], [metadata]], necesitamos el primer elemento del primer array
  const rows = result as unknown as any[];
  const dataRows = rows[0]; // Primer elemento es el array de datos
  const row = dataRows[0]; // Primer fila de datos

  const total = Number(row?.total) || 0;
  const completed = Number(row?.completed) || 0;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { rate, completed, total };
}

// ==================== ARCHIVOS ADJUNTOS ====================

/**
 * Crear un archivo adjunto
 */
export async function createProjectAttachment(data: InsertProjectAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(projectAttachments).values(data);
  return result.insertId;
}

/**
 * Obtener archivos adjuntos de un proyecto
 */
export async function getProjectAttachments(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(projectAttachments)
    .where(eq(projectAttachments.projectId, projectId))
    .orderBy(desc(projectAttachments.createdAt));
}

/**
 * Eliminar un archivo adjunto
 */
export async function deleteProjectAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(projectAttachments).where(eq(projectAttachments.id, id));
}

/**
 * Obtener un archivo adjunto por ID
 */
export async function getProjectAttachmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(projectAttachments)
    .where(eq(projectAttachments.id, id))
    .limit(1);

  return result[0];
}

// ==================== NOTIFICACIONES ====================



/**
 * Obtener proyectos con retraso
 */
export async function getDelayedProjects() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();

  const results = await db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      assignedEngineerId: projects.assignedEngineerId,
      estimatedEndDate: projects.estimatedEndDate,
    })
    .from(projects)
    .where(
      and(
        eq(projects.status, "in_progress"),
        lte(projects.estimatedEndDate, now)
      )
    );

  return results;
}

/**
 * Guardar configuración de notificaciones de usuario
 */
export async function saveNotificationSettings(
  userId: number,
  settings: {
    enableMilestoneReminders: boolean;
    enableDelayAlerts: boolean;
    enableAIAlerts: boolean;
    milestoneReminderDays?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(notificationSettings)
    .values({
      userId,
      ...settings,
    })
    .onDuplicateKeyUpdate({
      set: {
        enableMilestoneReminders: settings.enableMilestoneReminders,
        enableDelayAlerts: settings.enableDelayAlerts,
        enableAIAlerts: settings.enableAIAlerts,
        ...(settings.milestoneReminderDays !== undefined && {
          milestoneReminderDays: settings.milestoneReminderDays,
        }),
      },
    });
}

/**
 * Obtener configuración de notificaciones de usuario
 */
export async function getNotificationSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * Registrar notificación enviada
 */
export async function logNotification(data: {
  userId: number;
  type:
    | "milestone_due_soon"
    | "milestone_overdue"
    | "project_completed"
    | "project_assigned"
    | "project_updated"
    | "milestone_reminder"
    | "delay"
    | "ai_alert"
    | "general";
  title: string;
  message: string;
  projectId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(notificationHistory).values(data);
}

/**
 * Obtener notificaciones de un usuario
 */
export async function getUserNotifications(
  userId: number,
  limit: number = 50,
  unreadOnly: boolean = false
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(notificationHistory.userId, userId)];

  if (unreadOnly) {
    conditions.push(eq(notificationHistory.isRead, false));
  }

  const results = await db
    .select()
    .from(notificationHistory)
    .where(and(...conditions))
    .orderBy(desc(notificationHistory.sentAt))
    .limit(limit);

  return results;
}

/**
 * Obtener una notificación por ID
 */
export async function getNotificationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(notificationHistory)
    .where(eq(notificationHistory.id, id))
    .limit(1);

  return results[0] || null;
}

/**
 * Marcar notificación como leída
 */
export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notificationHistory)
    .set({ isRead: true })
    .where(eq(notificationHistory.id, id));
}

/**
 * Marcar todas las notificaciones de un usuario como leídas
 */
export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notificationHistory)
    .set({ isRead: true })
    .where(eq(notificationHistory.userId, userId));
}

/**
 * Eliminar notificación
 */
export async function deleteNotification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(notificationHistory).where(eq(notificationHistory.id, id));
}

/**
 * Actualizar perfil de usuario
 */
export async function updateUserProfile(
  userId: number,
  data: {
    name?: string;
    email?: string;
    avatarUrl?: string;
    theme?: "light" | "dark" | "system";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.theme !== undefined) updateData.theme = data.theme;

  await db.update(users).set(updateData).where(eq(users.id, userId));

  // Retornar usuario actualizado
  const updated = await getUserById(userId);
  return updated;
}

/**
 * Obtener usuario por email
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] || null;
}

/**
 * Obtener configuración de notificaciones de un usuario
 */
export async function getUserNotificationSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);

  // Si no existe, crear configuración por defecto
  if (!result[0]) {
    await db.insert(notificationSettings).values({
      userId,
      enablePushNotifications: true,
      enableMilestoneReminders: true,
      enableDelayAlerts: true,
      enableAIAlerts: true,
      milestoneReminderDays: 3,
    });

    const newResult = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId))
      .limit(1);

    return newResult[0] || null;
  }

  return result[0];
}

/**
 * Actualizar configuración de notificaciones
 */
export async function updateNotificationSettings(
  userId: number,
  data: {
    enablePushNotifications?: boolean;
    enableMilestoneReminders?: boolean;
    enableDelayAlerts?: boolean;
    enableAIAlerts?: boolean;
    milestoneReminderDays?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Asegurar que existe la configuración
  await getUserNotificationSettings(userId);

  await db
    .update(notificationSettings)
    .set(data)
    .where(eq(notificationSettings.userId, userId));

  return await getUserNotificationSettings(userId);
}

/**
 * Cambiar contraseña de usuario JWT
 */
export async function changeUserPassword(
  userId: number,
  currentPassword: string,
  newPassword: string
) {
  const bcrypt = await import("bcryptjs");
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obtener usuario
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // Verificar que es usuario JWT (no OAuth)
  if (user.loginMethod !== "jwt") {
    throw new Error(
      "Solo los usuarios con autenticación JWT pueden cambiar su contraseña"
    );
  }

  // Verificar contraseña actual
  if (!user.password) {
    throw new Error("Usuario no tiene contraseña configurada");
  }

  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) {
    throw new Error("La contraseña actual es incorrecta");
  }

  // Hash de la nueva contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Actualizar contraseña
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));

  return { success: true };
}

// ============================================
// NOTIFICACIONES AUTOMÁTICAS
// ============================================

/**
 * Crear notificación automática para hito próximo
 */
export async function createMilestoneDueSoonNotification(
  userId: number,
  milestoneId: number,
  projectId: number,
  milestoneName: string,
  projectName: string,
  dueDate: Date
) {
  const hoursUntilDue = Math.floor(
    (dueDate.getTime() - Date.now()) / (1000 * 60 * 60)
  );

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(notificationHistory).values({
    userId,
    type: "milestone_due_soon",
    title: `Hito próximo a vencer: ${milestoneName}`,
    message: `El hito "${milestoneName}" del proyecto "${projectName}" vence en ${hoursUntilDue} horas.`,
    projectId: projectId,
    isRead: false,
  });
}

/**
 * Crear notificación automática para hito vencido
 */
export async function createMilestoneOverdueNotification(
  userId: number,
  milestoneId: number,
  projectId: number,
  milestoneName: string,
  projectName: string,
  dueDate: Date
) {
  const hoursOverdue = Math.floor(
    (Date.now() - dueDate.getTime()) / (1000 * 60 * 60)
  );

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(notificationHistory).values({
    userId,
    type: "milestone_overdue",
    title: `Hito vencido: ${milestoneName}`,
    message: `El hito "${milestoneName}" del proyecto "${projectName}" está vencido por ${hoursOverdue} horas.`,
    projectId: projectId,
    isRead: false,
  });
}

/**
 * Update user password (for password reset)
 */
export async function updateUserPassword(
  userId: number,
  hashedPassword: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));

  return true;
}


// ============================================
// MÓDULO TRÁMITES Y DISEÑO
// ============================================

/**
 * Obtener todas las plantillas CAD con filtros opcionales
 */
export async function getCadTemplates(filters?: {
  marcaInversor?: string;
  potenciaInversor?: string;
  operadorRed?: string;
  cantidadPaneles?: number;
  potenciaPaneles?: string;
  marcaPaneles?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query = db.select().from(cadTemplates);
  
  const conditions: any[] = [];
  
  if (filters?.marcaInversor) {
    conditions.push(eq(cadTemplates.marcaInversor, filters.marcaInversor));
  }
  if (filters?.potenciaInversor) {
    conditions.push(eq(cadTemplates.potenciaInversor, filters.potenciaInversor));
  }
  if (filters?.operadorRed) {
    conditions.push(eq(cadTemplates.operadorRed, filters.operadorRed));
  }
  if (filters?.cantidadPaneles) {
    conditions.push(eq(cadTemplates.cantidadPaneles, filters.cantidadPaneles));
  }
  if (filters?.potenciaPaneles) {
    conditions.push(eq(cadTemplates.potenciaPaneles, filters.potenciaPaneles));
  }
  if (filters?.marcaPaneles) {
    conditions.push(eq(cadTemplates.marcaPaneles, filters.marcaPaneles));
  }
  
  if (conditions.length > 0) {
    const results = await db
      .select()
      .from(cadTemplates)
      .where(and(...conditions))
      .orderBy(desc(cadTemplates.createdAt));
    return results;
  }
  
  const results = await db
    .select()
    .from(cadTemplates)
    .orderBy(desc(cadTemplates.createdAt));
  return results;
}

/**
 * Crear plantilla CAD
 */
export async function createCadTemplate(data: {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  marcaInversor: string;
  modeloInversor?: string;
  potenciaInversor?: string;
  operadorRed?: string;
  cantidadPaneles?: number;
  potenciaPaneles?: string;
  marcaPaneles?: string;
  descripcion?: string;
  tags?: string;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(cadTemplates).values(data);
  return result;
}

/**
 * Eliminar plantilla CAD
 */
export async function deleteCadTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(cadTemplates).where(eq(cadTemplates.id, id));
}

/**
 * Obtener documentos comunes con filtros
 */
export async function getCommonDocuments(filters?: {
  tipo?: string;
  marca?: string;
  modelo?: string;
  potencia?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions: any[] = [];
  
  if (filters?.tipo) {
    conditions.push(eq(commonDocuments.tipo, filters.tipo as any));
  }
  if (filters?.marca) {
    conditions.push(eq(commonDocuments.marca, filters.marca));
  }
  if (filters?.modelo) {
    conditions.push(eq(commonDocuments.modelo, filters.modelo));
  }
  if (filters?.potencia) {
    conditions.push(eq(commonDocuments.potencia, filters.potencia));
  }
  
  if (conditions.length > 0) {
    const results = await db
      .select()
      .from(commonDocuments)
      .where(and(...conditions))
      .orderBy(desc(commonDocuments.createdAt));
    return results;
  }
  
  const results = await db
    .select()
    .from(commonDocuments)
    .orderBy(desc(commonDocuments.createdAt));
  return results;
}

/**
 * Crear documento común
 */
export async function createCommonDocument(data: {
  tipo: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  marca?: string;
  modelo?: string;
  potencia?: string;
  descripcion?: string;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(commonDocuments).values(data as any);
  return result;
}

/**
 * Eliminar documento común
 */
export async function deleteCommonDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(commonDocuments).where(eq(commonDocuments.id, id));
}

/**
 * Obtener checklist de legalización de un proyecto
 */
export async function getProjectLegalizationChecklist(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = await db
    .select()
    .from(projectLegalizationChecklist)
    .where(eq(projectLegalizationChecklist.projectId, projectId))
    .orderBy(projectLegalizationChecklist.documentType);
  
  return results;
}

/**
 * Crear o actualizar item del checklist
 */
export async function upsertLegalizationChecklistItem(data: {
  projectId: number;
  documentType: string;
  fileName?: string;
  fileKey?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  isCompleted: boolean;
  autoLoaded: boolean;
  uploadedBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar si ya existe
  const existing = await db
    .select()
    .from(projectLegalizationChecklist)
    .where(
      and(
        eq(projectLegalizationChecklist.projectId, data.projectId),
        eq(projectLegalizationChecklist.documentType, data.documentType as any)
      )
    )
    .limit(1);
  
  if (existing[0]) {
    // Actualizar
    await db
      .update(projectLegalizationChecklist)
      .set({
        fileName: data.fileName,
        fileKey: data.fileKey,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        isCompleted: data.isCompleted,
        autoLoaded: data.autoLoaded,
        uploadedBy: data.uploadedBy,
        uploadedAt: new Date(),
      })
      .where(eq(projectLegalizationChecklist.id, existing[0].id));
    
    return existing[0].id;
  } else {
    // Crear
    const result = await db.insert(projectLegalizationChecklist).values({
      ...data,
      documentType: data.documentType as any,
      uploadedAt: new Date(),
    });
    return result;
  }
}

/**
 * Eliminar item del checklist
 */
export async function deleteLegalizationChecklistItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(projectLegalizationChecklist)
    .where(eq(projectLegalizationChecklist.id, id));
}

/**
 * Inicializar checklist de legalización para un proyecto
 * Crea los 13 items requeridos vacíos
 */
export async function initializeProjectLegalizationChecklist(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const documentTypes = [
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
  ];
  
  // Verificar cuáles ya existen
  const existing = await db
    .select()
    .from(projectLegalizationChecklist)
    .where(eq(projectLegalizationChecklist.projectId, projectId));
  
  const existingTypes = existing.map((item) => item.documentType);
  
  // Crear solo los que faltan
  const toCreate = documentTypes.filter(
    (type) => !existingTypes.includes(type as any)
  );
  
  if (toCreate.length > 0) {
    await db.insert(projectLegalizationChecklist).values(
      toCreate.map((type) => ({
        projectId,
        documentType: type as any,
        isCompleted: false,
        autoLoaded: false,
      }))
    );
  }
}
