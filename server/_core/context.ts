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
      user = await auth0Service.authenticateRequest(opts.req);
    } else if (isManusEnvironment()) {
      user = await sdk.authenticateRequest(opts.req);
    } else {
      user = await jwtAuthService.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
