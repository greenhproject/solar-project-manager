/**
 * Rate Limiting para procedimientos tRPC
 * 
 * Los procedimientos tRPC pasan por /api/trpc, pero necesitamos
 * limitar específicamente los endpoints de autenticación.
 * 
 * Este middleware inspecciona la URL del request tRPC para identificar
 * el procedimiento y aplicar rate limiting selectivo.
 */

import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

// Procedimientos de autenticación que necesitan rate limiting estricto
const AUTH_PROCEDURES = [
  "auth.login",
  "auth.register",
];

const PASSWORD_PROCEDURES = [
  "auth.forgotPassword",
  "auth.resetPassword",
];

/**
 * Rate limiter para auth tRPC: 5 intentos por minuto
 */
const trpcAuthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: JSON.stringify({
    error: {
      message: "Demasiados intentos de autenticación. Intente de nuevo en 1 minuto.",
      code: -32029,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
    },
  }),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});

/**
 * Rate limiter para password reset tRPC: 3 intentos por 5 minutos
 */
const trpcPasswordLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: JSON.stringify({
    error: {
      message: "Demasiadas solicitudes de recuperación. Intente de nuevo en 5 minutos.",
      code: -32029,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
    },
  }),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});

/**
 * Middleware que aplica rate limiting selectivo a procedimientos tRPC
 * Se coloca ANTES del middleware tRPC en la cadena de Express
 */
export function trpcRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // tRPC batch/single: la URL contiene el nombre del procedimiento
  // Ej: /api/trpc/auth.login o /api/trpc/auth.login,auth.me (batch)
  const url = req.url || "";
  const path = url.split("?")[0]; // Remover query params
  const procedureName = path.replace(/^\//, ""); // Remover leading slash

  // Verificar si es un procedimiento de autenticación
  const isAuthProcedure = AUTH_PROCEDURES.some(proc => procedureName.includes(proc));
  if (isAuthProcedure) {
    return trpcAuthLimiter(req, res, next);
  }

  // Verificar si es un procedimiento de password reset
  const isPasswordProcedure = PASSWORD_PROCEDURES.some(proc => procedureName.includes(proc));
  if (isPasswordProcedure) {
    return trpcPasswordLimiter(req, res, next);
  }

  // Para otros procedimientos, pasar sin rate limiting adicional
  next();
}
