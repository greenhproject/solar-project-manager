import { eq, and, or, desc, asc, sql, gte, lte, lt, inArray } from "drizzle-orm";
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
  emailConfig,
  appSettings,
  webhookLogs,
  InsertWebhookLog,
  dynamicDocTemplates,
  dynamicDocFields,
  generatedDynamicDocs,
  InsertDynamicDocTemplate,
  InsertDynamicDocField,
  InsertGeneratedDynamicDoc,
  milestoneComments,
  InsertMilestoneComment,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getNowInConfiguredTimezone } from "./timezone";

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

    // Asignar rol:
    // - Para INSERT (nuevo usuario): usar rol pasado, o 'admin' si es maestro, o 'client' por defecto
    // - Para UPDATE (usuario existente): SOLO actualizar rol si se pasa explícitamente
    //   Esto evita que el login sobrescriba roles existentes a 'client'
    if (
      user.email === "greenhproject@gmail.com" ||
      user.openId === ENV.ownerOpenId
    ) {
      // Usuario maestro siempre es admin (tanto INSERT como UPDATE)
      values.role = "admin";
      updateSet.role = "admin";
    } else if (user.role !== undefined) {
      // Rol pasado explícitamente: usar en INSERT y UPDATE
      values.role = user.role;
      updateSet.role = user.role;
    } else {
      // Sin rol explícito: asignar 'client' solo para INSERT (nuevos usuarios)
      // NO incluir role en updateSet - preservar el rol existente del usuario
      values.role = "client";
      // updateSet.role NO se establece aquí - el usuario existente mantiene su rol
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

  const now = await getNowInConfiguredTimezone();
  // Usar inicio del día actual: un hito está vencido si su dueDate es ANTES de hoy
  const startOfToday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0
  ));
  const allProjects = await db.select().from(projects);

  // Obtener hitos vencidos para contar proyectos con retraso
  // (misma lógica que la página de Recordatorios)
  const overdueMilestonesList = await db
    .select({
      projectId: milestones.projectId,
    })
    .from(milestones)
    .where(
      and(
        lt(milestones.dueDate, startOfToday),
        or(
          eq(milestones.status, "pending"),
          eq(milestones.status, "in_progress"),
          eq(milestones.status, "overdue")
        )
      )
    );

  const projectIdsWithOverdueMilestones = new Set(
    overdueMilestonesList.map(m => m.projectId)
  );

  // Un proyecto está "overdue" si:
  // 1. Su fecha estimada de fin ya pasó, O
  // 2. Tiene hitos vencidos (pendientes o en progreso)
  // Y no está completado ni cancelado
  return {
    total: allProjects.length,
    active: allProjects.filter(p => p.status === "in_progress").length,
    completed: allProjects.filter(p => p.status === "completed").length,
    overdue: allProjects.filter(
      p =>
        p.status !== "completed" &&
        p.status !== "cancelled" &&
        (p.estimatedEndDate < startOfToday || projectIdsWithOverdueMilestones.has(p.id))
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

/**
 * Reordena las plantillas de hitos actualizando el orderIndex de cada una.
 * @param orderedIds - Array de IDs en el nuevo orden deseado
 */
export async function reorderMilestoneTemplates(orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(milestoneTemplates)
      .set({ orderIndex: i + 1 })
      .where(eq(milestoneTemplates.id, orderedIds[i]));
  }
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

// Verificar si un usuario tiene hitos asignados en un proyecto específico
export async function userHasAssignedMilestones(userId: number, projectId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(milestones)
    .where(
      and(
        eq(milestones.projectId, projectId),
        eq(milestones.assignedUserId, userId)
      )
    );
  
  return (result[0]?.count ?? 0) > 0;
}

// Obtener solo los hitos asignados a un usuario en un proyecto
export async function getMilestonesByProjectIdForUser(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.projectId, projectId),
        eq(milestones.assignedUserId, userId)
      )
    )
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

/**
 * Actualiza automáticamente el status de hitos vencidos.
 * Hitos con dueDate < now y status pending/in_progress → overdue
 * Retorna la cantidad de hitos actualizados.
 */
export async function updateOverdueMilestoneStatuses(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const now = await getNowInConfiguredTimezone();
  
  // Solo marcar como overdue hitos cuya fecha de vencimiento es ANTES del inicio de hoy
  // (no marcar hitos que vencen hoy, esos aún están vigentes durante todo el día)
  const startOfToday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0
  ));

  const result = await db
    .update(milestones)
    .set({ status: "overdue" })
    .where(
      and(
        lt(milestones.dueDate, startOfToday),
        or(
          eq(milestones.status, "pending"),
          eq(milestones.status, "in_progress")
        )
      )
    );

  // MySQL returns affectedRows
  const affectedRows = (result as any)[0]?.affectedRows || 0;
  return affectedRows;
}

/**
 * Reordena los hitos de un proyecto actualizando el orderIndex de cada uno.
 * @param projectId - ID del proyecto
 * @param orderedIds - Array de IDs de hitos en el nuevo orden deseado
 */
export async function reorderMilestones(projectId: number, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(milestones)
      .set({ orderIndex: i + 1 })
      .where(
        and(
          eq(milestones.id, orderedIds[i]),
          eq(milestones.projectId, projectId)
        )
      );
  }
}

export async function deleteMilestone(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Eliminar recordatorios asociados al hito
  await db.delete(reminders).where(eq(reminders.milestoneId, id));

  // Eliminar el hito
  await db.delete(milestones).where(eq(milestones.id, id));
}

export async function getOverdueMilestones() {
  const db = await getDb();
  if (!db) return [];
  const now = await getNowInConfiguredTimezone();
  
  // Usar inicio del día actual como límite: un hito está vencido si su dueDate
  // es ANTES del inicio de hoy (es decir, venció ayer o antes)
  const startOfToday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0
  ));

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
      assignedUserId: milestones.assignedUserId,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(
      and(
        lt(milestones.dueDate, startOfToday),
        or(
          eq(milestones.status, "pending"),
          eq(milestones.status, "in_progress"),
          eq(milestones.status, "overdue")
        )
      )
    )
    .orderBy(asc(milestones.dueDate));
}

export async function getUpcomingMilestones(daysAhead: number = 7) {
  const db = await getDb();
  if (!db) return [];
  const now = await getNowInConfiguredTimezone();
  
  // Usar inicio del día actual como límite inferior (incluir hitos que vencen hoy)
  // y fin del día futuro como límite superior
  const startOfToday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0
  ));
  const endOfFutureDay = new Date(startOfToday.getTime());
  endOfFutureDay.setDate(endOfFutureDay.getDate() + daysAhead + 1); // inicio del día siguiente al rango

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
      assignedUserId: milestones.assignedUserId,
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(
      and(
        gte(milestones.dueDate, startOfToday),
        lt(milestones.dueDate, endOfFutureDay),
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
  role: "admin" | "engineer" | "ingeniero_tramites" | "client"
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

  const now = await getNowInConfiguredTimezone();

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


// ============================================
// CONFIGURACIÓN DE EMAIL
// ============================================

/**
 * Obtener la configuración de email activa
 * Solo debe haber una fila en la tabla
 */
export async function getEmailConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const configs = await db.select().from(emailConfig).limit(1);
  return configs[0] || null;
}

/**
 * Crear o actualizar la configuración de email
 */
export async function upsertEmailConfig(config: {
  provider: "resend" | "sendgrid" | "smtp";
  apiKey?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpSecure?: boolean;
  fromEmail: string;
  fromName: string;
  enableEmailNotifications: boolean;
  sendCopyToAdmin: boolean;
  adminEmail?: string | null;
  isActive: boolean;
  updatedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getEmailConfig();

  if (existing) {
    await db
      .update(emailConfig)
      .set({
        ...config,
        updatedAt: new Date(),
      })
      .where(eq(emailConfig.id, existing.id));
  } else {
    await db.insert(emailConfig).values(config);
  }

  return await getEmailConfig();
}

/**
 * Actualizar la fecha del último test de email
 */
export async function updateEmailConfigTestDate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(emailConfig)
    .set({ lastTestedAt: new Date() })
    .where(eq(emailConfig.id, id));
}

// ============================================
// WEBHOOK LOGS
// ============================================

/**
 * Registrar un webhook recibido
 */
export async function createWebhookLog(data: InsertWebhookLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(webhookLogs).values(data);
  return result;
}

/**
 * Obtener logs de webhooks recientes
 */
export async function getWebhookLogs(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(webhookLogs)
    .orderBy(desc(webhookLogs.receivedAt))
    .limit(limit);
}

// ============================================
// BUSCAR PROYECTO POR OPENSOLAR ID
// ============================================

/**
 * Buscar un proyecto por su ID de OpenSolar
 */
export async function getProjectByOpenSolarId(openSolarId: string) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(projects)
    .where(eq(projects.openSolarId, openSolarId))
    .limit(1);
  return results[0] || null;
}

/**
 * Actualizar datos de un proyecto desde OpenSolar (solo campos sincronizables)
 */
export async function updateProjectFromOpenSolar(
  projectId: number,
  data: {
    name?: string;
    location?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    description?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, projectId));
}

// ==========================================
// Dynamic Document Templates
// ==========================================

export async function getDynamicDocTemplates(filters?: { category?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [eq(dynamicDocTemplates.isActive, true)];
  if (filters?.category) {
    conditions.push(eq(dynamicDocTemplates.category, filters.category));
  }
  
  return await db
    .select()
    .from(dynamicDocTemplates)
    .where(and(...conditions))
    .orderBy(desc(dynamicDocTemplates.createdAt));
}

export async function getDynamicDocTemplateById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select()
    .from(dynamicDocTemplates)
    .where(eq(dynamicDocTemplates.id, id));
  return result[0] || null;
}

export async function createDynamicDocTemplate(data: {
  name: string;
  description?: string;
  category?: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const result = await db.insert(dynamicDocTemplates).values({
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      fileName: data.fileName,
      fileKey: data.fileKey,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType.substring(0, 100), // Ensure it fits in varchar(100)
      uploadedBy: data.uploadedBy,
    });
    return result[0].insertId;
  } catch (error: any) {
    console.error('[createDynamicDocTemplate] Insert error:', error.message);
    console.error('[createDynamicDocTemplate] Data:', JSON.stringify({
      name: data.name,
      fileName: data.fileName,
      fileKey: data.fileKey?.substring(0, 50),
      fileUrl: data.fileUrl?.substring(0, 50),
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedBy: data.uploadedBy,
    }));
    throw error;
  }
}

export async function updateDynamicDocTemplate(id: number, data: Partial<{
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(dynamicDocTemplates).set(data).where(eq(dynamicDocTemplates.id, id));
}

export async function deleteDynamicDocTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Soft delete
  await db.update(dynamicDocTemplates)
    .set({ isActive: false })
    .where(eq(dynamicDocTemplates.id, id));
}

// ==========================================
// Dynamic Document Fields
// ==========================================

export async function getDynamicDocFieldsByTemplateId(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(dynamicDocFields)
    .where(eq(dynamicDocFields.templateId, templateId))
    .orderBy(dynamicDocFields.orderIndex);
}

export async function createDynamicDocField(data: {
  templateId: number;
  fieldKey: string;
  fieldLabel: string;
  fieldType?: "text" | "number" | "date" | "select" | "project";
  options?: string;
  projectMapping?: string;
  defaultValue?: string;
  orderIndex?: number;
  isRequired?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(dynamicDocFields).values(data);
  return result[0].insertId;
}

export async function updateDynamicDocField(id: number, data: Partial<{
  fieldKey: string;
  fieldLabel: string;
  fieldType: "text" | "number" | "date" | "select" | "project";
  options: string;
  projectMapping: string;
  defaultValue: string;
  orderIndex: number;
  isRequired: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(dynamicDocFields).set(data).where(eq(dynamicDocFields.id, id));
}

export async function deleteDynamicDocField(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(dynamicDocFields).where(eq(dynamicDocFields.id, id));
}

export async function deleteAllDynamicDocFieldsByTemplate(templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(dynamicDocFields).where(eq(dynamicDocFields.templateId, templateId));
}

// ==========================================
// Generated Dynamic Documents
// ==========================================

export async function getGeneratedDocsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db
    .select()
    .from(generatedDynamicDocs)
    .where(eq(generatedDynamicDocs.projectId, projectId))
    .orderBy(desc(generatedDynamicDocs.createdAt));
}

export async function createGeneratedDoc(data: {
  projectId: number;
  templateId: number;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  fieldValues: string;
  generatedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(generatedDynamicDocs).values(data);
  return result[0].insertId;
}

export async function deleteGeneratedDoc(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(generatedDynamicDocs).where(eq(generatedDynamicDocs.id, id));
}


// ============================================
// COMENTARIOS DE HITOS (TRAZABILIDAD)
// ============================================

/**
 * Obtener todos los comentarios de un hito con datos del usuario
 */
export async function getMilestoneComments(milestoneId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const comments = await db
    .select({
      id: milestoneComments.id,
      milestoneId: milestoneComments.milestoneId,
      userId: milestoneComments.userId,
      content: milestoneComments.content,
      createdAt: milestoneComments.createdAt,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(milestoneComments)
    .leftJoin(users, eq(milestoneComments.userId, users.id))
    .where(eq(milestoneComments.milestoneId, milestoneId))
    .orderBy(desc(milestoneComments.createdAt));
  
  return comments;
}

/**
 * Crear un nuevo comentario en un hito
 */
export async function createMilestoneComment(data: {
  milestoneId: number;
  userId: number;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(milestoneComments).values(data);
  return result[0].insertId;
}

/**
 * Eliminar un comentario de hito (solo el autor o admin)
 */
export async function deleteMilestoneComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(milestoneComments).where(eq(milestoneComments.id, id));
}

/**
 * Obtener un comentario por ID
 */
export async function getMilestoneCommentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(milestoneComments)
    .where(eq(milestoneComments.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}
