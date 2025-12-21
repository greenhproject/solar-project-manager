import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Tabla de usuarios con sistema de roles
 * Gestiona autenticación y autorización (Admin/Ingeniero)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(), // Nullable para OAuth, requerido para JWT
  password: varchar("password", { length: 255 }), // Solo para autenticación JWT
  avatarUrl: text("avatarUrl"), // URL del avatar personalizado en S3
  theme: mysqlEnum("theme", ["light", "dark", "system"]).default("system"), // Tema preferido del usuario
  loginMethod: varchar("loginMethod", { length: 64 }), // 'oauth' o 'jwt'
  role: mysqlEnum("role", ["admin", "engineer", "ingeniero_tramites"]).default("engineer").notNull(),
  jobTitle: varchar("jobTitle", { length: 255 }), // Cargo del usuario
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
export const projects = mysqlTable(
  "projects",
  {
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
    status: mysqlEnum("status", [
      "planning",
      "in_progress",
      "on_hold",
      "completed",
      "cancelled",
    ])
      .default("planning")
      .notNull(),

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
  },
  table => ({
    engineerIdx: index("engineer_idx").on(table.assignedEngineerId),
    statusIdx: index("status_idx").on(table.status),
    openSolarIdx: index("opensolar_idx").on(table.openSolarId),
  })
);

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
  defaultAssignedUserId: int("defaultAssignedUserId"), // Responsable por defecto
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Hitos de proyectos
 * Seguimiento detallado de progreso por etapas
 */
export const milestones = mysqlTable(
  "milestones",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Fechas del hito
    startDate: timestamp("startDate"),
    dueDate: timestamp("dueDate").notNull(),
    completedDate: timestamp("completedDate"),

    // Estado del hito
    status: mysqlEnum("status", [
      "pending",
      "in_progress",
      "completed",
      "overdue",
    ])
      .default("pending")
      .notNull(),

    // Orden y peso para cálculo de progreso
    orderIndex: int("orderIndex").notNull(),
    weight: int("weight").default(1).notNull(), // Peso relativo para cálculo de progreso

    // Notas y observaciones
    notes: text("notes"),
    observations: text("observations"), // Observaciones del equipo sobre el hito

    // Dependencias (IDs de hitos que deben completarse antes)
    dependencies: text("dependencies"), // JSON array de IDs: [1, 2, 3]

    // Responsable asignado al hito
    assignedUserId: int("assignedUserId"), // Usuario responsable de completar este hito

    // Sincronización con Google Calendar
    googleCalendarEventId: varchar("googleCalendarEventId", { length: 255 }),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    projectIdx: index("project_idx").on(table.projectId),
    statusIdx: index("status_idx").on(table.status),
    assignedUserIdx: index("assigned_user_idx").on(table.assignedUserId),
  })
);

/**
 * Recordatorios para coordinadores
 * Sistema de notificaciones para seguimiento de proyectos
 */
export const reminders = mysqlTable(
  "reminders",
  {
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
    type: mysqlEnum("type", [
      "milestone_due",
      "project_overdue",
      "custom",
      "sync_required",
    ])
      .default("custom")
      .notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("user_idx").on(table.userId),
    dateIdx: index("date_idx").on(table.reminderDate),
    readIdx: index("read_idx").on(table.isRead),
  })
);

/**
 * Logs de sincronización con OpenSolar
 * Auditoría de integraciones con API externa
 */
export const syncLogs = mysqlTable(
  "sync_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),

    // Detalles de la sincronización
    syncType: mysqlEnum("syncType", ["manual", "automatic", "scheduled"])
      .default("manual")
      .notNull(),
    direction: mysqlEnum("direction", ["import", "export", "bidirectional"])
      .default("import")
      .notNull(),

    // Resultado
    status: mysqlEnum("status", ["success", "partial", "failed"])
      .default("success")
      .notNull(),
    message: text("message"),
    errorDetails: text("errorDetails"),

    // Datos sincronizados
    dataSynced: text("dataSynced"), // JSON con detalles de lo sincronizado

    // Metadata
    syncedAt: timestamp("syncedAt").defaultNow().notNull(),
    syncedBy: int("syncedBy").notNull(),
  },
  table => ({
    projectIdx: index("project_idx").on(table.projectId),
    statusIdx: index("status_idx").on(table.status),
  })
);

/**
 * Historial de actualizaciones de proyectos
 * Auditoría de cambios importantes
 */
export const projectUpdates = mysqlTable(
  "project_updates",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),

    // Tipo de actualización
    updateType: mysqlEnum("updateType", [
      "status_change",
      "milestone_completed",
      "assignment_change",
      "progress_update",
      "note_added",
    ]).notNull(),

    // Contenido
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    // Valores anteriores y nuevos (JSON)
    oldValue: text("oldValue"),
    newValue: text("newValue"),

    // Metadata
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: int("createdBy").notNull(),
  },
  table => ({
    projectIdx: index("project_idx").on(table.projectId),
    typeIdx: index("type_idx").on(table.updateType),
  })
);

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
  category: mysqlEnum("category", ["technical", "legal", "financial", "other"])
    .default("other")
    .notNull(),
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
  enablePushNotifications: boolean("enablePushNotifications")
    .default(true)
    .notNull(),
  enableMilestoneReminders: boolean("enableMilestoneReminders")
    .default(true)
    .notNull(),
  enableDelayAlerts: boolean("enableDelayAlerts").default(true).notNull(),
  enableAIAlerts: boolean("enableAIAlerts").default(true).notNull(),

  // Días de anticipación para recordatorios
  milestoneReminderDays: int("milestoneReminderDays").default(3).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings =
  typeof notificationSettings.$inferInsert;

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
  type: mysqlEnum("type", [
    "milestone_due_soon", // Hito próximo a vencer
    "milestone_overdue", // Hito vencido
    "project_completed", // Proyecto completado
    "project_assigned", // Nueva asignación
    "project_updated", // Actualización importante
    "milestone_reminder", // Recordatorio de hito
    "delay", // Retraso detectado
    "ai_alert", // Alerta de IA
    "general", // General
  ]).notNull(),

  // Relación con proyecto (opcional)
  projectId: int("projectId"),

  // Estado
  isRead: boolean("isRead").default(false).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = typeof notificationHistory.$inferInsert;

/**
 * Tokens de recuperación de contraseña
 * Almacena tokens temporales para reset de contraseña
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * Plantillas CAD para diseño de proyectos solares
 * Biblioteca de planos prediseñados con filtros específicos
 */
export const cadTemplates = mysqlTable("cad_templates", {
  id: int("id").autoincrement().primaryKey(),
  
  // Información del archivo CAD
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(), // S3 URL
  fileSize: int("fileSize").notNull(), // Tamaño en bytes
  
  // Filtros de búsqueda
  marcaInversor: varchar("marcaInversor", { length: 100 }).notNull(),
  modeloInversor: varchar("modeloInversor", { length: 100 }),
  potenciaInversor: varchar("potenciaInversor", { length: 50 }), // ej: "5kW", "10kW"
  operadorRed: varchar("operadorRed", { length: 100 }), // ej: "ENEL", "EPM", "Codensa"
  cantidadPaneles: int("cantidadPaneles"),
  potenciaPaneles: varchar("potenciaPaneles", { length: 50 }), // ej: "450W", "550W"
  marcaPaneles: varchar("marcaPaneles", { length: 100 }),
  
  // Descripción y metadatos
  descripcion: text("descripcion"),
  tags: text("tags"), // JSON array de tags para búsqueda adicional
  
  // Auditoría
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CadTemplate = typeof cadTemplates.$inferSelect;
export type InsertCadTemplate = typeof cadTemplates.$inferInsert;

/**
 * Biblioteca de documentos comunes para legalización
 * Certificados, manuales, matrículas que se reutilizan entre proyectos
 */
export const commonDocuments = mysqlTable("common_documents", {
  id: int("id").autoincrement().primaryKey(),
  
  // Tipo de documento
  tipo: mysqlEnum("tipo", [
    "certificado_inversor",
    "certificado_paneles",
    "manual_inversor",
    "matricula_constructor",
    "matricula_disenador",
    "experiencia_constructor",
  ]).notNull(),
  
  // Información del archivo
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(), // S3 URL
  fileSize: int("fileSize").notNull(), // Tamaño en bytes
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  
  // Filtros específicos según tipo
  marca: varchar("marca", { length: 100 }), // Para certificados y manuales
  modelo: varchar("modelo", { length: 100 }), // Para certificados y manuales
  potencia: varchar("potencia", { length: 50 }), // Para paneles e inversores
  
  // Descripción
  descripcion: text("descripcion"),
  
  // Auditoría
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CommonDocument = typeof commonDocuments.$inferSelect;
export type InsertCommonDocument = typeof commonDocuments.$inferInsert;

/**
 * Checklist de legalización por proyecto
 * Documentos requeridos para trámites ante UPME, Operador de Red y RETIE
 */
export const projectLegalizationChecklist = mysqlTable("project_legalization_checklist", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  
  // Tipo de documento requerido
  documentType: mysqlEnum("documentType", [
    "certificado_tradicion",      // a. Certificado de tradición y libertad
    "cedula_cliente",             // b. Cédula del cliente
    "plano_agpe",                 // c. Plano AGPE
    "autodeclaracion_retie",      // d. Auto declaración RETIE
    "certificado_inversor",       // e. Certificado inversor
    "certificado_paneles",        // f. Certificado de paneles
    "manual_inversor",            // g. Manual del inversor
    "matricula_inversor",         // h. Matrícula inversor
    "experiencia_constructor",    // i. Experiencia del constructor
    "matricula_disenador",        // k. Matrícula del diseñador
    "memoria_calculo",            // l. Memoria de cálculo
    "disponibilidad_red",         // m. Disponibilidad de la red
    "otros",                      // Otros documentos
  ]).notNull(),
  
  // Información del archivo (si ya está cargado)
  fileName: varchar("fileName", { length: 255 }),
  fileKey: varchar("fileKey", { length: 500 }), // S3 key
  fileUrl: text("fileUrl"), // S3 URL
  fileSize: int("fileSize"), // Tamaño en bytes
  mimeType: varchar("mimeType", { length: 100 }),
  
  // Indicadores
  isCompleted: boolean("isCompleted").default(false).notNull(),
  autoLoaded: boolean("autoLoaded").default(false).notNull(), // Si se cargó automáticamente desde biblioteca
  
  // Auditoría
  uploadedBy: int("uploadedBy"),
  uploadedAt: timestamp("uploadedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProjectLegalizationChecklist = typeof projectLegalizationChecklist.$inferSelect;
export type InsertProjectLegalizationChecklist = typeof projectLegalizationChecklist.$inferInsert;


/**
 * Configuración de la empresa
 * Datos que aparecen en encabezados de reportes PDF/Excel
 * Solo modificable por administradores
 */
export const companySettings = mysqlTable("company_settings", {
  id: int("id").autoincrement().primaryKey(),
  
  // Datos de la empresa
  companyName: varchar("companyName", { length: 255 }).notNull(),
  address: text("address"),
  nit: varchar("nit", { length: 50 }),
  website: varchar("website", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  
  // Logo de la empresa
  logoUrl: text("logoUrl"), // URL del logo en S3
  logoKey: varchar("logoKey", { length: 500 }), // S3 key para el logo
  
  // Auditoría
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = typeof companySettings.$inferInsert;
