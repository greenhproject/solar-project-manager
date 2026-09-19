import crypto from "crypto";

/**
 * Cliente servidor a servidor para consultar el resumen privado de tickets de
 * GHP Soporte. No se expone al navegador y nunca usa credenciales de usuarios.
 */
export type SupportTicketSummaryItem = {
  ticketId: string;
  status: "new" | "assigned" | "in_progress" | "waiting" | "escalated";
  priority: "low" | "medium" | "high" | "critical";
  actionUrl: string;
};

export type SupportTicketSummary = {
  available: boolean;
  projectExternalId: string | null;
  activeTicketCount: number;
  tickets: SupportTicketSummaryItem[];
};

export type SupportDashboardTicketItem = SupportTicketSummaryItem & {
  projectExternalId: string;
};

export type SupportTicketsDashboardSummary = {
  available: boolean;
  activeTicketCount: number;
  tickets: SupportDashboardTicketItem[];
  truncated: boolean;
};

/** Configuración resuelta exclusivamente dentro del backend. */
export type SupportTicketsRuntimeConfiguration = {
  enabled: boolean;
  apiUrl: string;
  sourceKey?: string;
  signingSecret?: string;
  credentialsSource?: "railway" | "encrypted_database" | "missing" | "invalid";
  credentialsUpdatedAt?: string | null;
};

const MAX_PROJECT_EXTERNAL_ID_LENGTH = 50;
const REQUEST_TIMEOUT_MS = 8_000;
const DEFAULT_SUPPORT_TICKETS_HOST = "soporte-backend-ghp-production.up.railway.app";

function normalizeEmail(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function isValidProjectExternalId(value: string): boolean {
  return /^\d+$/.test(value) && value.length <= MAX_PROJECT_EXTERNAL_ID_LENGTH;
}

function getAllowedSupportTicketsHosts(): Set<string> {
  const configuredHosts = (process.env.SUPPORT_TICKETS_ALLOWED_HOSTS || "")
    .split(",")
    .map(host => host.trim().toLowerCase())
    .filter(Boolean);
  return new Set([DEFAULT_SUPPORT_TICKETS_HOST, ...configuredHosts]);
}

/** Normaliza únicamente URL HTTPS de backend, sin rutas, query ni fragmentos. */
export function normalizeSupportTicketsApiUrl(value: string | null | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      !getAllowedSupportTicketsHosts().has(parsed.hostname.toLowerCase())
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function isSafeActionUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseTicket(value: unknown): SupportTicketSummaryItem | null {
  if (!value || typeof value !== "object") return null;
  const ticket = value as Record<string, unknown>;
  const statuses = new Set(["new", "assigned", "in_progress", "waiting", "escalated"]);
  const priorities = new Set(["low", "medium", "high", "critical"]);

  if (
    typeof ticket.ticketId !== "string" ||
    !ticket.ticketId.trim() ||
    typeof ticket.status !== "string" ||
    !statuses.has(ticket.status) ||
    typeof ticket.priority !== "string" ||
    !priorities.has(ticket.priority) ||
    !isSafeActionUrl(ticket.actionUrl)
  ) {
    return null;
  }

  return {
    ticketId: ticket.ticketId,
    status: ticket.status as SupportTicketSummaryItem["status"],
    priority: ticket.priority as SupportTicketSummaryItem["priority"],
    actionUrl: ticket.actionUrl,
  };
}

function parseDashboardTicket(value: unknown): SupportDashboardTicketItem | null {
  const ticket = parseTicket(value);
  if (!ticket || !value || typeof value !== "object") return null;
  const projectExternalId = String((value as Record<string, unknown>).projectExternalId || "").trim();
  if (!isValidProjectExternalId(projectExternalId)) return null;
  return { ...ticket, projectExternalId };
}

/**
 * Firma el método, ruta y destinatario para impedir que una petición válida se
 * reutilice sobre otro proyecto o correo.
 */
export function buildSupportTicketsRequestSignature(params: {
  secret: string;
  timestamp: string;
  method: string;
  path: string;
  recipientEmail: string;
}): string {
  const canonical = [
    params.timestamp,
    params.method.toUpperCase(),
    params.path,
    normalizeEmail(params.recipientEmail),
  ].join(".");

  return crypto
    .createHmac("sha256", params.secret)
    .update(canonical)
    .digest("hex");
}

/**
 * La URL e interruptor pueden provenir de la configuración administrativa.
 * Las credenciales se resuelven desde Railway o desde el vault cifrado, pero
 * jamás se devuelven a procedimientos tRPC ni a la interfaz.
 */
export function getSupportTicketsConfigurationStatus(
  runtimeConfiguration?: Partial<SupportTicketsRuntimeConfiguration>,
) {
  const apiUrl = normalizeSupportTicketsApiUrl(
    runtimeConfiguration?.apiUrl ?? process.env.SUPPORT_TICKETS_API_URL,
  ) || "";
  const sourceKey = runtimeConfiguration?.sourceKey ?? process.env.SUPPORT_TICKETS_SOURCE_KEY ?? "";
  const signingSecret = runtimeConfiguration?.signingSecret ?? process.env.SUPPORT_TICKETS_SIGNING_SECRET ?? "";
  const missing = [
    !apiUrl && "SUPPORT_TICKETS_API_URL",
    !sourceKey && "SUPPORT_TICKETS_SOURCE_KEY",
    !signingSecret && "SUPPORT_TICKETS_SIGNING_SECRET",
  ].filter(Boolean) as string[];

  return {
    configured: missing.length === 0,
    missing,
    enabled: runtimeConfiguration?.enabled ?? true,
    apiUrl,
    sourceKey,
    signingSecret,
  };
}

function unavailableSummary(projectExternalId: string | null): SupportTicketSummary {
  return {
    available: false,
    projectExternalId,
    activeTicketCount: 0,
    tickets: [],
  };
}

/**
 * Obtiene el resumen de tickets del técnico autenticado para un proyecto.
 * Ante errores de configuración, red o contrato, falla de forma cerrada: la
 * página carga normalmente y no recibe tickets de otros usuarios.
 */
export async function getSupportTicketSummary(params: {
  projectExternalId: string | null | undefined;
  recipientEmail: string | null | undefined;
  runtimeConfiguration?: Partial<SupportTicketsRuntimeConfiguration>;
}): Promise<SupportTicketSummary> {
  const projectExternalId = String(params.projectExternalId || "").trim();
  const recipientEmail = normalizeEmail(params.recipientEmail);
  if (!isValidProjectExternalId(projectExternalId) || !recipientEmail) {
    return unavailableSummary(projectExternalId || null);
  }

  const configuration = getSupportTicketsConfigurationStatus(params.runtimeConfiguration);
  if (!configuration.enabled) {
    return unavailableSummary(projectExternalId);
  }
  if (!configuration.configured) {
    console.warn("[Support Tickets] Integración no configurada:", configuration.missing.join(", "));
    return unavailableSummary(projectExternalId);
  }

  const encodedProjectId = encodeURIComponent(projectExternalId);
  const path = `/api/integrations/spm/projects/${encodedProjectId}/tickets-summary`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = buildSupportTicketsRequestSignature({
    secret: configuration.signingSecret,
    timestamp,
    method: "GET",
    path,
    recipientEmail,
  });

  try {
    const response = await fetch(`${configuration.apiUrl}${path}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-GHP-Source": configuration.sourceKey,
        "X-GHP-Timestamp": timestamp,
        "X-GHP-Recipient-Email": recipientEmail,
        "X-GHP-Signature": signature,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(`[Support Tickets] Consulta rechazada o no disponible: HTTP ${response.status}`);
      return unavailableSummary(projectExternalId);
    }

    const payload = await response.json() as Record<string, unknown>;
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.tickets)) {
      console.warn("[Support Tickets] Contrato de respuesta inválido");
      return unavailableSummary(projectExternalId);
    }

    const tickets = payload.tickets
      .map(parseTicket)
      .filter((ticket): ticket is SupportTicketSummaryItem => ticket !== null);

    return {
      available: true,
      projectExternalId,
      activeTicketCount: tickets.length,
      tickets,
    };
  } catch (error) {
    console.warn("[Support Tickets] Error de consulta:", (error as Error).name);
    return unavailableSummary(projectExternalId);
  }
}
/**
 * Obtiene tickets activos del propio usuario para el dashboard. La respuesta
 * todavía se cruza en routers.ts con los proyectos autorizados antes de llegar
 * al navegador.
 */
export async function getSupportTicketsDashboardSummary(params: {
  recipientEmail: string | null | undefined;
  runtimeConfiguration?: Partial<SupportTicketsRuntimeConfiguration>;
}): Promise<SupportTicketsDashboardSummary> {
  const unavailableDashboardSummary = (): SupportTicketsDashboardSummary => ({
    available: false,
    activeTicketCount: 0,
    tickets: [],
    truncated: false,
  });
  const recipientEmail = normalizeEmail(params.recipientEmail);
  if (!recipientEmail) return unavailableDashboardSummary();

  const configuration = getSupportTicketsConfigurationStatus(params.runtimeConfiguration);
  if (!configuration.enabled || !configuration.configured) {
    return unavailableDashboardSummary();
  }

  const path = "/api/integrations/spm/dashboard/tickets-summary";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = buildSupportTicketsRequestSignature({
    secret: configuration.signingSecret,
    timestamp,
    method: "GET",
    path,
    recipientEmail,
  });

  try {
    const response = await fetch(`${configuration.apiUrl}${path}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-GHP-Source": configuration.sourceKey,
        "X-GHP-Timestamp": timestamp,
        "X-GHP-Recipient-Email": recipientEmail,
        "X-GHP-Signature": signature,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`[Support Tickets] Dashboard no disponible: HTTP ${response.status}`);
      return unavailableDashboardSummary();
    }

    const payload = await response.json() as Record<string, unknown>;
    if (!payload || !Array.isArray(payload.tickets)) {
      console.warn("[Support Tickets] Contrato de dashboard inválido");
      return unavailableDashboardSummary();
    }
    const tickets = payload.tickets
      .map(parseDashboardTicket)
      .filter((ticket): ticket is SupportDashboardTicketItem => ticket !== null);
    const activeTicketCount = typeof payload.activeTicketCount === "number" && payload.activeTicketCount >= 0
      ? payload.activeTicketCount
      : tickets.length;
    return {
      available: true,
      activeTicketCount,
      tickets,
      truncated: payload.truncated === true,
    };
  } catch (error) {
    console.warn("[Support Tickets] Error de dashboard:", (error as Error).name);
    return unavailableDashboardSummary();
  }
}
