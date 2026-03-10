/**
 * Webhook Handler para OpenSolar
 * 
 * Procesa webhooks de OpenSolar para:
 * 1. Crear proyectos automáticamente cuando se marcan como VENDIDOS (sold_date != null)
 * 2. Actualizar datos de proyectos ya vendidos que existen en nuestro sistema
 * 
 * Endpoint: POST /api/webhook/opensolar
 * Header requerido: X-Webhook-Secret
 */

import { Request, Response, Express } from "express";
import { ENV } from "./_core/env";
import { openSolarClient } from "./_core/openSolarClient";
import {
  createProject,
  getProjectByOpenSolarId,
  updateProjectFromOpenSolar,
  createWebhookLog,
  createProjectUpdate,
  getAllProjectTypes,
} from "./db";

// Tipos para el payload de OpenSolar
interface OpenSolarWebhookPayload {
  timestamp: string;
  model: "Project" | "Contact" | "Event";
  model_id: number;
  identifier: string;
  event: "CREATE" | "UPDATE" | "DELETE";
  event_id: number;
  fields: {
    id: number;
    title?: string;
    address?: string;
    stage?: number;
    sold_date?: string | null;
    installation_date?: string | null;
    contract_date?: string | null;
    priority?: number;
    contacts_data?: Array<{
      id: number;
      display?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
    }>;
    actions?: Array<{
      id: number;
      stage: number;
      title: string;
      events: Array<{
        event_type_id: number;
        is_complete: boolean;
        title: string;
      }>;
    }>;
    business_name?: string;
    created_date?: string;
    lat?: number;
    lon?: number;
    country?: string;
    locality?: string;
    systems?: any[];
    payment_option_sold?: any;
    [key: string]: any;
  };
}

/**
 * Determina si un proyecto de OpenSolar está marcado como vendido
 */
function isProjectSold(fields: OpenSolarWebhookPayload["fields"]): boolean {
  // Método 1: sold_date tiene un valor
  if (fields.sold_date) {
    return true;
  }

  // Método 2: Buscar evento "Project Marked as Sold" (event_type_id: 103) en actions
  if (fields.actions) {
    for (const action of fields.actions) {
      if (action.events) {
        for (const event of action.events) {
          if (event.event_type_id === 103 && event.is_complete) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Extrae datos del contacto principal del payload
 */
function extractContactData(fields: OpenSolarWebhookPayload["fields"]) {
  const contact = fields.contacts_data?.[0];
  return {
    clientName: contact?.display || contact?.first_name || fields.business_name || "",
    clientEmail: contact?.email || "",
    clientPhone: contact?.phone || "",
  };
}

/**
 * Procesa un webhook de tipo Project
 */
async function handleProjectWebhook(payload: OpenSolarWebhookPayload): Promise<{
  action: string;
  status: "processed" | "ignored" | "error";
  message: string;
  projectId?: number;
}> {
  const { event, fields } = payload;
  const openSolarId = String(fields.id);

  // Verificar si el proyecto está vendido
  const isSold = isProjectSold(fields);

  if (!isSold) {
    return {
      action: "ignored_not_sold",
      status: "ignored",
      message: `Proyecto OpenSolar #${openSolarId} (${fields.title || "sin título"}) ignorado: no está marcado como vendido`,
    };
  }

  // Buscar si ya existe en nuestro sistema
  const existingProject = await getProjectByOpenSolarId(openSolarId);

  if (event === "CREATE" || (event === "UPDATE" && !existingProject)) {
    // CREAR proyecto nuevo (marcado como vendido)
    try {
      // Obtener datos completos del proyecto desde la API de OpenSolar
      // para incluir información de equipos
      let projectData;
      try {
        const fullProject = await openSolarClient.getProjectById(openSolarId);
        projectData = await openSolarClient.mapProjectToFormWithEquipment(fullProject);
      } catch (apiError) {
        // Si falla la API, usar los datos del webhook directamente
        console.warn(`[Webhook] No se pudo obtener datos completos de OpenSolar API, usando datos del webhook:`, apiError);
        const contact = extractContactData(fields);
        projectData = {
          name: fields.title || "Proyecto sin nombre",
          location: fields.address || "",
          clientName: contact.clientName,
          clientEmail: contact.clientEmail,
          clientPhone: contact.clientPhone,
          description: `Proyecto importado automáticamente desde OpenSolar (ID: ${openSolarId})`,
          startDate: fields.created_date ? new Date(fields.created_date) : new Date(),
        };
      }

      // Obtener el primer tipo de proyecto disponible como default
      const projectTypes = await getAllProjectTypes();
      const defaultTypeId = projectTypes[0]?.id || 1;

      // Calcular fecha estimada de fin (90 días por defecto)
      const startDate = projectData.startDate || new Date();
      const estimatedEndDate = new Date(startDate);
      estimatedEndDate.setDate(estimatedEndDate.getDate() + 90);

      const result = await createProject({
        name: projectData.name,
        description: projectData.description,
        projectTypeId: defaultTypeId,
        openSolarId: openSolarId,
        startDate: startDate,
        estimatedEndDate: estimatedEndDate,
        status: "planning",
        location: projectData.location,
        clientName: projectData.clientName,
        clientEmail: projectData.clientEmail,
        clientPhone: projectData.clientPhone,
        createdBy: 1, // Sistema automático
        progressPercentage: 0,
      });

      const newProjectId = result[0]?.insertId;

      // Registrar en historial de actualizaciones
      if (newProjectId) {
        await createProjectUpdate({
          projectId: newProjectId,
          updateType: "status_change",
          title: "Proyecto creado automáticamente desde OpenSolar",
          description: `El proyecto "${projectData.name}" fue creado automáticamente al ser marcado como vendido en OpenSolar (ID: ${openSolarId})`,
          createdBy: 1,
        });
      }

      return {
        action: "created_project",
        status: "processed",
        message: `Proyecto "${projectData.name}" creado exitosamente desde OpenSolar #${openSolarId}`,
        projectId: newProjectId,
      };
    } catch (error: any) {
      return {
        action: "create_failed",
        status: "error",
        message: `Error al crear proyecto desde OpenSolar #${openSolarId}: ${error.message}`,
      };
    }
  }

  if (event === "UPDATE" && existingProject) {
    // ACTUALIZAR proyecto existente
    try {
      const contact = extractContactData(fields);
      const updateData: any = {};

      // Solo actualizar campos que tienen valor en el webhook
      if (fields.title) updateData.name = fields.title;
      if (fields.address) updateData.location = fields.address;
      if (contact.clientName) updateData.clientName = contact.clientName;
      if (contact.clientEmail) updateData.clientEmail = contact.clientEmail;
      if (contact.clientPhone) updateData.clientPhone = contact.clientPhone;

      if (Object.keys(updateData).length > 0) {
        await updateProjectFromOpenSolar(existingProject.id, updateData);

        // Registrar en historial
        await createProjectUpdate({
          projectId: existingProject.id,
          updateType: "progress_update",
          title: "Datos actualizados desde OpenSolar",
          description: `Campos actualizados automáticamente: ${Object.keys(updateData).join(", ")}`,
          oldValue: JSON.stringify({
            name: existingProject.name,
            location: existingProject.location,
            clientName: existingProject.clientName,
          }),
          newValue: JSON.stringify(updateData),
          createdBy: 1,
        });
      }

      return {
        action: "updated_project",
        status: "processed",
        message: `Proyecto "${existingProject.name}" actualizado desde OpenSolar #${openSolarId}. Campos: ${Object.keys(updateData).join(", ") || "ninguno"}`,
        projectId: existingProject.id,
      };
    } catch (error: any) {
      return {
        action: "update_failed",
        status: "error",
        message: `Error al actualizar proyecto #${existingProject.id}: ${error.message}`,
      };
    }
  }

  if (event === "DELETE" && existingProject) {
    // No eliminamos el proyecto, solo registramos
    return {
      action: "delete_noted",
      status: "processed",
      message: `Proyecto OpenSolar #${openSolarId} fue eliminado en OpenSolar. Proyecto local #${existingProject.id} no fue modificado.`,
      projectId: existingProject.id,
    };
  }

  return {
    action: "no_action",
    status: "ignored",
    message: `Evento ${event} para proyecto OpenSolar #${openSolarId} no requirió acción`,
  };
}

/**
 * Registra las rutas del webhook en la app Express
 */
export function registerWebhookRoutes(app: Express) {
  app.post("/api/webhook/opensolar", async (req: Request, res: Response) => {
    const startTime = Date.now();

    // Validar el secret
    const webhookSecret = req.headers["x-webhook-secret"] as string;
    if (webhookSecret !== ENV.openSolarWebhookSecret) {
      console.warn("[Webhook] Secret inválido recibido:", webhookSecret?.substring(0, 10) + "...");
      res.status(401).json({ error: "Unauthorized: Invalid webhook secret" });
      return;
    }

    const payload = req.body as OpenSolarWebhookPayload;

    console.log(`[Webhook] Recibido: ${payload.model} ${payload.event} (ID: ${payload.model_id})`);

    try {
      let result: {
        action: string;
        status: "processed" | "ignored" | "error";
        message: string;
        projectId?: number;
      };

      // Solo procesamos webhooks de tipo Project
      if (payload.model === "Project") {
        result = await handleProjectWebhook(payload);
      } else {
        result = {
          action: "ignored_model",
          status: "ignored",
          message: `Modelo ${payload.model} no procesado (solo se procesan Projects)`,
        };
      }

      // Registrar en webhook_logs
      try {
        await createWebhookLog({
          source: "opensolar",
          event: payload.event,
          model: payload.model,
          modelId: payload.model_id,
          eventId: payload.event_id,
          action: result.action,
          status: result.status,
          message: result.message,
          projectId: result.projectId || null,
          payload: JSON.stringify(payload).substring(0, 10000), // Limitar tamaño
        });
      } catch (logError) {
        console.error("[Webhook] Error al guardar log:", logError);
      }

      const duration = Date.now() - startTime;
      console.log(`[Webhook] Procesado en ${duration}ms: ${result.action} - ${result.message}`);

      res.status(200).json({
        success: true,
        action: result.action,
        status: result.status,
        message: result.message,
        duration: `${duration}ms`,
      });
    } catch (error: any) {
      console.error("[Webhook] Error procesando webhook:", error);

      // Registrar error en logs
      try {
        await createWebhookLog({
          source: "opensolar",
          event: payload.event || "unknown",
          model: payload.model || "unknown",
          modelId: payload.model_id,
          eventId: payload.event_id,
          action: "processing_error",
          status: "error",
          message: `Error inesperado: ${error.message}`,
          errorDetails: error.stack,
          payload: JSON.stringify(payload).substring(0, 10000),
        });
      } catch (logError) {
        console.error("[Webhook] Error al guardar log de error:", logError);
      }

      res.status(500).json({
        success: false,
        error: "Internal server error processing webhook",
      });
    }
  });

  // Endpoint GET para verificar que el webhook está activo
  app.get("/api/webhook/opensolar", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "active",
      message: "OpenSolar webhook endpoint is active",
      timestamp: new Date().toISOString(),
    });
  });

  console.log("[Webhook] Rutas de webhook OpenSolar registradas en /api/webhook/opensolar");
}
