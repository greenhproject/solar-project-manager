/**
 * API REST v1 - Endpoints públicos para integración externa
 * 
 * Autenticación: API Key en header "X-API-Key" o "Authorization: Bearer <key>"
 * Base URL: /api/v1/
 * 
 * Documentación disponible en /api-docs
 */
import { Router, Request, Response, NextFunction } from "express";
import { getDb } from "../db";
import { apiKeys, projects, milestones, projectTypes, users, webhooks as webhooksTable } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

const apiRouter = Router();

// ============================================
// CORS MIDDLEWARE PARA API EXTERNA
// ============================================
apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
  
  // Responder inmediatamente a preflight requests
  if (req.method === "OPTIONS") {
    return res.status(204).send();
  }
  next();
});

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN POR API KEY
// ============================================

interface AuthenticatedRequest extends Request {
  apiKeyUser?: {
    id: number;
    userId: number;
    name: string;
    permissions: string[];
  };
}

/**
 * Genera un hash SHA-256 de la API key para comparación segura
 */
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Middleware que valida la API Key y adjunta los permisos al request
 */
async function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers["x-api-key"] as string || 
                   (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);

    if (!apiKey) {
      return res.status(401).json({
        error: "API_KEY_REQUIRED",
        message: "Se requiere una API Key. Envíala en el header 'X-API-Key' o 'Authorization: Bearer <key>'",
        docs: "/api-docs"
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "SERVICE_UNAVAILABLE", message: "Base de datos no disponible" });
    }

    const keyHash = hashApiKey(apiKey);
    // Usar keyHash (columna renombrada de 'key' para evitar palabra reservada MySQL)
    const [rows] = await db.execute(
      sql`SELECT * FROM api_keys WHERE keyHash = ${keyHash} AND isActive = 1 LIMIT 1`
    );
    const keyRecord = (rows as unknown as any[])[0] || null;

    if (!keyRecord) {
      return res.status(401).json({
        error: "INVALID_API_KEY",
        message: "API Key inválida o desactivada"
      });
    }

    // Verificar expiración
    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      return res.status(401).json({
        error: "API_KEY_EXPIRED",
        message: "La API Key ha expirado. Genera una nueva desde el panel de administración."
      });
    }

    // Actualizar lastUsedAt (no bloquear si falla)
    db.execute(sql`UPDATE api_keys SET lastUsedAt = NOW() WHERE id = ${keyRecord.id}`).catch(() => {});

    // Parsear permisos
    let permissions: string[] = [];
    try {
      permissions = keyRecord.permissions ? JSON.parse(keyRecord.permissions) : ["*"];
    } catch {
      permissions = ["*"];
    }

    req.apiKeyUser = {
      id: keyRecord.id,
      userId: keyRecord.userId,
      name: keyRecord.name,
      permissions
    };

    next();
  } catch (error: any) {
    console.error("[API Auth] Error:", error?.message || error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Error interno al validar API Key"
    });
  }
}

/**
 * Verifica si el usuario tiene un permiso específico
 */
function hasPermission(req: AuthenticatedRequest, permission: string): boolean {
  if (!req.apiKeyUser) return false;
  const perms = req.apiKeyUser.permissions;
  return perms.includes("*") || perms.includes(permission);
}

// ============================================
// ENDPOINTS PÚBLICOS (sin autenticación)
// ============================================

/**
 * GET /api/v1/health
 * Estado de salud de la API
 */
apiRouter.get("/health", async (_req: Request, res: Response) => {
  const db = await getDb();
  res.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: db ? "connected" : "disconnected"
  });
});

// ============================================
// ENDPOINTS PROTEGIDOS (requieren API Key)
// ============================================

apiRouter.use(authenticateApiKey);

// ----------------------------------------
// PROYECTOS
// ----------------------------------------

/**
 * GET /api/v1/projects
 * Lista todos los proyectos con filtros opcionales
 * 
 * Query params:
 * - status: planning | in_progress | on_hold | completed | cancelled
 * - limit: número (default 50, max 100)
 * - offset: número (default 0)
 */
apiRouter.get("/projects", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "projects:read")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "No tienes permiso para leer proyectos" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const status = req.query.status as string;

  let query = db.select({
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
    openSolarId: projects.openSolarId,
    createdAt: projects.createdAt,
    updatedAt: projects.updatedAt,
  }).from(projects);

  if (status) {
    query = query.where(eq(projects.status, status as any)) as any;
  }

  const results = await (query as any).orderBy(desc(projects.updatedAt)).limit(limit).offset(offset);

  // Contar total
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(projects);

  res.json({
    data: results,
    pagination: {
      total: countResult?.count || 0,
      limit,
      offset,
      hasMore: offset + limit < (countResult?.count || 0)
    }
  });
});

/**
 * GET /api/v1/projects/:id
 * Detalle completo de un proyecto
 */
apiRouter.get("/projects/:id", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "projects:read")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "No tienes permiso para leer proyectos" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "INVALID_ID", message: "ID de proyecto inválido" });
  }

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Proyecto no encontrado" });
  }

  // Obtener tipo de proyecto
  const [projectType] = await db.select().from(projectTypes).where(eq(projectTypes.id, project.projectTypeId)).limit(1);

  // Obtener hitos
  const projectMilestones = await db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(milestones.orderIndex);

  // Obtener ingeniero asignado
  let engineer = null;
  if (project.assignedEngineerId) {
    const [eng] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      jobTitle: users.jobTitle,
    }).from(users).where(eq(users.id, project.assignedEngineerId)).limit(1);
    engineer = eng || null;
  }

  res.json({
    data: {
      ...project,
      projectType: projectType || null,
      milestones: projectMilestones,
      assignedEngineer: engineer,
    }
  });
});

/**
 * GET /api/v1/projects/:id/milestones
 * Hitos de un proyecto específico
 */
apiRouter.get("/projects/:id/milestones", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "milestones:read")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "No tienes permiso para leer hitos" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    return res.status(400).json({ error: "INVALID_ID", message: "ID de proyecto inválido" });
  }

  // Verificar que el proyecto existe
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Proyecto no encontrado" });
  }

  const projectMilestones = await db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(milestones.orderIndex);

  res.json({
    data: projectMilestones,
    total: projectMilestones.length
  });
});

// ----------------------------------------
// HITOS (MILESTONES)
// ----------------------------------------

/**
 * PATCH /api/v1/milestones/:id
 * Actualizar estado o campos de un hito
 * 
 * Body (JSON):
 * - status: "pending" | "in_progress" | "completed" | "overdue"
 * - notes: string (opcional)
 * - observations: string (opcional)
 * - completedDate: ISO date string (opcional, se auto-asigna si status=completed)
 */
apiRouter.patch("/milestones/:id", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "milestones:write")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "No tienes permiso para modificar hitos" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const milestoneId = parseInt(req.params.id);
  if (isNaN(milestoneId)) {
    return res.status(400).json({ error: "INVALID_ID", message: "ID de hito inválido" });
  }

  const [existing] = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
  if (!existing) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Hito no encontrado" });
  }

  const { status, notes, observations, completedDate } = req.body;
  const updateData: Record<string, any> = {};

  if (status && ["pending", "in_progress", "completed", "overdue"].includes(status)) {
    updateData.status = status;
    if (status === "completed" && !existing.completedDate) {
      updateData.completedDate = completedDate ? new Date(completedDate) : new Date();
    }
  }
  if (notes !== undefined) updateData.notes = notes;
  if (observations !== undefined) updateData.observations = observations;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "NO_CHANGES", message: "No se proporcionaron campos válidos para actualizar" });
  }

  await db.update(milestones).set(updateData).where(eq(milestones.id, milestoneId));

  // Recalcular progreso del proyecto (incluye status y progressPercentage)
  const { recalculateProjectProgress } = await import("../progressCalculator");
  const newProgress = await recalculateProjectProgress(existing.projectId);

  const [updated] = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);

  res.json({
    data: updated,
    projectProgress: newProgress
  });
});

/**
 * GET /api/v1/milestones/:id
 * Detalle de un hito específico
 */
apiRouter.get("/milestones/:id", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "milestones:read")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "No tienes permiso para leer hitos" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const milestoneId = parseInt(req.params.id);
  if (isNaN(milestoneId)) {
    return res.status(400).json({ error: "INVALID_ID", message: "ID de hito inválido" });
  }

  const [milestone] = await db.select().from(milestones).where(eq(milestones.id, milestoneId)).limit(1);
  if (!milestone) {
    return res.status(404).json({ error: "NOT_FOUND", message: "Hito no encontrado" });
  }

  // Obtener responsable si existe
  let assignedUser = null;
  if (milestone.assignedUserId) {
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(eq(users.id, milestone.assignedUserId)).limit(1);
    assignedUser = user || null;
  }

  res.json({
    data: {
      ...milestone,
      assignedUser
    }
  });
});

// ----------------------------------------
// ESTADÍSTICAS
// ----------------------------------------

/**
 * GET /api/v1/stats
 * Estadísticas generales del sistema
 */
apiRouter.get("/stats", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "stats:read")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "No tienes permiso para ver estadísticas" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const [totalProjects] = await db.select({ count: sql<number>`count(*)` }).from(projects);
  const [inProgress] = await db.select({ count: sql<number>`count(*)` }).from(projects).where(eq(projects.status, "in_progress"));
  const [completed] = await db.select({ count: sql<number>`count(*)` }).from(projects).where(eq(projects.status, "completed"));
  const [planning] = await db.select({ count: sql<number>`count(*)` }).from(projects).where(eq(projects.status, "planning"));

  const [totalMilestones] = await db.select({ count: sql<number>`count(*)` }).from(milestones);
  const [completedMilestones] = await db.select({ count: sql<number>`count(*)` }).from(milestones).where(eq(milestones.status, "completed"));
  const [overdueMilestones] = await db.select({ count: sql<number>`count(*)` }).from(milestones).where(eq(milestones.status, "overdue"));

  res.json({
    data: {
      projects: {
        total: totalProjects?.count || 0,
        inProgress: inProgress?.count || 0,
        completed: completed?.count || 0,
        planning: planning?.count || 0,
      },
      milestones: {
        total: totalMilestones?.count || 0,
        completed: completedMilestones?.count || 0,
        overdue: overdueMilestones?.count || 0,
        completionRate: totalMilestones?.count ? Math.round(((completedMilestones?.count || 0) / totalMilestones.count) * 100) : 0,
      },
      generatedAt: new Date().toISOString()
    }
  });
});

// ----------------------------------------
// GESTIÓN DE API KEYS (solo admin)
// ----------------------------------------

/**
 * POST /api/v1/keys/generate
 * Genera una nueva API Key (requiere permiso admin)
 * 
 * Body:
 * - name: string (nombre descriptivo)
 * - permissions: string[] (permisos, default ["*"])
 * - expiresInDays: number (opcional, días hasta expiración)
 */
apiRouter.post("/keys/generate", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "admin")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Solo administradores pueden generar API Keys" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const { name, permissions = ["*"], expiresInDays } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "INVALID_INPUT", message: "Se requiere un nombre para la API Key" });
  }

  // Generar key aleatoria
  const rawKey = `spm_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);
  const prefix = rawKey.substring(0, 8);

  let expiresAt: Date | null = null;
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  await db.insert(apiKeys).values({
    name,
    keyHash,
    prefix,
    userId: req.apiKeyUser!.userId,
    permissions: JSON.stringify(permissions),
    expiresAt,
  });

  res.status(201).json({
    data: {
      key: rawKey, // Solo se muestra una vez
      prefix,
      name,
      permissions,
      expiresAt: expiresAt?.toISOString() || null,
      warning: "⚠️ Guarda esta key de forma segura. No se puede recuperar después de esta respuesta."
    }
  });
});

/**
 * GET /api/v1/keys
 * Lista las API Keys del usuario (sin mostrar la key completa)
 */
apiRouter.get("/keys", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "admin")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Solo administradores pueden ver API Keys" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const keys = await db.select({
    id: apiKeys.id,
    name: apiKeys.name,
    prefix: apiKeys.prefix,
    permissions: apiKeys.permissions,
    isActive: apiKeys.isActive,
    lastUsedAt: apiKeys.lastUsedAt,
    expiresAt: apiKeys.expiresAt,
    createdAt: apiKeys.createdAt,
  }).from(apiKeys).orderBy(desc(apiKeys.createdAt));

  res.json({
    data: keys.map(k => ({
      ...k,
      permissions: k.permissions ? JSON.parse(k.permissions) : ["*"],
      keyPreview: `${k.prefix}...`
    }))
  });
});

/**
 * DELETE /api/v1/keys/:id
 * Desactiva una API Key
 */
apiRouter.delete("/keys/:id", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "admin")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Solo administradores pueden eliminar API Keys" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const keyId = parseInt(req.params.id);
  if (isNaN(keyId)) {
    return res.status(400).json({ error: "INVALID_ID", message: "ID de key inválido" });
  }

  await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, keyId));

  res.json({ success: true, message: "API Key desactivada" });
});

// ============================================
// WEBHOOKS MANAGEMENT
// ============================================

/**
 * GET /api/v1/webhooks
 * Listar webhooks configurados
 */
apiRouter.get("/webhooks", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "admin")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Se requiere permiso de admin" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const whs = await db.select().from(webhooksTable).orderBy(desc(webhooksTable.createdAt));
  res.json({ data: whs.map(wh => ({ ...wh, events: JSON.parse(wh.eventTypes) })) });
});

/**
 * POST /api/v1/webhooks
 * Crear un nuevo webhook
 * Body: { name, url, events[] }
 */
apiRouter.post("/webhooks", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "admin")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Se requiere permiso de admin" });
  }

  const { name, url, events } = req.body;
  if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: "INVALID_INPUT", message: "name, url y events[] son requeridos" });
  }

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  const secret = crypto.randomBytes(32).toString("hex");
  await db.insert(webhooksTable).values({
    name,
    url,
    secretKey: secret,
    eventTypes: JSON.stringify(events),
    userId: req.apiKeyUser!.userId,
  });

  res.status(201).json({ success: true, secret, message: "Guarda el secret para verificar firmas HMAC-SHA256" });
});

/**
 * DELETE /api/v1/webhooks/:id
 * Eliminar un webhook
 */
apiRouter.delete("/webhooks/:id", async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req, "admin")) {
    return res.status(403).json({ error: "FORBIDDEN", message: "Se requiere permiso de admin" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "INVALID_ID", message: "ID inválido" });

  const db = await getDb();
  if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

  await db.delete(webhooksTable).where(eq(webhooksTable.id, id));
  res.json({ success: true, message: "Webhook eliminado" });
});

export { apiRouter };
