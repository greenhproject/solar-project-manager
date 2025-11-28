import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Tabla de usuarios con sistema de roles
 * Gestiona autenticación y autorización (Admin/Ingeniero)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // Opcional para JWT auth
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }), // Hash bcrypt para JWT auth
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "engineer"]).default("engineer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Tipos de proyectos solares configurables
 * Permite a los administradores definir categorías personalizadas
 */
export const projectTypes = mysqlTable("project_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#FF6B35"), // Color hex para UI
  estimatedDurationDays: int("estimatedDurationDays").default(30),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Proyectos solares
 * Núcleo del sistema de gestión
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  projectTypeId: int("projectTypeId").notNull(),
  
  // Ingeniero asignado
  assignedEngineerId: int("assignedEngineerId"),
  
  // Integración con OpenSolar
  openSolarId: varchar("openSolarId", { length: 255 }),
  
  // Fechas del proyecto
  startDate: timestamp("startDate").notNull(),
  estimatedEndDate: timestamp("estimatedEndDate").notNull(),
  actualEndDate: timestamp("actualEndDate"),
  
  // Estado del proyecto
  status: mysqlEnum("status", ["planning", "in_progress", "on_hold", "completed", "cancelled"]).default("planning").notNull(),
  
  // Progreso calculado (0-100)
  progressPercentage: int("progressPercentage").default(0).notNull(),
  
  // Información adicional
  location: varchar("location", { length: 500 }),
  clientName: varchar("clientName", { length: 255 }),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientPhone: varchar("clientPhone", { length: 50 }),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy").notNull(),
}, (table) => ({
  engineerIdx: index("engineer_idx").on(table.assignedEngineerId),
  statusIdx: index("status_idx").on(table.status),
  openSolarIdx: index("opensolar_idx").on(table.openSolarId),
}));

/**
 * Plantillas de hitos reutilizables
 * Permiten crear conjuntos de hitos estándar por tipo de proyecto
 */
export const milestoneTemplates = mysqlTable("milestone_templates", {
  id: int("id").autoincrement().primaryKey(),
  projectTypeId: int("projectTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  orderIndex: int("orderIndex").notNull(), // Orden de aparición
  estimatedDurationDays: int("estimatedDurationDays").default(7),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Hitos de proyectos
 * Seguimiento detallado de progreso por etapas
 */
export const milestones = mysqlTable("milestones", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Fechas del hito
  startDate: timestamp("startDate"),
  dueDate: timestamp("dueDate").notNull(),
  completedDate: timestamp("completedDate"),
  
  // Estado del hito
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "overdue"]).default("pending").notNull(),
  
  // Orden y peso para cálculo de progreso
  orderIndex: int("orderIndex").notNull(),
  weight: int("weight").default(1).notNull(), // Peso relativo para cálculo de progreso
  
  // Notas y observaciones
  notes: text("notes"),
  
  // Dependencias (IDs de hitos que deben completarse antes)
  dependencies: text("dependencies"), // JSON array de IDs: [1, 2, 3]
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  projectIdx: index("project_idx").on(table.projectId),
  statusIdx: index("status_idx").on(table.status),
}));

/**
 * Recordatorios para coordinadores
 * Sistema de notificaciones para seguimiento de proyectos
 */
export const reminders = mysqlTable("reminders", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  milestoneId: int("milestoneId"), // Opcional, puede ser recordatorio general
  
  // Usuario que recibirá el recordatorio
  userId: int("userId").notNull(),
  
  // Contenido del recordatorio
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  
  // Fecha y estado
  reminderDate: timestamp("reminderDate").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  isSent: boolean("isSent").default(false).notNull(),
  
  // Tipo de recordatorio
  type: mysqlEnum("type", ["milestone_due", "project_overdue", "custom", "sync_required"]).default("custom").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  dateIdx: index("date_idx").on(table.reminderDate),
  readIdx: index("read_idx").on(table.isRead),
}));

/**
 * Logs de sincronización con OpenSolar
 * Auditoría de integraciones con API externa
 */
export const syncLogs = mysqlTable("sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  
  // Detalles de la sincronización
  syncType: mysqlEnum("syncType", ["manual", "automatic", "scheduled"]).default("manual").notNull(),
  direction: mysqlEnum("direction", ["import", "export", "bidirectional"]).default("import").notNull(),
  
  // Resultado
  status: mysqlEnum("status", ["success", "partial", "failed"]).default("success").notNull(),
  message: text("message"),
  errorDetails: text("errorDetails"),
  
  // Datos sincronizados
  dataSynced: text("dataSynced"), // JSON con detalles de lo sincronizado
  
  // Metadata
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  syncedBy: int("syncedBy").notNull(),
}, (table) => ({
  projectIdx: index("project_idx").on(table.projectId),
  statusIdx: index("status_idx").on(table.status),
}));

/**
 * Historial de actualizaciones de proyectos
 * Auditoría de cambios importantes
 */
export const projectUpdates = mysqlTable("project_updates", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  
  // Tipo de actualización
  updateType: mysqlEnum("updateType", ["status_change", "milestone_completed", "assignment_change", "progress_update", "note_added"]).notNull(),
  
  // Contenido
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Valores anteriores y nuevos (JSON)
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy").notNull(),
}, (table) => ({
  projectIdx: index("project_idx").on(table.projectId),
  typeIdx: index("type_idx").on(table.updateType),
}));

// Tipos TypeScript exportados
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type ProjectType = typeof projectTypes.$inferSelect;
export type InsertProjectType = typeof projectTypes.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type MilestoneTemplate = typeof milestoneTemplates.$inferSelect;
export type InsertMilestoneTemplate = typeof milestoneTemplates.$inferInsert;

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = typeof milestones.$inferInsert;

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

export type ProjectUpdate = typeof projectUpdates.$inferSelect;
export type InsertProjectUpdate = typeof projectUpdates.$inferInsert;


/**
 * Archivos adjuntos de proyectos
 * Almacena documentos técnicos, legales y financieros
 */
export const projectAttachments = mysqlTable("project_attachments", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  
  // Información del archivo
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(), // S3 URL
  fileSize: int("fileSize").notNull(), // Tamaño en bytes
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  
  // Categorización
  category: mysqlEnum("category", ["technical", "legal", "financial", "other"]).default("other").notNull(),
  description: text("description"),
  
  // Auditoría
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectAttachment = typeof projectAttachments.$inferSelect;
export type InsertProjectAttachment = typeof projectAttachments.$inferInsert;

/**
 * Configuración de notificaciones de usuario
 * Preferencias de alertas y notificaciones push
 */
export const notificationSettings = mysqlTable("notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Preferencias de notificaciones
  enablePushNotifications: boolean("enablePushNotifications").default(true).notNull(),
  enableMilestoneReminders: boolean("enableMilestoneReminders").default(true).notNull(),
  enableDelayAlerts: boolean("enableDelayAlerts").default(true).notNull(),
  enableAIAlerts: boolean("enableAIAlerts").default(true).notNull(),
  
  // Días de anticipación para recordatorios
  milestoneReminderDays: int("milestoneReminderDays").default(3).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = typeof notificationSettings.$inferInsert;

/**
 * Historial de notificaciones enviadas
 * Registro de todas las notificaciones push
 */
export const notificationHistory = mysqlTable("notification_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Contenido de la notificación
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["milestone", "delay", "ai_alert", "general"]).notNull(),
  
  // Relación con proyecto (opcional)
  projectId: int("projectId"),
  
  // Estado
  isRead: boolean("isRead").default(false).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = typeof notificationHistory.$inferInsert;
