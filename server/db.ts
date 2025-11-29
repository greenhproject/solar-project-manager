import { eq, and, or, desc, asc, sql, gte, lte } from "drizzle-orm";
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
  InsertProjectUpdate
} from "../drizzle/schema";
import { ENV } from './_core/env';

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
    if (user.email === 'greenhproject@gmail.com' || user.openId === ENV.ownerOpenId) {
      // Usuario maestro siempre es admin
      values.role = 'admin';
      updateSet.role = 'admin';
    } else if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else {
      // Por defecto, nuevos usuarios son ingenieros
      values.role = 'engineer';
      updateSet.role = 'engineer';
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

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
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
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
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
  return await db.select().from(projectTypes).where(eq(projectTypes.isActive, true)).orderBy(asc(projectTypes.name));
}

export async function getProjectTypeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectTypes).where(eq(projectTypes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProjectType(id: number, data: Partial<InsertProjectType>) {
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
  return await db.select().from(projects)
    .where(eq(projects.status, 'in_progress'))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectsByEngineerId(engineerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).where(eq(projects.assignedEngineerId, engineerId)).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function getProjectStats() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, completed: 0, overdue: 0 };
  
  const now = new Date();
  const allProjects = await db.select().from(projects);
  
  return {
    total: allProjects.length,
    active: allProjects.filter(p => p.status === 'in_progress').length,
    completed: allProjects.filter(p => p.status === 'completed').length,
    overdue: allProjects.filter(p => 
      p.status !== 'completed' && 
      p.status !== 'cancelled' && 
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

export async function getMilestoneTemplatesByProjectType(projectTypeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(milestoneTemplates)
    .where(and(
      eq(milestoneTemplates.projectTypeId, projectTypeId),
      eq(milestoneTemplates.isActive, true)
    ))
    .orderBy(asc(milestoneTemplates.orderIndex));
}

export async function getAllMilestoneTemplates() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(milestoneTemplates).orderBy(asc(milestoneTemplates.projectTypeId), asc(milestoneTemplates.orderIndex));
}

export async function updateMilestoneTemplate(id: number, data: Partial<InsertMilestoneTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(milestoneTemplates).set(data).where(eq(milestoneTemplates.id, id));
}

export async function deleteMilestoneTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(milestoneTemplates).set({ isActive: false }).where(eq(milestoneTemplates.id, id));
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
  const result = await db.select().from(milestones).where(eq(milestones.id, id)).limit(1);
  return result[0] || null;
}

export async function getMilestonesByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.orderIndex));
}

export async function getAllMilestones() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(milestones).orderBy(asc(milestones.dueDate));
}

export async function updateMilestone(id: number, data: Partial<InsertMilestone>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(milestones).set(data).where(eq(milestones.id, id));
}

export async function getOverdueMilestones() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return await db.select()
    .from(milestones)
    .where(and(
      lte(milestones.dueDate, now),
      or(
        eq(milestones.status, 'pending'),
        eq(milestones.status, 'in_progress')
      )
    ))
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
  return await db.select()
    .from(reminders)
    .where(eq(reminders.userId, userId))
    .orderBy(desc(reminders.reminderDate));
}

export async function getUnreadRemindersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(reminders)
    .where(and(
      eq(reminders.userId, userId),
      eq(reminders.isRead, false)
    ))
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
  return await db.select()
    .from(syncLogs)
    .where(eq(syncLogs.projectId, projectId))
    .orderBy(desc(syncLogs.syncedAt));
}

export async function getRecentSyncLogs(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
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
  return await db.select()
    .from(projectUpdates)
    .where(eq(projectUpdates.projectId, projectId))
    .orderBy(desc(projectUpdates.createdAt));
}

// ============================================
// GESTIÓN AVANZADA DE USUARIOS
// ============================================

export async function updateUserRole(userId: number, role: "admin" | "engineer") {
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
 * Obtener hitos que vencen pronto (próximos 3 días)
 */
export async function getUpcomingMilestones(daysAhead: number = 3) {
  const db = await getDb();
  if (!db) return [];

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const results = await db
    .select({
      milestoneId: milestones.id,
      milestoneName: milestones.name,
      dueDate: milestones.dueDate,
      projectId: projects.id,
      projectName: projects.name,
      assignedEngineerId: projects.assignedEngineerId,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(
      and(
        or(
          eq(milestones.status, "pending"),
          eq(milestones.status, "in_progress")
        ),
        gte(milestones.dueDate, new Date()),
        lte(milestones.dueDate, futureDate)
      )
    );

  return results;
}

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
export async function saveNotificationSettings(userId: number, settings: {
  enableMilestoneReminders: boolean;
  enableDelayAlerts: boolean;
  enableAIAlerts: boolean;
  milestoneReminderDays?: number;
}) {
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
        ...(settings.milestoneReminderDays !== undefined && { milestoneReminderDays: settings.milestoneReminderDays }),
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
  type: "milestone_due_soon" | "milestone_overdue" | "project_completed" | "project_assigned" | "project_updated" | "milestone_reminder" | "delay" | "ai_alert" | "general";
  title: string;
  message: string;
  relatedProjectId?: number;
  relatedMilestoneId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(notificationHistory).values(data);
}

/**
 * Obtener notificaciones de un usuario
 */
export async function getUserNotifications(userId: number, limit: number = 50, unreadOnly: boolean = false) {
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

  await db
    .delete(notificationHistory)
    .where(eq(notificationHistory.id, id));
}

/**
 * Actualizar perfil de usuario
 */
export async function updateUserProfile(userId: number, data: {
  name?: string;
  email?: string;
  avatarUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));

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
export async function updateNotificationSettings(userId: number, data: {
  enablePushNotifications?: boolean;
  enableMilestoneReminders?: boolean;
  enableDelayAlerts?: boolean;
  enableAIAlerts?: boolean;
  milestoneReminderDays?: number;
}) {
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
export async function changeUserPassword(userId: number, currentPassword: string, newPassword: string) {
  const bcrypt = await import('bcryptjs');
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Obtener usuario
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  // Verificar que es usuario JWT (no OAuth)
  if (user.loginMethod !== 'jwt') {
    throw new Error("Solo los usuarios con autenticación JWT pueden cambiar su contraseña");
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
