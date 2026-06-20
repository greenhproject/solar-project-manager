/**
 * Security Headers Middleware (Helmet)
 * Configura headers HTTP de seguridad para proteger contra:
 * - Clickjacking (X-Frame-Options)
 * - MIME sniffing (X-Content-Type-Options)
 * - XSS (X-XSS-Protection, CSP)
 * - Protocol downgrade (HSTS)
 * 
 * Configuración permisiva para iframes de Wix y portales externos.
 */

import helmet from "helmet";

/**
 * Configuración de Helmet adaptada al proyecto:
 * - frameguard desactivado porque la app se embebe en iframes de Wix
 * - CSP en modo report-only para no romper funcionalidades existentes
 * - HSTS activado para forzar HTTPS en producción
 */
export const securityHeaders = helmet({
  // Desactivar frameguard porque la app se embebe en iframes (Wix)
  frameguard: false,

  // Content Security Policy - modo permisivo para no romper funcionalidades
  contentSecurityPolicy: false, // Desactivado temporalmente - activar gradualmente

  // Prevenir MIME sniffing
  noSniff: undefined, // helmet lo activa por defecto (X-Content-Type-Options: nosniff)

  // HSTS - forzar HTTPS (solo en producción)
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: false,
  },

  // Referrer Policy
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },

  // Ocultar X-Powered-By
  hidePoweredBy: undefined, // helmet lo oculta por defecto

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },

  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: {
    policy: "same-origin-allow-popups", // Permitir popups de Auth0
  },

  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: {
    policy: "cross-origin", // Permitir recursos cross-origin (API, storage)
  },
});
