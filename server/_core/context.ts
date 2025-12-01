import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { jwtAuthService } from "./jwtAuth";
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

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Prioridad de autenticación:
    // 1. Auth0 (si está configurado - para Railway/producción)
    // 2. OAuth de Manus (si estamos en entorno Manus - para desarrollo)
    // 3. JWT manual (fallback)
    if (isAuth0Environment()) {
      console.log('[Context] Using Auth0 authentication');
      user = await auth0Service.authenticateRequest(opts.req);
      console.log('[Context] Auth0 user:', user ? `${user.email} (${user.id})` : 'null');
    } else if (isManusEnvironment()) {
      console.log('[Context] Using Manus OAuth authentication');
      user = await sdk.authenticateRequest(opts.req);
      console.log('[Context] Manus OAuth user:', user ? `${user.email} (${user.id})` : 'null');
    } else {
      console.log('[Context] Using JWT authentication');
      user = await jwtAuthService.authenticateRequest(opts.req);
      console.log('[Context] JWT user:', user ? `${user.email} (${user.id})` : 'null');
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
