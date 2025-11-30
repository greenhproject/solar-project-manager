/**
 * Middleware de autenticación con Auth0
 * 
 * Este middleware valida los tokens JWT emitidos por Auth0
 */

import { auth } from 'express-oauth2-jwt-bearer';
import { auth0Config } from './auth0Config';

// Crear el middleware de validación de JWT
export const checkJwt = auth({
  audience: auth0Config.audience,
  issuerBaseURL: auth0Config.issuer,
  tokenSigningAlg: 'RS256',
});

/**
 * Middleware para extraer información del usuario del token Auth0
 */
export const extractAuth0User = (req: any, res: any, next: any) => {
  if (req.auth) {
    // El token fue validado correctamente
    // req.auth contiene los claims del token
    req.user = {
      id: req.auth.sub, // Subject del token (user ID de Auth0)
      email: req.auth.email,
      name: req.auth.name,
      // Agregar otros campos según necesites
    };
  }
  next();
};
