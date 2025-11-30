import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const isSecure = isSecureRequest(req);
  const isLocalhost = LOCAL_HOSTS.has(hostname) || hostname === "localhost";

  const options = {
    httpOnly: true,
    path: "/",
    // Usar lax para mismo dominio (funciona en Manus público)
    // Solo usar none si realmente es cross-domain
    sameSite: "lax" as const,
    secure: isSecure,
    // No establecer domain para permitir que funcione en subdominios
    domain: undefined,
  };

  // Log para debugging en producción
  console.log("[Cookie Config]", {
    hostname,
    isSecure,
    isLocalhost,
    forwardedProto: req.headers["x-forwarded-proto"],
    options,
  });

  return options;
}
