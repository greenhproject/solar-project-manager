/**
 * Rate Limiting Middleware
 * Protege endpoints críticos contra ataques de fuerza bruta y abuso.
 * 
 * Configuraciones diferenciadas por tipo de endpoint:
 * - Auth (login/registro): 5 intentos por minuto
 * - Password reset: 3 intentos por minuto
 * - SSO token generation: 10 intentos por minuto
 * - API REST: 100 peticiones por minuto
 * - General: 200 peticiones por minuto
 */

import rateLimit from "express-rate-limit";

// Helper para normalizar IPv6 (evita bypass por variantes de dirección)
function normalizeIP(req: any): string {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  // Normalizar IPv6 a formato consistente
  if (ip.includes(":")) {
    return ip.replace(/^::ffff:/, ""); // Convertir IPv4-mapped IPv6 a IPv4
  }
  return ip;
}

/**
 * Rate limiter para endpoints de autenticación (login, registro)
 * Límite estricto: 5 intentos por ventana de 1 minuto
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  message: {
    error: "Demasiados intentos de autenticación. Intente de nuevo en 1 minuto.",
    code: "RATE_LIMIT_AUTH",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});

/**
 * Rate limiter para recuperación de contraseña
 * Límite muy estricto: 3 intentos por ventana de 5 minutos
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 3,
  message: {
    error: "Demasiadas solicitudes de recuperación. Intente de nuevo en 5 minutos.",
    code: "RATE_LIMIT_PASSWORD_RESET",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});

/**
 * Rate limiter para SSO token generation
 * Límite moderado: 10 intentos por minuto
 */
export const ssoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: {
    error: "Demasiadas solicitudes SSO. Intente de nuevo en 1 minuto.",
    code: "RATE_LIMIT_SSO",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});

/**
 * Rate limiter para API REST v1
 * Límite generoso: 100 peticiones por minuto por API key
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: {
    error: "Límite de peticiones excedido. Intente de nuevo en 1 minuto.",
    code: "RATE_LIMIT_API",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});

/**
 * Rate limiter general para todas las rutas
 * Límite amplio: 200 peticiones por minuto
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 200,
  message: {
    error: "Demasiadas peticiones. Intente de nuevo en 1 minuto.",
    code: "RATE_LIMIT_GENERAL",
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});
