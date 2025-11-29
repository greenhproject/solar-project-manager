import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { jwtAuthService } from "./jwtAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Detectar si estamos en entorno Manus o Railway
const isManusEnvironment = () => {
  return !!ENV.oAuthServerUrl && ENV.oAuthServerUrl.includes("manus.im");
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Usar OAuth de Manus si estamos en entorno Manus, sino usar JWT
    if (isManusEnvironment()) {
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
