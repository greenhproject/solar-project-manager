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

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Prioridad de autenticación:
    // 1. JWT local (cookie) - para sesiones SSO y login directo con JWT
    //    Se verifica PRIMERO porque los usuarios SSO no tienen sesión Auth0
    // 2. Auth0 (si está configurado y hay Bearer token - para Railway/producción)
    // 3. OAuth de Manus (si estamos en entorno Manus - para desarrollo)
    
    if (hasJWTSessionCookie(opts.req)) {
      // Intentar autenticar con JWT local primero (SSO sessions)
      try {
        user = await jwtAuthService.authenticateRequest(opts.req);
        if (user) {
          console.log('[Context] JWT session user:', `${user.email} (${user.id})`);
        }
      } catch (jwtError) {
        // JWT inválido o expirado - continuar con otros métodos
        console.log('[Context] JWT session invalid, trying other methods');
        user = null;
      }
    }
    
    // Si no se autenticó por JWT, intentar Auth0 (si hay Bearer token)
    if (!user && isAuth0Environment() && opts.req.headers.authorization) {
      console.log('[Context] Using Auth0 authentication');
      user = await auth0Service.authenticateRequest(opts.req);
      console.log('[Context] Auth0 user:', user ? `${user.email} (${user.id})` : 'null');
    }
    
    // Si no se autenticó por Auth0, intentar Manus OAuth
    if (!user && isManusEnvironment()) {
      console.log('[Context] Using Manus OAuth authentication');
      user = await sdk.authenticateRequest(opts.req);
      console.log('[Context] Manus OAuth user:', user ? `${user.email} (${user.id})` : 'null');
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.error('[Context] Authentication error:', error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
