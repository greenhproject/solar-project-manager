/**
 * Configuración de Auth0 para el servidor
 * 
 * Las credenciales se obtienen de las variables de entorno:
 * - AUTH0_DOMAIN: El dominio de tu tenant de Auth0 (ej: tu-tenant.auth0.com)
 * - AUTH0_AUDIENCE: El identificador de la API en Auth0
 */

export const auth0Config = {
  domain: process.env.AUTH0_DOMAIN || '',
  audience: process.env.AUTH0_AUDIENCE || '',
  issuer: process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}/` : '',
};

// Validar que las variables de entorno estén configuradas
if (!auth0Config.domain || !auth0Config.audience) {
  console.warn('[Auth0] WARNING: AUTH0_DOMAIN or AUTH0_AUDIENCE not configured');
}
