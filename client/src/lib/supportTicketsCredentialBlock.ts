export type SupportTicketCredentialBlockResult =
  | {
      kind: "complete";
      sourceKey: string;
      signingSecret: string;
      apiUrl?: string;
    }
  | {
      kind: "external_api_key";
      message: string;
    }
  | {
      kind: "incomplete";
      missing: string[];
    };

/**
 * Analiza exclusivamente el bloque #2 "Solar Project Manager" generado por
 * GHP Soporte. No acepta la llave ghps_live_ de la API externa: esa clave da
 * acceso de solo lectura a endpoints públicos y no contiene el secreto HMAC.
 */
export function parseSupportTicketsCredentialBlock(input: string): SupportTicketCredentialBlockResult {
  const values = new Map<string, string>();
  for (const rawLine of String(input || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex < 1) continue;
    const key = line.slice(0, equalsIndex).trim();
    const rawValue = line.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^(["'])(.*)\1$/, "$2");
    values.set(key, value);
  }

  const sourceKey = values.get("SUPPORT_TICKETS_SOURCE_KEY") || "";
  const signingSecret = values.get("SUPPORT_TICKETS_SIGNING_SECRET") || "";
  const apiUrl = values.get("SUPPORT_TICKETS_API_URL") || undefined;
  const externalApiKey = values.get("GHP_SOPORTE_API_KEY") || values.get("GHP_SUPPORT_API_KEY") || "";

  if (externalApiKey.startsWith("ghps_live_") || sourceKey.startsWith("ghps_live_")) {
    return {
      kind: "external_api_key",
      message: "La llave ghps_live_ es de la API externa tickets.read y no sirve para esta integración. Usa el bloque “Solar Project Manager” que contiene SUPPORT_TICKETS_SOURCE_KEY y SUPPORT_TICKETS_SIGNING_SECRET.",
    };
  }

  const missing = [
    !sourceKey && "SUPPORT_TICKETS_SOURCE_KEY",
    !signingSecret && "SUPPORT_TICKETS_SIGNING_SECRET",
  ].filter(Boolean) as string[];
  if (missing.length) return { kind: "incomplete", missing };

  return { kind: "complete", sourceKey, signingSecret, apiUrl };
}
