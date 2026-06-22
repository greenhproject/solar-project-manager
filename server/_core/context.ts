import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { jwtAuthService, JWT_COOKIE_NAME } from "./jwtAuth";
import { sdk } from "./sdk";
import { auth0Service } from "./auth0Service";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Detectar si estamos en entorno Manus, Auth0 o Railway
const isManusEnvironment = () => {
  return !!ENV.oAuthServerUrl && ENV.oAuthServerUrl.includes("manus.im");
};

const isAuth0Environment = () => {
  return !!ENV.auth0Domain && !!ENV.auth0Audience;
};

/**
 * Verifica si la request tiene una cookie JWT de sesión local (creada por SSO callback o login JWT).
 * Esto permite que usuarios SSO mantengan su sesión sin necesidad de Auth0.
 */
function hasJWTSessionCookie(req: CreateExpressContextOptions["req"]): boolean {
  if (!req.headers.cookie) return false;
  return req.headers.cookie.includes(JWT_COOKIE_NAME + "=");
}

/**
 * Verifica si la request tiene un Bearer token de Auth0 en el header Authorization.
 */
function hasAuth0BearerToken(req: CreateExpressContextOptions["req"]): boolean {
  const authHeader = req.headers.authorization;
  return !!authHeader && authHeader.startsWith('Bearer ');
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Prioridad de autenticación ACTUALIZADA:
    // 
    // REGLA CLAVE: Si hay AMBOS (cookie JWT Y Bearer token Auth0), preferir Auth0.
    // Razón: Auth0 es la sesión más reciente del usuario web, y el auth0Service
    // actualiza el rol correctamente. La cookie JWT puede tener datos desactualizados
    // (ej: rol 'client' cuando el usuario es realmente 'admin').
    //
    // 1. Auth0 Bearer token (si está configurado y presente) - PRIORIDAD para usuarios web
    // 2. JWT cookie (solo si NO hay Bearer token) - para sesiones SSO puras
    // 3. OAuth de Manus (si estamos en entorno Manus - para desarrollo)
    
    // PASO 1: Si hay Bearer token de Auth0, usarlo PRIMERO (tiene prioridad)
    if (isAuth0Environment() && hasAuth0BearerToken(opts.req)) {
      try {
        console.log('[Context] Using Auth0 authentication (Bearer token present)');
        user = await auth0Service.authenticateRequest(opts.req);
        console.log('[Context] Auth0 user:', user ? `${user.email} (${user.id}) role:${user.role}` : 'null');
      } catch (auth0Error) {
        // Auth0 falló - continuar con JWT cookie como fallback
        console.log('[Context] Auth0 authentication failed, trying JWT cookie fallback');
        user = null;
      }
    }
    
    // PASO 2: Si no se autenticó por Auth0, intentar JWT cookie (sesiones SSO puras)
    if (!user && hasJWTSessionCookie(opts.req)) {
      try {
        user = await jwtAuthService.authenticateRequest(opts.req);
        if (user) {
          console.log('[Context] JWT session user:', `${user.email} (${user.id}) role:${user.role}`);
        }
      } catch (jwtError) {
        // JWT inválido o expirado - continuar con otros métodos
        console.log('[Context] JWT session invalid, trying other methods');
        user = null;
      }
    }
    
    // PASO 3: Si no se autenticó por Auth0 ni JWT, intentar Manus OAuth
    // IMPORTANTE: Solo usar Manus OAuth si Auth0 NO está configurado
    // En Railway/producción, Auth0 es el sistema principal y Manus OAuth no aplica
    if (!user && isManusEnvironment() && !isAuth0Environment()) {
      console.log('[Context] Using Manus OAuth authentication');
      try {
        user = await sdk.authenticateRequest(opts.req);
        console.log('[Context] Manus OAuth user:', user ? `${user.email} (${user.id})` : 'null');
      } catch (manusError) {
        // Manus OAuth falló - no es un error crítico, simplemente no hay sesión
        console.log('[Context] Manus OAuth failed, no session');
        user = null;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.error('[Context] Authentication error:', error);
    user = null;
  }

  // PROTECCIÓN FINAL: Si el usuario es el admin maestro pero la BD tiene rol incorrecto,
  // forzar admin en el contexto (safety net contra race conditions de BD)
  if (user && user.email === "greenhproject@gmail.com" && user.role !== "admin") {
    console.log(`[Context] OVERRIDE: Forcing admin role for master user ${user.email} (was: ${user.role})`);
    user = { ...user, role: "admin" } as User;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
