import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyToken } from "../jwtAuth";
import { getUserById } from "../jwtDb";
import { COOKIE_NAME } from "../../shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Primero intentar autenticación JWT
    const jwtToken = opts.req.cookies?.[COOKIE_NAME];
    if (jwtToken) {
      const payload = verifyToken(jwtToken);
      if (payload) {
        // Token JWT válido, obtener usuario de la base de datos
        const jwtUser = await getUserById(payload.userId);
        if (jwtUser) {
          user = jwtUser;
        }
      }
    }
    
    // Si no hay usuario JWT, intentar OAuth de Manus
    if (!user) {
      try {
        user = await sdk.authenticateRequest(opts.req);
      } catch (error) {
        // OAuth falló, continuar sin usuario
      }
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
